// === XOALA COMMAND CENTER: CORE APP & DASHBOARD LOGIC ===

const DASHBOARD_API_URL = 'https://xoala-command-center-middleware.osama-mohammad.workers.dev'; 

document.addEventListener('DOMContentLoaded', () => {
    
    // --- STABLE TAB NAVIGATION & DISPLAY MANAGEMENT ---
    const navItems = document.querySelectorAll('.nav-item');
    const viewSections = document.querySelectorAll('.view-section');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            if (item.disabled) return;
            
            navItems.forEach(nav => nav.classList.remove('active'));
            viewSections.forEach(section => {
                section.classList.add('hidden');
                section.classList.remove('flex'); // Remove flex override safely
            });
            
            item.classList.add('active');
            const targetId = item.getAttribute('data-target');
            const targetSection = document.getElementById(targetId);
            
            if(targetSection) {
                targetSection.classList.remove('hidden');
                
                // Explicitly apply correct layout display modes per view
                if (targetId === 'artemis-view') {
                    targetSection.classList.add('flex');
                } else {
                    targetSection.classList.add('flex-1');
                    if (targetId === 'dashboard-view') {
                        fetchDashboardData();
                    }
                }
            }
        });
    });

    // --- ISOLATED SIDEBAR TOGGLE (Collapses text labels, preserves logo scaling) ---
    const sidebar = document.getElementById('main-sidebar');
    const sidebarToggleBtn = document.getElementById('sidebar-toggle');
    const sidebarIcon = document.getElementById('sidebar-toggle-icon');
    const navTexts = document.querySelectorAll('.nav-text');
    const logoContainer = document.querySelector('.logo-container');

    if (sidebarToggleBtn) {
        sidebarToggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('w-64');
            sidebar.classList.toggle('w-20');
            
            navTexts.forEach(txt => {
                txt.classList.toggle('hidden');
            });
            
            // Elegantly scale down the logo instead of hiding it completely
            if(sidebar.classList.contains('w-20')) {
                if(logoContainer) logoContainer.style.transform = 'scale(0.55)';
                sidebarIcon.classList.replace('ph-caret-left', 'ph-caret-right');
            } else {
                if(logoContainer) logoContainer.style.transform = 'scale(1)';
                sidebarIcon.classList.replace('ph-caret-right', 'ph-caret-left');
            }
        });
    }

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

                const reportEl = document.getElementById('daily-report-content');
                if (reportEl) {
                    reportEl.innerHTML = `
                        System pipeline integrity remains optimal. The Data Lake successfully synchronized <strong>${data.stats.totalTickets.toLocaleString()}</strong> active KYC tickets. <br><br>
                        <strong>Today's Activity:</strong> <strong>${data.stats.todayCount}</strong> new registrations were processed, with <strong>${data.stats.topCountryToday.name}</strong> leading daily ingestion volume (${data.stats.topCountryToday.count} tickets). <br><br>
                        <strong>Trailing 30-Day Performance:</strong> The pipeline conversion efficiency stands at <strong>${data.stats.approvalRate.rate}</strong> across ${data.stats.approvalRate.volume} resolved applications. Operations remain within established compliance thresholds.
                    `;
                }

                renderCharts(data.stats.riskChart, data.stats.bottleneckChart);
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

        const riskCanvas = document.getElementById('riskChart');
        if (riskCanvas) {
            const riskCtx = riskCanvas.getContext('2d');
            if (riskChartInstance) riskChartInstance.destroy();
            
            const riskColors = riskData.labels.map(label => {
                if (label === 'Critical') return '#ef4444'; 
                if (label === 'High') return '#f97316'; 
                if (label === 'Medium') return '#DDAA33'; 
                if (label === 'Low') return '#10b981'; 
                return '#333333'; 
            });

            riskChartInstance = new Chart(riskCtx, {
                type: 'doughnut',
                data: {
                    labels: riskData.labels,
                    datasets: [{
                        data: riskData.data,
                        backgroundColor: riskColors,
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

    fetchDashboardData();
    const refreshBtn = document.getElementById('dashboard-refresh-btn');
    if (refreshBtn) refreshBtn.addEventListener('click', fetchDashboardData);
});
