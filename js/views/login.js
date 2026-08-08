import { state } from '../state.js';

export function renderLoginView() {
    return `
        <div class="login-page-container">
            <div class="login-wrapper">
                <!-- Top Brand Header -->
                <div class="login-brand">
                    <div class="login-logo-icon">
                        🚬
                    </div>
                    <h1 class="login-brand-title">حسام ERP</h1>
                    <p class="login-brand-sub">نظام تتبع المبيعات والمخزون وحسابات التجار والصلاحيات</p>
                </div>

                <!-- Login Card -->
                <div class="login-card">
                    <div class="login-card-header">
                        <div class="login-card-title">
                            <span>🔒</span> تسجيل الدخول للنظام
                        </div>
                        <p class="login-card-sub">أدخل اسم المستخدم وكلمة السر المعتمدة</p>
                    </div>

                    <form id="login-form" onsubmit="window.handleLoginSubmit(event)">
                        <div class="form-group">
                            <label class="form-label">اسم المستخدم (Username) *</label>
                            <div class="input-with-icon">
                                <span class="input-icon">👤</span>
                                <input type="text" id="login-username" class="form-control login-input" placeholder="أدخل اسم المستخدم" required>
                            </div>
                        </div>

                        <div class="form-group" style="margin-bottom: 1.5rem;">
                            <label class="form-label">كلمة السر (Password) *</label>
                            <div class="input-with-icon">
                                <span class="input-icon">🔑</span>
                                <input type="password" id="login-password" class="form-control login-input" placeholder="أدخل كلمة السر" required>
                            </div>
                        </div>

                        <div id="login-error-msg" class="login-error-alert" style="display: none;"></div>

                        <button type="submit" class="btn-login-submit">
                            دخول النظام ➔
                        </button>
                    </form>
                </div>
            </div>
        </div>
    `;
}

window.handleLoginSubmit = (e) => {
    e.preventDefault();
    const username = document.getElementById('login-username')?.value.trim();
    const password = document.getElementById('login-password')?.value.trim();
    const errorEl  = document.getElementById('login-error-msg');

    if (!username || !password) {
        if (errorEl) {
            errorEl.textContent = 'يرجى إدخال اسم المستخدم وكلمة السر!';
            errorEl.style.display = 'block';
        }
        return;
    }

    const result = state.login(username, password);
    if (result.success) {
        if (errorEl) errorEl.style.display = 'none';
        window.renderAppLayout();
    } else {
        if (errorEl) {
            errorEl.textContent = result.message || 'بيانات الدخول غير صحيحة!';
            errorEl.style.display = 'block';
        }
    }
};
