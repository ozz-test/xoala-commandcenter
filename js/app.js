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
                section.classList.add('hidden'); section.classList.remove('flex', 'block'); 
            });
            item.classList.add('active');
            const targetId = item.getAttribute('data-target');
            const targetSection = document.getElementById(targetId);
            
            if(targetSection) {
                targetSection.classList.remove('hidden');
                if (targetId === 'artemis-view') targetSection.classList.add('flex');
                else {
                    targetSection.classList.add('block');
                    if (targetId === 'dashboard-view') fetchDashboardData(); 
                    if (targetId === 'daily-report-view') { fetchDashboardData(); fetchMatrixData(); }
                }
            }
        });
    });

    const sidebar = document.getElementById('main-sidebar');
    const sidebarToggleBtn = document.getElementById('sidebar-toggle');
    const sidebarIcon = document.getElementById('sidebar-toggle-icon');
    const navTexts = document.querySelectorAll('.nav-text');

    if (sidebarToggleBtn) {
        sidebarToggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('w-64'); sidebar.classList.toggle('w-20');
            navTexts.forEach(txt => txt.classList.toggle('hidden'));
            if(sidebar.classList.contains('w-20')) sidebarIcon.classList.replace('ph-caret-left', 'ph-caret-right');
            else sidebarIcon.classList.replace('ph-caret-right', 'ph-caret-left');
        });
    }

    const dateElement = document.getElementById('current-date');
    if (dateElement) dateElement.textContent = new Date().toISOString().split('T')[0];

    // --- DRILL-DOWN PANEL LOGIC ---
    const drilldownPanel = document.getElementById('drilldown-panel');
    const drilldownOverlay = document.getElementById('drilldown-overlay');
    const drilldownTitle = document.getElementById('drilldown-title');
    const drilldownList = document.getElementById('drilldown-list');

    const openDrilldown = (title, leads) => {
        drilldownTitle.textContent = title;
        document.getElementById('drilldown-count').textContent = `${leads.length} Tickets Found`;
        drilldownList.innerHTML = leads.map(name => `<li class="px-3 py-2 bg-white/5 hover:bg-gold/10 border border-white/5 rounded text-xs font-mono text-gray-300 truncate cursor-pointer transition-colors" title="${name}">${name}</li>`).join('');
        drilldownOverlay.classList.remove('hidden');
        setTimeout(() => drilldownOverlay.classList.remove('opacity-0'), 10);
        drilldownPanel.classList.remove('translate-x-full');
    };

    const closeDrilldown = () => {
        drilldownOverlay.classList.add('opacity-0');
        drilldownPanel.classList.add('translate-x-full');
        setTimeout(() => drilldownOverlay.classList.add('hidden'), 300);
    };

    document.getElementById('close-drilldown-btn').addEventListener('click', closeDrilldown);
    drilldownOverlay.addEventListener('click', closeDrilldown);

    // --- CSV EXPORT LOGIC ---
    const downloadCSV = (title, labels, counts, leadsArray) => {
        let csvContent = "data:text/csv;charset=utf-8,Category,Ticket Count,Lead Names\n";
        labels.forEach((label, i) => {
            let safeLeads = leadsArray[i].map(l => l.replace(/"/g, '""')).join('; ');
            csvContent += `"${label}",${counts[i]},"${safeLeads}"\n`;
        });
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${title}_Export.csv`);
        document.body.appendChild(link);
        link.click(); document.body.removeChild(link);
    };

    // --- CONTEXT MENU (COPY HUBSPOT ID) ---
    const ctxMenu = document.getElementById('lead-context-menu');
    const ctxCopyText = document.getElementById('ctx-copy-text');
    let currentTicketId = null;

    document.addEventListener('click', (e) => {
        const leadCell = e.target.closest('.lead-name-cell');
        if (leadCell) {
            currentTicketId = leadCell.getAttribute('data-ticket-id');
            ctxMenu.style.top = `${e.pageY + 10}px`;
            ctxMenu.style.left = `${e.pageX + 10}px`;
            ctxMenu.classList.remove('hidden');
            e.stopPropagation();
        } else if (!e.target.closest('#lead-context-menu')) {
            ctxMenu.classList.add('hidden');
        }
    });

    document.getElementById('ctx-copy-id').addEventListener('click', () => {
        if (currentTicketId && currentTicketId !== "N/A") {
            navigator.clipboard.writeText(currentTicketId);
            ctxCopyText.textContent = "Copied!";
            setTimeout(() => { ctxMenu.classList.add('hidden'); ctxCopyText.textContent = "Copy HubSpot ID"; }, 800);
        } else {
            alert('No HubSpot Ticket ID found for this lead in Data Lake.');
        }
    });

    // --- HEATMAP ALGORITHM ---
    const getHeatmapClass = (val) => {
        const num = parseFloat(val);
        if (num <= 1) return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
        if (num <= 3) return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20';
        if (num <= 5) return 'bg-orange-500/10 text-orange-400 border border-orange-500/20';
        return 'bg-red-500/10 text-red-400 border border-red-500/20';
    };

    // --- TIME FORMATTER (Converts 2.2 days -> 2d 4h 48m) ---
    const formatTime = (decimalDays) => {
        const val = parseFloat(decimalDays);
        if (!val || isNaN(val) || val === 0) return "0m";
        const d = Math.floor(val);
        const h = Math.floor((val - d) * 24);
        const m = Math.round(((val - d) * 24 - h) * 60);
        let parts = [];
        if (d > 0) parts.push(`${d}d`);
        if (h > 0) parts.push(`${h}h`);
        if (m > 0 || parts.length === 0) parts.push(`${m}m`);
        return parts.join(' ');
    };

    // --- MATRIX LOGIC ---
    const setMatrixDefaultDates = () => {
        const now = new Date();
        const currentDay = now.getDay(); 
        const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
        const start = new Date(now); start.setDate(now.getDate() + diffToMonday);
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

        if (syncIcon) syncIcon.classList.add('animate-spin');
        tbody.innerHTML = `<tr><td colspan="5" class="py-12 text-center text-gold/50 font-mono text-xs animate-pulse">Running DAX Emulator...</td></tr>`;

        try {
            const response = await fetch(DASHBOARD_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    action: 'get_matrix_data',
                    startDate: startEl.value, endDate: endEl.value,
                    secret: 'system_dashboard_init', prompt: 'system', model: 'gemini-3.5-flash-lite'
                })
            });

            const responseData = await response.json();

            if (responseData.status === 200 && responseData.data) {
                renderMatrix(responseData.data);
            } else {
                tbody.innerHTML = `<tr><td colspan="5" class="py-12 text-center text-red-500 font-mono text-xs">API Error.</td></tr>`;
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
            trMgr.className = "bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group border-b border-white/5";
            trMgr.innerHTML = `
                <td class="py-3 px-6 font-semibold flex items-center space-x-2"><i class="ph ph-plus-square text-gold/50 group-hover:text-gold transition-colors"></i><span>${mgr.managerName}</span></td>
                <td class="py-3 px-6 text-right font-mono">${mgr.tickets}</td>
                <td class="py-3 px-6 text-right font-mono text-gray-400">${mgr.introducer}</td>
                <td class="py-3 px-6 text-right font-mono"><span class="px-2 py-0.5 rounded text-[11px] ${getHeatmapClass(mgr.avgAging)}">${formatTime(mgr.avgAging)}</span></td>
                <td class="py-3 px-6 text-right font-mono text-gray-300">${formatTime(mgr.avgDays)}</td>
            `;
            tbody.appendChild(trMgr);

            mgr.statuses.forEach((stg, stgIndex) => {
                const trStg = document.createElement('tr');
                trStg.className = `mgr-${mgrIndex}-child bg-transparent hover:bg-white/5 transition-colors cursor-pointer hidden group border-b border-white/5`;
                trStg.innerHTML = `
                    <td class="py-2 px-6 flex items-center space-x-2 pl-12 border-l-2 border-white/10 ml-6"><i class="ph ph-caret-right text-gray-600 group-hover:text-gold transition-colors text-xs"></i><span class="text-sm text-gray-400">${stg.stageName}</span></td>
                    <td class="py-2 px-6 text-right font-mono text-sm text-gray-400">${stg.tickets}</td>
                    <td class="py-2 px-6 text-right font-mono text-sm text-gray-500">${stg.introducer}</td>
                    <td class="py-2 px-6 text-right font-mono"><span class="px-2 py-0.5 rounded text-[10px] ${getHeatmapClass(stg.avgAging)}">${formatTime(stg.avgAging)}</span></td>
                    <td class="py-2 px-6 text-right font-mono text-sm text-gray-500">${formatTime(stg.avgDays)}</td>
                `;
                tbody.appendChild(trStg);

                stg.leads.forEach(lead => {
                    const trLead = document.createElement('tr');
                    trLead.className = `mgr-${mgrIndex}-child stg-${mgrIndex}-${stgIndex}-child bg-black/20 hidden`;
                    
                    // UI FIX: Introducer Badges
                    const introBadge = lead.introducer === 'Yes' ? `<span class="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider">Yes</span>` : `<span class="text-gray-600">-</span>`;

                    trLead.innerHTML = `
                        <td class="py-1.5 px-6 pl-20 border-l-2 border-white/5 text-xs font-mono truncate max-w-xs cursor-pointer hover:text-white text-gray-400 transition-colors lead-name-cell" data-ticket-id="${lead.ticketId}" title="${lead.name}">- ${lead.name}</td>
                        <td class="py-1.5 px-6 text-right font-mono text-xs text-gray-600">-</td>
                        <td class="py-1.5 px-6 text-right font-mono text-xs text-gray-600">${introBadge}</td>
                        <td class="py-1.5 px-6 text-right font-mono"><span class="px-2 py-[1px] rounded text-[10px] ${getHeatmapClass(lead.aging)}">${formatTime(lead.aging)}</span></td>
                        <td class="py-1.5 px-6 text-right font-mono text-xs text-gray-600">${formatTime(lead.daysSince)}</td>
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
                    if (!r.classList.contains('hidden') || r.classList.contains('stg-')) r.classList.add('hidden');
                    else if (!r.classList.contains('stg-')) r.classList.remove('hidden'); 
                });
                document.querySelectorAll(`.mgr-${mgrIndex}-child .ph-caret-down`).forEach(i => i.classList.replace('ph-caret-down', 'ph-caret-right'));
                if (icon.classList.contains('ph-plus-square')) icon.classList.replace('ph-plus-square', 'ph-minus-square');
                else icon.classList.replace('ph-minus-square', 'ph-plus-square');
            });
        });
    };

    document.getElementById('matrix-refresh-btn').addEventListener('click', fetchMatrixData);
    document.getElementById('matrix-clear-btn').addEventListener('click', () => {
        document.getElementById('matrix-start-date').value = ''; document.getElementById('matrix-end-date').value = ''; fetchMatrixData(); 
    });

    // --- DASHBOARD REAL-TIME ANALYTICS ---
    let riskChartInstance = null; let bottleneckChartInstance = null;
    let currentRiskData = null; let currentBotData = null;

    const fetchDashboardData = async () => {
        const globalSyncIcon = document.getElementById('dashboard-global-sync-icon');
        if (globalSyncIcon) globalSyncIcon.classList.add('animate-spin');

        const filters = {
            risk: { start: document.getElementById('risk-start-date').value, end: document.getElementById('risk-end-date').value },
            bottleneck: { start: document.getElementById('bot-start-date').value, end: document.getElementById('bot-end-date').value }
        };

        try {
            const response = await fetch(DASHBOARD_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get_dashboard_stats', filters: filters, prompt: 'system_dashboard_init', model: 'gemini-3.5-flash-lite', history: [] })
            });

            const data = await response.json();

            if (data.status === 200 && data.stats) {
                currentRiskData = data.stats.riskChart; currentBotData = data.stats.bottleneckChart;
                document.getElementById('dash-total-tickets').textContent = data.stats.totalTickets.toLocaleString();
                document.getElementById('dash-today-volume').textContent = data.stats.todayCount.toLocaleString();
                document.getElementById('dash-top-region').textContent = data.stats.topCountryToday.name;
                document.getElementById('dash-top-region-count').textContent = `Daily Volume: ${data.stats.topCountryToday.count}`;
                document.getElementById('dash-approval-rate').textContent = data.stats.approvalRate.rate;
                document.getElementById('dash-approval-vol').textContent = `Resolved 30D: ${data.stats.approvalRate.volume}`;

                // UI FIX: Restored Standard Executive Summary Template
                const reportEl = document.getElementById('daily-report-content');
                if (reportEl) {
                    reportEl.innerHTML = `System pipeline integrity remains optimal. The Data Lake successfully synchronized <strong>${data.stats.totalTickets.toLocaleString()}</strong> active KYC tickets.<br><br><strong>Today's Activity:</strong> <strong>${data.stats.todayCount}</strong> new registrations were processed, with <strong>${data.stats.topCountryToday.name}</strong> leading daily ingestion volume.<br><br><strong>Trailing 30-Day Performance:</strong> The pipeline conversion efficiency stands at <strong>${data.stats.approvalRate.rate}</strong> across ${data.stats.approvalRate.volume} resolved applications.`;
                }

                renderCharts(currentRiskData, currentBotData);
            }
        } catch (error) { console.error("Dashboard Network Failure:", error); } 
        finally { if (globalSyncIcon) globalSyncIcon.classList.remove('animate-spin'); }
    };

    const renderCharts = (riskData, bottleneckData) => {
        Chart.defaults.color = '#888'; Chart.defaults.font.family = "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace";

        const riskCanvas = document.getElementById('riskChart');
        if (riskCanvas) {
            const riskCtx = riskCanvas.getContext('2d');
            if (riskChartInstance) riskChartInstance.destroy();
            const rawColors = riskData.labels.map(label => { if (label === 'Critical') return '#ef4444'; if (label === 'High') return '#f97316'; if (label === 'Medium') return '#DDAA33'; if (label === 'Low') return '#10b981'; return '#333333'; });
            riskChartInstance = new Chart(riskCtx, {
                type: 'doughnut', data: { labels: riskData.labels, datasets: [{ data: riskData.data, backgroundColor: rawColors, borderWidth: 0, hoverOffset: 4 }] },
                options: { devicePixelRatio: window.devicePixelRatio > 1 ? window.devicePixelRatio : 2, responsive: true, maintainAspectRatio: false, cutout: '75%', plugins: { legend: { display: false } }, onClick: (e, elements) => { if (elements.length > 0) openDrilldown(riskData.labels[elements[0].index], riskData.leads[elements[0].index]); } }
            });
            document.getElementById('risk-legend').innerHTML = riskData.labels.map((lbl, i) => `<div class="flex items-center space-x-2 text-xs text-gray-400 cursor-pointer hover:text-white transition-colors" onclick="document.getElementById('riskChart').dispatchEvent(new MouseEvent('click'))"><span class="w-3 h-3 rounded-full shadow-[0_0_8px_${rawColors[i]}]" style="background:${rawColors[i]}"></span><span>${lbl} <strong class="text-white ml-1">${riskData.data[i]}</strong></span></div>`).join('');
        }

        const bottleneckCanvas = document.getElementById('bottleneckChart');
        if (bottleneckCanvas) {
            const bottleneckCtx = bottleneckCanvas.getContext('2d');
            if (bottleneckChartInstance) bottleneckChartInstance.destroy();
            const gradients = bottleneckData.labels.map((_, i) => { const gradient = bottleneckCtx.createLinearGradient(0, 0, 0, 300); const colors = ['#DDAA33', '#10b981', '#3b82f6', '#f97316', '#ef4444', '#8b5cf6', '#ec4899']; const baseColor = colors[i % colors.length]; gradient.addColorStop(0, baseColor); gradient.addColorStop(1, '#111111'); return gradient; });
            bottleneckChartInstance = new Chart(bottleneckCtx, {
                type: 'bar', data: { labels: bottleneckData.labels, datasets: [{ data: bottleneckData.data, backgroundColor: gradients, borderRadius: { topLeft: 4, topRight: 4, bottomLeft: 0, bottomRight: 0 }, barPercentage: 0.6 }] },
                options: { devicePixelRatio: window.devicePixelRatio > 1 ? window.devicePixelRatio : 2, responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { font: { size: 10 } } }, x: { grid: { display: false }, ticks: { display: false } } }, plugins: { legend: { display: false } }, onClick: (e, elements) => { if (elements.length > 0) openDrilldown(bottleneckData.labels[elements[0].index], bottleneckData.leads[elements[0].index]); } }
            });
            const bgColors = ['#DDAA33', '#10b981', '#3b82f6', '#f97316', '#ef4444', '#8b5cf6', '#ec4899'];
            document.getElementById('bot-legend').innerHTML = bottleneckData.labels.map((lbl, i) => `<div class="flex items-center space-x-1.5 bg-white/5 px-2 py-1 rounded border border-white/5 text-[10px] text-gray-400 cursor-pointer hover:bg-white/10 transition-colors"><span class="w-2 h-2 rounded-sm" style="background:${bgColors[i % bgColors.length]}"></span><span class="truncate max-w-[100px]" title="${lbl}">${lbl}</span><strong class="text-white ml-1">${bottleneckData.data[i]}</strong></div>`).join('');
        }
    };

    const dashGlobalRefreshBtn = document.getElementById('dashboard-global-refresh-btn'); if (dashGlobalRefreshBtn) dashGlobalRefreshBtn.addEventListener('click', fetchDashboardData);
    document.getElementById('risk-start-date').addEventListener('change', fetchDashboardData); document.getElementById('risk-end-date').addEventListener('change', fetchDashboardData); document.getElementById('risk-clear-btn').addEventListener('click', () => { document.getElementById('risk-start-date').value = ''; document.getElementById('risk-end-date').value = ''; fetchDashboardData(); }); document.getElementById('risk-export-btn').addEventListener('click', () => { if(currentRiskData) downloadCSV('Risk_Stratification', currentRiskData.labels, currentRiskData.data, currentRiskData.leads); });
    document.getElementById('bot-start-date').addEventListener('change', fetchDashboardData); document.getElementById('bot-end-date').addEventListener('change', fetchDashboardData); document.getElementById('bot-clear-btn').addEventListener('click', () => { document.getElementById('bot-start-date').value = ''; document.getElementById('bot-end-date').value = ''; fetchDashboardData(); }); document.getElementById('bot-export-btn').addEventListener('click', () => { if(currentBotData) downloadCSV('Stage_Bottlenecks', currentBotData.labels, currentBotData.data, currentBotData.leads); });

    fetchDashboardData();
});
