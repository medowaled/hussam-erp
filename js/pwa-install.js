// Register Service Worker for PWA compliance
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('PWA Service Worker registered:', reg.scope))
            .catch(err => console.log('Service Worker registration failed:', err));
    });
}

let deferredPrompt = null;

// Listen for PWA beforeinstallprompt event
window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent standard mini-infobar
    e.preventDefault();
    deferredPrompt = e;
    console.log('PWA beforeinstallprompt triggered!');
    
    // Show automatic custom Arabic PWA install banner
    showPwaInstallBanner();
});

function showPwaInstallBanner() {
    if (document.getElementById('pwa-install-banner')) return;

    const banner = document.createElement('div');
    banner.id = 'pwa-install-banner';
    banner.className = 'pwa-install-banner';
    banner.innerHTML = `
        <div class="pwa-banner-content">
            <div class="pwa-icon">📲</div>
            <div class="pwa-text-box">
                <div class="pwa-title">تثبيت تطبيق حسام ERP على الهاتف</div>
                <div class="pwa-sub">ثبّت النظام كتطبيق مستقل على شاشة هاتفك الرئيسية للوصول السريع ومتابعة المبيعات فوراً!</div>
            </div>
        </div>
        <div class="pwa-banner-actions">
            <button id="pwa-install-action-btn" class="btn-pwa-install">📥 تثبيت التطبيق الآن</button>
            <button id="pwa-dismiss-action-btn" class="btn-pwa-dismiss">✕ لاحقاً</button>
        </div>
    `;

    document.body.appendChild(banner);

    // Bind click events
    document.getElementById('pwa-install-action-btn').addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`User PWA prompt outcome: ${outcome}`);
            deferredPrompt = null;
        } else {
            alert('لتثبيت التطبيق على هاتف الآيفون (iOS):\nاضغط على زر المشاركة ⎋ في متصفح Safari ثم اخشتر "إضافة إلى الشاشة الرئيسية ➕"');
        }
        banner.remove();
    });

    document.getElementById('pwa-dismiss-action-btn').addEventListener('click', () => {
        banner.remove();
    });
}

// iOS Safari PWA Prompt Detection
const isIos = () => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    return /iphone|ipad|ipod/.test(userAgent);
};
const isInStandaloneMode = () => ('standalone' in window.navigator) && (window.navigator.standalone);

if (isIos() && !isInStandaloneMode()) {
    window.addEventListener('load', () => {
        setTimeout(() => {
            if (!sessionStorage.getItem('iosPwaPromptShown')) {
                sessionStorage.setItem('iosPwaPromptShown', 'true');
                showPwaInstallBanner();
            }
        }, 2000);
    });
}

window.showPwaInstallBanner = showPwaInstallBanner;
