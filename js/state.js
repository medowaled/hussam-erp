/**
 * Hussam ERP v2.5 Central State Management Engine
 * Handles products, customers, invoices, notifications, and system settings.
 * State changes sync to LocalStorage (fast cache) and Firestore (cloud DB).
 */

import { getFirestoreDB, pushToFirestore, pullFromFirestore } from './firebase.js';

const STORAGE_KEYS = {
    PRODUCTS: 'hussam_erp_products_v2.5',
    CUSTOMERS: 'hussam_erp_customers_v2.5',
    INVOICES: 'hussam_erp_invoices_v2.5',
    NOTIFICATIONS: 'hussam_erp_notifications_v2.5',
    USERS: 'hussam_erp_users_v2.5',
    CART: 'hussam_erp_cart_v2.5',
    CURRENT_USER: 'hussam_erp_current_user_v2.5',
    CASH_ON_HAND: 'hussam_erp_cash_on_hand_v2.5',
    DELEGATE_COLLECTIONS: 'hussam_erp_delegate_collections_v2.5',
    CUSTOMER_PAYMENTS: 'hussam_erp_customer_payments_v2.5'
};

class ERPState {
    constructor() {
        this.products = this.load(STORAGE_KEYS.PRODUCTS, [
            {
                id: 101,
                barcode: '930246526725',
                name: 'box كليوباترا',
                category: 'كليوباترا ومحلي',
                stockPacks: 39,
                minStockPacks: 500,
                buyPrice: 35,
                sellPrice: 39,
                cartonPackCount: 50,
                createdAt: new Date().toISOString()
            }
        ]);

        this.customers = this.load(STORAGE_KEYS.CUSTOMERS, [
            {
                id: 201,
                name: 'سالم',
                shopName: 'محل تجزئة',
                phone: '0123456789',
                location: 'بنها',
                debt: 78,
                totalPurchases: 156,
                paidAmount: 78,
                lastPaymentDate: '2026-08-06'
            }
        ]);

        const rawInvoices = this.load(STORAGE_KEYS.INVOICES, []);
        this.invoices = rawInvoices.map(inv => {
            const items = inv.items || [];
            const totalCost = items.reduce((sum, item) => {
                const bPrice = (item.buyPrice !== undefined && item.buyPrice !== null) ? Number(item.buyPrice) : Math.max(0, (item.unitPrice || 0) - 5);
                return sum + (bPrice * item.qty);
            }, 0);
            const grandTotal = Number(inv.grandTotal) || 0;
            const netProfit = Math.max(0, grandTotal - totalCost);
            return {
                ...inv,
                totalCost,
                netProfit
            };
        });
        this.notifications = this.load(STORAGE_KEYS.NOTIFICATIONS, []);
        this.users = this.load(STORAGE_KEYS.USERS, [
            {
                id: 1,
                name: 'حسام حسني',
                username: 'hossam',
                password: '123',
                role: 'مدير عام',
                permissions: ['all'],
                status: 'active',
                assignedCustomers: 'all',
                productQuotas: 'all'
            },
            {
                id: 2,
                name: 'أحمد وليد',
                username: 'ahmed',
                password: '123',
                role: 'كاشير مبيعات',
                permissions: ['pos', 'customers'],
                status: 'active',
                assignedCustomers: [201],
                productQuotas: {
                    101: { allocatedQty: 20, soldQty: 0 }
                }
            }
        ]);
        this.currentUser = this.load(STORAGE_KEYS.CURRENT_USER, null);
        this.cart = this.load(STORAGE_KEYS.CART, []);
        this.cashOnHand = this.load(STORAGE_KEYS.CASH_ON_HAND, 60);
        this.delegateCollections = this.load(STORAGE_KEYS.DELEGATE_COLLECTIONS, []);
        this.customerPayments = this.load(STORAGE_KEYS.CUSTOMER_PAYMENTS, []);
        this.activeView = 'dashboard';
        this.currentPOSCustomerId = '';
        this.listeners = [];

        this.checkStockThresholds();
    }

    load(key, defaultValue) {
        try {
            if (key === STORAGE_KEYS.CURRENT_USER) {
                const sessionData = sessionStorage.getItem(key);
                return sessionData ? JSON.parse(sessionData) : defaultValue;
            }
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (e) {
            console.error('LocalStorage load error:', e);
            return defaultValue;
        }
    }

    save(key, data) {
        try {
            if (key === STORAGE_KEYS.CURRENT_USER) {
                if (data) {
                    sessionStorage.setItem(key, JSON.stringify(data));
                } else {
                    sessionStorage.removeItem(key);
                }
                localStorage.removeItem(key);
            } else {
                localStorage.setItem(key, JSON.stringify(data));
            }
            this.notify();
        } catch (e) {
            console.error('LocalStorage save error:', e);
        }
        // Cloud sync: business data only. The logged-in session (CURRENT_USER)
        // stays on this device so opening the site never auto-logs-in.
        if (key !== STORAGE_KEYS.CURRENT_USER) {
            pushToFirestore(key, data);
        }
    }

    /**
     * Assign a raw value pulled from Firestore back into the in-memory state.
     */
    _assignLoadedValue(key, value) {
        switch (key) {
            case STORAGE_KEYS.PRODUCTS:        this.products = value;        break;
            case STORAGE_KEYS.CUSTOMERS:       this.customers = value;       break;
            case STORAGE_KEYS.INVOICES:        this.invoices = value;        break;
            case STORAGE_KEYS.NOTIFICATIONS:   this.notifications = value;   break;
            case STORAGE_KEYS.USERS:           this.users = value;           break;
            case STORAGE_KEYS.CART:            this.cart = value;            break;
            case STORAGE_KEYS.CURRENT_USER:        this.currentUser = value;     break;
            case STORAGE_KEYS.CASH_ON_HAND:        this.cashOnHand = value;      break;
            case STORAGE_KEYS.DELEGATE_COLLECTIONS: this.delegateCollections = value || []; break;
            case STORAGE_KEYS.CUSTOMER_PAYMENTS:    this.customerPayments = value || [];   break;
        }
    }

    /**
     * Pull all data from Firestore (cloud wins) and seed Firebase with local
     * data when it is empty. Called once at application startup. Falls back
     * silently to localStorage when Firebase is unreachable or not configured.
     */
    async initFirebaseSync() {
        if (!getFirestoreDB()) {
            console.warn('Firebase غير متصل - يعمل النظام بالبيانات المحلية فقط.');
            return;
        }

        // CURRENT_USER (login session) is device-local and never synced
        const keys = Object.values(STORAGE_KEYS).filter(k => k !== STORAGE_KEYS.CURRENT_USER);
        for (const key of keys) {
            const remote = await pullFromFirestore(key);
            if (remote !== null && remote !== undefined) {
                // Cloud has data → use it and refresh the local cache
                try { localStorage.setItem(key, JSON.stringify(remote)); } catch (e) {}
                this._assignLoadedValue(key, remote);
            } else {
                // Cloud is empty → seed it with the current local data
                const local = localStorage.getItem(key);
                if (local !== null) {
                    try { await pushToFirestore(key, JSON.parse(local)); } catch (e) {}
                }
            }
        }

        this.checkStockThresholds();
        this.notify();
        if (typeof window !== 'undefined' && window.renderAppLayout) {
            window.renderAppLayout();
        }
    }

    subscribe(listener) {
        this.listeners.push(listener);
    }

    notify() {
        this.listeners.forEach(fn => fn(this));
    }

    notifyListeners() {
        this.notify();
    }

    addNotification({ title, message, type = 'info' }) {
        this.notifications.unshift({
            id: Date.now() + Math.random(),
            title,
            message,
            type,
            createdAt: new Date().toLocaleString('ar-EG')
        });
        this.save(STORAGE_KEYS.NOTIFICATIONS, this.notifications);
        this.notify();
    }

    deleteNotification(id) {
        this.notifications = this.notifications.filter(n => String(n.id) !== String(id));
        this.save(STORAGE_KEYS.NOTIFICATIONS, this.notifications);
        this.notify();
    }

    clearAllNotifications() {
        this.notifications = [];
        this.save(STORAGE_KEYS.NOTIFICATIONS, this.notifications);
        this.notify();
    }

    /* Products CRUD */
    addProduct(product) {
        const newProduct = {
            id: Date.now(),
            barcode: product.barcode || Math.floor(100000000000 + Math.random() * 900000000000).toString(),
            name: product.name,
            category: product.category || 'كليوباترا ومحلي',
            stockPacks: Number(product.stockPacks) || 0,
            minStockPacks: Number(product.minStockPacks) || 500,
            buyPrice: Number(product.buyPrice) || 0,
            sellPrice: Number(product.sellPrice) || 0,
            cartonPackCount: Number(product.cartonPackCount) || 50,
            createdAt: new Date().toISOString()
        };
        this.products.unshift(newProduct);
        this.save(STORAGE_KEYS.PRODUCTS, this.products);

        // Deduct initial stock purchase cost from cash liquidity if applicable
        const initialCost = newProduct.stockPacks * newProduct.buyPrice;
        if (initialCost > 0) {
            this.updateCashOnHand(Math.max(0, (Number(this.cashOnHand) || 0) - initialCost));
        }

        this.addNotification({
            title: `➕ إضافة صنف جديد: ${newProduct.name}`,
            message: `تم إضافة الصنف (${newProduct.name}) بسعر شراء ${newProduct.buyPrice} ج.م وسعر بيع ${newProduct.sellPrice} ج.م.` +
                     (initialCost > 0 ? `<br>💸 <b>تم خصم تكلفة مخزون أول المشتريات:</b> ${initialCost.toLocaleString('ar-EG')} ج.م من السيولة النقدية.` : ''),
            type: 'info'
        });
        this.checkStockThresholds();
        return newProduct;
    }

    updateProduct(id, updatedFields) {
        const index = this.products.findIndex(p => p.id === id);
        if (index !== -1) {
            this.products[index] = { ...this.products[index], ...updatedFields };
            this.save(STORAGE_KEYS.PRODUCTS, this.products);
            this.checkStockThresholds();
        }
    }

    /**
     * Weighted Average Cost restock:
     * New WAC = (OldQty × OldBuyPrice + NewQty × NewBuyPrice) / (OldQty + NewQty)
     * Also updates sellPrice and minStockPacks if provided.
     */
    restockProduct(id, { newQty, newBuyPrice, newSellPrice, newMinStock }) {
        const index = this.products.findIndex(p => p.id === id);
        if (index === -1) return null;

        const p = this.products[index];
        const oldQty   = Number(p.stockPacks)   || 0;
        const oldBuy   = Number(p.buyPrice)      || 0;
        const addedQty = Number(newQty)          || 0;
        const addedBuy = Number(newBuyPrice)     || oldBuy;

        const totalQty = oldQty + addedQty;

        // Weighted average cost
        const wac = totalQty > 0
            ? ((oldQty * oldBuy) + (addedQty * addedBuy)) / totalQty
            : addedBuy;

        const updatedBuyPrice  = Math.round(wac * 100) / 100;
        const updatedSellPrice = Number(newSellPrice) || p.sellPrice;
        const updatedMinStock  = newMinStock !== undefined && newMinStock !== ''
            ? Number(newMinStock)
            : p.minStockPacks;

        const totalPurchaseCost = addedQty * addedBuy;

        this.products[index] = {
            ...p,
            stockPacks:    totalQty,
            buyPrice:      updatedBuyPrice,
            sellPrice:     updatedSellPrice,
            minStockPacks: updatedMinStock,
            lastRestockAt: new Date().toLocaleString('ar-EG')
        };

        this.save(STORAGE_KEYS.PRODUCTS, this.products);

        // Deduct purchase amount directly from main cash liquidity
        if (totalPurchaseCost > 0) {
            this.updateCashOnHand(Math.max(0, (Number(this.cashOnHand) || 0) - totalPurchaseCost));
            this.addNotification({
                title: `📦 توريد مشتريات بضاعة جديدة: ${p.name}`,
                message: `تم توريد (${addedQty.toLocaleString('ar-EG')}) قروصة بسعر شراء (${addedBuy.toLocaleString('ar-EG')} ج.م) للصنف (${p.name}).<br>💸 <b>إجمالي تكلفة المشتريات المخصومة من الخزينة:</b> <span style="color:#ef4444;font-weight:900;">${totalPurchaseCost.toLocaleString('ar-EG')} ج.م</span>.`,
                type: 'info'
            });
        }

        this.checkStockThresholds();
        return this.products[index];
    }

    deleteProduct(id) {
        this.products = this.products.filter(p => p.id !== id);
        this.save(STORAGE_KEYS.PRODUCTS, this.products);
    }

    /* Customers CRUD */
    addCustomer(customer) {
        const newCustomer = {
            id: Date.now(),
            name: customer.name,
            shopName: customer.shopName || '',
            phone: customer.phone || '',
            location: customer.location || '',
            debt: Number(customer.debt) || 0,
            totalPurchases: Number(customer.totalPurchases) || 0,
            paidAmount: Number(customer.paidAmount) || 0,
            lastPaymentDate: new Date().toISOString().split('T')[0]
        };
        this.customers.unshift(newCustomer);
        this.save(STORAGE_KEYS.CUSTOMERS, this.customers);
        return newCustomer;
    }

    addCustomerPayment(customerId, amount, notes = '') {
        const customer = this.customers.find(c => String(c.id) === String(customerId));
        if (customer) {
            const pay = Number(amount) || 0;
            if (pay <= 0) return null;

            const previousDebt = Number(customer.debt) || 0;
            const debtAfter = Math.max(0, previousDebt - pay);

            customer.paidAmount = (Number(customer.paidAmount) || 0) + pay;
            customer.debt = debtAfter;
            customer.lastPaymentDate = new Date().toISOString().split('T')[0];
            this.save(STORAGE_KEYS.CUSTOMERS, this.customers);

            // Update Cash Liquidity: If collected by delegate -> to delegate cash hand; if admin -> to main cashOnHand
            const sellerUser = this.currentUser && this.users.find(u => u.id === this.currentUser.id);
            const isDelegate = sellerUser && sellerUser.role !== 'مدير عام' && sellerUser.id !== 1;

            if (isDelegate) {
                sellerUser.delegateCashHand = (Number(sellerUser.delegateCashHand) || 0) + pay;
                this.save(STORAGE_KEYS.USERS, this.users);
            } else {
                this.updateCashOnHand((Number(this.cashOnHand) || 0) + pay);
            }

            // Create Payment Receipt Record
            const voucherNumber = 'PAY-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);
            const paymentRecord = {
                id: Date.now(),
                voucherNumber,
                customerId: customer.id,
                customerName: customer.name,
                amount: pay,
                previousDebt,
                debtAfter,
                notes: notes || 'سند قبض وتوريد نقدي',
                collectedBy: (sellerUser && sellerUser.name) ? sellerUser.name : (this.currentUser ? this.currentUser.name : 'حسام حسني'),
                collectorId: (sellerUser && sellerUser.id) ? sellerUser.id : 1,
                createdAt: new Date().toLocaleString('ar-EG'),
                date: new Date().toISOString()
            };

            if (!Array.isArray(this.customerPayments)) {
                this.customerPayments = [];
            }
            this.customerPayments.unshift(paymentRecord);
            this.save(STORAGE_KEYS.CUSTOMER_PAYMENTS, this.customerPayments);

            this.addNotification({
                title: `💵 تسجيل سند قبض جديد (${customer.name})`,
                message: `تم تسليم مبلغ ${pay.toLocaleString('ar-EG')} ج.م من العميل (${customer.name}) ${isDelegate ? `بواسطة المندوب (${sellerUser.name}) وإضافتها لعهدته` : 'وتوريدها فورياً للخزينة الرئيسية'}. رقم السند: ${voucherNumber}`,
                type: 'info'
            });

            this.notify();
            return paymentRecord;
        }
        return null;
    }

    deleteCustomerPayment(paymentId) {
        if (!Array.isArray(this.customerPayments)) return false;
        const p = this.customerPayments.find(item => String(item.id) === String(paymentId) || item.voucherNumber === paymentId);
        if (!p) return false;

        const customer = this.customers.find(c => String(c.id) === String(p.customerId));
        if (customer) {
            customer.debt = (Number(customer.debt) || 0) + (Number(p.amount) || 0);
            customer.paidAmount = Math.max(0, (Number(customer.paidAmount) || 0) - (Number(p.amount) || 0));
            this.save(STORAGE_KEYS.CUSTOMERS, this.customers);
        }

        // Deduct from cash
        const collector = this.users.find(u => u.id === p.collectorId);
        const isDelegate = collector && collector.role !== 'مدير عام' && collector.id !== 1;
        if (isDelegate) {
            collector.delegateCashHand = Math.max(0, (Number(collector.delegateCashHand) || 0) - (Number(p.amount) || 0));
            this.save(STORAGE_KEYS.USERS, this.users);
        } else {
            this.updateCashOnHand(Math.max(0, (Number(this.cashOnHand) || 0) - (Number(p.amount) || 0)));
        }

        this.customerPayments = this.customerPayments.filter(item => String(item.id) !== String(paymentId) && item.voucherNumber !== paymentId);
        this.save(STORAGE_KEYS.CUSTOMER_PAYMENTS, this.customerPayments);
        this.notify();
        return true;
    }

    deleteCustomer(id) {
        this.customers = this.customers.filter(c => c.id !== id);
        this.save(STORAGE_KEYS.CUSTOMERS, this.customers);

        // Remove the customer from any employee assignment lists
        let usersChanged = false;
        this.users.forEach(u => {
            if (Array.isArray(u.assignedCustomers)) {
                const filtered = u.assignedCustomers.filter(cId => Number(cId) !== Number(id));
                if (filtered.length !== u.assignedCustomers.length) {
                    u.assignedCustomers = filtered;
                    usersChanged = true;
                }
            }
        });
        if (usersChanged) {
            this.save(STORAGE_KEYS.USERS, this.users);
        }
        return true;
    }

    /* Cart Operations */
    addToCart(productId, qtyPacks = 1) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;

        const existing = this.cart.find(item => item.productId === productId);
        if (existing) {
            existing.qty += qtyPacks;
        } else {
            this.cart.push({
                productId: product.id,
                name: product.name,
                unitPrice: product.sellPrice,
                buyPrice: product.buyPrice,
                qty: qtyPacks
            });
        }
        this.save(STORAGE_KEYS.CART, this.cart);
    }

    updateCartQty(productId, qty) {
        if (qty <= 0) {
            this.removeFromCart(productId);
            return;
        }
        const item = this.cart.find(i => i.productId === productId);
        if (item) {
            item.qty = qty;
            this.save(STORAGE_KEYS.CART, this.cart);
        }
    }

    removeFromCart(productId) {
        this.cart = this.cart.filter(i => i.productId !== productId);
        this.save(STORAGE_KEYS.CART, this.cart);
    }

    clearCart() {
        this.cart = [];
        this.save(STORAGE_KEYS.CART, this.cart);
    }

    /* Prepare Invoice Draft (Preview without modifying state or saving) */
    prepareInvoiceDraft(checkoutData) {
        if (this.cart.length === 0) return null;

        const totalCost = this.cart.reduce((sum, item) => sum + ((Number(item.buyPrice) || 0) * item.qty), 0);
        const subtotal = this.cart.reduce((sum, item) => sum + ((Number(item.unitPrice) || 0) * item.qty), 0);
        const discount = Number(checkoutData.discount) || 0;
        const grandTotal = Math.max(0, subtotal - discount);
        const paidAmount = Number(checkoutData.paidAmount) || 0;
        const remainingDebt = Math.max(0, grandTotal - paidAmount);
        const netProfit = grandTotal - totalCost;

        // Customer debt metrics before and after invoice
        const customer = checkoutData.customerId ? this.customers.find(c => String(c.id) === String(checkoutData.customerId)) : null;
        const previousDebt = customer ? Number(customer.debt) || 0 : 0;
        const totalDebtBeforePayment = previousDebt + grandTotal;
        const totalDebtAfterInvoice = Math.max(0, totalDebtBeforePayment - paidAmount);

        const invoiceNumber = 'INV-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);
        const sellerId = checkoutData.sellerId || (this.currentUser ? this.currentUser.id : 1);
        const seller = this.users.find(u => u.id === sellerId) || this.currentUser || { id: 1, name: 'حسام حسني' };

        return {
            id: Date.now(),
            invoiceNumber,
            customerName: checkoutData.customerName || (customer ? customer.name : 'عميل نقدي (كاش)'),
            customerId: checkoutData.customerId || null,
            items: JSON.parse(JSON.stringify(this.cart)),
            subtotal,
            discount,
            grandTotal,
            totalCost,
            netProfit,
            paidAmount,
            remainingDebt,
            previousDebt,
            totalDebtBeforePayment,
            totalDebtAfterInvoice,
            paymentMethod: checkoutData.paymentMethod || 'cash',
            createdAt: new Date().toLocaleString('ar-EG'),
            sellerId: seller.id,
            sellerName: seller.name || 'حسام حسني',
            isDraft: true
        };
    }

    /* Checkout & Invoices */
    checkout(checkoutData) {
        const isPreDraft = checkoutData && checkoutData.isDraft && checkoutData.items;
        const itemsToCheckout = isPreDraft ? checkoutData.items : this.cart;
        if (!itemsToCheckout || itemsToCheckout.length === 0) return null;

        const totalCost = isPreDraft ? checkoutData.totalCost : itemsToCheckout.reduce((sum, item) => sum + ((Number(item.buyPrice) || 0) * item.qty), 0);
        const subtotal = isPreDraft ? checkoutData.subtotal : itemsToCheckout.reduce((sum, item) => sum + ((Number(item.unitPrice) || 0) * item.qty), 0);
        const discount = Number(checkoutData.discount) || 0;
        const grandTotal = isPreDraft ? checkoutData.grandTotal : Math.max(0, subtotal - discount);
        const paidAmount = Number(checkoutData.paidAmount) || 0;
        const remainingDebt = isPreDraft ? checkoutData.remainingDebt : Math.max(0, grandTotal - paidAmount);
        const netProfit = isPreDraft ? checkoutData.netProfit : (grandTotal - totalCost);

        // Customer debt metrics before and after invoice
        const customer = checkoutData.customerId ? this.customers.find(c => String(c.id) === String(checkoutData.customerId)) : null;
        const previousDebt = checkoutData.previousDebt !== undefined ? Number(checkoutData.previousDebt) : (customer ? Number(customer.debt) || 0 : 0);
        const totalDebtBeforePayment = checkoutData.totalDebtBeforePayment !== undefined ? Number(checkoutData.totalDebtBeforePayment) : (previousDebt + grandTotal);
        const totalDebtAfterInvoice = checkoutData.totalDebtAfterInvoice !== undefined ? Number(checkoutData.totalDebtAfterInvoice) : Math.max(0, totalDebtBeforePayment - paidAmount);

        const invoiceNumber = checkoutData.invoiceNumber || ('INV-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000));
        const sellerId = (checkoutData && checkoutData.sellerId) || (this.currentUser ? this.currentUser.id : 1);
        const seller = this.users.find(u => u.id === sellerId) || this.currentUser || { id: 1, name: 'حسام حسني' };

        const newInvoice = {
            id: checkoutData.id || Date.now(),
            invoiceNumber,
            customerName: checkoutData.customerName || (customer ? customer.name : 'عميل نقدي (كاش)'),
            customerId: checkoutData.customerId || null,
            items: JSON.parse(JSON.stringify(itemsToCheckout)),
            subtotal,
            discount,
            grandTotal,
            totalCost,
            netProfit,
            paidAmount,
            remainingDebt,
            previousDebt,
            totalDebtBeforePayment,
            totalDebtAfterInvoice,
            paymentMethod: checkoutData.paymentMethod || 'cash',
            createdAt: checkoutData.createdAt || new Date().toLocaleString('ar-EG'),
            sellerId: seller.id,
            sellerName: seller.name || 'حسام حسني'
        };

        // Deduct inventory stock & update employee quota soldQty
        const sellerUserObj = this.users.find(u => u.id === seller.id);

        itemsToCheckout.forEach(cartItem => {
            const product = this.products.find(p => p.id === cartItem.productId);
            if (product) {
                product.stockPacks = Math.max(0, product.stockPacks - cartItem.qty);
            }
            if (sellerUserObj && sellerUserObj.productQuotas && sellerUserObj.productQuotas !== 'all') {
                if (!sellerUserObj.productQuotas[cartItem.productId]) {
                    sellerUserObj.productQuotas[cartItem.productId] = { allocatedQty: 0, soldQty: 0 };
                }
                sellerUserObj.productQuotas[cartItem.productId].soldQty = (sellerUserObj.productQuotas[cartItem.productId].soldQty || 0) + cartItem.qty;
            }
        });
        this.save(STORAGE_KEYS.PRODUCTS, this.products);

        const isDelegate = sellerUserObj && sellerUserObj.role !== 'مدير عام' && sellerUserObj.id !== 1;
        if (isDelegate) {
            sellerUserObj.delegateCashHand = (Number(sellerUserObj.delegateCashHand) || 0) + paidAmount;
        } else {
            // Admin sales go directly to main cash liquidity
            this.cashOnHand += paidAmount;
            this.save(STORAGE_KEYS.CASH_ON_HAND, this.cashOnHand);
        }
        this.save(STORAGE_KEYS.USERS, this.users);

        // Update customer debt if applicable
        if (customer) {
            customer.debt = totalDebtAfterInvoice;
            customer.totalPurchases = (Number(customer.totalPurchases) || 0) + grandTotal;
            customer.paidAmount = (Number(customer.paidAmount) || 0) + paidAmount;
            customer.lastPaymentDate = new Date().toISOString().split('T')[0];
            this.save(STORAGE_KEYS.CUSTOMERS, this.customers);
        }

        // Build detailed notification for delegate sales, item sell prices, and discounts
        const lossItems = [];
        const itemSummaries = itemsToCheckout.map(item => {
            const product = this.products.find(p => p.id === item.productId);
            const catalogPrice = product ? (Number(product.sellPrice) || item.unitPrice) : item.unitPrice;
            const buyCost = product ? (Number(product.buyPrice) || Number(item.buyPrice) || 0) : (Number(item.buyPrice) || 0);
            const diff = item.unitPrice - catalogPrice;
            const isBelowBuyCost = item.unitPrice < buyCost;

            if (isBelowBuyCost) {
                lossItems.push({
                    name: item.name,
                    unitPrice: item.unitPrice,
                    buyPrice: buyCost,
                    qty: item.qty,
                    lossAmount: (buyCost - item.unitPrice) * item.qty
                });
            }

            let itemStr = `🔹 <b>${item.name}</b>: كمية (${item.qty} قروصة) بسعر <b>${item.unitPrice} ج.م</b>/قروصة (سعر الشراء: ${buyCost} ج.م)`;
            if (isBelowBuyCost) {
                itemStr += ` <span style="color:#ef4444;font-weight:900;">(⚠️ تحذير: بيع بأقل من سعر الشراء لخسارة ${(buyCost - item.unitPrice) * item.qty} ج!)</span>`;
            } else if (diff < 0) {
                itemStr += ` <span style="color:#ef4444;font-weight:700;">(⚠️ خصم سعر: ${Math.abs(diff)} ج عن السعر الرسمي ${catalogPrice} ج)</span>`;
            } else if (diff > 0) {
                itemStr += ` <span style="color:#10b981;font-weight:700;">(↗️ زيادة سعر: +${diff} ج عن السعر الرسمي ${catalogPrice} ج)</span>`;
            }
            return itemStr;
        }).join('<br>');

        const discountText = discount > 0 
            ? `<br>🏷️ <b>إجمالي الخصم الإضافي بالفاتورة:</b> <span style="color:#ef4444;font-weight:800;">${discount.toLocaleString('ar-EG')} ج.م</span>` + (discount > 50 ? ' <span style="color:#ef4444;font-weight:900;">(🚨 يتجاوز حد 50 ج)</span>' : '')
            : '';

        const debtText = remainingDebt > 0
            ? `<br>⚠️ <b>المتبقي آجل (دين على العميل):</b> ${remainingDebt.toLocaleString('ar-EG')} ج.م (المحصل: ${paidAmount.toLocaleString('ar-EG')} ج.م)`
            : `<br>✅ <b>الحالة:</b> تم تحصيل كامل الفاتورة نقداً (${paidAmount.toLocaleString('ar-EG')} ج.م)`;

        const isDelegateSeller = (sellerUserObj && sellerUserObj.role !== 'مدير عام' && sellerUserObj.id !== 1) || (seller.role && seller.role !== 'مدير عام' && seller.id !== 1);
        
        const notifTitle = isDelegateSeller
            ? `🛒 إشعار مبيعات وخصم للمندوب (${seller.name}) - ${invoiceNumber}`
            : `🛒 عملية بيع جديدة (${invoiceNumber})`;

        const notifMessage = `
            👤 <b>البائع/المندوب:</b> ${seller.name}<br>
            👥 <b>العميل:</b> ${newInvoice.customerName}<br>
            💵 <b>إجمالي الفاتورة الصافي:</b> <b>${grandTotal.toLocaleString('ar-EG')} ج.م</b>${discountText}${debtText}<br>
            <div style="margin-top:0.4rem;padding-top:0.4rem;border-top:1px dashed rgba(255,255,255,0.15);">
                <b>📦 أسعار البيع والتفاصيل للأصناف:</b><br>${itemSummaries}
            </div>
        `.trim();

        // Add notification for ALL sales
        this.addNotification({
            title: notifTitle,
            message: notifMessage,
            type: 'sale'
        });

        // 1. High-priority Warning Notification if ANY item was sold below cost price (سعر البيع أقل من سعر الشراء)
        if (lossItems.length > 0) {
            const lossDetailsHtml = lossItems.map(li => 
                `• <b>${li.name}</b>: تم البيع بسعر <b>${li.unitPrice} ج.م</b> (سعر التكلفة: <b>${li.buyPrice} ج.م</b>) | الخسارة بالصنف: <span style="color:#ef4444;font-weight:900;">${li.lossAmount.toLocaleString('ar-EG')} ج.م</span>`
            ).join('<br>');

            const totalLossSum = lossItems.reduce((s, i) => s + i.lossAmount, 0);

            this.addNotification({
                title: `⚠️ تنبيه حرج: بيع بأقل من سعر الشراء (${invoiceNumber})`,
                message: `تم رصد بيع أصناف بسعر أقل من سعر الشراء للعميل (<b>${newInvoice.customerName}</b>) بواسطة (<b>${seller.name}</b>):<br>${lossDetailsHtml}<br>💥 <b>إجمالي خسارة الفاتورة:</b> <span style="color:#ef4444;font-weight:900;font-size:1.05rem;">${totalLossSum.toLocaleString('ar-EG')} ج.م</span>`,
                type: 'warning'
            });
        }

        // 2. Special Warning Notification if invoice discount exceeds 50 EGP (خصم أزيد من 50 جنيه)
        if (discount > 50) {
            this.addNotification({
                title: `🚨 تنبيه: خصم مرتفع بالفاتورة (${invoiceNumber}) - تجاوز 50 ج.م`,
                message: `تم تطبيق خصم مرتفع بمبلغ <b style="color:#ef4444;font-size:1.05rem;">${discount.toLocaleString('ar-EG')} ج.م</b> على الفاتورة (<b>${invoiceNumber}</b>) للعميل (<b>${newInvoice.customerName}</b>) بواسطة البائع (<b>${seller.name}</b>). الإجمالي بعد الخصم: <b>${grandTotal.toLocaleString('ar-EG')} ج.م</b>.`,
                type: 'warning'
            });
        }

        this.invoices.unshift(newInvoice);
        this.save(STORAGE_KEYS.INVOICES, this.invoices);
        this.clearCart();
        this.checkStockThresholds();

        return newInvoice;
    }



    updateCustomer(id, updatedFields) {
        const index = this.customers.findIndex(c => String(c.id) === String(id));
        if (index !== -1) {
            const oldCust = this.customers[index];
            const oldDebt = Number(oldCust.debt) || 0;
            const newDebt = updatedFields.debt !== undefined ? Number(updatedFields.debt) || 0 : oldDebt;

            // If debt was manually decreased, sync reduced debt to liquidity
            const debtReduction = oldDebt - newDebt;
            if (debtReduction > 0) {
                const sellerUser = this.currentUser && this.users.find(u => u.id === this.currentUser.id);
                const isDelegate = sellerUser && sellerUser.role !== 'مدير عام' && sellerUser.id !== 1;
                if (isDelegate) {
                    sellerUser.delegateCashHand = (Number(sellerUser.delegateCashHand) || 0) + debtReduction;
                    this.save(STORAGE_KEYS.USERS, this.users);
                } else {
                    this.updateCashOnHand((Number(this.cashOnHand) || 0) + debtReduction);
                }
            }

            this.customers[index] = { ...this.customers[index], ...updatedFields };
            this.save(STORAGE_KEYS.CUSTOMERS, this.customers);
            this.notify();
            return this.customers[index];
        }
        return null;
    }

    deleteCustomer(id) {
        this.customers = this.customers.filter(c => c.id !== id);
        this.save(STORAGE_KEYS.CUSTOMERS, this.customers);
        this.notify();
    }

    /* Cash Liquidity Management */
    getDelegatesTotalCash() {
        return this.users.reduce((sum, u) => {
            const isDelegate = u.role !== 'مدير عام' && u.id !== 1;
            return sum + (isDelegate ? (Number(u.delegateCashHand) || 0) : 0);
        }, 0);
    }

    getTotalLiquidity() {
        return (Number(this.cashOnHand) || 0) + this.getDelegatesTotalCash();
    }

    getTotalCustomerDebts() {
        return this.customers.reduce((sum, c) => sum + (Number(c.debt) || 0), 0);
    }

    getTotalBusinessCapital() {
        const inventoryCost = this.products.reduce((sum, p) => sum + ((Number(p.buyPrice) || 0) * (Number(p.stockPacks) || 0)), 0);
        return inventoryCost + this.getTotalLiquidity() + this.getTotalCustomerDebts();
    }

    updateCashOnHand(newAmount) {
        const val = Number(newAmount) || 0;
        this.cashOnHand = val;
        this.save(STORAGE_KEYS.CASH_ON_HAND, this.cashOnHand);
        
        // Instant DOM update for cash liquidity card
        const el = document.getElementById('dashboard-cash-liquidity-val');
        if (el) el.innerText = `${val.toLocaleString('ar-EG')} ج.م`;

        this.notifyListeners();
        return this.cashOnHand;
    }

    /* Invoice Editing Engine */
    updateInvoice(invoiceId, { discount, paidAmount, customerId, customerName }) {
        const index = this.invoices.findIndex(inv => inv.id === invoiceId);
        if (index === -1) return null;

        const inv = this.invoices[index];
        const oldPaid = Number(inv.paidAmount) || 0;

        // Revert old debt if applicable
        if (inv.customerId && inv.remainingDebt > 0) {
            const oldCust = this.customers.find(c => c.id == inv.customerId);
            if (oldCust) {
                oldCust.debt = Math.max(0, oldCust.debt - inv.remainingDebt);
                oldCust.totalPurchases = Math.max(0, oldCust.totalPurchases - inv.grandTotal);
            }
        }

        // Calculate new values
        const newDiscount = Number(discount) !== undefined && !isNaN(Number(discount)) ? Number(discount) : inv.discount;
        const newGrandTotal = Math.max(0, inv.subtotal - newDiscount);
        const newPaidAmount = Number(paidAmount) !== undefined && !isNaN(Number(paidAmount)) ? Number(paidAmount) : inv.paidAmount;
        const newRemainingDebt = Math.max(0, newGrandTotal - newPaidAmount);
        const newNetProfit = newGrandTotal - inv.totalCost;

        const updatedInvoice = {
            ...inv,
            discount: newDiscount,
            grandTotal: newGrandTotal,
            paidAmount: newPaidAmount,
            remainingDebt: newRemainingDebt,
            netProfit: newNetProfit,
            customerId: customerId !== undefined ? customerId : inv.customerId,
            customerName: customerName || inv.customerName,
            editedAt: new Date().toLocaleString('ar-EG')
        };

        // Apply new debt if applicable
        if (updatedInvoice.customerId && newRemainingDebt > 0) {
            const newCust = this.customers.find(c => c.id == updatedInvoice.customerId);
            if (newCust) {
                newCust.debt += newRemainingDebt;
                newCust.totalPurchases += newGrandTotal;
            }
        }

        // Sync paid amount difference to cash liquidity
        const paidDiff = newPaidAmount - oldPaid;
        if (paidDiff !== 0) {
            const sellerUser = this.users.find(u => u.id === inv.sellerId);
            const isDelegate = sellerUser && sellerUser.role !== 'مدير عام' && sellerUser.id !== 1;
            if (isDelegate) {
                sellerUser.delegateCashHand = Math.max(0, (Number(sellerUser.delegateCashHand) || 0) + paidDiff);
                this.save(STORAGE_KEYS.USERS, this.users);
            } else {
                this.cashOnHand = Math.max(0, (Number(this.cashOnHand) || 0) + paidDiff);
                this.save(STORAGE_KEYS.CASH_ON_HAND, this.cashOnHand);
            }
        }

        this.invoices[index] = updatedInvoice;
        this.save(STORAGE_KEYS.CUSTOMERS, this.customers);
        this.save(STORAGE_KEYS.INVOICES, this.invoices);
        this.notifyListeners();
        return updatedInvoice;
    }

    deleteInvoice(invoiceId) {
        const inv = this.invoices.find(i => String(i.id) === String(invoiceId) || i.invoiceNumber === invoiceId);
        if (!inv) return false;

        // Safely adjust customer debt if applicable
        if (inv.customerId) {
            const customer = this.customers.find(c => c.id == inv.customerId);
            if (customer) {
                const netDebtChange = (Number(inv.grandTotal) || 0) - (Number(inv.paidAmount) || 0);
                customer.debt = Math.max(0, (Number(customer.debt) || 0) - netDebtChange);
                customer.totalPurchases = Math.max(0, (Number(customer.totalPurchases) || 0) - (Number(inv.grandTotal) || 0));
                customer.paidAmount = Math.max(0, (Number(customer.paidAmount) || 0) - (Number(inv.paidAmount) || 0));
                this.save(STORAGE_KEYS.CUSTOMERS, this.customers);
            }
        }

        // Refund paid amount from cash liquidity
        const oldPaid = Number(inv.paidAmount) || 0;
        if (oldPaid > 0) {
            const sellerUser = this.users.find(u => u.id === inv.sellerId);
            const isDelegate = sellerUser && sellerUser.role !== 'مدير عام' && sellerUser.id !== 1;
            if (isDelegate) {
                sellerUser.delegateCashHand = Math.max(0, (Number(sellerUser.delegateCashHand) || 0) - oldPaid);
                this.save(STORAGE_KEYS.USERS, this.users);
            } else {
                this.cashOnHand = Math.max(0, (Number(this.cashOnHand) || 0) - oldPaid);
                this.save(STORAGE_KEYS.CASH_ON_HAND, this.cashOnHand);
            }
        }

        this.invoices = this.invoices.filter(i => String(i.id) !== String(invoiceId) && i.invoiceNumber !== invoiceId);
        this.save(STORAGE_KEYS.INVOICES, this.invoices);
        this.notifyListeners();
        return true;
    }

    /* Notifications Engine */
    checkStockThresholds() {
        this.products.forEach(p => {
            if (p.stockPacks <= p.minStockPacks) {
                const exists = this.notifications.some(n => n.productId === p.id);
                if (!exists) {
                    this.notifications.unshift({
                        id: Date.now() + Math.random(),
                        productId: p.id,
                        title: 'تنبيه حد إعادة الطلب!',
                        message: `وصل صنف (${p.name}) إلى الكمية الحرجة (${p.stockPacks} علبة). حد الطلب: ${p.minStockPacks} علبة.`,
                        type: 'warning',
                        createdAt: new Date().toLocaleString('ar-EG')
                    });
                }
            }
        });
        this.save(STORAGE_KEYS.NOTIFICATIONS, this.notifications);
    }

    clearAllNotifications() {
        this.notifications = [];
        this.save(STORAGE_KEYS.NOTIFICATIONS, this.notifications);
        this.notifyListeners();
    }

    deleteNotification(id) {
        this.notifications = this.notifications.filter(n => String(n.id) !== String(id));
        this.save(STORAGE_KEYS.NOTIFICATIONS, this.notifications);
        this.notifyListeners();
    }/* User Management & Auth */
    login(username, password) {
        const user = this.users.find(u => u.username.toLowerCase() === username.toLowerCase().trim());
        if (!user) {
            return { success: false, message: 'اسم المستخدم غير موجود بالنظام!' };
        }
        if (user.password !== password) {
            return { success: false, message: 'كلمة السر غير صحيحة!' };
        }
        if (user.status === 'disabled') {
            return { success: false, message: 'هذا الحساب موقوف حالياً من قبل مدير النظام!' };
        }

        this.currentUser = user;
        this.save(STORAGE_KEYS.CURRENT_USER, this.currentUser);

        this.addNotification({
            title: `🔑 تسجيل دخول بالنظام (${user.name})`,
            message: `قام المستخدم (${user.name} - ${user.role}) بتسجيل الدخول إلى النظام بنجاح.`,
            type: 'info'
        });

        return { success: true, user };
    }

    addUser(user) {
        const newUser = {
            id: Date.now(),
            name: user.name,
            username: user.username,
            password: user.password || '123456',
            role: user.role || 'موظف مبيعات',
            permissions: user.permissions || ['pos'],
            status: user.status || 'active'
        };
        this.users.push(newUser);
        this.save(STORAGE_KEYS.USERS, this.users);
        return newUser;
    }

    updateUser(id, updatedFields) {
        const index = this.users.findIndex(u => u.id === id);
        if (index !== -1) {
            this.users[index] = { ...this.users[index], ...updatedFields };
            this.save(STORAGE_KEYS.USERS, this.users);
            if (this.currentUser && this.currentUser.id === id) {
                this.currentUser = this.users[index];
                this.save(STORAGE_KEYS.CURRENT_USER, this.currentUser);
            }
        }
    }

    toggleUserStatus(id) {
        const index = this.users.findIndex(u => u.id === id);
        if (index !== -1) {
            if (this.users[index].role === 'مدير عام' && this.users[index].username === 'hossam') {
                alert('لا يمكن إيقاف حساب المدير العام الرئيسي!');
                return;
            }
            this.users[index].status = this.users[index].status === 'disabled' ? 'active' : 'disabled';
            this.save(STORAGE_KEYS.USERS, this.users);
        }
    }

    deleteUser(id) {
        const index = this.users.findIndex(u => u.id === id);
        if (index === -1) return false;

        const targetUser = this.users[index];
        if (targetUser.id === 1 || (targetUser.role === 'مدير عام' && targetUser.username === 'hossam')) {
            alert('لا يمكن حذف حساب المدير العام الرئيسي للنظام!');
            return false;
        }

        if (this.currentUser && this.currentUser.id === id) {
            alert('لا يمكنك حذف الحساب المسجل به حالياً! يرجى تسجيل الدخول بحساب مدير عام آخر أولاً.');
            return false;
        }

        this.users.splice(index, 1);
        this.save(STORAGE_KEYS.USERS, this.users);

        this.addNotification({
            title: 'حذف حساب موظف',
            message: `تم حذف حساب المستخدم (${targetUser.name}) نهائياً من النظام.`,
            type: 'warning'
        });

        return true;
    }

    /* Employee Quotas & Customer Assignment */
    getEmployeeQuota(userId, productId) {
        const user = this.users.find(u => u.id === userId);
        if (!user || user.productQuotas === 'all') {
            const product = this.products.find(p => p.id === productId);
            return {
                isUnlimited: true,
                remainingQty: product ? product.stockPacks : 0,
                allocatedQty: product ? product.stockPacks : 0,
                soldQty: 0
            };
        }

        const q = user.productQuotas && user.productQuotas[productId]
            ? user.productQuotas[productId]
            : { allocatedQty: 0, soldQty: 0 };

        const allocated = Number(q.allocatedQty) || 0;
        const sold = Number(q.soldQty) || 0;
        const remaining = Math.max(0, allocated - sold);

        return {
            isUnlimited: false,
            remainingQty: remaining,
            allocatedQty: allocated,
            soldQty: sold
        };
    }

    getUnallocatedStock(productId, excludeUserId = null) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return 0;

        let totalAllocatedOtherEmployees = 0;

        this.users.forEach(u => {
            if (u.id !== excludeUserId && u.productQuotas && u.productQuotas !== 'all') {
                const q = u.productQuotas[productId];
                if (q) {
                    const rem = Math.max(0, (Number(q.allocatedQty) || 0) - (Number(q.soldQty) || 0));
                    totalAllocatedOtherEmployees += rem;
                }
            }
        });

        return Math.max(0, product.stockPacks - totalAllocatedOtherEmployees);
    }

    getAvailableCustomersForUser(user = this.currentUser) {
        if (!user) return this.customers;
        const isAll = user.role === 'مدير عام' || (user.permissions && user.permissions.includes('all'));
        if (isAll || !user.assignedCustomers || user.assignedCustomers === 'all') {
            return this.customers;
        }
        if (Array.isArray(user.assignedCustomers)) {
            const ids = user.assignedCustomers.map(Number);
            return this.customers.filter(c => ids.includes(Number(c.id)));
        }
        return this.customers;
    }

    assignEmployeeQuota(userId, { assignedCustomers, productQuotas, resetSoldQty = false }) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return { success: false, message: 'الموظف غير موجود!' };

        // Validate each product quota allocation against unallocated stock
        for (const [prodIdStr, newAllocQty] of Object.entries(productQuotas)) {
            const productId = Number(prodIdStr);
            const product = this.products.find(p => p.id === productId);
            if (!product) continue;

            const requestedAlloc = Math.max(0, Number(newAllocQty) || 0);
            const currentRem = user.productQuotas && user.productQuotas[productId]
                ? Math.max(0, (Number(user.productQuotas[productId].allocatedQty) || 0) - (Number(user.productQuotas[productId].soldQty) || 0))
                : 0;

            const freeStock = this.getUnallocatedStock(productId, userId);
            const deltaNeeded = Math.max(0, requestedAlloc - currentRem);

            if (deltaNeeded > freeStock) {
                return {
                    success: false,
                    message: `عفواً! الكمية المتاحة للتخصيص بالمخزن الرئيسي لصنف (${product.name}) هي ${freeStock} قروصة فقط! لا يمكنك تخصيص ${requestedAlloc} لهذا الموظف لأن المخزن لا يتوفر به هذا الرصيد الحر.`
                };
            }
        }

        // Apply assignment
        user.assignedCustomers = assignedCustomers; // 'all' or array of IDs
        if (!user.productQuotas || user.productQuotas === 'all') {
            user.productQuotas = {};
        }

        for (const [prodIdStr, newAllocQty] of Object.entries(productQuotas)) {
            const productId = Number(prodIdStr);
            const requestedAlloc = Math.max(0, Number(newAllocQty) || 0);
            user.productQuotas[productId] = {
                allocatedQty: requestedAlloc,
                soldQty: 0
            };
        }

        // If admin requested clearing previous sold records / history for this delegate
        if (resetSoldQty) {
            this.invoices = this.invoices.filter(inv => String(inv.sellerId) !== String(userId) && inv.sellerName !== user.name);
            this.save(STORAGE_KEYS.INVOICES, this.invoices);
        }

        this.save(STORAGE_KEYS.USERS, this.users);
        this.notify();
        return { success: true };
    }

    /* Admin Cash Collection from Delegate & Financial Vouchers Engine */
    collectDelegateCash(userId, amount, notes = '') {
        const user = this.users.find(u => u.id === userId);
        if (!user) return { success: false, message: 'الموظف غير موجود!' };

        const collectAmount = Number(amount) || 0;
        if (collectAmount <= 0) return { success: false, message: 'يرجى إدخال مبلغ صحيح للتحصيل!' };

        const currentHand = Number(user.delegateCashHand) || 0;
        const mainCashBefore = Number(this.cashOnHand) || 0;
        const remainingHand = Math.max(0, currentHand - collectAmount);
        const mainCashAfter = mainCashBefore + collectAmount;

        // 1. Update balances
        user.delegateCashHand = remainingHand;
        user.totalCollectedCash = (Number(user.totalCollectedCash) || 0) + collectAmount;
        this.save(STORAGE_KEYS.USERS, this.users);

        // 2. Update Main Cash and trigger UI elements
        this.updateCashOnHand(mainCashAfter);

        // 3. Generate Official Collection / Treasury Receipt Voucher
        const dateNow = new Date();
        const voucherCount = (this.delegateCollections || []).length + 1;
        const voucher = {
            id: Date.now(),
            voucherNumber: `REC-${dateNow.getFullYear()}${String(dateNow.getMonth() + 1).padStart(2, '0')}-${String(voucherCount).padStart(3, '0')}`,
            delegateId: user.id,
            delegateName: user.name,
            amount: collectAmount,
            delegateCashBefore: currentHand,
            delegateCashAfter: remainingHand,
            mainCashBefore: mainCashBefore,
            mainCashAfter: mainCashAfter,
            notes: notes || 'توريد نقدية من عهدة مبيعات المندوب للخزينة الرئيسية',
            collectedBy: this.currentUser ? this.currentUser.name : 'المدير العام (حسام حسني)',
            createdAt: dateNow.toLocaleString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true }),
            dateIso: dateNow.toISOString()
        };

        if (!Array.isArray(this.delegateCollections)) {
            this.delegateCollections = [];
        }
        this.delegateCollections.unshift(voucher);
        this.save(STORAGE_KEYS.DELEGATE_COLLECTIONS, this.delegateCollections);

        // 4. Send detailed notification
        this.addNotification({
            title: `💵 توريد نقدية للخزينة من (${user.name})`,
            message: `تم تحصيل مبلغ <b>${collectAmount.toLocaleString('ar-EG')} ج.م</b> من المندوب وتوريدها للخزينة الرئيسية (${voucher.voucherNumber}).<br>الرصيد المتبقي مع المندوب: <b>${remainingHand.toLocaleString('ar-EG')} ج.م</b> • رصيد الخزينة الحالي: <b>${mainCashAfter.toLocaleString('ar-EG')} ج.م</b>. ${notes ? '<br>البيان: ' + notes : ''}`,
            type: 'info'
        });

        this.notify();
        return { success: true, user, voucher, newCashOnHand: this.cashOnHand };
    }

    getDelegateCollections(delegateId = null) {
        const list = Array.isArray(this.delegateCollections) ? this.delegateCollections : [];
        if (!delegateId || delegateId === 'all') return list;
        return list.filter(v => String(v.delegateId) === String(delegateId));
    }

    getTotalDelegateCollections(delegateId = null) {
        const list = this.getDelegateCollections(delegateId);
        return list.reduce((sum, v) => sum + (Number(v.amount) || 0), 0);
    }

    getAllCollectionsTotal() {
        return this.getTotalDelegateCollections(null);
    }

    deleteCollectionVoucher(voucherId) {
        if (!Array.isArray(this.delegateCollections)) return false;
        this.delegateCollections = this.delegateCollections.filter(v => String(v.id) !== String(voucherId) && v.voucherNumber !== voucherId);
        this.save(STORAGE_KEYS.DELEGATE_COLLECTIONS, this.delegateCollections);
        this.notify();
        return true;
    }

    isAuthenticated() {
        return !!this.currentUser;
    }

    /**
     * Full logout: clears the current user, the in-memory cart and every
     * session artifact (localStorage session keys, sessionStorage and all
     * cookies) so no authentication data survives a reload or back-navigation.
     * Business data (products, customers, invoices, users, notifications)
     * is intentionally kept for the next login.
     */
    logout() {
        this.currentUser = null;
        this.cart = [];

        // 1) Remove session-related localStorage keys
        const sessionKeys = [
            STORAGE_KEYS.CURRENT_USER,
            STORAGE_KEYS.CART,
            'hussam_erp_active_view',
            'hussam_erp_token',
            'hussam_erp_session',
            'auth_token',
            'auth',
            'token'
        ];
        sessionKeys.forEach(key => {
            try { localStorage.removeItem(key); } catch (e) {}
        });

        // 2) Clear ALL sessionStorage
        try { sessionStorage.clear(); } catch (e) {}

        // 3) Clear ALL cookies (force an expiration date in the past)
        try {
            const host = window.location.hostname;
            document.cookie.split(';').forEach(cookie => {
                const name = cookie.split('=')[0].trim();
                if (!name) return;
                document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
                if (host) {
                    document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=' + host;
                }
            });
        } catch (e) {}

        this.notify();

        // Sync logout state to the cloud so other devices are logged out too
        pushToFirestore(STORAGE_KEYS.CART, []);
    }
}

export const state = new ERPState();
