// === XOALA COMMAND CENTER: CORE APP & DASHBOARD LOGIC ===

const DASHBOARD_API_URL = 'https://xoala-command-center-middleware.osama-mohammad.workers.dev'; 

document.addEventListener('DOMContentLoaded', () => {
    // --- UI NAVIGATION LOGIC ---
    const navItems = document.querySelectorAll('.nav-item');
    const viewSections = document.querySelectorAll('.view-section');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            if (item.disabled) return;
            navItems.forEach(nav => nav.classList.remove('active'));
            viewSections.forEach(section => section.classList.add('hidden'));
            
            item.classList.add('active');
            const targetId = item.getAttribute('data-target');
            document.getElementById(targetId).classList.remove('hidden');
        });
    });

    const dateElement = document.getElementById('current-date');
    if (dateElement) {
        const today = new Date();
        dateElement.textContent = today.toISOString().split('T')[0];
    }

    // --- DASHBOARD REAL-TIME ANALYTICS ---
    let geoChartInstance = null;
    let trendChartInstance = null;

    const fetchDashboardData = async () => {
        const syncIcon = document.getElementById('dashboard-sync-icon');
        if (syncIcon) syncIcon.classList.add('animate-spin');

        try {
            const startTime = Date.now();
            const response = await fetch(DASHBOARD_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get_dashboard_stats' })
            });

            const data = await response.json();
            const latency = Date.now() - startTime;

            if (data.status === 200 && data.stats) {
                // Safely update the HTML cards
                const totalTicketsEl = document.getElementById('dash-total-tickets');
                const todayVolumeEl = document.getElementById('dash-today-volume');
                const topRegionEl = document.getElementById('dash-top-region');
                const topRegionCountEl = document.getElementById('dash-top-region-count');
                const latencyEl = document.getElementById('dash-latency');

                if(totalTicketsEl) totalTicketsEl.textContent = data.stats.totalTickets.toLocaleString();
                if(todayVolumeEl) todayVolumeEl.textContent = data.stats.todayCount.toLocaleString();
                if(topRegionEl) topRegionEl.textContent = data.stats.topCountry.name;
                if(topRegionCountEl) topRegionCountEl.textContent = `Volume: ${data.stats.topCountry.count}`;
                if(latencyEl) latencyEl.textContent = `Latency: ${latency}ms`;

                // Render Chart.js Graphs
                renderCharts(data.stats.geoChart, data.stats.trendChart);
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

    const renderCharts = (geoData, trendData) => {
        Chart.defaults.color = '#888';
        Chart.defaults.font.family = "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace";

        // Geo Pie Chart
        const geoCanvas = document.getElementById('geoChart');
        if (geoCanvas) {
            const geoCtx = geoCanvas.getContext('2d');
            if (geoChartInstance) geoChartInstance.destroy();
            geoChartInstance = new Chart(geoCtx, {
                type: 'doughnut',
                data: {
                    labels: geoData.labels,
                    datasets: [{
                        data: geoData.data,
                        backgroundColor: ['#DDAA33', '#F0D788', '#997722', '#333333', '#1a1a1a'],
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

        // Trend Bar Chart
        const trendCanvas = document.getElementById('trendChart');
        if (trendCanvas) {
            const trendCtx = trendCanvas.getContext('2d');
            if (trendChartInstance) trendChartInstance.destroy();
            trendChartInstance = new Chart(trendCtx, {
                type: 'bar',
                data: {
                    labels: trendData.labels,
                    datasets: [{
                        label: 'Registrations',
                        data: trendData.data,
                        backgroundColor: '#DDAA33',
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { font: { size: 10 } } },
                        x: { grid: { display: false }, ticks: { font: { size: 10 }, maxRotation: 45, minRotation: 45 } }
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
