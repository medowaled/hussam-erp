import { state } from '../state.js';

export function renderInventoryView() {
    const products = state.products;
    const totalCost = products.reduce((sum, p) => sum + (p.buyPrice * p.stockPacks), 0);
    const totalExpectedProfit = products.reduce((sum, p) => sum + ((p.sellPrice - p.buyPrice) * p.stockPacks), 0);

    return `
        <!-- Banner Header & Actions -->
        <div class="view-banner flex-between">
            <div>
                <div style="font-size: 0.85rem; color: var(--primary-orange); font-weight: 700; margin-bottom: 0.25rem;">
                    📦 المخزون وأسعار اليوم
                </div>
                <h1 style="font-size: 1.75rem; font-weight: 900; color: #fff;">إدارة المخزون والتعديل السريع للسعر 🏷️</h1>
                <p style="color: var(--text-muted); font-size: 0.9rem; margin-top: 0.25rem;">
                    متابعة كميات الكراتين والخرائط بالسخزن، تحديث أسعار البيع والشراء السريعة عند تغير أسعار السوق.
                </p>
            </div>
            <div style="display: flex; gap: 0.75rem;">
                <button class="btn-primary" onclick="window.openAddProductModal()">
                    + إضافة صنف جديد
                </button>
                <button class="btn-secondary" style="background: var(--accent-purple); color: #fff; border: none;" onclick="window.openRestockModal()">
                    📦 توريد وتحديث سعر (WAC)
                </button>
            </div>
        </div>

        <!-- Inventory Valuation Metric Bar -->
        <div class="card-dark" style="margin-bottom: 1.5rem; background: linear-gradient(90deg, #141b2d 0%, #1c263f 100%);">
            <div class="flex-between">
                <div>
                    <div style="font-size: 1.05rem; font-weight: 800; color: #fff; display: flex; align-items: center; gap: 0.5rem;">
                        🪙 تقييم رأس مال البضاعة بالمخزن لحظياً
                    </div>
                    <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.2rem;">
                        محسوب مباشرة بناءً على كميات الكراتين والخراطيش والعلب المتوفرة.
                    </div>
                </div>
                <div style="display: flex; gap: 1rem;">
                    <div style="text-align: center; background: #0f1524; padding: 0.5rem 1rem; border-radius: 10px; border: 1px solid var(--border-color);">
                        <div style="font-size: 0.75rem; color: var(--text-muted);">رأس المال (تكلفة الشراء)</div>
                        <div style="font-size: 1.15rem; font-weight: 800; color: var(--primary-orange);">${totalCost.toLocaleString('ar-EG')} ج.م</div>
                    </div>
                    <div style="text-align: center; background: #0f1524; padding: 0.5rem 1rem; border-radius: 10px; border: 1px solid var(--border-color);">
                        <div style="font-size: 0.75rem; color: var(--text-muted);">الأرباح المحتبسة بالبضاعة</div>
                        <div style="font-size: 1.15rem; font-weight: 800; color: var(--accent-teal);">+${totalExpectedProfit.toLocaleString('ar-EG')} ج.م</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Inventory Table Section -->
        <div class="card-dark">
            <div class="flex-between" style="margin-bottom: 1rem;">
                <div class="search-box" style="width: 380px;">
                    <input type="text" placeholder="البحث السريع باسم الصنف، الماركة، أو رقم الباركود..." id="inventory-search-input" oninput="window.filterInventoryTable(this.value)">
                    <span class="search-icon">🔍</span>
                </div>
                <div style="display: flex; gap: 0.5rem;">
                    <span class="badge badge-orange">إجمالي الأصناف: ${products.length}</span>
                </div>
            </div>

            <div class="table-responsive">
                <table class="erp-table" id="inventory-table">
                    <thead>
                        <tr>
                            <th>الصنف</th>
                            <th>الباربود</th>
                            <th>القروصة</th>
                            <th>المخزون (قروصة)</th>
                            <th>سعر الشراء</th>
                            <th>سعر البيع</th>
                            <th>الحالة / حد الطلب</th>
                            <th>إجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${products.length === 0 ? `
                            <tr>
                                <td colspan="8">
                                    <div class="empty-table-state">
                                        <i>🚬</i>
                                        <p style="font-weight: 700; font-size: 1.1rem; color: #fff;">المخزون فارغ تماماً</p>
                                        <p style="font-size: 0.85rem; margin-top: 0.25rem;">لا توجد أي أصناف مسجلة في النظام. اضغط على زر "إضافة صنف جديد" للبدء.</p>
                                        <button class="btn-primary" style="margin-top: 1rem;" onclick="window.openAddProductModal()">
                                            + إضافة أول صنف الآن
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ` : [...products].sort((a, b) => {
                            const aLow = a.stockPacks <= a.minStockPacks;
                            const bLow = b.stockPacks <= b.minStockPacks;
                            if (aLow && !bLow) return -1;
                            if (!aLow && bLow) return 1;
                            return a.stockPacks - b.stockPacks;
                        }).map(p => `
                            <tr style="${p.stockPacks <= p.minStockPacks ? 'background: rgba(239,68,68,0.06);' : ''}">
                                <td style="font-weight: 800; color: #fff;">${p.name}</td>
                                <td style="font-family: monospace; color: var(--text-muted);">${p.barcode}</td>
                                <td>${p.cartonPackCount} علبة</td>
                                <td>
                                    <span style="font-weight: 900; color: ${p.stockPacks <= p.minStockPacks ? 'var(--accent-red)' : 'var(--accent-teal)'};">
                                        ${p.stockPacks} قروصة
                                    </span>
                                </td>
                                <td>${p.buyPrice} ج.م</td>
                                <td style="font-weight: 800; color: var(--primary-orange);">${p.sellPrice} ج.م</td>
                                <td>
                                    ${p.stockPacks <= p.minStockPacks ? 
                                        `<span class="badge badge-red">⚠️ وصل حد الطلب (${p.minStockPacks})</span>` : 
                                        `<span class="badge badge-teal">مستقر</span>`
                                    }
                                </td>
                                <td>
                                    <div class="table-actions">
                                        <button class="action-btn" title="توريد وتحديث السعر" onclick="window.openRestockModal(${p.id})">📦</button>
                                        <button class="action-btn" style="color: var(--accent-red);" title="حذف" onclick="window.deleteProductHandler(${p.id})">🗑️</button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

window.filterInventoryTable = (query) => {
    const rows = document.querySelectorAll('#inventory-table tbody tr');
    rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        row.style.display = text.includes(query.toLowerCase()) ? '' : 'none';
    });
};

window.deleteProductHandler = (id) => {
    if (confirm('هل أنت تأكد من رغبتك في حذف هذا الصنف من المخزون؟')) {
        state.deleteProduct(id);
        window.renderCurrentView();
    }
};
