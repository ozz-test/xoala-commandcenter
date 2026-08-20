// === XOALA COMMAND CENTER: CORE APP & DASHBOARD LOGIC ===

const DASHBOARD_API_URL = 'https://xoala-command-center-middleware.osama-mohammad.workers.dev'; 

document.addEventListener('DOMContentLoaded', () => {
    
    // --- STABILIZED TAB NAVIGATION ---
    const navItems = document.querySelectorAll('.nav-item');
    const viewSections = document.querySelectorAll('.view-section');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            if (item.disabled) return;
            navItems.forEach(nav => nav.classList.remove('active'));
            viewSections.forEach(section => {
                section.classList.add('hidden');
                section.classList.remove('flex', 'block'); 
            });
            item.classList.add('active');
            const targetId = item.getAttribute('data-target');
            const targetSection = document.getElementById(targetId);
            
            if(targetSection) {
                targetSection.classList.remove('hidden');
                if (targetId === 'artemis-view') {
                    targetSection.classList.add('flex');
                } else {
                    targetSection.classList.add('block');
                    if (targetId === 'dashboard-view') fetchDashboardData(); 
                    if (targetId === 'daily-report-view') {
                        fetchDashboardData(); // Refreshes the summary
                        fetchMatrixData();    // Refreshes the table
                    }
                }
            }
        });
    });

    // --- ISOLATED SIDEBAR TOGGLE ---
    const sidebar = document.getElementById('main-sidebar');
    const sidebarToggleBtn = document.getElementById('sidebar-toggle');
    const sidebarIcon = document.getElementById('sidebar-toggle-icon');
    const navTexts = document.querySelectorAll('.nav-text');

    if (sidebarToggleBtn) {
        sidebarToggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('w-64');
            sidebar.classList.toggle('w-20');
            navTexts.forEach(txt => txt.classList.toggle('hidden'));
            if(sidebar.classList.contains('w-20')) sidebarIcon.classList.replace('ph-caret-left', 'ph-caret-right');
            else sidebarIcon.classList.replace('ph-caret-right', 'ph-caret-left');
        });
    }

    const dateElement = document.getElementById('current-date');
    if (dateElement) {
        const today = new Date();
        dateElement.textContent = today.toISOString().split('T')[0];
    }

    // --- MATRIX LOGIC (DAILY REPORT) ---
    const setMatrixDefaultDates = () => {
        const now = new Date();
        const currentDay = now.getDay(); 
        const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
        
        const start = new Date(now);
        start.setDate(now.getDate() + diffToMonday);
        
        const end = new Date(now);
        if (currentDay === 0) end.setDate(now.getDate() - 2); 
        else if (currentDay === 6) end.setDate(now.getDate() - 1); 
        
        const startEl = document.getElementById('matrix-start-date');
        const endEl = document.getElementById('matrix-end-date');
        if(startEl) startEl.value = start.toISOString().split('T')[0];
        if(endEl) endEl.value = end.toISOString().split('T')[0];
    };
    setMatrixDefaultDates();

    const fetchMatrixData = async () => {
        const syncIcon = document.getElementById('matrix-sync-icon');
        const tbody = document.getElementById('matrix-table-body');
        const startEl = document.getElementById('matrix-start-date');
        const endEl = document.getElementById('matrix-end-date');
        
        if(!startEl || !endEl || !tbody) return;

        const startDate = startEl.value;
        const endDate = endEl.value;

        if (syncIcon) syncIcon.classList.add('animate-spin');
        tbody.innerHTML = `<tr><td colspan="5" class="py-12 text-center text-gold/50 font-mono text-xs animate-pulse">Running DAX Emulator...</td></tr>`;

        try {
            const response = await fetch(DASHBOARD_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    action: 'get_matrix_data',
                    startDate: startDate,
                    endDate: endDate,
                    secret: 'system_dashboard_init', 
                    prompt: 'system', model: 'gemini-3.5-flash-lite'
                })
            });

            const responseData = await response.json();

            if (responseData.status === 200 && responseData.data) {
                renderMatrix(responseData.data);
            } else {
                tbody.innerHTML = `<tr><td colspan="5" class="py-12 text-center text-red-500 font-mono text-xs">API Error. Unable to calculate matrix.</td></tr>`;
            }
        } catch (error) {
            tbody.innerHTML = `<tr><td colspan="5" class="py-12 text-center text-red-500 font-mono text-xs">Network Error.</td></tr>`;
        } finally {
            if (syncIcon) syncIcon.classList.remove('animate-spin');
        }
    };

    const renderMatrix = (matrixData) => {
        const tbody = document.getElementById('matrix-table-body');
        if(!tbody) return;
        tbody.innerHTML = '';

        if (matrixData.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="py-12 text-center text-gray-500 font-mono text-xs">No tickets found in this date range.</td></tr>`;
            return;
        }

        matrixData.forEach((mgr, mgrIndex) => {
            const trMgr = document.createElement('tr');
            trMgr.className = "bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group";
            trMgr.innerHTML = `
                <td class="py-3 px-6 font-semibold flex items-center space-x-2">
                    <i class="ph ph-plus-square text-gold/50 group-hover:text-gold transition-colors"></i>
                    <span>${mgr.managerName}</span>
                </td>
                <td class="py-3 px-6 text-right font-mono">${mgr.tickets}</td>
                <td class="py-3 px-6 text-right font-mono">${mgr.introducer}</td>
                <td class="py-3 px-6 text-right font-mono ${mgr.avgAging > 5 ? 'text-red-400' : 'text-gray-300'}">${mgr.avgAging}</td>
                <td class="py-3 px-6 text-right font-mono text-gray-300">${mgr.avgDays}</td>
            `;
            tbody.appendChild(trMgr);

            mgr.statuses.forEach((stg, stgIndex) => {
                const trStg = document.createElement('tr');
                trStg.className = `mgr-${mgrIndex}-child bg-transparent hover:bg-white/5 transition-colors cursor-pointer hidden group`;
                trStg.innerHTML = `
                    <td class="py-2 px-6 flex items-center space-x-2 pl-12">
                        <i class="ph ph-caret-right text-gray-600 group-hover:text-gold transition-colors text-xs"></i>
                        <span class="text-sm text-gray-400">${stg.stageName}</span>
                    </td>
                    <td class="py-2 px-6 text-right font-mono text-sm text-gray-400">${stg.tickets}</td>
                    <td class="py-2 px-6 text-right font-mono text-sm text-gray-400">${stg.introducer}</td>
                    <td class="py-2 px-6 text-right font-mono text-sm ${stg.avgAging > 5 ? 'text-red-400' : 'text-gray-400'}">${stg.avgAging}</td>
                    <td class="py-2 px-6 text-right font-mono text-sm text-gray-400">${stg.avgDays}</td>
                `;
                tbody.appendChild(trStg);

                stg.leads.forEach(lead => {
                    const trLead = document.createElement('tr');
                    trLead.className = `mgr-${mgrIndex}-child stg-${mgrIndex}-${stgIndex}-child bg-black/20 hidden`;
                    trLead.innerHTML = `
                        <td class="py-1 px-6 pl-20 text-xs text-gray-500 font-mono truncate max-w-xs" title="${lead.name}">- ${lead.name}</td>
                        <td class="py-1 px-6 text-right font-mono text-xs text-gray-500">-</td>
                        <td class="py-1 px-6 text-right font-mono text-xs text-gray-500">${lead.introducer}</td>
                        <td class="py-1 px-6 text-right font-mono text-xs ${lead.aging > 5 ? 'text-red-500/70' : 'text-gray-500'}">${lead.aging}</td>
                        <td class="py-1 px-6 text-right font-mono text-xs text-gray-500">${lead.daysSince}</td>
                    `;
                    tbody.appendChild(trLead);
                });

                trStg.addEventListener('click', () => {
                    const leadRows = document.querySelectorAll(`.stg-${mgrIndex}-${stgIndex}-child`);
                    const icon = trStg.querySelector('i');
                    leadRows.forEach(r => r.classList.toggle('hidden'));
                    if (icon.classList.contains('ph-caret-right')) icon.classList.replace('ph-caret-right', 'ph-caret-down');
                    else icon.classList.replace('ph-caret-down', 'ph-caret-right');
                });
            });

            trMgr.addEventListener('click', () => {
                const statusRows = document.querySelectorAll(`.mgr-${mgrIndex}-child`);
                const icon = trMgr.querySelector('i');
                statusRows.forEach(r => {
                    if (!r.classList.contains('hidden') || r.classList.contains('stg-')) {
                         r.classList.add('hidden');
                    } else if (!r.classList.contains('stg-')) {
                         r.classList.remove('hidden'); 
                    }
                });
                document.querySelectorAll(`.mgr-${mgrIndex}-child .ph-caret-down`).forEach(i => i.classList.replace('ph-caret-down', 'ph-caret-right'));
                
                if (icon.classList.contains('ph-plus-square')) icon.classList.replace('ph-plus-square', 'ph-minus-square');
                else icon.classList.replace('ph-minus-square', 'ph-plus-square');
            });
        });
    };

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
                // Dashboard Elements
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

                // FIX: Restored Executive Summary Injection
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

    const matrixRefreshBtn = document.getElementById('matrix-refresh-btn');
    if (matrixRefreshBtn) matrixRefreshBtn.addEventListener('click', fetchMatrixData);
    
    const dashRefreshBtn = document.getElementById('dashboard-refresh-btn');
    if (dashRefreshBtn) dashRefreshBtn.addEventListener('click', fetchDashboardData);
    
    fetchDashboardData();
});
