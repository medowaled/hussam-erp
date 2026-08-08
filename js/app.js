import { state } from './state.js';
import * as Modals from './modals.js';
import { renderLoginView } from './views/login.js';
import { renderDashboardView, initDashboardCharts } from './views/dashboard.js';
import { renderPosView } from './views/pos.js';
import { renderInventoryView } from './views/inventory.js';
import { renderCustomersView } from './views/customers.js';
import { renderReportsView } from './views/reports.js';
import { renderNotificationsView } from './views/notifications.js';
import { renderSettingsView } from './views/settings.js';

let currentViewName = 'dashboard';

const viewsMap = {
    'login': renderLoginView,
    'dashboard': renderDashboardView,
    'pos': renderPosView,
    'inventory': renderInventoryView,
    'customers': renderCustomersView,
    'reports': renderReportsView,
    'notifications': renderNotificationsView,
    'settings': renderSettingsView
};

/* Permission Check Helper */
function hasPermission(viewName) {
    if (!state.currentUser) return false;
    const perms = state.currentUser.permissions || [];
    if (perms.includes('all')) return true;
    if (viewName === 'dashboard' || viewName === 'notifications') return true;
    return perms.includes(viewName);
}

/* Session Guard: if no authenticated user, force-render the login view */
function requireAuth() {
    if (!state.isAuthenticated()) {
        window.renderAppLayout();
        return false;
    }
    return true;
}

window.appRouter = (viewName) => {
    if (!requireAuth()) return;

    if (!viewsMap[viewName]) return;

    if (!hasPermission(viewName)) {
        alert(`عفواً، لا يملك الحساب الحالي (${state.currentUser.name}) صلاحيات لدخول صفحة (${getArabicViewName(viewName)})!`);
        return;
    }

    currentViewName = viewName;
    state.activeView = viewName;
    try {
        localStorage.setItem('hussam_erp_active_view', viewName);
    } catch(e) {}

    // Update active nav item styling
    document.querySelectorAll('.nav-item').forEach(item => {
        if (item.dataset.view === viewName) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    // Close mobile drawer if open
    closeMobileSidebar();

    window.renderCurrentView();
    updateMobileBottomNav();
};

function closeMobileSidebar() {
    const sidebar = document.getElementById('app-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.remove('mobile-open');
    if (overlay) overlay.classList.remove('visible');
    document.body.classList.remove('sidebar-open');
}

function openMobileSidebar() {
    const sidebar = document.getElementById('app-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.add('mobile-open');
    if (overlay) overlay.classList.add('visible');
    document.body.classList.add('sidebar-open');
}

function toggleMobileSidebar() {
    const sidebar = document.getElementById('app-sidebar');
    if (sidebar && sidebar.classList.contains('mobile-open')) {
        closeMobileSidebar();
    } else {
        openMobileSidebar();
    }
}

function updateMobileBottomNav() {
    const bottomNav = document.getElementById('mobile-bottom-nav');
    if (!bottomNav || !state.currentUser) return;

    bottomNav.querySelectorAll('.mobile-nav-item[data-view]').forEach(btn => {
        const view = btn.dataset.view;
        btn.classList.toggle('active', view === currentViewName);

        const allowed = hasPermission(view);
        btn.style.display = allowed ? 'flex' : 'none';
    });
}

function filterMobileBottomNav() {
    if (!state.currentUser) return;
    const user = state.currentUser;
    const isAll = user.role === 'مدير عام' || (user.permissions && user.permissions.includes('all'));
    const perms = user.permissions || [];

    document.querySelectorAll('.mobile-nav-item[data-view]').forEach(btn => {
        const view = btn.dataset.view;
        if (isAll || perms.includes(view) || view === 'dashboard' || view === 'notifications') {
            btn.style.display = 'flex';
        } else {
            btn.style.display = 'none';
        }
    });
}

function getArabicViewName(viewName) {
    const names = {
        'dashboard': 'لوحة التحكم',
        'pos': 'نقطة البيع (POS)',
        'inventory': 'إدارة المخزون',
        'customers': 'حسابات والديون',
        'reports': 'التقارير المالية والفواتير',
        'notifications': 'التنبيهات',
        'settings': 'إعدادات النظام والإداريين'
    };
    return names[viewName] || viewName;
}

window.navigateToInvoices = () => {
    if (window.setReportTab) window.setReportTab('invoices');
    window.appRouter('reports');
};

window.renderCurrentView = () => {
    const container = document.getElementById('view-container');
    if (!container) return;

    if (!requireAuth()) return;

    if (viewsMap[currentViewName]) {
        try {
            container.innerHTML = viewsMap[currentViewName]();
            // Initialize charts after DOM is injected
            if (currentViewName === 'dashboard') {
                requestAnimationFrame(() => initDashboardCharts());
            }
        } catch (err) {
            console.error(`❌ Error rendering view "${currentViewName}":`, err);
            container.innerHTML = `
                <div style="padding:3rem;text-align:center;color:#ef4444;">
                    <h2>⚠️ خطأ في تحميل الصفحة</h2>
                    <p style="color:var(--text-muted);margin-top:1rem;direction:ltr;text-align:left;background:#0f1524;padding:1rem;border-radius:10px;font-family:monospace;font-size:0.85rem;overflow-x:auto;">${err.message}<br>${err.stack || ''}</p>
                </div>
            `;
        }
    }
    updateHeaderAndSidebarStats();
};

window.renderAppLayout = () => {
    const header = document.querySelector('.header');
    const sidebar = document.getElementById('app-sidebar');
    const mainContent = document.querySelector('.main-content');
    const appContainer = document.querySelector('.app-container');
    const bottomNav = document.getElementById('mobile-bottom-nav');
    const overlay = document.getElementById('sidebar-overlay');

    if (!state.currentUser) {
        // User logged out -> Render login page
        if (header) header.style.display = 'none';
        if (sidebar) sidebar.style.display = 'none';
        if (bottomNav) bottomNav.style.display = 'none';
        if (overlay) overlay.classList.remove('visible');
        closeMobileSidebar();
        if (mainContent) {
            mainContent.style.marginRight = '0';
            mainContent.style.padding = '0';
            mainContent.style.width = '100vw';
        }
        if (appContainer) appContainer.style.display = 'block';

        const container = document.getElementById('view-container');
        if (container) container.innerHTML = renderLoginView();
    } else {
        // User logged in -> Restore full ERP Layout
        if (header) header.style.display = 'flex';
        if (sidebar) sidebar.style.display = 'flex';
        if (bottomNav) bottomNav.style.display = '';
        if (mainContent) {
            mainContent.style.marginRight = '';
            mainContent.style.padding = '';
            mainContent.style.width = '';
        }
        if (appContainer) appContainer.style.display = '';

        // Filter sidebar menu items based on user permissions
        filterSidebarPermissions();
        filterMobileBottomNav();

        // Restore saved view on refresh (if user is admin or allowed)
        const isEmployee = state.currentUser.role !== 'مدير عام' && (!state.currentUser.permissions || !state.currentUser.permissions.includes('all'));
        if (isEmployee) {
            currentViewName = 'pos';
        } else {
            const savedView = localStorage.getItem('hussam_erp_active_view');
            if (savedView && viewsMap[savedView] && hasPermission(savedView)) {
                currentViewName = savedView;
            } else if (!hasPermission(currentViewName)) {
                currentViewName = 'dashboard';
            }
        }

        window.renderCurrentView();
        updateMobileBottomNav();
    }
};

function filterSidebarPermissions() {
    if (!state.currentUser) return;
    const user = state.currentUser;
    const isAll = user.role === 'مدير عام' || (user.permissions && user.permissions.includes('all'));
    const perms = user.permissions || [];

    // Hide sidebar stock widget for employees (only visible to Admin)
    const stockWidget = document.querySelector('.sidebar-stock-widget');
    if (stockWidget) {
        stockWidget.style.display = isAll ? 'block' : 'none';
    }

    // Hide header notification bell & search box for employees
    const notifBtn = document.querySelector('.notification-btn');
    const searchBox = document.querySelector('.search-box');
    if (notifBtn) notifBtn.style.display = isAll ? 'flex' : 'none';
    if (searchBox) searchBox.style.display = isAll ? 'flex' : 'none';

    document.querySelectorAll('.nav-item').forEach(item => {
        const v = item.dataset.view;
        if (isAll) {
            item.style.display = 'flex';
        } else if (perms.includes(v)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

function updateHeaderAndSidebarStats() {
    if (!state.currentUser) return;

    const user = state.currentUser;
    const isAll = user.role === 'مدير عام' || (user.permissions && user.permissions.includes('all'));

    // Unread Notifications Badge (Admin only)
    const unreadCount = state.notifications.length;
    const badgeEl = document.getElementById('header-unread-count');
    if (badgeEl) {
        badgeEl.innerText = unreadCount;
        badgeEl.style.display = isAll && unreadCount > 0 ? 'flex' : 'none';
    }

    // Low Stock Alert Badge on Sidebar Menu (Image 3 requirement: only show if low stock exists)
    const lowStockCount = state.products.filter(p => p.stockPacks <= p.minStockPacks).length;
    const alertPill = document.getElementById('sidebar-stock-alert-pill');
    if (alertPill) {
        alertPill.style.display = (isAll && lowStockCount > 0) ? 'inline-block' : 'none';
    }

    // Sidebar Stock Stats
    const totalItems = state.products.length;
    const totalPacks = state.products.reduce((sum, p) => sum + p.stockPacks, 0);

    const sidebarItemsEl = document.getElementById('sidebar-total-items');
    const sidebarPacksEl = document.getElementById('sidebar-total-packs');
    if (sidebarItemsEl) sidebarItemsEl.innerText = totalItems;
    if (sidebarPacksEl) sidebarPacksEl.innerText = `${totalPacks} قروصة`;

    // Header Profile Card Info
    const nameEls = document.querySelectorAll('.profile-name');
    const roleEls = document.querySelectorAll('.profile-role');
    const avatarEls = document.querySelectorAll('.profile-avatar');

    nameEls.forEach(el => el.textContent = user.name || 'مستخدم');
    roleEls.forEach(el => el.textContent = user.role ? `🛡️ ${user.role}` : '🛡️ موظف');
    avatarEls.forEach(el => el.textContent = user.name ? user.name.charAt(0) : 'م');
}

// Global Application Initialization
document.addEventListener('DOMContentLoaded', () => {
    Modals.setupModals();

    // Mobile Sidebar Drawer Toggle
    const mobileBtn = document.getElementById('mobile-toggle-btn');
    const sidebarCloseBtn = document.getElementById('sidebar-close-btn');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const mobileNavMore = document.getElementById('mobile-nav-more');

    if (mobileBtn) {
        mobileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleMobileSidebar();
        });
    }

    if (sidebarCloseBtn) {
        sidebarCloseBtn.addEventListener('click', closeMobileSidebar);
    }

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', closeMobileSidebar);
    }

    if (mobileNavMore) {
        mobileNavMore.addEventListener('click', openMobileSidebar);
    }

    document.querySelectorAll('.mobile-nav-item[data-view]').forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.dataset.view;
            if (view) window.appRouter(view);
        });
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeMobileSidebar();
    });

    state.subscribe(() => {
        updateHeaderAndSidebarStats();
    });

    // Sidebar Navigation Click Listeners
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const view = item.dataset.view;
            if (view) {
                window.appRouter(view);
            }
        });
    });

    // Global Search Input
    const globalSearch = document.getElementById('global-search-input');
    if (globalSearch) {
        globalSearch.addEventListener('input', (e) => {
            const query = e.target.value.trim().toLowerCase();
            if (query.length > 0 && currentViewName !== 'pos' && currentViewName !== 'inventory') {
                window.appRouter('inventory');
            }
            if (window.filterInventoryTable) {
                window.filterInventoryTable(query);
            }
        });
    }

    // Close profile & notification dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        const wrapper = document.getElementById('profile-wrapper');
        const dropdown = document.getElementById('profile-dropdown');
        if (dropdown && wrapper && !wrapper.contains(e.target)) {
            dropdown.classList.remove('open');
        }

        const notifWrapper = document.getElementById('notification-wrapper');
        const notifDropdown = document.getElementById('notification-dropdown');
        if (notifDropdown && notifWrapper && !notifWrapper.contains(e.target)) {
            notifDropdown.classList.remove('open');
        }
    });

    // Re-verify the session on every page show — this also catches the
    // Back/Forward cache (bfcache) restore, so after logout the Back
    // button can never bring the protected dashboard back into view.
    window.addEventListener('pageshow', () => {
        if (!state.isAuthenticated()) {
            window.renderAppLayout();
        }
    });

    // Initial Layout Render
    window.renderAppLayout();

    // Sync with Firestore (cloud data wins; falls back to local data offline)
    state.initFirebaseSync();
});

/* Profile Menu Toggle */
window.toggleProfileMenu = () => {
    const dropdown = document.getElementById('profile-dropdown');
    if (dropdown) dropdown.classList.toggle('open');
};

/* Notification Dropdown Overlay Toggle */
window.toggleNotificationsDropdown = () => {
    const dropdown = document.getElementById('notification-dropdown');
    if (!dropdown) return;

    const isOpen = dropdown.classList.contains('open');
    if (isOpen) {
        dropdown.classList.remove('open');
        return;
    }

    const listEl = document.getElementById('notification-dropdown-list');
    const notifications = state.notifications;

    if (listEl) {
        if (notifications.length === 0) {
            listEl.innerHTML = `
                <div style="text-align: center; padding: 2rem 1rem; color: var(--text-muted); font-size: 0.85rem;">
                    <div style="font-size: 1.5rem; margin-bottom: 0.25rem;">🔔</div>
                    لا توجد تنبيهات جديدة حالياً
                </div>
            `;
        } else {
            listEl.innerHTML = notifications.slice(0, 5).map(n => {
                const notifId = String(n.id).replace(/'/g, "\\'");
                return `
                <div class="notification-item-row flex-between">
                    <div style="display:flex;gap:0.6rem;align-items:flex-start;">
                        <span style="font-size:1.1rem;">${n.type === 'warning' ? '⚠️' : n.type === 'sale' ? '🛒' : 'ℹ️'}</span>
                        <div>
                            <div style="font-weight:800;color:#fff;font-size:0.84rem;">${n.title}</div>
                            <div style="font-size:0.75rem;color:var(--text-muted);margin-top:0.15rem;">${n.message}</div>
                            <div style="font-size:0.7rem;color:var(--primary-orange);margin-top:0.25rem;">${n.createdAt}</div>
                        </div>
                    </div>
                    <button style="background:transparent;border:none;color:var(--accent-red);cursor:pointer;font-size:0.85rem;" title="حذف" onclick="window.deleteNotificationFromDropdown('${notifId}')">
                        🗑️
                    </button>
                </div>
            `;}).join('');
        }
    }

    dropdown.classList.add('open');
};

/* Delete one notification from the header dropdown (state is not reachable
   inside inline onclick handlers in ES modules, so we expose a helper). */
window.deleteNotificationFromDropdown = (id) => {
    state.deleteNotification(id);
    window.toggleNotificationsDropdown();
};

/* Clear all notifications from the header dropdown */
window.clearAllNotificationsFromDropdown = () => {
    if (confirm('هل أنت متأكد من مسح جميع الإشعارات؟')) {
        state.clearAllNotifications();
        window.toggleNotificationsDropdown();
    }
};

window.logoutUser = () => {
    if (confirm('هل أنت متأكد من تسجيل الخروج من النظام؟')) {
        state.logout();
        // Hard redirect using replace(): it swaps the current history entry
        // so the browser Back button cannot restore the logged-in app.
        window.location.replace('index.html');
    }
};
