import { state } from '../state.js';

export function renderCustomersView() {
    const customers = state.getAvailableCustomersForUser();
    const totalDebts = customers.reduce((sum, c) => sum + c.debt, 0);
    const isEmployee = state.currentUser && state.currentUser.role !== 'مدير عام' && (!state.currentUser.permissions || !state.currentUser.permissions.includes('all'));

    return `
        <!-- Banner Header -->
        <div class="view-banner flex-between">
            <div>
                <div style="font-size: 0.85rem; color: var(--primary-orange); font-weight: 700; margin-bottom: 0.25rem;">
                    👥 حسابات العملاء والديون
                </div>
                <h1 style="font-size: 1.75rem; font-weight: 900; color: #fff;">إدارة العملاء والديون وكشوف الحسابات 📑</h1>
                <p style="color: var(--text-muted); font-size: 0.9rem; margin-top: 0.25rem;">
                    متابعة مشتريات ودفوعات العملاء، تنبيهات تأخير السداد، وإرسال كشوف الحساب عبر واتساب.
                </p>
            </div>
            <div style="display: flex; gap: 0.75rem;">
                <button class="btn-primary" onclick="window.openAddCustomerModal()">
                    + إضافة تاجر/عميل
                </button>
            </div>
        </div>

        <!-- Debt Overview Card -->
        <div class="card-dark" style="margin-bottom: 1.5rem; background: linear-gradient(90deg, #141b2d 0%, #1e1b30 100%); border-color: rgba(139, 92, 246, 0.3);">
            <div class="flex-between">
                <div>
                    <div style="font-size: 1.05rem; font-weight: 800; color: #fff; display: flex; align-items: center; gap: 0.5rem;">
                        💳 إجمالي الديون المستحقة بالسوق
                    </div>
                    <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.2rem;">
                        ${isEmployee ? 'مجموع المستحقات على العملاء المخصصين لك.' : 'مجموع المستحقات على محلات التجزئة والتجار.'}
                    </div>
                </div>
                <div style="font-size: 1.75rem; font-weight: 900; color: var(--primary-orange);">
                    ${totalDebts.toLocaleString('ar-EG')} <span style="font-size: 0.9rem; color: var(--text-muted);">ج.م</span>
                </div>
            </div>
        </div>

        <!-- Customer Cards Grid -->
        <div class="card-dark">
            <div class="flex-between" style="margin-bottom: 1.25rem;">
                <div class="search-box" style="width: 380px;">
                    <input type="text" placeholder="البحث السريع باسم العميل أو رقم الهاتف..." oninput="window.filterCustomersGrid(this.value)">
                    <span class="search-icon">🔍</span>
                </div>
                <span class="badge badge-blue">${isEmployee ? 'العملاء المخصصين لك' : 'كافة العملاء'} (${customers.length})</span>
            </div>

            ${customers.length === 0 ? `
                <div class="empty-table-state">
                    <i>👤</i>
                    <p style="font-weight: 700; font-size: 1.1rem; color: #fff;">لا يوجد عملاء أو تجار مسجلين</p>
                    <p style="font-size: 0.85rem; margin-top: 0.25rem;">قم بإضافة تجار أو عملاء أجل لتتبع مستحقاتهم وكشوف حساباتهم.</p>
                    <button class="btn-primary" style="margin-top: 1rem;" onclick="window.openAddCustomerModal()">
                        + إضافة عميل جديد الآن
                    </button>
                </div>
            ` : `
                <div class="grid-3" id="customers-grid">
                    ${customers.map(c => `
                        <div class="card-dark" style="background: #0f1524; position: relative;">
                            <div class="flex-between" style="margin-bottom: 0.75rem; gap: 0.5rem;">
                                <div>
                                    <div style="font-size: 1.15rem; font-weight: 800; color: #fff;">${c.name}</div>
                                    <div style="font-size: 0.8rem; color: var(--primary-orange); font-weight: 600;">${c.shopName || 'محل تجزئة'}</div>
                                </div>
                                <div style="display: flex; align-items: center; gap: 0.5rem;">
                                    ${c.debt > 0 ? 
                                        `<span class="badge badge-red">مدين (عليه ديون)</span>` : 
                                        `<span class="badge badge-teal">خالي الديون</span>`
                                    }
                                    <button title="حذف العميل نهائياً" style="background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); color: var(--accent-red); width: 32px; height: 32px; border-radius: 8px; cursor: pointer; font-size: 0.9rem; display: inline-flex; align-items: center; justify-content: center;" onclick="window.deleteCustomer(${c.id})">
                                        🗑️
                                    </button>
                                </div>
                            </div>

                            <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.75rem; display: flex; flex-direction: column; gap: 0.25rem;">
                                <div>📞 ${c.phone || 'غير مسجل'}</div>
                                <div>📍 ${c.location || 'غير حدد'}</div>
                                <div>🕒 آخر دفعة مسددة: ${c.lastPaymentDate || 'لا يوجد'}</div>
                            </div>

                            <div class="grid-3" style="gap: 0.5rem; background: #141b2d; padding: 0.6rem; border-radius: 10px; margin-bottom: 1rem; text-align: center;">
                                <div>
                                    <div style="font-size: 0.65rem; color: var(--text-muted);">إجمالي مشترياته</div>
                                    <div style="font-size: 0.85rem; font-weight: 800;">${c.totalPurchases} ج</div>
                                </div>
                                <div>
                                    <div style="font-size: 0.65rem; color: var(--text-muted);">المبلغ المدفوع</div>
                                    <div style="font-size: 0.85rem; font-weight: 800; color: var(--accent-teal);">${c.paidAmount} ج</div>
                                </div>
                                <div>
                                    <div style="font-size: 0.65rem; color: var(--text-muted);">المتبقي الحالي</div>
                                    <div style="font-size: 0.85rem; font-weight: 800; color: var(--accent-red);">${c.debt} ج</div>
                                </div>
                            </div>

                            <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
                                <button class="btn-primary" style="flex: 1; min-width: 75px; font-size: 0.78rem; padding: 0.4rem; background: var(--accent-teal); border: none;" onclick="window.openPaymentModal(${c.id})">
                                    💵 سند قبض
                                </button>
                                <button class="btn-secondary" style="flex: 1; min-width: 75px; font-size: 0.78rem; padding: 0.4rem;" onclick="window.showCustomerStatement(${c.id})">
                                    📑 كشف حساب
                                </button>
                                <button class="btn-secondary" style="font-size: 0.78rem; padding: 0.4rem 0.6rem; border-color: var(--primary-orange); color: var(--primary-orange);" onclick="window.openEditCustomerModal(${c.id})" title="تعديل البيانات والديون">
                                    ✏️ تعديل
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `}
        </div>
    `;
}

window.filterCustomersGrid = (query) => {
    const cards = document.querySelectorAll('#customers-grid > div');
    cards.forEach(card => {
        const text = card.innerText.toLowerCase();
        card.style.display = text.includes(query.toLowerCase()) ? '' : 'none';
    });
};

window.deleteCustomer = (id) => {
    const customer = state.customers.find(c => c.id === id);
    if (!customer) return;
    if (confirm(`هل أنت متأكد من حذف العميل (${customer.name}) نهائياً من النظام؟\nفواتيره السابقة ستبقى محفوظة في السجلات.`)) {
        state.deleteCustomer(id);
        window.renderCurrentView();
    }
};
