// === XOALA COMMAND CENTER: DASHBOARD & ROUTING ===

const DASHBOARD_API_URL = 'https://xoala-command-center-middleware.osama-mohammad.workers.dev'; 

document.addEventListener('DOMContentLoaded', () => {
    
    // --- NAVIGATION ROUTING ---
    const navItems = document.querySelectorAll('.nav-item');
    const viewSections = document.querySelectorAll('.view-section');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            if (item.disabled) return;
            navItems.forEach(nav => nav.classList.remove('active'));
            viewSections.forEach(section => { section.classList.add('hidden'); section.classList.remove('flex', 'block'); });
            item.classList.add('active');
            const targetId = item.getAttribute('data-target');
            const targetSection = document.getElementById(targetId);
            
            if(targetSection) {
                targetSection.classList.remove('hidden');
                if (targetId === 'artemis-view') {
                    targetSection.classList.add('flex');
                } else {
                    targetSection.classList.add('block');
                    if (targetId === 'dashboard-view') {
                        fetchDashboardData(); 
                        if (typeof geoMapInstance !== 'undefined' && geoMapInstance && document.getElementById('geo-map').offsetWidth > 0) {
                            setTimeout(() => geoMapInstance.updateSize(), 100);
                        }
                    }
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
            if (typeof geoMapInstance !== 'undefined' && geoMapInstance && document.getElementById('geo-map').offsetWidth > 0) {
                setTimeout(() => geoMapInstance.updateSize(), 300);
            }
        });
    }

    const dateElement = document.getElementById('current-date');
    if (dateElement) dateElement.textContent = new Date().toISOString().split('T')[0];

    // --- 100% COMPREHENSIVE ISO-3166 MAPPING DICTIONARY ---
    const countryToIsoMap = {
        "united kingdom": "gb", "uk": "gb", "great britain": "gb", "england": "gb",
        "united states": "us", "usa": "us", "united states of america": "us",
        "canada": "ca", "australia": "au", "germany": "de", "france": "fr", "spain": "es", "italy": "it",
        "cyprus": "cy", "greece": "gr", "netherlands": "nl", "belgium": "be", "switzerland": "ch",
        "united arab emirates": "ae", "uae": "ae", "singapore": "sg", "hong kong": "hk", "japan": "jp",
        "india": "in", "pakistan": "pk", "malaysia": "my", "indonesia": "id", "brazil": "br",
        "mexico": "mx", "argentina": "ar", "south africa": "za", "nigeria": "ng", "estonia": "ee",
        "lithuania": "lt", "latvia": "lv", "ireland": "ie", "sweden": "se", "norway": "no",
        "denmark": "dk", "finland": "fi", "poland": "pl", "portugal": "pt", "romania": "ro", "czechia": "cz", 
        "bulgaria": "bg", "hungary": "hu", "austria": "at", "malta": "mt", "luxembourg": "lu", "new zealand": "nz", 
        "israel": "il", "china": "cn", "south korea": "kr", "thailand": "th", "vietnam": "vn", "philippines": "ph", 
        "egypt": "eg", "kenya": "ke", "colombia": "co", "peru": "pe", "chile": "cl", "turkey": "tr", "saudi arabia": "sa",
        "bvi": "vg", "cayman islands": "ky", "seychelles": "sc", "mauritius": "mu", "bahamas": "bs", "belize": "bz", 
        "vanuatu": "vu", "marshall islands": "mh", "georgia": "ge", "armenia": "am", "russia": "ru", "slovakia": "sk",
        "saint lucia": "lc", "czech republic": "cz", "saint vincent and the grenadines": "vc",
        "virgin islands (british)": "vg", "comoros": "km", "costa rica": "cr", "panama": "pa",
        "saint kitts and nevis": "kn", "isle of man": "im", "dominica": "dm", "oman": "om",
        "gibraltar": "gi", "algeria": "dz", "uruguay": "uy", "el salvador": "sv", "kazakhstan": "kz",
        "cook islands": "ck", "croatia": "hr", "mongolia": "mn", "dominican republic": "do",
        "anguilla": "ai", "liechtenstein": "li", "serbia": "rs", "albania": "al", "jordan": "jo",
        "jersey": "je", "honduras": "hn", "tanzania, united republic of": "tz"
    };

    const regionsMap = {
        'EMEA': ['gb', 'de', 'fr', 'es', 'it', 'cy', 'gr', 'nl', 'be', 'ch', 'ae', 'za', 'ee', 'lt', 'lv', 'ie', 'se', 'no', 'dk', 'fi', 'pl', 'pt', 'ro', 'cz', 'bg', 'hu', 'at', 'mt', 'lu', 'il', 'pk', 'in', 'ng', 'ke', 'eg', 'tr', 'sa', 'mu', 'sc', 'sk', 'ge', 'am', 'ru', 'km', 'im', 'om', 'gi', 'dz', 'hr', 'li', 'rs', 'al', 'jo', 'je', 'tz'],
        'APAC': ['au', 'sg', 'hk', 'jp', 'in', 'my', 'id', 'nz', 'cn', 'kr', 'th', 'vn', 'ph', 'vu', 'mh', 'kz', 'ck', 'mn'],
        'LATAM': ['br', 'mx', 'ar', 'cl', 'co', 'pe', 'vg', 'ky', 'bs', 'bz', 'lc', 'vc', 'cr', 'pa', 'kn', 'dm', 'uy', 'sv', 'do', 'ai', 'hn'],
        'NA': ['us', 'ca']
    };

    // --- DASHBOARD DRILLDOWN LOGIC ---
    const drilldownPanel = document.getElementById('drilldown-panel');
    const drilldownOverlay = document.getElementById('drilldown-overlay');
    const drilldownTitle = document.getElementById('drilldown-title');
    const drilldownList = document.getElementById('drilldown-list');
    const drilldownSearch = document.getElementById('drilldown-search');
    let currentDrilldownLeads = [];
    let currentDrilldownIso = null;

    const renderDrilldownList = (leads, isoCode = null) => {
        const flagHtml = isoCode ? `<img src="https://flagcdn.com/24x18/${isoCode}.png" class="w-4 h-3 inline-block mr-2 rounded-sm shadow-sm" />` : '';
        drilldownList.innerHTML = leads.map(name => `<li class="px-3 py-2 bg-white/5 hover:bg-gold/10 border border-white/5 rounded text-xs font-mono text-gray-300 truncate cursor-pointer transition-colors flex items-center" title="${name}">${flagHtml}${name}</li>`).join('');
    };

    const openDrilldown = (title, leads, isoCode = null) => {
        drilldownTitle.textContent = title;
        document.getElementById('drilldown-count').textContent = `${leads.length} Tickets Found`;
        currentDrilldownLeads = leads; currentDrilldownIso = isoCode;
        renderDrilldownList(leads, isoCode);
        if (drilldownSearch) drilldownSearch.value = ''; 
        drilldownOverlay.classList.remove('hidden');
        setTimeout(() => drilldownOverlay.classList.remove('opacity-0'), 10);
        drilldownPanel.classList.remove('translate-x-full');
    };

    if (drilldownSearch) {
        drilldownSearch.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            renderDrilldownList(currentDrilldownLeads.filter(l => l.toLowerCase().includes(term)), currentDrilldownIso);
        });
    }

    const closeDrilldown = () => {
        drilldownOverlay.classList.add('opacity-0');
        drilldownPanel.classList.add('translate-x-full');
        setTimeout(() => drilldownOverlay.classList.add('hidden'), 300);
    };

    document.getElementById('close-drilldown-btn').addEventListener('click', closeDrilldown);
    drilldownOverlay.addEventListener('click', closeDrilldown);

    const downloadCSV = (title, labels, counts, leadsArray) => {
        let csvContent = "data:text/csv;charset=utf-8,Category,Ticket Count,Lead Names\n";
        labels.forEach((label, i) => {
            let safeLeads = leadsArray[i].map(l => l.replace(/"/g, '""')).join('; ');
            csvContent += `"${label}",${counts[i]},"${safeLeads}"\n`;
        });
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", `${title}_Export.csv`);
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
    };

    const getHeatmapClass = (val) => {
        const num = parseFloat(val);
        if (isNaN(num)) return 'bg-gray-500/10 text-gray-400 border border-gray-500/20';
        if (num <= 1) return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
        if (num <= 3) return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20';
        if (num <= 5) return 'bg-orange-500/10 text-orange-400 border border-orange-500/20';
        return 'bg-red-500/10 text-red-400 border border-red-500/20';
    };

    const formatTime = (decimalDays) => {
        const val = parseFloat(decimalDays);
        if (isNaN(val) || val <= 0) return "0m";
        const d = Math.floor(val); const h = Math.floor((val - d) * 24); const m = Math.round(((val - d) * 24 - h) * 60);
        let parts = [];
        if (d > 0) parts.push(`${d}d`); if (h > 0) parts.push(`${h}h`); if (m > 0 || parts.length === 0) parts.push(`${m}m`);
        return parts.join(' ');
    };

    const setMatrixDefaultDates = () => {
        const now = new Date(); const currentDay = now.getDay(); const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
        const start = new Date(now); start.setDate(now.getDate() + diffToMonday);
        const end = new Date(now); if (currentDay === 0) end.setDate(now.getDate() - 2); else if (currentDay === 6) end.setDate(now.getDate() - 1); 
        const startEl = document.getElementById('matrix-start-date'); const endEl = document.getElementById('matrix-end-date');
        if(startEl) startEl.value = start.toISOString().split('T')[0];
        if(endEl) endEl.value = end.toISOString().split('T')[0];
    };
    setMatrixDefaultDates();

    // --- MATRIX FETCH & RENDER ---
    const fetchMatrixData = async () => {
        const syncIcon = document.getElementById('matrix-sync-icon');
        const tbody = document.getElementById('matrix-table-body');
        const startEl = document.getElementById('matrix-start-date'); const endEl = document.getElementById('matrix-end-date');
        if(!startEl || !endEl || !tbody) return;

        if (syncIcon) syncIcon.classList.add('animate-spin');
        tbody.innerHTML = `<tr><td colspan="5" class="py-12 text-center text-gold/50 font-mono text-xs animate-pulse">Running DAX Emulator...</td></tr>`;

        try {
            const response = await fetch(DASHBOARD_API_URL, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    action: 'get_matrix_data', 
                    startDate: startEl.value, 
                    endDate: endEl.value, 
                    secret: 'system_dashboard_init', 
                    prompt: 'system', 
                    model: 'gemini-3.5-flash-lite' 
                })
            });
            
            if (!response.ok) throw new Error("Server Error HTTP " + response.status);
            
            const textData = await response.text();
            let responseData;
            try {
                responseData = JSON.parse(textData);
            } catch (e) {
                throw new Error("Google Apps Script Authentication Block: Please set deployment access to 'Anyone'.");
            }

            if (responseData.status === 200 && responseData.data) renderMatrix(responseData.data);
            else tbody.innerHTML = `<tr><td colspan="5" class="py-12 text-center text-red-500 font-mono text-xs">${responseData.error || 'API Error'}</td></tr>`;
        } catch (error) {
            console.error("Matrix Network Failure:", error);
            tbody.innerHTML = `<tr><td colspan="5" class="py-12 text-center text-red-500 font-mono text-xs">Network Error: ${error.message}</td></tr>`;
        } finally { if (syncIcon) syncIcon.classList.remove('animate-spin'); }
    };

    const renderMatrix = (matrixData) => {
        const tbody = document.getElementById('matrix-table-body');
        if(!tbody) return;
        tbody.innerHTML = '';
        if (matrixData.length === 0) { tbody.innerHTML = `<tr><td colspan="5" class="py-12 text-center text-gray-500 font-mono text-xs">No tickets found in this date range.</td></tr>`; return; }

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
                    const leadRows = document.querySelectorAll(`.stg-${mgrIndex}-${stgIndex}-child`); const icon = trStg.querySelector('i');
                    leadRows.forEach(r => r.classList.toggle('hidden'));
                    if (icon.classList.contains('ph-caret-right')) icon.classList.replace('ph-caret-right', 'ph-caret-down'); else icon.classList.replace('ph-caret-down', 'ph-caret-right');
                });
            });
            trMgr.addEventListener('click', () => {
                const statusRows = document.querySelectorAll(`.mgr-${mgrIndex}-child`); const icon = trMgr.querySelector('i');
                statusRows.forEach(r => {
                    if (!r.classList.contains('hidden') || r.classList.contains('stg-')) r.classList.add('hidden');
                    else if (!r.classList.contains('stg-')) r.classList.remove('hidden'); 
                });
                document.querySelectorAll(`.mgr-${mgrIndex}-child .ph-caret-down`).forEach(i => i.classList.replace('ph-caret-down', 'ph-caret-right'));
                if (icon.classList.contains('ph-plus-square')) icon.classList.replace('ph-plus-square', 'ph-minus-square'); else icon.classList.replace('ph-minus-square', 'ph-plus-square');
            });
        });
    };

    document.getElementById('matrix-refresh-btn').addEventListener('click', fetchMatrixData);
    document.getElementById('matrix-clear-btn').addEventListener('click', () => { document.getElementById('matrix-start-date').value = ''; document.getElementById('matrix-end-date').value = ''; fetchMatrixData(); });

    let riskChartInstance = null; let bottleneckChartInstance = null; let geoMapInstance = null;
    let currentRiskData = null; let currentBotData = null; let currentGeoData = null;
    let currentRegionFilter = 'ALL';

    // --- DASHBOARD FETCH & RENDER ---
    const fetchDashboardData = async () => {
        const globalSyncIcon = document.getElementById('dashboard-global-sync-icon');
        if (globalSyncIcon) globalSyncIcon.classList.add('animate-spin');

        const filters = {
            risk: { start: document.getElementById('risk-start-date').value, end: document.getElementById('risk-end-date').value },
            bottleneck: { start: document.getElementById('bot-start-date').value, end: document.getElementById('bot-end-date').value },
            geo: { start: document.getElementById('geo-start-date').value, end: document.getElementById('geo-end-date').value }
        };

        try {
            const response = await fetch(DASHBOARD_API_URL, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    action: 'get_dashboard_stats', 
                    filters: filters, 
                    secret: 'system_dashboard_init', 
                    prompt: 'system_dashboard_init', 
                    model: 'gemini-3.5-flash-lite', 
                    history: [] 
                })
            });

            if (!response.ok) throw new Error(`Server Error HTTP ${response.status}`);

            const textData = await response.text();
            let data;
            try {
                data = JSON.parse(textData);
            } catch (e) {
                throw new Error("Google Apps Script Authentication Block: Please set deployment access to 'Anyone'.");
            }

            if (data.status === 200 && data.stats) {
                currentRiskData = data.stats.riskChart; currentBotData = data.stats.bottleneckChart; currentGeoData = data.stats.geoChart;
                
                document.getElementById('dash-total-tickets').textContent = data.stats.totalTickets.toLocaleString();
                document.getElementById('dash-today-volume').textContent = data.stats.todayCount.toLocaleString();
                document.getElementById('dash-top-region').textContent = data.stats.topCountryToday.name;
                document.getElementById('dash-top-region-count').textContent = `Daily Volume: ${data.stats.topCountryToday.count}`;
                document.getElementById('dash-approval-rate').textContent = data.stats.approvalRate.rate;
                
                const approvalVolEl = document.getElementById('dash-approval-vol');
                if (approvalVolEl) approvalVolEl.textContent = `Approved MTD: ${data.stats.approvalRate.approvedVolume} / ${data.stats.approvalRate.totalVolume}`;

                const date1 = document.getElementById('dash-today-date1'); if (date1) date1.textContent = data.stats.todayDate;
                const date2 = document.getElementById('dash-today-date2'); if (date2) date2.textContent = data.stats.todayDate;
                const date3 = document.getElementById('dash-approval-dates'); if (date3) date3.textContent = `${data.stats.approvalRate.startDate} TO ${data.stats.approvalRate.endDate}`;

                const reportEl = document.getElementById('daily-report-content');
                if (reportEl) {
                    reportEl.innerHTML = `System pipeline integrity remains optimal. The Data Lake successfully synchronized <strong>${data.stats.totalTickets.toLocaleString()}</strong> active KYC tickets.<br><br><strong>Today's Activity:</strong> <strong>${data.stats.todayCount}</strong> new registrations were processed, with <strong>${data.stats.topCountryToday.name}</strong> leading daily ingestion volume.<br><br><strong>Month-to-Date Performance:</strong> The pipeline conversion efficiency stands at <strong>${data.stats.approvalRate.rate}</strong> across ${data.stats.approvalRate.approvedVolume} strictly approved applications created this month.`;
                }
                renderCharts(currentRiskData, currentBotData);
                renderGeoMap(currentGeoData, currentRegionFilter);
            }
        } catch (error) { 
            console.error("Dashboard Network Failure:", error); 
            // Display error cleanly without crashing UI
            const reportEl = document.getElementById('daily-report-content');
            if (reportEl) {
                reportEl.innerHTML = `<span class="text-red-400">Connection Failed: ${error.message}</span>`;
            }
        } finally { 
            if (globalSyncIcon) globalSyncIcon.classList.remove('animate-spin'); 
        }
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

    const renderGeoMap = (geoData, regionFilter) => {
        const mapEl = document.getElementById('geo-map');
        if(!mapEl) return;
        mapEl.innerHTML = ''; 

        const mapDataObj = {};
        const hoverData = {}; 
        let unmappedCount = 0;
        let unmappedDetails = {};

        geoData.labels.forEach((countryName, i) => {
            const cleanName = countryName.toLowerCase().trim();
            if (!cleanName || cleanName === "unknown" || cleanName === "") return;

            const isoCode = countryToIsoMap[cleanName];
            
            if (isoCode) {
                const codeUpper = isoCode.toUpperCase();
                if (regionFilter === 'ALL' || (regionsMap[regionFilter] && regionsMap[regionFilter].includes(isoCode))) {
                    mapDataObj[codeUpper] = geoData.data[i];
                    hoverData[codeUpper] = { count: geoData.data[i], name: countryName, leads: geoData.leads[i], iso: isoCode };
                }
            } else { 
                unmappedCount += geoData.data[i]; 
                unmappedDetails[countryName] = geoData.data[i];
            }
        });

        if (unmappedCount > 0) {
            console.warn(`⚠️ [DIAGNOSTIC] ${unmappedCount} Tickets Unmapped in the Data Lake. These jurisdiction strings failed to resolve to an ISO-3166 code.`);
            console.table(unmappedDetails);
        }

        geoMapInstance = new jsVectorMap({
            selector: '#geo-map', map: 'world', backgroundColor: 'transparent', zoomOnScroll: false,
            focusOn: { x: 0.5, y: 0.5, scale: 1.05 }, 
            regionStyle: { 
                initial: { fill: '#1a1a1a', stroke: '#333333', strokeWidth: 0.5, fillOpacity: 1 }, 
                hover: { fill: '#F0D788', fillOpacity: 1 },
                selected: { fill: '#F0D788', fillOpacity: 1 }
            },
            visualizeData: { scale: ['#0f3f2b', '#10b981'], values: mapDataObj },
            onRegionTooltipShow(event, tooltip, code) {
                if (hoverData[code]) {
                    tooltip.text(`<div class="bg-surface border border-white/10 px-2 py-1 rounded text-xs font-mono"><img src="https://flagcdn.com/16x12/${hoverData[code].iso}.png" class="inline mr-1 rounded-sm"/> ${hoverData[code].name}: <span class="text-gold">${hoverData[code].count}</span></div>`, true);
                } else event.preventDefault(); 
            },
            onRegionClick(event, code) { if (hoverData[code]) openDrilldown(hoverData[code].name, hoverData[code].leads, hoverData[code].iso); }
        });

        const totalInView = Object.values(mapDataObj).reduce((a,b)=>a+b, 0);
        let maxCount = Math.max(...Object.values(mapDataObj));
        if (maxCount === -Infinity) maxCount = 0;

        const unmappedBadgeHtml = unmappedCount > 0 ? `<div class="ml-4 text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded cursor-pointer hover:bg-red-500/20 transition-colors" title="Check Console (F12) to see unmapped countries" onclick="document.getElementById('geo-view-toggle-btn').click()">⚠️ ${unmappedCount} Tickets Unmapped</div>` : '';

        document.getElementById('geo-legend').innerHTML = `
            <div class="flex flex-col items-center w-full">
                <div class="text-[10px] text-gray-500 font-mono tracking-widest uppercase flex items-center justify-center space-x-2">
                    <span>${totalInView} Tickets mapped in ${regionFilter === 'ALL' ? 'GLOBAL' : regionFilter} Region</span>${unmappedBadgeHtml}
                </div>
                <div class="flex items-center space-x-3 w-64 mt-2">
                    <span class="text-[10px] text-gray-500 font-mono">1</span>
                    <div class="h-2 flex-1 rounded-full bg-gradient-to-r from-[#0f3f2b] to-[#10b981] shadow-[0_0_10px_rgba(16,185,129,0.2)]"></div>
                    <span class="text-[10px] text-emerald-400 font-mono font-bold">${maxCount}</span>
                </div>
            </div>
        `;

        const geoTbody = document.getElementById('geo-table-body');
        if (geoTbody) {
            geoTbody.innerHTML = geoData.labels.map((countryName, idx) => {
                const count = geoData.data[idx];
                const cleanNameCheck = countryName.toLowerCase().trim();
                if (cleanNameCheck === "unknown" || cleanNameCheck === "") return ''; 

                const isoCode = countryToIsoMap[cleanNameCheck];
                const flagHtml = isoCode ? `<img src="https://flagcdn.com/24x18/${isoCode}.png" class="w-4 h-3 inline-block mr-2 rounded-sm shadow-sm" alt="${isoCode}" />` : '<span class="w-4 h-3 inline-block mr-2 text-red-500" title="Unmapped in Dictionary"><i class="ph ph-warning-circle"></i></span>';
                
                return `
                    <tr class="geo-table-row bg-white/5 border-b border-white/5 hover:bg-white/10 transition-colors cursor-pointer" data-iso="${isoCode || ''}">
                        <td class="py-2 px-4 flex items-center">${flagHtml}<span class="text-gray-300 capitalize">${countryName}</span></td>
                        <td class="py-2 px-4 text-right font-mono text-gold">${count}</td>
                    </tr>
                `;
            }).join('');

            geoTbody.querySelectorAll('.geo-table-row').forEach((row, i) => {
                const isoCode = row.getAttribute('data-iso');
                row.addEventListener('click', () => { const countryName = geoData.labels[i]; openDrilldown(countryName, geoData.leads[i], isoCode); });
                row.addEventListener('mouseenter', () => { if (isoCode && geoMapInstance) geoMapInstance.setSelectedRegions([isoCode.toUpperCase()]); });
                row.addEventListener('mouseleave', () => { if (isoCode && geoMapInstance) geoMapInstance.clearSelectedRegions(); });
            });
        }
    };

    const geoWidget = document.getElementById('geo-widget-container');
    const geoFullscreenBtn = document.getElementById('geo-fullscreen-btn');
    const geoFullscreenIcon = document.getElementById('geo-fullscreen-icon');
    const geoCloseFsBtn = document.getElementById('geo-close-fs-btn');
    
    document.getElementById('map-zoom-in').addEventListener('click', () => { const btn = document.querySelector('.jvm-zoomin'); if(btn) btn.click(); });
    document.getElementById('map-zoom-out').addEventListener('click', () => { const btn = document.querySelector('.jvm-zoomout'); if(btn) btn.click(); });
    document.getElementById('map-reset').addEventListener('click', () => { if(geoMapInstance) geoMapInstance.reset(); });

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            if (geoWidget.requestFullscreen) geoWidget.requestFullscreen();
            else if (geoWidget.webkitRequestFullscreen) geoWidget.webkitRequestFullscreen();
            else if (geoWidget.msRequestFullscreen) geoWidget.msRequestFullscreen();
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
            else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
            else if (document.msExitFullscreen) document.msExitFullscreen();
        }
    };

    document.addEventListener('fullscreenchange', () => {
        const isFS = !!document.fullscreenElement;
        if (isFS) {
            geoWidget.classList.remove('rounded-xl', 'border', 'shadow-2xl');
            geoWidget.classList.add('bg-obsidian', 'p-4'); 
            geoFullscreenIcon.classList.replace('ph-corners-out', 'ph-corners-in');
            geoCloseFsBtn.classList.remove('hidden');
            document.getElementById('geo-map-container').style.height = 'calc(100vh - 120px)';
        } else {
            geoWidget.classList.add('rounded-xl', 'border', 'shadow-2xl');
            geoWidget.classList.remove('bg-obsidian', 'p-4');
            geoFullscreenIcon.classList.replace('ph-corners-in', 'ph-corners-out');
            geoCloseFsBtn.classList.add('hidden');
            document.getElementById('geo-map-container').style.height = 'auto'; 
        }
        if (geoMapInstance && document.getElementById('geo-map').offsetWidth > 0) {
            setTimeout(() => geoMapInstance.updateSize(), 200);
        }
    });

    if (geoFullscreenBtn) geoFullscreenBtn.addEventListener('click', toggleFullscreen);
    if (geoCloseFsBtn) geoCloseFsBtn.addEventListener('click', toggleFullscreen);

    const geoViewToggleBtn = document.getElementById('geo-view-toggle-btn');
    const geoViewToggleIcon = document.getElementById('geo-view-toggle-icon');
    const geoMapContainer = document.getElementById('geo-map-container');
    const geoTableContainer = document.getElementById('geo-table-container');

    if (geoViewToggleBtn) {
        geoViewToggleBtn.addEventListener('click', () => {
            geoMapContainer.classList.toggle('hidden'); geoTableContainer.classList.toggle('hidden');
            if (geoMapContainer.classList.contains('hidden')) {
                geoViewToggleIcon.classList.replace('ph-list-dashes', 'ph-globe'); geoViewToggleBtn.title = "Switch to Map View";
            } else {
                geoViewToggleIcon.classList.replace('ph-globe', 'ph-list-dashes'); geoViewToggleBtn.title = "Switch to Table View";
                if (geoMapInstance && document.getElementById('geo-map').offsetWidth > 0) geoMapInstance.updateSize();
            }
        });
    }

    const dashGlobalRefreshBtn = document.getElementById('dashboard-global-refresh-btn'); if (dashGlobalRefreshBtn) dashGlobalRefreshBtn.addEventListener('click', fetchDashboardData);
    
    document.getElementById('risk-start-date').addEventListener('change', fetchDashboardData); document.getElementById('risk-end-date').addEventListener('change', fetchDashboardData); document.getElementById('risk-clear-btn').addEventListener('click', () => { document.getElementById('risk-start-date').value = ''; document.getElementById('risk-end-date').value = ''; fetchDashboardData(); }); document.getElementById('risk-export-btn').addEventListener('click', () => { if(currentRiskData) downloadCSV('Risk_Stratification', currentRiskData.labels, currentRiskData.data, currentRiskData.leads); });
    
    document.getElementById('bot-start-date').addEventListener('change', fetchDashboardData); document.getElementById('bot-end-date').addEventListener('change', fetchDashboardData); document.getElementById('bot-clear-btn').addEventListener('click', () => { document.getElementById('bot-start-date').value = ''; document.getElementById('bot-end-date').value = ''; fetchDashboardData(); }); document.getElementById('bot-export-btn').addEventListener('click', () => { if(currentBotData) downloadCSV('Stage_Bottlenecks', currentBotData.labels, currentBotData.data, currentBotData.leads); });

    document.getElementById('geo-start-date').addEventListener('change', fetchDashboardData); document.getElementById('geo-end-date').addEventListener('change', fetchDashboardData); document.getElementById('geo-clear-btn').addEventListener('click', () => { document.getElementById('geo-start-date').value = ''; document.getElementById('geo-end-date').value = ''; fetchDashboardData(); }); document.getElementById('geo-export-btn').addEventListener('click', () => { if(currentGeoData) downloadCSV('Geographic_Distribution', currentGeoData.labels, currentGeoData.data, currentGeoData.leads); });

    document.querySelectorAll('.geo-region-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.geo-region-btn').forEach(b => { b.classList.remove('active', 'text-white', 'bg-white/10'); b.classList.add('text-gray-500'); });
            e.target.classList.remove('text-gray-500'); e.target.classList.add('active', 'text-white', 'bg-white/10');
            currentRegionFilter = e.target.getAttribute('data-region');
            if (currentGeoData) renderGeoMap(currentGeoData, currentRegionFilter);
        });
    });

    fetchDashboardData();
});
