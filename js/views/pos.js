import { state } from '../state.js';

let activeCategory = 'الكل';
let searchQuery = '';
let posSubTab = 'main'; // 'main' or 'employees'
let activeEmployeePosId = null; // if Admin clicked "دخول نقطة بيعه"

function getCartPaidDefault(subtotal) {
    return state.currentPOSPaid !== undefined ? state.currentPOSPaid : subtotal;
}

function renderCartItemHtml(item) {
    return `
        <div class="cart-item-card">
            <div class="cart-item-info">
                <div class="cart-item-title">${item.name}</div>
                <div class="cart-item-price-sub" onclick="window.openCartItemDiscountPopup(${item.productId})" title="اضغط لتعديل سعر الصنف بهذه الفاتورة">${item.unitPrice} ج.م / قروصة ✏️</div>
            </div>
            <div class="cart-item-controls">
                <div class="qty-stepper">
                    <button type="button" class="qty-step-btn" onclick="window.posUpdateQty(${item.productId}, ${item.qty - 1})" aria-label="تقليل الكمية">−</button>
                    <input
                        type="number"
                        inputmode="numeric"
                        pattern="[0-9]*"
                        class="qty-value-input"
                        value="${item.qty}"
                        min="1"
                        aria-label="كمية ${item.name}"
                        oninput="window.posUpdateQtyInline(${item.productId}, this)"
                        onblur="window.posCommitQtyInput(${item.productId}, this)"
                        onkeydown="if(event.key==='Enter'){this.blur();}"
                    >
                    <button type="button" class="qty-step-btn" onclick="window.posUpdateQty(${item.productId}, ${item.qty + 1})" aria-label="زيادة الكمية">+</button>
                </div>
                <div class="cart-item-total" id="cart-item-total-${item.productId}">${(item.unitPrice * item.qty).toFixed(0)} ج</div>
                <div class="cart-item-actions">
                    <button type="button" title="خصم على هذا الصنف" class="cart-item-action-btn" onclick="window.openCartItemDiscountPopup(${item.productId})">✏️</button>
                    <button type="button" title="حذف" class="cart-item-action-btn cart-item-action-delete" onclick="window.posRemoveItem(${item.productId})">🗑️</button>
                </div>
            </div>
        </div>
    `;
}

function renderCartSummaryHtml(subtotal) {
    const discount = state.currentPOSDiscount || 0;
    const paidDefault = getCartPaidDefault(subtotal);

    return `
        <div class="cart-summary-box">
            <div class="cart-summary-row">
                <span>المجموع الكلي:</span>
                <span class="cart-summary-value" id="pos-subtotal-val">${subtotal} ج.م</span>
            </div>

            <div class="cart-summary-row cart-summary-row-input">
                <span>خصم للفاتورة (ج.م):</span>
                <input
                    type="number"
                    inputmode="decimal"
                    id="pos-discount-input"
                    class="form-control pos-summary-input"
                    value="${discount}"
                    min="0"
                    oninput="window.posRecalculateTotals()"
                >
            </div>

            <div class="cart-summary-row">
                <span>طريقة الدفع:</span>
                <span class="payment-method-badge">جزئي</span>
                <input type="hidden" id="pos-payment-method" value="partial">
            </div>

            <div class="cart-summary-row cart-summary-row-input">
                <span>المبلغ المدفوع الآن:</span>
                <input
                    type="number"
                    inputmode="decimal"
                    id="pos-paid-input"
                    class="form-control pos-summary-input pos-paid-input"
                    value="${paidDefault}"
                    min="0"
                    oninput="window.posUserChangedPaidInput(this)"
                    onchange="window.posUserChangedPaidInput(this)"
                >
            </div>
        </div>

        <div class="cart-summary-total-banner">
            <span class="label">إجمالي الفاتورة المطلوب:</span>
            <div class="cart-grand-total-wrap">
                <span class="amount" id="pos-grand-total-val">${Math.max(0, subtotal - discount)} ج.م</span>
            </div>
        </div>

        <button type="button" class="btn-open-invoice-orange" onclick="window.posProcessCheckout()">
            ✓ فتح الفاتورة
        </button>
    `;
}

function renderMobileCartBar(totalQty, subtotal) {
    return `
        <div class="mobile-floating-cart-bar" onclick="window.posScrollToCart()">
            <div class="mobile-cart-bar-info">
                <span class="mobile-cart-bar-icon">🛒</span>
                <span class="mobile-cart-bar-label">الفاتورة والسلة (${totalQty} أصناف)</span>
            </div>
            <span class="mobile-cart-bar-total">${subtotal} ج.م</span>
        </div>
    `;
}

export function renderPosView() {
    const user = state.currentUser || { id: 1, role: 'مدير عام', permissions: ['all'] };
    const isAdmin = user.role === 'مدير عام' || (user.permissions && user.permissions.includes('all'));

    // Non-admin employees auto-land on their dedicated POS view
    if (!isAdmin) {
        return renderDedicatedEmployeePosView(user.id);
    }

    // If Admin clicked "دخول نقطة بيعه" for an employee
    if (activeEmployeePosId) {
        return renderDedicatedEmployeePosView(activeEmployeePosId, true);
    }

    // If Admin is viewing Employees POS Hub (Screenshot 2)
    if (posSubTab === 'employees') {
        return renderAdminEmployeePosHubView();
    }

    // Main POS View (Screenshot 1 Layout)
    return renderMainPosView(user);
}

/* ─── 1. Main POS View ────────────────────────────────────────── */
function renderMainPosView(user) {
    const nonAdminEmployees = state.users.filter(u => u.id !== 1 && u.role !== 'مدير عام');
    const availableCustomers = state.customers;

    const products = state.products.filter(p => {
        const matchesCategory = activeCategory === 'الكل' || p.category === activeCategory;
        const matchesSearch = p.name.includes(searchQuery) || (p.barcode && p.barcode.includes(searchQuery));
        return matchesCategory && matchesSearch;
    });

    const cartItems = state.cart;
    const subtotal = cartItems.reduce((sum, item) => sum + (item.unitPrice * item.qty), 0);
    const totalQty  = cartItems.reduce((sum, i) => sum + i.qty, 0);

    const categories = ['الكل', 'كليوباترا ومحلي', 'مارلبورو وأجنبي', 'فيب وإكسسوارات'];

    return `
        <!-- POS Header with Tab Switcher (Screenshot 1) -->
        <div class="pos-header-bar flex-between" style="flex-wrap:wrap;gap:0.75rem;">
            <div style="display:flex;align-items:center;gap:0.6rem;">
                <span style="font-size:1.1rem;">🛒</span>
                <div>
                    <div style="font-size:1rem;font-weight:900;color:#fff;">
                        نقطة البيع السريعة وتعديل أسعار اليوم (POS)
                    </div>
                    <div style="font-size:0.75rem;color:var(--text-muted);margin-top:0.1rem;">بيع بالقروصة والعلبة والكرتونة، إدارة نقاط بيع الموظفين، والتصدير الفوري.</div>
                </div>
            </div>

            <!-- Switcher Pill Box (Exact Match to Screenshot 1) -->
            <div class="pos-switcher-box">
                <button class="pos-tab-pill ${posSubTab === 'employees' ? 'active' : ''}" onclick="window.posSwitchSubTab('employees')">
                    👥 نقطة بيع الموظفين (${nonAdminEmployees.length})
                </button>
                <button class="pos-tab-pill ${posSubTab === 'main' ? 'active' : ''}" onclick="window.posSwitchSubTab('main')">
                    نقطة البيع الرئيسية
                </button>
            </div>
        </div>

        <!-- POS 2-column: products RIGHT | cart LEFT (RTL order) -->
        <div class="pos-layout">

            <!-- ═══ COLUMN 1 in DOM = RIGHT side in RTL: Products ═══ -->
            <div class="pos-products-section">

                <!-- Search + Categories -->
                <div class="pos-search-bar">
                    <div class="search-box" style="flex:1;">
                        <input
                            type="text"
                            placeholder="ابحث بالاسم، الماركة، أو امسح الباركود..."
                            value="${searchQuery}"
                            oninput="window.posSearchInput(this.value)"
                            style="width:100%;"
                        >
                        <span class="search-icon">🔍</span>
                    </div>
                    <div class="category-filter-pills">
                        ${categories.map(cat => `
                            <button class="category-btn ${activeCategory === cat ? 'active' : ''}"
                                onclick="window.posSetCategory('${cat}')">
                                ${cat}
                            </button>
                        `).join('')}
                    </div>
                </div>

                <!-- Products Grid -->
                <div class="products-grid">
                    ${products.length === 0 ? `
                        <div class="empty-table-state" style="grid-column:1/-1;padding:3rem 1rem;">
                            <i>📦</i>
                            <p style="font-size:1rem;font-weight:700;">لا توجد أصناف تطابق البحث</p>
                            <button class="btn-primary" style="margin-top:1rem;" onclick="window.openAddProductModal()">
                                + إضافة صنف للمخزن الآن
                            </button>
                        </div>
                    ` : products.map(p => `
                        <div class="product-card">
                            <div>
                                <div class="product-card-top">
                                    <span class="product-code-pill">${p.barcode}</span>
                                    <div style="font-size:0.7rem;color:var(--text-muted);">box</div>
                                </div>
                                <div class="product-title-text" style="margin:0.4rem 0 0.35rem;">${p.name}</div>
                                <div class="product-info-row">
                                    <span class="info-label">سعر القروصة:</span>
                                    <span class="info-value" style="color:var(--primary-orange);">${p.sellPrice} ج.م</span>
                                </div>
                                <div class="product-info-row">
                                    <span class="info-label">المتاح بالمخزن:</span>
                                    <span class="info-value" style="color:${p.stockPacks <= p.minStockPacks ? 'var(--accent-red)' : 'var(--accent-teal)'};">
                                        ${p.stockPacks} قروصة
                                    </span>
                                </div>
                            </div>
                            <button
                                class="btn-add-item-green"
                                style="${p.stockPacks <= 0 ? 'background:#374151;color:#9ca3af;cursor:not-allowed;' : ''}"
                                onclick="window.posAddToCart(${p.id})">
                                ${p.stockPacks <= 0 ? '⚠️ نافد من المخزن' : `+ إضافة (1 قروصة) بسعر ${p.sellPrice} ج`}
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- ═══ COLUMN 2 in DOM = LEFT side in RTL: Cart / Invoice ═══ -->
            <div class="pos-cart-section">

                <!-- Cart Header -->
                <div class="flex-between" style="border-bottom:1px dashed var(--border-color);padding-bottom:0.85rem;margin-bottom:1rem;">
                    <div class="cart-header-title">💳 الفاتورة وتصفية الحساب</div>
                    <div style="font-size:0.78rem;color:var(--text-muted);" id="cart-item-count-badge">
                        ${totalQty} أصناف في السلة
                    </div>
                </div>

                <!-- Customer Selector -->
                <div style="margin-bottom:0.85rem;">
                    <label class="form-label" style="font-size:0.78rem;font-weight:800;margin-bottom:0.3rem;">اختر العميل المشتري *</label>
                    <select class="form-control" id="pos-customer-select" style="font-size:0.82rem;" onchange="window.posOnCustomerSelectChange(this.value)">
                        <option value="">-- بيع مباشر لعميل كاش نقدي --</option>
                        ${availableCustomers.map(c => `
                            <option value="${c.id}">${c.name} (${c.shopName || 'تاجر'}) - مدين سابقاً: ${c.debt} ج.م</option>
                        `).join('')}
                    </select>
                    <div id="pos-customer-debt-box" style="margin-top:0.6rem;"></div>
                </div>

                <!-- Cart Items -->
                <div class="cart-items-list">
                    ${cartItems.length === 0 ? `
                        <div class="empty-table-state" style="padding:1.5rem 0.5rem;">
                            <i style="font-size:1.5rem;color:#232d48;">🛒</i>
                            <p style="font-size:0.8rem;color:var(--text-muted);margin-top:0.5rem;text-align:center;">
                                الفاتورة فارغة. اضغط على خيارات الأصناف لإضافتها إلى السلة.
                            </p>
                        </div>
                    ` : cartItems.map(item => renderCartItemHtml(item)).join('')}
                </div>

                ${renderCartSummaryHtml(subtotal)}
            </div>

        </div><!-- end pos-layout -->

        ${renderMobileCartBar(totalQty, subtotal)}
    `;
}

/* ─── 2. Admin Employee POS Management Hub (Exact match to Screenshot 2) ─── */
function renderAdminEmployeePosHubView() {
    const nonAdminEmployees = state.users.filter(u => u.id !== 1 && u.role !== 'مدير عام');

    return `
        <!-- POS Header Header -->
        <div class="pos-header-bar flex-between" style="flex-wrap:wrap;gap:0.75rem;">
            <div style="display:flex;align-items:center;gap:0.6rem;">
                <span style="font-size:1.1rem;">🛒</span>
                <div>
                    <div style="font-size:1rem;font-weight:900;color:#fff;">
                        نقطة البيع السريعة وتعديل أسعار اليوم (POS)
                    </div>
                    <div style="font-size:0.75rem;color:var(--text-muted);margin-top:0.1rem;">بيع بالقروصة والعلبة والكرتونة، إدارة نقاط بيع الموظفين، والتصدير الفوري.</div>
                </div>
            </div>

            <!-- Switcher Pill Box (Exact Match to Screenshot 2) -->
            <div class="pos-switcher-box">
                <button class="pos-tab-pill active" onclick="window.posSwitchSubTab('employees')">
                    👥 نقطة بيع الموظفين (${nonAdminEmployees.length})
                </button>
                <button class="pos-tab-pill" onclick="window.posSwitchSubTab('main')">
                    نقطة البيع الرئيسية
                </button>
            </div>
        </div>

        <!-- Section Title Bar -->
        <div class="flex-between" style="margin-bottom:1rem;padding:0.25rem 0.5rem;">
            <div style="font-size:1rem;font-weight:900;color:#fff;display:flex;align-items:center;gap:0.5rem;">
                👥 إدارة وتخصيص نقاط البيع لموظفي المؤسسة
            </div>
            <div style="font-size:0.82rem;color:var(--text-muted);">
                اختر موظفاً لتعديل أصنافه وعملائه أو الدخول لنقطة بيعه
            </div>
        </div>

        <!-- Employee Cards Grid (Screenshot 2) -->
        <div class="emp-pos-grid">
            ${nonAdminEmployees.length === 0 ? `
                <div class="empty-table-state" style="grid-column:1/-1;padding:3rem 1rem;">
                    <i>👥</i>
                    <p style="font-size:1rem;font-weight:700;">لا يوجد موظفين مسجلين حالياً</p>
                    <button class="btn-primary" style="margin-top:1rem;" onclick="window.openAddUserModal()">
                        + إضافة أول موظف الآن
                    </button>
                </div>
            ` : nonAdminEmployees.map(emp => {
                const isBlocked = emp.status === 'disabled';
                let totalAllocPacks = 0;
                let allocatedItemCount = 0;

                if (emp.productQuotas && emp.productQuotas !== 'all') {
                    Object.values(emp.productQuotas).forEach(q => {
                        const rem = Math.max(0, (q.allocatedQty || 0) - (q.soldQty || 0));
                        if (rem > 0 || q.allocatedQty > 0) {
                            allocatedItemCount++;
                            totalAllocPacks += rem;
                        }
                    });
                } else if (emp.productQuotas === 'all') {
                    allocatedItemCount = state.products.length;
                    totalAllocPacks = state.products.reduce((s, p) => s + p.stockPacks, 0);
                }

                const custCountStr = emp.assignedCustomers === 'all'
                    ? 'كافة العملاء'
                    : Array.isArray(emp.assignedCustomers) ? `${emp.assignedCustomers.length} عملاء` : '0 عملاء';

                // Calculate employee financial breakdown & custody metrics
                const empInvoices = state.invoices.filter(inv => String(inv.sellerId) === String(emp.id) || inv.sellerName === emp.name);
                const empSalesToday = empInvoices.reduce((sum, inv) => sum + (Number(inv.grandTotal) || 0), 0);
                const empCustomers = state.getAvailableCustomersForUser(emp);
                const empCustomerDebts = empCustomers.reduce((sum, c) => sum + (Number(c.debt) || 0), 0);
                const empCashHand = Number(emp.delegateCashHand) || 0;

                return `
                    <div class="emp-pos-card" style="${isBlocked ? 'opacity:0.75;background:#111726;' : ''}">
                        <div class="emp-card-top">
                            <div style="display:flex;align-items:center;gap:0.75rem;">
                                <div class="emp-avatar-circle">${emp.name ? emp.name.charAt(0) : 'م'}</div>
                                <div>
                                    <div style="font-size:1.1rem;font-weight:900;color:#fff;">${emp.name}</div>
                                    <div style="font-size:0.75rem;color:var(--text-muted);font-family:monospace;">${emp.username} • ${emp.role || 'مندوب مبيعات'}</div>
                                </div>
                            </div>
                            <span class="badge ${isBlocked ? 'badge-red' : 'badge-teal'}">
                                ${isBlocked ? 'موقوف' : 'نشط'}
                            </span>
                        </div>

                        <!-- Metrics Box -->
                        <div class="emp-metrics-box">
                            <div>
                                <div class="emp-metric-sub">العهدة المتاحة للمندوب</div>
                                <div class="emp-metric-val" style="color:var(--primary-orange);">${allocatedItemCount} أصناف (${totalAllocPacks} قروصة)</div>
                            </div>
                            <div>
                                <div class="emp-metric-sub">العملاء المخصصين</div>
                                <div class="emp-metric-val" style="color:var(--accent-teal);">${custCountStr}</div>
                            </div>
                        </div>

                        <!-- Financial Custody & Collection Breakdown (User Prompt Requirement) -->
                        <div style="background:#090e1a;border:1px solid var(--border-color);border-radius:12px;padding:0.75rem;display:flex;flex-direction:column;gap:0.45rem;font-size:0.8rem;">
                            <div class="flex-between">
                                <span style="color:var(--text-muted);">إجمالي مبيعات المندوب:</span>
                                <strong style="color:var(--primary-orange);font-weight:900;">${empSalesToday.toLocaleString('ar-EG')} ج.م</strong>
                            </div>
                            <div class="flex-between">
                                <span style="color:var(--text-muted);">💵 نقود محصلة مع المندوب:</span>
                                <strong style="color:var(--accent-teal);font-weight:900;">${empCashHand.toLocaleString('ar-EG')} ج.م</strong>
                            </div>
                            <div class="flex-between">
                                <span style="color:var(--text-muted);">👥 ديون العملاء المخصصين له:</span>
                                <strong style="color:var(--accent-purple);font-weight:900;">${empCustomerDebts.toLocaleString('ar-EG')} ج.م</strong>
                            </div>
                        </div>

                        <!-- Employee Action Buttons -->
                        <div class="emp-card-actions">
                            ${empCashHand > 0 ? `
                                <button class="btn-primary" style="background:var(--accent-teal);color:#000;border:none;font-size:0.85rem;padding:0.55rem;" onclick="window.openCollectDelegateCashModal(${emp.id})">
                                    💵 تحصيل المبلغ من المندوب (${empCashHand.toLocaleString('ar-EG')} ج)
                                </button>
                            ` : ''}
                            <button class="btn-enter-emp-pos" onclick="window.posEnterEmployeePos(${emp.id})">
                                🛒 دخول نقطة بيعه
                            </button>
                            <button class="btn-emp-secondary" onclick="window.openAssignQuotaModal(${emp.id})">
                                🎛️ تخصيص الصلاحيات والعهد
                            </button>
                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.4rem;">
                                <button class="btn-secondary" style="font-size:0.75rem;padding:0.4rem;" onclick="window.openEditUserModal(${emp.id})">
                                    ✏️ تعديل البيانات
                                </button>
                                <button class="${isBlocked ? 'btn-primary' : 'btn-danger'}" style="font-size:0.75rem;padding:0.4rem;" onclick="window.toggleUserStatus(${emp.id})">
                                    ${isBlocked ? '✅ تفعيل' : '⛔ إيقاف'}
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('')}
    `;
}

/* ─── 3. Dedicated Employee POS View (Exact match to Screenshot 3) ─── */
function renderDedicatedEmployeePosView(empId, isEnteredByAdmin = false) {
    const emp = state.users.find(u => u.id === empId) || state.currentUser;
    const availableCustomers = state.customers.filter(c => {
        if (!emp.assignedCustomers || emp.assignedCustomers === 'all') return true;
        return Array.isArray(emp.assignedCustomers) && emp.assignedCustomers.includes(c.id);
    });

    // Check allocated products
    const allocatedProducts = state.products.filter(p => {
        const quota = state.getEmployeeQuota(emp.id, p.id);
        if (quota.isUnlimited) return true;
        return quota.allocatedQty > 0;
    });

    const products = allocatedProducts.filter(p => {
        const matchesCategory = activeCategory === 'الكل' || p.category === activeCategory;
        const matchesSearch = p.name.includes(searchQuery) || (p.barcode && p.barcode.includes(searchQuery));
        return matchesCategory && matchesSearch;
    });

    const cartItems = state.cart.filter(item => {
        return allocatedProducts.some(p => p.id === item.productId);
    });
    const subtotal = cartItems.reduce((sum, item) => sum + (item.unitPrice * item.qty), 0);
    const totalQty  = cartItems.reduce((sum, i) => sum + i.qty, 0);

    const categories = ['الكل', 'كليوباترا ومحلي', 'مارلبورو وأجنبي', 'فيب وإكسسوارات'];

    return `
        <!-- Dedicated Employee POS Header (Screenshot 3) -->
        <div class="pos-header-bar flex-between" style="flex-wrap:wrap;gap:0.75rem;">
            <div style="display:flex;align-items:center;gap:0.6rem;">
                <span style="font-size:1.2rem;">🛒</span>
                <div>
                    <div style="font-size:1.15rem;font-weight:900;color:#fff;">
                        نقطة بيع الموظف: ${emp.name}
                    </div>
                    <div style="font-size:0.75rem;color:var(--text-muted);margin-top:0.1rem;">
                        إصدار الفواتير الفورية للأصناف والعملاء المخصصين فقط لهذا الموظف.
                    </div>
                </div>
            </div>

            <div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;">
                <button class="btn-secondary" style="font-size:0.82rem;padding:0.45rem 0.85rem;background:#182238;color:var(--primary-orange);border:1px solid rgba(255,159,26,0.3);" onclick="window.openEmployeeTodayInvoicesModal(${emp.id})">
                    📄 فواتير اليوم للموظف
                </button>

                ${isEnteredByAdmin ? `
                    <button class="btn-danger" style="font-size:0.85rem;padding:0.45rem 1rem;font-weight:800;" onclick="window.posExitEmployeePos()">
                        ➔ الخروج والعودة لنقطة بيع المدير
                    </button>
                ` : ''}
            </div>
        </div>

        <!-- POS Split Layout -->
        <div class="pos-layout">

            <!-- ═══ COLUMN 1 in DOM = RIGHT side in RTL: Products ═══ -->
            <div class="pos-products-section">

                <!-- Search + Categories -->
                <div class="pos-search-bar">
                    <div class="search-box" style="flex:1;">
                        <input
                            type="text"
                            placeholder="ابحث بالاسم، الماركة، أو امسح الباركود..."
                            value="${searchQuery}"
                            oninput="window.posSearchInput(this.value)"
                            style="width:100%;"
                        >
                        <span class="search-icon">🔍</span>
                    </div>
                    <div class="category-filter-pills">
                        ${categories.map(cat => `
                            <button class="category-btn ${activeCategory === cat ? 'active' : ''}"
                                onclick="window.posSetCategory('${cat}')">
                                ${cat}
                            </button>
                        `).join('')}
                    </div>
                </div>

                <!-- Products Grid / Empty Warning (Exact match to Screenshot 3) -->
                ${allocatedProducts.length === 0 ? `
                    <div class="empty-quota-warning-card">
                        <div class="warning-icon-large">⚠️</div>
                        <div class="warning-title-text">لم يتم تخصيص أصناف أو عهدة لهذا الموظف حتى الآن</div>
                        <div class="warning-sub-text">
                            يرجى التواصل مع المدير العام (حسام حسني) لتخصيص أصناف وبضاعة ومحلات للموظف من خيار "تخصيص الصلاحيات والعهد".
                        </div>
                    </div>
                ` : `
                    <div class="products-grid">
                        ${products.map(p => {
                            const quota = state.getEmployeeQuota(emp.id, p.id);
                            const isStockEmpty = p.stockPacks <= 0;
                            const isQuotaEmpty = !quota.isUnlimited && quota.remainingQty <= 0;

                            let statusBadge = '';
                            if (isStockEmpty) {
                                statusBadge = `<span style="color:var(--accent-red);font-weight:800;font-size:0.75rem;">⚠️ المخزن الرئيسي فارغ</span>`;
                            } else if (isQuotaEmpty) {
                                statusBadge = `<span style="color:var(--accent-red);font-weight:800;font-size:0.75rem;">⚠️ نفذت عهدتك المخصصة</span>`;
                            } else if (!quota.isUnlimited) {
                                statusBadge = `<span style="color:var(--accent-teal);font-weight:800;font-size:0.78rem;">عهدتك: ${quota.remainingQty} / ${quota.allocatedQty} قروصة</span>`;
                            } else {
                                statusBadge = `<span style="color:var(--accent-teal);font-weight:800;font-size:0.82rem;">${p.stockPacks} قروصة بالمخزن</span>`;
                            }

                            return `
                                <div class="product-card" style="${isStockEmpty || isQuotaEmpty ? 'opacity:0.75;' : ''}">
                                    <div>
                                        <div class="product-card-top">
                                            <span class="product-code-pill">${p.barcode}</span>
                                            <div style="font-size:0.7rem;color:var(--text-muted);">box</div>
                                        </div>
                                        <div class="product-title-text" style="margin:0.4rem 0 0.35rem;">${p.name}</div>
                                        <div class="product-info-row">
                                            <span class="info-label">سعر القروصة:</span>
                                            <span class="info-value" style="color:var(--primary-orange);">${p.sellPrice} ج.م</span>
                                        </div>
                                        <div class="product-info-row">
                                            <span class="info-label">المتاح للبيع:</span>
                                            <span class="info-value">${statusBadge}</span>
                                        </div>
                                    </div>
                                    <button
                                        class="btn-add-item-green"
                                        style="${isStockEmpty || isQuotaEmpty ? 'background:#374151;color:#9ca3af;cursor:not-allowed;' : ''}"
                                        onclick="window.posAddToCart(${p.id})">
                                        ${isStockEmpty ? '⚠️ بالمخزن 0' : isQuotaEmpty ? '⚠️ عهدتك انتهت' : `+ إضافة (1 قروصة) بسعر ${p.sellPrice} ج`}
                                    </button>
                                </div>
                            `;
                        }).join('')}
                    </div>
                `}
            </div>

            <!-- ═══ COLUMN 2 in DOM = LEFT side in RTL: Cart / Invoice ═══ -->
            <div class="pos-cart-section">

                <!-- Cart Header -->
                <div class="flex-between" style="border-bottom:1px dashed var(--border-color);padding-bottom:0.85rem;margin-bottom:1rem;">
                    <div class="cart-header-title">💳 الفاتورة وتصفية الحساب</div>
                    <div style="font-size:0.78rem;color:var(--text-muted);" id="cart-item-count-badge">
                        ${totalQty} أصناف في السلة
                    </div>
                </div>

                <!-- Customer Selector -->
                <div style="margin-bottom:0.85rem;">
                    <label class="form-label" style="font-size:0.78rem;font-weight:800;margin-bottom:0.3rem;">اختر العميل المشتري *</label>
                    <select class="form-control" id="pos-customer-select" style="font-size:0.82rem;" onchange="window.posOnCustomerSelectChange(this.value)">
                        <option value="">-- بيع مباشر لعميل كاش نقدي --</option>
                        ${availableCustomers.map(c => `
                            <option value="${c.id}">${c.name} (${c.shopName || 'تاجر'}) - مدين سابقاً: ${c.debt} ج.م</option>
                        `).join('')}
                    </select>
                    <div id="pos-customer-debt-box" style="margin-top:0.6rem;"></div>
                </div>

                <!-- Cart Items -->
                <div class="cart-items-list">
                    ${cartItems.length === 0 ? `
                        <div class="empty-table-state" style="padding:1.5rem 0.5rem;">
                            <i style="font-size:1.5rem;color:#232d48;">🛒</i>
                            <p style="font-size:0.8rem;color:var(--text-muted);margin-top:0.5rem;text-align:center;">
                                الفاتورة فارغة. اضغط على خيارات الأصناف لإضافتها إلى السلة.
                            </p>
                        </div>
                    ` : cartItems.map(item => renderCartItemHtml(item)).join('')}
                </div>

                ${renderCartSummaryHtml(subtotal)}
            </div>

        </div><!-- end pos-layout -->

        ${renderMobileCartBar(totalQty, subtotal)}
    `;
}

/* ─── Global Handlers ─────────────────────────────────────────── */
window.posSwitchSubTab = (tab) => {
    posSubTab = tab;
    activeEmployeePosId = null;
    window.renderCurrentView();
};

window.posEnterEmployeePos = (empId) => {
    activeEmployeePosId = empId;
    window.renderCurrentView();
};

window.posExitEmployeePos = () => {
    activeEmployeePosId = null;
    window.renderCurrentView();
};

window.posSetCategory = (cat) => {
    activeCategory = cat;
    window.renderCurrentView();
};

window.posSearchInput = (query) => {
    searchQuery = query;
    window.renderCurrentView();
};

window.posAddToCart = (productId) => {
    const user = activeEmployeePosId
        ? state.users.find(u => u.id === activeEmployeePosId)
        : (state.currentUser || { id: 1 });

    const product = state.products.find(p => p.id === productId);
    if (!product) return;

    if (product.stockPacks <= 0) {
        alert(`عفواً! الصنف (${product.name}) غير متوفر بالمخزن الرئيسي (الكمية 0).`);
        return;
    }

    const quota = state.getEmployeeQuota(user.id, productId);
    const inCart = state.cart.find(i => i.productId === productId);
    const currentQtyInCart = inCart ? inCart.qty : 0;
    const targetQty = currentQtyInCart + 1;

    if (targetQty > product.stockPacks) {
        alert(`⚠️ خذ بالك: الكمية المطلوبة (${targetQty}) تتجاوز إجمالي المتاح بالمخزن الرئيسي (${product.stockPacks} قروصة)!`);
        return;
    }

    if (!quota.isUnlimited && targetQty > quota.remainingQty) {
        alert(`⚠️ خذ بالك: أخذت/تجاوزت الكمية والعهدة المخصصة لك من صنف (${product.name})!\nالكمية المتبقية المتاحة لك من العهدة: ${quota.remainingQty} قروصة فقط (من إجمالي عهدة ${quota.allocatedQty} قروصة).`);
        return;
    }

    state.addToCart(productId, 1);
    window.renderCurrentView();
};

window.posUpdateQtyInline = (productId, inputEl) => {
    const raw = String(inputEl.value).trim();
    if (raw === '') return;

    const val = Number(raw);
    if (isNaN(val) || val <= 0) return;

    const product = state.products.find(p => p.id === productId);
    if (!product) return;

    const finalQty = Math.min(Math.floor(val), product.stockPacks);
    const cartItem = state.cart.find(i => i.productId === productId);
    if (cartItem) {
        cartItem.qty = finalQty;
        state.save('hussam_erp_cart_v2.5', state.cart);
        inputEl.value = finalQty;
    }

    const itemTotalEl = document.getElementById(`cart-item-total-${productId}`);
    if (itemTotalEl && cartItem) {
        itemTotalEl.innerText = `${(cartItem.unitPrice * finalQty).toFixed(0)} ج`;
    }

    const badgeEl = document.getElementById('cart-item-count-badge');
    if (badgeEl) {
        const totalQty = state.cart.reduce((sum, i) => sum + i.qty, 0);
        badgeEl.innerText = `${totalQty} أصناف في السلة`;
    }

    window.posRecalculateTotals();
};

window.posCommitQtyInput = (productId, inputEl) => {
    const raw = String(inputEl.value).trim();
    const val = Number(raw);
    const cartItem = state.cart.find(i => i.productId === productId);

    if (!cartItem) return;

    if (raw === '' || isNaN(val) || val <= 0) {
        inputEl.value = cartItem.qty;
        return;
    }

    window.posUpdateQty(productId, val);
};

window.posUpdateQty = (productId, qty) => {
    const targetQty = Math.max(0, Number(qty) || 0);
    if (targetQty <= 0) {
        state.removeFromCart(productId);
        window.renderCurrentView();
        return;
    }

    const product = state.products.find(p => p.id === productId);
    if (!product) return;

    const finalQty = Math.min(targetQty, product.stockPacks);
    state.updateCartQty(productId, finalQty);
    window.renderCurrentView();
};

window.posRemoveItem = (productId) => {
    state.removeFromCart(productId);
    window.renderCurrentView();
};

window.posClearCart = () => {
    state.clearCart();
    state.currentPOSPaid = undefined;
    state.currentPOSPaidManual = false;
    state.currentPOSDiscount = 0;
    window.renderCurrentView();
};

window.posUserChangedPaidInput = (inputEl) => {
    if (inputEl) {
        inputEl._userEdited = true;
        state.currentPOSPaidManual = true;
        const val = Number(inputEl.value);
        if (!isNaN(val)) {
            state.currentPOSPaid = val;
        }
    }
    window.posRecalculateTotals();
};

window.posScrollToCart = () => {
    const cartEl = document.querySelector('.pos-cart-section');
    if (cartEl) {
        cartEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
};

window.posRecalculateTotals = () => {
    const cartItems = state.cart;
    const subtotal  = cartItems.reduce((sum, item) => sum + (item.unitPrice * item.qty), 0);
    const discountInput = document.getElementById('pos-discount-input');
    const discount  = Number(discountInput?.value || 0);
    state.currentPOSDiscount = discount;

    const grandTotal = Math.max(0, subtotal - discount);

    const el1 = document.getElementById('pos-subtotal-val');
    const el2 = document.getElementById('pos-grand-total-val');
    const elPaid = document.getElementById('pos-paid-input');
    const mobileTotal = document.querySelector('.mobile-cart-bar-total');

    if (el1) el1.innerText = `${subtotal} ج.م`;
    if (el2) el2.innerText = `${grandTotal} ج.م`;
    if (mobileTotal) mobileTotal.innerText = `${subtotal} ج.م`;
    if (elPaid && !elPaid._userEdited && !state.currentPOSPaidManual) {
        elPaid.value = grandTotal;
        state.currentPOSPaid = grandTotal;
    }

    window.updateCustomerDebtSummaryBox();
};

window.posOnCustomerSelectChange = (customerId) => {
    window.updateCustomerDebtSummaryBox(customerId);
};

window.updateCustomerDebtSummaryBox = (custVal = null) => {
    const box = document.getElementById('pos-customer-debt-box');
    if (!box) return;

    const select = document.getElementById('pos-customer-select');
    const customerId = custVal !== null ? custVal : (select ? select.value : '');

    if (!customerId) {
        box.innerHTML = '';
        return;
    }

    const customer = state.customers.find(c => c.id == customerId);
    if (!customer) {
        box.innerHTML = '';
        return;
    }

    const cartItems = state.cart;
    const subtotal = cartItems.reduce((sum, item) => sum + (item.unitPrice * item.qty), 0);
    const discount = Number(document.getElementById('pos-discount-input')?.value || 0);
    const currentInvoiceTotal = Math.max(0, subtotal - discount);

    const paidInput = document.getElementById('pos-paid-input');
    const paidAmount = Number(paidInput ? paidInput.value : currentInvoiceTotal);

    const previousDebt = Number(customer.debt) || 0;
    const totalDebtBeforePayment = previousDebt + currentInvoiceTotal;
    const newInvoiceRemaining = Math.max(0, currentInvoiceTotal - paidAmount);
    const totalDebtAfterInvoice = previousDebt + newInvoiceRemaining;

    box.innerHTML = `
        <div style="background:#090e1a;border:1px solid rgba(255,159,26,0.3);border-radius:10px;padding:0.75rem;font-size:0.8rem;display:flex;flex-direction:column;gap:0.4rem;">
            <div class="flex-between">
                <span style="color:var(--text-muted);">المديونية السابقة للعميل:</span>
                <strong style="color:var(--accent-red);font-weight:900;">${previousDebt.toLocaleString('ar-EG')} ج.م</strong>
            </div>
            <div class="flex-between">
                <span style="color:var(--text-muted);">إجمالي الفاتورة الجديدة:</span>
                <strong style="color:#60a5fa;font-weight:900;">${currentInvoiceTotal.toLocaleString('ar-EG')} ج.م</strong>
            </div>
            <div class="flex-between" style="border-top:1px dashed var(--border-color);padding-top:0.3rem;">
                <span style="color:#fff;font-weight:800;">إجمالي الدين القديم + الجديد:</span>
                <strong style="color:var(--accent-purple);font-weight:900;">${totalDebtBeforePayment.toLocaleString('ar-EG')} ج.م</strong>
            </div>
            <div class="flex-between">
                <span style="color:var(--text-muted);">الدفعة المحصلة الآن:</span>
                <strong style="color:var(--accent-teal);font-weight:900;">${paidAmount.toLocaleString('ar-EG')} ج.م</strong>
            </div>
            <div class="flex-between">
                <span style="color:var(--text-muted);">المتبقي من الفاتورة الجديدة:</span>
                <strong style="color:var(--primary-orange);font-weight:900;">${newInvoiceRemaining.toLocaleString('ar-EG')} ج.م</strong>
            </div>
            <div class="flex-between" style="background:rgba(239,68,68,0.12);padding:0.4rem 0.6rem;border-radius:6px;border:1px solid rgba(239,68,68,0.3);margin-top:0.2rem;">
                <span style="color:#fff;font-weight:900;">إجمالي الرصيد المتبقي على العميل:</span>
                <strong style="color:var(--accent-red);font-weight:900;font-size:0.95rem;">${totalDebtAfterInvoice.toLocaleString('ar-EG')} ج.م</strong>
            </div>
            ${previousDebt > 0 ? `
                <button class="btn-primary" type="button" style="margin-top:0.35rem;padding:0.45rem;font-size:0.78rem;background:var(--accent-teal);border:none;width:100%;font-weight:800;" onclick="window.openPaymentModal(${customer.id})">
                    💵 تسديد سند قبض مباشر للدين السابق (${previousDebt.toLocaleString('ar-EG')} ج.م)
                </button>
            ` : ''}
        </div>
    `;
};

window.posProcessCheckout = () => {
    if (state.cart.length === 0) {
        alert('السلة فارغة! يرجى إضافة أصناف أولاً.');
        return;
    }
    const customerSelect = document.getElementById('pos-customer-select');
    const customerId   = customerSelect ? customerSelect.value : '';
    const customerText = customerSelect && customerSelect.selectedIndex >= 0
        ? customerSelect.options[customerSelect.selectedIndex].text
        : 'عميل نقدي (كاش)';
    const discount     = Number(document.getElementById('pos-discount-input')?.value || 0);
    const paidAmount   = Number(document.getElementById('pos-paid-input')?.value || 0);

    const invoice = state.checkout({
        customerId,
        customerName: customerId ? customerText.split('(')[0].trim() : 'عميل نقدي (كاش)',
        discount,
        paymentMethod: 'partial',
        paidAmount
    });

    if (invoice) {
        state.currentPOSPaid = undefined;
        state.currentPOSPaidManual = false;
        state.currentPOSDiscount = 0;
        window.showInvoiceModal(invoice);
        window.renderCurrentView();
    }
};
