import { state } from '../state.js';

let activeReportTab = 'invoices';
let activeSellerFilter = 'all';
let reportSearchQuery = '';

export function renderReportsView() {
    const allInvoices = state.invoices;
    const customers = state.customers;
    const users = state.users;
    const q = (reportSearchQuery || '').trim().toLowerCase();

    // Filter invoices by seller and search query (invoice number, customer name, seller name, items, ID)
    const invoices = allInvoices.filter(inv => {
        const matchesSeller = (activeSellerFilter === 'all') ||
            (String(inv.sellerId) === String(activeSellerFilter) || inv.sellerName === activeSellerFilter);
        if (!matchesSeller) return false;

        if (!q) return true;

        const invNum = inv.invoiceNumber ? String(inv.invoiceNumber).toLowerCase() : '';
        const idStr = String(inv.id || '');
        const custName = inv.customerName ? String(inv.customerName).toLowerCase() : '';
        const sellerName = inv.sellerName ? String(inv.sellerName).toLowerCase() : '';
        const itemNames = Array.isArray(inv.items) ? inv.items.map(i => i.name ? String(i.name).toLowerCase() : '').join(' ') : '';

        return invNum.includes(q) || idStr.includes(q) || custName.includes(q) || sellerName.includes(q) || itemNames.includes(q);
    });

    const selectedSeller = activeSellerFilter !== 'all' ? users.find(u => String(u.id) === String(activeSellerFilter)) : null;
    
    // Customer debts filtered by seller if selected
    const relevantCustomers = selectedSeller ? state.getAvailableCustomersForUser(selectedSeller) : customers;
    const totalDebts = relevantCustomers.reduce((sum, c) => sum + (Number(c.debt) || 0), 0);
    
    const inventoryCost = state.products.reduce((sum, p) => sum + ((Number(p.buyPrice) || 0) * (Number(p.stockPacks) || 0)), 0);
    const inventoryExpected = state.products.reduce((sum, p) => sum + ((Number(p.sellPrice) || 0) * (Number(p.stockPacks) || 0)), 0);

    // Cash liquidity (For selected seller -> their cash hand, For all -> total liquidity)
    const cashOnHand = selectedSeller 
        ? (Number(selectedSeller.delegateCashHand) || 0) 
        : state.getTotalLiquidity();

    const mainCash = Number(state.cashOnHand) || 0;
    const delegatesCash = state.getDelegatesTotalCash();

    // Delegate Collections filtered by search query
    const allSellerCollections = state.getDelegateCollections(activeSellerFilter);
    const sellerCollections = allSellerCollections.filter(v => {
        if (!q) return true;
        const vNum = v.voucherNumber ? String(v.voucherNumber).toLowerCase() : '';
        const vId = String(v.id || '');
        const dName = v.delegateName ? String(v.delegateName).toLowerCase() : '';
        const cBy = v.collectedBy ? String(v.collectedBy).toLowerCase() : '';
        const notes = v.notes ? String(v.notes).toLowerCase() : '';
        return vNum.includes(q) || vId.includes(q) || dName.includes(q) || cBy.includes(q) || notes.includes(q);
    });
    const totalSellerCollections = state.getTotalDelegateCollections(activeSellerFilter);

    const totalRevenue = invoices.reduce((sum, inv) => sum + (Number(inv.grandTotal) || 0), 0);
    const totalNetProfit = invoices.reduce((sum, inv) => sum + (Number(inv.netProfit) || 0), 0);

    return `
        <!-- Banner Header -->
        <div class="view-banner flex-between" style="flex-wrap:wrap;gap:0.75rem;">
            <div>
                <div style="font-size: 0.85rem; color: var(--primary-orange); font-weight: 700; margin-bottom: 0.25rem;">
                    📈 التقارير المالية وتتبع أرباح الموظفين والمناديب
                </div>
                <h1 style="font-size: 1.75rem; font-weight: 900; color: #fff;">تقرير "إداني دائماً" الشامل 📊</h1>
                <p style="color: var(--text-muted); font-size: 0.9rem; margin-top: 0.25rem;">
                    متابعة فلوسك بالسوق، عُهد المناديب، حركة الخزينة وتوريدات النقدية، قيمة بضاعتك بالمخزن، والأرباح الصافية الحقيقية بعد البيع.
                </p>
            </div>
        </div>

        <!-- Position Summary Cards (5 Detailed Accounting Pillars) -->
        <div class="card-dark" style="margin-bottom: 1.5rem;">
            <div class="flex-between" style="margin-bottom: 1rem; flex-wrap:wrap; gap:0.5rem;">
                <div style="font-size: 1.05rem; font-weight: 800; color: var(--primary-orange); display: flex; align-items: center; gap: 0.5rem;">
                    📋 تقرير "إداني دائماً" (ملخص الموقف المالي والمحاسبي ${selectedSeller ? `للمندوب: ${selectedSeller.name}` : 'للنشاط التجاري الكامل'})
                </div>
                <span class="badge badge-teal">تحديث فوري لجميع الحركات</span>
            </div>

            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:0.75rem;">
                <div style="background: #0f1524; padding: 1rem; border-radius: 12px; border: 1px solid var(--border-color);">
                    <div style="font-size: 0.78rem; color: var(--text-muted); font-weight: 700;">1. ليا كام في السوق (ديون)</div>
                    <div style="font-size: 1.45rem; font-weight: 900; color: var(--accent-purple); margin-top: 0.35rem;">
                        ${totalDebts.toLocaleString('ar-EG')} <span style="font-size: 0.8rem;">ج.م</span>
                    </div>
                    <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.2rem;">${selectedSeller ? `مستحقات عملاء (${selectedSeller.name})` : 'مجموع المستحقات بالسوق'}</div>
                </div>

                <div style="background: #0f1524; padding: 1rem; border-radius: 12px; border: 1px solid var(--border-color);">
                    <div style="font-size: 0.78rem; color: var(--text-muted); font-weight: 700;">2. معايا بضاعة بكام (مخزن)</div>
                    <div style="font-size: 1.45rem; font-weight: 900; color: var(--primary-orange); margin-top: 0.35rem;">
                        ${inventoryCost.toLocaleString('ar-EG')} <span style="font-size: 0.8rem;">ج.م</span>
                    </div>
                    <div style="font-size: 0.72rem; color: var(--accent-teal); margin-top: 0.2rem;">قيمة البيع: ${inventoryExpected.toLocaleString('ar-EG')} ج.م</div>
                </div>

                <div style="background: #0f1524; padding: 1rem; border-radius: 12px; border: 1px solid var(--border-color);">
                    <div style="font-size: 0.78rem; color: var(--text-muted); font-weight: 700;">3. السيولة النقدية الشاملة</div>
                    <div style="font-size: 1.45rem; font-weight: 900; color: var(--accent-teal); margin-top: 0.35rem;">
                        ${cashOnHand.toLocaleString('ar-EG')} <span style="font-size: 0.8rem;">ج.م</span>
                    </div>
                    <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.2rem;">${selectedSeller ? `نقدية بعُهدة (${selectedSeller.name})` : `خزينة (${mainCash.toLocaleString('ar-EG')} ج) + مناديب (${delegatesCash.toLocaleString('ar-EG')} ج)`}</div>
                </div>

                <div style="background: #0f1524; padding: 1rem; border-radius: 12px; border: 1px solid rgba(59,130,246,0.3);">
                    <div style="font-size: 0.78rem; color: var(--text-muted); font-weight: 700;">4. النقدية الحالية بالخزينة 💵</div>
                    <div style="font-size: 1.45rem; font-weight: 900; color: #60a5fa; margin-top: 0.35rem;">
                        ${mainCash.toLocaleString('ar-EG')} <span style="font-size: 0.8rem;">ج.م</span>
                    </div>
                    <div style="font-size: 0.72rem; color: var(--accent-teal); margin-top: 0.2rem;">الخزينة الرئيسية المتاحة للصرف</div>
                </div>

                <div style="background: #0f1524; padding: 1rem; border-radius: 12px; border: 1px solid rgba(0,200,151,0.3);">
                    <div style="font-size: 0.78rem; color: var(--text-muted); font-weight: 700;">5. إجمالي التوريدات للخزينة 📥</div>
                    <div style="font-size: 1.45rem; font-weight: 900; color: var(--accent-teal); margin-top: 0.35rem;">
                        ${totalSellerCollections.toLocaleString('ar-EG')} <span style="font-size: 0.8rem;">ج.م</span>
                    </div>
                    <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.2rem;">${selectedSeller ? `مجموع ما سدده (${selectedSeller.name})` : `إجمالي توريدات المناديب (${sellerCollections.length} سند)`}</div>
                </div>
            </div>
        </div>

        <!-- Revenue & Net Profit Cards -->
        <div class="grid-3" style="margin-bottom: 1.5rem;">
            <div class="card-dark" style="text-align: center;">
                <div style="font-size: 0.85rem; color: var(--text-muted);">إجمالي إيرادات المبيعات</div>
                <div style="font-size: 1.75rem; font-weight: 900; color: #fff; margin-top: 0.3rem;">${totalRevenue.toLocaleString('ar-EG')} ج.م</div>
                <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.2rem;">من ${invoices.length} عمليات بيع</div>
            </div>

            <div class="card-dark" style="text-align: center;">
                <div style="font-size: 0.85rem; color: var(--text-muted);">مبيعات المبيعات الحالية</div>
                <div style="font-size: 1.75rem; font-weight: 900; color: var(--primary-orange); margin-top: 0.3rem;">${totalRevenue.toLocaleString('ar-EG')} ج.م</div>
                <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.2rem;">عدد عمليات البيع: ${invoices.length}</div>
            </div>

            <div class="card-dark" style="text-align: center;">
                <div style="font-size: 0.85rem; color: var(--text-muted);">الربح الصافي الحقيقي بعد البيع</div>
                <div style="font-size: 1.75rem; font-weight: 900; color: var(--accent-teal); margin-top: 0.3rem;">${totalNetProfit.toLocaleString('ar-EG')} ج.م</div>
                <div style="font-size: 0.75rem; color: var(--accent-teal); margin-top: 0.2rem;">صافي أرباح الفواتير المحددة</div>
            </div>
        </div>

        <!-- Report Tabs & Detail Table -->
        <div class="card-dark">
            <div class="flex-between" style="margin-bottom: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem; flex-wrap:wrap; gap:0.75rem;">
                <div style="display: flex; gap: 0.5rem; flex-wrap:wrap;">
                    <button class="btn-secondary ${activeReportTab === 'position' ? 'btn-primary' : ''}" onclick="window.setReportTab('position')">
                        📊 تحليل هامش ربح الفواتير والتكاليف
                    </button>
                    <button class="btn-secondary ${activeReportTab === 'invoices' ? 'btn-primary' : ''}" onclick="window.setReportTab('invoices')">
                        📑 سجل فواتير المبيعات الصادرة
                    </button>
                    <button class="btn-secondary ${activeReportTab === 'collections' ? 'btn-primary' : ''}" style="${activeReportTab === 'collections' ? 'background:var(--accent-teal);color:#000;' : ''}" onclick="window.setReportTab('collections')">
                        💵 سجل تحصيلات وتوريدات الخزينة (${sellerCollections.length})
                    </button>
                </div>

                <!-- Search & Filter Controls -->
                <div style="display:flex;align-items:center;gap:0.75rem;flex-wrap:wrap;">
                    <!-- Invoice / Customer / Delegate Search Box -->
                    <div class="search-box" style="width:280px;min-width:220px;flex:1;">
                        <input
                            type="text"
                            id="reports-search-input"
                            placeholder="🔍 ابحث برقم الفاتورة (مثال: INV-2026) أو العميل..."
                            value="${reportSearchQuery}"
                            oninput="window.setReportSearchQuery(this.value)"
                            style="width:100%;font-size:0.85rem;"
                        >
                        <span class="search-icon">🔍</span>
                    </div>

                    <!-- Seller Filter Dropdown -->
                    <div style="display:flex;align-items:center;gap:0.4rem;">
                        <label style="font-size:0.82rem;font-weight:800;color:var(--primary-orange);white-space:nowrap;">👤 المندوب:</label>
                        <select class="form-control" style="width:160px;padding:0.3rem 0.6rem;font-size:0.85rem;height:36px;" onchange="window.setSellerFilter(this.value)">
                            <option value="all" ${activeSellerFilter === 'all' ? 'selected' : ''}>🌐 الجميع (كافة الموظفين)</option>
                            ${users.map(u => `
                                <option value="${u.id}" ${String(activeSellerFilter) === String(u.id) ? 'selected' : ''}>
                                    ${u.name} (${u.role || 'موظف'})
                                </option>
                            `).join('')}
                        </select>
                    </div>
                </div>
            </div>

            ${activeReportTab === 'position' ? `
                <div class="table-responsive">
                    <table class="erp-table">
                        <thead>
                            <tr>
                                <th>الفاتورة</th>
                                <th>التاريخ</th>
                                <th>العميل</th>
                                <th>التكلفة الفعلية</th>
                                <th>إجمالي البيع</th>
                                <th>الربح الصافي</th>
                                <th>المندوب / البائع</th>
                                <th>معاينة</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${invoices.length === 0 ? `
                                <tr>
                                    <td colspan="8">
                                        <div class="empty-table-state">
                                            <i>📉</i>
                                            <p style="font-weight: 700;">لا توجد فواتير مبيعات تطابق التصفية الحالية</p>
                                        </div>
                                    </td>
                                </tr>
                            ` : invoices.map(inv => `
                                <tr>
                                    <td style="font-weight: 800; color: var(--primary-orange);">
                                        <button style="background: transparent; border: none; color: var(--primary-orange); cursor: pointer; text-decoration: underline; font-weight: 800;" onclick="window.reprintInvoice(${inv.id})">
                                            🔍 ${inv.invoiceNumber}
                                        </button>
                                    </td>
                                    <td>${inv.createdAt}</td>
                                    <td>${inv.customerName}</td>
                                    <td>${inv.totalCost} ج.م</td>
                                    <td style="font-weight: 800;">${inv.grandTotal} ج.م</td>
                                    <td style="font-weight: 800; color: var(--accent-teal);">${inv.netProfit} ج.م</td>
                                    <td>
                                        <span class="badge badge-orange" style="font-size:0.75rem;">👤 ${inv.sellerName || 'حسام حسني'}</span>
                                    </td>
                                    <td>
                                        <button class="btn-secondary" style="font-size: 0.75rem; padding: 0.25rem 0.6rem; color: var(--primary-orange);" onclick="window.reprintInvoice(${inv.id})">
                                            🔍 معاينة
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            ` : activeReportTab === 'invoices' ? `
                <div class="table-responsive">
                    <table class="erp-table">
                        <thead>
                            <tr>
                                <th>الفاتورة</th>
                                <th>التاريخ</th>
                                <th>العميل</th>
                                <th>عدد الأصناف</th>
                                <th>المندوب / البائع</th>
                                <th>الإجمالي</th>
                                <th>المدفوع</th>
                                <th>المتبقي</th>
                                <th>إجراء</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${invoices.length === 0 ? `
                                <tr>
                                    <td colspan="9">
                                        <div class="empty-table-state">
                                            <i>📄</i>
                                            <p style="font-weight: 700;">سجل الفواتير فارغ</p>
                                        </div>
                                    </td>
                                </tr>
                            ` : invoices.map(inv => `
                                <tr>
                                    <td style="font-weight: 800; color: var(--primary-orange);">${inv.invoiceNumber}</td>
                                    <td>${inv.createdAt}</td>
                                    <td>${inv.customerName}</td>
                                    <td>${inv.items.length} أصناف</td>
                                    <td>
                                        <span class="badge badge-orange" style="font-size:0.75rem;">👤 ${inv.sellerName || 'حسام حسني'}</span>
                                    </td>
                                    <td style="font-weight: 800;">${inv.grandTotal} ج.م</td>
                                    <td style="color: var(--accent-teal);">${inv.paidAmount} ج.م</td>
                                    <td style="color: var(--accent-red);">${inv.remainingDebt} ج.م</td>
                                    <td>
                                        <button class="action-btn" title="معاينة وطباعة الفاتورة" onclick="window.reprintInvoice(${inv.id})">🔍</button>
                                        <button class="action-btn" title="تعديل الفاتورة" style="color:var(--primary-orange);" onclick="window.openEditInvoiceModal(${inv.id})">✏️</button>
                                        <button class="action-btn" title="حذف الفاتورة" style="color:var(--accent-red);" onclick="window.deleteInvoiceHandler(${inv.id})">🗑️</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            ` : `
                <!-- Collections & Treasury Movement Tab -->
                <div class="table-responsive">
                    <table class="erp-table">
                        <thead>
                            <tr>
                                <th>رقم السند</th>
                                <th>التاريخ والوقت</th>
                                <th>اسم المندوب</th>
                                <th>المبلغ المورد للخزينة</th>
                                <th>المتبقي بعُهدة المندوب</th>
                                <th>رصيد الخزينة بعد التوريد</th>
                                <th>البيان والتفاصيل</th>
                                <th>المستلم</th>
                                <th>إجراء</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${sellerCollections.length === 0 ? `
                                <tr>
                                    <td colspan="9">
                                        <div class="empty-table-state">
                                            <i>💵</i>
                                            <p style="font-weight: 700;">لا توجد أي سندات توريد نقدية تطابق التصفية الحالية</p>
                                            <p style="font-size:0.8rem;color:var(--text-muted);margin-top:0.25rem;">عند استلام نقدية من المناديب عبر شاشة الـ POS يتم تسجيلها وتوثيقها هنا فوراً.</p>
                                        </div>
                                    </td>
                                </tr>
                            ` : sellerCollections.map(v => `
                                <tr>
                                    <td style="font-weight: 900; color: var(--primary-orange);">
                                        <button style="background: transparent; border: none; color: var(--primary-orange); cursor: pointer; text-decoration: underline; font-weight: 900;" onclick="window.showCollectionVoucherModal('${v.id}')">
                                            🧾 ${v.voucherNumber}
                                        </button>
                                    </td>
                                    <td style="font-size:0.85rem;">${v.createdAt}</td>
                                    <td style="font-weight:800; color:#fff;">${v.delegateName}</td>
                                    <td style="font-weight: 900; color: var(--accent-teal); font-size: 1rem;">
                                        +${v.amount.toLocaleString('ar-EG')} ج.م
                                    </td>
                                    <td style="color: var(--accent-red); font-weight: 800;">
                                        ${v.delegateCashAfter.toLocaleString('ar-EG')} ج.م
                                    </td>
                                    <td style="color: #60a5fa; font-weight: 800;">
                                        ${(v.mainCashAfter || (v.mainCashBefore + v.amount)).toLocaleString('ar-EG')} ج.م
                                    </td>
                                    <td style="font-size: 0.8rem; color: var(--text-muted);" title="${v.notes}">${v.notes}</td>
                                    <td style="font-size: 0.8rem;">${v.collectedBy}</td>
                                    <td>
                                        <div style="display:flex;gap:0.3rem;">
                                            <button class="btn-secondary" style="font-size: 0.75rem; padding: 0.25rem 0.6rem; color: var(--primary-orange);" onclick="window.showCollectionVoucherModal('${v.id}')">
                                                🖨️ طباعة السند
                                            </button>
                                            <button class="action-btn" title="حذف السند" style="color:var(--accent-red);" onclick="window.deleteCollectionVoucherHandler('${v.id}')">
                                                🗑️
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `}
        </div>
    `;
}

export function setReportTab(tab) {
    activeReportTab = tab;
    window.renderCurrentView();
}
window.setReportTab = setReportTab;

export function setReportSearchQuery(query) {
    reportSearchQuery = query || '';
    window.renderCurrentView();
    const input = document.getElementById('reports-search-input');
    if (input) {
        input.focus();
        const len = input.value.length;
        input.setSelectionRange(len, len);
    }
}
window.setReportSearchQuery = setReportSearchQuery;

window.setSellerFilter = (sellerId) => {
    activeSellerFilter = sellerId;
    window.renderCurrentView();
};

window.reprintInvoice = (id) => {
    const invoice = state.invoices.find(inv => String(inv.id) === String(id) || inv.invoiceNumber === id);
    if (invoice) {
        window.showInvoiceModal(invoice);
    } else {
        alert('لم يتم العثور على هذه الفاتورة!');
    }
};

window.deleteInvoiceHandler = (id) => {
    if (confirm('هل أنت متأكد من حذف هذه الفاتورة؟ لن يؤثر حذفها سلباً على بقية أصناف المخزون.')) {
        state.deleteInvoice(id);
        window.renderCurrentView();
    }
};

window.deleteCollectionVoucherHandler = (id) => {
    if (confirm('هل أنت متأكد من حذف هذا السند المالي من السجلات؟')) {
        state.deleteCollectionVoucher(id);
        window.renderCurrentView();
    }
};
