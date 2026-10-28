// === XOALA COMMAND CENTER: DASHBOARD, DATA LAKE & SOVEREIGN 360° PROFILE ENGINE ===

const DASHBOARD_API_URL = 'https://xoala-command-center-middleware.osama-mohammad.workers.dev'; 

document.addEventListener('DOMContentLoaded', () => {
    
    // --- COUNTRY ISO DICTIONARY ---
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
        "jersey": "je", "honduras": "hn", "tanzania, united republic of": "tz",
        "bahrain": "bh", "bangladesh": "bd", "british virgin islands": "vg", 
        "hong kong sar china": "hk", "sri lanka": "lk", "st. kitts & nevis": "kn", 
        "st. lucia": "lc", "st. vincent & grenadines": "vc", "tanzania": "tz", 
        "türkiye": "tr", "ukraine": "ua", "french polynesia": "pf"
    };

    const regionsMap = {
        'EMEA': ['gb', 'de', 'fr', 'es', 'it', 'cy', 'gr', 'nl', 'be', 'ch', 'ae', 'za', 'ee', 'lt', 'lv', 'ie', 'se', 'no', 'dk', 'fi', 'pl', 'pt', 'ro', 'cz', 'bg', 'hu', 'at', 'mt', 'lu', 'il', 'pk', 'in', 'ng', 'ke', 'eg', 'tr', 'sa', 'mu', 'sc', 'sk', 'ge', 'am', 'ru', 'km', 'im', 'om', 'gi', 'dz', 'hr', 'li', 'rs', 'al', 'jo', 'je', 'tz', 'bh', 'ua'],
        'APAC': ['au', 'sg', 'hk', 'jp', 'in', 'my', 'id', 'nz', 'cn', 'kr', 'th', 'vn', 'ph', 'vu', 'mh', 'kz', 'ck', 'mn', 'bd', 'lk', 'pf'],
        'LATAM': ['br', 'mx', 'ar', 'cl', 'co', 'pe', 'vg', 'ky', 'bs', 'bz', 'lc', 'vc', 'cr', 'pa', 'kn', 'dm', 'uy', 'sv', 'do', 'ai', 'hn'],
        'NA': ['us', 'ca']
    };

    const escapeHtml = (str) => String(str ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

    const getFlagImgHtml = (countryName, sizeClass = "w-4 h-3") => {
        if (!countryName) return `<i class="ph ph-globe text-gray-500 mr-1.5"></i>`;
        const clean = String(countryName).toLowerCase().split('|')[0].trim();
        const iso = countryToIsoMap[clean];
        return iso
            ? `<img src="https://flagcdn.com/24x18/${iso}.png" class="${sizeClass} inline-block mr-1.5 rounded-sm shadow-sm" alt="${escapeHtml(countryName)}" />`
            : `<i class="ph ph-globe text-gray-500 mr-1.5"></i>`;
    };

    // --- NAVIGATION ROUTING ---
    const navItems = document.querySelectorAll('.nav-item');
    const viewSections = document.querySelectorAll('.view-section');

    navItems.forEach(item => {
        item.addEventListener('click', async () => {
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
                        fetchDashboardData(false); 
                        if (typeof geoMapInstance !== 'undefined' && geoMapInstance && document.getElementById('geo-map').offsetWidth > 0) {
                            setTimeout(() => geoMapInstance.updateSize(), 100);
                        }
                    }
                    if (targetId === 'daily-report-view') { 
                        if (!currentRiskData) {
                            await fetchDashboardData(false);
                        }
                        await fetchMatrixData(); 
                    }
                    if (targetId === 'datalake-view') {
                        await fetchAndRenderDataLakeGrid(false);
                    }
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

    // Global Quick-Open Dossier Search in Top Header
    const globalSearchInput = document.getElementById('global-dossier-search');
    if (globalSearchInput) {
        globalSearchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && globalSearchInput.value.trim() !== '') {
                openSovereignProfileModal(globalSearchInput.value.trim());
            }
        });
    }

    // --- DRILLDOWN PANEL (NOW OPENS 360° PROFILE ON CLICK) ---
    const drilldownPanel = document.getElementById('drilldown-panel');
    const drilldownOverlay = document.getElementById('drilldown-overlay');
    const drilldownTitle = document.getElementById('drilldown-title');
    const drilldownList = document.getElementById('drilldown-list');
    const drilldownSearch = document.getElementById('drilldown-search');
    let currentDrilldownLeads = [];
    let currentDrilldownIso = null;

    const renderDrilldownList = (leads, overrideIso = null) => {
        drilldownList.innerHTML = leads.map(leadItem => {
            let name = typeof leadItem === 'string' ? leadItem : leadItem.name;
            let country = typeof leadItem === 'string' ? null : leadItem.country;
            
            let isoCode = overrideIso;
            if (!isoCode && country && !country.toLowerCase().includes("unknown") && !country.toLowerCase().includes("unspecified")) {
                isoCode = countryToIsoMap[country.toLowerCase().trim()];
            }
            
            const flagHtml = isoCode ? `<img src="https://flagcdn.com/24x18/${isoCode}.png" class="w-4 h-3 inline-block mr-2 rounded-sm shadow-sm" />` : '<span class="w-4 h-3 inline-block mr-2 text-gray-600"><i class="ph ph-flag"></i></span>';
            return `<li class="drilldown-lead-item px-3 py-2.5 bg-white/5 hover:bg-gold/15 border border-white/5 hover:border-gold/30 rounded text-xs font-mono text-gray-200 truncate cursor-pointer transition-all flex items-center justify-between group" data-lead-name="${escapeHtml(name)}" title="Click to open 360° KYB Dossier: ${escapeHtml(name)}">
                <div class="flex items-center truncate">${flagHtml}<span class="truncate">${escapeHtml(name)}</span></div>
                <i class="ph ph-arrow-square-out text-gold opacity-0 group-hover:opacity-100 transition-opacity ml-2 flex-shrink-0"></i>
            </li>`;
        }).join('');

        drilldownList.querySelectorAll('.drilldown-lead-item').forEach(li => {
            li.addEventListener('click', () => {
                const leadName = li.getAttribute('data-lead-name');
                if (leadName) openSovereignProfileModal(leadName);
            });
        });
    };

    const openDrilldown = (title, leads, isoCode = null) => {
        drilldownTitle.textContent = title;
        document.getElementById('drilldown-count').textContent = `${leads.length} Tickets Found • Click any lead for 360° Dossier`;
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
            renderDrilldownList(currentDrilldownLeads.filter(l => {
                const name = typeof l === 'string' ? l : l.name;
                return name.toLowerCase().includes(term);
            }), currentDrilldownIso);
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
        let csvContent = "data:text/csv;charset=utf-8,Category,Ticket Count,Lead Names,Countries\n";
        labels.forEach((label, i) => {
            let leadNames = []; let leadCountries = [];
            leadsArray[i].forEach(l => {
                if (typeof l === 'string') { leadNames.push(l); leadCountries.push('Unspecified / Blank'); }
                else { leadNames.push(l.name); leadCountries.push(l.country || 'Unspecified / Blank'); }
            });
            let safeLeads = leadNames.map(l => l.replace(/"/g, '""')).join('; ');
            let safeCountries = leadCountries.map(c => c.replace(/"/g, '""')).join('; ');
            csvContent += `"${label}",${counts[i]},"${safeLeads}","${safeCountries}"\n`;
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

    // --- DAILY REPORT MATRIX ---
    const setMatrixDefaultDates = () => {
        const now = new Date(); const currentDay = now.getDay(); const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
        const start = new Date(now); start.setDate(now.getDate() + diffToMonday);
        const end = new Date(now); if (currentDay === 0) end.setDate(now.getDate() - 2); else if (currentDay === 6) end.setDate(now.getDate() - 1); 
        const startEl = document.getElementById('matrix-start-date'); const endEl = document.getElementById('matrix-end-date');
        if(startEl) startEl.value = start.toISOString().split('T')[0];
        if(endEl) endEl.value = end.toISOString().split('T')[0];
    };
    setMatrixDefaultDates();

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
                body: JSON.stringify({ action: 'get_matrix_data', startDate: startEl.value, endDate: endEl.value, secret: 'system_dashboard_init', prompt: 'system', model: 'gemini-3.5-flash-lite' })
            });
            if (!response.ok) throw new Error("Server Error HTTP " + response.status);
            const textData = await response.text();
            let responseData = JSON.parse(textData);
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
                <td class="py-3 px-6 font-semibold flex items-center space-x-2"><i class="ph ph-plus-square text-gold/50 group-hover:text-gold transition-colors"></i><span>${escapeHtml(mgr.managerName)}</span></td>
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
                    <td class="py-2 px-6 flex items-center space-x-2 pl-12 border-l-2 border-white/10 ml-6"><i class="ph ph-caret-right text-gray-600 group-hover:text-gold transition-colors text-xs"></i><span class="text-sm text-gray-400">${escapeHtml(stg.stageName)}</span></td>
                    <td class="py-2 px-6 text-right font-mono text-sm text-gray-400">${stg.tickets}</td>
                    <td class="py-2 px-6 text-right font-mono text-sm text-gray-500">${stg.introducer}</td>
                    <td class="py-2 px-6 text-right font-mono"><span class="px-2 py-0.5 rounded text-[10px] ${getHeatmapClass(stg.avgAging)}">${formatTime(stg.avgAging)}</span></td>
                    <td class="py-2 px-6 text-right font-mono text-sm text-gray-500">${formatTime(stg.avgDays)}</td>
                `;
                tbody.appendChild(trStg);

                stg.leads.forEach(lead => {
                    const trLead = document.createElement('tr');
                    trLead.className = `mgr-${mgrIndex}-child stg-${mgrIndex}-${stgIndex}-child bg-black/20 hover:bg-gold/10 transition-colors hidden`;
                    const introBadge = lead.introducer === 'Yes' ? `<span class="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider">Yes</span>` : `<span class="text-gray-600">-</span>`;
                    trLead.innerHTML = `
                        <td class="py-1.5 px-6 pl-20 border-l-2 border-white/5 text-xs font-mono truncate max-w-xs cursor-pointer hover:text-gold text-gray-300 transition-colors lead-name-cell flex items-center space-x-2" data-ticket-id="${escapeHtml(lead.ticketId)}" data-lead-name="${escapeHtml(lead.name)}" title="Click to open 360° KYB Dossier: ${escapeHtml(lead.name)}"><i class="ph ph-identification-card text-gold/70"></i><span>${escapeHtml(lead.name)}</span></td>
                        <td class="py-1.5 px-6 text-right font-mono text-xs text-gray-600">-</td>
                        <td class="py-1.5 px-6 text-right font-mono text-xs text-gray-600">${introBadge}</td>
                        <td class="py-1.5 px-6 text-right font-mono"><span class="px-2 py-[1px] rounded text-[10px] ${getHeatmapClass(lead.aging)}">${formatTime(lead.aging)}</span></td>
                        <td class="py-1.5 px-6 text-right font-mono text-xs text-gray-600">${formatTime(lead.daysSince)}</td>
                    `;
                    trLead.querySelector('.lead-name-cell').addEventListener('click', (e) => {
                        e.stopPropagation();
                        openSovereignProfileModal(lead.ticketId !== 'N/A' ? lead.ticketId : lead.name);
                    });
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
                    if (!r.classList.contains('hidden') || r.classList.includes?.('stg-')) r.classList.add('hidden');
                    else if (!r.className.includes('-child bg-black/20')) r.classList.remove('hidden'); 
                });
                document.querySelectorAll(`.mgr-${mgrIndex}-child .ph-caret-down`).forEach(i => i.classList.replace('ph-caret-down', 'ph-caret-right'));
                if (icon.classList.contains('ph-plus-square')) icon.classList.replace('ph-plus-square', 'ph-minus-square'); else icon.classList.replace('ph-minus-square', 'ph-plus-square');
            });
        });
    };

    document.getElementById('matrix-refresh-btn').addEventListener('click', fetchMatrixData);
    document.getElementById('matrix-clear-btn').addEventListener('click', () => { document.getElementById('matrix-start-date').value = ''; document.getElementById('matrix-end-date').value = ''; fetchMatrixData(); });

    // --- DASHBOARD CHARTS & GEO MAP ---
    let riskChartInstance = null; let bottleneckChartInstance = null; let geoMapInstance = null;
    let currentRiskData = null; let currentBotData = null; let currentGeoData = null;
    let currentRegionFilter = 'ALL';

    const fetchDashboardData = async (forceRefreshFlag = false) => {
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
                body: JSON.stringify({ action: 'get_dashboard_stats', filters: filters, secret: 'system_dashboard_init', prompt: 'system_dashboard_init', model: 'gemini-3.5-flash-lite', history: [], forceRefresh: forceRefreshFlag })
            });
            if (!response.ok) throw new Error(`Server Error HTTP ${response.status}`);
            const textData = await response.text();
            let data = JSON.parse(textData);

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
                if (reportEl) reportEl.innerHTML = `System pipeline integrity remains optimal. The Data Lake successfully synchronized <strong>${data.stats.totalTickets.toLocaleString()}</strong> active KYC tickets.<br><br><strong>Today's Activity:</strong> <strong>${data.stats.todayCount}</strong> new registrations were processed, with <strong>${data.stats.topCountryToday.name}</strong> leading daily ingestion volume.<br><br><strong>Month-to-Date Performance:</strong> The pipeline conversion efficiency stands at <strong>${data.stats.approvalRate.rate}</strong> across ${data.stats.approvalRate.approvedVolume} strictly approved applications created this month.`;
                
                renderCharts(currentRiskData, currentBotData);
                renderGeoMap(currentGeoData, currentRegionFilter);
            }
        } catch (error) { 
            console.error("Dashboard Network Failure:", error); 
        } finally { if (globalSyncIcon) globalSyncIcon.classList.remove('animate-spin'); }
    };

    const renderCharts = (riskData, bottleneckData) => {
        Chart.defaults.color = '#888'; Chart.defaults.font.family = "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace";

        const riskCanvas = document.getElementById('riskChart');
        if (riskCanvas) {
            const existingRiskChart = Chart.getChart(riskCanvas);
            if (existingRiskChart) existingRiskChart.destroy();
            if (riskChartInstance) riskChartInstance.destroy();
            
            const riskCtx = riskCanvas.getContext('2d');
            const rawColors = riskData.labels.map(label => { 
                const l = label.toLowerCase();
                if (l.includes('critical') || l.includes('decline')) return '#ef4444'; 
                if (l.includes('high')) return '#f97316'; 
                if (l.includes('medium')) return '#DDAA33'; 
                if (l.includes('low')) return '#10b981'; 
                return '#333333'; 
            });
            
            riskChartInstance = new Chart(riskCtx, {
                type: 'doughnut', data: { labels: riskData.labels, datasets: [{ data: riskData.data, backgroundColor: rawColors, borderWidth: 0, hoverOffset: 4 }] },
                options: { devicePixelRatio: window.devicePixelRatio > 1 ? window.devicePixelRatio : 2, responsive: true, maintainAspectRatio: false, cutout: '75%', plugins: { legend: { display: false } }, onClick: (e, elements) => { if (elements.length > 0) openDrilldown(riskData.labels[elements[0].index], riskData.leads[elements[0].index]); } }
            });

            const riskLegendContainer = document.getElementById('risk-legend');
            riskLegendContainer.innerHTML = riskData.labels.map((lbl, i) => 
                `<div class="risk-legend-item flex items-center space-x-2 text-xs text-gray-400 cursor-pointer hover:text-white transition-colors" data-index="${i}">
                    <span class="w-3 h-3 rounded-full shadow-[0_0_8px_${rawColors[i]}]" style="background:${rawColors[i]}"></span>
                    <span>${escapeHtml(lbl)} <strong class="text-white ml-1">${riskData.data[i]}</strong></span>
                </div>`
            ).join('');

            riskLegendContainer.querySelectorAll('.risk-legend-item').forEach(item => {
                item.addEventListener('click', () => { const idx = parseInt(item.getAttribute('data-index')); openDrilldown(riskData.labels[idx], riskData.leads[idx]); });
            });
        }

        const bottleneckCanvas = document.getElementById('bottleneckChart');
        if (bottleneckCanvas) {
            const existingBotChart = Chart.getChart(bottleneckCanvas);
            if (existingBotChart) existingBotChart.destroy();
            if (bottleneckChartInstance) bottleneckChartInstance.destroy();

            const bottleneckCtx = bottleneckCanvas.getContext('2d');
            const colors = ['#DDAA33', '#10b981', '#3b82f6', '#f97316', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f59e0b', '#14b8a6', '#6366f1', '#f43f5e', '#84cc16', '#a855f7', '#d946ef', '#2dd4bf', '#0ea5e9', '#eab308', '#64748b'];
            const solidBackgrounds = bottleneckData.labels.map((_, i) => colors[i % colors.length] + 'E6');

            bottleneckChartInstance = new Chart(bottleneckCtx, {
                type: 'bar', 
                data: { labels: bottleneckData.labels, datasets: [{ data: bottleneckData.data, backgroundColor: solidBackgrounds, borderRadius: { topLeft: 4, topRight: 4, bottomLeft: 0, bottomRight: 0 }, barPercentage: 0.6 }] },
                options: { devicePixelRatio: window.devicePixelRatio > 1 ? window.devicePixelRatio : 2, responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { font: { size: 10 } } }, x: { grid: { display: false }, ticks: { display: false } } }, plugins: { legend: { display: false } }, onClick: (e, elements) => { if (elements.length > 0) openDrilldown(bottleneckData.labels[elements[0].index], bottleneckData.leads[elements[0].index]); } }
            });
            
            const botLegendContainer = document.getElementById('bot-legend');
            botLegendContainer.innerHTML = bottleneckData.labels.map((lbl, i) => 
                `<div class="bot-legend-item flex items-center space-x-1.5 bg-white/5 px-2 py-1 rounded border border-white/5 text-[10px] text-gray-400 cursor-pointer hover:bg-white/10 transition-colors" data-index="${i}">
                    <span class="w-2 h-2 rounded-sm shadow-[0_0_8px_${colors[i % colors.length]}]" style="background:${colors[i % colors.length]}"></span>
                    <span class="truncate max-w-[150px]" title="${escapeHtml(lbl)}">${escapeHtml(lbl)}</span>
                    <strong class="text-white ml-1">${bottleneckData.data[i]}</strong>
                </div>`
            ).join('');

            botLegendContainer.querySelectorAll('.bot-legend-item').forEach(item => {
                item.addEventListener('click', () => { const idx = parseInt(item.getAttribute('data-index')); openDrilldown(bottleneckData.labels[idx], bottleneckData.leads[idx]); });
            });
        }
    };

    const renderGeoMap = (geoData, regionFilter) => {
        const mapEl = document.getElementById('geo-map');
        if(!mapEl) return;
        mapEl.innerHTML = ''; 

        const mapDataObj = {};
        const hoverData = {}; 
        let unmappedCount = 0;
        let unspecifiedCount = 0;
        let unspecifiedLeads = [];

        geoData.labels.forEach((countryName, i) => {
            const cleanName = countryName.toLowerCase().trim();
            if (!cleanName || cleanName === "unknown" || cleanName.includes("unspecified") || cleanName.includes("blank")) {
                unspecifiedCount += geoData.data[i];
                unspecifiedLeads = unspecifiedLeads.concat(geoData.leads[i] || []);
                return;
            }
            const isoCode = countryToIsoMap[cleanName];
            if (isoCode) {
                const codeUpper = isoCode.toUpperCase();
                if (regionFilter === 'ALL' || (regionsMap[regionFilter] && regionsMap[regionFilter].includes(isoCode))) {
                    mapDataObj[codeUpper] = geoData.data[i];
                    hoverData[codeUpper] = { count: geoData.data[i], name: countryName, leads: geoData.leads[i], iso: isoCode };
                }
            } else { 
                unmappedCount += geoData.data[i]; 
            }
        });

        if (mapEl.offsetWidth > 0) {
            geoMapInstance = new jsVectorMap({
                selector: '#geo-map', map: 'world', backgroundColor: 'transparent', zoomOnScroll: false,
                focusOn: { x: 0.5, y: 0.5, scale: 1.05 }, 
                regionStyle: { initial: { fill: '#1a1a1a', stroke: '#333333', strokeWidth: 0.5, fillOpacity: 1 }, hover: { fill: '#F0D788', fillOpacity: 1 }, selected: { fill: '#F0D788', fillOpacity: 1 } },
                visualizeData: { scale: ['#0f3f2b', '#10b981'], values: mapDataObj },
                onRegionTooltipShow(event, tooltip, code) {
                    if (hoverData[code]) {
                        tooltip.text(`<div class="bg-surface border border-white/10 px-2 py-1 rounded text-xs font-mono"><img src="https://flagcdn.com/16x12/${hoverData[code].iso}.png" class="inline mr-1 rounded-sm"/> ${hoverData[code].name}: <span class="text-gold">${hoverData[code].count}</span></div>`, true);
                    } else event.preventDefault(); 
                },
                onRegionClick(event, code) { if (hoverData[code]) openDrilldown(hoverData[code].name, hoverData[code].leads, hoverData[code].iso); }
            });
        }

        const totalMappedInView = Object.values(mapDataObj).reduce((a,b)=>a+b, 0);
        const grandTotalInView = regionFilter === 'ALL' ? (totalMappedInView + unspecifiedCount + unmappedCount) : totalMappedInView;
        let maxCount = Math.max(...Object.values(mapDataObj));
        if (maxCount === -Infinity) maxCount = 0;

        const unspecifiedBadgeHtml = (regionFilter === 'ALL' && unspecifiedCount > 0) 
            ? `<button id="geo-unspecified-badge" class="ml-2 text-[10px] bg-white/5 text-gray-300 border border-white/10 px-2 py-0.5 rounded cursor-pointer hover:bg-gold/10 hover:text-gold hover:border-gold/30 transition-colors">${unspecifiedCount.toLocaleString()} Unspecified / Blank</button>` 
            : '';

        document.getElementById('geo-legend').innerHTML = `
            <div class="flex flex-col items-center w-full">
                <div class="text-[10px] text-gray-400 font-mono tracking-widest uppercase flex flex-wrap items-center justify-center gap-2">
                    <span><strong class="text-emerald-400">${totalMappedInView.toLocaleString()}</strong> Mapped in ${regionFilter === 'ALL' ? 'GLOBAL' : regionFilter}</span>
                    ${unspecifiedBadgeHtml}
                    <span class="text-gray-600">|</span>
                    <span>Total: <strong class="text-gold">${grandTotalInView.toLocaleString()}</strong> Tickets</span>
                </div>
                <div class="flex items-center space-x-3 w-64 mt-2">
                    <span class="text-[10px] text-gray-500 font-mono">1</span>
                    <div class="h-2 flex-1 rounded-full bg-gradient-to-r from-[#0f3f2b] to-[#10b981] shadow-[0_0_10px_rgba(16,185,129,0.2)]"></div>
                    <span class="text-[10px] text-emerald-400 font-mono font-bold">${maxCount}</span>
                </div>
            </div>
        `;

        const unspecBtn = document.getElementById('geo-unspecified-badge');
        if (unspecBtn) unspecBtn.addEventListener('click', () => openDrilldown('Unspecified / Blank Country', unspecifiedLeads, null));

        const geoTbody = document.getElementById('geo-table-body');
        if (geoTbody) {
            let tableTotalTickets = 0;
            const visibleRows = [];

            geoData.labels.forEach((countryName, idx) => {
                const count = geoData.data[idx];
                const cleanNameCheck = countryName.toLowerCase().trim();
                const isUnspecified = (!cleanNameCheck || cleanNameCheck === "unknown" || cleanNameCheck.includes("unspecified") || cleanNameCheck.includes("blank"));
                const isoCode = isUnspecified ? null : countryToIsoMap[cleanNameCheck];

                if (regionFilter !== 'ALL') {
                    if (isUnspecified || !isoCode || !regionsMap[regionFilter] || !regionsMap[regionFilter].includes(isoCode)) return;
                }

                tableTotalTickets += count;
                visibleRows.push({ countryName: isUnspecified ? "Unspecified / Blank" : countryName, count: count, isoCode: isoCode, isUnspecified: isUnspecified, leads: geoData.leads[idx] });
            });

            const rowsHtml = visibleRows.map((item, rowIdx) => {
                let flagHtml = item.isoCode
                    ? `<img src="https://flagcdn.com/24x18/${item.isoCode}.png" class="w-4 h-3 inline-block mr-2 rounded-sm shadow-sm" />`
                    : `<span class="w-4 h-3 inline-block mr-2 text-gray-500"><i class="ph ph-question"></i></span>`;
                return `<tr class="geo-table-row bg-white/5 border-b border-white/5 hover:bg-white/10 transition-colors cursor-pointer" data-row-idx="${rowIdx}" data-iso="${item.isoCode || ''}">
                    <td class="py-2 px-4 flex items-center">${flagHtml}<span class="${item.isUnspecified ? 'text-gray-400 italic' : 'text-gray-300 capitalize'}">${escapeHtml(item.countryName)}</span></td>
                    <td class="py-2 px-4 text-right font-mono text-gold">${item.count.toLocaleString()}</td>
                </tr>`;
            }).join('');

            const totalRowHtml = `
                <tr class="bg-obsidian border-y border-gold/40 font-mono text-xs">
                    <td class="py-3 px-4 font-bold text-gold uppercase tracking-wider flex items-center space-x-2">
                        <i class="ph ph-sigma text-base"></i>
                        <span>Total Tickets (${regionFilter === 'ALL' ? 'GLOBAL' : regionFilter} — ${visibleRows.length} Categories)</span>
                    </td>
                    <td class="py-3 px-4 text-right font-bold text-white text-sm">${tableTotalTickets.toLocaleString()}</td>
                </tr>
            `;

            geoTbody.innerHTML = totalRowHtml + rowsHtml + totalRowHtml;

            geoTbody.querySelectorAll('.geo-table-row').forEach((row) => {
                const rIdx = parseInt(row.getAttribute('data-row-idx'));
                const item = visibleRows[rIdx];
                row.addEventListener('click', () => openDrilldown(item.countryName, item.leads, item.isoCode));
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
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
        }
    };

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
                geoViewToggleIcon.classList.replace('ph-list-dashes', 'ph-globe'); 
            } else { 
                geoViewToggleIcon.classList.replace('ph-globe', 'ph-list-dashes'); 
                if (currentGeoData) renderGeoMap(currentGeoData, currentRegionFilter);
            }
        });
    }

    const dashGlobalRefreshBtn = document.getElementById('dashboard-global-refresh-btn'); 
    if (dashGlobalRefreshBtn) dashGlobalRefreshBtn.addEventListener('click', () => fetchDashboardData(true));
    
    document.getElementById('risk-start-date').addEventListener('change', () => fetchDashboardData(false)); document.getElementById('risk-end-date').addEventListener('change', () => fetchDashboardData(false)); document.getElementById('risk-clear-btn').addEventListener('click', () => { document.getElementById('risk-start-date').value = ''; document.getElementById('risk-end-date').value = ''; fetchDashboardData(false); }); document.getElementById('risk-export-btn').addEventListener('click', () => { if(currentRiskData) downloadCSV('Risk_Stratification', currentRiskData.labels, currentRiskData.data, currentRiskData.leads); });
    document.getElementById('bot-start-date').addEventListener('change', () => fetchDashboardData(false)); document.getElementById('bot-end-date').addEventListener('change', () => fetchDashboardData(false)); document.getElementById('bot-clear-btn').addEventListener('click', () => { document.getElementById('bot-start-date').value = ''; document.getElementById('bot-end-date').value = ''; fetchDashboardData(false); }); document.getElementById('bot-export-btn').addEventListener('click', () => { if(currentBotData) downloadCSV('Stage_Bottlenecks', currentBotData.labels, currentBotData.data, currentBotData.leads); });
    document.getElementById('geo-start-date').addEventListener('change', () => fetchDashboardData(false)); document.getElementById('geo-end-date').addEventListener('change', () => fetchDashboardData(false)); document.getElementById('geo-clear-btn').addEventListener('click', () => { document.getElementById('geo-start-date').value = ''; document.getElementById('geo-end-date').value = ''; fetchDashboardData(false); }); document.getElementById('geo-export-btn').addEventListener('click', () => { if(currentGeoData) downloadCSV('Geographic_Distribution', currentGeoData.labels, currentGeoData.data, currentGeoData.leads); });

    document.querySelectorAll('.geo-region-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.geo-region-btn').forEach(b => { b.classList.remove('active', 'text-white', 'bg-white/10'); b.classList.add('text-gray-500'); });
            e.target.classList.remove('text-gray-500'); e.target.classList.add('active', 'text-white', 'bg-white/10');
            currentRegionFilter = e.target.getAttribute('data-region');
            if (currentGeoData) renderGeoMap(currentGeoData, currentRegionFilter);
        });
    });

    // ============================================================================
    // VIEW 4: SOVEREIGN KYC DATA LAKE MASTER GRID (TABULATOR)
    // ============================================================================
    let dataLakeGridData = [];
    let dataLakeTabulator = null;
    let activeCohortMode = 'all';

    const fetchAndRenderDataLakeGrid = async (forceRefresh = false) => {
        const syncIcon = document.getElementById('datalake-sync-icon');
        if (syncIcon) syncIcon.classList.add('animate-spin');

        try {
            if (dataLakeGridData.length === 0 || forceRefresh) {
                const res = await fetch(DASHBOARD_API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'get_datalake_grid', forceRefresh: forceRefresh, secret: 'system_dashboard_init' })
                });
                const json = await res.json();
                if (json.status === 200 && Array.isArray(json.grid)) {
                    dataLakeGridData = json.grid;
                    populateDataLakeDropdowns(dataLakeGridData);
                }
            }
            initOrUpdateDataLakeTable();
        } catch (err) {
            console.error("Data Lake Grid Fetch Error:", err);
        } finally {
            if (syncIcon) syncIcon.classList.remove('animate-spin');
        }
    };

    const populateDataLakeDropdowns = (rows) => {
        const stageSelect = document.getElementById('datalake-stage-filter');
        const amSelect = document.getElementById('datalake-am-filter');
        if (!stageSelect || !amSelect) return;

        const stages = Array.from(new Set(rows.map(r => r.stage).filter(Boolean))).sort();
        const ams = Array.from(new Set(rows.map(r => r.account_manager).filter(Boolean))).sort();

        stageSelect.innerHTML = `<option value="ALL">All Stages (${stages.length})</option>` + stages.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
        amSelect.innerHTML = `<option value="ALL">All Account Managers (${ams.length})</option>` + ams.map(a => `<option value="${escapeHtml(a)}">${escapeHtml(a)}</option>`).join('');
    };

    const getFilteredDataLakeRows = () => {
        const q = (document.getElementById('datalake-search-input')?.value || '').toLowerCase().trim();
        const stg = document.getElementById('datalake-stage-filter')?.value || 'ALL';
        const rsk = document.getElementById('datalake-risk-filter')?.value || 'ALL';
        const am = document.getElementById('datalake-am-filter')?.value || 'ALL';

        const terminalStages = ['approved', 'declined', 'withdrawn', 'off-boarded', 'ops: completed/onboarded', 'ops: off-boarded', 'ops: client drop-off/disqualified'];

        return dataLakeGridData.filter(r => {
            if (stg !== 'ALL' && r.stage !== stg) return false;
            if (rsk !== 'ALL' && !String(r.risk_rating).toLowerCase().includes(rsk.toLowerCase())) return false;
            if (am !== 'ALL' && r.account_manager !== am) return false;

            if (activeCohortMode === 'active' && terminalStages.includes(String(r.stage).toLowerCase())) return false;
            if (activeCohortMode === 'high_risk' && !['high', 'decline'].some(k => String(r.risk_rating).toLowerCase().includes(k))) return false;
            if (activeCohortMode === 'stuck' && (terminalStages.includes(String(r.stage).toLowerCase()) || r.queue_aging_days <= 5)) return false;
            if (activeCohortMode === 'with_ubos' && (!r.parties_count || r.parties_count <= 0)) return false;

            if (q) {
                const hay = `${r.company_name} ${r.trading_name} ${r.record_id} ${r.country} ${r.account_manager} ${r.sales_owner} ${r.industry} ${r.email}`.toLowerCase();
                if (!hay.includes(q)) return false;
            }
            return true;
        });
    };

    const initOrUpdateDataLakeTable = () => {
        const filtered = getFilteredDataLakeRows();
        const badge = document.getElementById('datalake-total-badge');
        if (badge) badge.textContent = `${filtered.length.toLocaleString()} / ${dataLakeGridData.length.toLocaleString()} Records`;

        // Expose filtered grid to Artemis Context Dock ("Active Grid")
        window.XOALA_ACTIVE_GRID_SAMPLE = filtered.slice(0, 100);

        if (dataLakeTabulator) {
            dataLakeTabulator.replaceData(filtered);
            return;
        }

        dataLakeTabulator = new Tabulator("#datalake-tabulator-grid", {
            data: filtered,
            layout: "fitColumns",
            height: "calc(100vh - 280px)",
            pagination: "local",
            paginationSize: 50,
            paginationSizeSelector: [25, 50, 100, 250],
            movableColumns: true,
            placeholder: "No KYB records match current filter criteria.",
            columns: [
                {
                    title: "Merchant / Entity Name", field: "company_name", minWidth: 230, frozen: true,
                    formatter: (cell) => {
                        const r = cell.getRow().getData();
                        return `<div class="flex items-center space-x-2 py-1">
                            <i class="ph ph-identification-card text-gold text-sm flex-shrink-0"></i>
                            <span class="font-bold text-white hover:text-gold truncate">${escapeHtml(r.company_name)}</span>
                        </div>`;
                    }
                },
                {
                    title: "Stage", field: "stage", width: 170,
                    formatter: (cell) => {
                        const val = cell.getValue() || "Unassigned";
                        const l = val.toLowerCase();
                        let cls = "bg-white/5 text-gray-300 border-white/10";
                        if (l.includes("approved") || l.includes("completed")) cls = "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
                        else if (l.includes("declined") || l.includes("drop-off")) cls = "bg-red-500/15 text-red-400 border-red-500/30";
                        else if (l.includes("withdrawn") || l.includes("off-boarded")) cls = "bg-gray-500/15 text-gray-400 border-gray-500/30";
                        else if (l.includes("mlro") || l.includes("review") || l.includes("queue")) cls = "bg-gold/15 text-gold border-gold/30";
                        return `<span class="px-2 py-0.5 rounded text-[10px] border ${cls}">${escapeHtml(val)}</span>`;
                    }
                },
                {
                    title: "Jurisdiction", field: "country", width: 165,
                    formatter: (cell) => `${getFlagImgHtml(cell.getValue())}<span>${escapeHtml(cell.getValue())}</span>`
                },
                {
                    title: "Risk Rating", field: "risk_rating", width: 130,
                    formatter: (cell) => {
                        const v = cell.getValue() || "Unassessed";
                        const l = v.toLowerCase();
                        let cls = "text-gray-500";
                        if (l.includes("high") || l.includes("decline")) cls = "text-red-400 font-bold";
                        else if (l.includes("medium")) cls = "text-amber-400 font-semibold";
                        else if (l.includes("low")) cls = "text-emerald-400";
                        return `<span class="${cls}">${escapeHtml(v)}</span>`;
                    }
                },
                { title: "Score", field: "risk_score", width: 80, hozAlign: "right" },
                {
                    title: "UBOs / Parties", field: "parties_count", width: 115, hozAlign: "center",
                    formatter: (cell) => {
                        const c = cell.getValue() || 0;
                        return c > 0
                            ? `<span class="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px]"><i class="ph ph-users mr-1"></i>${c} Linked</span>`
                            : `<span class="text-gray-600 text-[10px]">0</span>`;
                    }
                },
                { title: "Account Manager", field: "account_manager", width: 150 },
                { title: "1st Line Lead", field: "first_line_lead", width: 140 },
                {
                    title: "Queue Aging", field: "queue_aging_days", width: 120, hozAlign: "right",
                    formatter: (cell) => {
                        const v = cell.getValue();
                        return `<span class="px-2 py-0.5 rounded text-[10px] ${getHeatmapClass(v)}">${formatTime(v)}</span>`;
                    }
                },
                { title: "Industry", field: "industry", width: 160 },
                { title: "Created", field: "created_at", width: 110 }
            ],
            rowClick: (e, row) => {
                const data = row.getData();
                openSovereignProfileModal(data.record_id);
            }
        });
    };

    ['datalake-search-input', 'datalake-stage-filter', 'datalake-risk-filter', 'datalake-am-filter'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener(el.tagName === 'INPUT' ? 'input' : 'change', initOrUpdateDataLakeTable);
    });

    document.querySelectorAll('.datalake-cohort-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.datalake-cohort-btn').forEach(b => { b.classList.remove('active', 'bg-white/10', 'text-white'); b.classList.add('text-gray-400'); });
            btn.classList.add('active', 'bg-white/10', 'text-white');
            btn.classList.remove('text-gray-400');
            activeCohortMode = btn.getAttribute('data-cohort');
            initOrUpdateDataLakeTable();
        });
    });

    const dlRefreshBtn = document.getElementById('datalake-refresh-btn');
    if (dlRefreshBtn) dlRefreshBtn.addEventListener('click', () => fetchAndRenderDataLakeGrid(true));

    const dlExportBtn = document.getElementById('datalake-export-csv-btn');
    if (dlExportBtn) dlExportBtn.addEventListener('click', () => { if (dataLakeTabulator) dataLakeTabulator.download("csv", "Xoala_KYB_DataLake_Export.csv"); });

    // ============================================================================
    // SOVEREIGN 360° KYB PROFILE DOSSIER ENGINE
    // ============================================================================
    const profileOverlay = document.getElementById('profile-modal-overlay');
    const profileContainer = document.getElementById('profile-modal-container');
    const profileBody = document.getElementById('profile-modal-body');
    let activeProfileData = null;
    let activeProfileTab = 'overview';

    window.openSovereignProfileModal = async (ticketIdOrName) => {
        if (!ticketIdOrName) return;
        profileOverlay.classList.remove('hidden');
        setTimeout(() => {
            profileOverlay.classList.remove('opacity-0');
            profileContainer.classList.remove('scale-95');
        }, 10);

        document.getElementById('profile-company-name').textContent = `Loading 360° Dossier...`;
        profileBody.innerHTML = `
            <div class="h-96 flex flex-col items-center justify-center space-y-4">
                <i class="ph ph-circle-notch animate-spin text-4xl text-gold"></i>
                <div class="text-xs font-mono text-gray-400 uppercase tracking-widest">Joining KYB + Application Parties + People + Roles + Deals...</div>
            </div>
        `;

        try {
            const res = await fetch(DASHBOARD_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get_kyb_profile', ticketId: ticketIdOrName, secret: 'system_dashboard_init' })
            });
            const json = await res.json();
            if (json.status === 200 && json.profile && !json.profile.error) {
                activeProfileData = json.profile;
                activeProfileTab = 'overview';
                updateProfileHeaderUI(activeProfileData);
                renderActiveProfileTab();
            } else {
                profileBody.innerHTML = `<div class="p-8 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 font-mono text-xs">${escapeHtml(json.profile?.error || json.error || 'Failed to load profile.')}</div>`;
            }
        } catch (err) {
            profileBody.innerHTML = `<div class="p-8 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 font-mono text-xs">Network Error: ${escapeHtml(err.message)}</div>`;
        }
    };

    const closeProfileModal = () => {
        profileOverlay.classList.add('opacity-0');
        profileContainer.classList.add('scale-95');
        setTimeout(() => profileOverlay.classList.add('hidden'), 250);
    };

    document.getElementById('close-profile-modal-btn')?.addEventListener('click', closeProfileModal);
    profileOverlay?.addEventListener('click', (e) => { if (e.target === profileOverlay) closeProfileModal(); });

    const updateProfileHeaderUI = (p) => {
        const h = p.header;
        document.getElementById('profile-company-name').textContent = h.company_name;
        document.getElementById('profile-stage-badge').textContent = h.stage;

        const rBadge = document.getElementById('profile-risk-badge');
        const rl = (h.risk_rating || '').toLowerCase();
        rBadge.textContent = `Risk: ${h.risk_rating} (${h.risk_score})`;
        rBadge.className = "px-2.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-widest border " + (
            rl.includes('high') || rl.includes('decline') ? "bg-red-500/15 text-red-400 border-red-500/30" :
            rl.includes('medium') ? "bg-amber-500/15 text-amber-400 border-amber-500/30" :
            rl.includes('low') ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" :
            "bg-white/5 text-gray-400 border-white/10"
        );

        document.getElementById('profile-flag-box').innerHTML = getFlagImgHtml(h.country, "w-7 h-5");
        document.getElementById('profile-populated-counter').textContent = `${p.rawNonEmptyCount}/${p.totalSchemaColumns}`;

        const webHtml = h.website && h.website !== '-'
            ? `<a href="${h.website.startsWith('http') ? escapeHtml(h.website) : 'https://' + escapeHtml(h.website)}" target="_blank" class="text-gold hover:underline flex items-center space-x-1"><i class="ph ph-globe"></i><span>${escapeHtml(h.website)}</span></a>`
            : `<span>🌐 No Website</span>`;

        document.getElementById('profile-subtitle-meta').innerHTML = `
            <span class="text-gray-300">ID: <strong class="text-white select-all">${escapeHtml(h.record_id)}</strong></span>
            <span>•</span>
            <span>Jurisdiction: <strong class="text-white">${escapeHtml(h.country)}</strong></span>
            <span>•</span>
            <span>Inc #: <strong class="text-white">${escapeHtml(h.incorporation_number)}</strong> (${escapeHtml(h.incorporation_date)})</span>
            <span>•</span>
            <span>Industry: <strong class="text-gold">${escapeHtml(h.industry_sector)}</strong></span>
            <span>•</span>
            ${webHtml}
        `;
    };

    const renderAttributeGridCard = (title, items) => {
        const hideEmpty = document.getElementById('profile-hide-empty-toggle')?.checked ?? true;
        const searchTerm = (document.getElementById('profile-attr-search')?.value || '').toLowerCase().trim();

        const filtered = (items || []).filter(item => {
            if (hideEmpty && (!item.value || item.value === '' || item.value === '-')) return false;
            if (searchTerm && !item.label.toLowerCase().includes(searchTerm) && !item.slug.toLowerCase().includes(searchTerm) && !String(item.value).toLowerCase().includes(searchTerm)) return false;
            return true;
        });

        if (filtered.length === 0) {
            return `<div class="p-8 bg-surface/50 border border-white/5 rounded-xl text-center text-xs font-mono text-gray-500">No populated fields match in "${escapeHtml(title)}". Uncheck "Hide Empty Fields" in the top bar to inspect all blank schema slots.</div>`;
        }

        return `
            <div class="bg-surface/70 border border-white/10 rounded-xl overflow-hidden shadow-xl">
                <div class="px-6 py-3.5 bg-white/[0.03] border-b border-white/10 flex items-center justify-between">
                    <h3 class="text-xs font-mono uppercase tracking-widest text-gold font-bold">${escapeHtml(title)}</h3>
                    <span class="text-[10px] font-mono text-gray-400">${filtered.length} Fields Shown</span>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-white/5">
                    ${filtered.map(item => `
                        <div class="bg-[#0c0c0c] p-4 flex flex-col justify-between hover:bg-white/[0.02] transition-colors">
                            <div class="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                                <span class="truncate pr-2" title="${escapeHtml(item.label)}">${escapeHtml(item.label)}</span>
                                <span class="text-[9px] text-gray-700 font-mono">${escapeHtml(item.slug)}</span>
                            </div>
                            <div class="text-xs font-sans text-gray-200 break-words leading-relaxed font-medium">${ item.value ? escapeHtml(item.value) : '<span class="text-gray-700 italic">Empty</span>' }</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    };

    const renderActiveProfileTab = () => {
        if (!activeProfileData) return;
        const p = activeProfileData;
        const h = p.header;

        // Update active button state
        document.querySelectorAll('.profile-tab-btn').forEach(btn => {
            if (btn.getAttribute('data-ptab') === activeProfileTab) {
                btn.className = "profile-tab-btn active px-4 py-2 rounded-lg text-xs font-mono uppercase tracking-wider bg-gold/15 text-gold border border-gold/30 transition-all flex items-center space-x-2";
            } else {
                btn.className = "profile-tab-btn px-4 py-2 rounded-lg text-xs font-mono uppercase tracking-wider text-gray-400 hover:text-white hover:bg-white/5 border border-transparent transition-all flex items-center space-x-2";
            }
        });

        if (activeProfileTab === 'overview') {
            // 1. KPI Summary Strip + Stage Velocity Timeline + Ownership Tree + UBO Table + Compliance Red Flags
            const timelineHtml = p.stageTimeline.length > 0
                ? `<div class="flex items-center space-x-2 overflow-x-auto py-2">
                    ${p.stageTimeline.map((st, i) => `
                        <div class="flex items-center space-x-2 flex-shrink-0">
                            <div class="px-3.5 py-2.5 rounded-lg border ${st.isCurrent ? 'bg-gold/15 border-gold text-white shadow-[0_0_15px_rgba(221,170,51,0.2)]' : 'bg-black/60 border-white/10 text-gray-300'}">
                                <div class="text-[10px] font-mono uppercase tracking-wider ${st.isCurrent ? 'text-gold font-bold' : 'text-gray-400'}">${escapeHtml(st.stage)}</div>
                                <div class="text-xs font-mono mt-1 flex items-center space-x-2">
                                    <span>In: ${escapeHtml(st.enteredAt)}</span>
                                    ${st.dwellDays !== null ? `<span class="px-1.5 py-0.5 rounded text-[10px] ${getHeatmapClass(st.dwellDays)}">${formatTime(st.dwellDays)}</span>` : ''}
                                </div>
                            </div>
                            ${i < p.stageTimeline.length - 1 ? `<i class="ph ph-arrow-right text-gray-600"></i>` : ''}
                        </div>
                    `).join('')}
                   </div>`
                : `<div class="text-xs font-mono text-gray-500">No stage transition timestamps recorded yet.</div>`;

            const redFlagsHtml = p.complianceAudit.redFlags.length > 0
                ? p.complianceAudit.redFlags.map(rf => `<li class="flex items-start space-x-2 text-xs text-red-300 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg"><i class="ph ph-warning-octagon text-red-400 text-base flex-shrink-0 mt-0.5"></i><span>${escapeHtml(rf)}</span></li>`).join('')
                : `<li class="flex items-center space-x-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-lg"><i class="ph ph-check-circle text-base"></i><span>Zero automated contradictions or PEP/Sanctions alerts triggered.</span></li>`;

            const uboRowsHtml = p.connectedParties.length > 0
                ? p.connectedParties.map(cp => `
                    <tr class="border-b border-white/5 hover:bg-white/[0.03] transition-colors">
                        <td class="py-3 px-4 font-semibold text-white">${escapeHtml(cp.name)}<div class="text-[10px] font-mono text-gray-500">${escapeHtml(cp.email)}</div></td>
                        <td class="py-3 px-4 font-mono text-xs text-gold">${escapeHtml(cp.role)}</td>
                        <td class="py-3 px-4 font-mono text-xs text-right font-bold text-emerald-400">${escapeHtml(cp.ownership_pct)}</td>
                        <td class="py-3 px-4 text-xs">${getFlagImgHtml(cp.nationality)}${escapeHtml(cp.nationality)}</td>
                        <td class="py-3 px-4 text-xs">${getFlagImgHtml(cp.residence)}${escapeHtml(cp.residence)}</td>
                        <td class="py-3 px-4 font-mono text-xs">
                            <span class="px-2 py-0.5 rounded text-[10px] border ${String(cp.sumsub_result).toUpperCase().includes('GREEN') ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : (String(cp.sumsub_result).toUpperCase().includes('RED') ? 'bg-red-500/15 text-red-400 border-red-500/30' : 'bg-white/5 text-gray-400 border-white/10')}">${escapeHtml(cp.sumsub_result)}</span>
                        </td>
                        <td class="py-3 px-4 font-mono text-xs">${escapeHtml(cp.risk_rating)} (${escapeHtml(cp.risk_score)})</td>
                        <td class="py-3 px-4 font-mono text-[10px]">
                            PEP: <strong class="${String(cp.pep_flag).toLowerCase() === 'yes' ? 'text-red-400' : 'text-gray-400'}">${escapeHtml(cp.pep_flag)}</strong> |
                            Sanc: <strong class="${String(cp.sanctions_flag).toLowerCase() === 'yes' ? 'text-red-400' : 'text-gray-400'}">${escapeHtml(cp.sanctions_flag)}</strong>
                        </td>
                    </tr>
                `).join('')
                : `<tr><td colspan="8" class="py-8 text-center text-xs font-mono text-gray-500">No linked records found in Application_Parties or People for this KYB ticket.</td></tr>`;

            // Interactive Corporate Ownership & UBO Tree Diagram
            const parentGroupNode = p.linkedEntities.groupCompany
                ? `<div class="px-4 py-2.5 bg-purple-500/10 border border-purple-500/30 rounded-xl text-center">
                    <div class="text-[9px] font-mono uppercase text-purple-400">Parent / Group Company</div>
                    <div class="text-xs font-bold text-white mt-0.5">${escapeHtml(p.linkedEntities.groupCompany.company_name)}</div>
                    <div class="text-[10px] font-mono text-gray-400">${escapeHtml(p.linkedEntities.groupCompany.country)} • Ownership: ${escapeHtml(p.linkedEntities.groupCompany.ownership)}</div>
                   </div>
                   <div class="h-5 w-px bg-white/20 my-1"></div>`
                : '';

            profileBody.innerHTML = `
                <!-- 4 Executive KPI Cards -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div class="bg-surface/80 border border-white/10 p-4 rounded-xl">
                        <div class="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Composite Risk & Override</div>
                        <div class="text-xl font-mono text-white font-bold mt-1">${escapeHtml(h.risk_rating)} <span class="text-gold text-sm">(Score: ${escapeHtml(h.risk_score)})</span></div>
                        <div class="text-[11px] font-mono text-gray-400 mt-1">Override: ${escapeHtml(h.risk_rating_override || 'None')}</div>
                    </div>
                    <div class="bg-surface/80 border border-white/10 p-4 rounded-xl">
                        <div class="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Sumsub KYB Verification</div>
                        <div class="text-xl font-mono text-white font-bold mt-1">${escapeHtml(h.sumsub_result)}</div>
                        <div class="text-[11px] font-mono text-gray-400 mt-1 truncate" title="${escapeHtml(h.sumsub_applicant_id)}">Applicant ID: ${escapeHtml(h.sumsub_applicant_id)}</div>
                    </div>
                    <div class="bg-surface/80 border border-white/10 p-4 rounded-xl">
                        <div class="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Assigned Compliance & Sales Team</div>
                        <div class="text-sm font-mono text-white mt-1">AM: <strong class="text-gold">${escapeHtml(h.account_manager)}</strong></div>
                        <div class="text-[11px] font-mono text-gray-400 mt-1">1st Line: ${escapeHtml(h.first_line_lead)} • Sales: ${escapeHtml(h.sales_owner)}</div>
                    </div>
                    <div class="bg-surface/80 border border-white/10 p-4 rounded-xl">
                        <div class="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Peer Cohort Benchmark (${escapeHtml(p.peerBenchmark.cohortCountry)})</div>
                        <div class="text-sm font-mono text-white mt-1">Cohort Avg Risk Score: <strong class="text-emerald-400">${escapeHtml(p.peerBenchmark.cohortAvgRiskScore)}</strong></div>
                        <div class="text-[11px] font-mono text-gray-400 mt-1">${p.peerBenchmark.countryPeerCount} Peers • Approval Rate: ${escapeHtml(p.peerBenchmark.countryApprovalRate)}</div>
                    </div>
                </div>

                <!-- Pipeline Velocity & Stage Dwell-Time Track -->
                <div class="bg-surface/80 border border-white/10 p-5 rounded-xl">
                    <div class="text-xs font-mono text-gold uppercase tracking-widest font-bold mb-3 flex items-center space-x-2">
                        <i class="ph ph-timer text-base"></i><span>Pipeline Velocity & Stage Dwell-Time Track</span>
                    </div>
                    ${timelineHtml}
                </div>

                <!-- Automated Red-Flag & Missing Document Compliance Scanner -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div class="bg-surface/80 border border-white/10 p-5 rounded-xl">
                        <div class="text-xs font-mono text-red-400 uppercase tracking-widest font-bold mb-3 flex items-center space-x-2">
                            <i class="ph ph-shield-warning text-base"></i><span>Automated MLRO Red-Flag & Contradiction Scanner</span>
                        </div>
                        <ul class="space-y-2">${redFlagsHtml}</ul>
                    </div>

                    <div class="bg-surface/80 border border-white/10 p-5 rounded-xl">
                        <div class="text-xs font-mono text-amber-400 uppercase tracking-widest font-bold mb-3 flex items-center justify-between">
                            <span class="flex items-center space-x-2"><i class="ph ph-files text-base"></i><span>Mandatory KYB Document Checklist</span></span>
                            <span class="text-[10px] text-gray-400">${p.complianceAudit.providedDocs.length} Provided / ${p.complianceAudit.missingDocs.length} Missing</span>
                        </div>
                        <div class="flex flex-wrap gap-2">
                            ${p.complianceAudit.providedDocs.map(d => `<span class="px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono flex items-center space-x-1"><i class="ph ph-check-circle"></i><span>${escapeHtml(d.label)}</span></span>`).join('')}
                            ${p.complianceAudit.missingDocs.map(m => `<span class="px-2.5 py-1 rounded bg-red-500/10 border border-red-500/20 text-red-300 text-xs font-mono flex items-center space-x-1"><i class="ph ph-x-circle"></i><span>${escapeHtml(m)}</span></span>`).join('')}
                        </div>
                    </div>
                </div>

                <!-- Visual Corporate Ownership Tree & Connected Parties (UBOs / Directors / Shareholders) -->
                <div class="bg-surface/80 border border-white/10 rounded-xl overflow-hidden shadow-xl">
                    <div class="px-6 py-4 bg-white/[0.03] border-b border-white/10 flex items-center justify-between">
                        <div>
                            <h3 class="text-xs font-mono uppercase tracking-widest text-gold font-bold flex items-center space-x-2">
                                <i class="ph ph-tree-structure text-base"></i>
                                <span>Connected Parties: Directors, UBOs & Shareholders (${p.connectedParties.length} Linked via Application_Parties & People)</span>
                            </h3>
                        </div>
                    </div>

                    <!-- Visual Node Hierarchy -->
                    <div class="p-6 bg-black/40 border-b border-white/5 flex flex-col items-center">
                        ${parentGroupNode}
                        <div class="px-6 py-3 bg-gold/15 border-2 border-gold rounded-xl text-center shadow-[0_0_25px_rgba(221,170,51,0.15)]">
                            <div class="text-[9px] font-mono uppercase text-gold tracking-widest">Applicant KYB Entity</div>
                            <div class="text-sm font-bold text-white mt-0.5">${escapeHtml(h.company_name)}</div>
                            <div class="text-[10px] font-mono text-gray-300">${escapeHtml(h.country)} • ${escapeHtml(h.legal_entity_type)}</div>
                        </div>
                        ${p.connectedParties.length > 0 ? `
                            <div class="h-6 w-px bg-gold/40"></div>
                            <div class="flex flex-wrap items-center justify-center gap-4">
                                ${p.connectedParties.map(cp => `
                                    <div class="px-4 py-2.5 bg-surface border border-white/15 rounded-xl text-center min-w-[180px]">
                                        <div class="text-[10px] font-mono text-gold uppercase">${escapeHtml(cp.role)}</div>
                                        <div class="text-xs font-bold text-white mt-0.5">${escapeHtml(cp.name)}</div>
                                        <div class="text-[10px] font-mono text-emerald-400 mt-0.5">Shares: ${escapeHtml(cp.ownership_pct)} • ${escapeHtml(cp.nationality)}</div>
                                    </div>
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>

                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse whitespace-nowrap">
                            <thead>
                                <tr class="bg-white/5 border-b border-white/10 text-[10px] font-mono uppercase tracking-widest text-gray-400">
                                    <th class="py-3 px-4">Full Name & Email</th>
                                    <th class="py-3 px-4">Role at Application</th>
                                    <th class="py-3 px-4 text-right">Ownership %</th>
                                    <th class="py-3 px-4">Nationality</th>
                                    <th class="py-3 px-4">Residence</th>
                                    <th class="py-3 px-4">Sumsub KYC</th>
                                    <th class="py-3 px-4">Individual Risk</th>
                                    <th class="py-3 px-4">AML Screening</th>
                                </tr>
                            </thead>
                            <tbody class="text-sm font-sans text-gray-200">${uboRowsHtml}</tbody>
                        </table>
                    </div>
                </div>

                <!-- Core Corporate Attributes -->
                ${renderAttributeGridCard("Corporate Entity & Registration Attributes", p.domainSections.corporate)}
            `;
        } else if (activeProfileTab === 'risk') {
            profileBody.innerHTML = `
                <div class="bg-surface/80 border border-white/10 rounded-xl overflow-hidden shadow-xl">
                    <div class="px-6 py-4 bg-white/[0.03] border-b border-white/10 flex items-center justify-between">
                        <h3 class="text-xs font-mono uppercase tracking-widest text-gold font-bold">14-Factor Institutional Risk Matrix & Override Audit</h3>
                        <span class="text-xs font-mono text-gray-400">Override Reason: <strong class="text-white">${escapeHtml(h.risk_override_reason || 'None Recorded')}</strong></span>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse">
                            <thead>
                                <tr class="bg-white/5 border-b border-white/10 text-[10px] font-mono uppercase tracking-widest text-gray-400">
                                    <th class="py-3.5 px-6">Risk Factor / Dimension</th>
                                    <th class="py-3.5 px-6">Declared / Underlying Value</th>
                                    <th class="py-3.5 px-6 text-right">Calculated Score</th>
                                    <th class="py-3.5 px-6 text-right">Override Score</th>
                                    <th class="py-3.5 px-6 text-right">Effective Score</th>
                                </tr>
                            </thead>
                            <tbody class="text-xs font-mono divide-y divide-white/5">
                                ${p.riskScorecard.map(r => `
                                    <tr class="hover:bg-white/[0.03]">
                                        <td class="py-3 px-6 font-sans font-semibold text-white">${escapeHtml(r.dimension)}</td>
                                        <td class="py-3 px-6 text-gray-300 max-w-md truncate" title="${escapeHtml(r.underlyingValue)}">${escapeHtml(r.underlyingValue)}</td>
                                        <td class="py-3 px-6 text-right text-gray-400">${r.calculatedScore !== null ? r.calculatedScore : '-'}</td>
                                        <td class="py-3 px-6 text-right ${r.isOverridden ? 'text-amber-400 font-bold' : 'text-gray-600'}">${r.overrideScore !== null ? r.overrideScore : '-'}</td>
                                        <td class="py-3 px-6 text-right font-bold ${r.effectiveScore >= 70 ? 'text-red-400' : (r.effectiveScore >= 40 ? 'text-amber-400' : 'text-emerald-400')}">${r.effectiveScore !== null ? r.effectiveScore : '-'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        } else if (activeProfileTab === 'volumes') {
            profileBody.innerHTML = renderAttributeGridCard("Payments, Currencies, Top 5 Jurisdictions & C2B Volumes", p.domainSections.volumes_payments);
        } else if (activeProfileTab === 'crypto') {
            profileBody.innerHTML = renderAttributeGridCard("Crypto Conversion, Deposits, Payouts, Wallets & Web3 Screening (c_)", p.domainSections.crypto_web3);
        } else if (activeProfileTab === 'acquiring') {
            profileBody.innerHTML = renderAttributeGridCard("Merchant Acquiring, Card Volumes, Chargebacks, Refunds & MCC (ma_)", p.domainSections.merchant_acquiring);
        } else if (activeProfileTab === 'aml') {
            profileBody.innerHTML = renderAttributeGridCard("AML / CTF Policies, Wolfsberg / EDD Questionnaires & Audits (ac_, fi_, e1_–e3_)", p.domainSections.aml_edd);
        } else if (activeProfileTab === 'all') {
            const allItems = [
                ...p.domainSections.corporate,
                ...p.domainSections.volumes_payments,
                ...p.domainSections.crypto_web3,
                ...p.domainSections.merchant_acquiring,
                ...p.domainSections.aml_edd,
                ...p.domainSections.system_timeline
            ];
            profileBody.innerHTML = renderAttributeGridCard(`Complete Raw KYB Schema Explorer (${allItems.length} Total Attributes)`, allItems);
        }
    };

    document.querySelectorAll('.profile-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            activeProfileTab = btn.getAttribute('data-ptab');
            renderActiveProfileTab();
        });
    });

    document.getElementById('profile-hide-empty-toggle')?.addEventListener('change', renderActiveProfileTab);
    document.getElementById('profile-attr-search')?.addEventListener('input', renderActiveProfileTab);

    // Multiplier Action 1: 1-Click Draft RFI Email
    document.getElementById('profile-rfi-btn')?.addEventListener('click', () => {
        if (!activeProfileData) return;
        const h = activeProfileData.header;
        const missing = activeProfileData.complianceAudit.missingDocs;
        const rfiBody = `Dear ${h.contact_name !== '-' ? h.contact_name : h.company_name + ' Team'},\n\nThank you for your application with Xoala (Ref: ${h.record_id}).\n\nTo complete our 1st Line KYB Compliance Review for ${h.company_name}, please provide the following outstanding items:\n\n` +
            (missing.length > 0 ? missing.map((m, i) => `${i + 1}. ${m}`).join('\n') : `1. Clarification on source of funds and expected monthly volumes`) +
            `\n\nKind regards,\n${h.account_manager !== 'Unassigned' ? h.account_manager : 'Xoala Compliance Team'}`;

        navigator.clipboard.writeText(rfiBody);
        alert(`✅ Compliance RFI Email copied to clipboard for ${h.company_name} (${h.contact_email})!\n\n---\n${rfiBody}`);
    });

    // Multiplier Action 2: 1-Click AI MLRO Compliance Memo via Prometheus
    document.getElementById('profile-ai-audit-btn')?.addEventListener('click', () => {
        if (!activeProfileData) return;
        const h = activeProfileData.header;
        const ubos = activeProfileData.connectedParties.map(u => `${u.name} (${u.role}, Ownership: ${u.ownership_pct}, Nat: ${u.nationality}, Sumsub: ${u.sumsub_result}, Risk: ${u.risk_rating})`).join('; ');
        const flags = activeProfileData.complianceAudit.redFlags.join('; ');
        const missing = activeProfileData.complianceAudit.missingDocs.join(', ');

        const auditPrompt = `@Prometheus Generate an Executive MLRO Compliance Audit Memo for "${h.company_name}" (Record ID: ${h.record_id}, Country: ${h.country}, Industry: ${h.industry_sector}, Stage: ${h.stage}, Risk Rating: ${h.risk_rating} [Score: ${h.risk_score}], Expected Monthly Volume: ${h.monthly_volume}, Sumsub: ${h.sumsub_result}). Connected UBOs/Directors: [${ubos || 'None linked'}]. Automated Red Flags: [${flags || 'None'}]. Missing Mandatory Docs: [${missing || 'None'}]. Provide: 1) Executive Business & Risk Summary, 2) Key AML/KYB Red Flags & UBO Verification Gaps, and 3) Final MLRO Recommendation (Approve / Escalate for EDD / Request RFI / Decline).`;

        closeProfileModal();
        const artemisNavBtn = document.querySelector('[data-target="artemis-view"]');
        if (artemisNavBtn) artemisNavBtn.click();

        setTimeout(() => {
            const promptInput = document.getElementById('prompt-input');
            const sendBtn = document.getElementById('send-btn');
            if (promptInput && sendBtn) {
                promptInput.value = auditPrompt;
                promptInput.dispatchEvent(new Event('input'));
                sendBtn.click();
            }
        }, 300);
    });

    // Multiplier Action 3: Export / Print Audit Dossier PDF
    document.getElementById('profile-print-btn')?.addEventListener('click', () => {
        window.print();
    });

    // Initial load
    fetchDashboardData(false);
});
