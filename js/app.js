// === XOALA COMMAND CENTER: CORE APP & DASHBOARD LOGIC ===

const DASHBOARD_API_URL = 'https://xoala-command-center-middleware.osama-mohammad.workers.dev'; 

document.addEventListener('DOMContentLoaded', () => {
    // --- HARDENED UI NAVIGATION LOGIC ---
    const navItems = document.querySelectorAll('.nav-item');
    const viewSections = document.querySelectorAll('.view-section');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            if (item.disabled) return;
            
            // 1. Remove active state from all nav buttons
            navItems.forEach(nav => nav.classList.remove('active'));
            
            // 2. Strictly hide all sections using Tailwind's 'hidden' utility
            viewSections.forEach(section => {
                section.classList.add('hidden');
                section.classList.remove('active'); // Clean up legacy active tags
            });
            
            // 3. Activate selected button
            item.classList.add('active');
            
            // 4. Reveal strictly the targeted section
            const targetId = item.getAttribute('data-target');
            const targetSection = document.getElementById(targetId);
            if(targetSection) {
                targetSection.classList.remove('hidden');
            }
        });
    });

    const dateElement = document.getElementById('current-date');
    if (dateElement) {
        const today = new Date();
        dateElement.textContent = today.toISOString().split('T')[0];
    }

    // --- DASHBOARD REAL-TIME ANALYTICS ---
    let riskChartInstance = null;
    let bottleneckChartInstance = null;

    const fetchDashboardData = async () => {
        const syncIcon = document.getElementById('dashboard-sync-icon');
        if (syncIcon) syncIcon.classList.add('animate-spin');

        try {
            // "Ghost Payload" safely bypasses Cloudflare validation for dashboard calls
            const response = await fetch(DASHBOARD_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    action: 'get_dashboard_stats',
                    prompt: 'system_dashboard_init', 
                    model: 'gemini-3.5-flash-lite',
                    history: []
                })
            });

            const data = await response.json();

            if (data.status === 200 && data.stats) {
                // Safely update the HTML cards
                const totalTicketsEl = document.getElementById('dash-total-tickets');
                const todayVolumeEl = document.getElementById('dash-today-volume');
                const topRegionEl = document.getElementById('dash-top-region');
                const topRegionCountEl = document.getElementById('dash-top-region-count');
                const approvalRateEl = document.getElementById('dash-approval-rate');
                const approvalVolEl = document.getElementById('dash-approval-vol');

                if(totalTicketsEl) totalTicketsEl.textContent = data.stats.totalTickets.toLocaleString();
                if(todayVolumeEl) todayVolumeEl.textContent = data.stats.todayCount.toLocaleString();
                if(topRegionEl) topRegionEl.textContent = data.stats.topCountryToday.name;
                if(topRegionCountEl) topRegionCountEl.textContent = `Daily Volume: ${data.stats.topCountryToday.count}`;
                if(approvalRateEl) approvalRateEl.textContent = data.stats.approvalRate.rate;
                if(approvalVolEl) approvalVolEl.textContent = `Resolved 30D: ${data.stats.approvalRate.volume}`;

                // Render C-Suite Charts
                renderCharts(data.stats.riskChart, data.stats.bottleneckChart);
            } else {
                console.error("Dashboard Sync Error:", data);
            }
        } catch (error) {
            console.error("Dashboard Network Failure:", error);
            const totalTicketsEl = document.getElementById('dash-total-tickets');
            if(totalTicketsEl) totalTicketsEl.textContent = "ERR";
        } finally {
            if (syncIcon) syncIcon.classList.remove('animate-spin');
        }
    };

    const renderCharts = (riskData, bottleneckData) => {
        Chart.defaults.color = '#888';
        Chart.defaults.font.family = "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace";

        // Risk Stratification Doughnut Chart
        const riskCanvas = document.getElementById('riskChart');
        if (riskCanvas) {
            const riskCtx = riskCanvas.getContext('2d');
            if (riskChartInstance) riskChartInstance.destroy();
            riskChartInstance = new Chart(riskCtx, {
                type: 'doughnut',
                data: {
                    labels: riskData.labels,
                    datasets: [{
                        data: riskData.data,
                        backgroundColor: ['#ef4444', '#DDAA33', '#10b981', '#333333', '#6b7280'], // High, Med, Low, Unassessed palettes
                        borderWidth: 2,
                        borderColor: '#111111'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '75%',
                    plugins: {
                        legend: { position: 'right', labels: { color: '#9ca3af', font: { size: 10 } } }
                    }
                }
            });
        }

        // Stage Bottleneck Bar Chart
        const bottleneckCanvas = document.getElementById('bottleneckChart');
        if (bottleneckCanvas) {
            const bottleneckCtx = bottleneckCanvas.getContext('2d');
            if (bottleneckChartInstance) bottleneckChartInstance.destroy();
            bottleneckChartInstance = new Chart(bottleneckCtx, {
                type: 'bar',
                data: {
                    labels: bottleneckData.labels,
                    datasets: [{
                        label: 'Tickets',
                        data: bottleneckData.data,
                        backgroundColor: '#DDAA33',
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { font: { size: 10 } } },
                        x: { grid: { display: false }, ticks: { font: { size: 9 }, maxRotation: 45, minRotation: 45 } }
                    },
                    plugins: { legend: { display: false } }
                }
            });
        }
    };

    // Auto-fetch on load and map to refresh button
    fetchDashboardData();
    const refreshBtn = document.getElementById('dashboard-refresh-btn');
    if (refreshBtn) refreshBtn.addEventListener('click', fetchDashboardData);
});
