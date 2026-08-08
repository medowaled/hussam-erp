import { state } from '../state.js';

export function renderDashboardView() {
    const todayInvoices     = state.invoices;
    const totalTodaySales   = todayInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
    const totalMonthlySales = totalTodaySales;
    const totalMonthlyProfit = todayInvoices.reduce((sum, inv) => sum + (inv.netProfit || 0), 0);
    const lowStockCount     = state.products.filter(p => p.stockPacks <= p.minStockPacks).length;
    const totalCustomerDebts = state.customers.reduce((sum, c) => sum + c.debt, 0);
    const totalInventoryCost  = state.products.reduce((sum, p) => sum + (p.buyPrice  * p.stockPacks), 0);
    const totalInventoryValue = state.products.reduce((sum, p) => sum + (p.sellPrice * p.stockPacks), 0);
    const totalInventoryProfit = totalInventoryValue - totalInventoryCost;
    const availableCash     = 60;
    const currentDateStr    = new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    return `
        <!-- Banner -->
        <div class="view-banner flex-between" style="flex-wrap:wrap;gap:0.75rem;">
            <div>
                <div style="font-size:0.85rem;color:var(--primary-orange);font-weight:700;margin-bottom:0.25rem;">
                    📅 لوحة التحكم الرئيسية • ${currentDateStr}
                </div>
                <h1 style="font-size:clamp(1.2rem,3vw,1.75rem);font-weight:900;color:#fff;">مرحباً بك، حسام حسني 👋</h1>
                <p style="color:var(--text-muted);font-size:0.9rem;margin-top:0.25rem;">
                    نظام تتبع المخزون والمبيعات لحظة بلحظة ومراقبة ديون العملاء وأرباح التجارة.
                </p>
            </div>
            <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
                <button class="btn-primary" onclick="window.appRouter('pos')">🛒 نقطة البيع السريعة</button>
                <button class="btn-secondary" style="background:var(--accent-purple);color:#fff;border:none;" onclick="window.appRouter('reports')">📊 تقرير الأرباح</button>
            </div>
        </div>

        <!-- 5 Interactive KPI Cards -->
        <div class="grid-5" style="margin-bottom:1.5rem;">
            <div class="card-dark flex-between interactive-kpi-card" style="cursor:pointer;" onclick="window.navigateToInvoices()" title="اضغط للانتقال إلى فواتير المبيعات">
                <div>
                    <div style="font-size:0.78rem;color:var(--text-muted);font-weight:700;">مبيعات اليوم</div>
                    <div style="font-size:clamp(1.1rem,2vw,1.5rem);font-weight:900;color:#fff;margin-top:0.3rem;">
                        ${totalTodaySales.toLocaleString('ar-EG')} <span style="font-size:0.75rem;color:var(--text-muted);">ج.م</span>
                    </div>
                    <div style="font-size:0.72rem;color:var(--accent-teal);margin-top:0.2rem;">↗ ${todayInvoices.length} فاتورة ←</div>
                </div>
                <div style="background:rgba(255,159,26,0.15);min-width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;color:var(--primary-orange);font-size:1.1rem;font-weight:900;">$</div>
            </div>

            <div class="card-dark flex-between interactive-kpi-card" style="cursor:pointer;" onclick="window.navigateToInvoices()" title="اضغط للانتقال إلى فواتير المبيعات">
                <div>
                    <div style="font-size:0.78rem;color:var(--text-muted);font-weight:700;">مبيعات الشهر</div>
                    <div style="font-size:clamp(1.1rem,2vw,1.5rem);font-weight:900;color:#fff;margin-top:0.3rem;">
                        ${totalMonthlySales.toLocaleString('ar-EG')} <span style="font-size:0.75rem;color:var(--text-muted);">ج.م</span>
                    </div>
                    <div style="font-size:0.72rem;color:var(--text-muted);margin-top:0.2rem;">إجمالي الفواتير ←</div>
                </div>
                <div style="background:rgba(59,130,246,0.15);min-width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;color:#60a5fa;font-size:1.1rem;">📈</div>
            </div>

            <div class="card-dark flex-between interactive-kpi-card" style="cursor:pointer;" onclick="window.appRouter('reports')" title="اضغط للانتقال إلى تقرير الأرباح">
                <div>
                    <div style="font-size:0.78rem;color:var(--text-muted);font-weight:700;">صافي الربح</div>
                    <div style="font-size:clamp(1.1rem,2vw,1.5rem);font-weight:900;color:${totalMonthlyProfit >= 0 ? 'var(--accent-teal)' : 'var(--accent-red)'};margin-top:0.3rem;">
                        ${totalMonthlyProfit.toLocaleString('ar-EG')} <span style="font-size:0.75rem;color:var(--text-muted);">ج.م</span>
                    </div>
                    <div style="font-size:0.72rem;color:${totalMonthlyProfit >= 0 ? 'var(--accent-teal)' : 'var(--accent-red)'};margin-top:0.2rem;">
                        ${totalMonthlyProfit >= 0 ? '✅ ربح رابح ممتاز ←' : '⚠️ تحقق من التكاليف ←'}
                    </div>
                </div>
                <div style="background:var(--accent-teal-light);min-width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;color:var(--accent-teal);font-size:1.1rem;">💹</div>
            </div>

            <div class="card-dark flex-between interactive-kpi-card" style="cursor:pointer;" onclick="window.appRouter('inventory')" title="اضغط للانتقال إلى إدارة المخزون">
                <div>
                    <div style="font-size:0.78rem;color:var(--text-muted);font-weight:700;">نقص المخزون</div>
                    <div style="font-size:clamp(1.1rem,2vw,1.5rem);font-weight:900;color:${lowStockCount > 0 ? 'var(--accent-red)' : 'var(--accent-teal)'};margin-top:0.3rem;">
                        ${lowStockCount} <span style="font-size:0.75rem;color:var(--text-muted);">أصناف</span>
                    </div>
                    <div style="font-size:0.72rem;color:${lowStockCount > 0 ? 'var(--accent-red)' : 'var(--accent-teal)'};margin-top:0.2rem;">
                        ${lowStockCount > 0 ? '⚠️ طلب توريد عاجل ←' : '✅ المخزون مستقر ←'}
                    </div>
                </div>
                <div style="background:var(--accent-red-light);min-width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;color:var(--accent-red);font-size:1.1rem;">⚠️</div>
            </div>

            <div class="card-dark flex-between interactive-kpi-card" style="cursor:pointer;" onclick="window.appRouter('customers')" title="اضغط للانتقال إلى ديون وحسابات العملاء">
                <div>
                    <div style="font-size:0.78rem;color:var(--text-muted);font-weight:700;">ديون العملاء</div>
                    <div style="font-size:clamp(1.1rem,2vw,1.5rem);font-weight:900;color:#fff;margin-top:0.3rem;">
                        ${totalCustomerDebts.toLocaleString('ar-EG')} <span style="font-size:0.75rem;color:var(--text-muted);">ج.م</span>
                    </div>
                    <div style="font-size:0.72rem;color:var(--accent-purple);margin-top:0.2rem;">مبالغ آجلة بالسوق ←</div>
                </div>
                <div style="background:rgba(139,92,246,0.15);min-width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;color:var(--accent-purple);font-size:1.1rem;">👥</div>
            </div>
        </div>

        <!-- Capital Bar -->
        <div class="card-dark" style="margin-bottom:1.5rem;background:linear-gradient(90deg,#141b2d 0%,#172138 100%);">
            <div class="flex-between" style="flex-wrap:wrap;gap:1rem;">
                <div>
                    <div style="display:flex;align-items:center;gap:0.5rem;font-weight:800;font-size:1rem;flex-wrap:wrap;">
                        <span>🪙 رأس مال البضاعة والسيولة المالية الشاملة</span>
                        <span class="badge badge-teal">مربوط حياً بالمخزن</span>
                    </div>
                    <div style="font-size:0.78rem;color:var(--text-muted);margin-top:0.2rem;">تقييم لحظي لرأس مال البضاعة بالمخزن، الديون لدى العملاء، والسيولة النقدية.</div>
                </div>
                <div style="display:flex;gap:0.75rem;flex-wrap:wrap;">
                    <div style="text-align:center;background:#0f1524;padding:0.5rem 0.85rem;border-radius:10px;border:1px solid var(--border-color);">
                        <div style="font-size:0.7rem;color:var(--text-muted);">رأس المال (تكلفة)</div>
                        <div style="font-size:1rem;font-weight:800;color:var(--primary-orange);">${totalInventoryCost.toLocaleString('ar-EG')} ج.م</div>
                    </div>
                    <div style="text-align:center;background:#0f1524;padding:0.5rem 0.85rem;border-radius:10px;border:1px solid var(--border-color);">
                        <div style="font-size:0.7rem;color:var(--text-muted);">قيمة البيع</div>
                        <div style="font-size:1rem;font-weight:800;color:#60a5fa;">${totalInventoryValue.toLocaleString('ar-EG')} ج.م</div>
                    </div>
                    <div style="text-align:center;background:#0f1524;padding:0.5rem 0.85rem;border-radius:10px;border:1px solid rgba(15,211,160,0.3);">
                        <div style="font-size:0.7rem;color:var(--text-muted);">الأرباح المحتبسة</div>
                        <div style="font-size:1rem;font-weight:800;color:${totalInventoryProfit >= 0 ? 'var(--accent-teal)' : 'var(--accent-red)'};">
                            ${totalInventoryProfit >= 0 ? '+' : ''}${totalInventoryProfit.toLocaleString('ar-EG')} ج.م
                        </div>
                    </div>
                    <div style="text-align:center;background:#0f1524;padding:0.5rem 0.85rem;border-radius:10px;border:1px solid var(--primary-orange);cursor:pointer;" onclick="window.openEditCashLiquidityModal()" title="اضغط لتعديل السيولة النقدية يدوياً ✏️">
                        <div style="font-size:0.7rem;color:var(--primary-orange);font-weight:700;">السيولة النقدية الحالية ✏️</div>
                        <div style="font-size:1rem;font-weight:900;color:var(--accent-teal);" id="dashboard-cash-liquidity-val">${(state.cashOnHand || 60).toLocaleString('ar-EG')} ج.م</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- ═══ Clean Dashboard Showcase ═══ -->
        <div class="dashboard-charts-grid" style="margin-bottom:1.5rem;">

            <!-- Chart 1: 7-day Sales + Profit trend lines -->
            <div class="card-dark chart-card">
                <div class="chart-card-header">
                    <div>
                        <div style="font-size:0.95rem;font-weight:800;color:#fff;display:flex;align-items:center;gap:0.5rem;">
                            📈 مخطط المبيعات والأرباح — آخر 7 أيام
                        </div>
                        <div style="font-size:0.75rem;color:var(--text-muted);margin-top:0.2rem;">
                            إجمالي المبيعات اليومية بالجنيه • صافي الربح اليومي
                        </div>
                    </div>
                    <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
                        <span style="display:flex;align-items:center;gap:0.3rem;font-size:0.7rem;color:var(--primary-orange);">
                            <span style="width:18px;height:3px;background:var(--primary-orange);border-radius:2px;display:inline-block;"></span>المبيعات
                        </span>
                        <span style="display:flex;align-items:center;gap:0.3rem;font-size:0.7rem;color:var(--accent-teal);">
                            <span style="width:18px;height:3px;background:var(--accent-teal);border-radius:2px;display:inline-block;"></span>الأرباح
                        </span>
                    </div>
                </div>
                <div class="chart-canvas-wrapper" style="position:relative;height:240px;">
                    <canvas id="chart-sales-trend"></canvas>
                </div>
            </div>

            <!-- Top Products Breakdown Card -->
            <div class="card-dark">
                <div class="flex-between" style="margin-bottom:0.85rem;">
                    <div>
                        <div style="font-size:0.95rem;font-weight:800;color:#fff;display:flex;align-items:center;gap:0.5rem;">
                            🏆 الأصناف الأكثر مبيعاً وتدفقاً بالمخزن
                        </div>
                        <div style="font-size:0.75rem;color:var(--text-muted);margin-top:0.2rem;">
                            مراقبة حالة المخزون، الهامش الربحي، والكميات المتوفرة
                        </div>
                    </div>
                    <button class="btn-secondary" style="font-size:0.75rem;padding:0.25rem 0.65rem;" onclick="window.appRouter('inventory')">
                        المخزون كامل ←
                    </button>
                </div>

                <div style="display:flex;flex-direction:column;gap:0.75rem;">
                    ${state.products.slice(0, 3).map(p => {
                        const marginPercent = p.buyPrice > 0 ? (((p.sellPrice - p.buyPrice) / p.buyPrice) * 100).toFixed(0) : 0;
                        const stockRatio = Math.min(100, Math.max(10, (p.stockPacks / (p.minStockPacks || 100)) * 100));

                        return `
                            <div style="background:#0f1524;padding:0.75rem 0.85rem;border-radius:10px;border:1px solid var(--border-color);">
                                <div class="flex-between" style="margin-bottom:0.35rem;">
                                    <div style="font-weight:800;color:#fff;font-size:0.88rem;">${p.name}</div>
                                    <div style="font-size:0.78rem;font-weight:900;color:var(--accent-teal);">
                                        ربح: +${(p.sellPrice - p.buyPrice)} ج (${marginPercent}%)
                                    </div>
                                </div>
                                <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:0.4rem;display:flex;justify-content:space-between;">
                                    <span>المجموع بالمخزن: <strong style="color:#fff;">${p.stockPacks} قروصة</strong></span>
                                    <span>سعر البيع: <strong style="color:var(--primary-orange);">${p.sellPrice} ج.م</strong></span>
                                </div>
                                <div style="width:100%;height:6px;background:#1a233a;border-radius:4px;overflow:hidden;">
                                    <div style="width:${stockRatio}%;height:100%;background:linear-gradient(90deg,var(--primary-orange),var(--accent-teal));border-radius:4px;"></div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        </div>

        <!-- Recent Sales & Low Stock Row -->
        <div class="grid-2">
            <!-- Recent Sales (With Print Icon per Invoice) -->
            <div class="card-dark">
                <div class="flex-between" style="margin-bottom:1rem;">
                    <div style="font-size:1rem;font-weight:800;display:flex;align-items:center;gap:0.5rem;">
                        🛒 آخر عمليات البيع الصادرة
                    </div>
                    <button class="btn-secondary" style="font-size:0.78rem;padding:0.35rem 0.85rem;" onclick="window.navigateToInvoices()">
                        عرض الكل ←
                    </button>
                </div>
                ${todayInvoices.length === 0 ? `
                    <div class="empty-table-state">
                        <i>🛍️</i>
                        <p style="font-weight:700;color:var(--text-main);">لا توجد عمليات بيع حتى الآن</p>
                        <p style="font-size:0.78rem;margin-top:0.25rem;">أضف منتجات وابدأ أول عملية بيع عبر كاشير الـ POS.</p>
                    </div>
                ` : `
                    <div style="display:flex;flex-direction:column;gap:0.65rem;">
                        ${todayInvoices.slice(0, 4).map(inv => `
                            <div class="flex-between" style="background:#0f1524;padding:0.65rem 0.9rem;border-radius:10px;border:1px solid var(--border-color);">
                                <div style="display:flex;align-items:center;gap:0.65rem;">
                                    <button class="action-btn" title="معاينة وطباعة الفاتورة" style="background:#1a233a;color:var(--primary-orange);border:1px solid rgba(255,159,26,0.3);padding:0.3rem 0.5rem;border-radius:8px;" onclick="window.reprintInvoice(${inv.id})">
                                        🖨️
                                    </button>
                                    <div>
                                        <div style="font-weight:800;color:var(--primary-orange);font-size:0.88rem;">${inv.invoiceNumber}</div>
                                        <div style="font-size:0.75rem;color:var(--text-muted);">${inv.customerName} • ${inv.createdAt}</div>
                                    </div>
                                </div>
                                <div style="text-align:left;">
                                    <div style="font-weight:800;color:var(--accent-teal);font-size:0.88rem;">${inv.grandTotal} ج.م</div>
                                    <div style="font-size:0.7rem;color:var(--text-muted);">${inv.items.length} أصناف</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>

            <!-- Low Stock Alerts -->
            <div class="card-dark">
                <div class="flex-between" style="margin-bottom:1rem;">
                    <div style="font-size:1rem;font-weight:800;display:flex;align-items:center;gap:0.5rem;color:#fff;flex-wrap:wrap;">
                        ⚠️ أصناف اقتربت من النفاد
                        <span class="badge badge-red">${lowStockCount} أصناف</span>
                    </div>
                    <button class="btn-secondary" style="font-size:0.75rem;padding:0.25rem 0.65rem;" onclick="window.appRouter('inventory')">
                        عرض الكل ←
                    </button>
                </div>
                ${lowStockCount === 0 ? `
                    <div class="empty-table-state">
                        <i style="color:var(--accent-teal);">✅</i>
                        <p style="font-weight:700;color:var(--text-main);">المخزون مستقر تماماً</p>
                        <p style="font-size:0.78rem;margin-top:0.25rem;">جميع الأصناف تتجاوز الحدود الحرجة.</p>
                    </div>
                ` : `
                    <div style="display:flex;flex-direction:column;gap:0.65rem;">
                        ${state.products.filter(p => p.stockPacks <= p.minStockPacks).map(p => `
                            <div class="flex-between" style="background:#0f1524;padding:0.65rem 0.9rem;border-radius:10px;border:1px solid rgba(239,68,68,0.2);">
                                <div>
                                    <div style="font-weight:800;color:#fff;font-size:0.88rem;">${p.name}</div>
                                    <div style="font-size:0.75rem;color:var(--text-muted);">حد الطلب: ${p.minStockPacks} علبة</div>
                                </div>
                                <div style="text-align:left;">
                                    <div style="font-weight:900;color:var(--accent-red);font-size:0.88rem;">${p.stockPacks} علبة</div>
                                    <button class="btn-danger" style="font-size:0.7rem;padding:0.2rem 0.5rem;margin-top:0.2rem;" onclick="window.openRestockModal(${p.id})">توريد</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>
        </div>
    `;
}

/* ─── Chart Initialization ──────────────────────────────────────── */
let _chartSalesTrend = null;
let _chartMargin     = null;

export function initDashboardCharts() {
    if (_chartSalesTrend) { _chartSalesTrend.destroy(); _chartSalesTrend = null; }
    if (_chartMargin)     { _chartMargin.destroy();     _chartMargin     = null; }

    if (!window.Chart) return;

    const products = state.products;
    const invoices = state.invoices;

    /* Shared tooltip style */
    const tooltipDefaults = {
        backgroundColor: '#141b2d',
        borderColor: '#2a3652',
        borderWidth: 1,
        titleColor: '#fff',
        bodyColor: '#8892a4',
        padding: 10,
        rtl: true
    };

    /* ── Build last-7-days labels + data from invoices ── */
    const days7 = _getLast7Days();  // [{ label, dateStr }, ...]

    const salesByDay  = new Array(7).fill(0);
    const profitByDay = new Array(7).fill(0);

    invoices.forEach(inv => {
        // Use inv.id (which is Date.now() timestamp) or inv.createdAt
        const invDate = inv.id ? new Date(inv.id) : new Date();
        const invDayKey = _getDayKey(invDate);

        days7.forEach((d, idx) => {
            if (d.dayKey === invDayKey) {
                salesByDay[idx]  += Number(inv.grandTotal)  || 0;
                profitByDay[idx] += Number(inv.netProfit)   || 0;
            }
        });
    });

    /* ── Chart 1: 7-Day Sales + Profit Line Curve ── */
    const c1 = document.getElementById('chart-sales-trend');
    if (c1) {
        _chartSalesTrend = new window.Chart(c1, {
            type: 'line',
            data: {
                labels: days7.map(d => d.label),
                datasets: [
                    {
                        label: 'المبيعات اليومية (ج.م)',
                        data: salesByDay,
                        borderColor: '#ff9f1a',
                        backgroundColor: 'rgba(255,159,26,0.1)',
                        pointBackgroundColor: '#ff9f1a',
                        pointBorderColor: '#ff9f1a',
                        pointRadius: 5,
                        pointHoverRadius: 8,
                        borderWidth: 2.5,
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'صافي الربح (ج.م)',
                        data: profitByDay,
                        borderColor: '#00c897',
                        backgroundColor: 'rgba(0,200,151,0.08)',
                        pointBackgroundColor: '#00c897',
                        pointBorderColor: '#00c897',
                        pointRadius: 5,
                        pointHoverRadius: 8,
                        borderWidth: 2.5,
                        tension: 0.4,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 900, easing: 'easeInOutQuart' },
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        ...tooltipDefaults,
                        callbacks: {
                            title: items => `📅 ${items[0].label}`,
                            label: ctx => {
                                const icon = ctx.datasetIndex === 0 ? '💰' : '📈';
                                return ` ${icon} ${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString('ar-EG')} ج.م`;
                            },
                            afterBody: items => {
                                const sales  = items.find(i => i.datasetIndex === 0)?.parsed.y || 0;
                                const profit = items.find(i => i.datasetIndex === 1)?.parsed.y || 0;
                                if (sales > 0) {
                                    const pct = Math.round((profit / sales) * 100);
                                    return [``, ` هامش الربح اليوم: ${pct}%`];
                                }
                                return [];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(255,255,255,0.04)' },
                        ticks: { color: '#8892a4', font: { family: 'Tajawal', size: 11 } }
                    },
                    y: {
                        grid: { color: 'rgba(255,255,255,0.05)' },
                        beginAtZero: true,
                        ticks: {
                            color: '#8892a4',
                            font: { family: 'Tajawal', size: 11 },
                            callback: v => v.toLocaleString('ar-EG') + ' ج'
                        }
                    }
                }
            }
        });
    }

    /* ── Chart 2: Profit Margin % per Product (Horizontal) ── */
    const c2 = document.getElementById('chart-profit-margin');
    if (c2) {
        if (products.length === 0) {
            _drawEmptyState(c2, 'أضف أصناف للمخزن لعرض هوامش الربح');
        } else {
            const labels      = products.map(p => p.name.length > 12 ? p.name.slice(0, 12) + '…' : p.name);
            const marginData  = products.map(p =>
                p.buyPrice > 0
                    ? Math.round(((p.sellPrice - p.buyPrice) / p.buyPrice) * 10000) / 100
                    : 0
            );

            // Color each bar: green if profitable, red if not
            const barColors = marginData.map(m =>
                m > 0 ? 'rgba(15,211,160,0.82)' : 'rgba(239,68,68,0.82)'
            );

            // Update profit status badge
            const avgMargin = marginData.length > 0
                ? Math.round(marginData.reduce((a, b) => a + b, 0) / marginData.length * 10) / 10
                : 0;
            const statusEl = document.getElementById('chart2-profit-status');
            if (statusEl) {
                statusEl.innerHTML = avgMargin > 0
                    ? `<span style="background:rgba(15,211,160,0.15);border:1px solid rgba(15,211,160,0.4);color:var(--accent-teal);padding:3px 10px;border-radius:6px;">✅ متوسط الهامش: ${avgMargin}%</span>`
                    : `<span style="background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.4);color:var(--accent-red);padding:3px 10px;border-radius:6px;">⚠️ هامش سالب: ${avgMargin}%</span>`;
            }

            _chartMargin = new window.Chart(c2, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [{
                        label: 'هامش الربح %',
                        data: marginData,
                        backgroundColor: barColors,
                        borderRadius: 6,
                        borderSkipped: false
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: { duration: 800, easing: 'easeInOutQuart' },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            ...tooltipDefaults,
                            callbacks: {
                                label: ctx => {
                                    const p = products[ctx.dataIndex];
                                    const profit = p ? p.sellPrice - p.buyPrice : 0;
                                    return [
                                        ` هامش الربح: ${ctx.parsed.x}%`,
                                        ` ربح القروصة: ${profit} ج.م`,
                                        ` سعر الشراء: ${p?.buyPrice} ج.م`,
                                        ` سعر البيع: ${p?.sellPrice} ج.م`
                                    ];
                                }
                            }
                        },
                        // Reference line at 0
                        annotation: null
                    },
                    scales: {
                        x: {
                            grid: { color: 'rgba(255,255,255,0.05)' },
                            ticks: {
                                color: '#8892a4',
                                font: { family: 'Tajawal', size: 11 },
                                callback: v => v + '%'
                            },
                            beginAtZero: true
                        },
                        y: {
                            grid: { display: false },
                            ticks: { color: '#c8d0de', font: { family: 'Tajawal', size: 11 } }
                        }
                    }
                }
            });
        }
    }
}

/* Build last 7 days: label (Arabic day name) + dayKey YYYY-MM-DD for bulletproof matching */
function _getLast7Days() {
    const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const result = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        result.push({
            label: i === 0 ? 'اليوم' : dayNames[d.getDay()],
            dayKey: _getDayKey(d)
        });
    }
    return result;
}

function _getDayKey(d) {
    if (!d || isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

/* Draw "no data" placeholder inside canvas */
function _drawEmptyState(canvas, msg) {
    const ctx = canvas.getContext('2d');
    canvas.height = 220;
    ctx.fillStyle = '#1a233a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#4a5568';
    ctx.font = '14px Tajawal, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(msg, canvas.width / 2, canvas.height / 2);
}

