import { state } from '../state.js';

export function renderNotificationsView() {
    const notifications = state.notifications;

    return `
        <!-- Banner Header -->
        <div class="view-banner flex-between" style="flex-wrap:wrap;gap:0.75rem;">
            <div>
                <div style="font-size: 0.85rem; color: var(--primary-orange); font-weight: 700; margin-bottom: 0.25rem;">
                    🔔 مركز التنبيهات والإشعارات
                </div>
                <h1 style="font-size: 1.75rem; font-weight: 900; color: #fff;">التنبيهات المباشرة وإشارات النظام 📢</h1>
                <p style="color: var(--text-muted); font-size: 0.9rem; margin-top: 0.25rem;">
                    إشعارات فورية بنقص أصناف السجائر، عمليات بيع الموظفين، والأنشطة الإدارية.
                </p>
            </div>
            <div style="display: flex; gap: 0.75rem;">
                <button class="btn-danger" onclick="window.clearAllNotifications()">
                    🗑️ مسح جميع الإشعارات
                </button>
                <button class="btn-primary" onclick="window.printAllNotifications()">
                    🖨️ طباعة سجل الإشعارات
                </button>
            </div>
        </div>

        <!-- Notifications Container -->
        <div class="card-dark">
            ${notifications.length === 0 ? `
                <div class="empty-table-state" style="padding: 4rem 1rem;">
                    <i style="font-size: 3rem; color: var(--accent-teal);">🔔</i>
                    <p style="font-size: 1.1rem; font-weight: 800; color: #fff;">لا توجد تنبيهات أو إشعارات حالياً</p>
                    <p style="font-size: 0.85rem; margin-top: 0.25rem;">النظام مستقر تماماً ولا توجد إشعارات معلقة.</p>
                </div>
            ` : `
                <div style="display: flex; flex-direction: column; gap: 1rem;">
                    ${notifications.map((n, idx) => {
                        const notifId = String(n.id).replace(/'/g, "\\'");
                        return `
                        <div class="card-dark flex-between" style="background: #0f1524; border-color: ${n.type === 'warning' ? 'rgba(239, 68, 68, 0.3)' : 'var(--border-color)'}; flex-wrap:wrap; gap:1rem;">
                            <div style="display: flex; align-items: flex-start; gap: 1rem; flex:1;">
                                <div style="background: ${n.type === 'warning' ? 'var(--accent-red-light)' : n.type === 'sale' ? 'rgba(255, 159, 26, 0.15)' : 'rgba(59, 130, 246, 0.15)'}; width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem;">
                                    ${n.type === 'warning' ? '⚠️' : n.type === 'sale' ? '🛒' : 'ℹ️'}
                                </div>
                                <div>
                                    <div style="font-size: 1.05rem; font-weight: 800; color: #fff;">${n.title || 'إشعار نظام'}</div>
                                    <div style="font-size: 0.9rem; color: var(--text-muted); margin-top: 0.2rem;">${n.message || ''}</div>
                                    <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.4rem;">🕒 ${n.createdAt || ''}</div>
                                </div>
                            </div>
                            <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
                                <button class="action-btn" title="طباعة هذا الإشعار فقط" style="background:#1a233a;color:var(--primary-orange);border:1px solid rgba(255,159,26,0.3);padding:0.45rem 0.75rem;border-radius:8px;font-size:0.82rem;" onclick="window.printSingleNotification('${notifId}')">
                                    🖨️ طباعة هذا الإشعار
                                </button>
                                <button class="action-btn" title="حذف هذا الإشعار" style="background:rgba(239,68,68,0.1);color:var(--accent-red);border:1px solid rgba(239,68,68,0.3);padding:0.45rem 0.75rem;border-radius:8px;font-size:0.82rem;" onclick="window.deleteSingleNotification('${notifId}')">
                                    🗑️ حذف
                                </button>
                            </div>
                        </div>
                    `;}).join('')}
                </div>
            `}
        </div>
    `;
}

window.clearAllNotifications = () => {
    if (confirm('هل أنت تأكد من مسح كافة التنبيهات؟')) {
        state.clearAllNotifications();
        window.renderCurrentView();
    }
};

window.deleteSingleNotification = (id) => {
    state.deleteNotification(id);
    window.renderCurrentView();
};

window.printSingleNotification = (id) => {
    const n = state.notifications.find(item => String(item.id) === String(id));
    if (!n) return;

    const printWin = window.open('', '_blank', 'width=750,height=550');
    if (printWin) {
        printWin.document.write(`
            <html dir="rtl" lang="ar">
            <head>
                <title>طباعة إشعار - ${n.title}</title>
                <style>
                    body { font-family: system-ui, sans-serif; padding: 2.5rem; background: #fff; color: #111; direction: rtl; }
                    .header-box { border-bottom: 3px solid #ff9f1a; padding-bottom: 1rem; margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center; }
                    .title { font-size: 1.4rem; font-weight: 900; color: #111; }
                    .alert-card { border: 2px solid #ff9f1a; background: #fffdf9; padding: 1.5rem; border-radius: 12px; margin-top: 1rem; }
                    .alert-title { font-size: 1.2rem; font-weight: 800; color: #d97706; margin-bottom: 0.5rem; }
                    .alert-body { font-size: 1.05rem; line-height: 1.7; color: #333; }
                    .alert-meta { font-size: 0.85rem; color: #666; margin-top: 1rem; border-top: 1px dashed #ccc; pt: 0.5rem; }
                    .footer-stamp { margin-top: 3rem; text-align: left; font-size: 0.9rem; font-weight: 800; color: #444; }
                </style>
            </head>
            <body>
                <div class="header-box">
                    <div>
                        <div class="title">🚬 حسام ERP v2.5 - إشعار نظام مالي ونشاط</div>
                        <div style="font-size:0.85rem;color:#666;margin-top:0.25rem;">نظام تتبع المبيعات والمخزون وحسابات السجائر والدخان</div>
                    </div>
                    <div style="text-align:left;font-size:0.8rem;color:#555;">
                        تاريخ الطباعة:<br><strong>${new Date().toLocaleString('ar-EG')}</strong>
                    </div>
                </div>

                <div class="alert-card">
                    <div class="alert-title">${n.type === 'warning' ? '⚠️' : '🛒'} ${n.title}</div>
                    <div class="alert-body">${n.message}</div>
                    <div class="alert-meta">🕒 تاريخ ووقت صدور الإشعار بالنظام: ${n.createdAt}</div>
                </div>

                <div class="footer-stamp">
                    توقيع مدير النظام / الاعتماد الرسمي<br>
                    ___________________________
                </div>

                <script>window.print(); setTimeout(() => window.close(), 750);</script>
            </body>
            </html>
        `);
        printWin.document.close();
    }
};

window.printAllNotifications = () => {
    const list = state.notifications;
    if (list.length === 0) {
        alert('لا توجد إشعارات حالية لطباعتها!');
        return;
    }

    const printWin = window.open('', '_blank', 'width=850,height=700');
    if (printWin) {
        printWin.document.write(`
            <html dir="rtl" lang="ar">
            <head>
                <title>طباعة سجل التنبيهات المباشرة - حسام ERP</title>
                <style>
                    body { font-family: system-ui, sans-serif; padding: 2rem; background: #fff; color: #111; direction: rtl; }
                    .brand-header { border-bottom: 3px solid #ff9f1a; padding-bottom: 1rem; margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center; }
                    .brand-title { font-size: 1.5rem; font-weight: 900; color: #0f172a; }
                    .report-table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
                    .report-table th, .report-table td { border: 1px solid #cbd5e1; padding: 0.75rem; text-align: right; font-size: 0.9rem; }
                    .report-table th { background: #f8fafc; font-weight: 800; color: #1e293b; }
                    .badge-warn { background: #fef2f2; color: #dc2626; padding: 3px 8px; border-radius: 4px; font-weight: 800; font-size: 0.8rem; }
                    .badge-sale { background: #fffbe6; color: #d97706; padding: 3px 8px; border-radius: 4px; font-weight: 800; font-size: 0.8rem; }
                    .summary-box { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 0.85rem; border-radius: 8px; margin-bottom: 1rem; display: flex; gap: 2rem; font-size: 0.9rem; font-weight: 800; }
                </style>
            </head>
            <body>
                <div class="brand-header">
                    <div>
                        <div class="brand-title">🚬 حسام ERP v2.5 - السجل الرسمي للتنبيهات المباشرة</div>
                        <div style="font-size:0.85rem;color:#64748b;margin-top:0.25rem;">تقرير شامل وموثق بجميع تنبيهات المخزون وإشعارات مبيعات الموظفين</div>
                    </div>
                    <div style="text-align:left;font-size:0.8rem;color:#64748b;">
                        تاريخ التصدير والطباعة:<br><strong>${new Date().toLocaleString('ar-EG')}</strong>
                    </div>
                </div>

                <div class="summary-box">
                    <div>إجمالي التنبيهات المسجلة: <span style="color:#2563eb;">${list.length}</span></div>
                    <div>تنبيهات حثيثة/نقص مخزون: <span style="color:#dc2626;">${list.filter(n => n.type === 'warning').length}</span></div>
                    <div>عمليات بيع موظفين: <span style="color:#d97706;">${list.filter(n => n.type === 'sale').length}</span></div>
                </div>

                <table class="report-table">
                    <thead>
                        <tr>
                            <th style="width:40px;">#</th>
                            <th style="width:120px;">نوع الإشعار</th>
                            <th>عنوان التنبيه</th>
                            <th>تفاصيل ومحتوى الإشعار</th>
                            <th style="width:160px;">تاريخ الصدور</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${list.map((n, i) => `
                            <tr>
                                <td>${i + 1}</td>
                                <td>
                                    ${n.type === 'warning' ? '<span class="badge-warn">⚠️ حد الطلب</span>' : '<span class="badge-sale">🛒 مبيعات</span>'}
                                </td>
                                <td style="font-weight:800;">${n.title || ''}</td>
                                <td>${n.message || ''}</td>
                                <td style="font-size:0.8rem;color:#475569;">${n.createdAt || ''}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div style="margin-top:2.5rem;display:flex;justify-content:space-between;font-size:0.88rem;font-weight:800;color:#334155;">
                    <div>إعداد وتصدير: مدير عام النظام (حسام حسني)</div>
                    <div>اعتماد الإدارة والختم الرسمى: _____________________</div>
                </div>

                <script>window.print(); setTimeout(() => window.close(), 750);</script>
            </body>
            </html>
        `);
        printWin.document.close();
    }
};

