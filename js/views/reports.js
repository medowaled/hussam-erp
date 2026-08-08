import { state } from '../state.js';

let activeReportTab = 'position';
let activeSellerFilter = 'all';

export function renderReportsView() {
    const allInvoices = state.invoices;
    const customers = state.customers;
    const users = state.users;

    // Filter invoices by seller if selected
    const invoices = allInvoices.filter(inv => {
        if (activeSellerFilter === 'all') return true;
        return String(inv.sellerId) === String(activeSellerFilter) || inv.sellerName === activeSellerFilter;
    });

    const totalDebts = customers.reduce((sum, c) => sum + c.debt, 0);
    const inventoryCost = state.products.reduce((sum, p) => sum + (p.buyPrice * p.stockPacks), 0);
    const inventoryExpected = state.products.reduce((sum, p) => sum + (p.sellPrice * p.stockPacks), 0);
    const cashOnHand = 60; // Base cash balance

    const totalRevenue = invoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
    const totalNetProfit = invoices.reduce((sum, inv) => sum + (inv.netProfit || 0), 0);

    return `
        <!-- Banner Header -->
        <div class="view-banner flex-between" style="flex-wrap:wrap;gap:0.75rem;">
            <div>
                <div style="font-size: 0.85rem; color: var(--primary-orange); font-weight: 700; margin-bottom: 0.25rem;">
                    📈 التقارير المالية وتتبع أرباح الموظفين والمناديب
                </div>
                <h1 style="font-size: 1.75rem; font-weight: 900; color: #fff;">تقرير "إداني دائماً" الشامل 📊</h1>
                <p style="color: var(--text-muted); font-size: 0.9rem; margin-top: 0.25rem;">
                    متابعة فلوسك بالسوق، عُهد الموظفين، قيمة بضاعتك بالمخزن، الفلوس الجاهزة معك، والأرباح الصافية الحقيقية بعد البيع.
                </p>
            </div>
        </div>

        <!-- Position Summary Cards -->
        <div class="card-dark" style="margin-bottom: 1.5rem;">
            <div style="font-size: 1.05rem; font-weight: 800; margin-bottom: 1rem; color: var(--primary-orange); display: flex; align-items: center; gap: 0.5rem;">
                📋 تقرير "إداني دائماً" (ملخص الموقف المالي للنشاط)
            </div>

            <div class="grid-3">
                <div style="background: #0f1524; padding: 1.25rem; border-radius: 12px; border: 1px solid var(--border-color);">
                    <div style="font-size: 0.85rem; color: var(--text-muted); font-weight: 700;">1. ليا كام في السوق (ديون العملاء)</div>
                    <div style="font-size: 1.6rem; font-weight: 900; color: var(--accent-purple); margin-top: 0.4rem;">
                        ${totalDebts.toLocaleString('ar-EG')} <span style="font-size: 0.85rem;">ج.م</span>
                    </div>
                    <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.2rem;">مجموع المستحقات على محلات التجزئة والتجار</div>
                </div>

                <div style="background: #0f1524; padding: 1.25rem; border-radius: 12px; border: 1px solid var(--border-color);">
                    <div style="font-size: 0.85rem; color: var(--text-muted); font-weight: 700;">2. معايا بضاعة بكام (تقييم المخزن)</div>
                    <div style="font-size: 1.6rem; font-weight: 900; color: var(--primary-orange); margin-top: 0.4rem;">
                        ${inventoryCost.toLocaleString('ar-EG')} <span style="font-size: 0.85rem;">ج.م (تكلفة)</span>
                    </div>
                    <div style="font-size: 0.75rem; color: var(--accent-teal); margin-top: 0.2rem;">قيمة البيع المتوقعة: ${inventoryExpected.toLocaleString('ar-EG')} ج.م</div>
                </div>

                <div style="background: #0f1524; padding: 1.25rem; border-radius: 12px; border: 1px solid var(--border-color);">
                    <div style="font-size: 0.85rem; color: var(--text-muted); font-weight: 700;">3. معايا فلوس كام (نقدية متوفرة)</div>
                    <div style="font-size: 1.6rem; font-weight: 900; color: var(--accent-teal); margin-top: 0.4rem;">
                        ${cashOnHand.toLocaleString('ar-EG')} <span style="font-size: 0.85rem;">ج.م</span>
                    </div>
                    <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.2rem;">الخزينة الرئيسية</div>
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
                <div style="display: flex; gap: 0.5rem;">
                    <button class="btn-secondary ${activeReportTab === 'position' ? 'btn-primary' : ''}" onclick="window.setReportTab('position')">
                        📊 تحليل هامش ربح الفواتير والتكاليف
                    </button>
                    <button class="btn-secondary ${activeReportTab === 'invoices' ? 'btn-primary' : ''}" onclick="window.setReportTab('invoices')">
                        📑 سجل فواتير المبيعات الصادرة
                    </button>
                </div>

                <!-- Seller Filter Dropdown -->
                <div style="display:flex;align-items:center;gap:0.5rem;">
                    <label style="font-size:0.82rem;font-weight:800;color:var(--primary-orange);">👤 تصفية بحسب المندوب/البائع:</label>
                    <select class="form-control" style="width:180px;padding:0.3rem 0.6rem;font-size:0.85rem;height:36px;" onchange="window.setSellerFilter(this.value)">
                        <option value="all" ${activeSellerFilter === 'all' ? 'selected' : ''}>🌐 الجميع (كافة الموظفين)</option>
                        ${users.map(u => `
                            <option value="${u.id}" ${String(activeSellerFilter) === String(u.id) ? 'selected' : ''}>
                                ${u.name} (${u.role || 'موظف'})
                            </option>
                        `).join('')}
                    </select>
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
            ` : `
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
            `}
        </div>
    `;
}

export function setReportTab(tab) {
    activeReportTab = tab;
    window.renderCurrentView();
}
window.setReportTab = setReportTab;

window.setSellerFilter = (sellerId) => {
    activeSellerFilter = sellerId;
    window.renderCurrentView();
};

window.reprintInvoice = (id) => {
    const invoice = state.invoices.find(inv => inv.id === id);
    if (invoice) {
        window.showInvoiceModal(invoice);
    }
};

window.deleteInvoiceHandler = (id) => {
    if (confirm('هل أنت تأكد من حذف هذه الفاتورة؟ لن يؤثر حذفها سلباً على بقية أصناف المخزون.')) {
        state.deleteInvoice(id);
        window.renderCurrentView();
    }
};
