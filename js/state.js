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
    CASH_ON_HAND: 'hussam_erp_cash_on_hand_v2.5'
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
        this.activeView = 'dashboard';
        this.listeners = [];

        this.checkStockThresholds();
    }

    load(key, defaultValue) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (e) {
            console.error('LocalStorage load error:', e);
            return defaultValue;
        }
    }

    save(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            this.notify();
        } catch (e) {
            console.error('LocalStorage save error:', e);
        }
        // Cloud sync: push every change to Firestore (fire-and-forget)
        pushToFirestore(key, data);
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
            case STORAGE_KEYS.CURRENT_USER:    this.currentUser = value;     break;
            case STORAGE_KEYS.CASH_ON_HAND:    this.cashOnHand = value;      break;
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

        const keys = Object.values(STORAGE_KEYS);
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
        this.addNotification({
            title: `➕ إضافة صنف جديد: ${newProduct.name}`,
            message: `تم إضافة الصنف (${newProduct.name}) بسعر شراء ${newProduct.buyPrice} ج.م وسعر بيع ${newProduct.sellPrice} ج.م.`,
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

        this.products[index] = {
            ...p,
            stockPacks:    totalQty,
            buyPrice:      updatedBuyPrice,
            sellPrice:     updatedSellPrice,
            minStockPacks: updatedMinStock,
            lastRestockAt: new Date().toLocaleString('ar-EG')
        };

        this.save(STORAGE_KEYS.PRODUCTS, this.products);
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

    addCustomerPayment(customerId, amount) {
        const customer = this.customers.find(c => c.id === customerId);
        if (customer) {
            const pay = Number(amount);
            customer.paidAmount += pay;
            customer.debt = Math.max(0, customer.debt - pay);
            customer.lastPaymentDate = new Date().toISOString().split('T')[0];
            this.save(STORAGE_KEYS.CUSTOMERS, this.customers);
        }
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

    /* Checkout & Invoices */
    checkout(checkoutData) {
        if (this.cart.length === 0) return null;

        const totalCost = this.cart.reduce((sum, item) => sum + (item.buyPrice * item.qty), 0);
        const subtotal = this.cart.reduce((sum, item) => sum + (item.unitPrice * item.qty), 0);
        const discount = Number(checkoutData.discount) || 0;
        const grandTotal = Math.max(0, subtotal - discount);
        const paidAmount = Number(checkoutData.paidAmount) || 0;
        const remainingDebt = Math.max(0, grandTotal - paidAmount);
        const netProfit = grandTotal - totalCost;

        const invoiceNumber = 'INV-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);

        const seller = this.currentUser || { id: 1, name: 'حسام حسني' };

        const newInvoice = {
            id: Date.now(),
            invoiceNumber,
            customerName: checkoutData.customerName || 'عميل نقدي (كاش)',
            customerId: checkoutData.customerId || null,
            items: [...this.cart],
            subtotal,
            discount,
            grandTotal,
            totalCost,
            netProfit,
            paidAmount,
            remainingDebt,
            paymentMethod: checkoutData.paymentMethod || 'cash',
            createdAt: new Date().toLocaleString('ar-EG'),
            sellerId: seller.id,
            sellerName: seller.name || 'حسام حسني'
        };

        // Deduct inventory stock & update employee quota soldQty
        this.cart.forEach(cartItem => {
            const product = this.products.find(p => p.id === cartItem.productId);
            if (product) {
                product.stockPacks = Math.max(0, product.stockPacks - cartItem.qty);
            }

            // If seller is an employee with quotas, increment soldQty
            const sellerUser = this.users.find(u => u.id === seller.id);
            if (sellerUser && sellerUser.productQuotas && sellerUser.productQuotas !== 'all') {
                if (!sellerUser.productQuotas[cartItem.productId]) {
                    sellerUser.productQuotas[cartItem.productId] = { allocatedQty: 0, soldQty: 0 };
                }
                sellerUser.productQuotas[cartItem.productId].soldQty = (sellerUser.productQuotas[cartItem.productId].soldQty || 0) + cartItem.qty;
            }
        });
        this.save(STORAGE_KEYS.PRODUCTS, this.products);
        this.save(STORAGE_KEYS.USERS, this.users);

        // Update customer debt if applicable
        if (checkoutData.customerId && remainingDebt > 0) {
            const customer = this.customers.find(c => c.id == checkoutData.customerId);
            if (customer) {
                customer.debt += remainingDebt;
                customer.totalPurchases += grandTotal;
                this.save(STORAGE_KEYS.CUSTOMERS, this.customers);
            }
        }

        // Add notification for ALL sales
        this.addNotification({
            title: `🛒 عملية بيع جديدة (${invoiceNumber})`,
            message: `تم إصدار الفاتورة بواسطة (${seller.name}) للعميل (${newInvoice.customerName}) بقيمة ${grandTotal} ج.م.`,
            type: 'sale'
        });

        // Increment Cash Liquidity by paid amount
        this.cashOnHand += paidAmount;
        this.save(STORAGE_KEYS.CASH_ON_HAND, this.cashOnHand);

        this.invoices.unshift(newInvoice);
        this.save(STORAGE_KEYS.INVOICES, this.invoices);
        this.clearCart();
        this.checkStockThresholds();

        return newInvoice;
    }

    /* Cash Liquidity Management */
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

        this.invoices[index] = updatedInvoice;
        this.save(STORAGE_KEYS.CUSTOMERS, this.customers);
        this.save(STORAGE_KEYS.INVOICES, this.invoices);
        return updatedInvoice;
    }

    deleteInvoice(invoiceId) {
        const inv = this.invoices.find(i => String(i.id) === String(invoiceId) || i.invoiceNumber === invoiceId);
        if (!inv) return false;

        // Safely adjust customer debt if applicable
        if (inv.customerId && inv.remainingDebt > 0) {
            const customer = this.customers.find(c => c.id == inv.customerId);
            if (customer) {
                customer.debt = Math.max(0, customer.debt - inv.remainingDebt);
                customer.totalPurchases = Math.max(0, customer.totalPurchases - inv.grandTotal);
                this.save(STORAGE_KEYS.CUSTOMERS, this.customers);
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

    assignEmployeeQuota(userId, { assignedCustomers, productQuotas }) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return { success: false, message: 'الموظف غير موجود!' };

        // Validate each product quota allocation against unallocated stock
        for (const [prodIdStr, newAllocQty] of Object.entries(productQuotas)) {
            const productId = Number(prodIdStr);
            const product = this.products.find(p => p.id === productId);
            if (!product) continue;

            const requestedAlloc = Number(newAllocQty) || 0;
            const existingSold = user.productQuotas && user.productQuotas[productId]
                ? Number(user.productQuotas[productId].soldQty) || 0
                : 0;

            const netRequestedQuota = Math.max(0, requestedAlloc - existingSold);
            const freeStock = this.getUnallocatedStock(productId, userId);

            if (netRequestedQuota > freeStock) {
                return {
                    success: false,
                    message: `عفواً! الكمية المتاحة للتخصيص بالمخزن الرئيسي لصنف (${product.name}) هي ${freeStock} قروصة فقط! لا يمكنك تخصيص ${requestedAlloc} لهذا الموظف لأن الكمية مخصصة بعُهد لموظفين آخرين أو غير متوفرة.`
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
            const existingSold = user.productQuotas[productId] ? (user.productQuotas[productId].soldQty || 0) : 0;
            user.productQuotas[productId] = {
                allocatedQty: Number(newAllocQty) || 0,
                soldQty: existingSold
            };
        }

        this.save(STORAGE_KEYS.USERS, this.users);
        return { success: true };
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
        pushToFirestore(STORAGE_KEYS.CURRENT_USER, null);
        pushToFirestore(STORAGE_KEYS.CART, []);
    }
}

export const state = new ERPState();
