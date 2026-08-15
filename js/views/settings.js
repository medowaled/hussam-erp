import { state } from '../state.js';

export function renderSettingsView() {
    const users = state.users;
    const isCurrentUserAdmin = state.currentUser && (state.currentUser.role === 'مدير عام' || (state.currentUser.permissions && state.currentUser.permissions.includes('all')));

    return `
        <!-- Banner Header -->
        <div class="view-banner flex-between" style="flex-wrap: wrap; gap: 0.75rem;">
            <div>
                <div style="font-size: 0.85rem; color: var(--primary-orange); font-weight: 700; margin-bottom: 0.25rem;">
                    ⚙️ إعدادات النظام وإدارة الحسابات
                </div>
                <h1 style="font-size: 1.75rem; font-weight: 900; color: #fff;">إعدادات النظام وإدارة الصلاحيات والعهُد 🛡️</h1>
                <p style="color: var(--text-muted); font-size: 0.9rem; margin-top: 0.25rem;">
                    إدارة حسابات وتصريحات الدخول، تخصيص كميات العُهد للمناديب والموظفين، وتعيين العملاء والتجار المسموح بها لكل بائع.
                </p>
            </div>
            ${isCurrentUserAdmin ? `
                <div style="display: flex; gap: 0.75rem;">
                    <button class="btn-primary" style="box-shadow: 0 4px 16px rgba(255, 159, 26, 0.4);" onclick="window.openAddUserModal()">
                        ➕ إنشاء حساب مستخدم جديد
                    </button>
                </div>
            ` : ''}
        </div>

        <!-- System Users Table -->
        <div class="card-dark">
            <div class="flex-between" style="margin-bottom: 1rem;">
                <div style="font-size: 1.1rem; font-weight: 800; color: #fff; display: flex; align-items: center; gap: 0.5rem;">
                    🛡️ إدارة حسابات مستخدمي النظام والعهُد والصلاحيات المتعددة
                </div>
                <span class="badge badge-orange" style="font-size: 0.85rem; padding: 0.3rem 0.8rem;">عدد المستخدمين: ${users.length}</span>
            </div>

            <div class="table-responsive">
                <table class="erp-table">
                    <thead>
                        <tr>
                            <th>اسم المستخدم بالكامل</th>
                            <th>اسم الدخول (Username)</th>
                            <th>كلمة السر (Password)</th>
                            <th>العملاء المسموح بها</th>
                            <th>الصلاحيات والعهدة المخصصة</th>
                            <th>الحالة</th>
                            <th>إجراءات والتعديل</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${users.map(u => {
                            const isSuper = u.role === 'مدير عام' || (u.permissions && u.permissions.includes('all'));
                            const isBlocked = u.status === 'disabled';

                            const assignedCustCount = Array.isArray(u.assignedCustomers) ? u.assignedCustomers.length : 'كافة العملاء';
                            const quotasCount = u.productQuotas && u.productQuotas !== 'all' ? Object.keys(u.productQuotas).length : 'مفتوحة (مخزن كلي)';

                            return `
                                <tr style="${isBlocked ? 'opacity: 0.6; background: rgba(239, 68, 68, 0.05);' : ''}">
                                    <td style="font-weight: 800; color: #fff;">
                                        <div style="display: flex; align-items: center; gap: 0.65rem;">
                                            <div style="width: 34px; height: 34px; background: var(--primary-orange); color: #000; font-weight: 900; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 1rem;">
                                                ${u.name ? u.name.charAt(0) : 'م'}
                                            </div>
                                            <div>
                                                <div style="font-weight: 800; color: #fff;">${u.name}</div>
                                                <div style="font-size: 0.72rem; color: var(--primary-orange); font-weight: 700;">${u.role || 'موظف'}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style="font-weight: 700; color: var(--primary-orange); font-family: monospace;">${u.username}</td>
                                    <td style="font-family: monospace; letter-spacing: 2px;">${u.password || '••••••'}</td>
                                    <td>
                                        <span class="badge ${u.assignedCustomers === 'all' ? 'badge-teal' : 'badge-purple'}">
                                            ${assignedCustCount === 'كافة العملاء' ? '👥 كافة العملاء' : `👤 ${assignedCustCount} تجار محددين`}
                                        </span>
                                    </td>
                                    <td>
                                        <div style="display: flex; gap: 0.35rem; flex-wrap: wrap;">
                                            ${isSuper ? `
                                                <span class="badge badge-orange">كافة الصلاحيات (المدير)</span>
                                            ` : `
                                                <span class="badge badge-blue">عهدة: ${quotasCount} أصناف</span>
                                                ${u.permissions.includes('pos') ? `<span class="badge badge-teal">POS</span>` : ''}
                                                ${u.permissions.includes('inventory') ? `<span class="badge badge-blue">مخزون</span>` : ''}
                                                ${u.permissions.includes('customers') ? `<span class="badge badge-red">ديون</span>` : ''}
                                            `}
                                        </div>
                                    </td>
                                    <td>
                                        ${isBlocked ? `
                                            <span class="badge badge-red" style="font-weight: 800;">⛔ موقوف</span>
                                        ` : `
                                            <span class="badge badge-teal" style="font-weight: 800;">✅ نشط / مفعل</span>
                                        `}
                                    </td>
                                    <td>
                                        <div class="table-actions" style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
                                            ${!isSuper ? `
                                                <button class="btn-secondary" style="font-size: 0.72rem; padding: 0.25rem 0.5rem; color: var(--primary-orange);" title="تحديد عهدة الأصناف والعملاء المسموح بها" onclick="window.openAssignQuotaModal(${u.id})">
                                                    📦 العهدة والعملاء
                                                </button>
                                            ` : ''}
                                            <button class="action-btn" title="تعديل الحساب والصلاحيات" onclick="window.openEditUserModal(${u.id})">✏️</button>
                                            ${u.id !== 1 ? `
                                                <button class="action-btn" style="color: ${isBlocked ? 'var(--accent-teal)' : 'var(--primary-orange)'};" title="${isBlocked ? 'تفعيل الحساب' : 'إيقاف الحساب'}" onclick="window.toggleUserStatusHandler(${u.id})">
                                                    ${isBlocked ? '✅' : '🛑'}
                                                </button>
                                                <button class="action-btn" style="color: var(--accent-red);" title="حذف الحساب" onclick="window.deleteUserHandler(${u.id})">🗑️</button>
                                            ` : ''}
                                        </div>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

window.toggleUserStatus = window.toggleUserStatusHandler = (id) => {
    state.toggleUserStatus(id);
    window.renderCurrentView();
};

window.deleteUser = window.deleteUserHandler = (id) => {
    if (confirm('هل أنت متأكد من رغبتك في حذف هذا حساب الموظف نهائياً؟')) {
        const deleted = state.deleteUser(id);
        if (deleted) {
            window.renderCurrentView();
        }
    }
};
