import { state } from './state.js';

export function setupModals() {
    if (!document.getElementById('modal-root')) {
        const root = document.createElement('div');
        root.id = 'modal-root';
        document.body.appendChild(root);
    }
}

/* Modal Helper */
export function openModalHTML(title, bodyHTML, onConfirmFn, confirmText = 'حفظ البيانات') {
    setupModals();
    const root = document.getElementById('modal-root');
    root.innerHTML = `
        <div class="modal-backdrop active" id="current-modal-backdrop">
            <div class="modal-dialog">
                <div class="modal-header">
                    <div class="modal-title">${title}</div>
                    <button class="modal-close" onclick="window.closeCurrentModal()">✕</button>
                </div>
                <div class="modal-body">
                    ${bodyHTML}
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="window.closeCurrentModal()">إلغاء</button>
                    <button class="btn-primary" id="modal-submit-btn">${confirmText}</button>
                </div>
            </div>
        </div>
    `;

    document.getElementById('modal-submit-btn').onclick = () => {
        if (onConfirmFn()) {
            window.closeCurrentModal();
            window.renderCurrentView();
        }
    };
}

window.closeCurrentModal = () => {
    const backdrop = document.getElementById('current-modal-backdrop');
    if (backdrop) backdrop.remove();
};

/* Add / Edit User Modal */
export function openAddUserModal() {
    const body = `
        <form onsubmit="return false;">
            <div class="form-group">
                <label class="form-label">اسم الموظف / المستخدم بالكامل *</label>
                <input type="text" id="m-u-name" class="form-control" placeholder="مثال: أحمد وليد" required>
            </div>
            <div class="grid-2">
                <div class="form-group">
                    <label class="form-label">اسم الدخول (Username) *</label>
                    <input type="text" id="m-u-username" class="form-control" placeholder="ahmed" required>
                </div>
                <div class="form-group">
                    <label class="form-label">كلمة السر (Password) *</label>
                    <input type="text" id="m-u-password" class="form-control" placeholder="123456" required value="123456">
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">المسمى الوظيفي / الدور</label>
                <select id="m-u-role" class="form-control">
                    <option value="كاشير مبيعات">كاشير مبيعات</option>
                    <option value="أمين مخزن">أمين مخزن</option>
                    <option value="محاسب">محاسب</option>
                    <option value="مدير مساعد">مدير مساعد</option>
                    <option value="مدير عام">مدير عام</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label" style="margin-bottom: 0.5rem; display: block; font-weight: 800; color: var(--primary-orange);">
                    الصلاحيات الممنوحة للمستخدم في النظام:
                </label>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; background: #0a0e17; padding: 0.85rem; border-radius: 10px; border: 1px solid var(--border-color);">
                    <label style="display: flex; align-items: center; gap: 0.4rem; font-size: 0.85rem; color: #fff; cursor: pointer;">
                        <input type="checkbox" id="perm-pos" value="pos" checked> 🛒 POS ومبيعات
                    </label>
                    <label style="display: flex; align-items: center; gap: 0.4rem; font-size: 0.85rem; color: #fff; cursor: pointer;">
                        <input type="checkbox" id="perm-inventory" value="inventory"> 📦 المخزون وأسعار اليوم
                    </label>
                    <label style="display: flex; align-items: center; gap: 0.4rem; font-size: 0.85rem; color: #fff; cursor: pointer;">
                        <input type="checkbox" id="perm-customers" value="customers"> 👥 العملاء والديون
                    </label>
                    <label style="display: flex; align-items: center; gap: 0.4rem; font-size: 0.85rem; color: #fff; cursor: pointer;">
                        <input type="checkbox" id="perm-reports" value="reports"> 📊 التقارير المالية
                    </label>
                    <label style="display: flex; align-items: center; gap: 0.4rem; font-size: 0.85rem; color: #fff; cursor: pointer; grid-column: 1 / -1;">
                        <input type="checkbox" id="perm-all" value="all"> 🛡️ كافة الصلاحيات (صلاحيات المدير الكاملة)
                    </label>
                </div>
            </div>
        </form>
    `;

    openModalHTML('➕ إنشاء حساب موظف جديد وتحديد الصلاحيات', body, () => {
        const name = document.getElementById('m-u-name')?.value.trim();
        const username = document.getElementById('m-u-username')?.value.trim();
        const password = document.getElementById('m-u-password')?.value.trim();
        const role = document.getElementById('m-u-role')?.value;

        if (!name || !username || !password) {
            alert('يرجى ملء كافة البيانات المطلوبة!');
            return false;
        }

        const permissions = [];
        if (document.getElementById('perm-all')?.checked) {
            permissions.push('all');
        } else {
            if (document.getElementById('perm-pos')?.checked) permissions.push('pos');
            if (document.getElementById('perm-inventory')?.checked) permissions.push('inventory');
            if (document.getElementById('perm-customers')?.checked) permissions.push('customers');
            if (document.getElementById('perm-reports')?.checked) permissions.push('reports');
        }

        state.addUser({ name, username, password, role, permissions, status: 'active' });
        return true;
    }, 'حفظ الحساب والصلاحيات');
}
window.openAddUserModal = openAddUserModal;

export function openEditUserModal(userId) {
    const user = state.users.find(u => u.id === userId);
    if (!user) return;

    const isAll = user.permissions && user.permissions.includes('all');

    const body = `
        <form onsubmit="return false;">
            <div class="form-group">
                <label class="form-label">اسم الموظف / المستخدم بالكامل *</label>
                <input type="text" id="m-ue-name" class="form-control" value="${user.name}">
            </div>
            <div class="grid-2">
                <div class="form-group">
                    <label class="form-label">اسم الدخول (Username) *</label>
                    <input type="text" id="m-ue-username" class="form-control" value="${user.username}">
                </div>
                <div class="form-group">
                    <label class="form-label">كلمة السر (Password) *</label>
                    <input type="text" id="m-ue-password" class="form-control" value="${user.password}">
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">المسمى الوظيفي / الدور</label>
                <select id="m-ue-role" class="form-control">
                    <option value="كاشير مبيعات" ${user.role === 'كاشير مبيعات' ? 'selected' : ''}>كاشير مبيعات</option>
                    <option value="أمين مخزن" ${user.role === 'أمين مخزن' ? 'selected' : ''}>أمين مخزن</option>
                    <option value="محاسب" ${user.role === 'محاسب' ? 'selected' : ''}>محاسب</option>
                    <option value="مدير مساعد" ${user.role === 'مدير مساعد' ? 'selected' : ''}>مدير مساعد</option>
                    <option value="مدير عام" ${user.role === 'مدير عام' ? 'selected' : ''}>مدير عام</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label" style="margin-bottom: 0.5rem; display: block; font-weight: 800; color: var(--primary-orange);">
                    الصلاحيات الممنوحة للمستخدم في النظام:
                </label>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; background: #0a0e17; padding: 0.85rem; border-radius: 10px; border: 1px solid var(--border-color);">
                    <label style="display: flex; align-items: center; gap: 0.4rem; font-size: 0.85rem; color: #fff; cursor: pointer;">
                        <input type="checkbox" id="perm-e-pos" value="pos" ${isAll || user.permissions.includes('pos') ? 'checked' : ''}> 🛒 POS ومبيعات
                    </label>
                    <label style="display: flex; align-items: center; gap: 0.4rem; font-size: 0.85rem; color: #fff; cursor: pointer;">
                        <input type="checkbox" id="perm-e-inventory" value="inventory" ${isAll || user.permissions.includes('inventory') ? 'checked' : ''}> 📦 المخزون وأسعار اليوم
                    </label>
                    <label style="display: flex; align-items: center; gap: 0.4rem; font-size: 0.85rem; color: #fff; cursor: pointer;">
                        <input type="checkbox" id="perm-e-customers" value="customers" ${isAll || user.permissions.includes('customers') ? 'checked' : ''}> 👥 العملاء والديون
                    </label>
                    <label style="display: flex; align-items: center; gap: 0.4rem; font-size: 0.85rem; color: #fff; cursor: pointer;">
                        <input type="checkbox" id="perm-e-reports" value="reports" ${isAll || user.permissions.includes('reports') ? 'checked' : ''}> 📊 التقارير المالية
                    </label>
                    <label style="display: flex; align-items: center; gap: 0.4rem; font-size: 0.85rem; color: #fff; cursor: pointer; grid-column: 1 / -1;">
                        <input type="checkbox" id="perm-e-all" value="all" ${isAll ? 'checked' : ''}> 🛡️ كافة الصلاحيات (صلاحيات المدير الكاملة)
                    </label>
                </div>
            </div>
        </form>
    `;

    openModalHTML('✏️ تعديل بيانات حساب وتصريحات الموظف', body, () => {
        const name = document.getElementById('m-ue-name')?.value.trim();
        const username = document.getElementById('m-ue-username')?.value.trim();
        const password = document.getElementById('m-ue-password')?.value.trim();
        const role = document.getElementById('m-ue-role')?.value;

        if (!name || !username || !password) {
            alert('يرجى ملء البيانات!');
            return false;
        }

        const permissions = [];
        if (document.getElementById('perm-e-all')?.checked) {
            permissions.push('all');
        } else {
            if (document.getElementById('perm-e-pos')?.checked) permissions.push('pos');
            if (document.getElementById('perm-e-inventory')?.checked) permissions.push('inventory');
            if (document.getElementById('perm-e-customers')?.checked) permissions.push('customers');
            if (document.getElementById('perm-e-reports')?.checked) permissions.push('reports');
        }

        state.updateUser(userId, { name, username, password, role, permissions });
        return true;
    }, 'تحديث الحساب والصلاحيات');
}
window.openEditUserModal = openEditUserModal;

/* ─── Employee Stock Quota & Customer Assignment Modal ─────────── */
export function openAssignQuotaModal(userId) {
    const user = state.users.find(u => u.id === userId);
    if (!user) return;

    const customers = state.customers;
    const products = state.products;

    const isAllCustomers = user.assignedCustomers === 'all';
    const userCustIds = Array.isArray(user.assignedCustomers) ? user.assignedCustomers : [];

    const body = `
        <div style="background: #0f1524; padding: 1rem; border-radius: 12px; margin-bottom: 1.25rem; border: 1px solid var(--border-color);">
            <div style="font-weight: 900; color: #fff; font-size: 1.05rem;">👤 الموظف / المندوب: ${user.name}</div>
            <div style="font-size: 0.8rem; color: var(--primary-orange); margin-top: 0.2rem;">الدور: ${user.role || 'موظف مبيعات'} • اسم الدخول: ${user.username}</div>
        </div>

        <!-- 1. Customer Assignment Section -->
        <div class="form-group" style="margin-bottom: 1.5rem;">
            <label class="form-label" style="font-weight: 800; color: var(--primary-orange); margin-bottom: 0.5rem; display: block;">
                👥 التجار والعملاء المسموح للمندوب البيع لهم:
            </label>
            <div style="background: #0a0e17; padding: 0.85rem; border-radius: 12px; border: 1px solid var(--border-color); max-height: 140px; overflow-y: auto;">
                <label style="display: flex; align-items: center; gap: 0.5rem; font-weight: 800; color: #fff; margin-bottom: 0.6rem; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 0.4rem;">
                    <input type="checkbox" id="q-cust-all" ${isAllCustomers ? 'checked' : ''} onchange="window.qToggleAllCustomers(this.checked)">
                    🌐 كافة العملاء والتجار (دون تقييد)
                </label>
                <div id="q-cust-list" style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
                    ${customers.map(c => `
                        <label style="display: flex; align-items: center; gap: 0.4rem; font-size: 0.82rem; color: #d1d5db; cursor: pointer;">
                            <input type="checkbox" class="q-cust-item" value="${c.id}" ${isAllCustomers || userCustIds.includes(c.id) ? 'checked' : ''} ${isAllCustomers ? 'disabled' : ''}>
                            ${c.name} (${c.shopName || 'تاجر'})
                        </label>
                    `).join('')}
                </div>
            </div>
        </div>

        <!-- 2. Product Quota Assignment Section -->
        <div class="form-group">
            <label class="form-label" style="font-weight: 800; color: var(--primary-orange); margin-bottom: 0.5rem; display: block;">
                📦 عهدة كميات الأصناف المخصصة للموظف (من المخزن الرئيسي):
            </label>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.65rem;">
                المنتج لا يقل في المخزن الرئيسي إلا عند قيام المندوب بالبيع فعلياً. لا يمكن تخصيص كمية تتجاوز المتبقي بالمخزن.
            </div>

            <div style="background: #0a0e17; padding: 0.85rem; border-radius: 12px; border: 1px solid var(--border-color); max-height: 260px; overflow-y: auto; display: flex; flex-direction: column; gap: 0.75rem;">
                ${products.length === 0 ? `
                    <div style="text-align: center; color: var(--text-muted); font-size: 0.85rem; padding: 1rem;">لا توجد أصناف في المخزن الرئيسي حالياً</div>
                ` : products.map(p => {
                    const q = state.getEmployeeQuota(userId, p.id);
                    const freeStock = state.getUnallocatedStock(p.id, userId);

                    return `
                        <div style="background: #141b2d; padding: 0.75rem 0.85rem; border-radius: 10px; border: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap;">
                            <div>
                                <div style="font-weight: 800; color: #fff; font-size: 0.9rem;">${p.name}</div>
                                <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.15rem;">
                                    المخزن الكلي: <strong style="color: #fff;">${p.stockPacks}</strong> قروصة |
                                    المتاح للتوزيع الآن: <strong style="color: var(--accent-teal);">${freeStock}</strong> قروصة
                                </div>
                            </div>

                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <label style="font-size: 0.78rem; color: var(--text-muted); white-space: nowrap;">الكمية المخصصة (العهدة):</label>
                                <input type="number"
                                    class="form-control q-prod-input"
                                    data-product-id="${p.id}"
                                    value="${q.allocatedQty || 0}"
                                    min="0"
                                    max="${freeStock + (q.allocatedQty - q.soldQty)}"
                                    style="width: 85px; text-align: center; font-weight: 800; font-size: 0.9rem; padding: 0.3rem;"
                                    placeholder="0">
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>

            <div style="margin-top:0.75rem;background:rgba(255,159,26,0.1);border:1px solid rgba(255,159,26,0.3);padding:0.65rem 0.85rem;border-radius:10px;">
                <label style="display:flex;align-items:center;gap:0.5rem;font-size:0.82rem;color:var(--primary-orange);font-weight:800;cursor:pointer;">
                    <input type="checkbox" id="q-reset-sold" value="1">
                    🔄 تصفية السجلات المباعة سابقاً وتجهيز عهدة بضاعة جديدة للمندوب
                </label>
            </div>
        </div>
    `;

    openModalHTML(`📦 تخصيص عهدة المنتجات والعملاء للموظف`, body, () => {
        // Collect assigned customers
        const isAllCust = document.getElementById('q-cust-all')?.checked;
        let assignedCustomers = 'all';
        if (!isAllCust) {
            assignedCustomers = Array.from(document.querySelectorAll('.q-cust-item:checked')).map(el => Number(el.value));
        }

        // Collect product quotas
        const productQuotas = {};
        document.querySelectorAll('.q-prod-input').forEach(el => {
            const pId = Number(el.dataset.productId);
            const val = Math.max(0, Number(el.value) || 0);
            productQuotas[pId] = val;
        });

        const resetSoldQty = document.getElementById('q-reset-sold')?.checked || false;

        const res = state.assignEmployeeQuota(userId, { assignedCustomers, productQuotas, resetSoldQty });
        if (!res.success) {
            alert(res.message);
            return false;
        }

        alert(`✅ تم حفظ وتأكيد عهدة المنتجات والعملاء للموظف (${user.name}) بنجاح!`);
        return true;
    }, '✅ حفظ وتأكيد العُهدة');
}
window.openAssignQuotaModal = openAssignQuotaModal;

/* ─── Admin Collect Cash from Delegate Modal ─────────────────────── */
export function openCollectDelegateCashModal(userId) {
    const user = state.users.find(u => u.id === userId);
    if (!user) return;

    const currentCashHand = Number(user.delegateCashHand) || 0;
    const totalPreviouslyCollected = state.getTotalDelegateCollections(userId);

    const body = `
        <form onsubmit="return false;">
            <div style="background:#0f1524;border:1px solid var(--border-color);border-radius:12px;padding:1rem;margin-bottom:1.25rem;">
                <div class="flex-between">
                    <div>
                        <div style="font-weight:900;color:#fff;font-size:1.05rem;">👤 المندوب: ${user.name}</div>
                        <div style="font-size:0.8rem;color:var(--primary-orange);margin-top:0.25rem;">المسمى الوظيفي: ${user.role || 'مندوب مبيعات'}</div>
                    </div>
                    <button type="button" class="btn-secondary" style="font-size:0.75rem;padding:0.3rem 0.6rem;" onclick="window.openDelegateCollectionsHistoryModal(${user.id})">
                        📋 سجل توريداته السابقة
                    </button>
                </div>
                <div class="grid-2" style="margin-top:0.75rem;gap:0.5rem;">
                    <div style="background:rgba(0,200,151,0.08);border:1px solid rgba(0,200,151,0.25);border-radius:8px;padding:0.6rem;text-align:center;">
                        <div style="font-size:0.72rem;color:var(--text-muted);font-weight:700;">💵 النقدية الحالية بعُهدة المندوب</div>
                        <div style="font-size:1.2rem;font-weight:900;color:var(--accent-teal);margin-top:0.2rem;">
                            ${currentCashHand.toLocaleString('ar-EG')} ج.م
                        </div>
                    </div>
                    <div style="background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.25);border-radius:8px;padding:0.6rem;text-align:center;">
                        <div style="font-size:0.72rem;color:var(--text-muted);font-weight:700;">📥 إجمالي ما ورّده للخزينة سابقاً</div>
                        <div style="font-size:1.2rem;font-weight:900;color:#60a5fa;margin-top:0.2rem;">
                            ${totalPreviouslyCollected.toLocaleString('ar-EG')} ج.م
                        </div>
                    </div>
                </div>
            </div>

            <div class="form-group">
                <label class="form-label" style="font-weight:800;color:var(--primary-orange);">المبلغ المراد تحصيله وتوريده للخزينة (ج.م) *</label>
                <input type="number" id="m-collect-amount" class="form-control" value="${currentCashHand}" min="1" max="${currentCashHand || 1000000}" style="font-size:1.25rem;font-weight:900;color:var(--accent-teal);" required>
            </div>

            <div class="form-group">
                <label class="form-label">البيان / تفاصيل وملاحظات التحصيل</label>
                <input type="text" id="m-collect-notes" class="form-control" placeholder="مثال: استلام نقدية عهدة مبيعات خط بنها..." value="توريد نقدية من عهدة مبيعات المندوب">
            </div>

            <div style="background:rgba(0,200,151,0.08);border:1px solid rgba(0,200,151,0.25);border-radius:10px;padding:0.75rem;font-size:0.8rem;color:var(--accent-teal);font-weight:700;">
                💡 بمجرد التأكيد، سيتم خصم المبلغ فوراً من عهدة المندوب، وإضافته للنقدية الحالية بالخزينة الرئيسية، وإصدار سند قبض وتوريد مالي رسمي مسجل في كشوفات الحسابات والتقارير.
            </div>
        </form>
    `;

    openModalHTML(`💵 تحصيل وتوريد مبالغ نقدية من المندوب (${user.name})`, body, () => {
        const amount = Number(document.getElementById('m-collect-amount')?.value || 0);
        const notes = document.getElementById('m-collect-notes')?.value.trim() || '';

        if (amount <= 0) {
            alert('يرجى كتابة مبلغ تحصيل صحيح!');
            return false;
        }

        const res = state.collectDelegateCash(userId, amount, notes);
        if (!res.success) {
            alert(res.message);
            return false;
        }

        setTimeout(() => {
            if (res.voucher) {
                window.showCollectionVoucherModal(res.voucher.id);
            }
        }, 200);

        return true;
    }, '✅ تأكيد واستلام المبلغ وإصدار السند');
}
window.openCollectDelegateCashModal = openCollectDelegateCashModal;

/* ─── Printable / Viewable Collection Receipt Voucher Modal ─────── */
export function showCollectionVoucherModal(voucherId) {
    const voucher = (state.delegateCollections || []).find(v => String(v.id) === String(voucherId) || v.voucherNumber === voucherId);
    if (!voucher) {
        alert('لم يتم العثور على بيانات سند التحصيل!');
        return;
    }

    const body = `
        <div class="voucher-print-area invoice-print-area" id="printable-voucher" style="background:#fff;color:#000;padding:1.5rem;border-radius:12px;font-family:'Tajawal',sans-serif;box-shadow:0 8px 30px rgba(0,0,0,0.5);">
            <!-- Voucher Header -->
            <div style="text-align:center;border-bottom:2px dashed #000;padding-bottom:0.75rem;margin-bottom:1rem;">
                <div style="font-size:1.35rem;font-weight:900;letter-spacing:-0.5px;color:#000;">🏪 مؤسسة حسام حسني للتجارة والتوزيع</div>
                <div style="font-size:0.85rem;color:#444;margin-top:0.2rem;">سند قبض وتوريد نقدية للخزينة الرئيسية</div>
                <div style="display:inline-block;background:#000;color:#fff;font-weight:900;padding:0.25rem 0.75rem;border-radius:6px;font-size:0.85rem;margin-top:0.4rem;">
                    رقم السند: ${voucher.voucherNumber}
                </div>
            </div>

            <!-- Meta info -->
            <div style="display:flex;justify-content:space-between;font-size:0.85rem;margin-bottom:0.8rem;border-bottom:1px solid #ddd;padding-bottom:0.6rem;">
                <div>
                    <div><b>📅 التاريخ:</b> ${voucher.createdAt}</div>
                    <div style="margin-top:0.25rem;"><b>👤 المندوب المسلِّم:</b> <span style="font-size:0.95rem;font-weight:900;">${voucher.delegateName}</span></div>
                </div>
                <div style="text-align:left;">
                    <div><b>🏢 الخزينة المستلمة:</b> الخزينة الرئيسية</div>
                    <div style="margin-top:0.25rem;"><b>✍️ أمين الخزينة:</b> ${voucher.collectedBy}</div>
                </div>
            </div>

            <!-- Main Amount Banner -->
            <div style="background:#f4f6f8;border:2px solid #000;border-radius:8px;padding:0.85rem;text-align:center;margin-bottom:1rem;">
                <div style="font-size:0.78rem;color:#555;font-weight:700;">المبلغ المستلم والمورد للخزينة</div>
                <div style="font-size:1.8rem;font-weight:900;color:#000;margin-top:0.2rem;">
                    ${voucher.amount.toLocaleString('ar-EG')} <span style="font-size:1rem;">جنيه مصري فقط لا غير</span>
                </div>
            </div>

            <!-- Statement / Notes -->
            <div style="background:#fff;border:1px solid #ddd;border-radius:6px;padding:0.6rem 0.8rem;font-size:0.85rem;margin-bottom:1rem;">
                <b>البيان / الغرض:</b> ${voucher.notes || 'توريد نقدية عهدة مبيعات المندوب'}
            </div>

            <!-- Financial Custody Breakdown Table -->
            <table style="width:100%;border-collapse:collapse;font-size:0.82rem;margin-bottom:1.25rem;border:1px solid #ddd;">
                <thead>
                    <tr style="background:#eee;border-bottom:1px solid #ccc;text-align:right;">
                        <th style="padding:0.4rem 0.5rem;border-left:1px solid #ddd;">بيان الحساب المالي</th>
                        <th style="padding:0.4rem 0.5rem;text-align:center;">المبلغ بالجنيه</th>
                    </tr>
                </thead>
                <tbody>
                    <tr style="border-bottom:1px solid #eee;">
                        <td style="padding:0.4rem 0.5rem;border-left:1px solid #ddd;">رصيد عهدة المندوب قبل التوريد</td>
                        <td style="padding:0.4rem 0.5rem;text-align:center;font-weight:700;">${(voucher.delegateCashBefore || (voucher.delegateCashAfter + voucher.amount)).toLocaleString('ar-EG')} ج.م</td>
                    </tr>
                    <tr style="border-bottom:1px solid #eee;background:rgba(0,200,151,0.08);">
                        <td style="padding:0.4rem 0.5rem;border-left:1px solid #ddd;font-weight:900;color:#00875a;">المبلغ المسلم والمورد الآن (خصم من العهدة)</td>
                        <td style="padding:0.4rem 0.5rem;text-align:center;font-weight:900;color:#00875a;">− ${voucher.amount.toLocaleString('ar-EG')} ج.م</td>
                    </tr>
                    <tr style="border-bottom:1px solid #eee;font-weight:900;">
                        <td style="padding:0.4rem 0.5rem;border-left:1px solid #ddd;color:#d9534f;">المتبقي بذمة وعُهدة المندوب بالشارع</td>
                        <td style="padding:0.4rem 0.5rem;text-align:center;color:#d9534f;font-size:0.95rem;">${voucher.delegateCashAfter.toLocaleString('ar-EG')} ج.م</td>
                    </tr>
                    <tr style="background:#fafafa;">
                        <td style="padding:0.4rem 0.5rem;border-left:1px solid #ddd;font-weight:800;color:#2c3e50;">رصيد الخزينة الرئيسية بعد استلام المبلغ</td>
                        <td style="padding:0.4rem 0.5rem;text-align:center;font-weight:800;color:#2c3e50;">${(voucher.mainCashAfter || (voucher.mainCashBefore + voucher.amount)).toLocaleString('ar-EG')} ج.م</td>
                    </tr>
                </tbody>
            </table>

            <!-- Signatures Section -->
            <div style="display:flex;justify-content:space-between;margin-top:1.5rem;padding-top:0.75rem;border-top:2px dashed #999;font-size:0.85rem;">
                <div style="text-align:center;width:45%;">
                    <div style="font-weight:800;margin-bottom:2rem;">المندوب المسلِّم</div>
                    <div style="border-top:1px dotted #555;padding-top:0.25rem;">${voucher.delegateName}</div>
                </div>
                <div style="text-align:center;width:45%;">
                    <div style="font-weight:800;margin-bottom:2rem;">المستلم / أمين الخزينة</div>
                    <div style="border-top:1px dotted #555;padding-top:0.25rem;">${voucher.collectedBy}</div>
                </div>
            </div>

            <!-- Footer Note -->
            <div style="text-align:center;margin-top:1.25rem;font-size:0.72rem;color:#777;border-top:1px solid #eee;padding-top:0.4rem;">
                نظام حسام حسني لإدارة المخازن والمبيعات والحسابات • نسخة رقمية رسمية معتمدة
            </div>
        </div>

        <div style="display:flex;gap:0.75rem;margin-top:1.25rem;justify-content:center;flex-wrap:wrap;">
            <button class="btn-primary" type="button" style="padding:0.6rem 1.5rem;font-weight:900;box-shadow:0 4px 16px rgba(255,159,26,0.4);" onclick="window.print()">
                🖨️ طباعة سند القبض والتوريد
            </button>
            <button class="btn-secondary" type="button" style="padding:0.6rem 1.25rem;" onclick="window.closeAnyOpenModal()">
                ✖️ إغلاق
            </button>
        </div>
    `;

    openModalHTML(`🧾 سند قبض وتوريد نقدية: ${voucher.voucherNumber}`, body, () => true, '');
    const submitBtn = document.getElementById('modal-submit-btn');
    if (submitBtn) submitBtn.style.display = 'none';
}
window.showCollectionVoucherModal = showCollectionVoucherModal;

/* ─── Delegate Collections History Ledger Modal ─────────────────── */
export function openDelegateCollectionsHistoryModal(userId = null) {
    const user = userId ? state.users.find(u => u.id === userId) : null;
    const collections = state.getDelegateCollections(userId);
    const totalAmount = state.getTotalDelegateCollections(userId);

    const body = `
        <div>
            <div class="flex-between" style="background:#0f1524;border:1px solid var(--border-color);border-radius:12px;padding:1rem;margin-bottom:1.25rem;flex-wrap:wrap;gap:0.75rem;">
                <div>
                    <div style="font-size:1.1rem;font-weight:900;color:#fff;">
                        ${user ? `👤 سجل توريدات وتحصيلات المندوب: ${user.name}` : '🌐 كشف توريدات وتحصيلات كافة المناديب بالخزينة'}
                    </div>
                    <div style="font-size:0.8rem;color:var(--text-muted);margin-top:0.25rem;">
                        توثيق سندات استلام المبالغ النقدية وتأثيرها على حسابات الخزينة وعُهد المناديب.
                    </div>
                </div>
                <div style="background:rgba(0,200,151,0.12);border:1px solid rgba(0,200,151,0.3);border-radius:10px;padding:0.5rem 1rem;text-align:center;">
                    <div style="font-size:0.72rem;color:var(--text-muted);font-weight:700;">إجمالي المبالغ المستلمة</div>
                    <div style="font-size:1.3rem;font-weight:900;color:var(--accent-teal);">
                        ${totalAmount.toLocaleString('ar-EG')} <span style="font-size:0.8rem;">ج.م</span>
                    </div>
                </div>
            </div>

            <div class="table-responsive" style="max-height:420px;overflow-y:auto;">
                <table class="erp-table">
                    <thead>
                        <tr>
                            <th>رقم السند</th>
                            <th>التاريخ والوقت</th>
                            <th>اسم المندوب</th>
                            <th>المبلغ المورد</th>
                            <th>المتبقي بعُهدته</th>
                            <th>الخزينة بعد التوريد</th>
                            <th>البيان</th>
                            <th>المستلم</th>
                            <th>معاينة وطباعة</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${collections.length === 0 ? `
                            <tr>
                                <td colspan="9">
                                    <div class="empty-table-state">
                                        <i>💵</i>
                                        <p style="font-weight:700;color:#fff;">لا توجد أي سندات توريد مسجلة حتى الآن</p>
                                        <p style="font-size:0.8rem;color:var(--text-muted);margin-top:0.25rem;">يتم تسجيل السندات تلقائياً عند إجراء أي تحصيل من المندوب.</p>
                                    </div>
                                </td>
                            </tr>
                        ` : collections.map(v => `
                            <tr>
                                <td style="font-weight:900;color:var(--primary-orange);">${v.voucherNumber}</td>
                                <td style="font-size:0.8rem;">${v.createdAt}</td>
                                <td style="font-weight:800;color:#fff;">${v.delegateName}</td>
                                <td style="font-weight:900;color:var(--accent-teal);font-size:0.95rem;">${v.amount.toLocaleString('ar-EG')} ج.م</td>
                                <td style="color:var(--accent-red);font-weight:800;">${v.delegateCashAfter.toLocaleString('ar-EG')} ج.م</td>
                                <td style="color:#60a5fa;font-weight:800;">${(v.mainCashAfter || (v.mainCashBefore + v.amount)).toLocaleString('ar-EG')} ج.م</td>
                                <td style="font-size:0.8rem;color:var(--text-muted);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${v.notes}">${v.notes}</td>
                                <td style="font-size:0.8rem;">${v.collectedBy}</td>
                                <td>
                                    <button class="btn-secondary" style="font-size:0.75rem;padding:0.25rem 0.6rem;color:var(--primary-orange);" onclick="window.showCollectionVoucherModal('${v.id}')">
                                        🖨️ معاينة وطباعة
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    openModalHTML(`📋 سجل سندات توريد الخزينة`, body, () => true, '');
    const submitBtn = document.getElementById('modal-submit-btn');
    if (submitBtn) submitBtn.style.display = 'none';
}
window.openDelegateCollectionsHistoryModal = openDelegateCollectionsHistoryModal;

window.closeAnyOpenModal = () => {
    const backdrop = document.getElementById('modal-backdrop');
    if (backdrop) backdrop.classList.remove('active');
};

window.qToggleAllCustomers = (checked) => {
    document.querySelectorAll('.q-cust-item').forEach(el => {
        el.checked = checked;
        el.disabled = checked;
    });
};

/* ─── Employee Today's Invoices Modal (Exact Match to Screenshot 4) ─── */
export function openEmployeeTodayInvoicesModal(empId = null) {
    const user = empId ? state.users.find(u => u.id === empId) : (state.currentUser || { id: 1, name: 'احمد' });
    const empName = user ? user.name : 'الموظف';
    const empIdToMatch = user ? user.id : 1;

    // Filter today's invoices by this employee
    const todayStr = new Date().toLocaleDateString('ar-EG');
    const empInvoices = state.invoices.filter(inv => {
        const isSellerMatch = String(inv.sellerId) === String(empIdToMatch) || inv.sellerName === empName;
        return isSellerMatch;
    });

    const body = `
        ${empInvoices.length === 0 ? `
            <div style="text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
                <p style="font-size: 1rem; font-weight: 700; color: var(--text-main);">
                    لا توجد فواتير بيع مسجلة لهذا الموظف اليوم حتى الآن.
                </p>
            </div>
        ` : `
            <div class="table-responsive" style="max-height: 350px; overflow-y: auto;">
                <table class="erp-table">
                    <thead>
                        <tr>
                            <th>رقم الفاتورة</th>
                            <th>الوقت والتاريخ</th>
                            <th>العميل</th>
                            <th>الأصناف</th>
                            <th>الإجمالي</th>
                            <th>المدفوع</th>
                            <th>المتبقي</th>
                            <th>إجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${empInvoices.map(inv => `
                            <tr>
                                <td style="font-weight: 800; color: var(--primary-orange);">${inv.invoiceNumber}</td>
                                <td style="font-size: 0.78rem;">${inv.createdAt}</td>
                                <td>${inv.customerName}</td>
                                <td>${inv.items.length} أصناف</td>
                                <td style="font-weight: 800;">${inv.grandTotal} ج.م</td>
                                <td style="color: var(--accent-teal);">${inv.paidAmount} ج.م</td>
                                <td style="color: var(--accent-red);">${inv.remainingDebt} ج.م</td>
                                <td>
                                    <div class="table-actions" style="display:flex;gap:0.3rem;">
                                        <button class="action-btn" title="معاينة الفاتورة" onclick="window.reprintInvoice(${inv.id})">🔍</button>
                                        <button class="action-btn" style="color: var(--primary-orange);" title="تعديل الفاتورة" onclick="window.openEditInvoiceModal(${inv.id})">✏️</button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `}
    `;

    openModalHTML(`📄 سجل فواتير اليوم للموظف (${empName})`, body, () => {
        return true;
    }, 'إغلاق النافذة');
}
window.openEmployeeTodayInvoicesModal = openEmployeeTodayInvoicesModal;

/* ─── Edit Invoice Modal (For Admin & Employee) ──────────────────── */
export function openEditInvoiceModal(invoiceId) {
    const inv = state.invoices.find(i => i.id === invoiceId);
    if (!inv) return;

    const customers = state.customers;

    const body = `
        <form onsubmit="return false;">
            <div style="background: #0f1524; padding: 0.85rem; border-radius: 10px; margin-bottom: 1rem; border: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <div style="font-weight: 900; color: var(--primary-orange); font-size: 1rem;">${inv.invoiceNumber}</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">${inv.createdAt} • البائع: ${inv.sellerName}</div>
                </div>
                <div style="font-weight: 900; color: var(--accent-teal); font-size: 1.1rem;">${inv.grandTotal} ج.م</div>
            </div>

            <div class="form-group">
                <label class="form-label">تعديل العميل المشتري</label>
                <select id="m-ei-customer" class="form-control">
                    <option value="" ${!inv.customerId ? 'selected' : ''}>-- عميل كاش نقدي --</option>
                    ${customers.map(c => `
                        <option value="${c.id}" ${inv.customerId == c.id ? 'selected' : ''}>${c.name} (${c.shopName || 'تاجر'})</option>
                    `).join('')}
                </select>
            </div>

            <div class="grid-2">
                <div class="form-group">
                    <label class="form-label">مبلغ الخصم على الفاتورة (ج.م)</label>
                    <input type="number" id="m-ei-discount" class="form-control" value="${inv.discount || 0}" min="0">
                </div>
                <div class="form-group">
                    <label class="form-label">المبلغ المدفوع كاش (ج.م)</label>
                    <input type="number" id="m-ei-paid" class="form-control" value="${inv.paidAmount || 0}" min="0">
                </div>
            </div>

            <div style="background: rgba(255,159,26,0.08); padding: 0.75rem; border-radius: 10px; border: 1px solid rgba(255,159,26,0.2); font-size: 0.78rem; color: var(--primary-orange); font-weight: 700;">
                💡 يتم إعادة حساب أرباح الفاتورة والمبالغ المتبقية وديون العميل تلقائياً عند حفظ التعديلات.
            </div>
        </form>
    `;

    openModalHTML(`✏️ تعديل الفاتورة (${inv.invoiceNumber})`, body, () => {
        const custEl = document.getElementById('m-ei-customer');
        const customerId = custEl ? custEl.value : inv.customerId;
        const customerName = custEl && custEl.selectedIndex >= 0
            ? custEl.options[custEl.selectedIndex].text.split('(')[0].trim()
            : 'عميل نقدي (كاش)';

        const discount = Number(document.getElementById('m-ei-discount')?.value || 0);
        const paidAmount = Number(document.getElementById('m-ei-paid')?.value || 0);

        state.updateInvoice(invoiceId, {
            discount,
            paidAmount,
            customerId: customerId || null,
            customerName: customerId ? customerName : 'عميل نقدي (كاش)'
        });

        alert(`✅ تم تحديث الفاتورة (${inv.invoiceNumber}) وتعديل حسابات الأرباح والديون بنجاح!`);
        return true;
    }, '✅ حفظ التعديلات');
}
window.openEditInvoiceModal = openEditInvoiceModal;

/* ─── Manual Cash Liquidity Adjustment Modal (Image 4 requirement) ─── */
export function openEditCashLiquidityModal() {
    const currentVal = state.cashOnHand || 60;

    const body = `
        <form onsubmit="return false;">
            <div class="form-group">
                <label class="form-label" style="font-weight:800;color:var(--primary-orange);">🪙 السيولة النقدية الحالية بالخزينة (ج.م):</label>
                <input type="number" id="m-cash-on-hand-input" class="form-control" value="${currentVal}" style="font-size:1.2rem;font-weight:900;color:var(--accent-teal);" min="0">
            </div>
            <div style="font-size:0.8rem;color:var(--text-muted);background:#0f1524;padding:0.75rem;border-radius:8px;border:1px solid var(--border-color);">
                💡 تتعدل السيولة النقدية تلقائياً عند كل عملية بيع كاش أو توريد مخزون، ويمكنك إعادة تعيينها أو تعديلها يدوياً هنا في أي وقت.
            </div>
        </form>
    `;

    openModalHTML(`✏️ تعديل السيولة النقدية الحالية`, body, () => {
        const val = Number(document.getElementById('m-cash-on-hand-input')?.value || 0);
        state.updateCashOnHand(val);
        requestAnimationFrame(() => {
            if (window.renderCurrentView) window.renderCurrentView();
        });
        return true;
    }, '✅ حفظ وتأكيد الرصيد');
}
window.openEditCashLiquidityModal = openEditCashLiquidityModal;





/* Add Product Modal */
export function openAddProductModal() {
    const body = `
        <form id="add-product-form" onsubmit="return false;">
            <div class="form-group">
                <label class="form-label">اسم الصنف / الماركة *</label>
                <input type="text" id="m-p-name" class="form-control" placeholder="مثال: box كليوباترا، مارلبورو..." required>
            </div>
            <div class="form-group">
                <label class="form-label">الفئة / القسم</label>
                <select id="m-p-cat" class="form-control">
                    <option value="كليوباترا ومحلي">كليوباترا ومحلي</option>
                    <option value="مارلبورو وأجنبي">مارلبورو وأجنبي</option>
                    <option value="فيب وإكسسوارات">فيب وإكسسوارات</option>
                </select>
            </div>
            <div class="grid-2">
                <div class="form-group">
                    <label class="form-label">المخزون الحالي (عدد القراصص/العلب) *</label>
                    <input type="number" id="m-p-stock" class="form-control" value="50" min="0">
                </div>
                <div class="form-group">
                    <label class="form-label">حد إعادة الطلب الحرِج *</label>
                    <input type="number" id="m-p-minstock" class="form-control" value="500" min="0">
                </div>
            </div>
            <div class="grid-2">
                <div class="form-group">
                    <label class="form-label">سعر الشراء (ج.م) *</label>
                    <input type="number" id="m-p-buy" class="form-control" placeholder="35" min="0">
                </div>
                <div class="form-group">
                    <label class="form-label">سعر البيع للجمهور (ج.م) *</label>
                    <input type="number" id="m-p-sell" class="form-control" placeholder="39" min="0">
                </div>
            </div>
        </form>
    `;

    openModalHTML('📦 إضافة صنف جديد للمخزون', body, () => {
        const name = document.getElementById('m-p-name')?.value.trim();
        const cat = document.getElementById('m-p-cat')?.value;
        const stockPacks = Number(document.getElementById('m-p-stock')?.value);
        const minStockPacks = Number(document.getElementById('m-p-minstock')?.value);
        const buyPrice = Number(document.getElementById('m-p-buy')?.value);
        const sellPrice = Number(document.getElementById('m-p-sell')?.value);

        if (!name || !sellPrice) {
            alert('يرجى ملء اسم الصنف وسعر البيع!');
            return false;
        }

        state.addProduct({ name, category: cat, stockPacks, minStockPacks, buyPrice, sellPrice });
        return true;
    });
}
window.openAddProductModal = openAddProductModal;

/* ─── Advanced Batch Stock & WAC Price Update Modal ─────────────── */
/**
 * Opens the Weighted Average Cost restock modal.
 * @param {number|null} preselectedId - Pre-select a product by ID (from row pencil icon)
 */
export function openRestockModal(preselectedId = null) {
    const products = state.products;
    if (products.length === 0) {
        alert('لا توجد أصناف في المخزون! يرجى إضافة أصناف أولاً.');
        return;
    }

    const firstId  = preselectedId || products[0]?.id;
    const firstProd = products.find(p => p.id === firstId) || products[0];

    const body = `
        <!-- Product Selector -->
        <div class="form-group" style="margin-bottom:1.25rem;">
            <label class="form-label">اختر الصنف</label>
            <select id="rs-product" class="form-control" onchange="window.rsOnProductChange(this.value)">
                ${products.map(p => `
                    <option value="${p.id}" ${p.id === firstId ? 'selected' : ''}>
                        ${p.name}
                    </option>
                `).join('')}
            </select>
        </div>

        <!-- Current State Preview Card -->
        <div id="rs-current-state" style="
            background:#0a0e17;
            border:1px solid var(--border-color);
            border-radius:12px;
            padding:0.85rem 1rem;
            margin-bottom:1.25rem;
            display:grid;
            grid-template-columns:1fr 1fr 1fr;
            gap:0.75rem;
        ">
            <div style="text-align:center;">
                <div style="font-size:0.7rem;color:var(--text-muted);font-weight:700;margin-bottom:0.25rem;">الكمية الحالية</div>
                <div id="rs-cur-qty" style="font-size:1.25rem;font-weight:900;color:var(--accent-teal);">${firstProd.stockPacks}</div>
                <div style="font-size:0.7rem;color:var(--text-muted);">قروصة</div>
            </div>
            <div style="text-align:center;border-right:1px solid var(--border-color);border-left:1px solid var(--border-color);">
                <div style="font-size:0.7rem;color:var(--text-muted);font-weight:700;margin-bottom:0.25rem;">سعر الشراء الحالي</div>
                <div id="rs-cur-buy" style="font-size:1.25rem;font-weight:900;color:var(--primary-orange);">${firstProd.buyPrice}</div>
                <div style="font-size:0.7rem;color:var(--text-muted);">ج.م</div>
            </div>
            <div style="text-align:center;">
                <div style="font-size:0.7rem;color:var(--text-muted);font-weight:700;margin-bottom:0.25rem;">سعر البيع الحالي</div>
                <div id="rs-cur-sell" style="font-size:1.25rem;font-weight:900;color:#60a5fa;">${firstProd.sellPrice}</div>
                <div style="font-size:0.7rem;color:var(--text-muted);">ج.م</div>
            </div>
        </div>

        <!-- Divider Label -->
        <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:1rem;">
            <div style="flex:1;height:1px;background:var(--border-color);"></div>
            <span style="font-size:0.78rem;color:var(--primary-orange);font-weight:800;white-space:nowrap;">📦 بيانات الوارد الجديد</span>
            <div style="flex:1;height:1px;background:var(--border-color);"></div>
        </div>

        <!-- Input Fields -->
        <div class="grid-2" style="margin-bottom:0.75rem;">
            <div class="form-group">
                <label class="form-label">الكمية الواردة الجديدة (قروصة)</label>
                <input type="number" id="rs-new-qty" class="form-control" placeholder="مثال: 200" min="0"
                    oninput="window.rsUpdateWACPreview()" value="0">
            </div>
            <div class="form-group">
                <label class="form-label">سعر شراء الدفعة الجديدة (ج.م)</label>
                <input type="number" id="rs-new-buy" class="form-control" placeholder="مثال: 37" min="0"
                    oninput="window.rsUpdateWACPreview()" value="${firstProd.buyPrice}">
            </div>
        </div>

        <div class="grid-2" style="margin-bottom:1rem;">
            <div class="form-group">
                <label class="form-label">سعر البيع الجديد للجمهور (ج.م)</label>
                <input type="number" id="rs-new-sell" class="form-control" placeholder="مثال: 41" min="0"
                    oninput="window.rsUpdateWACPreview()" value="${firstProd.sellPrice}">
            </div>
            <div class="form-group">
                <label class="form-label">حد إعادة الطلب الحرِج (قروصة)</label>
                <input type="number" id="rs-min-stock" class="form-control" min="0"
                    value="${firstProd.minStockPacks}">
            </div>
        </div>

        <!-- WAC Live Preview Banner -->
        <div id="rs-wac-preview" style="
            background:linear-gradient(135deg,rgba(255,159,26,0.07),rgba(15,211,160,0.07));
            border:1px solid rgba(255,159,26,0.25);
            border-radius:12px;
            padding:0.85rem 1rem;
            display:grid;
            grid-template-columns:1fr 1fr 1fr 1fr;
            gap:0.5rem;
        ">
            <div style="text-align:center;">
                <div style="font-size:0.7rem;color:var(--text-muted);font-weight:700;margin-bottom:0.2rem;">الكمية بعد الوارد</div>
                <div id="rs-preview-qty" style="font-size:1.1rem;font-weight:900;color:var(--accent-teal);">−</div>
            </div>
            <div style="text-align:center;border-right:1px solid rgba(255,255,255,0.07);border-left:1px solid rgba(255,255,255,0.07);">
                <div style="font-size:0.7rem;color:var(--text-muted);font-weight:700;margin-bottom:0.2rem;">متوسط التكلفة (WAC)</div>
                <div id="rs-preview-wac" style="font-size:1.1rem;font-weight:900;color:var(--primary-orange);">−</div>
            </div>
            <div style="text-align:center;border-left:1px solid rgba(255,255,255,0.07);">
                <div style="font-size:0.7rem;color:var(--text-muted);font-weight:700;margin-bottom:0.2rem;">هامش الربح المتوقع</div>
                <div id="rs-preview-margin" style="font-size:1.1rem;font-weight:900;color:#60a5fa;">−</div>
            </div>
            <div style="text-align:center;">
                <div style="font-size:0.7rem;color:var(--text-muted);font-weight:700;margin-bottom:0.2rem;">خصم الخزينة</div>
                <div id="rs-preview-cash-deduct" style="font-size:1.05rem;font-weight:900;color:#ef4444;">0 ج.م</div>
            </div>
        </div>
    `;

    openModalHTML('📦 توريد صنف وتحديث السعر (متوسط التكلفة الموزون)', body, () => {
        const id       = Number(document.getElementById('rs-product')?.value);
        const newQty   = Number(document.getElementById('rs-new-qty')?.value   || 0);
        const newBuy   = Number(document.getElementById('rs-new-buy')?.value   || 0);
        const newSell  = Number(document.getElementById('rs-new-sell')?.value  || 0);
        const minStock = document.getElementById('rs-min-stock')?.value;

        if (!id) { alert('يرجى اختيار الصنف!'); return false; }
        if (newQty < 0) { alert('الكمية لا يمكن أن تكون سالبة!'); return false; }
        if (newBuy <= 0 && newQty > 0) { alert('يرجى إدخال سعر الشراء!'); return false; }
        if (newSell <= 0) { alert('يرجى إدخال سعر البيع!'); return false; }

        const updated = state.restockProduct(id, {
            newQty,
            newBuyPrice:  newBuy,
            newSellPrice: newSell,
            newMinStock:  minStock
        });

        if (updated) {
            // Show success summary
            const marginPct = updated.buyPrice > 0
                ? (((updated.sellPrice - updated.buyPrice) / updated.buyPrice) * 100).toFixed(1)
                : 0;
            console.info(
                `✅ تم التوريد: ${updated.name} | الكمية: ${updated.stockPacks} | WAC: ${updated.buyPrice} ج.م | هامش: ${marginPct}%`
            );
            window.renderCurrentView();
            return true;
        }
        return false;
    }, '✅ حفظ وتطبيق التوريد وتحديث الخزينة');
}
export { openRestockModal as openQuickPriceModal };
window.openQuickPriceModal = openRestockModal;
window.openRestockModal    = openRestockModal;

/* Live WAC preview updater (called on every input change) */
window.rsOnProductChange = (id) => {
    const product = state.products.find(p => p.id == id);
    if (!product) return;
    document.getElementById('rs-cur-qty').textContent  = product.stockPacks;
    document.getElementById('rs-cur-buy').textContent  = product.buyPrice;
    document.getElementById('rs-cur-sell').textContent = product.sellPrice;
    document.getElementById('rs-new-buy').value  = product.buyPrice;
    document.getElementById('rs-new-sell').value = product.sellPrice;
    document.getElementById('rs-min-stock').value = product.minStockPacks;
    window.rsUpdateWACPreview();
};

window.rsUpdateWACPreview = () => {
    const prodId  = Number(document.getElementById('rs-product')?.value);
    const product = state.products.find(p => p.id === prodId);
    if (!product) return;

    const oldQty  = Number(product.stockPacks) || 0;
    const oldBuy  = Number(product.buyPrice)   || 0;
    const addQty  = Number(document.getElementById('rs-new-qty')?.value)  || 0;
    const addBuy  = Number(document.getElementById('rs-new-buy')?.value)  || oldBuy;
    const newSell = Number(document.getElementById('rs-new-sell')?.value) || product.sellPrice;

    const totalQty = oldQty + addQty;
    const wac = totalQty > 0
        ? ((oldQty * oldBuy) + (addQty * addBuy)) / totalQty
        : addBuy;
    const wacRounded  = Math.round(wac * 100) / 100;
    const marginPct   = wacRounded > 0 ? (((newSell - wacRounded) / wacRounded) * 100).toFixed(1) : '0.0';
    const marginColor = Number(marginPct) > 0 ? 'var(--accent-teal)' : 'var(--accent-red)';
    const purchaseCost = addQty * addBuy;

    const qEl = document.getElementById('rs-preview-qty');
    const wEl = document.getElementById('rs-preview-wac');
    const mEl = document.getElementById('rs-preview-margin');
    const cEl = document.getElementById('rs-preview-cash-deduct');
    if (qEl) qEl.textContent = totalQty > 0 ? `${totalQty} قروصة` : '−';
    if (wEl) wEl.textContent = totalQty > 0 ? `${wacRounded} ج.م` : '−';
    if (mEl) { mEl.textContent = totalQty > 0 ? `${marginPct}%` : '−'; mEl.style.color = marginColor; }
    if (cEl) cEl.textContent = purchaseCost > 0 ? `-${purchaseCost.toLocaleString('ar-EG')} ج.م` : '0 ج.م';
};

/* Keep openEditProductModal for row-level edit (now delegates to openRestockModal) */
export function openEditProductModal(productId) {
    openRestockModal(productId);
}
window.openEditProductModal = openEditProductModal;


/* ─── Cart Item Discount Popup ─────────────────────────────────── */
window.openCartItemDiscountPopup = (productId) => {
    const item = state.cart.find(i => i.productId === productId);
    if (!item) return;

    const productObj = state.products.find(p => p.id === productId);
    const origUnitPrice = productObj ? (Number(productObj.sellPrice) || 0) : Number(item.unitPrice || 0);
    const buyPrice = productObj ? (Number(productObj.buyPrice) || 0) : (Number(item.buyPrice) || 0);
    const currentQty = Number(item.qty) || 1;
    const currentUnitPrice = Number(item.unitPrice) || origUnitPrice;
    const origTotal = origUnitPrice * currentQty;
    const currentDiscount = item.itemDiscount !== undefined 
        ? Number(item.itemDiscount) 
        : Math.max(0, origTotal - (currentUnitPrice * currentQty));
    const currentTotal = Math.max(0, currentUnitPrice * currentQty);

    const root = document.getElementById('modal-root');
    root.innerHTML = `
        <div class="modal-backdrop active" id="current-modal-backdrop">
            <div class="modal-dialog" style="max-width: 440px; width: 92%;">
                <div class="modal-header">
                    <div class="modal-title">✏️ خصم وتعديل سعر: ${item.name}</div>
                    <button class="modal-close" onclick="window.closeCurrentModal()">✕</button>
                </div>
                <div class="modal-body">
                    <div style="background: #0f1524; border-radius: 10px; padding: 0.9rem 1rem; margin-bottom: 1rem; border: 1px solid var(--border-color);">
                        <div class="flex-between" style="margin-bottom: 0.35rem;">
                            <div style="font-weight: 800; color: #fff; font-size: 0.95rem;">${item.name}</div>
                            <span class="badge badge-orange">${currentQty} قروصة</span>
                        </div>
                        <div class="flex-between" style="font-size: 0.8rem; color: var(--text-muted);">
                            <span>السعر الأصلي: <strong style="color:#fff;">${origUnitPrice} ج.م</strong></span>
                            <span>سعر الشراء والتكلفة: <strong style="color:var(--accent-teal);">${buyPrice} ج.م</strong></span>
                        </div>
                        <div class="flex-between" style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.25rem;">
                            <span>إجمالي الصنف بالسعر الأصلي:</span>
                            <strong style="color:var(--primary-orange);">${origTotal} ج.م</strong>
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 0.75rem;">
                        <div class="form-group">
                            <label class="form-label" style="font-size: 0.82rem; color: var(--text-muted); font-weight: 700;">
                                إجمالي الخصم (ج.م)
                            </label>
                            <input type="number" id="item-discount-input" class="form-control"
                                value="${currentDiscount}" min="0" max="${origTotal}"
                                style="font-size: 1.05rem; font-weight: 800; text-align: center; color: var(--primary-orange);"
                                placeholder="0">
                        </div>

                        <div class="form-group">
                            <label class="form-label" style="font-size: 0.82rem; color: var(--text-muted); font-weight: 700;">
                                سعر البيع الجديد / قروصة
                            </label>
                            <input type="number" id="item-unit-price-input" class="form-control"
                                value="${currentUnitPrice}" min="0" step="any"
                                style="font-size: 1.05rem; font-weight: 800; text-align: center; color: #60a5fa;"
                                placeholder="${origUnitPrice}">
                        </div>
                    </div>

                    <div id="item-discount-warning" style="display:${(buyPrice > 0 && currentUnitPrice < buyPrice) ? 'block' : 'none'}; background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.4); color: #ef4444; border-radius: 8px; padding: 0.5rem 0.75rem; margin-bottom: 0.75rem; font-size: 0.8rem; font-weight: 800;">
                        ⚠️ تحذير: سعر البيع بعد الخصم سيكون أقل من سعر الشراء (${buyPrice} ج.م) - سيتم إطلاق تنبيه خسارة!
                    </div>

                    <div id="item-discount-preview" style="background: rgba(15,211,160,0.08); border: 1px solid rgba(15,211,160,0.25); border-radius: 10px; padding: 0.75rem; display: flex; justify-content: space-between; align-items: center; font-size: 0.88rem;">
                        <span style="color: var(--text-muted);">الإجمالي المطلوب لهذا الصنف:</span>
                        <span style="font-weight: 900; color: var(--accent-teal); font-size: 1.1rem;" id="item-discounted-total">${currentTotal} ج.م</span>
                    </div>
                </div>
                <div class="modal-footer" style="display: flex; justify-content: space-between; gap: 0.5rem;">
                    <div>
                        ${(currentDiscount > 0 || currentUnitPrice !== origUnitPrice) ? `
                            <button type="button" class="btn-secondary" style="color: var(--accent-red); border-color: rgba(239,68,68,0.3); font-size: 0.78rem;" onclick="window.resetCartItemDiscount(${productId})">
                                إزالة الخصم
                            </button>
                        ` : ''}
                    </div>
                    <div style="display: flex; gap: 0.5rem;">
                        <button type="button" class="btn-secondary" onclick="window.closeCurrentModal()">إلغاء</button>
                        <button type="button" class="btn-primary" onclick="window.applyCartItemDiscount(${productId})">✓ تطبيق وتأكيد</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    const discInput = document.getElementById('item-discount-input');
    const priceInput = document.getElementById('item-unit-price-input');
    const totalEl = document.getElementById('item-discounted-total');
    const warnEl = document.getElementById('item-discount-warning');

    const updateFromDiscount = () => {
        let disc = Math.max(0, Number(discInput.value) || 0);
        if (disc > origTotal) disc = origTotal;
        const newTotal = origTotal - disc;
        const newUnit = currentQty > 0 ? (newTotal / currentQty) : newTotal;
        priceInput.value = parseFloat(newUnit.toFixed(2));
        totalEl.textContent = `${newTotal.toFixed(0)} ج.م`;
        if (warnEl) {
            warnEl.style.display = (buyPrice > 0 && newUnit < buyPrice) ? 'block' : 'none';
        }
    };

    const updateFromUnitPrice = () => {
        let newUnit = Math.max(0, Number(priceInput.value) || 0);
        const newTotal = newUnit * currentQty;
        const disc = Math.max(0, origTotal - newTotal);
        discInput.value = parseFloat(disc.toFixed(2));
        totalEl.textContent = `${newTotal.toFixed(0)} ج.م`;
        if (warnEl) {
            warnEl.style.display = (buyPrice > 0 && newUnit < buyPrice) ? 'block' : 'none';
        }
    };

    if (discInput && priceInput) {
        discInput.addEventListener('input', updateFromDiscount);
        priceInput.addEventListener('input', updateFromUnitPrice);
        discInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') window.applyCartItemDiscount(productId); });
        priceInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') window.applyCartItemDiscount(productId); });
    }
};

window.resetCartItemDiscount = (productId) => {
    const item = state.cart.find(i => i.productId === productId);
    if (!item) return;
    const productObj = state.products.find(p => p.id === productId);
    item.unitPrice = productObj ? productObj.sellPrice : item.unitPrice;
    delete item.itemDiscount;
    state.save('hussam_erp_cart_v2.5', state.cart);
    window.closeCurrentModal();
    window.renderCurrentView();
};

window.applyCartItemDiscount = (productId) => {
    const item = state.cart.find(i => i.productId === productId);
    if (!item) return;

    const disc = Math.max(0, Number(document.getElementById('item-discount-input')?.value) || 0);
    const unitPriceVal = Number(document.getElementById('item-unit-price-input')?.value);
    
    const productObj = state.products.find(p => p.id === productId);
    const origUnitPrice = productObj ? productObj.sellPrice : item.unitPrice;

    if (!isNaN(unitPriceVal) && unitPriceVal >= 0) {
        item.unitPrice = unitPriceVal;
    } else {
        item.unitPrice = Math.max(0, origUnitPrice - (item.qty > 0 ? disc / item.qty : 0));
    }
    item.itemDiscount = disc;

    state.save('hussam_erp_cart_v2.5', state.cart);
    window.closeCurrentModal();
    window.renderCurrentView();
};

/* Add Customer Modal */
export function openAddCustomerModal() {
    const body = `
        <form onsubmit="return false;">
            <div class="form-group">
                <label class="form-label">اسم التاجر / العميل *</label>
                <input type="text" id="m-c-name" class="form-control" placeholder="مثال: المحل التجاري - سالم..." required>
            </div>
            <div class="form-group">
                <label class="form-label">اسم المحل / المخبز</label>
                <input type="text" id="m-c-shop" class="form-control" placeholder="محل تجزئة...">
            </div>
            <div class="grid-2">
                <div class="form-group">
                    <label class="form-label">رقم الهاتف / الواتساب</label>
                    <input type="text" id="m-c-phone" class="form-control" placeholder="0123456789">
                </div>
                <div class="form-group">
                    <label class="form-label">المنطقة / العنوان</label>
                    <input type="text" id="m-c-location" class="form-control" placeholder="بنها...">
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">الدين السابق إن وجد (ج.م)</label>
                <input type="number" id="m-c-debt" class="form-control" value="0">
            </div>
        </form>
    `;

    openModalHTML('👤 إضافة تاجر / عميل جديد', body, () => {
        const name = document.getElementById('m-c-name')?.value.trim();
        const shopName = document.getElementById('m-c-shop')?.value.trim();
        const phone = document.getElementById('m-c-phone')?.value.trim();
        const location = document.getElementById('m-c-location')?.value.trim();
        const debt = Number(document.getElementById('m-c-debt')?.value || 0);

        if (!name) {
            alert('يرجى ملء اسم التاجر / العميل!');
            return false;
        }

        state.addCustomer({ name, shopName, phone, location, debt });
        return true;
    });
}
window.openAddCustomerModal = openAddCustomerModal;

/* Payment Receipt Modal */
export function openPaymentModal(customerId) {
    const customer = state.customers.find(c => String(c.id) === String(customerId));
    if (!customer) {
        alert('لم يتم العثور على بيانات هذا العميل!');
        return;
    }

    const defaultVal = customer.debt > 0 ? customer.debt : '';

    const body = `
        <div style="background: #0f1524; padding: 1rem; border-radius: 10px; margin-bottom: 1rem; border: 1px solid var(--border-color);">
            <div style="font-weight: 800; color: #fff; font-size: 1.05rem;">👤 التاجر / العميل: ${customer.name}</div>
            <div style="font-size: 0.85rem; color: ${customer.debt > 0 ? 'var(--accent-red)' : 'var(--accent-teal)'}; margin-top: 0.3rem; font-weight: 700;">
                ${customer.debt > 0 ? `⚠️ إجمالي الدين المستحق حالياً: ${customer.debt.toLocaleString('ar-EG')} ج.م` : '✅ هذا العميل خالي الديون (يمكنك إدخال دفعة/سند قبض لحسابه)'}
            </div>
        </div>
        <div class="form-group">
            <label class="form-label" style="font-weight: 800; color: var(--primary-orange);">المبلغ المسدد الآن بسند القبض (ج.م) *</label>
            <input type="number" id="m-pay-amount" class="form-control" placeholder="أدخل المبلغ المسدد (مثال: 5000)" value="${defaultVal}" min="1" step="any" autofocus required style="font-size: 1.1rem; font-weight: 800; color: var(--accent-teal);">
        </div>
    `;

    openModalHTML(`💵 تسجيل سند قبض جديد (${customer.name})`, body, () => {
        const amountEl = document.getElementById('m-pay-amount');
        const amount = Number(amountEl?.value);
        if (!amount || isNaN(amount) || amount <= 0) {
            alert('⚠️ يرجى إدخال مبلغ صحيح لسند القبض أكبر من 0 جنيه!');
            if (amountEl) amountEl.focus();
            return false;
        }

        state.addCustomerPayment(customer.id, amount);
        alert(`✅ تم حفظ سند القبض بنجاح بمبلغ ${amount.toLocaleString('ar-EG')} ج.م وتم توريدها فورياً لرصيد السيولة النقدية بالخزينة!`);
        if (window.renderCurrentView) window.renderCurrentView();
        return true;
    }, 'تأكيد وحفظ سند القبض');
}
window.openPaymentModal = openPaymentModal;

/* ─── Invoice Modal ─────────────────────────────────────────────── */
// Track whether current invoice is "confirmed" (تم الإتمام)
let _pendingInvoice = null;

export function showInvoiceModal(invoice) {
    // Store invoice data without saving yet - save happens only on "تم الإتمام"
    _pendingInvoice = invoice;
    _renderInvoiceModal(invoice, false);
}
window.showInvoiceModal = showInvoiceModal;

/* Open an invoice by its number (used from the customer statement table) */
window.showInvoiceByNumber = (invoiceNumber) => {
    const inv = state.invoices.find(i => String(i.invoiceNumber) === String(invoiceNumber));
    if (inv) {
        window.showInvoiceModal(inv);
    } else {
        alert('لم يتم العثور على هذه الفاتورة!');
    }
};

function _renderInvoiceModal(invoice, isConfirmed) {
    setupModals();
    const root = document.getElementById('modal-root');
    const totalPacksCount = invoice.items.reduce((s, i) => s + i.qty, 0);
    const itemsCount = invoice.items.length;

    const previousDebt = invoice.previousDebt !== undefined
        ? Number(invoice.previousDebt)
        : (invoice.customerId ? Number(state.customers.find(c => c.id == invoice.customerId)?.debt || 0) : 0);
    const totalDebtBeforePayment = invoice.totalDebtBeforePayment !== undefined
        ? Number(invoice.totalDebtBeforePayment)
        : (previousDebt + Number(invoice.grandTotal || 0));
    const totalDebtAfterInvoice = invoice.totalDebtAfterInvoice !== undefined
        ? Number(invoice.totalDebtAfterInvoice)
        : Math.max(0, totalDebtBeforePayment - Number(invoice.paidAmount || 0));

    root.innerHTML = `
        <div class="modal-backdrop active" id="current-modal-backdrop">
            <div class="modal-dialog" style="width: 620px; max-width: 96vw;">

                <!-- Header -->
                <div class="modal-header" style="background: #0f1524; border-bottom: 1px solid var(--border-color);">
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <span style="background: #00c897; color: #000; width: 24px; height: 24px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: 900; font-size: 0.8rem;">✓</span>
                        <div>
                            <div style="font-weight: 900; color: #fff; font-size: 1.05rem;">تم حفظ وإتمام الفاتورة بنجاح</div>
                            <div style="font-size: 0.75rem; color: var(--text-muted);">فاتورة رقم: ${invoice.invoiceNumber}</div>
                        </div>
                    </div>
                    <button class="modal-close" onclick="window.closeInvoiceModal()">✕</button>
                </div>

                <div class="modal-body" style="padding: 1.25rem;">
                    <!-- White Thermal Slip -->
                    <div class="invoice-receipt-card" id="printable-invoice">
                        <div class="receipt-header">
                            <div class="receipt-logo-title">🚬 مؤسسة الدخان والسجائر ERP</div>
                            <div class="receipt-sub">تجارة الجملة والتجزئة • سجائر محلية ومستوردة</div>
                            <div style="font-size: 0.72rem; color: #6b7280; margin-top: 0.15rem;">س.ت: 104928 • هاتف: 01150551500</div>
                        </div>

                        <div class="receipt-details-grid">
                            <div>رقم الفاتورة:<br><strong>${invoice.invoiceNumber}</strong></div>
                            <div>التاريخ والوقت:<br><strong>${invoice.createdAt}</strong></div>
                            <div>اسم العميل/التاجر:<br><strong>${invoice.customerName}</strong></div>
                            <div>طريقة الدفع:<br><span style="color: #d97706; font-weight: 800;">${invoice.paymentMethod === 'cash' ? 'نقدي (كاش)' : 'دفعة جزئية'}</span></div>
                        </div>

                        <table class="receipt-table">
                            <thead>
                                <tr>
                                    <th>الصنف</th>
                                    <th>الوحدة</th>
                                    <th>الكمية</th>
                                    <th>السعر</th>
                                    <th>الإجمالي</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${invoice.items.map(item => `
                                    <tr>
                                        <td style="font-weight: 800;">${item.name}</td>
                                        <td>قروصة</td>
                                        <td style="font-weight: 800;">${item.qty}</td>
                                        <td>${item.unitPrice}</td>
                                        <td style="font-weight: 800;">${(item.unitPrice * item.qty).toFixed(0)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>

                        <div class="receipt-qty-highlight">
                            إجمالي عدد الأصناف بالفاتورة: <strong>${itemsCount} ${itemsCount === 1 ? 'صنف' : 'أصناف'}</strong> (${totalPacksCount} قروصة)
                        </div>

                        <div class="receipt-totals">
                            <div class="receipt-totals-row">
                                <span>المجموع قبل الخصم:</span>
                                <span>${invoice.subtotal} ج.م</span>
                            </div>
                            ${invoice.discount > 0 ? `
                            <div class="receipt-totals-row" style="color: #059669;">
                                <span>الخصم المطبق:</span>
                                <span>- ${invoice.discount} ج.م</span>
                            </div>` : ''}
                            <div class="receipt-totals-row total-bold">
                                <span>إجمالي قيمة الفاتورة الجديدة:</span>
                                <span style="color: #d97706;">${invoice.grandTotal} ج.م</span>
                            </div>
                            ${previousDebt > 0 ? `
                            <div class="receipt-totals-row" style="color: #dc2626; font-weight: 800;">
                                <span>المديونية السابقة للعميل:</span>
                                <span>${previousDebt.toLocaleString('ar-EG')} ج.م</span>
                            </div>
                            <div class="receipt-totals-row" style="color: #7c3aed; font-weight: 900; background: rgba(124, 58, 237, 0.05); padding: 2px 4px; border-radius: 4px;">
                                <span>إجمالي الدين القديم + الجديد:</span>
                                <span>${totalDebtBeforePayment.toLocaleString('ar-EG')} ج.م</span>
                            </div>
                            ` : ''}
                            <div class="receipt-totals-row">
                                <span>المبلغ المدفوع كاش الآن:</span>
                                <span style="color: #059669; font-weight: 800;">${invoice.paidAmount} ج.م</span>
                            </div>
                            <div class="receipt-totals-row due-red">
                                <span>المتبقي من الفاتورة الجديدة:</span>
                                <span>${invoice.remainingDebt} ج.م</span>
                            </div>
                            ${previousDebt > 0 ? `
                            <div class="receipt-totals-row due-red" style="background: rgba(220, 38, 38, 0.08); padding: 4px; border-radius: 4px; margin-top: 4px; font-weight: 900; font-size: 0.92rem;">
                                <span>إجمالي الرصيد المتبقي المستحق على العميل:</span>
                                <span>${totalDebtAfterInvoice.toLocaleString('ar-EG')} ج.م</span>
                            </div>
                            ` : ''}
                        </div>

                        <div class="receipt-footer-msg">
                            شكراً لتعاملكم معنا! البضاعة المباعة لا تُرد بعد الاستلام.<br>
                            البائع: ${invoice.sellerName}
                        </div>
                    </div>

                    <!-- Action Buttons Bar -->
                    <div class="receipt-action-buttons">
                        <button class="btn-whatsapp-green" onclick="window.invoiceSendWhatsappPDF('${invoice.invoiceNumber}')">
                            📲 إرسال PDF واتساب
                        </button>
                        <button class="btn-whatsapp-orange" onclick="window.invoiceSendWhatsappImage('${invoice.invoiceNumber}')">
                            🖼️ إرسال صورة واتساب
                        </button>
                        <button class="btn-download-blue" onclick="window.invoiceDownloadPDF()">
                            📥 تنزيل PDF
                        </button>
                        <button class="btn-download-blue" style="color: #f59e0b; border-color: rgba(245,158,11,0.4);" onclick="window.invoiceDownloadImage()">
                            🖼️ تنزيل صورة
                        </button>
                    </div>
                </div>

                <!-- Footer -->
                <div class="modal-footer" style="justify-content: space-between;">
                    <button class="btn-secondary" onclick="window.closeInvoiceModal()">إغلاق</button>
                    <button class="btn-primary" style="background: #00c897; border: none; color: #000; min-width: 130px;" onclick="window.confirmInvoice()">
                        ✓ يتم الحفظ
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Close without saving
window.closeInvoiceModal = () => {
    const backdrop = document.getElementById('current-modal-backdrop');
    if (backdrop) backdrop.remove();
    // Note: invoice was already committed in state.checkout() - no extra action needed
};

// Confirm = just close (invoice already saved in checkout)
window.confirmInvoice = () => {
    _pendingInvoice = null;
    window.closeInvoiceModal();
    window.renderCurrentView();
};

/* ─── Invoice Export Helpers ──────────────────────────────────── */
window.invoiceSendWhatsappPDF = (invNum) => {
    _ensureHtml2Canvas(() => {
        const el = document.getElementById('printable-invoice');
        if (!el) return;
        window.html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' }).then(canvas => {
            _ensureJsPDF(() => {
                const { jsPDF } = window.jspdf;
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
                const w = pdf.internal.pageSize.getWidth();
                const h = (canvas.height / canvas.width) * w;
                pdf.addImage(imgData, 'PNG', 0, 0, w, h);
                const file = new File([pdf.output('blob')], `فاتورة-${invNum}.pdf`, { type: 'application/pdf' });
                _sendFileToWhatsapp(file, `فاتورة رقم: ${invNum} - تم إرفاق الفاتورة`, invNum);
            });
        });
    });
};

window.invoiceSendWhatsappImage = (invNum) => {
    _ensureHtml2Canvas(() => {
        const el = document.getElementById('printable-invoice');
        if (!el) return;
        window.html2canvas(el, { scale: 2.5, useCORS: true, backgroundColor: '#ffffff' }).then(canvas => {
            canvas.toBlob(blob => {
                if (!blob) {
                    alert('تعذر إنشاء الصورة، حاول مرة أخرى.');
                    return;
                }
                const file = new File([blob], `فاتورة-${invNum}.png`, { type: 'image/png' });
                _sendFileToWhatsapp(file, `فاتورة رقم: ${invNum} - تم إرفاق الفاتورة`, invNum);
            }, 'image/png');
        });
    });
};

/* Send a file directly to WhatsApp:
   1) On phones / supported browsers we use the native share sheet (Web Share API)
      which sends the image/PDF straight into the WhatsApp chat.
   2) On desktop browsers (Windows Chrome/Edge...) the browser is not allowed to
      auto-attach files to wa.me links, so we download the file and open the
      WhatsApp chat so the user can attach it manually. */
function _sendFileToWhatsapp(file, message, invNum) {
    const shareData = { files: [file], title: file.name, text: message };
    if (navigator.canShare && navigator.canShare(shareData)) {
        navigator.share(shareData).catch(() => _whatsappDownloadFallback(file, message, invNum));
        return;
    }
    _whatsappDownloadFallback(file, message, invNum);
}

function _whatsappDownloadFallback(file, message, invNum) {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);

    const phone = prompt('أدخل رقم الواتساب (مثال: 201012345678):');
    if (!phone) return;
    const text = encodeURIComponent(`${message} (تم تحميل الملف على الجهاز - يرجى إرفاقه 📎)`);
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
    alert('تم تحميل الملف إلى مجلد التنزيلات، أرفقه الآن في محادثة واتساب.');
}

window.invoiceDownloadPDF = () => {
    _ensureHtml2Canvas(() => {
        const el = document.getElementById('printable-invoice');
        if (!el) return;
        window.html2canvas(el, { scale: 2.5, useCORS: true, backgroundColor: '#ffffff' }).then(canvas => {
            _ensureJsPDF(() => {
                const { jsPDF } = window.jspdf;
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
                const w = pdf.internal.pageSize.getWidth();
                const h = (canvas.height / canvas.width) * w;
                pdf.addImage(imgData, 'PNG', 0, 0, w, h);
                const invEl = document.querySelector('[id^="printable-invoice"]');
                const num = _pendingInvoice ? _pendingInvoice.invoiceNumber : 'invoice';
                pdf.save(`فاتورة-${num}.pdf`);
            });
        });
    });
};

window.invoiceDownloadImage = () => {
    _ensureHtml2Canvas(() => {
        const el = document.getElementById('printable-invoice');
        if (!el) return;
        window.html2canvas(el, { scale: 2.5, useCORS: true, backgroundColor: '#ffffff' }).then(canvas => {
            const link = document.createElement('a');
            const num = _pendingInvoice ? _pendingInvoice.invoiceNumber : 'invoice';
            link.download = `فاتورة-${num}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        });
    });
};

function _ensureHtml2Canvas(cb) {
    if (window.html2canvas) { cb(); return; }
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
    s.onload = cb;
    document.head.appendChild(s);
}

function _ensureJsPDF(cb) {
    if (window.jspdf) { cb(); return; }
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js';
    s.onload = cb;
    document.head.appendChild(s);
}

// Legacy aliases
window.sendWhatsappPDF = window.invoiceSendWhatsappPDF;
window.sendWhatsappImage = window.invoiceSendWhatsappImage;

/* Edit Customer Modal */
export function openEditCustomerModal(customerId) {
    const customer = state.customers.find(c => c.id === customerId);
    if (!customer) {
        alert('لم يتم العثور على بيانات هذا العميل!');
        return;
    }

    const body = `
        <form onsubmit="return false;">
            <div class="form-group">
                <label class="form-label">اسم التاجر / العميل *</label>
                <input type="text" id="m-edit-c-name" class="form-control" value="${customer.name || ''}" required>
            </div>
            <div class="form-group">
                <label class="form-label">اسم المحل / المخبز</label>
                <input type="text" id="m-edit-c-shop" class="form-control" value="${customer.shopName || ''}">
            </div>
            <div class="grid-2">
                <div class="form-group">
                    <label class="form-label">رقم الهاتف / الواتساب</label>
                    <input type="text" id="m-edit-c-phone" class="form-control" value="${customer.phone || ''}">
                </div>
                <div class="form-group">
                    <label class="form-label">المنطقة / العنوان</label>
                    <input type="text" id="m-edit-c-location" class="form-control" value="${customer.location || ''}">
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">رصيد المديونية المستحقة على العميل (ج.م)</label>
                <input type="number" id="m-edit-c-debt" class="form-control" value="${customer.debt || 0}">
                <small style="color:var(--text-muted);font-size:0.75rem;">يمكنك تعديل رصيد الدين المباشر للعميل عند التسوية أو تصحيح الحسابات.</small>
            </div>
        </form>
    `;

    openModalHTML(`✏️ تعديل بيانات ومستحقات العميل: ${customer.name}`, body, () => {
        const name = document.getElementById('m-edit-c-name')?.value.trim();
        const shopName = document.getElementById('m-edit-c-shop')?.value.trim();
        const phone = document.getElementById('m-edit-c-phone')?.value.trim();
        const location = document.getElementById('m-edit-c-location')?.value.trim();
        const debt = Number(document.getElementById('m-edit-c-debt')?.value || 0);

        if (!name) {
            alert('يرجى ملء اسم العميل!');
            return false;
        }

        state.updateCustomer(customer.id, { name, shopName, phone, location, debt });
        setTimeout(() => showCustomerStatement(customer.id), 150);
        return true;
    });
}
window.openEditCustomerModal = openEditCustomerModal;

/* ─── Customer Account Statement Modal (كشف حساب العميل) ─────────────────── */
export function showCustomerStatement(customerId) {
    const customer = state.customers.find(c => c.id === customerId);
    if (!customer) {
        alert('لم يتم العثور على بيانات هذا العميل!');
        return;
    }

    setupModals();
    const root = document.getElementById('modal-root');

    // Filter invoices related to this customer
    const customerInvoices = state.invoices.filter(inv => inv.customerId === customerId || inv.customerName === customer.name);

    root.innerHTML = `
        <div class="modal-backdrop active" id="current-modal-backdrop">
            <div class="modal-dialog" style="width: 720px; max-width: 96vw;">
                <!-- Header -->
                <div class="modal-header" style="background: #0f1524; border-bottom: 1px solid var(--border-color);">
                    <div>
                        <div style="font-weight: 900; color: #fff; font-size: 1.1rem; display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                            <span>📑</span> كشف حساب عميل: <span style="color: var(--primary-orange);">${customer.name}</span>
                            <button class="btn-primary" style="padding: 0.25rem 0.75rem; font-size: 0.8rem; background: var(--accent-teal); border: none;" onclick="window.openPaymentModal(${customer.id})">
                                💵 تسجيل سند قبض
                            </button>
                            <button class="btn-secondary" style="padding: 0.2rem 0.6rem; font-size: 0.78rem; border-color: var(--primary-orange); color: var(--primary-orange);" onclick="window.openEditCustomerModal(${customer.id})">
                                ✏️ تعديل العميل
                            </button>
                        </div>
                        <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 0.15rem;">
                            ${customer.shopName ? customer.shopName + ' • ' : ''} هاتف: ${customer.phone || 'غير مسجل'} • العنوان: ${customer.location || 'غير محدد'}
                        </div>
                    </div>
                    <button class="modal-close" onclick="window.closeCurrentModal()">✕</button>
                </div>

                <div class="modal-body" style="padding: 1.25rem; max-height: 75vh; overflow-y: auto;">
                    <!-- Printable Statement Section -->
                    <div id="printable-statement" style="background: #0d1424; padding: 1.25rem; border-radius: 14px; border: 1px solid var(--border-color);">
                        
                        <!-- Statement KPI Summary -->
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; margin-bottom: 1.25rem; text-align: center;">
                            <div style="background: #141b2d; padding: 0.75rem; border-radius: 10px; border: 1px solid var(--border-color);">
                                <div style="font-size: 0.75rem; color: var(--text-muted);">إجمالي المشتريات</div>
                                <div style="font-size: 1.1rem; font-weight: 900; color: #fff; margin-top: 0.2rem;">${(customer.totalPurchases || 0).toLocaleString('ar-EG')} ج.م</div>
                            </div>
                            <div style="background: #141b2d; padding: 0.75rem; border-radius: 10px; border: 1px solid var(--border-color);">
                                <div style="font-size: 0.75rem; color: var(--text-muted);">إجمالي المبلغ المدفوع</div>
                                <div style="font-size: 1.1rem; font-weight: 900; color: var(--accent-teal); margin-top: 0.2rem;">${(customer.paidAmount || 0).toLocaleString('ar-EG')} ج.م</div>
                            </div>
                            <div style="background: #141b2d; padding: 0.75rem; border-radius: 10px; border: 1px solid var(--border-color);">
                                <div style="font-size: 0.75rem; color: var(--text-muted);">الرصيد المتبقي (الدين)</div>
                                <div style="font-size: 1.1rem; font-weight: 900; color: var(--accent-red); margin-top: 0.2rem;">${(customer.debt || 0).toLocaleString('ar-EG')} ج.م</div>
                            </div>
                        </div>

                        <!-- Statement Transactions Table -->
                        <div style="font-weight: 800; font-size: 0.95rem; color: #fff; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.4rem;">
                            📜 سجل الفواتير والمعاملات المسجلة:
                        </div>

                        ${customerInvoices.length === 0 ? `
                            <div style="text-align: center; padding: 2rem; color: var(--text-muted); font-size: 0.9rem; background: #0f1524; border-radius: 10px;">
                                🛒 لا توجد فواتير مبيعات سابقة مسجلة لهذا العميل حتى الآن.
                            </div>
                        ` : `
                            <div class="table-responsive">
                                <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem; text-align: right;">
                                    <thead>
                                        <tr style="background: #141b2d; color: var(--text-muted); border-bottom: 1px solid var(--border-color);">
                                            <th style="padding: 0.6rem 0.75rem;">التاريخ</th>
                                            <th style="padding: 0.6rem 0.75rem;">رقم الفاتورة</th>
                                            <th style="padding: 0.6rem 0.75rem;">طريقة الدفع</th>
                                            <th style="padding: 0.6rem 0.75rem;">الأصناف</th>
                                            <th style="padding: 0.6rem 0.75rem; text-align: left;">الإجمالي</th>
                                            <th style="padding: 0.6rem 0.75rem; text-align: center;">عرض</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${customerInvoices.map(inv => `
                                            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05); color: #fff; cursor: pointer; transition: background 0.15s ease;" onclick="window.showInvoiceByNumber('${inv.invoiceNumber}')" onmouseover="this.style.background='rgba(255,159,26,0.06)'" onmouseout="this.style.background=''">
                                                <td style="padding: 0.6rem 0.75rem; font-size: 0.78rem; color: var(--text-muted);">${inv.createdAt}</td>
                                                <td style="padding: 0.6rem 0.75rem; font-weight: 700; color: var(--primary-orange);">${inv.invoiceNumber}</td>
                                                <td style="padding: 0.6rem 0.75rem;">
                                                    <span class="badge ${inv.paymentMethod === 'cash' ? 'badge-teal' : 'badge-orange'}">
                                                        ${inv.paymentMethod === 'cash' ? 'كاش' : 'آجل/جزئي'}
                                                    </span>
                                                </td>
                                                <td style="padding: 0.6rem 0.75rem; font-size: 0.78rem; color: #cbd5e1;">
                                                    ${(inv.items || []).map(i => `${i.name} (${i.qty} قروصة)`).join(' ، ')}
                                                </td>
                                                <td style="padding: 0.6rem 0.75rem; font-weight: 800; text-align: left; color: #fff;">
                                                    ${(inv.grandTotal || 0).toLocaleString('ar-EG')} ج
                                                </td>
                                                <td style="padding: 0.6rem 0.75rem; text-align: center; font-size: 1rem;" title="اضغط لعرض الفاتورة">👁️</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        `}
                    </div>
                </div>

                <!-- Footer Actions -->
                <div class="modal-footer" style="background: #0f1524; border-top: 1px solid var(--border-color); display: flex; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;">
                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                        <button class="btn-primary" style="background: var(--accent-teal); border: none;" onclick="window.openPaymentModal(${customer.id})">
                            💵 تسجيل سند قبض جديد
                        </button>
                        <button class="btn-primary" style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); border: none;" onclick="window.openEditCustomerModal(${customer.id})">
                            ✏️ تعديل البيانات والديون
                        </button>
                        <button class="btn-secondary" onclick="window.printCustomerStatement('${customer.name}', '${customer.debt}')">
                            🖨️ طباعة كشف الحساب
                        </button>
                        <button class="btn-secondary" style="color: #25d366; border-color: rgba(37, 211, 102, 0.3);" onclick="window.sendCustomerStatementWhatsapp('${customer.phone}', '${customer.name}', '${customer.debt}')">
                            💬 مشاركة عبر واتساب
                        </button>
                    </div>
                    <button class="btn-primary" onclick="window.closeCurrentModal()">إغلاق النافذة</button>
                </div>
            </div>
        </div>
    `;
}

window.showCustomerStatement = showCustomerStatement;

window.printCustomerStatement = (customerName, debt) => {
    window.print();
};

window.sendCustomerStatementWhatsapp = (phone, customerName, debt) => {
    let cleanPhone = (phone || '').replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = '20' + cleanPhone.substring(1);
    const text = encodeURIComponent(`مرحباً أ/ ${customerName}، تفاصيل كشف حسابك الحالي: متبقي مستحق علي سيادتكم مبلغ (${debt} ج.م). شكرًا لتعاملكم معنا.`);
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
};

