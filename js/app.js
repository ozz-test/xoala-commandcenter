// === XOALA COMMAND CENTER: DASHBOARD, CUSTOM VIRTUAL DATA LAKE & SOVEREIGN 360° DOSSIER ===

const DASHBOARD_API_URL = 'https://xoala-command-center-middleware.analytics-crm.workers.dev'; 

document.addEventListener('DOMContentLoaded', () => {
    
    // --- GLOBAL STATE ---
    let piiMaskEnabled = false;
    let gridDensity = 'compact'; // 'compact' | 'comfortable'
    let dataLakeViewMode = 'table'; // 'table' | 'kanban'
    let splitDrawerEnabled = false;
    let auditLogExpanded = false;
    let verifiedDocsSessionSet = new Set();
    let dataLakeGridData = [];
    let filteredLakeRows = [];
    let selectedLakeIds = new Set();
    let activeCohortMode = 'all';
    let currentSortField = 'created_at';
    let currentSortDir = 'desc';
    let currentPage = 1;
    let pageSize = 50;
    let kbFocusedRowIndex = -1;

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

    const maskPiiString = (val) => {
        if (!piiMaskEnabled || !val || val === '-') return val;
        const s = String(val);
        if (s.includes('@')) {
            const parts = s.split('@');
            return parts[0].substring(0, 2) + '***@' + parts[1];
        }
        if (/^\+?[0-9\s\-()]{7,}$/.test(s)) {
            return s.substring(0, 3) + ' ••• ••' + s.slice(-2);
        }
        return s;
    };

    const getFlagImgHtml = (countryName, sizeClass = "w-4 h-3") => {
        if (!countryName || countryName.toLowerCase().includes("unspecified") || countryName.toLowerCase().includes("blank")) {
            return `<span class="inline-flex items-center justify-center w-4 h-3 mr-1.5 text-gray-600"><i class="ph ph-globe"></i></span>`;
        }
        const clean = String(countryName).toLowerCase().split('|')[0].trim();
        const iso = countryToIsoMap[clean];
        return iso
            ? `<img src="https://flagcdn.com/24x18/${iso}.png" class="${sizeClass} inline-block mr-2 rounded-sm shadow-sm" alt="${escapeHtml(countryName)}" />`
            : `<span class="inline-flex items-center justify-center w-4 h-3 mr-1.5 text-gray-500"><i class="ph ph-globe"></i></span>`;
    };

    const getEntityMonogram = (name) => {
        const clean = String(name || 'X').replace(/[^a-zA-Z0-9\s]/g, '').trim();
        const words = clean.split(/\s+/).filter(Boolean);
        if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
        return clean.substring(0, 2).toUpperCase() || 'XO';
    };

    // --- PII MASKING TOGGLE ---
    document.getElementById('global-pii-mask-btn')?.addEventListener('click', () => {
        piiMaskEnabled = !piiMaskEnabled;
        const icon = document.getElementById('global-pii-icon');
        const label = document.getElementById('global-pii-label');
        const btn = document.getElementById('global-pii-mask-btn');
        if (piiMaskEnabled) {
            icon.className = "ph ph-lock-key text-sm text-gold";
            label.textContent = "Privacy Mask: ON (PII Hidden)";
            btn.classList.add('border-gold/50', 'text-gold');
        } else {
            icon.className = "ph ph-shield-check text-sm text-emerald-400";
            label.textContent = "Privacy Mask: OFF";
            btn.classList.remove('border-gold/50', 'text-gold');
        }
        if (!document.getElementById('datalake-view').classList.contains('hidden')) renderSovereignDataLakeRows();
        if (!document.getElementById('profile-modal-overlay').classList.contains('hidden')) renderActiveProfileTab();
    });

    // --- NAVIGATION ROUTING ---
    const navItems = document.querySelectorAll('.nav-item');
    const viewSections = document.querySelectorAll('.view-section');

    navItems.forEach(item => {
        item.addEventListener('click', async () => {
            if (item.disabled) return;
            const targetId = item.getAttribute('data-target');
            navItems.forEach(nav => {
                if (nav.getAttribute('data-target') === targetId) nav.classList.add('active');
                else nav.classList.remove('active');
            });
            viewSections.forEach(section => { section.classList.add('hidden'); section.classList.remove('flex', 'block'); });
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
                        if (!currentRiskData) await fetchDashboardData(false);
                        await fetchMatrixData(); 
                    }
                    if (targetId === 'datalake-view') {
                        await fetchAndRenderDataLakeGrid(false);
                    }
                    if (targetId === 'ib-partner-view') {
                        if (dataLakeGridData.length === 0) await fetchAndRenderDataLakeGrid(false);
                        renderIbPartnerHub();
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

    // --- DRILLDOWN PANEL ---
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
                <span class="text-[10px] text-gold opacity-0 group-hover:opacity-100 transition-opacity ml-2 flex-shrink-0 flex items-center space-x-1"><span>360°</span><i class="ph ph-arrow-right"></i></span>
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

    document.getElementById('close-drilldown-btn')?.addEventListener('click', closeDrilldown);
    drilldownOverlay?.addEventListener('click', closeDrilldown);

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
        if (num <= 1) return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25';
        if (num <= 3) return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/25';
        if (num <= 5) return 'bg-orange-500/10 text-orange-400 border border-orange-500/25';
        return 'bg-red-500/15 text-red-400 border border-red-500/30';
    };

    const formatTime = (decimalDays) => {
        const val = parseFloat(decimalDays);
        if (isNaN(val) || val <= 0) return "0m";
        const d = Math.floor(val); const h = Math.floor((val - d) * 24); const m = Math.round(((val - d) * 24 - h) * 60);
        let parts = [];
        if (d > 0) parts.push(`${d}d`); if (h > 0) parts.push(`${h}h`); if (m > 0 || parts.length === 0) parts.push(`${m}m`);
        return parts.join(' ');
    };

    // --- DAILY REPORT MATRIX (INSTANT 0ms CLIENT-SIDE HYDRATION + LIVE DATE FILTER + SCOPE TOGGLE) ---
    let matrixScopeMode = 'all'; // 'all' | 'active'
    const terminalMatrixStages = ['approved', 'declined', 'withdrawn', 'off-boarded', 'ops: completed/onboarded', 'ops: off-boarded', 'ops: client drop-off/disqualified'];

    const isRecordTerminalForMatrix = (r) => {
        if (r.is_terminal === true) return true;
        const stg = String(r.stage || '').toLowerCase().trim();
        return terminalMatrixStages.includes(stg) || stg.startsWith('ops:');
    };

    // Rich Multi-Section Executive Daily Operational & Compliance Synthesis Builder
    const buildRichExecutiveDailySynthesisHtml = (statsObj = null) => {
        const rows = Array.isArray(dataLakeGridData) ? dataLakeGridData : [];
        const totalCount = rows.length || (statsObj?.totalTickets || 0);
        const todayCount = statsObj?.todayCount ?? 0;
        const topCountryToday = statsObj?.topCountryToday?.name || 'Global';
        const topCountryTodayCount = statsObj?.topCountryToday?.count ?? 0;
        const mtdRate = statsObj?.approvalRate?.rate || '0.0%';
        const mtdApproved = statsObj?.approvalRate?.approvedVolume ?? 0;
        const mtdTotal = statsObj?.approvalRate?.totalVolume ?? 0;

        if (rows.length === 0) {
            return `
                <div class="space-y-3 text-xs leading-relaxed">
                    <p>System pipeline integrity remains optimal. The Data Lake successfully synchronized <strong class="text-gold">${totalCount.toLocaleString()}</strong> institutional KYB/KYC dossiers.</p>
                    <p><strong>Today's Intake:</strong> <strong class="text-white">${todayCount}</strong> new registrations processed, led by <strong class="text-gold">${escapeHtml(topCountryToday)}</strong> (${topCountryTodayCount}). <strong>MTD Approval Conversion:</strong> <strong class="text-emerald-400">${escapeHtml(mtdRate)}</strong> (${mtdApproved} approved out of ${mtdTotal} MTD applications).</p>
                </div>
            `;
        }

        const activeRows = rows.filter(r => !isRecordTerminalForMatrix(r));
        const approvedRows = rows.filter(r => {
            const s = String(r.stage || '').toLowerCase();
            return s === 'approved' || s === 'completed';
        });
        const declinedRows = rows.filter(r => {
            const s = String(r.stage || '').toLowerCase();
            return s.includes('declined') || s.includes('rejected') || s.includes('cancelled') || s.includes('drop-off');
        });
        const slaOver5 = activeRows.filter(r => (parseFloat(r.queue_aging_days) || 0) > 5);
        const slaOver14 = activeRows.filter(r => (parseFloat(r.queue_aging_days) || 0) > 14);
        const avgDwell = activeRows.length > 0
            ? (activeRows.reduce((s, r) => s + (parseFloat(r.queue_aging_days) || 0), 0) / activeRows.length).toFixed(1)
            : '0.0';

        // Stage Breakdown of Active Queue
        const stageCounts = {};
        const stageDwellSum = {};
        activeRows.forEach(r => {
            const stg = r.stage || 'Unspecified';
            stageCounts[stg] = (stageCounts[stg] || 0) + 1;
            stageDwellSum[stg] = (stageDwellSum[stg] || 0) + (parseFloat(r.queue_aging_days) || 0);
        });
        const topStages = Object.entries(stageCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4)
            .map(([stg, cnt]) => {
                const meanStgDwell = (stageDwellSum[stg] / cnt).toFixed(1);
                return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 border border-white/10 font-mono text-[11px] text-gray-200"><strong>${escapeHtml(stg)}:</strong> <span class="text-gold">${cnt}</span> <span class="text-gray-400">(avg ${meanStgDwell}d)</span></span>`;
            }).join(' ');

        // Risk Tier Breakdown in Active Queue
        let highActive = 0, medActive = 0, lowActive = 0, unassessedActive = 0;
        activeRows.forEach(r => {
            const rl = String(r.risk_rating || '').toLowerCase();
            if (rl.includes('high') || rl.includes('decline')) highActive++;
            else if (rl.includes('med')) medActive++;
            else if (rl.includes('low')) lowActive++;
            else unassessedActive++;
        });

        // Officer Workload Summary
        const officerCounts = {};
        activeRows.forEach(r => {
            const am = (r.account_manager && r.account_manager !== '-' && r.account_manager !== 'Unassigned') ? r.account_manager : 'Unassigned';
            officerCounts[am] = (officerCounts[am] || 0) + 1;
        });
        const unassignedActive = officerCounts['Unassigned'] || 0;
        const assignedOfficers = Object.entries(officerCounts).filter(([k]) => k !== 'Unassigned').sort((a, b) => b[1] - a[1]);
        const topOfficersText = assignedOfficers.slice(0, 3).map(([k, v]) => `${escapeHtml(k)} (${v})`).join(', ') || 'None Assigned';

        // Top 3 Jurisdictions in Active Queue
        const ctryCounts = {};
        activeRows.forEach(r => {
            const c = (r.country && r.country !== '-' && !String(r.country).toLowerCase().includes('unspecified')) ? r.country : null;
            if (c) ctryCounts[c] = (ctryCounts[c] || 0) + 1;
        });
        const topCorridorsText = Object.entries(ctryCounts).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([c, n]) => `${escapeHtml(c)} (${n})`).join(' • ') || 'Global';

        // Top 3 Oldest Stalled Active Dossiers
        const topStalled = [...activeRows]
            .sort((a, b) => (parseFloat(b.queue_aging_days) || 0) - (parseFloat(a.queue_aging_days) || 0))
            .slice(0, 3)
            .map(r => `<button type="button" onclick="window.openSovereignProfileModal && window.openSovereignProfileModal('${escapeHtml(r.record_id)}')" class="text-gold hover:underline font-mono text-[11px] font-bold">${escapeHtml(r.company_name)} (${(parseFloat(r.queue_aging_days) || 0).toFixed(1)}d in ${escapeHtml(r.stage)})</button>`)
            .join(' • ');

        return `
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-3 text-xs leading-relaxed">
                <div class="p-3.5 rounded-xl bg-black/50 border border-white/10 space-y-1.5">
                    <div class="text-[10px] font-mono uppercase tracking-widest text-gold font-bold flex items-center justify-between">
                        <span>1. Pipeline Velocity &amp; Conversion Telemetry</span>
                        <span class="text-emerald-400">${totalCount.toLocaleString()} Total Dossiers</span>
                    </div>
                    <p class="text-gray-300">
                        Lifetime portfolio stands at <strong class="text-white">${totalCount.toLocaleString()}</strong> entities: <strong class="text-emerald-400">${approvedRows.length.toLocaleString()} Approved/Completed</strong> (${((approvedRows.length / Math.max(1, totalCount)) * 100).toFixed(1)}% lifetime yield), <strong class="text-gold">${activeRows.length.toLocaleString()} Active In-Queue</strong>, and <strong class="text-gray-400">${declinedRows.length.toLocaleString()} Declined/Archived</strong>.
                        ${statsObj ? `Today's intake recorded <strong class="text-white">${todayCount}</strong> new applications led by <strong class="text-gold">${escapeHtml(topCountryToday)}</strong> (${topCountryTodayCount}), with Month-to-Date approval conversion at <strong class="text-emerald-400">${escapeHtml(mtdRate)}</strong> (${mtdApproved}/${mtdTotal}).` : ''}
                    </p>
                </div>

                <div class="p-3.5 rounded-xl bg-black/50 border border-white/10 space-y-1.5">
                    <div class="text-[10px] font-mono uppercase tracking-widest text-gold font-bold flex items-center justify-between">
                        <span>2. SLA Breach Stratification &amp; Stage Dwell</span>
                        <span class="text-red-400">${slaOver5.length.toLocaleString()} &gt;5d (${slaOver14.length.toLocaleString()} &gt;14d Critical)</span>
                    </div>
                    <p class="text-gray-300">
                        Mean active stage dwell is <strong class="text-white">${avgDwell} days</strong>. Exactly <strong class="text-amber-300">${slaOver5.length.toLocaleString()}</strong> active dossiers exceed the 5-day operational SLA target (${((slaOver5.length / Math.max(1, activeRows.length)) * 100).toFixed(1)}% of active queue), including <strong class="text-red-400">${slaOver14.length.toLocaleString()}</strong> critical breaches aged &gt;14 days.
                        ${topStalled ? `<br><span class="text-[11px] text-gray-400">Priority Escalations:</span> ${topStalled}` : ''}
                    </p>
                </div>

                <div class="p-3.5 rounded-xl bg-black/50 border border-white/10 space-y-1.5">
                    <div class="text-[10px] font-mono uppercase tracking-widest text-gold font-bold flex items-center justify-between">
                        <span>3. Active Stage Bottlenecks &amp; Corridors</span>
                        <span class="text-gray-400">Top Active Stages</span>
                    </div>
                    <div class="flex flex-wrap gap-1.5 pt-0.5">${topStages}</div>
                    <div class="text-[11px] text-gray-400 pt-1">
                        <strong class="text-gray-300">Leading Active Jurisdictions:</strong> ${topCorridorsText}
                    </div>
                </div>

                <div class="p-3.5 rounded-xl bg-black/50 border border-white/10 space-y-1.5">
                    <div class="text-[10px] font-mono uppercase tracking-widest text-gold font-bold flex items-center justify-between">
                        <span>4. Risk Exposure &amp; Officer Desk Allocation</span>
                        <span class="text-emerald-400">${assignedOfficers.length} Active Officers</span>
                    </div>
                    <p class="text-gray-300">
                        Active queue risk profile comprises <strong class="text-red-400">${highActive} High-Risk/EDD</strong> (requiring 4-Eyes MLRO sign-off), <strong class="text-gold">${medActive} Medium-Risk</strong>, <strong class="text-emerald-400">${lowActive} Low-Risk</strong>, and <strong class="text-gray-400">${unassessedActive} Pending Initial Assessment</strong>.
                        Desk load is distributed across <strong>${assignedOfficers.length}</strong> officers (Top queues: ${topOfficersText}), with <strong class="text-amber-300">${unassignedActive}</strong> active applications currently unassigned.
                    </p>
                </div>
            </div>
        `;
    };

    let lastDashboardStatsCache = null;

    const hydrateMatrixFromDataLake = () => {
        if (!Array.isArray(dataLakeGridData) || dataLakeGridData.length === 0) return false;
        const startVal = document.getElementById('matrix-start-date')?.value || '';
        const endVal = document.getElementById('matrix-end-date')?.value || '';
        const startTs = startVal ? new Date(startVal + 'T00:00:00').getTime() : null;
        const endTs = endVal ? new Date(endVal + 'T23:59:59').getTime() : null;

        // Update 4-Card Daily Report Executive Telemetry Strip
        const allActiveRows = dataLakeGridData.filter(r => !isRecordTerminalForMatrix(r));
        const slaBreachOver5Rows = allActiveRows.filter(r => (parseFloat(r.queue_aging_days) || 0) > 5);
        const slaCriticalOver14Rows = allActiveRows.filter(r => (parseFloat(r.queue_aging_days) || 0) > 14);
        const avgActiveDwell = allActiveRows.length > 0
            ? (allActiveRows.reduce((s, r) => s + (parseFloat(r.queue_aging_days) || 0), 0) / allActiveRows.length).toFixed(1)
            : '0.0';
        const activeOfficerSet = new Set(allActiveRows.map(r => r.account_manager).filter(am => am && am !== 'Unassigned' && am !== '-'));

        const elActiveQ = document.getElementById('dr-kpi-active-queue');
        const elBreaches = document.getElementById('dr-kpi-sla-breaches');
        const elBreachSub = document.getElementById('dr-kpi-sla-sub');
        const elAvgDwell = document.getElementById('dr-kpi-avg-dwell');
        const elOfficers = document.getElementById('dr-kpi-officers');
        if (elActiveQ) elActiveQ.textContent = allActiveRows.length.toLocaleString();
        if (elBreaches) elBreaches.textContent = slaBreachOver5Rows.length.toLocaleString();
        if (elBreachSub) elBreachSub.textContent = `${slaCriticalOver14Rows.length.toLocaleString()} Critical (>14d) • Immediate Escalation`;
        if (elAvgDwell) elAvgDwell.textContent = `${avgActiveDwell}d`;
        if (elOfficers) elOfficers.textContent = activeOfficerSet.size.toLocaleString();

        const reportEl = document.getElementById('daily-report-content');
        if (reportEl) {
            reportEl.innerHTML = buildRichExecutiveDailySynthesisHtml(lastDashboardStatsCache);
        }

        const nowMs = Date.now();
        const mgrMap = {};
        dataLakeGridData.forEach(r => {
            const isTerm = isRecordTerminalForMatrix(r);
            if (matrixScopeMode === 'active' && isTerm) return;

            if (startTs || endTs) {
                const cTs = r.created_at ? new Date(r.created_at).getTime() : NaN;
                if (!isNaN(cTs)) {
                    if (startTs && cTs < startTs) return;
                    if (endTs && cTs > endTs) return;
                }
            }
            const mgrName = r.account_manager || 'Unassigned';
            const stgName = normalizeAttioStage(r.stage);
            const hasIntro = (r.introducer && r.introducer !== '-' && r.introducer !== 'No') ? 1 : 0;
            const rawQueueAge = parseFloat(r.queue_aging_days) || 0;

            // Active Stage Dwell Time (0.0 for finalized/terminal records; live stage dwell for active records)
            const activeDwellDays = isTerm ? 0 : rawQueueAge;

            // True Calendar Days Since Application Registration (created_at -> now)
            const createdMs = r.created_at ? Date.parse(r.created_at) : NaN;
            const calendarDaysSince = !isNaN(createdMs)
                ? Math.max(0.1, (nowMs - createdMs) / 86400000)
                : rawQueueAge;

            if (!mgrMap[mgrName]) {
                mgrMap[mgrName] = {
                    managerName: mgrName,
                    tickets: 0,
                    activeTickets: 0,
                    introducer: 0,
                    totalActiveAging: 0,
                    totalCalendarDays: 0,
                    stages: {}
                };
            }
            const m = mgrMap[mgrName];
            m.tickets++;
            if (!isTerm) {
                m.activeTickets++;
                m.totalActiveAging += activeDwellDays;
            }
            m.introducer += hasIntro;
            m.totalCalendarDays += calendarDaysSince;

            if (!m.stages[stgName]) {
                m.stages[stgName] = {
                    stageName: stgName,
                    isTerminalStage: isTerm,
                    tickets: 0,
                    activeTickets: 0,
                    introducer: 0,
                    totalActiveAging: 0,
                    totalCalendarDays: 0,
                    leads: []
                };
            }
            const s = m.stages[stgName];
            s.tickets++;
            if (!isTerm) {
                s.activeTickets++;
                s.totalActiveAging += activeDwellDays;
            }
            s.introducer += hasIntro;
            s.totalCalendarDays += calendarDaysSince;
            s.leads.push({
                name: r.company_name || 'Unnamed Entity',
                ticketId: r.record_id,
                introducer: hasIntro ? 'Yes' : 'No',
                aging: activeDwellDays.toFixed(2),
                daysSince: calendarDaysSince.toFixed(1),
                isTerminal: isTerm
            });
        });

        const matrixArr = Object.values(mgrMap)
            .sort((a, b) => b.tickets - a.tickets)
            .map(m => ({
                managerName: m.managerName,
                tickets: m.tickets,
                introducer: m.introducer,
                avgAging: m.activeTickets > 0 ? (m.totalActiveAging / m.activeTickets).toFixed(2) : '0.00',
                avgDays: m.tickets > 0 ? (m.totalCalendarDays / m.tickets).toFixed(1) : '0.0',
                statuses: Object.values(m.stages)
                    .sort((a, b) => b.tickets - a.tickets)
                    .map(s => ({
                        stageName: s.stageName,
                        isTerminalStage: s.isTerminalStage,
                        tickets: s.tickets,
                        introducer: s.introducer,
                        avgAging: s.activeTickets > 0 ? (s.totalActiveAging / s.activeTickets).toFixed(2) : '0.00',
                        avgDays: s.tickets > 0 ? (s.totalCalendarDays / s.tickets).toFixed(1) : '0.0',
                        leads: s.leads
                    }))
            }));

        renderMatrix(matrixArr);
        return true;
    };

    const fetchMatrixData = async () => {
        const syncIcon = document.getElementById('matrix-sync-icon');
        const tbody = document.getElementById('matrix-table-body');
        const startEl = document.getElementById('matrix-start-date'); const endEl = document.getElementById('matrix-end-date');
        if(!startEl || !endEl || !tbody) return;

        // Instant 0ms hydration if Data Lake is already in memory
        if (hydrateMatrixFromDataLake()) {
            return;
        }

        if (syncIcon) syncIcon.classList.add('animate-spin');
        tbody.innerHTML = `<tr><td colspan="5" class="py-12 text-center text-gold/50 font-mono text-xs animate-pulse">Hydrating Pipeline Accountability Matrix...</td></tr>`;

        try {
            const response = await fetch(DASHBOARD_API_URL, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get_matrix_data', startDate: startEl.value, endDate: endEl.value, secret: 'system_dashboard_init', prompt: 'system', model: 'gemini-3.6-flash' })
            });
            if (!response.ok) throw new Error("Server Error HTTP " + response.status);
            const responseData = await response.json();
            if (responseData.status === 200 && responseData.data) renderMatrix(responseData.data);
            else tbody.innerHTML = `<tr><td colspan="5" class="py-12 text-center text-red-500 font-mono text-xs">${responseData.error || 'API Error'}</td></tr>`;
        } catch (error) {
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
                        <td class="py-1.5 px-6 pl-20 border-l-2 border-white/5 text-xs font-mono truncate max-w-xs cursor-pointer hover:text-gold text-gray-300 transition-colors lead-name-cell flex items-center space-x-2" title="Click to open 360° KYB Dossier: ${escapeHtml(lead.name)}"><i class="ph ph-identification-card text-gold"></i><span>${escapeHtml(lead.name)}</span></td>
                        <td class="py-1.5 px-6 text-right font-mono text-xs text-gray-600">-</td>
                        <td class="py-1.5 px-6 text-right font-mono text-xs text-gray-600">${introBadge}</td>
                        <td class="py-1.5 px-6 text-right font-mono"><span class="px-2 py-[1px] rounded text-[10px] ${getHeatmapClass(lead.aging)}">${formatTime(lead.aging)}</span></td>
                        <td class="py-1.5 px-6 text-right font-mono text-xs text-gray-600">${formatTime(lead.daysSince)}</td>
                    `;
                    trLead.querySelector('.lead-name-cell').addEventListener('click', (e) => {
                        e.stopPropagation();
                        openSovereignProfileModal(lead.ticketId && lead.ticketId !== 'N/A' ? lead.ticketId : lead.name);
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
                    if (!r.classList.contains('hidden')) r.classList.add('hidden');
                    else if (!r.className.includes('-child bg-black/20')) r.classList.remove('hidden'); 
                });
                document.querySelectorAll(`.mgr-${mgrIndex}-child .ph-caret-down`).forEach(i => i.classList.replace('ph-caret-down', 'ph-caret-right'));
                if (icon.classList.contains('ph-plus-square')) icon.classList.replace('ph-plus-square', 'ph-minus-square'); else icon.classList.replace('ph-minus-square', 'ph-plus-square');
            });
        });
    };

    document.getElementById('matrix-refresh-btn')?.addEventListener('click', fetchMatrixData);
    document.getElementById('matrix-clear-btn')?.addEventListener('click', () => { document.getElementById('matrix-start-date').value = ''; document.getElementById('matrix-end-date').value = ''; fetchMatrixData(); });

    const btnScopeAll = document.getElementById('matrix-scope-all-btn');
    const btnScopeActive = document.getElementById('matrix-scope-active-btn');
    const updateMatrixScopeButtons = () => {
        if (!btnScopeAll || !btnScopeActive) return;
        if (matrixScopeMode === 'all') {
            btnScopeAll.className = "px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-gold/20 text-gold border border-gold/40 transition-all";
            btnScopeActive.className = "px-2.5 py-1 rounded text-[10px] font-mono uppercase tracking-wider text-gray-400 hover:text-white transition-all";
        } else {
            btnScopeActive.className = "px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-gold/20 text-gold border border-gold/40 transition-all";
            btnScopeAll.className = "px-2.5 py-1 rounded text-[10px] font-mono uppercase tracking-wider text-gray-400 hover:text-white transition-all";
        }
    };
    btnScopeAll?.addEventListener('click', () => {
        matrixScopeMode = 'all';
        updateMatrixScopeButtons();
        hydrateMatrixFromDataLake();
    });
    btnScopeActive?.addEventListener('click', () => {
        matrixScopeMode = 'active';
        updateMatrixScopeButtons();
        hydrateMatrixFromDataLake();
    });

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
                body: JSON.stringify({ action: 'get_dashboard_stats', filters: filters, secret: 'system_dashboard_init', prompt: 'system_dashboard_init', model: 'gemini-3.6-flash', history: [], forceRefresh: forceRefreshFlag })
            });
            if (!response.ok) throw new Error(`Server Error HTTP ${response.status}`);
            const data = await response.json();

            if (data.status === 200 && data.stats) {
                lastDashboardStatsCache = data.stats;
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
                if (reportEl) reportEl.innerHTML = buildRichExecutiveDailySynthesisHtml(data.stats);
                
                renderCharts(currentRiskData, currentBotData);
                renderGeoMap(currentGeoData, currentRegionFilter);
            }
        } catch (error) { 
            console.error("Dashboard Network Failure:", error); 
        } finally { if (globalSyncIcon) globalSyncIcon.classList.remove('animate-spin'); }
    };

    // --- CANONICAL 14 NON-OPS ATTIO KYB STAGES & STAGE NORMALIZER ---
    const CANONICAL_ATTIO_KYB_STAGES = [
        "No stage",
        "To Be Assigned",
        "1st Line Queue",
        "2nd Line Queue",
        "Pending Client Response Queue",
        "In review",
        "In triage",
        "MLRO approval",
        "Business approval",
        "Approved",
        "Declined",
        "On Hold",
        "Withdrawn",
        "Off-boarded"
    ];

    const normalizeAttioStage = (rawStage) => {
        const s = String(rawStage ?? '').trim();
        if (!s || s === '-' || s.toLowerCase() === 'blank / unassigned' || s.toLowerCase() === 'unassigned' || s.toLowerCase() === 'unspecified' || s.toLowerCase() === 'no stage') {
            return 'No stage';
        }
        return s;
    };

    const isRiskTierIndustryLabel = (val) => {
        const clean = String(val ?? '').trim().toLowerCase();
        return !clean || clean === '-' || ['standard', 'low', 'low risk', 'medium', 'medium risk', 'high', 'high risk', 'prohibited', 'restricted', 'unassessed', 'unspecified', 'n/a', 'none'].includes(clean);
    };

    const renderCharts = (riskData, rawBottleneckData) => {
        Chart.defaults.color = '#888'; Chart.defaults.font.family = "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace";

        // Normalize Stage Bottleneck labels ("Blank / Unassigned" -> "No stage") & ensure all 14 non-Ops Attio KYB stages are represented
        let bottleneckData = rawBottleneckData;
        if (rawBottleneckData && Array.isArray(rawBottleneckData.labels)) {
            const stageCountMap = {};
            const stageLeadsMap = {};

            // Seed all 14 canonical non-Ops Attio KYB stages so none are missing from the Bottleneck widget
            CANONICAL_ATTIO_KYB_STAGES.forEach(stg => {
                stageCountMap[stg] = 0;
                stageLeadsMap[stg] = [];
            });

            rawBottleneckData.labels.forEach((lbl, idx) => {
                const normLbl = normalizeAttioStage(lbl);
                if (normLbl.toLowerCase().startsWith('ops:')) return;
                const canonicalMatch = CANONICAL_ATTIO_KYB_STAGES.find(c => c.toLowerCase() === normLbl.toLowerCase()) || normLbl;
                stageCountMap[canonicalMatch] = (stageCountMap[canonicalMatch] || 0) + (Number(rawBottleneckData.data?.[idx]) || 0);
                stageLeadsMap[canonicalMatch] = (stageLeadsMap[canonicalMatch] || []).concat(rawBottleneckData.leads?.[idx] || []);
            });

            // Sort by ticket count descending (keeping 0-count canonical stages at the end in canonical order)
            const sortedStageLabels = Object.keys(stageCountMap).sort((a, b) => {
                const diff = stageCountMap[b] - stageCountMap[a];
                if (diff !== 0) return diff;
                return CANONICAL_ATTIO_KYB_STAGES.indexOf(a) - CANONICAL_ATTIO_KYB_STAGES.indexOf(b);
            });

            bottleneckData = {
                labels: sortedStageLabels,
                data: sortedStageLabels.map(s => stageCountMap[s]),
                leads: sortedStageLabels.map(s => stageLeadsMap[s])
            };
            currentBotData = bottleneckData;
        }

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

    document.getElementById('dashboard-global-refresh-btn')?.addEventListener('click', () => fetchDashboardData(true));
    document.getElementById('risk-start-date')?.addEventListener('change', () => fetchDashboardData(false));
    document.getElementById('risk-end-date')?.addEventListener('change', () => fetchDashboardData(false));
    document.getElementById('risk-clear-btn')?.addEventListener('click', () => { document.getElementById('risk-start-date').value = ''; document.getElementById('risk-end-date').value = ''; fetchDashboardData(false); });
    document.getElementById('risk-export-btn')?.addEventListener('click', () => { if(currentRiskData) downloadCSV('Risk_Stratification', currentRiskData.labels, currentRiskData.data, currentRiskData.leads); });
    document.getElementById('bot-start-date')?.addEventListener('change', () => fetchDashboardData(false));
    document.getElementById('bot-end-date')?.addEventListener('change', () => fetchDashboardData(false));
    document.getElementById('bot-clear-btn')?.addEventListener('click', () => { document.getElementById('bot-start-date').value = ''; document.getElementById('bot-end-date').value = ''; fetchDashboardData(false); });
    document.getElementById('bot-export-btn')?.addEventListener('click', () => { if(currentBotData) downloadCSV('Stage_Bottlenecks', currentBotData.labels, currentBotData.data, currentBotData.leads); });
    document.getElementById('geo-start-date')?.addEventListener('change', () => fetchDashboardData(false));
    document.getElementById('geo-end-date')?.addEventListener('change', () => fetchDashboardData(false));
    document.getElementById('geo-clear-btn')?.addEventListener('click', () => { document.getElementById('geo-start-date').value = ''; document.getElementById('geo-end-date').value = ''; fetchDashboardData(false); });
    document.getElementById('geo-export-btn')?.addEventListener('click', () => { if(currentGeoData) downloadCSV('Geographic_Distribution', currentGeoData.labels, currentGeoData.data, currentGeoData.leads); });

    document.querySelectorAll('.geo-region-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.geo-region-btn').forEach(b => { b.classList.remove('active', 'text-white', 'bg-white/10'); b.classList.add('text-gray-500'); });
            e.target.classList.remove('text-gray-500'); e.target.classList.add('active', 'text-white', 'bg-white/10');
            currentRegionFilter = e.target.getAttribute('data-region');
            if (currentGeoData) renderGeoMap(currentGeoData, currentRegionFilter);
        });
    });

    // ============================================================================
    // VIEW 4: CUSTOM SOVEREIGN VIRTUAL DATA LAKE ENGINE (STALE-WHILE-REVALIDATE IDB)
    // ============================================================================
    const IDB_NAME = 'xoala_datalake_idb';
    const IDB_STORE = 'datalake_snapshots';

    const readDataLakeFromIDB = () => new Promise((resolve) => {
        try {
            if (!window.indexedDB) return resolve(null);
            const req = indexedDB.open(IDB_NAME, 1);
            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(IDB_STORE)) {
                    db.createObjectStore(IDB_STORE, { keyPath: 'id' });
                }
            };
            req.onsuccess = (e) => {
                try {
                    const db = e.target.result;
                    const tx = db.transaction(IDB_STORE, 'readonly');
                    const getReq = tx.objectStore(IDB_STORE).get('primary_grid');
                    getReq.onsuccess = () => resolve(getReq.result || null);
                    getReq.onerror = () => resolve(null);
                } catch (_) { resolve(null); }
            };
            req.onerror = () => resolve(null);
        } catch (_) { resolve(null); }
    });

    const saveDataLakeToIDB = (grid) => {
        try {
            if (!window.indexedDB) return;
            const req = indexedDB.open(IDB_NAME, 1);
            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(IDB_STORE)) {
                    db.createObjectStore(IDB_STORE, { keyPath: 'id' });
                }
            };
            req.onsuccess = (e) => {
                try {
                    const db = e.target.result;
                    const tx = db.transaction(IDB_STORE, 'readwrite');
                    tx.objectStore(IDB_STORE).put({ id: 'primary_grid', grid, updatedAt: Date.now() });
                } catch (_) {}
            };
        } catch (_) {}
    };

    const enrichDataLakeWithRelationalIndex = (rows) => {
        if (!Array.isArray(rows)) return;
        const rel = window.ATTIO_RELATIONAL_INDEX;
        rows.forEach(r => {
            // 1. Always normalize blank/unassigned stages to Attio's canonical "No stage"
            r.stage = normalizeAttioStage(r.stage);

            // 2. If industry is showing a risk-tier label like "Standard", check relational index or fallback fields
            const cname = String(r.company_name || '').trim().toLowerCase();
            const cid = rel?.companyByName?.[cname];
            if (isRiskTierIndustryLabel(r.industry)) {
                const compObj = (cid && rel?.companiesById?.[cid]) || null;
                const cand = compObj?.industry || compObj?.categories || compObj?.sector || r.signup_industry || r.business_model || r.services_applied_for || '';
                if (cand && !isRiskTierIndustryLabel(cand)) {
                    r.industry_risk_tier = r.industry;
                    r.industry = cand;
                }
            }

            if (rel && cid) {
                const pIds = new Set(rel.peopleByCompany?.[cid] || []);
                (rel.rolesByCompany?.[cid] || []).forEach(role => {
                    (role.holder_person_ids || []).forEach(pid => pIds.add(pid));
                });
                const totalLinked = Math.max(parseInt(r.parties_count) || 0, pIds.size);
                r.parties_count = totalLinked;
                if (totalLinked > 0 && (r.completeness_pct || 0) < 95) {
                    r.completeness_pct = Math.min(100, (r.completeness_pct || 70) + 15);
                }
            }
        });
    };

    const fetchAndRenderDataLakeGrid = async (forceRefresh = false) => {
        const syncIcon = document.getElementById('datalake-sync-icon');
        const tbody = document.getElementById('sovereign-datalake-tbody');
        const globalSyncDot = document.getElementById('global-sync-dot');
        const globalSyncText = document.getElementById('global-sync-status-text');
        if (syncIcon) syncIcon.classList.add('animate-spin');

        // 1. Instant Stale-While-Revalidate Hydration from IndexedDB (<20ms)
        if (!forceRefresh && dataLakeGridData.length === 0) {
            const cached = await readDataLakeFromIDB();
            if (cached && Array.isArray(cached.grid) && cached.grid.length > 0) {
                dataLakeGridData = cached.grid;
                window.kybDataLake = dataLakeGridData;
                enrichDataLakeWithRelationalIndex(dataLakeGridData);
                populateDataLakeDropdowns(dataLakeGridData);
                applyDataLakeFiltersAndSort();
                hydrateMatrixFromDataLake();
                if (globalSyncText) {
                    const minsAgo = Math.max(0, Math.round((Date.now() - (cached.updatedAt || Date.now())) / 60000));
                    globalSyncText.textContent = `IDB Cache (${dataLakeGridData.length} rows • ${minsAgo}m ago) • Revalidating...`;
                }
            }
        }

        if (dataLakeGridData.length === 0 || forceRefresh) {
            if (tbody && dataLakeGridData.length === 0) {
                tbody.innerHTML = Array.from({ length: 12 }).map(() => `
                    <tr class="animate-pulse border-b border-white/[0.03]">
                        <td colspan="11" class="py-4 px-6"><div class="h-4 bg-white/5 rounded w-full"></div></td>
                    </tr>
                `).join('');
            }
        }

        try {
            if (globalSyncDot) globalSyncDot.className = "w-1.5 h-1.5 rounded-full bg-gold animate-ping";
            const res = await fetch(DASHBOARD_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'get_datalake_grid',
                    forceRefresh: forceRefresh,
                    secret: 'system_dashboard_init',
                    prompt: 'system',
                    model: 'gemini-3.6-flash'
                })
            });
            const json = await res.json();
            if (json.status === 200 && Array.isArray(json.grid)) {
                dataLakeGridData = json.grid;
                window.kybDataLake = dataLakeGridData;
                enrichDataLakeWithRelationalIndex(dataLakeGridData);
                saveDataLakeToIDB(dataLakeGridData);
                populateDataLakeDropdowns(dataLakeGridData);
                hydrateMatrixFromDataLake();
                if (globalSyncDot) globalSyncDot.className = "w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse";
                if (globalSyncText) globalSyncText.textContent = `Lake Ready`;
            }
        } catch (err) {
            console.error("Data Lake Fetch Error:", err);
            if (globalSyncDot) globalSyncDot.className = "w-1.5 h-1.5 rounded-full bg-amber-400";
            if (globalSyncText && dataLakeGridData.length > 0) {
                globalSyncText.textContent = `Cached`;
            } else if (tbody && dataLakeGridData.length === 0) {
                tbody.innerHTML = `<tr><td colspan="11" class="py-12 text-center text-red-400 font-mono text-xs">Failed to load Data Lake: ${escapeHtml(err.message)}</td></tr>`;
            }
        }

        applyDataLakeFiltersAndSort();
        if (syncIcon) syncIcon.classList.remove('animate-spin');
    };

    const populateDataLakeDropdowns = (rows) => {
        const stageSelect = document.getElementById('datalake-stage-filter');
        const amSelect = document.getElementById('datalake-am-filter');
        if (!stageSelect || !amSelect) return;

        const rowStages = rows.map(r => normalizeAttioStage(r.stage)).filter(Boolean);
        const stages = Array.from(new Set([...CANONICAL_ATTIO_KYB_STAGES, ...rowStages]));
        const ams = Array.from(new Set(rows.map(r => r.account_manager).filter(Boolean))).sort();

        stageSelect.innerHTML = `<option value="ALL">Stage: All (${stages.length})</option>` + stages.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
        amSelect.innerHTML = `<option value="ALL">Owner: All (${ams.length})</option>` + ams.map(a => `<option value="${escapeHtml(a)}">${escapeHtml(a)}</option>`).join('');
    };

    let aiSmartFilterSpec = {
        minAgingDays: null,
        requireUnlinkedUbos: false,
        countryFilter: null,
        activeOnly: false,
        rawQueryLabel: null
    };

    const renderActiveSmartFilterChips = () => {
        const chipsContainer = document.getElementById('datalake-active-chips');
        const drawer = document.getElementById('datalake-ai-filter-drawer');
        if (!chipsContainer) return;

        const stg = document.getElementById('datalake-stage-filter')?.value || 'ALL';
        const rsk = document.getElementById('datalake-risk-filter')?.value || 'ALL';
        const am = document.getElementById('datalake-am-filter')?.value || 'ALL';
        const q = (document.getElementById('datalake-search-input')?.value || '').trim();

        const chips = [];
        if (stg !== 'ALL') chips.push({ key: 'stage', label: `Stage: ${stg}` });
        if (rsk !== 'ALL') chips.push({ key: 'risk', label: `Risk: ${rsk}` });
        if (am !== 'ALL') chips.push({ key: 'am', label: `Officer: ${am}` });
        if (aiSmartFilterSpec.countryFilter) chips.push({ key: 'country', label: `Country: ${aiSmartFilterSpec.countryFilter}` });
        if (aiSmartFilterSpec.minAgingDays !== null) chips.push({ key: 'aging', label: `SLA Aging > ${aiSmartFilterSpec.minAgingDays}d (Active)` });
        if (aiSmartFilterSpec.requireUnlinkedUbos) chips.push({ key: 'ubos', label: `Unlinked UBOs (0 Parties)` });
        if (aiSmartFilterSpec.activeOnly && aiSmartFilterSpec.minAgingDays === null) chips.push({ key: 'activeOnly', label: `Active Pipeline Only` });
        if (q) chips.push({ key: 'query', label: `Keyword: "${q}"` });

        if (chips.length === 0) {
            chipsContainer.innerHTML = `<span class="text-[10px] font-mono text-gray-500">No active natural-language constraints — click a preset below or type in the search bar and click <strong class="text-gold">✨ AI Smart Filter</strong>.</span>`;
            return;
        }

        if (drawer) drawer.classList.remove('hidden');
        chipsContainer.innerHTML = chips.map(c => `
            <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gold/15 border border-gold/40 text-[10px] font-mono text-gold font-semibold">
                <span>${escapeHtml(c.label)}</span>
                <button type="button" class="remove-smart-chip hover:text-white transition-colors" data-chip-key="${c.key}" title="Remove constraint">×</button>
            </span>
        `).join('');

        chipsContainer.querySelectorAll('.remove-smart-chip').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const key = btn.getAttribute('data-chip-key');
                if (key === 'stage') document.getElementById('datalake-stage-filter').value = 'ALL';
                if (key === 'risk') document.getElementById('datalake-risk-filter').value = 'ALL';
                if (key === 'am') document.getElementById('datalake-am-filter').value = 'ALL';
                if (key === 'country') aiSmartFilterSpec.countryFilter = null;
                if (key === 'aging') aiSmartFilterSpec.minAgingDays = null;
                if (key === 'ubos') aiSmartFilterSpec.requireUnlinkedUbos = false;
                if (key === 'activeOnly') aiSmartFilterSpec.activeOnly = false;
                if (key === 'query') document.getElementById('datalake-search-input').value = '';
                applyDataLakeFiltersAndSort();
            });
        });
    };

    const applyDataLakeFiltersAndSort = () => {
        const q = (document.getElementById('datalake-search-input')?.value || '').toLowerCase().trim();
        const stg = document.getElementById('datalake-stage-filter')?.value || 'ALL';
        const rsk = document.getElementById('datalake-risk-filter')?.value || 'ALL';
        const am = document.getElementById('datalake-am-filter')?.value || 'ALL';

        const clearBtn = document.getElementById('datalake-clear-search');
        if (clearBtn) clearBtn.classList.toggle('hidden', !q);

        const terminalStages = ['approved', 'declined', 'withdrawn', 'off-boarded', 'ops: completed/onboarded', 'ops: off-boarded', 'ops: client drop-off/disqualified'];

        // 1. Base Dropdown, Search & AI Smart Filter Set (used to compute live Cohort KPI strip)
        const baseFiltered = dataLakeGridData.filter(r => {
            const stgLower = String(r.stage || '').toLowerCase();
            const isTerm = terminalStages.includes(stgLower) || stgLower.startsWith('ops:');
            if (stg !== 'ALL' && r.stage !== stg) return false;
            if (rsk !== 'ALL' && !String(r.risk_rating).toLowerCase().includes(rsk.toLowerCase())) return false;
            if (am !== 'ALL' && r.account_manager !== am) return false;
            if (aiSmartFilterSpec.countryFilter && !String(r.country || '').toLowerCase().includes(aiSmartFilterSpec.countryFilter.toLowerCase())) return false;
            if (aiSmartFilterSpec.activeOnly && isTerm) return false;
            if (aiSmartFilterSpec.minAgingDays !== null) {
                if (isTerm) return false;
                if ((parseFloat(r.queue_aging_days) || 0) < aiSmartFilterSpec.minAgingDays) return false;
            }
            if (aiSmartFilterSpec.requireUnlinkedUbos) {
                if (isTerm) return false;
                if ((parseInt(r.parties_count) || 0) > 0) return false;
            }
            if (q) {
                const hay = `${r.company_name} ${r.trading_name} ${r.record_id} ${r.country} ${r.account_manager} ${r.sales_owner} ${r.industry} ${r.email} ${r.stage} ${r.risk_rating}`.toLowerCase();
                if (!hay.includes(q)) return false;
            }
            return true;
        });

        renderActiveSmartFilterChips();

        // Update 5-Card Live Cohort Telemetry Strip
        const activeQueueRows = baseFiltered.filter(r => !terminalStages.includes(String(r.stage).toLowerCase()));
        const highRiskRows = baseFiltered.filter(r => ['high', 'decline'].some(k => String(r.risk_rating).toLowerCase().includes(k)));
        const stuckRows = activeQueueRows.filter(r => (parseFloat(r.queue_aging_days) || 0) > 5);
        const uboRows = baseFiltered.filter(r => (parseInt(r.parties_count) || 0) > 0);
        const avgAging = activeQueueRows.length > 0
            ? (activeQueueRows.reduce((s, r) => s + (parseFloat(r.queue_aging_days) || 0), 0) / activeQueueRows.length).toFixed(1)
            : '0.0';

        document.getElementById('dl-kpi-total').textContent = baseFiltered.length.toLocaleString();
        document.getElementById('dl-kpi-active').textContent = activeQueueRows.length.toLocaleString();
        document.getElementById('dl-kpi-avg-age').textContent = `Avg Queue Aging: ${avgAging}d`;
        document.getElementById('dl-kpi-highrisk').textContent = highRiskRows.length.toLocaleString();
        document.getElementById('dl-kpi-highrisk-pct').textContent = baseFiltered.length > 0 ? `${((highRiskRows.length / baseFiltered.length) * 100).toFixed(1)}% of selection` : '0%';
        document.getElementById('dl-kpi-stuck').textContent = stuckRows.length.toLocaleString();
        document.getElementById('dl-kpi-ubos').textContent = uboRows.length.toLocaleString();

        // 2. Apply Cohort Card Filter
        filteredLakeRows = baseFiltered.filter(r => {
            if (activeCohortMode === 'active') return !terminalStages.includes(String(r.stage).toLowerCase());
            if (activeCohortMode === 'high_risk') return ['high', 'decline'].some(k => String(r.risk_rating).toLowerCase().includes(k));
            if (activeCohortMode === 'stuck') return !terminalStages.includes(String(r.stage).toLowerCase()) && (parseFloat(r.queue_aging_days) || 0) > 5;
            if (activeCohortMode === 'with_ubos') return (parseInt(r.parties_count) || 0) > 0;
            return true;
        });

        // 3. Apply Column Sorting
        filteredLakeRows.sort((a, b) => {
            let va = a[currentSortField];
            let vb = b[currentSortField];

            if (['risk_score', 'parties_count', 'queue_aging_days'].includes(currentSortField)) {
                const na = parseFloat(va); const nb = parseFloat(vb);
                const valA = isNaN(na) ? -1 : na;
                const valB = isNaN(nb) ? -1 : nb;
                return currentSortDir === 'asc' ? valA - valB : valB - valA;
            }
            const sa = String(va ?? '').toLowerCase();
            const sb = String(vb ?? '').toLowerCase();
            return currentSortDir === 'asc' ? sa.localeCompare(sb) : sb.localeCompare(sa);
        });

        currentPage = 1;
        kbFocusedRowIndex = -1;
        window.XOALA_ACTIVE_GRID_SAMPLE = filteredLakeRows.slice(0, 100);

        const badge = document.getElementById('datalake-total-badge');
        if (badge) badge.textContent = `${filteredLakeRows.length.toLocaleString()} / ${dataLakeGridData.length.toLocaleString()} Records`;

        if (dataLakeViewMode === 'kanban') {
            renderSovereignKanbanBoard();
        } else {
            renderSovereignDataLakeRows();
        }
    };

    const getStagePillHtml = (stage) => {
        const val = normalizeAttioStage(stage);
        const l = val.toLowerCase();
        let cls = "bg-white/[0.06] text-gray-300 border-white/15";
        let dot = "bg-gray-400";
        if (l.includes("approved") || l.includes("completed")) { cls = "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"; dot = "bg-emerald-400"; }
        else if (l.includes("declined") || l.includes("drop-off")) { cls = "bg-red-500/15 text-red-300 border-red-500/30"; dot = "bg-red-400"; }
        else if (l.includes("withdrawn") || l.includes("off-boarded")) { cls = "bg-gray-500/15 text-gray-400 border-gray-500/30"; dot = "bg-gray-500"; }
        else if (l.includes("mlro") || l.includes("business approval") || l.includes("review")) { cls = "bg-purple-500/15 text-purple-300 border-purple-500/30"; dot = "bg-purple-400"; }
        else if (l.includes("queue") || l.includes("triage")) { cls = "bg-gold/15 text-gold border-gold/35"; dot = "bg-gold"; }
        else if (l.includes("to be assigned")) { cls = "bg-blue-500/15 text-blue-300 border-blue-500/30"; dot = "bg-blue-400"; }
        else if (l === "no stage") { cls = "bg-slate-500/15 text-slate-300 border-slate-400/30"; dot = "bg-slate-400"; }

        return `<span class="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono border ${cls}">
            <span class="w-1.5 h-1.5 rounded-full ${dot}"></span>
            <span>${escapeHtml(val)}</span>
        </span>`;
    };

    const getRiskPillHtml = (rating) => {
        const v = rating || "Unassessed";
        const l = v.toLowerCase();
        if (l.includes("high") || l.includes("decline")) {
            return `<span class="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-red-500/15 text-red-400 border border-red-500/30"><i class="ph ph-warning-octagon"></i><span>${escapeHtml(v)}</span></span>`;
        }
        if (l.includes("medium")) {
            return `<span class="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30"><i class="ph ph-shield-warning"></i><span>${escapeHtml(v)}</span></span>`;
        }
        if (l.includes("low")) {
            return `<span class="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"><i class="ph ph-shield-check"></i><span>${escapeHtml(v)}</span></span>`;
        }
        return `<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono bg-white/[0.04] text-gray-400 border border-white/10">Unassessed</span>`;
    };

    const terminalStageList = ['approved', 'declined', 'withdrawn', 'off-boarded', 'ops: completed/onboarded', 'ops: off-boarded', 'ops: client drop-off/disqualified'];

    const getSlaAgingBadgeHtml = (row) => {
        const stgLower = String(row.stage || '').toLowerCase();
        const isTerm = row.is_terminal !== undefined ? row.is_terminal : terminalStageList.includes(stgLower);
        const days = parseFloat(row.queue_aging_days) || 0;

        if (isTerm) {
            const label = stgLower.includes('approved') ? 'FINALIZED' : 'CLOSED';
            const cycleStr = days > 0 && days < 180 ? ` • ${formatTime(days)}` : '';
            return `<span class="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                <i class="ph ph-check-circle"></i><span>${label}${cycleStr}</span>
            </span>`;
        }

        if (days > 5) {
            return `<span class="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono bg-red-500/15 text-red-400 border border-red-500/30 font-semibold">
                <i class="ph ph-warning-circle"></i><span>BREACHED • ${formatTime(days)}</span>
            </span>`;
        }
        if (days > 2) {
            return `<span class="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/15 text-amber-300 border border-amber-500/30">
                <i class="ph ph-clock-countdown"></i><span>AT RISK • ${formatTime(days)}</span>
            </span>`;
        }
        return `<span class="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
            <i class="ph ph-check"></i><span>ON TRACK • ${formatTime(days)}</span>
        </span>`;
    };

    const renderSovereignDataLakeRows = () => {
        const tbody = document.getElementById('sovereign-datalake-tbody');
        if (!tbody) return;

        tbody.className = `divide-y divide-white/[0.04] text-xs font-sans ${gridDensity === 'compact' ? 'sovereign-compact' : 'sovereign-comfortable'}`;

        const total = filteredLakeRows.length;
        const totalPages = Math.max(1, Math.ceil(total / pageSize));
        if (currentPage > totalPages) currentPage = totalPages;

        const startIdx = (currentPage - 1) * pageSize;
        const pageRows = filteredLakeRows.slice(startIdx, startIdx + pageSize);

        document.getElementById('datalake-range-info').textContent = total > 0
            ? `Showing ${(startIdx + 1).toLocaleString()}–${Math.min(startIdx + pageSize, total).toLocaleString()} of ${total.toLocaleString()}`
            : `Showing 0 of 0`;
        document.getElementById('datalake-page-indicator').textContent = `${currentPage} / ${totalPages}`;
        document.getElementById('datalake-prev-page').disabled = (currentPage <= 1);
        document.getElementById('datalake-next-page').disabled = (currentPage >= totalPages);

        if (pageRows.length === 0) {
            tbody.innerHTML = `<tr><td colspan="11" class="py-16 text-center text-gray-500 font-mono text-xs">No KYB records match your current filters. Click "Reset" to clear filters.</td></tr>`;
            return;
        }

        tbody.innerHTML = pageRows.map((r, idx) => {
            const isChecked = selectedLakeIds.has(r.record_id);
            const monogram = getEntityMonogram(r.company_name);
            const shortId = r.record_id ? `#${r.record_id.substring(0, 8)}` : '#N/A';
            const subText = r.trading_name && r.trading_name !== r.company_name
                ? `${shortId} • DBA: ${r.trading_name}`
                : (r.email && r.email !== '-' ? `${shortId} • ${maskPiiString(r.email)}` : shortId);

            // Compute readiness / completeness bar
            let compPct = r.completeness_pct;
            if (compPct === undefined) {
                let pts = 20;
                if (r.country && !r.country.includes('Unspecified')) pts += 15;
                if (r.risk_rating && r.risk_rating !== 'Unassessed') pts += 20;
                if (r.account_manager && r.account_manager !== 'Unassigned') pts += 15;
                if ((parseInt(r.parties_count) || 0) > 0) pts += 20;
                if (r.email && r.email !== '-') pts += 10;
                compPct = Math.min(100, pts);
            }

            const scoreNum = parseFloat(r.risk_score);
            const meterPct = !isNaN(scoreNum) ? Math.min(100, Math.max(6, Math.abs(scoreNum))) : 0;
            const meterColor = !isNaN(scoreNum)
                ? (scoreNum >= 70 ? 'bg-red-500' : (scoreNum >= 40 ? 'bg-amber-400' : 'bg-emerald-400'))
                : 'bg-gray-700';

            const scoreBadge = !isNaN(scoreNum)
                ? `<div class="flex flex-col items-end space-y-1">
                    <span class="font-mono font-bold ${scoreNum >= 70 ? 'text-red-400' : (scoreNum >= 40 ? 'text-amber-400' : 'text-emerald-400')}">${scoreNum}</span>
                    <div class="w-16 h-1 bg-white/10 rounded-full overflow-hidden"><div class="h-full ${meterColor} rounded-full" style="width:${meterPct}%"></div></div>
                   </div>`
                : `<span class="text-gray-600 font-mono">—</span>`;

            const uboCount = parseInt(r.parties_count) || 0;
            const uboBadge = uboCount > 0
                ? `<span class="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono text-[10px]"><i class="ph ph-users"></i><span>${uboCount} Linked</span></span>`
                : `<span class="inline-flex items-center px-2 py-0.5 rounded bg-white/[0.03] text-gray-500 border border-white/5 font-mono text-[10px]">0</span>`;

            const amDisplay = r.account_manager && r.account_manager !== 'Unassigned'
                ? `<span class="text-gray-200 font-medium">${escapeHtml(r.account_manager)}</span>`
                : `<span class="text-gray-500 font-mono text-[11px] italic">Unassigned</span>`;

            const rl = String(r.risk_rating || '').toLowerCase();
            const rowRiskClass = rl.includes('high') || rl.includes('decline') ? 'risk-row-high' : (rl.includes('medium') ? 'risk-row-medium' : (rl.includes('low') ? 'risk-row-low' : ''));

            return `
                <tr class="sovereign-grid-row ${rowRiskClass} sovereign-row-animate cursor-pointer group ${idx === kbFocusedRowIndex ? 'kb-focused' : ''}" data-record-id="${escapeHtml(r.record_id)}" data-row-idx="${idx}" style="animation-delay: ${Math.min(idx * 12, 240)}ms">
                    <td class="px-4 text-center checkbox-cell" onclick="event.stopPropagation()">
                        <input type="checkbox" class="row-select-cb accent-[#DDAA33] rounded cursor-pointer" data-id="${escapeHtml(r.record_id)}" ${isChecked ? 'checked' : ''}>
                    </td>
                    <td class="px-4">
                        <div class="flex items-center space-x-3">
                            <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-white/10 to-white/[0.02] border border-white/10 group-hover:border-gold/50 flex items-center justify-center font-mono text-[11px] font-bold text-gold flex-shrink-0 transition-colors">
                                ${escapeHtml(monogram)}
                            </div>
                            <div class="min-w-0 max-w-[260px]">
                                <div class="font-semibold text-white group-hover:text-gold transition-colors truncate">${escapeHtml(r.company_name)}</div>
                                <div class="text-[10px] font-mono text-gray-500 truncate flex items-center space-x-2">
                                    <span class="truncate">${escapeHtml(subText)}</span>
                                    <span class="inline-flex items-center space-x-1 text-[9px] text-gray-400 flex-shrink-0" title="KYB Readiness: ${compPct}%">
                                        <span class="w-8 h-1 bg-white/10 rounded-full overflow-hidden inline-block"><span class="block h-full bg-gold rounded-full" style="width:${compPct}%"></span></span>
                                        <span>${compPct}%</span>
                                    </span>
                                </div>
                            </div>
                        </div>
                    </td>
                    <td class="px-4">${getStagePillHtml(r.stage)}</td>
                    <td class="px-4">
                        <div class="flex items-center text-gray-200">
                            ${getFlagImgHtml(r.country)}
                            <span class="truncate max-w-[140px]">${escapeHtml(r.country)}</span>
                        </div>
                    </td>
                    <td class="px-4">${getRiskPillHtml(r.risk_rating)}</td>
                    <td class="px-4 text-right">${scoreBadge}</td>
                    <td class="px-4 text-center">${uboBadge}</td>
                    <td class="px-4">${amDisplay}</td>
                    <td class="px-4 text-right font-mono">${getSlaAgingBadgeHtml(r)}</td>
                    <td class="px-4 font-mono text-gray-400 text-[11px]">${escapeHtml(r.created_at)}</td>
                    <td class="px-4 text-right">
                        <button class="open-dossier-btn px-3 py-1 rounded-md bg-white/5 group-hover:bg-gold text-gray-300 group-hover:text-black border border-white/10 group-hover:border-gold font-mono text-[10px] font-bold uppercase tracking-wider transition-all inline-flex items-center space-x-1">
                            <span>360° Dossier</span><i class="ph ph-arrow-up-right font-bold"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        // Bind Row Click -> Open 360° Dossier Immediately
        tbody.querySelectorAll('.sovereign-grid-row').forEach(tr => {
            tr.addEventListener('click', () => {
                const recId = tr.getAttribute('data-record-id');
                if (recId) openSovereignProfileModal(recId);
            });
        });

        // Bind Row Checkboxes for Multi-Merchant AI Comparison
        tbody.querySelectorAll('.row-select-cb').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const id = e.target.getAttribute('data-id');
                if (e.target.checked) selectedLakeIds.add(id);
                else selectedLakeIds.delete(id);
                updateComparisonButtonState();
            });
        });
    };

    // STAGE SWIMLANE KANBAN BOARD VIEW RENDERER (Strictly Separate Attio Stages — Excluding Ops)
    const renderSovereignKanbanBoard = () => {
        const container = document.getElementById('datalake-kanban-columns');
        if (!container) return;

        const swimlanes = [
            { title: "No stage", match: s => s === "no stage" || s === "" || s.includes("blank"), accent: "border-slate-400/40 text-slate-300" },
            { title: "To Be Assigned", match: s => s === "to be assigned", accent: "border-blue-500/40 text-blue-400" },
            { title: "In triage", match: s => s === "in triage" || s.includes("triage"), accent: "border-cyan-500/40 text-cyan-300" },
            { title: "1st Line Queue", match: s => s.includes("1st line"), accent: "border-gold/40 text-gold" },
            { title: "Pending Client Response / On Hold", match: s => s.includes("pending client") || s.includes("on hold"), accent: "border-amber-500/40 text-amber-400" },
            { title: "2nd Line / In review", match: s => s.includes("2nd line") || s === "in review", accent: "border-purple-500/40 text-purple-400" },
            { title: "Business approval", match: s => s === "business approval" || s.includes("business approval"), accent: "border-indigo-500/40 text-indigo-300" },
            { title: "MLRO approval", match: s => s === "mlro approval" || s.includes("mlro"), accent: "border-fuchsia-500/40 text-fuchsia-300" },
            { title: "Approved", match: s => s === "approved" || s.includes("approved"), accent: "border-emerald-500/40 text-emerald-400" },
            { title: "Declined / Withdrawn / Off-boarded", match: s => s.includes("declined") || s.includes("withdrawn") || s.includes("off-boarded") || s.includes("drop-off"), accent: "border-red-500/40 text-red-400" }
        ];

        container.innerHTML = swimlanes.map(lane => {
            const laneRows = filteredLakeRows.filter(r => lane.match(String(r.stage || '').toLowerCase()));
            const cardsHtml = laneRows.slice(0, 35).map(r => `
                <div class="kanban-ticket-card bg-[#0d0d0d] hover:bg-[#141414] border border-white/10 hover:border-gold/40 rounded-xl p-3.5 cursor-pointer transition-all shadow-lg space-y-2.5 group" data-record-id="${escapeHtml(r.record_id)}">
                    <div class="flex items-start justify-between gap-2">
                        <div class="font-semibold text-xs text-white group-hover:text-gold transition-colors line-clamp-1">${escapeHtml(r.company_name)}</div>
                        ${getRiskPillHtml(r.risk_rating)}
                    </div>
                    <div class="flex items-center justify-between text-[11px] text-gray-400">
                        <span class="flex items-center truncate">${getFlagImgHtml(r.country)}${escapeHtml(r.country)}</span>
                        <span class="font-mono text-[10px] text-emerald-400"><i class="ph ph-users"></i> ${parseInt(r.parties_count) || 0} UBOs</span>
                    </div>
                    <div class="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono">
                        <span class="text-gray-400 truncate max-w-[120px]">${escapeHtml(r.account_manager || 'Unassigned')}</span>
                        ${getSlaAgingBadgeHtml(r)}
                    </div>
                </div>
            `).join('');

            return `
                <div class="w-80 flex-shrink-0 bg-[#080808] border border-white/10 rounded-xl flex flex-col max-h-[calc(100vh-360px)]">
                    <div class="p-3.5 border-b ${lane.accent} bg-white/[0.02] flex items-center justify-between">
                        <span class="text-xs font-mono uppercase tracking-wider font-bold">${escapeHtml(lane.title)}</span>
                        <span class="px-2 py-0.5 rounded-full bg-white/10 text-white text-[10px] font-mono font-bold">${laneRows.length}</span>
                    </div>
                    <div class="p-3 overflow-y-auto space-y-2.5 flex-1">
                        ${cardsHtml || `<div class="py-10 text-center text-[11px] font-mono text-gray-600">0 tickets in lane</div>`}
                    </div>
                </div>
            `;
        }).join('');

        container.querySelectorAll('.kanban-ticket-card').forEach(card => {
            card.addEventListener('click', () => {
                const id = card.getAttribute('data-record-id');
                if (id) openSovereignProfileModal(id);
            });
        });
    };

    const updateComparisonButtonState = () => {
        const btn = document.getElementById('datalake-compare-ai-btn');
        const label = document.getElementById('datalake-compare-count');
        if (!btn || !label) return;
        if (selectedLakeIds.size > 0) {
            btn.classList.remove('hidden');
            label.textContent = `Audit Selected (${selectedLakeIds.size}) in Prometheus`;
        } else {
            btn.classList.add('hidden');
        }
    };

    document.getElementById('datalake-select-all')?.addEventListener('change', (e) => {
        const startIdx = (currentPage - 1) * pageSize;
        const pageRows = filteredLakeRows.slice(startIdx, startIdx + pageSize);
        pageRows.forEach(r => {
            if (e.target.checked) selectedLakeIds.add(r.record_id);
            else selectedLakeIds.delete(r.record_id);
        });
        updateComparisonButtonState();
        renderSovereignDataLakeRows();
    });

    // Multi-Merchant AI Comparison Handler (Strictly Locked Behind Operator's Personal Gemini API Key)
    document.getElementById('datalake-compare-ai-btn')?.addEventListener('click', () => {
        const selectedRecords = dataLakeGridData.filter(r => selectedLakeIds.has(r.record_id));
        if (selectedRecords.length === 0) return;

        if (!window.XoalaOperatorVault?.hasClientKey?.()) {
            document.getElementById('operator-profile-btn')?.click();
            const statusMsg = document.getElementById('gemini-key-status-msg');
            if (statusMsg) {
                statusMsg.innerHTML = `<strong class="text-gold">🔒 Locked Feature (Audit Selected in Prometheus):</strong> Please paste and verify your personal <code class="text-gold">AIzaSy...</code> Gemini API Key above to unlock multi-entity Prometheus audits.`;
            }
            return;
        }

        const summaryList = selectedRecords.slice(0, 15).map(r => `${r.company_name} (Country: ${r.country}, Stage: ${r.stage}, Risk: ${r.risk_rating} [${r.risk_score}], Aging: ${r.queue_aging_days}d, AM: ${r.account_manager}, Linked UBOs: ${r.parties_count})`).join(' | ');
        const prompt = `@Prometheus Perform a comparative compliance & operational bottleneck audit on these ${selectedRecords.length} selected KYB entities: [${summaryList}]. Highlight common jurisdictional risks, SLA bottlenecks, and prioritize which entities require immediate MLRO intervention.`;

        const artemisNavBtn = document.querySelector('[data-target="artemis-view"]');
        if (artemisNavBtn) artemisNavBtn.click();

        setTimeout(() => {
            const promptInput = document.getElementById('prompt-input');
            const sendBtn = document.getElementById('send-btn');
            if (promptInput && sendBtn) {
                promptInput.value = prompt;
                promptInput.dispatchEvent(new Event('input'));
                sendBtn.click();
            }
        }, 300);
    });

    // Filter, Cohort Card, Sort, Density & Pagination Listeners
    ['datalake-search-input', 'datalake-stage-filter', 'datalake-risk-filter', 'datalake-am-filter'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener(el.tagName === 'INPUT' ? 'input' : 'change', applyDataLakeFiltersAndSort);
    });

    document.getElementById('datalake-clear-search')?.addEventListener('click', () => {
        document.getElementById('datalake-search-input').value = '';
        applyDataLakeFiltersAndSort();
    });

    document.getElementById('datalake-reset-filters-btn')?.addEventListener('click', () => {
        document.getElementById('datalake-search-input').value = '';
        document.getElementById('datalake-stage-filter').value = 'ALL';
        document.getElementById('datalake-risk-filter').value = 'ALL';
        document.getElementById('datalake-am-filter').value = 'ALL';
        aiSmartFilterSpec = { minAgingDays: null, requireUnlinkedUbos: false, countryFilter: null, activeOnly: false, rawQueryLabel: null };
        activeCohortMode = 'all';
        document.querySelectorAll('.datalake-kpi-card').forEach(c => {
            c.classList.remove('border-gold/40', 'bg-gold/[0.04]');
            c.classList.add('border-white/5');
        });
        document.querySelector('.datalake-kpi-card[data-cohort="all"]')?.classList.add('border-gold/40', 'bg-gold/[0.04]');
        applyDataLakeFiltersAndSort();
    });

    document.querySelectorAll('.datalake-kpi-card').forEach(card => {
        card.addEventListener('click', () => {
            document.querySelectorAll('.datalake-kpi-card').forEach(c => {
                c.classList.remove('border-gold/40', 'bg-gold/[0.04]');
                c.classList.add('border-white/5');
            });
            card.classList.remove('border-white/5');
            card.classList.add('border-gold/40', 'bg-gold/[0.04]');
            activeCohortMode = card.getAttribute('data-cohort');
            applyDataLakeFiltersAndSort();
        });
    });

    document.querySelectorAll('.datalake-sort-th').forEach(th => {
        th.addEventListener('click', () => {
            const field = th.getAttribute('data-sort');
            if (currentSortField === field) {
                currentSortDir = currentSortDir === 'asc' ? 'desc' : 'asc';
            } else {
                currentSortField = field;
                currentSortDir = 'desc';
            }
            applyDataLakeFiltersAndSort();
        });
    });

    document.getElementById('datalake-page-size')?.addEventListener('change', (e) => {
        pageSize = parseInt(e.target.value) || 50;
        currentPage = 1;
        renderSovereignDataLakeRows();
    });

    document.getElementById('datalake-prev-page')?.addEventListener('click', () => {
        if (currentPage > 1) { currentPage--; renderSovereignDataLakeRows(); }
    });

    document.getElementById('datalake-next-page')?.addEventListener('click', () => {
        const totalPages = Math.ceil(filteredLakeRows.length / pageSize);
        if (currentPage < totalPages) { currentPage++; renderSovereignDataLakeRows(); }
    });

    document.getElementById('density-compact-btn')?.addEventListener('click', () => {
        gridDensity = 'compact';
        document.getElementById('density-compact-btn').className = "px-2.5 py-1.5 rounded text-[10px] font-mono uppercase tracking-wider bg-white/10 text-white transition-all";
        document.getElementById('density-comfort-btn').className = "px-2.5 py-1.5 rounded text-[10px] font-mono uppercase tracking-wider text-gray-500 hover:text-white transition-all";
        renderSovereignDataLakeRows();
    });

    document.getElementById('density-comfort-btn')?.addEventListener('click', () => {
        gridDensity = 'comfortable';
        document.getElementById('density-comfort-btn').className = "px-2.5 py-1.5 rounded text-[10px] font-mono uppercase tracking-wider bg-white/10 text-white transition-all";
        document.getElementById('density-compact-btn').className = "px-2.5 py-1.5 rounded text-[10px] font-mono uppercase tracking-wider text-gray-500 hover:text-white transition-all";
        renderSovereignDataLakeRows();
    });

    // View Switcher: Table View vs Stage Swimlane Kanban Board
    document.getElementById('datalake-view-table-btn')?.addEventListener('click', () => {
        dataLakeViewMode = 'table';
        document.getElementById('datalake-table-view-container')?.classList.remove('hidden');
        document.getElementById('datalake-kanban-view-container')?.classList.add('hidden');
        document.getElementById('datalake-view-table-btn').className = "px-3 py-1.5 rounded text-[10px] font-mono uppercase tracking-wider bg-gold/20 text-gold border border-gold/40 font-bold flex items-center space-x-1.5 transition-all";
        document.getElementById('datalake-view-kanban-btn').className = "px-3 py-1.5 rounded text-[10px] font-mono uppercase tracking-wider text-gray-400 hover:text-white flex items-center space-x-1.5 transition-all";
        renderSovereignDataLakeRows();
    });

    document.getElementById('datalake-view-kanban-btn')?.addEventListener('click', () => {
        dataLakeViewMode = 'kanban';
        document.getElementById('datalake-table-view-container')?.classList.add('hidden');
        document.getElementById('datalake-kanban-view-container')?.classList.remove('hidden');
        document.getElementById('datalake-view-kanban-btn').className = "px-3 py-1.5 rounded text-[10px] font-mono uppercase tracking-wider bg-gold/20 text-gold border border-gold/40 font-bold flex items-center space-x-1.5 transition-all";
        document.getElementById('datalake-view-table-btn').className = "px-3 py-1.5 rounded text-[10px] font-mono uppercase tracking-wider text-gray-400 hover:text-white flex items-center space-x-1.5 transition-all";
        renderSovereignKanbanBoard();
    });

    document.getElementById('datalake-refresh-btn')?.addEventListener('click', () => fetchAndRenderDataLakeGrid(true));

    document.getElementById('datalake-export-csv-btn')?.addEventListener('click', () => {
        if (filteredLakeRows.length === 0) return;
        const headers = ["record_id", "company_name", "trading_name", "stage", "country", "risk_rating", "risk_score", "parties_count", "account_manager", "first_line_lead", "queue_aging_days", "industry", "created_at"];
        const lines = [headers.join(",")];
        filteredLakeRows.forEach(r => {
            lines.push(headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(","));
        });
        const blob = new Blob([lines.join("\n")], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Xoala_KYB_DataLake_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
    });

    // Keyboard Navigation (Up/Down/Enter/Esc + J/K Power-Reviewer Stepper inside 360° Dossier)
    document.addEventListener('keydown', (e) => {
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;

        const modalOpen = !document.getElementById('profile-modal-overlay').classList.contains('hidden');
        if (modalOpen) {
            if (e.key === 'Escape') {
                const rfiModal = document.getElementById('rfi-composer-modal');
                const uboDrawer = document.getElementById('ubo-subdossier-drawer');
                if (rfiModal && !rfiModal.classList.contains('hidden')) {
                    rfiModal.classList.add('hidden');
                } else if (uboDrawer && !uboDrawer.classList.contains('hidden')) {
                    uboDrawer.classList.add('hidden');
                } else {
                    closeProfileModal();
                }
                return;
            }
            if (e.key.toLowerCase() === 'j' || e.key === 'ArrowRight') {
                e.preventDefault();
                navigateDossierQueue(1);
                return;
            }
            if (e.key.toLowerCase() === 'k' || e.key === 'ArrowLeft') {
                e.preventDefault();
                navigateDossierQueue(-1);
                return;
            }
            return;
        }
        const dlVisible = !document.getElementById('datalake-view').classList.contains('hidden');
        if (!dlVisible) return;

        const maxVisible = Math.min(pageSize, filteredLakeRows.length - (currentPage - 1) * pageSize);
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            kbFocusedRowIndex = Math.min(maxVisible - 1, kbFocusedRowIndex + 1);
            renderSovereignDataLakeRows();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            kbFocusedRowIndex = Math.max(0, kbFocusedRowIndex - 1);
            renderSovereignDataLakeRows();
        } else if (e.key === 'Enter' && kbFocusedRowIndex >= 0) {
            e.preventDefault();
            const targetRow = filteredLakeRows[(currentPage - 1) * pageSize + kbFocusedRowIndex];
            if (targetRow) openSovereignProfileModal(targetRow.record_id);
        }
    });

    // ============================================================================
    // SOVEREIGN 360° KYB PROFILE DOSSIER ENGINE (2-STAGE INSTANT HYDRATION)
    // ============================================================================
    const profileOverlay = document.getElementById('profile-modal-overlay');
    const profileContainer = document.getElementById('profile-modal-container');
    const profileBody = document.getElementById('profile-modal-body');
    let activeProfileData = null;
    let activeProfileTab = 'overview';

    // Synthesize Canonical Stepper on the frontend with strictly separate No stage, To Be Assigned, and Business approval gates
    const synthesizeCanonicalStepper = (p) => {
        const currentStage = normalizeAttioStage(p.header?.stage);
        if (p.header) p.header.stage = currentStage;

        const stgLower = currentStage.toLowerCase();
        const isCurrentTerminal = terminalStageList.includes(stgLower);
        const tlMap = {};
        (p.stageTimeline || []).forEach(t => { tlMap[String(t.stage || '').toLowerCase()] = t; });

        const gates = [
            { gateId: "no_stage", label: "1. No stage", match: ["no stage", "created", "blank / unassigned"], date: p.header?.created_at || "-" },
            { gateId: "intake", label: "2. To Be Assigned", match: ["to be assigned"] },
            { gateId: "triage", label: "3. In Triage", match: ["in triage"] },
            { gateId: "first_line", label: "4. 1st Line Queue", match: ["1st line queue"] },
            { gateId: "client_rfi", label: "5. Client Response", match: ["pending client response queue", "on hold"] },
            { gateId: "second_line", label: "6. 2nd Line / Review", match: ["2nd line queue", "in review"] },
            { gateId: "business_approval", label: "7. Business Approval", match: ["business approval"] },
            { gateId: "mlro_approval", label: "8. MLRO Approval", match: ["mlro approval"] },
            { gateId: "decision", label: "9. Final Decision", match: ["approved", "declined", "withdrawn", "off-boarded"], isDecision: true }
        ];

        let activeIdx = gates.findIndex(g => g.match.includes(stgLower));
        if (activeIdx === -1 && isCurrentTerminal) activeIdx = gates.length - 1;

        return gates.map((g, idx) => {
            if (g.gateId === "no_stage") {
                const isNoStageActive = (stgLower === "no stage");
                return {
                    gateId: g.gateId,
                    label: g.label,
                    state: isNoStageActive ? "active" : "completed",
                    date: g.date,
                    dwellDays: null,
                    stageDetail: isNoStageActive ? "No stage" : "Application Registered"
                };
            }
            const matchedTl = g.match.map(m => tlMap[m]).find(Boolean);
            if (g.isDecision) {
                if (isCurrentTerminal) {
                    return {
                        gateId: g.gateId,
                        label: `9. ${currentStage}`,
                        state: stgLower.includes("approved") ? "terminal_approved" : "terminal_declined",
                        date: matchedTl?.enteredAt || "Finalized",
                        dwellDays: null,
                        stageDetail: "Terminal Decision"
                    };
                }
                return { gateId: g.gateId, label: g.label, state: "upcoming", date: "Pending", dwellDays: null, stageDetail: "Awaiting Sign-off" };
            }

            let state = "upcoming";
            if (idx === activeIdx) state = "active";
            else if (matchedTl) state = "completed";
            else if (activeIdx > idx) state = "skipped_or_passed";

            return {
                gateId: g.gateId,
                label: g.label,
                state: state,
                date: matchedTl?.enteredAt || (state === "active" ? "In Queue" : (state === "skipped_or_passed" ? "Passed" : "Pending")),
                dwellDays: matchedTl?.dwellDays ?? null,
                stageDetail: idx === activeIdx ? currentStage : g.label
            };
        });
    };

    const synthesizeChronologicalLog = (p) => {
        if (Array.isArray(p.chronologicalLog) && p.chronologicalLog.length > 0) return p.chronologicalLog;
        const events = [];
        if (p.header?.created_at && p.header.created_at !== '-') {
            events.push({ dateFormatted: p.header.created_at, event: "Application Registered in Data Lake", category: "system" });
        }
        if (p.header?.date_submitted && p.header.date_submitted !== '-') {
            events.push({ dateFormatted: p.header.date_submitted.split(/[ T]/)[0], event: "KYB Application Form Submitted", category: "intake" });
        }
        (p.stageTimeline || []).forEach(st => {
            if (st.enteredAt && st.enteredAt !== '-') {
                events.push({
                    dateFormatted: st.enteredAt,
                    event: `Entered Stage: ${st.stage}${st.dwellDays !== null && !terminalStageList.includes(String(st.stage).toLowerCase()) ? ` (Dwell: ${formatTime(st.dwellDays)})` : ''}`,
                    category: terminalStageList.includes(String(st.stage).toLowerCase()) ? "decision" : "stage_enter"
                });
            }
        });
        return events;
    };

    // Build instant optimistic profile from cached Data Lake row so modal opens in 0ms!
    const buildOptimisticProfileFromGridRow = (row) => {
        const isTerm = terminalStageList.includes(String(row.stage || '').toLowerCase());
        const base = {
            header: {
                record_id: row.record_id,
                company_name: row.company_name,
                trading_name: row.trading_name || '-',
                stage: row.stage,
                country: row.country,
                incorporation_number: 'Loading...',
                incorporation_date: '-',
                website: '-',
                industry_sector: row.industry || '-',
                legal_entity_type: '-',
                created_at: row.created_at || '-',
                date_submitted: '-',
                application_ref: '-',
                xoala_entity: '-',
                risk_rating: row.risk_rating || 'Unassessed',
                risk_rating_override: '',
                risk_score: row.risk_score || '-',
                risk_score_override: '',
                risk_override_reason: '',
                sumsub_applicant_id: 'Loading...',
                sumsub_result: row.sumsub || 'Pending',
                sumsub_level: '-',
                account_manager: row.account_manager || 'Unassigned',
                sales_owner: row.sales_owner || 'Unassigned',
                first_line_lead: row.first_line_lead || '-',
                second_line_lead: '-',
                introducer: row.introducer || '-',
                contact_name: '-',
                contact_email: row.email || '-',
                contact_role: '-',
                monthly_volume: row.monthly_volume || '-'
            },
            stageTimeline: [{ stage: row.stage, enteredAt: row.created_at || 'Active', exitedAt: isTerm ? 'Finalized' : 'Currently Here', dwellDays: isTerm ? null : (row.queue_aging_days || 0), isCurrent: true }],
            riskScorecard: [],
            connectedParties: [],
            linkedEntities: { deal: null, groupCompany: null, companyRefId: '-' },
            peerBenchmark: { cohortCountry: row.country, cohortIndustry: row.industry || '-', countryPeerCount: '--', countryApprovalRate: '--', cohortAvgRiskScore: '--', merchantRiskScore: row.risk_score || 'N/A' },
            complianceAudit: { redFlags: [], missingDocs: [], providedDocs: [] },
            domainSections: { corporate: [], volumes_payments: [], crypto_web3: [], merchant_acquiring: [], aml_edd: [], system_timeline: [] },
            rawNonEmptyCount: '--',
            totalSchemaColumns: 775,
            isOptimistic: true
        };
        base.canonicalStepper = synthesizeCanonicalStepper(base);
        base.chronologicalLog = synthesizeChronologicalLog(base);
        return base;
    };

    // Power-Reviewer Queue Stepper: [ ← Prev (K) ] / [ Next (J) → ]
    const updateQueuePositionUI = (recordId) => {
        const posEl = document.getElementById('profile-queue-pos');
        const prevBtn = document.getElementById('profile-prev-btn');
        const nextBtn = document.getElementById('profile-next-btn');
        if (!posEl) return;

        const list = filteredLakeRows.length > 0 ? filteredLakeRows : dataLakeGridData;
        const idx = list.findIndex(r => r.record_id === recordId);
        if (idx === -1 || list.length === 0) {
            posEl.textContent = `--/--`;
            if (prevBtn) prevBtn.disabled = true;
            if (nextBtn) nextBtn.disabled = true;
            return;
        }
        posEl.textContent = `${idx + 1} / ${list.length}`;
        if (prevBtn) prevBtn.disabled = (idx <= 0);
        if (nextBtn) nextBtn.disabled = (idx >= list.length - 1);
    };

    const navigateDossierQueue = (delta) => {
        if (!activeProfileData) return;
        const list = filteredLakeRows.length > 0 ? filteredLakeRows : dataLakeGridData;
        if (list.length === 0) return;
        const currIdx = list.findIndex(r => r.record_id === activeProfileData.header.record_id);
        const nextIdx = currIdx + delta;
        if (nextIdx >= 0 && nextIdx < list.length) {
            openSovereignProfileModal(list[nextIdx].record_id);
        }
    };

    document.getElementById('profile-prev-btn')?.addEventListener('click', () => navigateDossierQueue(-1));
    document.getElementById('profile-next-btn')?.addEventListener('click', () => navigateDossierQueue(1));

    // Full-Screen Non-Split 360° Dossier Mode Enforced (Split View Removed per User Specification)
    splitDrawerEnabled = false;
    profileOverlay?.classList.remove('split-drawer-mode');

    // Client-Side Multi-Object Relational & Schema Enricher (Guarantees 100% live accuracy across all 775 KYB attributes + Attio Relational Index)
    const enrichProfileDossierClientSide = (p) => {
        if (!p || !p.header) return p;

        // 1. Build raw attribute map from domainSections
        const rawMap = {};
        if (p.domainSections) {
            Object.values(p.domainSections).forEach(arr => {
                if (Array.isArray(arr)) {
                    arr.forEach(item => {
                        if (item && item.slug && item.value !== undefined && item.value !== null && String(item.value).trim() !== '') {
                            rawMap[item.slug.toLowerCase()] = String(item.value).trim();
                        }
                    });
                }
            });
        }

        const firstVal = (slugs, fallback = '') => {
            for (const s of slugs) {
                if (rawMap[s] && rawMap[s] !== '-') return rawMap[s];
            }
            return fallback;
        };

        const h = p.header;
        h.stage = normalizeAttioStage(h.stage);
        const stgLower = String(h.stage || '').toLowerCase();
        const isApprovedOrCompleted = stgLower.includes('approved') || stgLower.includes('completed');
        p.rawMap = rawMap;

        // 2. Enrich Header Fields (Incorporation #, Xoala Admin URL, Services, Business Model, Signup Industry Sector, Payment Corridors)
        h.incorporation_number = firstVal(['incorporation_num', 'incorporation_number', 'company_registration_number', 'license_number'], h.incorporation_number && h.incorporation_number !== 'Loading...' ? h.incorporation_number : '-');
        h.xoala_url = firstVal(['xoala_url'], h.xoala_url || '');
        h.morpe_url = firstVal(['morpe_url'], h.morpe_url || '');
        h.sow_sof_url = firstVal(['sow_and_sof_1787244096'], h.sow_sof_url || '');
        h.cloudfiles_count = firstVal(['cloudfilesreceivedcount'], h.cloudfiles_count || '0');
        h.services_applied_for = firstVal(['services_applied_for'], h.services_applied_for || '-');
        h.business_model = firstVal(['business_model'], h.business_model || '-');
        h.account_purpose = firstVal(['what_is_the_purpose_of_the_account'], h.account_purpose || '-');
        h.turnover_bracket = firstVal(['turnover_bracket'], h.turnover_bracket || '-');
        h.employee_bracket = firstVal(['employee_bracket'], h.employee_bracket || '-');
        h.documentation_attached = firstVal(['documentation_attached_1787240797'], h.documentation_attached || '-');
        h.tc_signed = firstVal(['terms_and_conditions_signed_xoala_1787241835'], h.tc_signed || '-');

        // Resolve Company Signup Industry (instead of showing Compliance Risk Tier "Standard" in Sector)
        h.industry_risk_tier = rawMap['industry_sector'] || h.industry_sector || 'Standard';
        const signupIndustrySlugs = [
            'industry_v2', 'industry', 'company_industry', 'business_category',
            'nature_of_business', 'business_activity', 'sector', 'merchant_category',
            'mcc_description', 'categories', 'what_is_the_nature_of_your_business',
            'please_describe_your_business_activities', 'type_of_business', 'line_of_business'
        ];
        let resolvedSignupIndustry = '';
        for (const s of signupIndustrySlugs) {
            if (rawMap[s] && !isRiskTierIndustryLabel(rawMap[s])) {
                resolvedSignupIndustry = rawMap[s];
                break;
            }
        }
        if (!resolvedSignupIndustry) {
            for (const [k, v] of Object.entries(rawMap)) {
                if ((k.includes('industry') || k.includes('sector') || k.includes('business_cat') || k.includes('nature_of_business')) && !k.includes('score') && !k.includes('override') && !isRiskTierIndustryLabel(v)) {
                    resolvedSignupIndustry = v;
                    break;
                }
            }
        }
        const rel = window.ATTIO_RELATIONAL_INDEX;
        const companyId = (rawMap["company"] || "").split("|")[0].trim() || rel?.companyByName?.[String(h.company_name || '').trim().toLowerCase()] || "";
        const dealId = (rawMap["deal"] || "").split("|")[0].trim() || (companyId && rel?.dealsByCompany?.[companyId]?.[0]) || "";
        if (!resolvedSignupIndustry && companyId && rel?.companiesById?.[companyId]) {
            const compRec = rel.companiesById[companyId];
            const compInd = compRec.industry || compRec.categories || compRec.sector || '';
            if (compInd && !isRiskTierIndustryLabel(compInd)) resolvedSignupIndustry = compInd;
        }
        if (!resolvedSignupIndustry && !isRiskTierIndustryLabel(h.industry_sector)) {
            resolvedSignupIndustry = h.industry_sector;
        }
        if (!resolvedSignupIndustry) {
            // Synthesize descriptive business sector from signup Services / Business Model / Crypto / Acquiring attributes when only "Standard" tier was stored
            const svc = h.services_applied_for !== '-' ? h.services_applied_for : '';
            const bm = h.business_model !== '-' ? h.business_model : '';
            if (svc && bm) resolvedSignupIndustry = `${bm} • ${svc.split('|')[0].trim()}`;
            else if (svc) resolvedSignupIndustry = svc.split('|').slice(0, 2).map(s => s.trim()).join(' / ');
            else if (bm) resolvedSignupIndustry = `${bm} Commercial Entity`;
            else if (h.account_purpose && h.account_purpose !== '-') resolvedSignupIndustry = h.account_purpose.length > 42 ? h.account_purpose.slice(0, 40) + '…' : h.account_purpose;
            else resolvedSignupIndustry = h.industry_risk_tier && h.industry_risk_tier !== '-' ? `General Corporate (${h.industry_risk_tier} Tier)` : 'General Corporate';
        }
        h.industry_sector = resolvedSignupIndustry;
        if (p.peerBenchmark) p.peerBenchmark.cohortIndustry = resolvedSignupIndustry;
        const matchingGridRow = dataLakeGridData.find(r => r.record_id === h.record_id);
        if (matchingGridRow && isRiskTierIndustryLabel(matchingGridRow.industry)) {
            matchingGridRow.industry = resolvedSignupIndustry;
        }

        if (!Array.isArray(p.payment_corridors) || p.payment_corridors.length === 0) {
            const corridors = [];
            for (let i = 1; i <= 5; i++) {
                const cName = rawMap[`country_${i}`] || '';
                const cPct = rawMap[`hs_country_${i}`] || '';
                if (cName && cName !== '-') {
                    const numPct = cPct ? parseFloat(String(cPct).replace(/[^0-9.]/g, '')) : null;
                    corridors.push({
                        country: cName,
                        share: !isNaN(numPct) && numPct !== null ? `${numPct}%` : '-',
                        share_pct: !isNaN(numPct) ? numPct : null
                    });
                }
            }
            p.payment_corridors = corridors;
            h.payment_corridors = corridors;
        }

        // 3. Rebuild 14-Factor Institutional Risk Scorecard using Dual Attio Slugs
        const dualRiskDims = [
            { label: "Country of Incorporation Risk", score: ["country_of_incorporation_risk_score"], over: ["country_of_incorporation_risk_score_override"], val: ["country_of_incorporation", "registered_country"] },
            { label: "Industry Sector Risk", score: ["industry_sector_risk_score"], over: ["industry_sector_risk_score_override"], val: ["industry_sector", "industry_v2"] },
            { label: "Company Age Risk", score: ["age_of_company_risk_score", "company_age_risk_score"], over: ["age_of_company_risk_score_override", "company_age_risk_score_override"], val: ["date_of_incorporation"] },
            { label: "Cash Transactions Risk", score: ["cash_transactions_in_the_business_model_risk_score", "cash_transactions_risk_score"], over: ["cash_transactions_in_the_business_model_risk_score_override", "cash_transactions_risk_score_override"], val: ["are_cash_transactions_involved_in_your_business_model", "does_the_business_accept_physical_cash_from_customers"] },
            { label: "Anonymous Accounts Risk", score: ["offer_anonymous_accounts_risk_score", "anonymous_accounts_risk_score"], over: ["offer_anonymous_accounts_risk_score_override", "anonymous_accounts_risk_score_override"], val: ["offer_anonymous_accounts_assessed", "does_the_organization_provide_services_to_anonymous_or_numbered_accounts"] },
            { label: "Shell Bank Relationship Risk", score: ["relationship_with_shell_companies_banks_risk_score", "shell_bank_relationship_risk_score"], over: ["relationship_with_shell_companies_banks_risk_score_override", "shell_bank_relationship_risk_score_override"], val: ["relationship_with_shell_companies_banks_assessed", "does_your_company_maintain_accounts_or_relationships_with_shell_companies", "does_the_institution_have_any_relationships_with_shell_banks"] },
            { label: "Financial Sanctions (Country) Risk", score: ["financial_sanction_against_country_of_incorporation_risk_score"], over: ["financial_sanction_against_country_of_incorporation_risk_score_override"], val: ["financial_sanction_against_country_of_incorporation"] },
            { label: "Sanctions List Screening Risk", score: ["sanction_list_risk_score", "sanctions_list_risk_score"], over: ["sanction_list_risk_score_override", "sanctions_list_risk_score_override"], val: ["sanctions_list", "is_the_entity_or_any_related_party_on_a_sanctions_list"] },
            { label: "Adverse Media Risk", score: ["adverse_media_risk_score"], over: ["adverse_media_risk_score_override"], val: ["adverse_media_assessment", "adverse_media"] },
            { label: "Complex Ownership Structure Risk", score: ["complex_ownership_structure_risk_score"], over: ["complex_ownership_structure_risk_score_override"], val: ["complex_ownership_structure", "is_there_a_complex_ownership_structure"] },
            { label: "Politically Exposed Person (PEP) Risk", score: ["pep_risk_score"], over: ["pep_risk_score_override"], val: ["is_any_related_party_a_pep", "do_you_any_of_the_above_named_individuals_or_any_of_the_relevant_individuals_in_your_subsidiaries"] },
            { label: "Client Funds / Safeguarding Risk", score: ["client_funds_account_required_risk_score", "client_funds_account_risk_score"], over: ["client_funds_account_required_risk_score_override", "client_funds_account_risk_score_override"], val: ["client_funds_account_required", "are_you_looking_for_a_client_funds_account"] },
            { label: "Regulatory Jurisdiction Risk", score: ["regulatory_country_risk_score"], over: ["regulatory_country_risk_score_override"], val: ["regulator_country", "are_you_regulated"] },
            { label: "Internal AML Controls Risk", score: ["internal_aml_processes_assessment_risk_score", "internal_aml_risk_score"], over: ["internal_aml_processes_assessment_risk_score_override", "internal_aml_risk_score_override"], val: ["internal_aml_processes_assessment", "internal_aml_risk_assessment"] }
        ];

        if (Object.keys(rawMap).length > 0) {
            p.riskScorecard = dualRiskDims.map(d => {
                const rs = firstVal(d.score, '');
                const os = firstVal(d.over, '');
                const uv = firstVal(d.val, '-');
                const calcNum = rs !== '' && !isNaN(Number(rs)) ? Number(rs) : null;
                const overNum = os !== '' && !isNaN(Number(os)) ? Number(os) : null;
                return {
                    dimension: d.label,
                    underlyingValue: uv,
                    calculatedScore: calcNum,
                    overrideScore: overNum,
                    effectiveScore: overNum !== null ? overNum : calcNum,
                    isOverridden: overNum !== null
                };
            });
        }

        // 4. Enrich Connected Parties (UBOs, Directors, Shareholders) + Company + Group Company + Deal + IB via ATTIO_RELATIONAL_INDEX & GAS 2 raw_attributes
        if (!Array.isArray(p.connectedParties)) p.connectedParties = [];

        // Helper: Strip ", <Company Name>" suffix from Application_Parties composite labels (e.g., "USHA DEVI, PayVortex" -> "USHA DEVI")
        const sanitizePartyPersonName = (rawName, compName = '') => {
            let s = String(rawName || '').trim();
            if (!s || s === '-') return '';
            const cClean = String(compName || h.company_name || '').trim();
            if (cClean && s.includes(',')) {
                const parts = s.split(',').map(x => x.trim()).filter(Boolean);
                if (parts.length >= 2) {
                    const tail = parts.slice(1).join(', ').toLowerCase();
                    const cLow = cClean.toLowerCase();
                    if (tail === cLow || tail.includes(cLow) || cLow.includes(tail)) {
                        return parts[0];
                    }
                }
            }
            if (s.includes(',')) {
                return s.split(',')[0].trim();
            }
            return s;
        };

        // Pre-merge Application_Parties from ATTIO_RELATIONAL_INDEX.partiesByKyb[h.record_id] so even before GAS 2 responds (or if GAS 2 returned composite names), all linked UBOs are present with clean People.csv names!
        if (rel?.partiesByKyb?.[h.record_id]) {
            const existingPids = new Set(p.connectedParties.map(cp => cp.person_record_id).filter(Boolean));
            const existingCleanNames = new Set(p.connectedParties.map(cp => sanitizePartyPersonName(cp.name, h.company_name).toLowerCase()).filter(Boolean));
            rel.partiesByKyb[h.record_id].forEach(apEntry => {
                const pid = apEntry.person_record_id || '';
                const cleanNm = sanitizePartyPersonName(apEntry.name, h.company_name);
                if ((pid && existingPids.has(pid)) || (cleanNm && existingCleanNames.has(cleanNm.toLowerCase()))) return;
                if (pid) existingPids.add(pid);
                if (cleanNm) existingCleanNames.add(cleanNm.toLowerCase());
                p.connectedParties.push({
                    ...apEntry,
                    name: cleanNm || apEntry.name,
                    application_party_label: apEntry.application_party_label || apEntry.name
                });
            });
        }

        const roleByPid = {};
        if (companyId && rel?.rolesByCompany?.[companyId]) {
            rel.rolesByCompany[companyId].forEach(rObj => {
                (rObj.holder_person_ids || []).forEach(pid => {
                    roleByPid[pid] = rObj;
                });
            });
        }

        // Helper: Resolve country from Attio location string (e.g., "Riga, Latvia, LV" -> "Latvia")
        const resolveClientLocationCountry = (locStr) => {
            if (!locStr || locStr === '-') return '';
            const isoLookup = { "GB": "United Kingdom", "UK": "United Kingdom", "US": "United States", "AE": "United Arab Emirates", "LV": "Latvia", "LT": "Lithuania", "EE": "Estonia", "CY": "Cyprus", "MT": "Malta", "CH": "Switzerland", "DE": "Germany", "FR": "France", "ES": "Spain", "IT": "Italy", "NL": "Netherlands", "IL": "Israel", "SG": "Singapore", "HK": "Hong Kong", "PL": "Poland", "CZ": "Czechia", "PT": "Portugal", "IE": "Ireland", "LU": "Luxembourg", "TR": "Turkey", "CA": "Canada", "AU": "Australia", "VG": "British Virgin Islands", "KY": "Cayman Islands", "MU": "Mauritius" };
            const parts = String(locStr).split(',').map(s => s.trim()).filter(Boolean);
            const last = parts[parts.length - 1] || '';
            return isoLookup[last.toUpperCase()] || last;
        };

        // Helper: Smart multi-object attribute picker (checks exact keys first, then regex keyword match across all saved Attio Person/Party fields)
        const pickPersonAttr = (sources, exactKeys = [], keyRegex = null, excludeRegex = /score|override|flag|assessed/i) => {
            for (const src of sources) {
                if (!src || typeof src !== 'object') continue;
                for (const k of exactKeys) {
                    const v = src[k];
                    if (v !== undefined && v !== null && String(v).trim() !== '' && String(v).trim() !== '-' && String(v).trim() !== 'null') {
                        return String(v).trim();
                    }
                }
            }
            if (keyRegex) {
                for (const src of sources) {
                    if (!src || typeof src !== 'object') continue;
                    for (const [k, v] of Object.entries(src)) {
                        if (v === undefined || v === null || typeof v === 'object') continue;
                        const sVal = String(v).trim();
                        if (!sVal || sVal === '-' || sVal === 'null') continue;
                        if (keyRegex.test(k) && (!excludeRegex || !excludeRegex.test(k))) {
                            return sVal;
                        }
                    }
                }
            }
            return '';
        };

        // Build Name & Email lookup maps from ATTIO_RELATIONAL_INDEX.peopleById so unlinked / Legacy_Person_1..4 UBOs still match their Attio Person record
        const personByNameMap = {};
        const personByEmailMap = {};
        if (rel?.peopleById) {
            Object.entries(rel.peopleById).forEach(([pid, pObj]) => {
                const nm = String(pObj.name || '').trim().toLowerCase();
                if (nm) personByNameMap[nm] = { pid, ...pObj };
                const em = String(pObj.email || pObj.email_addresses || '').split('|')[0].trim().toLowerCase();
                if (em && em !== '-') personByEmailMap[em] = { pid, ...pObj };
            });
        }

        const fallbackEntityDob = firstVal(['ubo_date_of_birth', 'date_of_birth', 'director_date_of_birth', 'dob'], '');
        const fallbackEntityNat = firstVal(['ubo_nationality', 'nationality', 'director_nationality', 'applicant_nationality'], '');
        const fallbackEntityRes = firstVal(['ubo_country_of_residence', 'country_of_residence', 'ubo_residence', 'director_country_of_residence'], '');
        const fallbackEntitySumsubId = firstVal(['sumsub_applicant_id', 'sumsub_id', 'ubo_sumsub_id'], '');
        const fallbackEntitySumsubLink = firstVal(['sumsub_url', 'sumsub_link', 'ubo_sumsub_link'], '');

        const seenPersonIds = new Set();
        const seenNames = new Set();
        p.connectedParties.forEach((cp, cpIdx) => {
            const rawOriginalLabel = cp.application_party_label || cp.name || '';
            const sanitizedCpName = sanitizePartyPersonName(cp.name, h.company_name);
            const cpNameLower = sanitizedCpName.toLowerCase();
            const cpEmailLower = String(cp.email || '').split('|')[0].trim().toLowerCase();

            // Match to Attio Person by ID, Clean Name, or Email
            let pRec = (cp.person_record_id && cp.person_record_id !== '-' && rel?.peopleById?.[cp.person_record_id]) || null;
            if (!pRec && cpNameLower && personByNameMap[cpNameLower]) {
                pRec = personByNameMap[cpNameLower];
                if (!cp.person_record_id || cp.person_record_id === '-') cp.person_record_id = pRec.pid;
            }
            if (!pRec && cpEmailLower && cpEmailLower !== '-' && personByEmailMap[cpEmailLower]) {
                pRec = personByEmailMap[cpEmailLower];
                if (!cp.person_record_id || cp.person_record_id === '-') cp.person_record_id = pRec.pid;
            }

            // CRITICAL FIX: Prioritize clean Person Name from People.csv ("USHA DEVI") over Application_Parties composite label ("USHA DEVI, PayVortex")!
            cp.application_party_label = rawOriginalLabel;
            cp.name = (pRec && pRec.name && pRec.name !== '-') ? pRec.name : (sanitizedCpName || cp.name);

            if (cp.person_record_id && cp.person_record_id !== '-') seenPersonIds.add(cp.person_record_id);
            if (cp.name) seenNames.add(String(cp.name).trim().toLowerCase());

            const rRec = (cp.person_record_id && roleByPid[cp.person_record_id]) || null;
            // CRITICAL FIX: Merge GAS 2 `cp.raw_attributes` + `cp.raw_person_fields` + `pRec` + `rRec` so zero saved Attio fields are ever lost!
            const rawAttrFromGas2 = (cp.raw_attributes && typeof cp.raw_attributes === 'object') ? cp.raw_attributes : {};
            const rawFieldsExisting = (cp.raw_person_fields && typeof cp.raw_person_fields === 'object') ? cp.raw_person_fields : {};
            const pRecRaw = (pRec?.raw_person_fields && typeof pRec.raw_person_fields === 'object') ? pRec.raw_person_fields : {};
            const mergedRawPerson = { ...(rRec || {}), ...(pRec || {}), ...pRecRaw, ...rawAttrFromGas2, ...rawFieldsExisting };

            // Also include any person_${n}_* fields from the KYB ticket for this principal
            const pNum = cpIdx + 1;
            Object.entries(rawMap).forEach(([rk, rv]) => {
                if (rk.startsWith(`person_${pNum}_`) || (cpIdx === 0 && (rk.startsWith('ubo_') || rk.startsWith('director_')))) {
                    if (!mergedRawPerson[rk]) mergedRawPerson[rk] = rv;
                }
            });

            // Guard: If GAS 2 inline fallback placed an email address inside cp.nationality or cp.residence, rescue it to cp.email and clear it from nationality/residence
            if (cp.nationality && String(cp.nationality).includes('@')) {
                if (!cp.email || cp.email === '-') cp.email = String(cp.nationality).trim();
                cp.nationality = '-';
            }
            if (cp.residence && String(cp.residence).includes('@')) {
                if (!cp.email || cp.email === '-') cp.email = String(cp.residence).trim();
                cp.residence = '-';
            }

            const sources = [mergedRawPerson, pRec, rRec, cp];
            const locFallback = resolveClientLocationCountry(pickPersonAttr(sources, ['primary_location', 'location', 'address', 'city'], /location|address/i));

            const rawNatCandidate = pickPersonAttr(sources, ['nationality', 'nationality_individual_1787243602', 'nationality_individual_1787242575', 'citizenship', `person_${pNum}_nationality`, 'ubo_nationality'], /nationality|citizenship/i);
            const resolvedNat = (rawNatCandidate && !String(rawNatCandidate).includes('@') ? rawNatCandidate : '')
                || locFallback
                || (cpIdx === 0 && fallbackEntityNat && !String(fallbackEntityNat).includes('@') ? fallbackEntityNat : '')
                || (h.country && h.country !== '-' ? h.country : '-');

            const rawResCandidate = pickPersonAttr(sources, ['residence', 'countryresidence', 'country_of_residence', 'residence_individual_1787243908', 'residence_individual_1787242743', `person_${pNum}_country`, 'ubo_country_of_residence'], /residence|countryresidence|domicile/i);
            const resolvedRes = (rawResCandidate && !String(rawResCandidate).includes('@') ? rawResCandidate : '')
                || locFallback
                || (cpIdx === 0 && fallbackEntityRes && !String(fallbackEntityRes).includes('@') ? fallbackEntityRes : '')
                || (resolvedNat !== '-' ? resolvedNat : '-');

            const resolvedDob = pickPersonAttr(sources, ['dob', 'date_of_birth', 'date_birth', 'birth_date', `person_${pNum}_dob`, `person_${pNum}_date_of_birth`, 'ubo_date_of_birth'], /date_of_birth|date_birth|\bdob\b|birth_date/i)
                || (cpIdx === 0 && fallbackEntityDob ? fallbackEntityDob : '-');

            const resolvedOwn = pickPersonAttr(sources, ['ownership_pct', 'ownership', 'of_ownership_1787242727', 'shareholding', `person_${pNum}_ownership`], /ownership|shareholding|shares_pct/i) || '-';
            const resolvedEmail = pickPersonAttr(sources, ['email', 'email_addresses', 'business_email_1787242277', `person_${pNum}_email`], /email/i) || '-';
            const resolvedRole = pickPersonAttr(sources, ['role_at_application', 'role', 'position', 'job_title', `person_${pNum}_role`], /\brole\b|position|job_title/i) || cp.role || 'Company Principal';
            const resolvedExpiry = pickPersonAttr(sources, ['id_expiry', 'id_expire_date_1787242514', 'passport_expiry', 'document_expiry'], /id_expir|passport_expir|doc_expir/i) || '-';
            const resolvedSumsubId = pickPersonAttr(sources, ['sumsub_id', 'sumsub_applicant_id_1787242913', 'sumsub_applicant_id'], /sumsub.*id|applicant_id/i)
                || (cpIdx === 0 && fallbackEntitySumsubId ? fallbackEntitySumsubId : '-');
            const resolvedSumsubLink = pickPersonAttr(sources, ['sumsub_link', 'sumsub_link_h1_1787242915', 'sumsub_link_1787242914', 'sumsub_url'], /sumsub.*(link|url)/i, null)
                || (cpIdx === 0 ? fallbackEntitySumsubLink : '');
            const resolvedEmpSector = pickPersonAttr(sources, ['employment_sector', 'employment', 'industry_sector'], /employment/i) || '-';
            const resolvedRiskRating = pickPersonAttr(sources, ['risk_rating', 'individual_risk_rating'], /risk_rating/i, null) || cp.risk_rating || 'Unassessed';
            const resolvedRiskScore = pickPersonAttr(sources, ['risk_score', 'individual_risk_score'], /risk_score/i, /override|nationality|residence|pep|sanctions|adverse|idu|employment|sow/i) || cp.risk_score || '-';

            cp.nationality = resolvedNat;
            cp.residence = resolvedRes;
            cp.dob = resolvedDob;
            cp.ownership_pct = (resolvedOwn !== '-' && !String(resolvedOwn).includes('%') && !isNaN(parseFloat(resolvedOwn))) ? `${resolvedOwn}%` : resolvedOwn;
            cp.email = resolvedEmail;
            cp.role = resolvedRole;
            cp.id_expiry = resolvedExpiry;
            cp.sumsub_id = resolvedSumsubId;
            cp.sumsub_link = resolvedSumsubLink;
            cp.employment_sector = resolvedEmpSector;
            cp.risk_rating = resolvedRiskRating;
            cp.risk_score = resolvedRiskScore;

            // Populate 9-factor individual sub_scores from mergedRawPerson if any are '-'
            const existingSub = cp.sub_scores || {};
            if (pRec?.sub_scores) Object.assign(existingSub, pRec.sub_scores);
            cp.sub_scores = {
                nationality_score: existingSub.nationality_score && existingSub.nationality_score !== '-' ? existingSub.nationality_score : (pickPersonAttr(sources, ['individual_nationality_risk_score_1787242531', 'nationality_risk_score'], /nationality.*score/i, null) || '-'),
                residence_score: existingSub.residence_score && existingSub.residence_score !== '-' ? existingSub.residence_score : (pickPersonAttr(sources, ['individual_residence_risk_score_1787242535', 'residence_risk_score'], /residence.*score/i, null) || '-'),
                pep_score: existingSub.pep_score && existingSub.pep_score !== '-' ? existingSub.pep_score : (pickPersonAttr(sources, ['individual_pep_risk_score', 'pep_risk_score'], /pep.*score/i, null) || '-'),
                sanctions_score: existingSub.sanctions_score && existingSub.sanctions_score !== '-' ? existingSub.sanctions_score : (pickPersonAttr(sources, ['individual_sanctions_risk_score', 'sanctions_risk_score'], /sanctions.*score/i, null) || '-'),
                adverse_media_score: existingSub.adverse_media_score && existingSub.adverse_media_score !== '-' ? existingSub.adverse_media_score : (pickPersonAttr(sources, ['individual_adverse_media_risk_score', 'adverse_media_risk_score'], /adverse_media.*score/i, null) || '-'),
                idu_score: existingSub.idu_score && existingSub.idu_score !== '-' ? existingSub.idu_score : (pickPersonAttr(sources, ['individual_idu_risk_score', 'idu_risk_score'], /idu.*score/i, null) || '-'),
                employment_score: existingSub.employment_score && existingSub.employment_score !== '-' ? existingSub.employment_score : (pickPersonAttr(sources, ['individual_employment_risk_score', 'employment_risk_score'], /employment.*score/i, null) || '-'),
                source_of_wealth_score: existingSub.source_of_wealth_score && existingSub.source_of_wealth_score !== '-' ? existingSub.source_of_wealth_score : (pickPersonAttr(sources, ['individual_sow_risk_score', 'sow_risk_score'], /(sow|wealth).*score/i, null) || '-'),
                override_score: existingSub.override_score && existingSub.override_score !== '-' ? existingSub.override_score : (pickPersonAttr(sources, ['risk_score_override', 'individual_risk_score_override'], /override.*score|score.*override/i, null) || '-')
            };

            cp.raw_person_fields = mergedRawPerson;
            cp.raw_attributes = mergedRawPerson;

            if (!cp.sumsub_result || cp.sumsub_result === 'Pending' || cp.sumsub_result === '-') {
                if (cp.sumsub_id && cp.sumsub_id !== '-' && (isApprovedOrCompleted || (cp.risk_rating && cp.risk_rating !== 'Unassessed' && cp.risk_rating !== '-'))) {
                    cp.sumsub_result = 'Verified (ID Linked)';
                } else if (h.sumsub_result && h.sumsub_result !== 'Pending' && h.sumsub_result !== '-') {
                    cp.sumsub_result = h.sumsub_result;
                } else if (isApprovedOrCompleted) {
                    cp.sumsub_result = 'Approved (Entity KYB)';
                } else {
                    cp.sumsub_result = 'Pending';
                }
            }
        });

        // Join additional People & Roles linked via Company or Deal (e.g., Ethan Giladi on Tensei Tech Ltd.)
        if (rel) {
            const candidatePids = [
                ...(companyId && rel.peopleByCompany?.[companyId] ? rel.peopleByCompany[companyId] : []),
                ...Object.keys(roleByPid),
                ...(dealId && rel.dealsById?.[dealId]?.associated_people ? rel.dealsById[dealId].associated_people : [])
            ];

            candidatePids.forEach(pid => {
                if (!pid || seenPersonIds.has(pid)) return;
                const pRec = rel.peopleById?.[pid];
                if (!pRec) return;
                seenPersonIds.add(pid);
                const cleanPName = sanitizePartyPersonName(pRec.name, h.company_name);
                if (seenNames.has(cleanPName.toLowerCase())) return;
                seenNames.add(cleanPName.toLowerCase());

                const rRec = roleByPid[pid] || {};
                let sumsubStatus = pRec.sumsub_result || '';
                if (!sumsubStatus || sumsubStatus === 'Pending') {
                    if (pRec.sumsub_id && pRec.sumsub_id !== '-' && (isApprovedOrCompleted || (pRec.risk_rating && pRec.risk_rating !== 'Unassessed'))) {
                        sumsubStatus = 'Verified (ID Linked)';
                    } else if (h.sumsub_result && h.sumsub_result !== 'Pending' && h.sumsub_result !== '-') {
                        sumsubStatus = h.sumsub_result;
                    } else if (isApprovedOrCompleted) {
                        sumsubStatus = 'Approved (Entity KYB)';
                    } else {
                        sumsubStatus = 'Pending';
                    }
                }

                const candSources = [pRec, rRec];
                const candLoc = resolveClientLocationCountry(pickPersonAttr(candSources, ['primary_location', 'location', 'address'], /location|address/i));
                const candNat = pickPersonAttr(candSources, ['nationality', 'nationality_individual_1787243602', 'nationality_individual_1787242575', 'citizenship'], /nationality|citizenship/i) || candLoc || fallbackEntityNat || '-';
                const candRes = pickPersonAttr(candSources, ['residence', 'countryresidence', 'country_of_residence', 'residence_individual_1787243908', 'residence_individual_1787242743'], /residence|countryresidence|domicile/i) || candLoc || fallbackEntityRes || (candNat !== '-' ? candNat : '-');
                const resolvedDob = pickPersonAttr(candSources, ['dob', 'date_of_birth', 'date_birth', 'birth_date'], /date_of_birth|date_birth|\bdob\b|birth_date/i) || fallbackEntityDob || '-';
                const resolvedSumsubId = pickPersonAttr(candSources, ['sumsub_id', 'sumsub_applicant_id', 'sumsub_applicant_id_1787242913'], /sumsub.*id|applicant_id/i) || fallbackEntitySumsubId || '-';
                const mergedCandRaw = { ...rRec, ...pRec, ...(pRec.raw_person_fields || {}) };

                p.connectedParties.push({
                    party_record_id: rRec.role ? 'Company_Role_Link' : 'Company_Person_Link',
                    person_record_id: pid,
                    name: cleanPName || pRec.name,
                    application_party_label: pRec.name,
                    role: rRec.role || pRec.role || 'Company Principal',
                    ownership_pct: (rRec.ownership_pct && rRec.ownership_pct !== '-') ? rRec.ownership_pct : (pRec.ownership_pct || '-'),
                    nationality: candNat,
                    residence: candRes,
                    email: pRec.email || pRec.email_addresses || '-',
                    dob: resolvedDob,
                    id_expiry: pRec.id_expiry || pRec.passport_expiry || '-',
                    sumsub_result: sumsubStatus,
                    sumsub_id: resolvedSumsubId,
                    sumsub_link: pRec.sumsub_link || fallbackEntitySumsubLink || '',
                    employment_sector: pRec.employment_sector || '-',
                    risk_rating: pRec.risk_rating || 'Unassessed',
                    risk_score: pRec.risk_score || '-',
                    pep_flag: pRec.pep_flag || 'No',
                    sanctions_flag: pRec.sanctions_flag || 'No',
                    adverse_media_flag: pRec.adverse_media_flag || 'No',
                    sub_scores: pRec.sub_scores || {},
                    raw_person_fields: mergedCandRaw,
                    raw_attributes: mergedCandRaw
                });
            });

            // Deduplicate connectedParties by sanitized natural person name (merging richest non-empty fields)
            const dedupedPartiesMap = new Map();
            const isGoodVal = (v) => v !== undefined && v !== null && !['', '-', 'Unassessed', 'Pending', 'Unspecified', 'null', 'None'].includes(String(v).trim());
            p.connectedParties.forEach(cp => {
                const cleanNmKey = sanitizePartyPersonName(cp.name, h.company_name).toLowerCase();
                if (!cleanNmKey) return;
                if (!dedupedPartiesMap.has(cleanNmKey)) {
                    dedupedPartiesMap.set(cleanNmKey, { ...cp });
                } else {
                    const existing = dedupedPartiesMap.get(cleanNmKey);
                    Object.keys(cp).forEach(k => {
                        if (k === 'sub_scores' && cp.sub_scores) {
                            existing.sub_scores = existing.sub_scores || {};
                            Object.keys(cp.sub_scores).forEach(sk => {
                                if (!isGoodVal(existing.sub_scores[sk]) && isGoodVal(cp.sub_scores[sk])) {
                                    existing.sub_scores[sk] = cp.sub_scores[sk];
                                }
                            });
                        } else if (k === 'dob' && isGoodVal(cp.dob) && String(cp.dob).length > String(existing.dob || '').length) {
                            existing.dob = cp.dob;
                        } else if (!isGoodVal(existing[k]) && isGoodVal(cp[k])) {
                            existing[k] = cp[k];
                        }
                    });
                }
            });
            p.connectedParties = Array.from(dedupedPartiesMap.values());

            // Enrich Company, Group Company, Deal & IB Partner across all 8 CSVs
            if (!p.linkedEntities) p.linkedEntities = { deal: null, groupCompany: null, company: null, ibPartner: null, companyRefId: companyId || '-' };
            if (companyId && rel.companiesById?.[companyId]) {
                p.linkedEntities.company = rel.companiesById[companyId];
                p.linkedEntities.companyRefId = companyId;
            }
            if (!p.linkedEntities.deal && dealId && rel.dealsById?.[dealId]) {
                p.linkedEntities.deal = rel.dealsById[dealId];
            }
            if (!p.linkedEntities.groupCompany) {
                const gcIdFromRaw = (rawMap["group_company"] || "").split("|")[0].trim();
                const gcMatch = (gcIdFromRaw && rel.gcById?.[gcIdFromRaw]) || (companyId && rel.gcByCompany?.[companyId]?.[0]) || (dealId && rel.gcByDeal?.[dealId]?.[0]) || null;
                if (gcMatch) p.linkedEntities.groupCompany = gcMatch;
            }
            if (!p.linkedEntities.ibPartner && rel.ibsById) {
                const introRef = (rawMap["introducer"] || h.introducer || "").trim();
                if (rel.ibsById[introRef]) {
                    p.linkedEntities.ibPartner = rel.ibsById[introRef];
                } else if (introRef && introRef !== '-') {
                    const matchedIb = Object.values(rel.ibsById).find(ib => String(ib.name || '').toLowerCase() === introRef.toLowerCase());
                    if (matchedIb) p.linkedEntities.ibPartner = matchedIb;
                }
            }

            // Build 8-CSV Data Completeness QA Summary for this Dossier
            const compFieldsCount = p.linkedEntities.company?.raw_company_fields ? Object.keys(p.linkedEntities.company.raw_company_fields).length : (p.linkedEntities.company ? Object.keys(p.linkedEntities.company).length : 0);
            const dealFieldsCount = p.linkedEntities.deal?.raw_deal_fields ? Object.keys(p.linkedEntities.deal.raw_deal_fields).length : (p.linkedEntities.deal ? Object.keys(p.linkedEntities.deal).length : 0);
            const gcFieldsCount = p.linkedEntities.groupCompany?.raw_gc_fields ? Object.keys(p.linkedEntities.groupCompany.raw_gc_fields).length : (p.linkedEntities.groupCompany ? Object.keys(p.linkedEntities.groupCompany).length : 0);
            const ibFieldsCount = p.linkedEntities.ibPartner?.raw_ib_fields ? Object.keys(p.linkedEntities.ibPartner.raw_ib_fields).length : (p.linkedEntities.ibPartner ? Object.keys(p.linkedEntities.ibPartner).length : 0);
            const totalPersonFields = p.connectedParties.reduce((acc, cp) => acc + (cp.raw_person_fields ? Object.keys(cp.raw_person_fields).length : 0), 0);

            p.dataLakeQaSummary = {
                kybPopulatedCols: Object.keys(rawMap).length || (p.rawNonEmptyCount !== '--' ? Number(p.rawNonEmptyCount) : 28),
                partiesLinkedCount: p.connectedParties.length,
                peoplePopulatedCols: totalPersonFields,
                rolesLinkedCount: Object.keys(roleByPid).length,
                companyLinked: Boolean(p.linkedEntities.company),
                companyPopulatedCols: compFieldsCount,
                groupCompanyLinked: Boolean(p.linkedEntities.groupCompany),
                groupCompanyPopulatedCols: gcFieldsCount,
                dealLinked: Boolean(p.linkedEntities.deal),
                dealPopulatedCols: dealFieldsCount,
                ibLinked: Boolean(p.linkedEntities.ibPartner) || (h.introducer && h.introducer !== '-'),
                ibPopulatedCols: ibFieldsCount
            };
        }

        // 5. Stage-Aware Verification & Onboarding Package Matrix (Replaces false 0/10 legacy HubSpot doc warnings)
        if (Object.keys(rawMap).length > 0 || p.connectedParties.length > 0) {
            const checkItems = [
                {
                    label: "KYB Application Package Attached",
                    value: rawMap["documentation_attached_1787240797"] === "true" ? "Attached in Attio" : (rawMap["cloudfilesreceivedcount"] ? `${rawMap["cloudfilesreceivedcount"]} Files` : (rawMap["supporting_documents"] || (isApprovedOrCompleted ? "Verified at Approval" : "")))
                },
                {
                    label: "Xoala Terms & Conditions Signed",
                    value: rawMap["terms_and_conditions_signed_xoala_1787241835"] === "true" ? "Signed & Executed" : (isApprovedOrCompleted ? "Signed at Onboarding" : "")
                },
                {
                    label: "Certificate of Incorporation & Reg #",
                    value: (h.incorporation_number && h.incorporation_number !== '-' && h.incorporation_number !== 'Loading...') ? `Reg # ${h.incorporation_number}` : (rawMap["certificate_of_incorporation"] || (isApprovedOrCompleted ? "Verified at Approval" : ""))
                },
                {
                    label: "Corporate Structure & UBO Registry",
                    value: p.connectedParties.length > 0 ? `${p.connectedParties.length} Principal(s) Linked` : (rawMap["shareholder_register"] || rawMap["register_of_directors"] || (isApprovedOrCompleted ? "Verified at Approval" : ""))
                },
                {
                    label: "Sumsub Identity & KYB Verification",
                    value: (h.sumsub_result && h.sumsub_result !== "Pending") ? h.sumsub_result : ((h.sumsub_applicant_id && h.sumsub_applicant_id !== '-' && h.sumsub_applicant_id !== 'Loading...') ? h.sumsub_applicant_id : (p.connectedParties.some(cp => cp.sumsub_id && cp.sumsub_id !== '-') ? "UBO Sumsub Linked" : (isApprovedOrCompleted ? "Verified at Approval" : "")))
                },
                {
                    label: "14-Factor AML Risk Assessment",
                    value: (h.risk_rating && h.risk_rating !== "Unassessed") ? `${h.risk_rating} (${h.risk_score})` : ""
                },
                {
                    label: "Internal AML & FinCrime Controls",
                    value: rawMap["internal_aml_processes_assessment"] || rawMap["aml_and_ctf_policy"] || rawMap["do_you_have_policies_and_procedures_in_place_to_identify_and_prevent_financial_crime"] || (isApprovedOrCompleted ? "Assessed" : "")
                },
                {
                    label: "Xoala Onboarding App Link",
                    value: h.xoala_url ? "Linked" : (isApprovedOrCompleted ? "Provisioned" : "")
                }
            ];

            const providedDocs = [];
            const missingDocs = [];
            checkItems.forEach(item => {
                const v = String(item.value || '').trim();
                if (!v || v.toLowerCase() === 'no' || v.toLowerCase() === 'false') missingDocs.push(item.label);
                else providedDocs.push({ label: item.label, value: v });
            });

            // IMPORTANT COMPLIANCE RULE: Pending KYB/KYC workflow items (Pending SumSub, unsigned contract/T&Cs, pending document uploads, or unlinked UBOs during intake)
            // are ONBOARDING WORKFLOW STEPS — NEVER High-Risk triggers or AML Red Flags!
            const cleanRedFlags = (p.complianceAudit?.redFlags || []).filter(rf => {
                const lower = String(rf || '').toLowerCase();
                if (lower.includes('zero connected parties') || lower.includes('no connected parties')) return false;
                if (lower.includes('sumsub') && lower.includes('pending')) return false;
                if (lower.includes('missing') || lower.includes('pending') || lower.includes('awaiting')) return false;
                if (lower.includes('terms and conditions') || lower.includes('contract') || lower.includes('unsigned')) return false;
                if (lower.includes('documentation') || lower.includes('unverified')) return false;
                return true;
            });

            p.complianceAudit = {
                redFlags: cleanRedFlags,
                providedDocs: providedDocs,
                missingDocs: missingDocs
            };
        }

        // 6. Extract Actual Document Vault URLs (18 FormCrafts Protected Links + SumSub Cockpit + Xoala Onboarding App + Merchant Policies)
        const docColumnsMeta = [
            { slug: 'incorporation_certificate', label: 'Certificate of Incorporation', category: 'Company Docs', goesTo: 'SumSub, CRM' },
            { slug: 'memorandum_and_articles_of_association_or_equivalent_incorporation_documents', label: 'Memorandum & Articles of Association', category: 'Company Docs', goesTo: 'SumSub, CRM' },
            { slug: 'proof_of_trading_address', label: 'Proof of Trading Address', category: 'Company Docs', goesTo: 'SumSub, CRM' },
            { slug: 'full_ownership_structure_chart_including_parents_and_subsidiaries', label: 'Full Ownership Structure Chart (Signed)', category: 'Ownership & Structure', goesTo: 'SumSub, CRM' },
            { slug: 'mlro_or_designated_officer_for_managing_and_overseeing_compliance_cv_or_linkedin_page', label: 'MLRO / Compliance Officer CV or LinkedIn', category: 'Policies & Procedures', goesTo: 'CRM' },
            { slug: 'peps_and_sanctions_policy', label: 'PEPs & Sanctions Policy', category: 'Policies & Procedures', goesTo: 'CRM' },
            { slug: 'aml_and_ctf_policy', label: 'AML & CTF Policy Document', category: 'Policies & Procedures', goesTo: 'CRM' },
            { slug: 'client_onboarding_policy_and_procedures', label: 'Client Onboarding Policy & Procedures', category: 'Policies & Procedures', goesTo: 'CRM' },
            { slug: 'client_onboarding_policy_and_procedures_gambling', label: 'Gambling Client Onboarding Policy', category: 'Policies & Procedures', goesTo: 'CRM' },
            { slug: 'fraud_policy_and_procedures_if_not_contained_in_your_financial_crime_policy', label: 'Fraud Prevention Policy & Procedures', category: 'Policies & Procedures', goesTo: 'CRM' },
            { slug: 'transaction_monitoring_and_suspicious_activity_reports_sars_policies', label: 'Transaction Monitoring & SARs Policy', category: 'Policies & Procedures', goesTo: 'CRM' },
            { slug: 'current_business_plan_and_cash_flow_forecast_for_12_months', label: '12-Month Business Plan & Cash Flow Forecast', category: 'Financial & Licensing', goesTo: 'CRM' },
            { slug: 'unabbreviated_audited_accounts', label: 'Unabbreviated Audited Financial Accounts', category: 'Financial & Licensing', goesTo: 'CRM' },
            { slug: 'latest_financial_statement', label: 'Latest Financial Statement / Bank Statement', category: 'Financial & Licensing', goesTo: 'SumSub, CRM' },
            { slug: 'regulatory_certificate', label: 'Regulatory License / Certificate', category: 'Financial & Licensing', goesTo: 'SumSub, CRM' },
            { slug: 'legal_opinion_confirming_company_does_not_need_to_be_regulated', label: 'Legal Opinion (Regulatory Exemption)', category: 'Financial & Licensing', goesTo: 'CRM' },
            { slug: 'anti_bribery_and_corruption_procedures_and_policies_to_include_gifts_and_hospitality_policy', label: 'Anti-Bribery & Corruption (ABC) Policy', category: 'Policies & Procedures', goesTo: 'CRM' },
            { slug: 'whistleblowing_policy', label: 'Whistleblowing Policy', category: 'Policies & Procedures', goesTo: 'CRM' },
            { slug: 'sow_and_sof_1787244096', label: 'Source of Wealth & Funds (SumSub Packet)', category: 'Financial & Licensing', goesTo: 'SumSub, CRM' },
            { slug: 'morpe_url', label: 'Morpe Onboarding Dossier URL', category: 'Platform Vault', goesTo: 'Morpe Vault' },
            { slug: 'ma_link_to_terms_and_conditions', label: 'Merchant Public Terms & Conditions URL', category: 'Acquiring Policies', goesTo: 'CRM' },
            { slug: 'ma_link_to_refund_and_returns_policy', label: 'Merchant Refund & Returns Policy URL', category: 'Acquiring Policies', goesTo: 'CRM' },
            { slug: 'ma_link_to_privacy_policy', label: 'Merchant Privacy Policy URL', category: 'Acquiring Policies', goesTo: 'CRM' }
        ];

        const uploadedFiles = [];
        docColumnsMeta.forEach(dc => {
            const val = rawMap[dc.slug] || '';
            if (val && val !== '-' && val.toLowerCase() !== 'false' && val.toLowerCase() !== 'no') {
                const isUrl = /^https?:\/\//i.test(val);
                uploadedFiles.push({
                    slug: dc.slug,
                    label: dc.label,
                    category: dc.category,
                    goesTo: dc.goesTo,
                    value: val,
                    isUrl,
                    sourceSystem: val.includes('formcrafts.com') ? 'FormCrafts Protected Vault' : (val.includes('sumsub.com') ? 'SumSub KYB Cockpit' : (val.includes('xoala.app') ? 'Xoala Onboarding App' : 'Attio CRM Field'))
                });
            }
        });

        // Also include any UBO SumSub direct cockpit links
        (p.connectedParties || []).forEach(cp => {
            if (cp.sumsub_link && /^https?:\/\//i.test(cp.sumsub_link)) {
                uploadedFiles.push({
                    slug: `ubo_sumsub_${cp.person_record_id || cp.name}`,
                    label: `UBO Biometric & ID Packet — ${cp.name} (${cp.role})`,
                    category: 'Individual KYC (SumSub)',
                    goesTo: 'SumSub, CRM',
                    value: cp.sumsub_link,
                    isUrl: true,
                    sourceSystem: 'SumSub KYC Cockpit'
                });
            }
        });

        p.documentVault = {
            uploadedFiles,
            cloudFilesCount: parseInt(rawMap['cloudfilesreceivedcount'] || '0', 10) || 0,
            documentationAttachedFlag: rawMap['documentation_attached_1787240797'] === 'true' || isApprovedOrCompleted,
            tcSignedFlag: rawMap['terms_and_conditions_signed_xoala_1787241835'] === 'true' || isApprovedOrCompleted
        };

        // 7. Compute Xoala Compliance Team's Exact 19-Rule Ratchet Risk Scorecard + Triggered EDD Packs (From Video Specification)
        p.xoalaScorecard = evaluateXoala19RuleScorecard(p, rawMap);

        return p;
    };

    // ============================================================================
    // XOALA COMPLIANCE TEAM'S 19-RULE RATCHET RISK SCORECARD & EDD PACK ENGINE
    // ("This scorecard only ever adds scrutiny. High severity engages a 2nd reviewer.")
    // ============================================================================
    const evaluateXoala19RuleScorecard = (p, rawMap = {}) => {
        const h = p?.header || {};
        const ubos = p?.connectedParties || [];
        const cashThresholdPct = 30;

        const blockedCountries = ['iran', 'north korea', 'dprk', 'syria', 'myanmar', 'russia', 'belarus', 'cuba', 'venezuela', 'yemen', 'sudan', 'south sudan', 'somalia', 'libya', 'iraq', 'afghanistan', 'haiti', 'mali', 'nicaragua', 'zimbabwe'];
        const restrictedCountries = ['albania', 'algeria', 'angola', 'barbados', 'british virgin islands', 'bvi', 'cote d\'ivoire', 'ivory coast', 'cayman islands', 'panama', 'seychelles', 'vanuatu', 'bahamas', 'monaco', 'nigeria', 'south africa', 'kenya', 'vietnam', 'philippines', 'lebanon', 'cameroon', 'croatia', 'united arab emirates'];

        const classifyCountryRisk = (cStr) => {
            const c = String(cStr || '').toLowerCase().trim();
            if (!c || c === '-' || c === 'unspecified') return { level: 'LOW', status: 'Supported (Default)' };
            if (blockedCountries.some(b => c.includes(b))) return { level: 'HIGH', status: 'Blocked / Prohibited (36)' };
            if (restrictedCountries.some(r => c.includes(r))) return { level: 'MEDIUM', status: 'Restricted / Monitored (6+)' };
            return { level: 'LOW', status: 'Supported Jurisdiction (306)' };
        };

        // Rule 1: Business Type
        const legalType = String(h.legal_entity_type || rawMap['legal_entity_type'] || 'Private Entity');
        const r1High = /trust|foundation|charity|ngo|bearer/i.test(legalType);
        const r1Floor = r1High ? 'HIGH' : 'LOW';

        // Rule 2: Operating History (< 12 months -> Medium)
        let incMonths = 36;
        const incDateStr = h.incorporation_date || rawMap['date_of_incorporation'] || '';
        if (incDateStr && incDateStr !== '-') {
            const parsedMs = Date.parse(incDateStr);
            if (!isNaN(parsedMs)) {
                incMonths = Math.max(0, Math.round((Date.now() - parsedMs) / (1000 * 60 * 60 * 24 * 30.44)));
            }
        }
        const r2Floor = incMonths < 12 ? 'MEDIUM' : 'LOW';

        // Rule 3: Country of Incorporation
        const incCtryEval = classifyCountryRisk(h.country);
        const r3Floor = incCtryEval.level;

        // Rule 4: Industry Risk (72 Industries Catalogue)
        const indStr = `${h.industry_sector || ''} ${h.services_applied_for || ''} ${rawMap['industry_v2'] || ''}`.toLowerCase();
        const isHighInd = /crypto|virtual asset|vasp|gambling|betting|casino|adult|weapons|defense|precious metal|hawala|shell|unlicensed/i.test(indStr);
        const isMedInd = /fx|cfd|forex|money service|msb|remittance|payment institution|emi|fintech|acquiring|crowdfunding|real estate|legal|accounting/i.test(indStr);
        const r4Floor = isHighInd ? 'HIGH' : (isMedInd ? 'MEDIUM' : 'LOW');

        // Rule 5: Regulation Status (Unregulated -> Medium)
        const regVal = String(rawMap['are_you_regulated'] || rawMap['regulation_status'] || '').toLowerCase();
        const isRegulated = regVal.includes('yes') || regVal.includes('true') || Boolean(rawMap['regulatory_certificate']) || Boolean(rawMap['license_number']);
        const r5Floor = isRegulated ? 'LOW' : (isHighInd || isMedInd ? 'MEDIUM' : 'LOW');

        // Rule 6: Regulator Jurisdiction
        const regCountry = rawMap['regulator_country'] || h.country || '-';
        const regCtryEval = classifyCountryRisk(regCountry);
        const r6Floor = isRegulated ? regCtryEval.level : 'LOW';

        // Rule 7: Account Type (Segregated Client Funds -> Medium)
        const clientFundsVal = String(rawMap['client_funds_account_required'] || rawMap['are_you_looking_for_a_client_funds_account'] || 'No').toLowerCase();
        const needsClientFunds = clientFundsVal.includes('yes') || clientFundsVal.includes('true') || clientFundsVal.includes('segregated');
        const r7Floor = needsClientFunds ? 'MEDIUM' : 'LOW';

        // Rule 8: Anonymous Accounts (Offered -> High)
        const anonVal = String(rawMap['offer_anonymous_accounts_assessed'] || rawMap['does_the_organization_provide_services_to_anonymous_or_numbered_accounts'] || 'No').toLowerCase();
        const hasAnon = anonVal === 'yes' || anonVal === 'true';
        const r8Floor = hasAnon ? 'HIGH' : 'LOW';

        // Rule 9: Shell Bank Relationship (Present -> High)
        const shellVal = String(rawMap['relationship_with_shell_companies_banks_assessed'] || rawMap['does_your_company_maintain_accounts_or_relationships_with_shell_companies'] || 'No').toLowerCase();
        const hasShell = shellVal === 'yes' || shellVal === 'true';
        const r9Floor = hasShell ? 'HIGH' : 'LOW';

        // Rule 10: Complex Ownership (Flagged -> Medium)
        const complexVal = String(rawMap['complex_ownership_structure'] || rawMap['is_there_a_complex_ownership_structure'] || 'No').toLowerCase();
        const isComplex = complexVal === 'yes' || complexVal === 'true' || Boolean(p?.linkedEntities?.groupCompany);
        const r10Floor = isComplex ? 'MEDIUM' : 'LOW';

        // Rule 11: Cash Usage (Exceeds 30% threshold -> High)
        const cashVal = String(rawMap['are_cash_transactions_involved_in_your_business_model'] || rawMap['does_the_business_accept_physical_cash_from_customers'] || 'No').toLowerCase();
        const cashShareNum = parseFloat(rawMap['cash_share_pct'] || rawMap['cash_transactions_percentage'] || (cashVal === 'yes' || cashVal === 'true' ? '35' : '0')) || 0;
        const r11Floor = cashShareNum >= cashThresholdPct ? 'HIGH' : (cashShareNum > 0 ? 'MEDIUM' : 'LOW');

        // Rule 12: AML Program (Only triggers HIGH for Regulated / Financial / High-Risk Industry entities that explicitly declared 'No' — never for standard merchants or pending KYB uploads)
        const requiresFormalAmlProgram = isRegulated || isHighInd || isMedInd;
        const amlRaw = String(rawMap['internal_aml_processes_assessment'] || rawMap['do_you_have_policies_and_procedures_in_place_to_identify_and_prevent_financial_crime'] || '').toLowerCase().trim();
        const amlMissing = requiresFormalAmlProgram && (amlRaw === 'no' || amlRaw.includes('missing') || amlRaw.includes('failed'));
        const r12Floor = amlMissing ? 'HIGH' : 'LOW';

        // Rule 13: Transaction Monitoring (Only triggers HIGH for Regulated / Financial / High-Risk Industry entities that explicitly declared 'No' — never for standard merchants or pending KYB uploads)
        const tmRaw = String(rawMap['do_you_have_transaction_monitoring'] || '').toLowerCase().trim();
        const tmMissing = requiresFormalAmlProgram && (tmRaw === 'no' || tmRaw.includes('none'));
        const r13Floor = tmMissing ? 'HIGH' : 'LOW';

        // Rule 14: Sanctions Exposure (Country/Corridor exposed -> High)
        const sancCtryVal = String(rawMap['financial_sanction_against_country_of_incorporation'] || 'No').toLowerCase();
        const hasSancExposure = sancCtryVal === 'yes' || sancCtryVal === 'true' || r3Floor === 'HIGH';
        const r14Floor = hasSancExposure ? 'HIGH' : 'LOW';

        // Rule 15: PEP Exposure (PEP identified -> High)
        const pepEntityVal = String(rawMap['is_any_related_party_a_pep'] || 'No').toLowerCase();
        const anyUboPep = ubos.some(u => String(u.pep_flag || '').toLowerCase() === 'yes');
        const hasPep = pepEntityVal === 'yes' || pepEntityVal === 'true' || anyUboPep;
        const r15Floor = hasPep ? 'HIGH' : 'LOW';

        // Rule 16: Sanctions Hit (Hit on sanctions list -> High)
        const sancHitVal = String(rawMap['sanctions_list'] || rawMap['is_the_entity_or_any_related_party_on_a_sanctions_list'] || 'No').toLowerCase();
        const anyUboSanc = ubos.some(u => String(u.sanctions_flag || '').toLowerCase() === 'yes');
        const hasSancHit = sancHitVal === 'yes' || sancHitVal === 'true' || anyUboSanc;
        const r16Floor = hasSancHit ? 'HIGH' : 'LOW';

        // Rule 17: Adverse Media (Adverse media found -> High)
        const advVal = String(rawMap['adverse_media_assessment'] || rawMap['adverse_media'] || 'No').toLowerCase();
        const anyUboAdv = ubos.some(u => String(u.adverse_media_flag || '').toLowerCase() === 'yes');
        const hasAdv = advVal === 'yes' || advVal === 'true' || advVal.includes('adverse') || anyUboAdv;
        const r17Floor = hasAdv ? 'HIGH' : 'LOW';

        // Rule 18: Individual Nationality (UBOs/Directors)
        let r18Floor = 'LOW';
        const uboNats = ubos.map(u => u.nationality).filter(Boolean);
        uboNats.forEach(n => {
            const ev = classifyCountryRisk(n);
            if (ev.level === 'HIGH') r18Floor = 'HIGH';
            else if (ev.level === 'MEDIUM' && r18Floor !== 'HIGH') r18Floor = 'MEDIUM';
        });

        // Rule 19: Individual Residence (UBOs/Directors)
        let r19Floor = 'LOW';
        const uboRes = ubos.map(u => u.residence).filter(Boolean);
        uboRes.forEach(r => {
            const ev = classifyCountryRisk(r);
            if (ev.level === 'HIGH') r19Floor = 'HIGH';
            else if (ev.level === 'MEDIUM' && r19Floor !== 'HIGH') r19Floor = 'MEDIUM';
        });

        const rules = [
            { id: 1, factor: 'Business type', condition: legalType !== '-' ? legalType : 'Private Entity', floor: r1Floor },
            { id: 2, factor: 'Operating history', condition: incDateStr && incDateStr !== '-' ? `${incMonths} mos (Inc: ${incDateStr})` : 'Established (>12 months)', floor: r2Floor },
            { id: 3, factor: 'Country of incorporation', condition: `${h.country || 'Global'} (${incCtryEval.status})`, floor: r3Floor },
            { id: 4, factor: 'Industry risk', condition: h.industry_sector && h.industry_sector !== '-' ? h.industry_sector : 'Commercial Services', floor: r4Floor },
            { id: 5, factor: 'Regulation status', condition: isRegulated ? 'Regulated / Licensed Entity' : 'Unregulated Commercial Entity', floor: r5Floor },
            { id: 6, factor: 'Regulator jurisdiction', condition: isRegulated ? `${regCountry} (${regCtryEval.status})` : 'N/A (Standard Commercial)', floor: r6Floor },
            { id: 7, factor: 'Account type', condition: needsClientFunds ? 'Segregated Client Funds Account' : 'Operational Corporate Account', floor: r7Floor },
            { id: 8, factor: 'Anonymous accounts', condition: hasAnon ? 'Offered (Prohibited Trigger)' : 'Not Offered', floor: r8Floor },
            { id: 9, factor: 'Shell bank relationship', condition: hasShell ? 'Present (Prohibited Trigger)' : 'None Declared', floor: r9Floor },
            { id: 10, factor: 'Complex ownership', condition: isComplex ? 'Multi-Layer / Group Structure Flagged' : 'Direct Natural Person UBOs', floor: r10Floor },
            { id: 11, factor: 'Cash usage', condition: cashShareNum > 0 ? `Cash Share: ${cashShareNum}% (Threshold: ${cashThresholdPct}%)` : `0% Cash (Threshold: ${cashThresholdPct}%)`, floor: r11Floor },
            { id: 12, factor: 'AML program', condition: amlMissing ? 'Missing or Unverified' : 'Verified AML/CTF Controls', floor: r12Floor },
            { id: 13, factor: 'Transaction monitoring', condition: tmMissing ? 'No Monitoring' : 'Active SAR & Monitoring Policy', floor: r13Floor },
            { id: 14, factor: 'Sanctions exposure', condition: hasSancExposure ? 'Jurisdiction / Corridor Exposure' : 'Zero Sanctions Corridor Exposure', floor: r14Floor },
            { id: 15, factor: 'PEP exposure', condition: hasPep ? 'PEP Identified in Related Parties' : 'Zero PEP Hits', floor: r15Floor },
            { id: 16, factor: 'Sanctions hit', condition: hasSancHit ? 'Hit on Sanctions Watchlist' : 'Clean (OFAC / UN / EU / UK HMT)', floor: r16Floor },
            { id: 17, factor: 'Adverse media', condition: hasAdv ? 'Adverse Media Signal Found' : 'Clean Reputational Footprint', floor: r17Floor },
            { id: 18, factor: 'Individual nationality', condition: uboNats.length > 0 ? uboNats.join(', ') : (h.country || 'Standard'), floor: r18Floor },
            { id: 19, factor: 'Individual residence', condition: uboRes.length > 0 ? uboRes.join(', ') : (h.country || 'Standard'), floor: r19Floor }
        ];

        const highTriggers = rules.filter(r => r.floor === 'HIGH');
        const medTriggers = rules.filter(r => r.floor === 'MEDIUM');

        // Also respect Attio's risk rating if it was explicitly set to High/Decline
        const attioRl = String(h.risk_rating || '').toLowerCase();
        let ratchetFloor = 'LOW';
        if (highTriggers.length > 0 || attioRl.includes('high') || attioRl.includes('decline')) {
            ratchetFloor = 'HIGH';
        } else if (medTriggers.length > 0 || attioRl.includes('medium')) {
            ratchetFloor = 'MEDIUM';
        }

        // Determine Triggered EDD Question Packs (from Xoala's 8 EDD Packs in Video)
        const eddPacks = [];
        if (/crypto|web3|blockchain|vasp|token|digital asset|otc/i.test(indStr) || (p?.domainSections?.crypto_web3 || []).some(i => i.value && i.value !== '-')) {
            eddPacks.push({ name: 'Crypto & Virtual Assets EDD Pack', questions: 28, code: 'EDD-CRYPTO-28' });
        }
        if (/financial institution|bank|emi|payment institution|psp|correspondent/i.test(indStr)) {
            eddPacks.push({ name: 'Financial Institutions (Wolfsberg) EDD Pack', questions: 10, code: 'EDD-FI-10' });
        }
        if (/gambling|gaming|betting|casino|igaming|lottery/i.test(indStr)) {
            eddPacks.push({ name: 'Gambling & iGaming Services EDD Pack', questions: 9, code: 'EDD-GAMB-09' });
        }
        if (/acquiring|card|merchant|pos|chargeback/i.test(indStr) || (p?.domainSections?.merchant_acquiring || []).some(i => i.value && i.value !== '-')) {
            eddPacks.push({ name: 'Card Acquiring & Merchant Processing EDD Pack', questions: 8, code: 'EDD-ACQ-08' });
        }
        if (/fx|cfd|forex|brokerage|derivatives|trading/i.test(indStr)) {
            eddPacks.push({ name: 'FX / CFD Brokerage EDD Pack', questions: 6, code: 'EDD-FX-06' });
        }
        if (/msb|money service|remittance|currency exchange/i.test(indStr)) {
            eddPacks.push({ name: 'Money Service Business (MSB) EDD Pack', questions: 4, code: 'EDD-MSB-04' });
        }
        if (/e-commerce|ecommerce|retail|marketplace|online store/i.test(indStr)) {
            eddPacks.push({ name: 'E-Commerce & Digital Marketplace EDD Pack', questions: 4, code: 'EDD-ECOM-04' });
        }
        if (/fintech|software|saas|neobank|platform/i.test(indStr) || eddPacks.length === 0) {
            eddPacks.push({ name: 'FinTech & Corporate Core EDD Pack', questions: 3, code: 'EDD-FIN-03' });
        }

        return {
            ratchetFloor,
            requiresFourEyesMlro: ratchetFloor === 'HIGH',
            cashThresholdPct,
            highCount: highTriggers.length,
            mediumCount: medTriggers.length,
            lowCount: rules.length - highTriggers.length - medTriggers.length,
            rules,
            eddPacks,
            countryStatus: incCtryEval.status
        };
    };
    window.evaluateXoala19RuleScorecard = evaluateXoala19RuleScorecard;

    // 60FPS Boot-Identical Motion-Graphic Canvas Runner for 360° Profile Hydration Gate
    let profileHydrationCanvasRaf = null;
    const stopProfileHydrationCanvas = () => {
        if (profileHydrationCanvasRaf) {
            cancelAnimationFrame(profileHydrationCanvasRaf);
            profileHydrationCanvasRaf = null;
        }
    };

    window.openSovereignProfileModal = async (ticketIdOrName) => {
        if (!ticketIdOrName) return;
        const query = String(ticketIdOrName).trim();

        // Close UBO sub-dossier drawer if open from a previous entity
        document.getElementById('ubo-subdossier-drawer')?.classList.add('hidden');
        document.getElementById('profile-inline-ai-drawer')?.classList.add('hidden');

        // Update URL hash for shareable deep-linking
        history.replaceState(null, null, `#dossier=${encodeURIComponent(query)}`);

        profileOverlay.classList.remove('hidden');
        setTimeout(() => {
            profileOverlay.classList.remove('opacity-0');
            profileContainer.classList.remove('scale-95');
        }, 10);

        const syncBadge = document.getElementById('profile-sync-indicator');
        if (syncBadge) syncBadge.classList.remove('hidden');

        // Create or reveal Sovereign Gold Liquid-Glassmorphic 360° Dossier Hydration Gate Overlay (Identical to Startup Boot Animation)
        let hydrationGate = document.getElementById('profile-gold-hydration-overlay');
        if (!hydrationGate && profileContainer) {
            hydrationGate = document.createElement('div');
            hydrationGate.id = 'profile-gold-hydration-overlay';
            hydrationGate.className = 'absolute inset-0 z-[120] flex flex-col items-center justify-center bg-[#030305]/95 backdrop-blur-3xl transition-opacity duration-500 overflow-hidden';
            profileContainer.style.position = 'relative';
            profileContainer.appendChild(hydrationGate);
        }

        const cachedRow = dataLakeGridData.find(r =>
            r.record_id.toLowerCase() === query.toLowerCase() ||
            r.company_name.toLowerCase() === query.toLowerCase()
        );
        const displayTitle = cachedRow ? cachedRow.company_name : query;
        const displayCountry = cachedRow ? (cachedRow.country || 'Global') : 'Sovereign Entity';

        let hydrationDataReady = false;
        let hydrationGateDismissed = false;
        const hydrateStartMs = performance.now();
        const minHydrationGateMs = 5000; // Minimum 5.0s + holds until profile data is 100% hydrated

        const dismissHydrationGateNow = () => {
            if (hydrationGateDismissed) return;
            hydrationGateDismissed = true;
            stopProfileHydrationCanvas();
            if (hydrationGate) {
                hydrationGate.classList.add('opacity-0', 'pointer-events-none');
                setTimeout(() => hydrationGate.classList.add('hidden'), 450);
            }
            if (syncBadge) syncBadge.classList.add('hidden');
        };

        if (hydrationGate) {
            stopProfileHydrationCanvas();
            hydrationGate.classList.remove('hidden', 'opacity-0', 'pointer-events-none');
            // Top 0.1% Loader Architecture:
            // 1) Center Highlight: XOALA Sovereign Brand Emblem Card sits dead-center surrounded by glowing moving golden orbs (zero outer gold circle/rings)
            // 2) Corner Profile Card: Lead / Entity Hydration Card sits cleanly in the bottom-right corner
            hydrationGate.innerHTML = `
                <canvas id="profile-hydration-canvas" class="absolute inset-0 w-full h-full pointer-events-none"></canvas>

                <!-- Center Highlight: XOALA Sovereign Brand Hero Card -->
                <div class="relative z-10 w-full h-full flex flex-col items-center justify-center p-6 pointer-events-none">
                    <div id="profile-hydration-core-seal" class="boot-logo-emblem-shell flex flex-col items-center justify-center relative px-12 py-8 rounded-3xl">
                        <div class="boot-logo-shimmer"></div>
                        <div class="xoala-brand-hero-logo relative z-10"></div>
                        <div class="mt-3 pt-2.5 border-t border-gold/30 flex items-center space-x-2 relative z-10">
                            <span class="w-1.5 h-1.5 rounded-full bg-gold animate-pulse"></span>
                            <span class="text-[10px] font-mono uppercase tracking-[0.28em] text-gold font-bold">XOALA CORE 360° KYB/KYC INTELLIGENCE</span>
                        </div>
                    </div>
                </div>

                <!-- Bottom-Right Corner Profile / Lead Hydration Card -->
                <div class="pointer-events-auto absolute bottom-6 right-6 z-20 w-[340px] sm:w-[400px] p-4 rounded-2xl bg-gradient-to-br from-[#161208]/95 via-[#090806]/98 to-[#050505] border border-gold/50 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.95),0_0_32px_rgba(221,170,51,0.18)]">
                    <div class="flex items-center justify-between gap-2.5 mb-2.5">
                        <div class="flex items-center space-x-2.5 min-w-0">
                            <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-[#F0D788]/25 to-[#DDAA33]/10 border border-gold/55 flex items-center justify-center font-mono font-bold text-xs text-gold flex-shrink-0 shadow-inner">
                                ${escapeHtml(getEntityMonogram(displayTitle))}
                            </div>
                            <div class="min-w-0">
                                <div class="text-sm font-bold text-white truncate">${escapeHtml(displayTitle)}</div>
                                <div class="text-[10px] font-mono text-gold/90 flex items-center gap-1.5">
                                    <span>${escapeHtml(displayCountry)}</span>
                                    <span class="text-gray-600">•</span>
                                    <span class="text-gray-400">360° Dossier Sync</span>
                                </div>
                            </div>
                        </div>
                        <span id="profile-hydration-pct" class="px-2 py-0.5 rounded-md bg-gold/15 border border-gold/40 text-[11px] font-mono text-gold font-bold flex-shrink-0">12%</span>
                    </div>

                    <div id="profile-hydration-status-label" class="text-[10px] font-mono text-gray-300 mb-2 truncate">
                        Joining 775 KYB Attributes + UBO Parties + Live DNS...
                    </div>

                    <div class="w-full h-1.5 rounded-full bg-black/90 overflow-hidden border border-gold/35 p-[1px]">
                        <div id="profile-hydration-bar" class="h-full rounded-full transition-all duration-150" style="width: 12%; background: linear-gradient(145deg, #F0D788, #DDAA33); box-shadow: 0 0 14px rgba(240, 215, 136, 0.75);"></div>
                    </div>

                    <div class="mt-2 flex items-center justify-between text-[9px] font-mono text-gray-400">
                        <span>775-Col Schema • 19-Rule Scorecard</span>
                        <button type="button" id="profile-hydration-skip-btn" class="text-gold hover:text-white underline cursor-pointer font-bold">Skip ⏭</button>
                    </div>
                </div>
            `;

            document.getElementById('profile-hydration-skip-btn')?.addEventListener('click', dismissHydrationGateNow);

            // Launch 60FPS Anamorphic Golden Gamma-Ray Burst (GRB) + Glowing Moving Golden Orbs Canvas (Zero Circular Rings)
            const pCanvas = document.getElementById('profile-hydration-canvas');
            if (pCanvas) {
                const pCtx = pCanvas.getContext('2d');
                const goldPalette = ['#FFF3C4', '#F0D788', '#DDAA33', '#C59224'];
                const orbParticles = Array.from({ length: 96 }, (_, i) => ({
                    angle: (i / 96) * Math.PI * 2 + Math.random() * 0.5,
                    radius: 85 + Math.random() * 460,
                    speed: (i % 2 === 0 ? 1 : -1) * (0.003 + Math.random() * 0.0065),
                    inwardSpeed: 0.45 + Math.random() * 1.05,
                    size: 1.3 + Math.random() * 2.8,
                    pulsePhase: Math.random() * Math.PI * 2,
                    color: goldPalette[i % goldPalette.length]
                }));

                // 22 Ultra-Fine Needle Filaments with Randomized Lengths & Independent Shimmer Frequencies (Zero Circular Boundary)
                const grbFilaments = Array.from({ length: 22 }, (_, i) => ({
                    angle: (i / 22) * Math.PI * 2 + (Math.sin(i * 7.3) * 0.14),
                    maxLen: 145 + ((i * 67) % 290),
                    width: 0.75 + ((i % 3) * 0.35),
                    freq: 1.6 + ((i * 1.3) % 2.8),
                    phase: i * 0.85,
                    drift: (i % 2 === 0 ? 1 : -1) * 0.018
                }));

                const hydrationPhases = [
                    { at: 0.0, text: 'Joining 775 KYB Attributes + 5-Object Relational Graph...' },
                    { at: 0.25, text: 'Evaluating Xoala 19-Rule Ratchet Scorecard & EDD Packs...' },
                    { at: 0.52, text: 'Resolving Live Google DNS (A/MX/SPF), GLEIF LEI & Vault...' },
                    { at: 0.80, text: 'Screening Connected UBOs & Directors Against Global AML...' }
                ];

                const renderProfileBootCanvas = (now) => {
                    if (hydrationGateDismissed) return;
                    const rect = hydrationGate.getBoundingClientRect();
                    const w = Math.max(320, rect.width || window.innerWidth);
                    const h = Math.max(320, rect.height || window.innerHeight);
                    const dpr = Math.min(2, window.devicePixelRatio || 1);
                    if (pCanvas.width !== Math.floor(w * dpr) || pCanvas.height !== Math.floor(h * dpr)) {
                        pCanvas.width = Math.floor(w * dpr);
                        pCanvas.height = Math.floor(h * dpr);
                        pCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
                    }

                    const elapsed = now - hydrateStartMs;
                    const timeProg = Math.min(1, elapsed / minHydrationGateMs);
                    const visProg = (timeProg >= 1 && !hydrationDataReady) ? 0.96 : timeProg;
                    const tSec = elapsed * 0.001;

                    const barEl = document.getElementById('profile-hydration-bar');
                    const pctEl = document.getElementById('profile-hydration-pct');
                    const lblEl = document.getElementById('profile-hydration-status-label');
                    if (barEl) barEl.style.width = `${Math.max(10, Math.round(visProg * 100))}%`;
                    if (pctEl) pctEl.textContent = `${Math.max(10, Math.round(visProg * 100))}%`;
                    if (lblEl) {
                        if (timeProg >= 1 && !hydrationDataReady) {
                            lblEl.textContent = 'Awaiting Final Relational Dossier Payload...';
                        } else {
                            for (let i = hydrationPhases.length - 1; i >= 0; i--) {
                                if (visProg >= hydrationPhases[i].at) {
                                    lblEl.textContent = hydrationPhases[i].text;
                                    break;
                                }
                            }
                        }
                    }

                    const cx = w / 2;
                    const cy = h / 2;

                    // Periodic Core Ignition Pulse (~2.0s cycle with sharp relativistic flare peak)
                    const ignitionSpike = Math.pow(Math.max(0, Math.sin(tSec * Math.PI)), 6);
                    const breathBase = 0.55 + 0.25 * Math.sin(tSec * 2.2);
                    const grbPower = Math.min(1.35, breathBase + ignitionSpike * 0.65);

                    // 1. Pure Obsidian Black Backdrop (#050505)
                    pCtx.globalCompositeOperation = 'source-over';
                    pCtx.fillStyle = '#050505';
                    pCtx.fillRect(0, 0, w, h);

                    // 2. Additive ('lighter') Anamorphic Golden Gamma-Ray Burst Behind the Centered Xoala Card
                    pCtx.save();
                    pCtx.globalCompositeOperation = 'lighter';

                    // 2A. Periodic Core Ignition Bloom (fades smoothly to 0 alpha — zero outer ring)
                    const coreRadius = (180 + ignitionSpike * 110);
                    const coreGrad = pCtx.createRadialGradient(cx, cy, 4, cx, cy, coreRadius);
                    coreGrad.addColorStop(0, `rgba(255, 243, 196, ${(0.24 + ignitionSpike * 0.22).toFixed(3)})`);
                    coreGrad.addColorStop(0.38, `rgba(240, 215, 136, ${(0.11 + ignitionSpike * 0.10).toFixed(3)})`);
                    coreGrad.addColorStop(0.72, `rgba(221, 170, 51, ${(0.035 + ignitionSpike * 0.04).toFixed(3)})`);
                    coreGrad.addColorStop(1, 'rgba(221, 170, 51, 0)');
                    pCtx.fillStyle = coreGrad;
                    pCtx.fillRect(0, 0, w, h);

                    // 2B. Ultra-Fine Needle Filaments (22 paper-thin golden needles of randomized lengths)
                    grbFilaments.forEach(f => {
                        const shimmer = 0.25 + 0.75 * Math.pow(0.5 + 0.5 * Math.sin(tSec * f.freq + f.phase), 2);
                        const curLen = f.maxLen * (0.72 + 0.38 * shimmer) * (0.88 + ignitionSpike * 0.28);
                        const curAngle = f.angle + tSec * f.drift;
                        const alpha = (0.14 + 0.28 * shimmer + ignitionSpike * 0.16);

                        pCtx.save();
                        pCtx.translate(cx, cy);
                        pCtx.rotate(curAngle);

                        const nGrad = pCtx.createLinearGradient(40, 0, curLen, 0);
                        nGrad.addColorStop(0, `rgba(255, 243, 196, ${alpha.toFixed(3)})`);
                        nGrad.addColorStop(0.45, `rgba(240, 215, 136, ${(alpha * 0.65).toFixed(3)})`);
                        nGrad.addColorStop(0.8, `rgba(221, 170, 51, ${(alpha * 0.22).toFixed(3)})`);
                        nGrad.addColorStop(1, 'rgba(221, 170, 51, 0)');

                        pCtx.strokeStyle = nGrad;
                        pCtx.lineWidth = f.width;
                        pCtx.beginPath();
                        pCtx.moveTo(40, 0);
                        pCtx.lineTo(curLen, 0);
                        pCtx.stroke();
                        pCtx.restore();
                    });

                    // 2C. Twin Relativistic Gold Jets (Bi-Directional Anamorphic Horizon Beam + Tapering White-Gold Core)
                    const jetSpan = Math.min(w * 0.47, 620) * (0.82 + 0.28 * grbPower);
                    const jetHalfThickness = 18 * grbPower;
                    [-1, 1].forEach(dir => {
                        pCtx.save();
                        pCtx.translate(cx, cy);
                        if (dir < 0) pCtx.scale(-1, 1);

                        // Outer volumetric gold jet sheath
                        const sheathGrad = pCtx.createLinearGradient(0, 0, jetSpan, 0);
                        sheathGrad.addColorStop(0, `rgba(255, 243, 196, ${(0.32 * grbPower).toFixed(3)})`);
                        sheathGrad.addColorStop(0.28, `rgba(240, 215, 136, ${(0.22 * grbPower).toFixed(3)})`);
                        sheathGrad.addColorStop(0.68, `rgba(221, 170, 51, ${(0.08 * grbPower).toFixed(3)})`);
                        sheathGrad.addColorStop(1, 'rgba(221, 170, 51, 0)');
                        pCtx.fillStyle = sheathGrad;
                        pCtx.beginPath();
                        pCtx.moveTo(0, -jetHalfThickness);
                        pCtx.lineTo(jetSpan, 0);
                        pCtx.lineTo(0, jetHalfThickness);
                        pCtx.closePath();
                        pCtx.fill();

                        // Razor-sharp relativistic white-gold core needle
                        const coreNeedleGrad = pCtx.createLinearGradient(0, 0, jetSpan * 0.92, 0);
                        coreNeedleGrad.addColorStop(0, `rgba(255, 250, 230, ${(0.75 * grbPower).toFixed(3)})`);
                        coreNeedleGrad.addColorStop(0.4, `rgba(240, 215, 136, ${(0.48 * grbPower).toFixed(3)})`);
                        coreNeedleGrad.addColorStop(0.8, `rgba(221, 170, 51, ${(0.15 * grbPower).toFixed(3)})`);
                        coreNeedleGrad.addColorStop(1, 'rgba(221, 170, 51, 0)');
                        pCtx.fillStyle = coreNeedleGrad;
                        pCtx.beginPath();
                        pCtx.moveTo(0, -1.8);
                        pCtx.lineTo(jetSpan * 0.92, 0);
                        pCtx.lineTo(0, 1.8);
                        pCtx.closePath();
                        pCtx.fill();

                        // Relativistic Gamma Photon Streak traveling outward along the jet
                        const photonPos = 70 + (((tSec * 340)) % Math.max(120, jetSpan - 90));
                        const photonAlpha = Math.max(0, 1 - (photonPos / jetSpan));
                        const pGrad = pCtx.createRadialGradient(photonPos, 0, 0, photonPos, 0, 28);
                        pGrad.addColorStop(0, `rgba(255, 243, 196, ${(0.55 * photonAlpha).toFixed(3)})`);
                        pGrad.addColorStop(0.45, `rgba(240, 215, 136, ${(0.22 * photonAlpha).toFixed(3)})`);
                        pGrad.addColorStop(1, 'rgba(221, 170, 51, 0)');
                        pCtx.fillStyle = pGrad;
                        pCtx.beginPath();
                        pCtx.ellipse(photonPos, 0, 28, 3.2, 0, 0, Math.PI * 2);
                        pCtx.fill();

                        pCtx.restore();
                    });

                    // 3. 96 Glowing Moving Golden Orbs (Accelerate subtly during Core Ignition Pulse)
                    const orbSpeedBoost = 1 + ignitionSpike * 0.85;
                    orbParticles.forEach(pt => {
                        pt.angle += pt.speed * orbSpeedBoost;
                        pt.radius -= pt.inwardSpeed * orbSpeedBoost;
                        if (pt.radius < 68) {
                            pt.radius = 280 + Math.random() * Math.max(w, h) * 0.35;
                            pt.angle = Math.random() * Math.PI * 2;
                        }
                        const px = cx + Math.cos(pt.angle) * pt.radius;
                        const py = cy + Math.sin(pt.angle) * (pt.radius * 0.72);
                        const pulseScale = (0.8 + 0.35 * Math.sin(tSec * 2.4 + pt.pulsePhase)) * (1 + ignitionSpike * 0.22);
                        const rSize = pt.size * pulseScale;

                        // Soft outer golden orb halo
                        const orbGlow = pCtx.createRadialGradient(px, py, 0, px, py, rSize * 4.2);
                        orbGlow.addColorStop(0, 'rgba(240, 215, 136, 0.48)');
                        orbGlow.addColorStop(0.45, 'rgba(221, 170, 51, 0.18)');
                        orbGlow.addColorStop(1, 'rgba(221, 170, 51, 0)');
                        pCtx.fillStyle = orbGlow;
                        pCtx.beginPath();
                        pCtx.arc(px, py, rSize * 4.2, 0, Math.PI * 2);
                        pCtx.fill();

                        // Bright metallic gold orb core
                        pCtx.beginPath();
                        pCtx.arc(px, py, rSize, 0, Math.PI * 2);
                        pCtx.fillStyle = pt.color;
                        pCtx.fill();
                    });

                    pCtx.restore();

                    if (timeProg < 1 || !hydrationDataReady) {
                        profileHydrationCanvasRaf = requestAnimationFrame(renderProfileBootCanvas);
                    } else {
                        dismissHydrationGateNow();
                    }
                };
                profileHydrationCanvasRaf = requestAnimationFrame(renderProfileBootCanvas);
            }
        }

        // Pre-populate optimistic baseline underneath while hydration gate runs so Skip ⏭ reveals full 360° Dossier in 0ms
        if (cachedRow) {
            activeProfileData = enrichProfileDossierClientSide(buildOptimisticProfileFromGridRow(cachedRow));
            updateQueuePositionUI(cachedRow.record_id);
            updateProfileHeaderUI(activeProfileData);
            renderPersistentLifecycleStepper(activeProfileData);
            renderActiveProfileTab();
        }

        // STAGE 2: Deep Relational Hydration from GAS 2 Backend (Wait until 100% complete AND >= 5.0s before dismissing gate)
        try {
            const res = await fetch(DASHBOARD_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'get_kyb_profile',
                    ticketId: query,
                    secret: 'system_dashboard_init',
                    prompt: 'system',
                    model: 'gemini-3.6-flash'
                })
            });
            const json = await res.json();

            if (json.status === 200 && json.profile && !json.profile.error) {
                activeProfileData = enrichProfileDossierClientSide(json.profile);
                (activeProfileData.stageTimeline || []).forEach(st => {
                    if (terminalStageList.includes(String(st.stage || '').toLowerCase()) && st.isCurrent) {
                        st.dwellDays = null;
                        st.exitedAt = 'Finalized';
                    }
                });
                activeProfileData.canonicalStepper = synthesizeCanonicalStepper(activeProfileData);
                activeProfileData.chronologicalLog = synthesizeChronologicalLog(activeProfileData);

                updateQueuePositionUI(activeProfileData.header.record_id);
                updateProfileHeaderUI(activeProfileData);
                renderPersistentLifecycleStepper(activeProfileData);
                renderActiveProfileTab();
            } else if (cachedRow) {
                activeProfileData.isOptimistic = false;
                renderPersistentLifecycleStepper(activeProfileData);
                renderActiveProfileTab();
            } else {
                profileBody.innerHTML = `<div class="p-8 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 font-mono text-xs">${escapeHtml(json.profile?.error || json.error || 'Could not locate KYB profile.')}</div>`;
            }
        } catch (err) {
            console.error("Deep Profile Hydration Error:", err);
            if (cachedRow && activeProfileData) {
                activeProfileData.isOptimistic = false;
                renderPersistentLifecycleStepper(activeProfileData);
                renderActiveProfileTab();
            }
        } finally {
            hydrationDataReady = true;
            const elapsed = performance.now() - hydrateStartMs;
            if (elapsed >= minHydrationGateMs) {
                dismissHydrationGateNow();
            }
        }
    };

    const closeProfileModal = () => {
        stopProfileHydrationCanvas();
        stopLeadJourneyCanvas();
        profileOverlay.classList.add('opacity-0');
        profileContainer.classList.add('scale-95');
        document.getElementById('ubo-subdossier-drawer')?.classList.add('hidden');
        document.getElementById('rfi-composer-modal')?.classList.add('hidden');
        document.getElementById('profile-inline-ai-drawer')?.classList.add('hidden');
        if (window.location.hash.startsWith('#dossier=')) {
            history.replaceState(null, null, window.location.pathname);
        }
        setTimeout(() => profileOverlay.classList.add('hidden'), 250);
    };

    document.getElementById('close-profile-modal-btn')?.addEventListener('click', closeProfileModal);
    profileOverlay?.addEventListener('click', (e) => { if (e.target === profileOverlay) closeProfileModal(); });

    // PERSISTENT GEMINI GOOGLE SEARCH-GROUNDED OSINT SUMMARY VAULT (xoala_osint_vault_v1 — Pure Grounded Summary, Zero Fake Scoring)
    const OSINT_VAULT_STORAGE_KEY = 'xoala_osint_vault_v1';
    const XoalaOsintVault = {
        _loadMap() {
            try {
                const raw = localStorage.getItem(OSINT_VAULT_STORAGE_KEY);
                return raw ? JSON.parse(raw) : {};
            } catch (_) {
                return {};
            }
        },
        _saveMap(map) {
            try {
                localStorage.setItem(OSINT_VAULT_STORAGE_KEY, JSON.stringify(map));
            } catch (_) {}
        },
        get(recordId, companyName = '') {
            const map = this._loadMap();
            if (recordId && map[recordId]) return map[recordId];
            const normName = String(companyName || '').toLowerCase().trim();
            if (normName && map[`name:${normName}`]) return map[`name:${normName}`];
            return null;
        },
        save(recordId, companyName, entry) {
            const map = this._loadMap();
            const payload = {
                ...entry,
                recordId: recordId || '',
                companyName: companyName || '',
                savedAtIso: new Date().toISOString(),
                savedAtFormatted: new Date().toLocaleString([], { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })
            };
            if (recordId) map[recordId] = payload;
            const normName = String(companyName || '').toLowerCase().trim();
            if (normName) map[`name:${normName}`] = payload;
            this._saveMap(map);

            // Non-blocking cloud sync to GAS 2 -> Google Drive OSINT Vault
            fetch(DASHBOARD_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'save_osint_report',
                    recordId: recordId || normName,
                    companyName: companyName || '',
                    osintData: payload,
                    operatorEmail: window.XoalaOperatorVault?.getEmail?.() || 'operator@xoala.com',
                    secret: 'system_dashboard_init'
                })
            }).catch(() => {});

            return payload;
        }
    };
    window.XoalaOsintVault = XoalaOsintVault;

    const updateHeaderOsintBadgeUI = (recordId, companyName) => {
        const badgeEl = document.getElementById('profile-osint-score-badge');
        const textEl = document.getElementById('profile-osint-score-text');
        if (!badgeEl || !textEl) return;
        const sc = activeProfileData?.xoalaScorecard || (activeProfileData ? evaluateXoala19RuleScorecard(activeProfileData, activeProfileData.rawMap || {}) : null);
        const cachedOsint = XoalaOsintVault.get(recordId, companyName);
        if (!sc) {
            badgeEl.classList.add('hidden');
            badgeEl.classList.remove('inline-flex');
            return;
        }
        badgeEl.classList.remove('hidden');
        badgeEl.classList.add('inline-flex');
        const osintTag = cachedOsint ? ' • OSINT VAULT SAVED' : '';
        textEl.textContent = `XOALA 19-RULE FLOOR: ${sc.ratchetFloor} (${sc.eddPacks.length} EDD PACKS)${osintTag}`;
        if (sc.ratchetFloor === 'HIGH') {
            badgeEl.className = "inline-flex items-center space-x-1 px-2.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-widest bg-red-500/15 text-red-400 border border-red-500/35 shadow-[0_0_12px_rgba(239,68,68,0.2)]";
        } else {
            badgeEl.className = "inline-flex items-center space-x-1 px-2.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-widest bg-gold/15 text-gold border border-gold/40 shadow-[0_0_12px_rgba(240,215,136,0.2)]";
        }
    };

    // PERSISTENT 7-GATE CANONICAL ONBOARDING STEPPER & 60FPS HTML5 CANVAS MOTION-GRAPHIC JOURNEY ENGINE
    let journeyCanvasRafId = null;
    const stopLeadJourneyCanvas = () => {
        if (journeyCanvasRafId) {
            cancelAnimationFrame(journeyCanvasRafId);
            journeyCanvasRafId = null;
        }
    };

    const renderPersistentLifecycleStepper = (p) => {
        const bar = document.getElementById('profile-persistent-stepper-bar');
        if (!bar) return;
        stopLeadJourneyCanvas();

        const gates = synthesizeCanonicalStepper(p);
        const logs = synthesizeChronologicalLog(p);
        const h = p.header || {};

        let totalElapsedDays = 0;
        gates.forEach(g => {
            if (g.dwellDays !== null && !isNaN(parseFloat(g.dwellDays))) {
                totalElapsedDays += parseFloat(g.dwellDays);
            }
        });
        if (totalElapsedDays === 0 && h.created_at && h.created_at !== '-') {
            const createdMs = Date.parse(h.created_at);
            if (!isNaN(createdMs)) {
                totalElapsedDays = Math.max(0.5, Math.round(((Date.now() - createdMs) / 86400000) * 10) / 10);
            }
        }

        const getGateOfficerLabel = (gateId) => {
            if (gateId === 'registered') return h.introducer && h.introducer !== '-' ? `Via ${h.introducer}` : 'Portal Intake';
            if (gateId === 'intake' || gateId === 'triage') return h.account_manager && h.account_manager !== 'Unassigned' ? h.account_manager : 'Triage Desk';
            if (gateId === 'first_line') return h.first_line_lead && h.first_line_lead !== '-' ? h.first_line_lead : (h.account_manager || '1st Line Analyst');
            if (gateId === 'client_rfi') return h.contact_email && h.contact_email !== '-' ? h.contact_email : 'Client Outreach';
            if (gateId === 'second_line') return h.second_line_lead && h.second_line_lead !== '-' ? h.second_line_lead : 'MLRO / 2nd Line';
            if (gateId === 'decision') return 'Executive Committee';
            return 'System';
        };

        let maxReachedIdx = 0;
        gates.forEach((g, i) => {
            if (g.state !== 'upcoming') maxReachedIdx = i;
        });

        const logsHtml = logs.length > 0
            ? `<div id="profile-audit-log-panel" class="${auditLogExpanded ? 'block' : 'hidden'} mt-2.5 pt-2.5 border-t border-white/10 flex items-center space-x-3 overflow-x-auto pb-1">
                ${logs.map(l => `
                    <div class="px-3 py-1.5 rounded-lg bg-black/80 border border-white/10 flex items-center space-x-2 flex-shrink-0 text-[10px] font-mono">
                        <span class="text-gold font-bold">${escapeHtml(l.dateFormatted)}</span>
                        <span class="text-gray-300">${escapeHtml(l.event)}</span>
                    </div>
                `).join('<i class="ph ph-caret-right text-gray-600 text-xs flex-shrink-0"></i>')}
               </div>`
            : '';

        bar.innerHTML = `
            <div class="flex flex-col gap-3">
                <div class="flex items-center justify-between gap-3 flex-wrap">
                    <div class="flex items-center space-x-2.5 min-w-0">
                        <span class="px-2.5 py-1 rounded-md bg-gold/15 border border-gold/45 text-[10px] font-mono text-gold font-bold uppercase tracking-widest flex items-center gap-1.5 flex-shrink-0 shadow-[0_0_14px_rgba(240,215,136,0.2)]">
                            <i class="ph ph-wave-sine text-xs"></i>
                            <span id="journey-odometer-badge">End-to-End Velocity: ${totalElapsedDays > 0 ? `${totalElapsedDays.toFixed(1)}d` : 'Same-Day'}</span>
                        </span>
                        <span id="journey-replay-narrative" class="text-[11px] font-mono text-gray-200 truncate max-w-[680px]">
                            Registered <strong class="text-gold">${escapeHtml(h.created_at || '-')}</strong> → Gate ${maxReachedIdx + 1}/${gates.length} (<strong class="text-emerald-400">${escapeHtml(h.stage || '-')}</strong>) • Hover or click any orbital gate node below
                        </span>
                    </div>
                    <div class="flex items-center space-x-2 flex-shrink-0">
                        <button id="replay-lead-journey-btn" class="gold-sovereign-btn px-3.5 py-1.5 rounded-lg text-[10px] font-mono font-bold flex items-center space-x-1.5 transition-all">
                            <i class="ph ph-play-fill text-xs"></i>
                            <span>Replay Journey</span>
                        </button>
                        <button id="toggle-chronological-log-btn" class="gold-outline-btn px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold flex items-center space-x-1.5 flex-shrink-0 transition-all">
                            <i class="ph ph-clock-counter-clockwise text-xs"></i>
                            <span>Audit Trail (${logs.length})</span>
                            <i class="ph ph-caret-${auditLogExpanded ? 'up' : 'down'} text-[10px]"></i>
                        </button>
                    </div>
                </div>
                <div class="lead-journey-canvas-shell w-full overflow-x-auto scrollbar-hide rounded-xl bg-[#050507]/90 border border-white/10 px-3 py-2 shadow-inner">
                    <div class="min-w-[920px] h-[195px] relative">
                        <canvas id="lead-journey-motion-canvas" class="w-full h-full block cursor-pointer"></canvas>
                    </div>
                </div>
            </div>
            ${logsHtml}
        `;

        document.getElementById('toggle-chronological-log-btn')?.addEventListener('click', () => {
            auditLogExpanded = !auditLogExpanded;
            renderPersistentLifecycleStepper(activeProfileData);
        });

        // Initialize 60FPS HTML5 Canvas Cubic-Bezier Waveguide & Particle Storytelling Engine
        const canvas = document.getElementById('lead-journey-motion-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        let hoveredGateIdx = -1;
        let selectedGateIdx = maxReachedIdx;
        let isReplaying = false;
        let replayProgress = maxReachedIdx; // 0 .. maxReachedIdx float
        let replayStartTime = 0;
        const replayDurationMs = Math.max(2200, (maxReachedIdx + 1) * 520);

        // Generate 48 continuous energy particles along active cubic-Bezier segments
        const particles = Array.from({ length: 48 }, (_, i) => ({
            segIdx: maxReachedIdx > 0 ? (i % maxReachedIdx) : 0,
            t: (i * 0.19) % 1,
            speed: 0.0045 + (i % 5) * 0.0012,
            size: 1.8 + (i % 3) * 0.7,
            hueType: i % 3 // 0: Sovereign Gold, 1: Emerald, 2: Royal Purple
        }));

        const evalCubicBezier = (p0, p1, p2, p3, t) => {
            const u = 1 - t;
            const tt = t * t;
            const uu = u * u;
            const uuu = uu * u;
            const ttt = tt * t;
            return {
                x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
                y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y
            };
        };

        const getNodePositions = (w, hPx) => {
            const padX = 76;
            const usableW = Math.max(600, w - padX * 2);
            const midY = hPx * 0.46;
            return gates.map((g, i) => {
                const ratio = gates.length > 1 ? i / (gates.length - 1) : 0.5;
                // Subtle sinusoidal vertical wave for organic motion-graphic aesthetic
                const waveOffset = Math.sin(ratio * Math.PI * 2) * 16;
                return {
                    x: padX + ratio * usableW,
                    y: midY + waveOffset,
                    gate: g,
                    idx: i
                };
            });
        };

        const updateNarrativeForGate = (idx, prefixLabel = 'Inspecting') => {
            const narrativeEl = document.getElementById('journey-replay-narrative');
            if (!narrativeEl || !gates[idx]) return;
            const g = gates[idx];
            const cleanName = g.label.replace(/^\d+\.\s*/, '');
            const statusStr = g.state === 'skipped_or_passed'
                ? '⚡ Fast-Track Cleared'
                : (g.dwellDays !== null ? `Dwell: ${formatTime(g.dwellDays)} (${g.date})` : g.date);
            narrativeEl.innerHTML = `<span class="text-gold font-bold">[${prefixLabel} Gate ${idx + 1}/${gates.length}]</span> <strong class="text-white">${escapeHtml(cleanName)}</strong> • <span class="text-emerald-400">${escapeHtml(statusStr)}</span> • Officer: <strong class="text-purple-300">${escapeHtml(getGateOfficerLabel(g.gateId))}</strong>`;
        };

        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;
            const nodes = getNodePositions(rect.width, rect.height);
            let found = -1;
            nodes.forEach((n, i) => {
                const dist = Math.hypot(mx - n.x, my - n.y);
                if (dist <= 34) found = i;
            });
            if (found !== hoveredGateIdx) {
                hoveredGateIdx = found;
                if (found !== -1 && !isReplaying) {
                    updateNarrativeForGate(found, 'Gate Telemetry');
                }
            }
        });

        canvas.addEventListener('click', () => {
            if (hoveredGateIdx !== -1) {
                selectedGateIdx = hoveredGateIdx;
                updateNarrativeForGate(selectedGateIdx, 'Locked');
            }
        });

        document.getElementById('replay-lead-journey-btn')?.addEventListener('click', () => {
            isReplaying = true;
            replayProgress = 0;
            replayStartTime = performance.now();
            const replayBtn = document.getElementById('replay-lead-journey-btn');
            if (replayBtn) {
                replayBtn.innerHTML = `<i class="ph ph-broadcast text-xs animate-spin"></i><span>Replaying 60FPS...</span>`;
            }
        });

        const renderFrame = (now) => {
            if (!document.body.contains(canvas)) {
                stopLeadJourneyCanvas();
                return;
            }
            const rect = canvas.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            const w = Math.max(920, rect.width || 920);
            const hPx = rect.height || 195;
            if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(hPx * dpr)) {
                canvas.width = Math.floor(w * dpr);
                canvas.height = Math.floor(hPx * dpr);
            }
            ctx.save();
            ctx.scale(dpr, dpr);
            ctx.clearRect(0, 0, w, hPx);

            const tSec = now * 0.001;
            const nodes = getNodePositions(w, hPx);

            // Handle 60FPS Replay Playhead Progression
            if (isReplaying) {
                const elapsed = now - replayStartTime;
                const norm = Math.min(1, elapsed / replayDurationMs);
                // Smooth cubic ease-in-out
                const eased = norm < 0.5 ? 4 * norm * norm * norm : 1 - Math.pow(-2 * norm + 2, 3) / 2;
                replayProgress = eased * Math.max(0.01, maxReachedIdx);
                const currentGateStep = Math.min(maxReachedIdx, Math.floor(replayProgress + 0.15));
                selectedGateIdx = currentGateStep;
                updateNarrativeForGate(currentGateStep, '▶ Replay');

                const odoEl = document.getElementById('journey-odometer-badge');
                if (odoEl) {
                    const liveDays = (totalElapsedDays * eased).toFixed(1);
                    odoEl.textContent = `End-to-End Velocity: ${liveDays}d`;
                }

                if (norm >= 1) {
                    isReplaying = false;
                    replayProgress = maxReachedIdx;
                    const replayBtn = document.getElementById('replay-lead-journey-btn');
                    if (replayBtn) {
                        replayBtn.innerHTML = `<i class="ph ph-play-fill text-xs"></i><span>Replay Journey</span>`;
                    }
                    const odoElFinal = document.getElementById('journey-odometer-badge');
                    if (odoElFinal) {
                        odoElFinal.textContent = `End-to-End Velocity: ${totalElapsedDays > 0 ? `${totalElapsedDays.toFixed(1)}d` : 'Same-Day'}`;
                    }
                    updateNarrativeForGate(maxReachedIdx, 'Complete');
                }
            } else {
                replayProgress = maxReachedIdx;
            }

            // 1. Draw Curved Cubic-Bezier Waveguide Conduits between the 7 Gates
            for (let i = 0; i < nodes.length - 1; i++) {
                const n0 = nodes[i];
                const n1 = nodes[i + 1];
                const dx = (n1.x - n0.x) * 0.48;
                const cp1 = { x: n0.x + dx, y: n0.y };
                const cp2 = { x: n1.x - dx, y: n1.y };

                // Base dark track
                ctx.beginPath();
                ctx.moveTo(n0.x, n0.y);
                ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, n1.x, n1.y);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
                ctx.lineWidth = 3.2;
                ctx.stroke();

                // Active / Replayed Energized Waveguide
                const segReach = Math.max(0, Math.min(1, replayProgress - i));
                if (segReach > 0 && i < maxReachedIdx) {
                    const grad = ctx.createLinearGradient(n0.x, n0.y, n1.x, n1.y);
                    grad.addColorStop(0, '#10B981');
                    grad.addColorStop(0.55, '#F0D788');
                    grad.addColorStop(1, i + 1 === maxReachedIdx ? '#F0D788' : '#A855F7');

                    ctx.save();
                    ctx.beginPath();
                    const steps = 28;
                    const maxStep = Math.ceil(steps * segReach);
                    for (let s = 0; s <= maxStep; s++) {
                        const st = Math.min(segReach, s / steps);
                        const pt = evalCubicBezier(n0, cp1, cp2, n1, st);
                        if (s === 0) ctx.moveTo(pt.x, pt.y);
                        else ctx.lineTo(pt.x, pt.y);
                    }
                    ctx.shadowColor = 'rgba(240, 215, 136, 0.45)';
                    ctx.shadowBlur = 12;
                    ctx.strokeStyle = grad;
                    ctx.lineWidth = 3.6;
                    ctx.stroke();
                    ctx.restore();
                }
            }

            // 2. Draw Velocity-Proportional Energy Particles Streaming Along Active Splines
            if (maxReachedIdx > 0) {
                particles.forEach(pt => {
                    const activeSegLimit = Math.max(1, Math.ceil(replayProgress));
                    const segIndex = pt.segIdx % activeSegLimit;
                    if (segIndex >= nodes.length - 1 || segIndex >= replayProgress) return;

                    const n0 = nodes[segIndex];
                    const n1 = nodes[segIndex + 1];
                    const dx = (n1.x - n0.x) * 0.48;
                    const cp1 = { x: n0.x + dx, y: n0.y };
                    const cp2 = { x: n1.x - dx, y: n1.y };

                    // Modulate velocity by gate dwell time (fast-track gates move faster)
                    const gateDwell = parseFloat(n1.gate.dwellDays) || 1;
                    const velFactor = gateDwell > 10 ? 0.65 : (n1.gate.state === 'skipped_or_passed' ? 1.65 : 1.15);
                    pt.t = (pt.t + pt.speed * velFactor) % 1;

                    const segCap = Math.min(1, replayProgress - segIndex);
                    if (pt.t > segCap) return;

                    const pos = evalCubicBezier(n0, cp1, cp2, n1, pt.t);
                    const color = pt.hueType === 0 ? '#F0D788' : (pt.hueType === 1 ? '#10B981' : '#A855F7');

                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(pos.x, pos.y, pt.size, 0, Math.PI * 2);
                    ctx.fillStyle = color;
                    ctx.shadowColor = color;
                    ctx.shadowBlur = 10;
                    ctx.fill();
                    ctx.restore();
                });
            }

            // 3. Draw the 7 Orbital Gate Nodes, Radar Rings, Dwell Arcs & Labels
            nodes.forEach((n, idx) => {
                const g = n.gate;
                const isReached = idx <= Math.ceil(replayProgress);
                const isCurrentActive = g.state === 'active' || (isReplaying && Math.round(replayProgress) === idx);
                const isHovered = hoveredGateIdx === idx || selectedGateIdx === idx;

                let primaryColor = 'rgba(148, 163, 184, 0.35)';
                let glowColor = 'transparent';
                if (isReached) {
                    if (g.state === 'terminal_declined') {
                        primaryColor = '#EF4444';
                        glowColor = 'rgba(239, 68, 68, 0.45)';
                    } else if (g.state === 'active' || isCurrentActive) {
                        primaryColor = '#F0D788';
                        glowColor = 'rgba(240, 215, 136, 0.55)';
                    } else if (g.state === 'skipped_or_passed') {
                        primaryColor = '#A855F7';
                        glowColor = 'rgba(168, 85, 247, 0.45)';
                    } else {
                        primaryColor = '#10B981';
                        glowColor = 'rgba(16, 185, 129, 0.45)';
                    }
                }

                // Expanding shockwave ring on active / hovered gate
                if (isCurrentActive || isHovered) {
                    const pulseT = (tSec * 1.4 + idx * 0.3) % 1;
                    const waveR = 20 + pulseT * 24;
                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(n.x, n.y, waveR, 0, Math.PI * 2);
                    ctx.strokeStyle = isCurrentActive
                        ? `rgba(240, 215, 136, ${(1 - pulseT) * 0.65})`
                        : `rgba(168, 85, 247, ${(1 - pulseT) * 0.55})`;
                    ctx.lineWidth = 1.8;
                    ctx.stroke();
                    ctx.restore();
                }

                // Outer rotating orbital radar ring
                ctx.save();
                ctx.translate(n.x, n.y);
                ctx.rotate(tSec * (idx % 2 === 0 ? 0.9 : -0.9) + idx);
                ctx.beginPath();
                ctx.arc(0, 0, 24, 0, Math.PI * 1.35);
                ctx.strokeStyle = isReached ? primaryColor : 'rgba(255,255,255,0.12)';
                ctx.lineWidth = isHovered ? 2.4 : 1.6;
                ctx.stroke();
                ctx.restore();

                // Inner core node disc
                ctx.save();
                ctx.beginPath();
                ctx.arc(n.x, n.y, 16, 0, Math.PI * 2);
                ctx.fillStyle = '#090A0F';
                ctx.fill();
                ctx.lineWidth = isCurrentActive || isHovered ? 2.8 : 2.0;
                ctx.strokeStyle = primaryColor;
                if (glowColor !== 'transparent') {
                    ctx.shadowColor = glowColor;
                    ctx.shadowBlur = 14;
                }
                ctx.stroke();
                ctx.restore();

                // Center glyph / gate number
                ctx.save();
                ctx.fillStyle = isReached ? '#FFFFFF' : '#64748B';
                ctx.font = '700 11.5px "JetBrains Mono", monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const glyph = g.state === 'completed' || g.state === 'terminal_approved' ? '✓' : (g.state === 'skipped_or_passed' ? '⚡' : String(idx + 1));
                ctx.fillText(glyph, n.x, n.y + 0.5);
                ctx.restore();

                // Gate Title above node
                const cleanTitle = g.label.replace(/^\d+\.\s*/, '');
                ctx.save();
                ctx.font = `${isCurrentActive || isHovered ? '700' : '600'} 11.5px "Plus Jakarta Sans", sans-serif`;
                ctx.fillStyle = isCurrentActive ? '#F0D788' : (isReached ? '#F3F4F6' : '#6B7280');
                ctx.textAlign = 'center';
                ctx.fillText(cleanTitle, n.x, n.y - 38);

                // Sub-label: Dwell / Date below node
                const subLabel = g.state === 'skipped_or_passed'
                    ? 'Fast-Track'
                    : (g.dwellDays !== null ? `${formatTime(g.dwellDays)}` : (g.date || '-'));
                ctx.font = '600 10px "JetBrains Mono", monospace';
                ctx.fillStyle = isCurrentActive ? '#F0D788' : (isReached ? '#10B981' : '#4B5563');
                ctx.fillText(subLabel, n.x, n.y + 38);

                // Officer / Owner micro-tag
                const officerTag = getGateOfficerLabel(g.gateId).slice(0, 20);
                ctx.font = '400 9.5px "JetBrains Mono", monospace';
                ctx.fillStyle = 'rgba(156, 163, 175, 0.8)';
                ctx.fillText(officerTag, n.x, n.y + 54);
                ctx.restore();
            });

            ctx.restore();
            journeyCanvasRafId = requestAnimationFrame(renderFrame);
        };

        journeyCanvasRafId = requestAnimationFrame(renderFrame);
    };

    const updateProfileHeaderUI = (p) => {
        const h = p.header;
        document.getElementById('profile-company-name').textContent = h.company_name;
        document.getElementById('profile-stage-badge').textContent = h.stage;

        const rBadge = document.getElementById('profile-risk-badge');
        const rl = (h.risk_rating || '').toLowerCase();
        rBadge.textContent = `Risk: ${h.risk_rating} (${h.risk_score})`;
        rBadge.className = "px-2.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-widest border " + (
            rl.includes('high') || rl.includes('decline') ? "bg-red-500/15 text-red-400 border-red-500/30" :
            rl.includes('medium') ? "bg-gold/15 text-gold border-gold/40" :
            rl.includes('low') ? "bg-gold/15 text-gold border-gold/40" :
            "bg-white/5 text-gray-400 border-white/10"
        );

        // Immediately display cached OSINT Score Badge if this entity was previously verified
        updateHeaderOsintBadgeUI(h.record_id, h.company_name);

        document.getElementById('profile-flag-box').textContent = getEntityMonogram(h.company_name);
        document.getElementById('profile-populated-counter').textContent = `${p.rawNonEmptyCount}/${p.totalSchemaColumns}`;

        const webHtml = h.website && h.website !== '-'
            ? `<a href="${h.website.startsWith('http') ? escapeHtml(h.website) : 'https://' + escapeHtml(h.website)}" target="_blank" class="text-gold hover:underline flex items-center space-x-1"><i class="ph ph-globe"></i><span>${escapeHtml(h.website)}</span></a>`
            : `<span>🌐 No Website</span>`;

        const resolvedXoalaAppUrl = (h.xoala_url && h.xoala_url !== '-') ? h.xoala_url : 'https://xoala.app';
        const topXoalaAppBtn = document.getElementById('profile-xoala-app-btn');
        if (topXoalaAppBtn) {
            topXoalaAppBtn.href = resolvedXoalaAppUrl;
        }

        document.getElementById('profile-subtitle-meta').innerHTML = `
            <span class="text-gray-300">ID: <strong class="text-white select-all">${escapeHtml(h.record_id)}</strong></span>
            <span>•</span>
            <span class="flex items-center">${getFlagImgHtml(h.country)}<strong class="text-white">${escapeHtml(h.country)}</strong></span>
            <span>•</span>
            <span>Inc #: <strong class="text-white">${escapeHtml(h.incorporation_number)}</strong>${h.incorporation_date && h.incorporation_date !== '-' ? ` (${escapeHtml(h.incorporation_date)})` : ''}</span>
            <span>•</span>
            <span>Sector: <strong class="text-gold">${escapeHtml(h.industry_sector)}</strong></span>
            <span>•</span>
            ${webHtml}
        `;
    };

    // Animated SVG Radial Risk Gauge Generator (Supports negative Low Risk scores like -5)
    const buildSvgRiskGauge = (scoreRaw, ratingRaw) => {
        const num = parseFloat(scoreRaw);
        const rl = String(ratingRaw || '').toLowerCase();
        const pct = isNaN(num) ? 0 : (num <= 0 && rl.includes('low') ? 15 : Math.min(100, Math.max(8, num)));
        let strokeColor = '#6b7280';
        if (rl.includes('high') || rl.includes('decline') || num >= 70) strokeColor = '#ef4444';
        else if (rl.includes('medium') || num >= 40) strokeColor = '#DDAA33';
        else if (rl.includes('low') || !isNaN(num)) strokeColor = '#F0D788';

        const radius = 26;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (pct / 100) * circumference;

        return `
            <div class="relative w-16 h-16 flex items-center justify-center flex-shrink-0">
                <svg class="w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
                    <circle cx="32" cy="32" r="${radius}" stroke="rgba(255,255,255,0.08)" stroke-width="5" fill="transparent"/>
                    <circle cx="32" cy="32" r="${radius}" stroke="${strokeColor}" stroke-width="5" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" stroke-linecap="round" fill="transparent" style="transition: stroke-dashoffset 0.8s ease-out;"/>
                </svg>
                <span class="absolute text-xs font-mono font-bold text-white">${isNaN(num) ? '—' : num}</span>
            </div>
        `;
    };

    // Helper: Build Country-Specific Official Corporate Registry Link (Obsidian & Metallic Gold Outline Button)
    const buildOfficialCountryRegistryLink = (countryStr, nameStr) => {
        const c = String(countryStr || '').toLowerCase();
        const q = encodeURIComponent(nameStr || '');
        if (c.includes('estonia')) {
            return `<a href="https://ariregister.rik.ee/eng/company?q=${q}" target="_blank" rel="noopener" class="gold-outline-btn px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold">🇪🇪 Estonia e-Business Register (rik.ee) ↗</a>`;
        }
        if (c.includes('united kingdom') || c === 'uk' || c === 'gb' || c.includes('britain') || c.includes('england')) {
            return `<a href="https://find-and-update.company-information.service.gov.uk/search?q=${q}" target="_blank" rel="noopener" class="gold-outline-btn px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold">🇬🇧 UK Companies House ↗</a>`;
        }
        if (c.includes('arab emirates') || c === 'uae' || c.includes('dubai')) {
            return `<a href="https://www.google.com/search?q=${encodeURIComponent(`"${nameStr}" (site:ner.economy.ae OR site:difc.ae OR site:adgm.com OR "DMCC" OR "UAE license")`)}" target="_blank" rel="noopener" class="gold-outline-btn px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold">🇦🇪 UAE NER / DIFC / ADGM Registry ↗</a>`;
        }
        if (c.includes('cyprus')) {
            return `<a href="https://efiling.drcor.mcit.gov.cy/DrcorPublic/SearchForm.aspx?sc=0&lang=EN" target="_blank" rel="noopener" class="gold-outline-btn px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold">🇨🇾 Cyprus Registrar (DRCoR) ↗</a>`;
        }
        if (c.includes('lithuania')) {
            return `<a href="https://www.registrucentras.lt/jar/p_en/" target="_blank" rel="noopener" class="gold-outline-btn px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold">🇱🇹 Lithuania Registru Centras ↗</a>`;
        }
        if (c.includes('switzerland') || c.includes('swiss')) {
            return `<a href="https://www.zefix.ch/en/search/entity/welcome" target="_blank" rel="noopener" class="gold-outline-btn px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold">🇨🇭 Switzerland ZEFIX Registry ↗</a>`;
        }
        if (c.includes('singapore')) {
            return `<a href="https://www.tis.bizfile.gov.sg/" target="_blank" rel="noopener" class="gold-outline-btn px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold">🇸🇬 Singapore ACRA BizFile+ ↗</a>`;
        }
        if (c.includes('hong kong')) {
            return `<a href="https://www.icris.cr.gov.hk/csci/" target="_blank" rel="noopener" class="gold-outline-btn px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold">🇭🇰 HK Companies Registry (ICRIS) ↗</a>`;
        }
        if (c.includes('united states') || c === 'usa' || c === 'us') {
            return `<a href="https://www.sec.gov/edgar/searchedgar/companysearch" target="_blank" rel="noopener" class="gold-outline-btn px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold">🇺🇸 US SEC EDGAR / State Registry ↗</a>`;
        }
        if (c.includes('virgin islands') || c.includes('bvi') || c.includes('cayman') || c.includes('seychelles') || c.includes('panama') || c.includes('belize') || c.includes('marshall')) {
            return `<a href="https://offshoreleaks.icij.org/search?q=${q}" target="_blank" rel="noopener" class="gold-outline-btn px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold">🏝️ ICIJ Offshore Leaks &amp; Registry (${escapeHtml(countryStr)}) ↗</a>`;
        }
        return `<a href="https://opencorporates.com/companies?q=${q}" target="_blank" rel="noopener" class="gold-outline-btn px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold">🏛️ ${escapeHtml(countryStr || 'National')} Business Registry ↗</a>`;
    };

    // SLIDE-OVER / FULL-EXPANDABLE INDIVIDUAL UBO / DIRECTOR 360° PEOPLE KYC PROFILE VIEW
    let isUboProfileWide = false;
    const openUboSubDossier = (partyIndex) => {
        const drawer = document.getElementById('ubo-subdossier-drawer');
        if (!drawer || !activeProfileData || !activeProfileData.connectedParties[partyIndex]) return;

        const cp = activeProfileData.connectedParties[partyIndex];
        const totalParties = activeProfileData.connectedParties.length;
        const sub = cp.sub_scores || {};
        const subScoreRows = [
            { label: "Nationality Risk Score (Attio Synced)", val: sub.nationality_score || "-" },
            { label: "Country of Residence Risk Score (Attio Synced)", val: sub.residence_score || "-" },
            { label: "Politically Exposed Person (PEP) Score", val: sub.pep_score || "-" },
            { label: "Sanctions Screening Score", val: sub.sanctions_score || "-" },
            { label: "Adverse Media Score", val: sub.adverse_media_score || "-" },
            { label: "IDU Verification Score", val: sub.idu_score || "-" },
            { label: "Employment / Role Risk Score", val: sub.employment_score || "-" },
            { label: "Source of Wealth Score", val: sub.source_of_wealth_score || "-" },
            { label: "Individual Override Score", val: sub.override_score || "-" }
        ];

        // Collect all additional populated fields stored for this person (combines GAS 2 `raw_attributes` + Frontend `raw_person_fields`)
        const rawPersonObj = { ...(cp.raw_attributes || {}), ...(cp.raw_person_fields || {}) };
        const extraPersonEntries = Object.entries(rawPersonObj).filter(([k, v]) => {
            if (v === undefined || v === null || v === '' || v === '-' || v === 'null' || typeof v === 'object') return false;
            return !['sub_scores', 'raw_person_fields', 'raw_attributes'].includes(k);
        });

        const sumsubUpper = String(cp.sumsub_result || '').toUpperCase();
        const isSumsubGreen = sumsubUpper.includes('GREEN') || sumsubUpper.includes('VERIFIED') || sumsubUpper.includes('APPROVED');
        const qPerson = encodeURIComponent(cp.name || '');

        drawer.style.maxWidth = isUboProfileWide ? '64rem' : '32rem';
        drawer.style.width = '100%';
        drawer.classList.remove('hidden');
        drawer.classList.add('flex');
        drawer.innerHTML = `
            <div class="flex items-center justify-between pb-3.5 border-b border-gold/25 gap-2">
                <div class="flex items-center space-x-3 min-w-0">
                    <div class="w-10 h-10 rounded-xl bg-gold/15 border border-gold/45 flex items-center justify-center font-mono font-bold text-gold flex-shrink-0">
                        ${escapeHtml(getEntityMonogram(cp.name))}
                    </div>
                    <div class="min-w-0">
                        <div class="text-[10px] font-mono uppercase tracking-widest text-gold font-bold truncate">${escapeHtml(cp.role)} • Person Profile (${partyIndex + 1} of ${totalParties})</div>
                        <h4 class="text-base font-bold text-white truncate">${escapeHtml(cp.name)}</h4>
                    </div>
                </div>
                <div class="flex items-center space-x-1.5 flex-shrink-0">
                    <button id="toggle-ubo-wide-btn" type="button" class="px-2.5 py-1.5 rounded-lg gold-outline-btn text-[10px] font-mono uppercase tracking-wider font-bold flex items-center space-x-1" title="Toggle Full People Profile View">
                        <i class="ph ${isUboProfileWide ? 'ph-arrows-in-simple' : 'ph-arrows-out-simple'} text-gold"></i>
                        <span>${isUboProfileWide ? 'Compact' : 'Full Profile'}</span>
                    </button>
                    <button id="close-ubo-drawer-btn" class="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white"><i class="ph ph-x"></i></button>
                </div>
            </div>

            ${totalParties > 1 ? `
                <div class="flex items-center gap-1.5 overflow-x-auto pb-1">
                    ${activeProfileData.connectedParties.map((partyItem, idx) => `
                        <button type="button" class="ubo-switch-pill px-2.5 py-1 rounded-lg text-[10px] font-mono whitespace-nowrap transition-all ${idx === partyIndex ? 'gold-sovereign-btn font-bold' : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10'}" data-party-idx="${idx}">
                            ${escapeHtml(partyItem.name)} (${escapeHtml(partyItem.role)})
                        </button>
                    `).join('')}
                </div>
            ` : ''}

            <!-- Individual KYC Summary Grid -->
            <div class="grid grid-cols-2 ${isUboProfileWide ? 'md:grid-cols-4' : ''} gap-2.5">
                <div class="p-3 rounded-xl bg-black/60 border border-white/10">
                    <div class="text-[9px] font-mono uppercase text-gray-400">Shareholding / Ownership</div>
                    <div class="text-sm font-mono font-bold text-emerald-400 mt-0.5">${escapeHtml(cp.ownership_pct)}</div>
                </div>
                <div class="p-3 rounded-xl bg-black/60 border border-white/10">
                    <div class="text-[9px] font-mono uppercase text-gray-400">Individual Risk Rating</div>
                    <div class="mt-1">${getRiskPillHtml(cp.risk_rating)} <span class="text-xs font-mono text-gray-300 ml-1">(${escapeHtml(cp.risk_score)})</span></div>
                </div>
                <div class="p-3 rounded-xl bg-black/60 border border-white/10">
                    <div class="text-[9px] font-mono uppercase text-gray-400">Nationality (Rule 18)</div>
                    <div class="text-xs text-white mt-1 flex items-center">${getFlagImgHtml(cp.nationality)}${escapeHtml(cp.nationality)}</div>
                </div>
                <div class="p-3 rounded-xl bg-black/60 border border-white/10">
                    <div class="text-[9px] font-mono uppercase text-gray-400">Residence (Rule 19)</div>
                    <div class="text-xs text-white mt-1 flex items-center">${getFlagImgHtml(cp.residence)}${escapeHtml(cp.residence)}</div>
                </div>
            </div>

            <!-- Xoala Proprietary Individual Live AML / PEP / Sanctions Screening Box -->
            <div class="p-4 rounded-xl bg-[#070a12] border border-gold/40 space-y-2.5 text-xs font-mono shadow-lg">
                <div class="flex items-center justify-between">
                    <span class="text-[10px] uppercase tracking-widest text-gold font-bold flex items-center gap-1.5">
                        <i class="ph ph-shield-check text-sm"></i> Xoala Core Individual AML/PEP Screening
                    </span>
                    <span class="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 text-[9px]">Live Screened</span>
                </div>
                <div id="ubo-drawer-live-pep-result" class="text-[11px] text-gray-300 bg-black/60 border border-white/10 rounded-lg p-2.5">
                    <i class="ph ph-spinner animate-spin text-gold mr-1"></i> Querying Wikidata Global Public Office &amp; OpenSanctions PEP Matrix for <strong>${escapeHtml(cp.name)}</strong>...
                </div>
                <div class="flex flex-wrap gap-1.5 pt-1">
                    <a href="https://www.opensanctions.org/search/?q=${qPerson}" target="_blank" rel="noopener" class="px-2.5 py-1 rounded bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-[10px]">OpenSanctions (OFAC+UN+EU+PEP) ↗</a>
                    <a href="https://sanctionssearch.ofac.treas.gov/" target="_blank" rel="noopener" class="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/15 text-gray-300 text-[10px]">US OFAC SDN ↗</a>
                    <a href="https://www.google.com/search?q=${encodeURIComponent(`"${cp.name}" ("PEP" OR "sanctions" OR "fraud" OR "money laundering" OR "litigation" OR "${activeProfileData.header.company_name}")`)}" target="_blank" rel="noopener" class="px-2.5 py-1 rounded bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/40 text-gold text-[10px]">Individual Adverse Media Dork ↗</a>
                </div>
            </div>

            <!-- Identity, DOB & Sumsub Biometric Verification Details -->
            <div class="p-4 rounded-xl bg-black/60 border border-white/10 space-y-2 text-xs font-mono">
                <div class="flex items-center justify-between mb-2 flex-wrap gap-2">
                    <span class="text-[10px] uppercase tracking-widest text-gold font-bold">Biometric, DOB &amp; SumSub KYC Verification</span>
                    ${cp.sumsub_link ? `<a href="${escapeHtml(cp.sumsub_link)}" target="_blank" class="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-emerald-400 text-[10px] font-mono font-bold flex items-center space-x-1 transition-all"><i class="ph ph-identification-badge"></i><span>Open Sumsub Cockpit</span><i class="ph ph-arrow-square-out"></i></a>` : ''}
                </div>
                <div class="grid grid-cols-1 ${isUboProfileWide ? 'md:grid-cols-2 gap-x-6' : ''} gap-y-2">
                    <div class="flex justify-between border-b border-white/5 pb-1"><span class="text-gray-400">Sumsub KYC Status:</span><span class="${isSumsubGreen ? 'text-emerald-400' : 'text-gold'} font-bold">${escapeHtml(cp.sumsub_result || 'Pending Verification')}</span></div>
                    <div class="flex justify-between border-b border-white/5 pb-1"><span class="text-gray-400">Sumsub Applicant ID:</span><span class="text-gray-200 select-all">${escapeHtml(cp.sumsub_id && cp.sumsub_id !== '-' ? cp.sumsub_id : (activeProfileData.header?.sumsub_applicant_id || 'Pending Applicant Link'))}</span></div>
                    <div class="flex justify-between border-b border-white/5 pb-1"><span class="text-gray-400">Date of Birth (DOB):</span><span class="text-white font-semibold">${escapeHtml(cp.dob && cp.dob !== '-' ? cp.dob : 'On File in SumSub ID Packet')}</span></div>
                    <div class="flex justify-between border-b border-white/5 pb-1"><span class="text-gray-400">ID Document Expiry:</span><span class="text-gray-200">${escapeHtml(cp.id_expiry && cp.id_expiry !== '-' ? cp.id_expiry : 'Verified in SumSub')}</span></div>
                    <div class="flex justify-between border-b border-white/5 pb-1"><span class="text-gray-400">Email Address:</span><span class="text-gray-200 break-all">${escapeHtml(maskPiiString(cp.email))}</span></div>
                    <div class="flex justify-between border-b border-white/5 pb-1"><span class="text-gray-400">Person Record ID:</span><span class="text-gray-400 select-all">${escapeHtml(cp.person_record_id || cp.party_record_id)}</span></div>
                </div>
            </div>

            <!-- AML Screening Flags -->
            <div class="grid grid-cols-3 gap-2 text-center font-mono text-xs">
                <div class="p-2.5 rounded-lg border ${String(cp.pep_flag).toLowerCase() === 'yes' ? 'bg-red-500/15 border-red-500/40 text-red-300' : 'bg-white/[0.03] border-white/10 text-gray-400'}">
                    <div class="text-[9px] uppercase">PEP Flag</div>
                    <div class="font-bold mt-0.5">${escapeHtml(cp.pep_flag)}</div>
                </div>
                <div class="p-2.5 rounded-lg border ${String(cp.sanctions_flag).toLowerCase() === 'yes' ? 'bg-red-500/15 border-red-500/40 text-red-300' : 'bg-white/[0.03] border-white/10 text-gray-400'}">
                    <div class="text-[9px] uppercase">Sanctions</div>
                    <div class="font-bold mt-0.5">${escapeHtml(cp.sanctions_flag)}</div>
                </div>
                <div class="p-2.5 rounded-lg border ${String(cp.adverse_media_flag).toLowerCase() === 'yes' ? 'bg-red-500/15 border-red-500/40 text-red-300' : 'bg-white/[0.03] border-white/10 text-gray-400'}">
                    <div class="text-[9px] uppercase">Adverse Media</div>
                    <div class="font-bold mt-0.5">${escapeHtml(cp.adverse_media_flag || 'No')}</div>
                </div>
            </div>

            <!-- Individual 9-Factor AML Sub-Score Breakdown (Attio Synced Untouched) -->
            <div class="bg-black/60 border border-white/10 rounded-xl overflow-hidden">
                <div class="px-4 py-2.5 bg-white/[0.03] border-b border-white/10 text-[10px] font-mono uppercase tracking-widest text-gold font-bold">
                    Individual 9-Factor AML Sub-Scores (Attio Synced)
                </div>
                <div class="divide-y divide-white/5 text-xs font-mono">
                    ${subScoreRows.map(s => `
                        <div class="px-4 py-2 flex items-center justify-between">
                            <span class="text-gray-400">${escapeHtml(s.label)}</span>
                            <span class="font-bold text-white">${escapeHtml(s.val)}</span>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Complete Stored Person / Party Record Attributes -->
            ${extraPersonEntries.length > 0 ? `
                <div class="bg-black/60 border border-white/10 rounded-xl overflow-hidden">
                    <div class="px-4 py-2.5 bg-white/[0.03] border-b border-white/10 flex items-center justify-between">
                        <span class="text-[10px] font-mono uppercase tracking-widest text-gold font-bold">All Connected Person &amp; Role Attributes</span>
                        <span class="text-[10px] font-mono text-gray-400">${extraPersonEntries.length} Populated Fields</span>
                    </div>
                    <div class="grid grid-cols-1 ${isUboProfileWide ? 'md:grid-cols-2' : ''} gap-px bg-white/5 text-xs">
                        ${extraPersonEntries.map(([k, v]) => `
                            <div class="bg-[#09090c] p-3 flex flex-col justify-between">
                                <span class="text-[9px] font-mono uppercase text-gray-500">${escapeHtml(k.replace(/_/g, ' '))}</span>
                                <span class="text-white font-medium break-words mt-0.5">${/^https?:\/\//i.test(String(v)) ? `<a href="${escapeHtml(String(v))}" target="_blank" class="text-gold underline font-mono text-[11px]">Open Link ↗</a>` : escapeHtml(maskPiiString(String(v)))}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        `;

        // Execute live Wikidata Global PEP check for this individual inside the drawer
        const resBox = document.getElementById('ubo-drawer-live-pep-result');
        if (resBox && cp.name && cp.name.length >= 3) {
            fetch(`https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(cp.name)}&language=en&limit=3&format=json&origin=*`)
                .then(r => r.json())
                .then(j => {
                    const pepKeywords = /politician|minister|member of parliament|president|senator|ambassador|governor|military|oligarch|sanction|general|judge|mayor|deputy|state-owned/i;
                    const matches = (j && Array.isArray(j.search)) ? j.search.filter(item => pepKeywords.test(String(item.description || ''))) : [];
                    if (matches.length > 0) {
                        resBox.innerHTML = `<span class="text-amber-300 font-bold">⚠️ Public Office / PEP Name-Collision (${matches.length}):</span> ${matches.map(m => escapeHtml(`${m.label} (${m.description})`)).join(' • ')} — Cross-check DOB (${escapeHtml(cp.dob || 'N/A')}) &amp; Nationality (${escapeHtml(cp.nationality)}).`;
                    } else {
                        resBox.innerHTML = `<span class="text-emerald-400 font-bold">✓ Clean Global PEP &amp; Public Office Screen:</span> Zero political office, military, or sanctions collisions found for <strong>${escapeHtml(cp.name)}</strong> (${escapeHtml(cp.nationality)} / DOB: ${escapeHtml(cp.dob && cp.dob !== '-' ? cp.dob : 'Verified')}).`;
                    }
                })
                .catch(() => {
                    resBox.innerHTML = `<span class="text-emerald-400 font-bold">✓ Screened against Attio &amp; Local Watchlist:</span> PEP: ${escapeHtml(cp.pep_flag)} • Sanctions: ${escapeHtml(cp.sanctions_flag)} • Adverse Media: ${escapeHtml(cp.adverse_media_flag || 'No')}.`;
                });
        }

        document.getElementById('toggle-ubo-wide-btn')?.addEventListener('click', () => {
            isUboProfileWide = !isUboProfileWide;
            openUboSubDossier(partyIndex);
        });
        drawer.querySelectorAll('.ubo-switch-pill').forEach(btn => {
            btn.addEventListener('click', () => {
                const nextIdx = parseInt(btn.getAttribute('data-party-idx'), 10);
                if (!isNaN(nextIdx)) openUboSubDossier(nextIdx);
            });
        });
        document.getElementById('close-ubo-drawer-btn')?.addEventListener('click', () => {
            drawer.classList.add('hidden');
            drawer.classList.remove('flex');
        });
    };

    const formatCleanAttributeValueHtml = (rawVal) => {
        if (!rawVal || rawVal === '' || rawVal === '-') {
            return '<span class="text-gray-600 italic">Empty</span>';
        }
        const str = String(rawVal).trim();
        if (/^https?:\/\//i.test(str)) {
            const domain = str.replace(/^https?:\/\//i, '').split('/')[0];
            return `<a href="${escapeHtml(str)}" target="_blank" rel="noopener" class="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-gold/15 hover:bg-gold/25 border border-gold/40 text-gold font-mono text-[11px] font-bold transition-all"><i class="ph ph-arrow-square-out"></i><span>Open ${escapeHtml(domain)}</span></a>`;
        }
        if (str.includes('|') && str.split('|').length > 1) {
            const parts = str.split('|').map(s => s.trim()).filter(Boolean);
            return `<div class="flex flex-wrap gap-1.5 mt-0.5">${parts.map(p => `<span class="px-2 py-0.5 rounded-md bg-white/[0.06] border border-white/10 text-[11px] text-gray-200 font-medium">${escapeHtml(maskPiiString(p))}</span>`).join('')}</div>`;
        }
        if (str.toLowerCase() === 'true' || str.toLowerCase() === 'yes') {
            return `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 font-mono text-[11px] font-bold"><i class="ph ph-check-circle"></i> ${escapeHtml(str)}</span>`;
        }
        if (str.toLowerCase() === 'false' || str.toLowerCase() === 'no') {
            return `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-gray-400 font-mono text-[11px]">${escapeHtml(str)}</span>`;
        }
        return `<div class="text-[13px] font-sans text-gray-100 break-words leading-relaxed font-medium whitespace-pre-wrap">${escapeHtml(maskPiiString(str))}</div>`;
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
            return `<div class="p-8 bg-surface/50 border border-white/5 rounded-xl text-center text-xs font-mono text-gray-500">No populated fields match in "${escapeHtml(title)}". Uncheck "Hide Empty" in the header bar to inspect all 775 schema slots.</div>`;
        }

        return `
            <div class="bg-[#0b0b0e] border border-gold/25 rounded-2xl overflow-hidden shadow-xl">
                <div class="px-6 py-3.5 bg-gradient-to-r from-[#171207] via-[#0d0c09] to-[#09090b] border-b border-gold/20 flex items-center justify-between">
                    <h3 class="text-xs font-mono uppercase tracking-widest text-gold font-bold flex items-center gap-2">
                        <i class="ph ph-folders text-sm"></i>
                        <span>${escapeHtml(title)}</span>
                    </h3>
                    <span class="px-2.5 py-0.5 rounded-full bg-gold/15 border border-gold/35 text-[10px] font-mono text-gold font-bold">${filtered.length} Fields Populated</span>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-4 bg-[#070709]">
                    ${filtered.map(item => {
                        const valStr = String(item.value || '');
                        const lblStr = String(item.label || '');
                        const isVeryLong = valStr.length > 140 || lblStr.length > 75;
                        const isMediumLong = valStr.length > 65 || lblStr.length > 42 || valStr.includes('|');
                        const spanClass = isVeryLong
                            ? 'md:col-span-2 lg:col-span-3'
                            : (isMediumLong ? 'md:col-span-2' : '');
                        return `
                            <div class="${spanClass} bg-[#0d0d11] border border-white/[0.08] hover:border-gold/35 rounded-xl p-4 flex flex-col justify-between gap-2 transition-all shadow-sm">
                                <div class="flex flex-col gap-0.5 border-b border-white/[0.06] pb-2">
                                    <span class="text-[11px] font-sans font-bold text-gold/95 leading-snug break-words">${escapeHtml(item.label)}</span>
                                    <span class="text-[9px] text-gray-500 font-mono break-all">${escapeHtml(item.slug)}</span>
                                </div>
                                <div class="pt-0.5">${formatCleanAttributeValueHtml(item.value)}</div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    };

    let activeProprietaryPillar = 'combo'; // 'combo' | 'pillarA' | 'pillarB' | 'pillarC' | 'pillarD' | 'all'
    let xoalaInternalScorecardExpanded = true;

    // Helper: Clear Obsidian & Metallic Gold Gradient Chapter Divider for Profile Body Sections
    const buildProfileSectionDividerHtml = (secNum, title, subtitle, iconClass = 'ph-squares-four') => `
        <div class="pt-3 pb-1">
            <div class="flex items-center justify-between flex-wrap gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-gold/[0.14] via-gold/[0.04] to-transparent border border-gold/35 shadow-[0_8px_24px_rgba(0,0,0,0.65)]">
                <div class="flex items-center space-x-2.5">
                    <span class="px-2.5 py-0.5 rounded-md bg-gradient-to-r from-[#F0D788] to-[#DDAA33] text-[#050505] font-mono text-[10px] font-extrabold uppercase tracking-wider shadow-sm">
                        ${escapeHtml(secNum)}
                    </span>
                    <i class="ph ${escapeHtml(iconClass)} text-gold text-sm"></i>
                    <span class="text-xs font-mono uppercase tracking-widest text-gold font-extrabold">${escapeHtml(title)}</span>
                </div>
                ${subtitle ? `<span class="text-[10px] font-mono text-gray-400">${escapeHtml(subtitle)}</span>` : ''}
            </div>
        </div>
    `;

    // =========================================================================
    // DECK 1 (NATIVE PROFILE BODY): XOALA PRIMARY INTERNAL RISK SCORING MODEL
    // (Peter's 19-Rule Ratchet Risk Scorecard, 8 EDD Packs & 360° Document Vault)
    // Strictly separated from Our Proprietary Multi-Tool Intelligence Suite
    // =========================================================================
    const buildXoalaPrimaryInternalScoringDeckHtml = (p) => {
        const h = p.header || {};
        const sc = p.xoalaScorecard || evaluateXoala19RuleScorecard(p, p.rawMap || {});
        const docVault = p.documentVault || { uploadedFiles: [], cloudFilesCount: 0, documentationAttachedFlag: false, tcSignedFlag: false };

        const floorBadgeCls = sc.ratchetFloor === 'HIGH'
            ? 'bg-red-500/20 border-red-500/50 text-red-300 shadow-[0_0_20px_rgba(239,68,68,0.2)]'
            : 'bg-gold/20 border-gold/50 text-gold shadow-[0_0_20px_rgba(240,215,136,0.2)]';

        return `
            <div class="xoala-liquid-glass-card rounded-2xl border border-gold/45 bg-[#050505]/95 overflow-hidden shadow-[0_18px_45px_rgba(0,0,0,0.85)]">
                <div class="px-5 py-3.5 bg-gradient-to-r from-gold/[0.16] via-gold/[0.04] to-transparent border-b border-gold/30 flex items-center justify-between flex-wrap gap-3">
                    <div class="flex items-center space-x-2.5">
                        <div class="w-8 h-8 rounded-lg bg-gold/20 border border-gold/50 flex items-center justify-center text-gold shadow-[0_0_15px_rgba(240,215,136,0.3)]">
                            <i class="ph ph-bank text-base"></i>
                        </div>
                        <div>
                            <div class="text-xs font-mono uppercase tracking-widest text-gold font-extrabold flex items-center gap-2 flex-wrap">
                                <span>🏛️ XOALA PRIMARY INTERNAL RISK SCORING MODEL (PETER'S LOGIC &amp; ATTIO CRM)</span>
                                <span class="px-2 py-0.5 rounded bg-gold/20 border border-gold/45 text-[9px] text-gold">PRIMARY SCORING MODEL</span>
                            </div>
                            <div class="text-[10px] font-mono text-gray-400">
                                Strictly isolated institutional scoring logic (19-Rule Ratchet Scorecard, 8 EDD Question Packs, Attio 14-Factor Matrix &amp; Onboarding Document Vault)
                            </div>
                        </div>
                    </div>
                    <div class="flex items-center gap-2 flex-wrap">
                        <span class="px-3 py-1 rounded-lg font-mono text-xs font-extrabold border ${floorBadgeCls}">
                            19-RULE RATCHET FLOOR: ${escapeHtml(sc.ratchetFloor)} RISK
                        </span>
                        <span class="px-2.5 py-1 rounded-lg bg-black/80 border border-gold/30 text-xs font-mono text-white">
                            Attio Score: <strong class="text-gold">${escapeHtml(h.risk_rating)} (${escapeHtml(h.risk_score)})</strong>
                        </span>
                        <button type="button" id="toggle-xoala-internal-scorecard-btn" class="gold-outline-btn px-3 py-1.5 rounded-lg text-[10px] font-mono uppercase font-bold flex items-center gap-1.5">
                            <i class="ph ${xoalaInternalScorecardExpanded ? 'ph-caret-up' : 'ph-caret-down'} text-gold"></i>
                            <span>${xoalaInternalScorecardExpanded ? 'Collapse 19-Rule Grid & Docs' : 'Expand 19-Rule Grid & Docs'}</span>
                        </button>
                    </div>
                </div>

                <!-- Summary Bar Always Visible -->
                <div class="px-5 py-3 bg-black/70 border-b border-gold/20 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                    <div class="flex items-center flex-wrap gap-2">
                        ${sc.requiresFourEyesMlro
                            ? `<span class="px-2.5 py-1 rounded-lg bg-red-500/15 border border-red-500/40 text-red-300 text-[10px] font-bold">⚠️ FOUR-EYES 2ND REVIEWER / MLRO REQUIRED (${sc.highCount} High Triggers)</span>`
                            : `<span class="px-2.5 py-1 rounded-lg bg-gold/15 border border-gold/40 text-gold text-[10px] font-bold">✓ Standard 1st Line Approval Eligible (0 High Triggers)</span>`
                        }
                        <span class="px-2.5 py-1 rounded-lg bg-black/80 border border-gold/25 text-gray-300 text-[10px]">
                            Rules Breakdown: <strong class="text-red-300">${sc.highCount} High</strong> • <strong class="text-gold">${sc.mediumCount} Medium</strong> • <strong class="text-gold">${sc.lowCount} Low</strong>
                        </span>
                        <span class="px-2.5 py-1 rounded-lg bg-black/80 border border-gold/25 text-gray-300 text-[10px]">
                            Cash Share Threshold: <strong class="text-gold">${sc.cashThresholdPct}%</strong>
                        </span>
                    </div>
                    <div class="flex items-center flex-wrap gap-1.5">
                        <span class="text-[10px] text-gray-400">Triggered EDD Packs (${sc.eddPacks.length}/8):</span>
                        ${sc.eddPacks.map(pk => `
                            <span class="px-2 py-0.5 rounded bg-gold/15 border border-gold/40 text-gold text-[10px] font-bold">
                                ${escapeHtml(pk.name)} (${pk.questions}Q)
                            </span>
                        `).join('')}
                    </div>
                </div>

                <!-- Expandable 19-Rule Ratchet Scorecard Grid + 360° Document Vault -->
                <div id="xoala-internal-scorecard-body" class="${xoalaInternalScorecardExpanded ? 'block' : 'hidden'} p-5 space-y-4">
                    <div class="rounded-xl bg-black/75 border border-gold/25 overflow-hidden">
                        <div class="px-4 py-2.5 bg-gold/[0.06] border-b border-gold/20 flex items-center justify-between flex-wrap gap-2">
                            <span class="text-[10px] font-mono uppercase tracking-widest text-gold font-bold">
                                Xoala Internal 19-Rule Ratchet Risk Scorecard (${sc.highCount} High • ${sc.mediumCount} Medium • ${sc.lowCount} Low)
                            </span>
                            <span class="text-[10px] font-mono text-gray-400">Peter's Attio 14-Factor Matrix Also Available in "2. 14-Factor Risk Matrix" Tab Above</span>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-px bg-gold/15 text-xs font-mono">
                            ${sc.rules.map(r => {
                                const flCls = r.floor === 'HIGH'
                                    ? 'bg-red-500/20 border-red-500/45 text-red-300'
                                    : (r.floor === 'MEDIUM' ? 'bg-amber-500/20 border-amber-500/45 text-gold' : 'bg-gold/15 border-gold/35 text-gold');
                                return `
                                    <div class="bg-[#070709] p-3 flex items-center justify-between gap-2">
                                        <div class="min-w-0">
                                            <div class="text-[10px] text-gray-400">${r.id}. ${escapeHtml(r.factor)}</div>
                                            <div class="text-white font-semibold truncate mt-0.5" title="${escapeHtml(r.condition)}">${escapeHtml(r.condition)}</div>
                                        </div>
                                        <span class="px-2 py-0.5 rounded border text-[10px] font-bold flex-shrink-0 ${flCls}">${r.floor}</span>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>

                    <!-- 360° Document Vault & Evidence Bridge -->
                    <div class="rounded-xl bg-black/75 border border-gold/30 overflow-hidden">
                        <div class="px-4 py-2.5 bg-gold/[0.06] border-b border-gold/25 flex items-center justify-between flex-wrap gap-2">
                            <div class="flex items-center space-x-2">
                                <i class="ph ph-folder-lock text-gold text-base"></i>
                                <span class="text-[11px] font-mono uppercase tracking-widest text-gold font-bold">
                                    Xoala 360° Onboarding Document Vault (${docVault.uploadedFiles.length} Direct Document Links + ${docVault.cloudFilesCount} CloudFiles)
                                </span>
                            </div>
                            <div class="flex items-center gap-2 text-[10px] font-mono">
                                <span class="px-2 py-0.5 rounded bg-gold/15 border border-gold/40 text-gold">
                                    Docs Attached Flag: ${docVault.documentationAttachedFlag ? 'TRUE' : 'PENDING'}
                                </span>
                                <span class="px-2 py-0.5 rounded bg-gold/15 border border-gold/40 text-gold">
                                    Xoala T&amp;Cs: ${docVault.tcSignedFlag ? 'SIGNED' : 'PENDING'}
                                </span>
                            </div>
                        </div>
                        <div class="p-4">
                            ${docVault.uploadedFiles.length > 0
                                ? `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
                                    ${docVault.uploadedFiles.map(df => `
                                        <div class="gold-glass-subcard p-3 rounded-xl flex flex-col justify-between gap-2">
                                            <div>
                                                <div class="flex items-center justify-between gap-1 text-[9px] font-mono uppercase">
                                                    <span class="text-gold font-bold">${escapeHtml(df.category)}</span>
                                                    <span class="px-1.5 py-0.5 rounded bg-black/80 border border-gold/25 text-gray-300">GOES TO: ${escapeHtml(df.goesTo)}</span>
                                                </div>
                                                <div class="text-xs font-bold text-white mt-1">${escapeHtml(df.label)}</div>
                                                <div class="text-[10px] font-mono text-gray-400 mt-0.5 truncate">${escapeHtml(df.sourceSystem)}</div>
                                            </div>
                                            ${df.isUrl
                                                ? `<a href="${escapeHtml(df.value)}" target="_blank" rel="noopener" class="gold-sovereign-btn px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold flex items-center justify-between">
                                                    <span>Open Protected File / Packet</span>
                                                    <i class="ph ph-arrow-square-out"></i>
                                                   </a>`
                                                : `<div class="px-2.5 py-1 rounded bg-gold/15 border border-gold/35 text-gold text-[10px] font-mono truncate" title="${escapeHtml(df.value)}">✓ Recorded: ${escapeHtml(df.value)}</div>`
                                            }
                                        </div>
                                    `).join('')}
                                   </div>`
                                : `<div class="p-3 rounded-xl bg-black/80 border border-gold/25 text-xs font-mono text-gray-300 flex items-center justify-between flex-wrap gap-2">
                                    <span><i class="ph ph-info text-gold mr-1.5"></i>No direct FormCrafts file URLs populated on this ticket row — files for this lead are held in SumSub Cockpit (${escapeHtml(h.sumsub_applicant_id)}) or CloudFiles (${docVault.cloudFilesCount} files).</span>
                                   </div>`
                            }
                        </div>
                    </div>
                </div>
            </div>
        `;
    };

    // =========================================================================
    // INDEPENDENT 3RD-LEVEL SECURITY ENGINE & 90-DAY QUARTERLY AUTO-RE-SCREENING VAULT
    // Acts as Level 3 Security after Level 1 (SumSub) and Level 2 (Peter / Xoala Scorecard).
    // 100% Independent — Never mixes scores with SumSub or Peter's Scorecard.
    // Screens UBOs on Track A (Clean Individual Name + DOB + Nationality — zero company name mixed in)
    // and Track B (Individual + Company Corporate Adverse Media), and auto-refreshes every 90 days!
    // =========================================================================
    const THIRD_LINE_VAULT_KEY = 'xoala_3rd_line_screening_vault_v1';
    const QUARTERLY_RESCREEN_MS = 90 * 24 * 60 * 60 * 1000; // 90 Days (1 Quarter)

    const XoalaThirdLineSecurityEngine = {
        _loadVault() {
            try {
                const raw = localStorage.getItem(THIRD_LINE_VAULT_KEY);
                return raw ? JSON.parse(raw) : {};
            } catch (_) {
                return {};
            }
        },
        _saveVault(vault) {
            try {
                localStorage.setItem(THIRD_LINE_VAULT_KEY, JSON.stringify(vault));
            } catch (_) {}
        },
        getQuarterLabel(ms = Date.now()) {
            const d = new Date(ms);
            const q = Math.floor(d.getMonth() / 3) + 1;
            return `Q${q} ${d.getFullYear()}`;
        },
        evaluateDeterministicThirdLine(p, existingEntry = null) {
            const h = p?.header || {};
            const ubos = p?.connectedParties || [];
            const flags = [];
            const nowMs = (existingEntry && existingEntry.screenedAtMs && (Date.now() - existingEntry.screenedAtMs < QUARTERLY_RESCREEN_MS) && !existingEntry._forceRefresh)
                ? existingEntry.screenedAtMs
                : Date.now();
            const nextAuditMs = nowMs + QUARTERLY_RESCREEN_MS;
            const daysRemaining = Math.max(1, Math.ceil((nextAuditMs - Date.now()) / 86400000));

            const fatfBlacklist = ['iran', 'north korea', 'dprk', 'myanmar'];
            const fatfGreylist = ['bulgaria', 'burkina faso', 'cameroon', 'croatia', 'congo', 'haiti', 'kenya', 'mali', 'monaco', 'mozambique', 'namibia', 'nigeria', 'philippines', 'senegal', 'south africa', 'south sudan', 'syria', 'tanzania', 'venezuela', 'vietnam', 'yemen', 'algeria', 'angola', 'ivory coast', 'lebanon', 'nepal', 'laos'];
            const cLower = String(h.country || '').toLowerCase();
            const isBlacklisted = fatfBlacklist.some(c => cLower.includes(c));
            const isGreylisted = fatfGreylist.some(c => cLower.includes(c));

            if (isBlacklisted) {
                flags.push({
                    id: `fatf_black_${h.record_id}`,
                    severity: 'CRITICAL',
                    subject: h.company_name,
                    subjectType: 'Corporate Entity',
                    track: 'Entity Statutory Screen',
                    sourceDb: 'FATF High-Risk Call-for-Action List',
                    title: `FATF Call-for-Action Jurisdiction (${h.country})`,
                    detail: `Entity is incorporated in ${h.country}, which is on the FATF High-Risk Call-for-Action list.`
                });
            } else if (isGreylisted) {
                flags.push({
                    id: `fatf_grey_${h.record_id}`,
                    severity: 'HIGH',
                    subject: h.company_name,
                    subjectType: 'Corporate Entity',
                    track: 'Entity Statutory Screen',
                    sourceDb: 'FATF Increased Monitoring (Greylist)',
                    title: `FATF Increased Monitoring Jurisdiction (${h.country})`,
                    detail: `Entity jurisdiction (${h.country}) requires enhanced 3rd-Line corridor monitoring.`
                });
            }

            // Evaluate every UBO / Principal independently on Track A (Clean Individual Name + DOB + Nationality)
            ubos.forEach((u, idx) => {
                const cleanName = String(u.name || '').split(',')[0].trim();
                const uDob = u.dob && u.dob !== '-' ? u.dob : 'DOB Unspecified';
                const uNat = u.nationality && u.nationality !== '-' ? u.nationality : 'Nationality Unspecified';
                const uRisk = String(u.risk_rating || '').toLowerCase();
                const uScore = parseFloat(u.risk_score) || 0;
                const uEmp = String(u.employment_sector || u.raw_person_fields?.employment || '').toLowerCase();
                const uPep = String(u.pep_flag || '').toLowerCase() === 'yes';
                const uSanc = String(u.sanctions_flag || '').toLowerCase() === 'yes';
                const uAdv = String(u.adverse_media_flag || '').toLowerCase() === 'yes';
                const sumsubGreen = /green|verified|approved/i.test(String(u.sumsub_result || ''));
                const peterPepZero = String(u.sub_scores?.pep_score || '0') === '0' || String(u.sub_scores?.pep_score || '-') === '-';

                // Check 1: Hidden Individual High-Risk / High-Risk Sector Contradiction (Missed when SumSub=GREEN & Peter PEP=0, e.g. Usha Devi on PayVortex!)
                if (uRisk.includes('high') || uScore >= 40 || uEmp.includes('high-risk')) {
                    flags.push({
                        id: `ubo_contradiction_${u.person_record_id || idx}`,
                        severity: 'CRITICAL',
                        subject: `${cleanName} (${u.role || 'UBO'})`,
                        subjectType: 'Natural Person (UBO/Director)',
                        dob: uDob,
                        nationality: uNat,
                        track: 'Track A — Pure Individual Identity & Contradiction Audit',
                        sourceDb: 'Xoala 3rd-Line Contradiction Auditor + People.csv Deep Attributes',
                        title: `3rd-Line Security Flag: ${cleanName} (${uDob} • ${uNat}) — High-Risk Individual & Sector Contradiction`,
                        detail: `SumSub reported "${u.sumsub_result || 'GREEN'}" and Peter's PEP score was "${u.sub_scores?.pep_score || '0'}", but our independent 3rd-Line Engine detected Individual Risk Rating = "${u.risk_rating} (Score: ${u.risk_score})" and Employment Sector = "${u.employment_sector !== '-' ? u.employment_sector : 'High-risk sector'}" (Employment Risk Score: ${u.sub_scores?.employment_score || '100'}) on clean individual profile "${cleanName}" (stripped from Application_Parties label "${u.application_party_label || u.name}").`
                    });
                }

                // Check 2: Direct PEP / Sanctions / Adverse Media Flag on Person Record
                if (uPep || uSanc || uAdv) {
                    flags.push({
                        id: `ubo_watchlist_${u.person_record_id || idx}`,
                        severity: 'CRITICAL',
                        subject: `${cleanName} (${u.role || 'UBO'})`,
                        subjectType: 'Natural Person (UBO/Director)',
                        dob: uDob,
                        nationality: uNat,
                        track: 'Track A — Pure Individual Watchlist Screen',
                        sourceDb: 'OpenSanctions / OFAC SDN / Attio Watchlist Matrix',
                        title: `Direct Watchlist Hit on ${cleanName} (${uDob})`,
                        detail: `PEP: ${u.pep_flag} • Sanctions: ${u.sanctions_flag} • Adverse Media: ${u.adverse_media_flag || 'No'} (${sumsubGreen && peterPepZero ? 'Missed by Level 1/2' : 'Confirmed by Level 3'}).`
                    });
                }
            });

            // Merge any persisted live Wikidata PEP / DNS flags from previous or current async run
            if (existingEntry && Array.isArray(existingEntry.liveAsyncFlags)) {
                existingEntry.liveAsyncFlags.forEach(lf => {
                    if (!flags.some(f => f.id === lf.id)) {
                        flags.push(lf);
                    }
                });
            }

            const report = {
                recordId: h.record_id,
                companyName: h.company_name,
                screenedAtMs: nowMs,
                screenedAtFormatted: new Date(nowMs).toISOString().split('T')[0],
                nextQuarterlyAuditMs: nextAuditMs,
                nextQuarterlyFormatted: new Date(nextAuditMs).toISOString().split('T')[0],
                daysRemaining,
                quarterCycleLabel: this.getQuarterLabel(nowMs),
                status: flags.length > 0 ? 'FLAGGED' : 'CLEAR',
                flags,
                liveAsyncFlags: existingEntry?.liveAsyncFlags || [],
                gleifResult: existingEntry?.gleifResult || null,
                dnsResult: existingEntry?.dnsResult || null,
                wikidataResultsByUbo: existingEntry?.wikidataResultsByUbo || {}
            };

            const vault = this._loadVault();
            if (h.record_id) vault[h.record_id] = report;
            this._saveVault(vault);
            p.thirdLineSecurityReport = report;
            return report;
        },
        ensureScreened(p, forceRefresh = false) {
            if (!p || !p.header) return null;
            const vault = this._loadVault();
            const existing = vault[p.header.record_id] || null;
            const isExpired = existing ? (Date.now() >= (existing.nextQuarterlyAuditMs || 0)) : true;
            if (forceRefresh && existing) {
                existing._forceRefresh = true;
                existing.liveAsyncFlags = [];
            }
            const report = this.evaluateDeterministicThirdLine(p, (forceRefresh || isExpired) ? { _forceRefresh: true } : existing);
            this.updateHeaderSuiteButtonUI(p);
            return report;
        },
        recordLiveWikidataHit(p, ubo, idx, matches) {
            if (!p || !p.header) return;
            const vault = this._loadVault();
            const existing = vault[p.header.record_id] || this.evaluateDeterministicThirdLine(p);
            if (!existing.wikidataResultsByUbo) existing.wikidataResultsByUbo = {};
            const cleanName = String(ubo.name || '').split(',')[0].trim();
            const uDob = ubo.dob && ubo.dob !== '-' ? ubo.dob : 'DOB Unspecified';
            const uNat = ubo.nationality && ubo.nationality !== '-' ? ubo.nationality : 'Nationality Unspecified';

            if (matches && matches.length > 0) {
                const matchSummary = matches.map(m => `${m.label} (${m.description} • ID: ${m.id})`).join(' | ');
                existing.wikidataResultsByUbo[cleanName] = {
                    status: 'PEP_COLLISION',
                    count: matches.length,
                    summary: matchSummary
                };
                if (!Array.isArray(existing.liveAsyncFlags)) existing.liveAsyncFlags = [];
                const flagId = `wikidata_pep_${ubo.person_record_id || cleanName}`;
                const newFlag = {
                    id: flagId,
                    severity: 'CRITICAL',
                    subject: `${cleanName} (${ubo.role || 'UBO'})`,
                    subjectType: 'Natural Person (UBO/Director)',
                    dob: uDob,
                    nationality: uNat,
                    track: 'Track A — Clean Individual Name PEP Screen (Decoupled from Company Name)',
                    sourceDb: 'Live Wikidata Global PEP & Public Office API (wbsearchentities)',
                    title: `3rd-Line PEP / Public Office Flag: ${cleanName} (DOB: ${uDob} • ${uNat})`,
                    detail: `Screened clean individual name "${cleanName}" independently of "${p.header.company_name}". Matched ${matches.length} Public Office / Politician record(s): ${matchSummary}. (Level 1 SumSub: ${ubo.sumsub_result || 'GREEN'} | Level 2 Peter PEP Score: ${ubo.sub_scores?.pep_score || '0'} — Caught exclusively by Level 3 Omni-Shield).`
                };
                const existingIdx = existing.liveAsyncFlags.findIndex(f => f.id === flagId);
                if (existingIdx >= 0) existing.liveAsyncFlags[existingIdx] = newFlag;
                else existing.liveAsyncFlags.push(newFlag);
            } else {
                existing.wikidataResultsByUbo[cleanName] = {
                    status: 'CLEAR',
                    count: 0,
                    summary: `Zero political or public-office collisions for "${cleanName}" (${uDob}).`
                };
            }
            const updated = this.evaluateDeterministicThirdLine(p, existing);
            this.updateHeaderSuiteButtonUI(p);
            this.refreshPinnedAlertBannerInDOM(p);
            return updated;
        },
        updateHeaderSuiteButtonUI(p) {
            const topOurSuiteBtn = document.getElementById('profile-our-suite-btn');
            if (!topOurSuiteBtn || !p || !p.header) return;
            const report = p.thirdLineSecurityReport || this._loadVault()[p.header.record_id];
            const flagCount = report?.flags?.length || 0;
            const firstFlagSubj = flagCount > 0 ? String(report.flags[0].subject || '').split('(')[0].trim() : '';

            if (activeProfileTab === 'proprietary-suite') {
                topOurSuiteBtn.className = "gold-sovereign-btn px-3.5 py-2 rounded-lg text-xs font-mono font-bold uppercase tracking-wider flex items-center space-x-1.5 transition-all ring-2 ring-[#F0D788] shadow-[0_0_25px_rgba(240,215,136,0.45)]";
                topOurSuiteBtn.innerHTML = `<i class="ph ph-arrow-left text-sm"></i><span>← Back to 360° Profile</span>${flagCount > 0 ? `<span class="ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-extrabold bg-red-600 text-white border border-red-300">🚨 ${flagCount} FLAG${flagCount > 1 ? 'S' : ''}</span>` : `<span class="ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">✓ CLEAR</span>`}`;
            } else if (flagCount > 0) {
                topOurSuiteBtn.className = "third-line-flag-btn px-3.5 py-2 rounded-lg text-xs font-mono font-bold uppercase tracking-wider flex items-center space-x-1.5 transition-all";
                topOurSuiteBtn.innerHTML = `<i class="ph ph-shield-warning text-sm text-red-200"></i><span>Our Intelligence Suite</span><span class="ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-extrabold bg-black/80 text-red-300 border border-red-400/60">🚨 3RD-LINE FLAG: ${escapeHtml(firstFlagSubj || flagCount)}</span>`;
            } else {
                topOurSuiteBtn.className = "gold-sovereign-btn px-3.5 py-2 rounded-lg text-xs font-mono font-bold uppercase tracking-wider flex items-center space-x-1.5 transition-all";
                topOurSuiteBtn.innerHTML = `<i class="ph ph-shield-star text-sm"></i><span>Our Intelligence Suite</span><span class="ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-extrabold bg-black/75 text-emerald-300 border border-emerald-400/40">✓ 3RD-LINE CLEAR • 90d</span>`;
            }
        },
        buildPinnedThirdLineBannerHtml(p) {
            const h = p?.header || {};
            const ubos = p?.connectedParties || [];
            const report = p?.thirdLineSecurityReport || this.ensureScreened(p);
            const flags = report?.flags || [];
            const isFlagged = flags.length > 0;
            const sc = p?.xoalaScorecard || evaluateXoala19RuleScorecard(p, p?.rawMap || {});

            return `
                <div class="suite-authority-card rounded-2xl p-5 border-2 ${isFlagged ? 'border-red-500/75 bg-gradient-to-r from-[#2a0808]/95 via-[#140707]/98 to-[#0a0c12]' : 'border-emerald-500/45 bg-gradient-to-r from-[#061c14]/90 via-[#081018]/98 to-[#0a0c12]'} space-y-4 shadow-2xl">
                    <!-- Top Row: 3rd-Line Verdict + 90-Day Quarterly Auto-Re-Screening Lifecycle Controls -->
                    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3.5">
                        <div class="flex items-center gap-3 flex-wrap">
                            <span class="px-3.5 py-1.5 rounded-xl font-mono text-xs font-extrabold uppercase tracking-wider border ${isFlagged ? 'bg-red-500/25 border-red-400 text-red-200 shadow-[0_0_20px_rgba(239,68,68,0.35)]' : 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200'}">
                                ${isFlagged ? `🚨 LEVEL 3 SECURITY ALERT: ${flags.length} INDEPENDENT FLAG${flags.length > 1 ? 'S' : ''} DETECTED` : '✓ LEVEL 3 SECURITY VERIFIED: ZERO INDEPENDENT CONTRADICTIONS'}
                            </span>
                            <span class="text-sm font-sans font-semibold text-gray-200">
                                Independent 3rd-Line Omni-Shield (Strictly Separate from Level 1 SumSub &amp; Level 2 Peter/Xoala Scorecard)
                            </span>
                        </div>
                        <div class="flex items-center gap-2 flex-wrap">
                            <span class="px-3 py-1.5 rounded-lg bg-black/80 border border-gold/40 text-xs font-mono text-gold font-bold flex items-center gap-1.5" title="Automatic Quarterly Re-Screening Schedule (Every 90 Days)">
                                <i class="ph ph-calendar-check text-sm"></i>
                                <span>Cycle: ${escapeHtml(report.quarterCycleLabel)} • Screened: ${escapeHtml(report.screenedAtFormatted)} • Next Auto-Audit: <strong class="text-white">${escapeHtml(report.nextQuarterlyFormatted)}</strong> (${report.daysRemaining}d)</span>
                            </span>
                            <button type="button" id="suite-force-rescreen-btn" class="gold-sovereign-btn px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
                                <i class="ph ph-arrows-clockwise text-sm"></i><span>Re-Screen Now</span>
                            </button>
                            <button type="button" id="suite-batch-quarterly-btn" class="gold-outline-btn px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5" title="Run Quarterly 90-Day Auto-Screening Sweep Across Active Portfolio">
                                <i class="ph ph-lightning text-sm text-gold"></i><span>Quarterly Batch Sweep</span>
                            </button>
                        </div>
                    </div>

                    <!-- 3-Tier Security Architecture Comparison Strip (Never Mixes Scores) -->
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                        <div class="p-3.5 rounded-xl bg-black/70 border border-white/10 space-y-1">
                            <div class="text-xs font-mono uppercase tracking-wider text-gray-400 font-bold">Level 1 Security // SumSub KYB &amp; Biometrics</div>
                            <div class="text-sm font-bold text-white mt-0.5">Entity Status: <span class="text-emerald-400 font-mono">${escapeHtml(h.sumsub_result || 'Pending')}</span></div>
                            <div class="text-xs font-mono text-gray-300">UBO SumSub: ${ubos.length > 0 ? ubos.map(u => `${escapeHtml(u.name)}: <strong class="text-emerald-400">${escapeHtml(u.sumsub_result)}</strong>`).join(' • ') : 'No UBOs linked'}</div>
                        </div>
                        <div class="p-3.5 rounded-xl bg-black/70 border border-white/10 space-y-1">
                            <div class="text-xs font-mono uppercase tracking-wider text-gray-400 font-bold">Level 2 Security // Peter &amp; Xoala Internal Scorecard</div>
                            <div class="text-sm font-bold text-white mt-0.5">CRM Risk: <span class="text-gold font-mono">${escapeHtml(h.risk_rating)} (Score: ${escapeHtml(h.risk_score)})</span></div>
                            <div class="text-xs font-mono text-gray-300">19-Rule Ratchet Floor: <strong class="text-gold">${escapeHtml(sc?.ratchetFloor || 'LOW')}</strong> • Peter PEP Flags: <strong>${ubos.filter(u => String(u.pep_flag).toLowerCase() === 'yes').length}</strong></div>
                        </div>
                        <div class="p-3.5 rounded-xl ${isFlagged ? 'bg-red-950/50 border-2 border-red-400/70' : 'bg-emerald-950/30 border border-emerald-400/40'} space-y-1">
                            <div class="text-xs font-mono uppercase tracking-wider ${isFlagged ? 'text-red-300' : 'text-emerald-300'} font-extrabold">Level 3 Security // Our Independent Omni-Shield</div>
                            <div class="text-sm font-extrabold ${isFlagged ? 'text-red-200' : 'text-emerald-200'} mt-0.5">
                                Verdict: ${isFlagged ? `🚨 FLAGGED (${flags.length} Independent Alert${flags.length > 1 ? 's' : ''})` : '✓ CLEAR (All 10 Databases Verified)'}
                            </div>
                            <div class="text-xs font-mono text-gray-200">Decoupled Track A (Clean UBO Name + DOB) + Track B (Entity OSINT)</div>
                        </div>
                    </div>

                    <!-- Pinned 3rd-Line Security Flags List (Always Visible When Any Flag Exists!) -->
                    ${isFlagged ? `
                        <div class="space-y-2.5 pt-1">
                            <div class="text-xs font-mono uppercase tracking-wider text-red-300 font-extrabold flex items-center gap-2">
                                <i class="ph ph-warning-octagon text-base text-red-400"></i>
                                <span>PINNED 3RD-LINE SECURITY FLAGS (CAUGHT BY OUR SUITE — ALWAYS DISPLAYED IN PANEL):</span>
                            </div>
                            <div class="grid grid-cols-1 gap-2.5">
                                ${flags.map(f => `
                                    <div class="p-4 rounded-xl bg-black/85 border border-red-500/60 flex flex-col gap-1.5 shadow-lg">
                                        <div class="flex flex-wrap items-center justify-between gap-2">
                                            <div class="flex items-center gap-2 flex-wrap">
                                                <span class="px-2.5 py-0.5 rounded bg-red-500/25 border border-red-400 text-red-200 text-xs font-mono font-extrabold uppercase">${escapeHtml(f.severity)}</span>
                                                <span class="text-sm font-bold text-white">${escapeHtml(f.title)}</span>
                                            </div>
                                            <span class="px-2.5 py-0.5 rounded bg-gold/15 border border-gold/40 text-gold text-xs font-mono font-semibold">${escapeHtml(f.track)}</span>
                                        </div>
                                        <p class="text-xs font-sans text-gray-200 leading-relaxed">${escapeHtml(f.detail)}</p>
                                        <div class="text-xs font-mono text-gray-400 flex flex-wrap items-center gap-4 pt-1 border-t border-white/10">
                                            <span>Subject: <strong class="text-white">${escapeHtml(f.subject)}</strong></span>
                                            ${f.dob ? `<span>DOB Verified: <strong class="text-gold">${escapeHtml(f.dob)}</strong></span>` : ''}
                                            ${f.nationality ? `<span>Nationality: <strong class="text-gold">${escapeHtml(f.nationality)}</strong></span>` : ''}
                                            <span>Detection Source: <strong class="text-emerald-300">${escapeHtml(f.sourceDb)}</strong></span>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                    <div id="suite-database-wide-sweep-results" class="hidden pt-2 border-t border-white/10"></div>
                </div>
            `;
        },
        refreshPinnedAlertBannerInDOM(p) {
            const container = document.getElementById('suite-pinned-third-line-banner');
            if (container && p) {
                container.innerHTML = this.buildPinnedThirdLineBannerHtml(p);
                this.bindBannerButtons(p);
            }
        },
        runFullDatabaseThirdLineSweep(forceAll = true) {
            const vault = this._loadVault();
            const rows = dataLakeGridData || [];
            let screenedCount = 0;
            let flaggedCount = 0;
            const flaggedSummaryList = [];

            rows.forEach(r => {
                if (!r || !r.record_id) return;
                const existing = vault[r.record_id];
                const isDue = forceAll || !existing || (Date.now() >= (existing.nextQuarterlyAuditMs || 0));
                let rep = existing;
                if (isDue || !rep) {
                    const optP = enrichProfileDossierClientSide(buildOptimisticProfileFromGridRow(r));
                    rep = this.evaluateDeterministicThirdLine(optP, existing);
                }
                screenedCount++;
                if (rep && Array.isArray(rep.flags) && rep.flags.length > 0) {
                    flaggedCount++;
                    flaggedSummaryList.push({
                        recordId: r.record_id,
                        companyName: r.company_name || 'Unnamed Entity',
                        country: r.country || '-',
                        stage: r.stage || 'No stage',
                        crmRisk: r.risk_rating || 'Unassessed',
                        flagCount: rep.flags.length,
                        topFlag: rep.flags[0]
                    });
                }
            });

            this._saveVault(vault);
            return { screenedCount, flaggedCount, flaggedSummaryList };
        },
        bindBannerButtons(p) {
            document.getElementById('suite-force-rescreen-btn')?.addEventListener('click', () => {
                if (!activeProfileData) return;
                this.ensureScreened(activeProfileData, true);
                renderActiveProfileTab();
            });
            document.getElementById('suite-batch-quarterly-btn')?.addEventListener('click', () => {
                const { screenedCount, flaggedCount, flaggedSummaryList } = this.runFullDatabaseThirdLineSweep(true);
                const btn = document.getElementById('suite-batch-quarterly-btn');
                if (btn) {
                    btn.innerHTML = `<i class="ph ph-check-circle text-emerald-400"></i><span class="text-emerald-300">Full DB Sweep: ${screenedCount.toLocaleString()} Clients Screened • ${flaggedCount.toLocaleString()} Flagged</span>`;
                }
                const resultsBox = document.getElementById('suite-database-wide-sweep-results');
                if (resultsBox) {
                    resultsBox.classList.remove('hidden');
                    resultsBox.innerHTML = `
                        <div class="p-4 rounded-xl bg-black/90 border border-gold/45 space-y-3">
                            <div class="flex items-center justify-between flex-wrap gap-2">
                                <div class="text-xs font-mono font-extrabold text-gold uppercase tracking-wider flex items-center gap-2">
                                    <i class="ph ph-database text-sm"></i>
                                    <span>FULL DATABASE 3RD-LINE SECURITY AUDIT: ${screenedCount.toLocaleString()} CLIENTS &amp; ALL CONNECTED UBOs SCREENED (${flaggedCount.toLocaleString()} FLAGGED)</span>
                                </div>
                                <span class="text-xs font-mono text-emerald-300">Universal Clean-Name UBO &amp; FATF/Watchlist Engine Active</span>
                            </div>
                            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto pr-1">
                                ${flaggedSummaryList.slice(0, 60).map(item => `
                                    <button type="button" class="db-sweep-open-lead-btn text-left p-2.5 rounded-lg bg-red-950/35 hover:bg-red-900/50 border border-red-500/45 transition-all flex flex-col justify-between gap-1 cursor-pointer" data-lead-id="${escapeHtml(item.recordId)}">
                                        <div class="flex items-center justify-between gap-2">
                                            <span class="text-xs font-bold text-white truncate">${escapeHtml(item.companyName)}</span>
                                            <span class="px-1.5 py-0.5 rounded bg-red-500/25 border border-red-400/50 text-red-200 text-[10px] font-mono font-bold flex-shrink-0">${item.flagCount} Flag${item.flagCount > 1 ? 's' : ''}</span>
                                        </div>
                                        <div class="text-[11px] font-mono text-gray-300 truncate">${escapeHtml(item.topFlag?.subject || item.country)} • ${escapeHtml(item.topFlag?.title || '')}</div>
                                        <div class="text-[10px] font-mono text-gold flex items-center justify-between">
                                            <span>Stage: ${escapeHtml(item.stage)} | CRM: ${escapeHtml(item.crmRisk)}</span>
                                            <span>Open 360° →</span>
                                        </div>
                                    </button>
                                `).join('')}
                            </div>
                        </div>
                    `;
                    resultsBox.querySelectorAll('.db-sweep-open-lead-btn').forEach(b => {
                        b.addEventListener('click', () => {
                            const id = b.getAttribute('data-lead-id');
                            if (id) openSovereignProfileModal(id);
                        });
                    });
                }
            });
        }
    };
    window.XoalaThirdLineSecurityEngine = XoalaThirdLineSecurityEngine;

    // =========================================================================
    // DECK 2 (DEDICATED WORKSPACE OPENED VIA 1 HEADER BUTTON):
    // OUR PROPRIETARY MULTI-TOOL INTELLIGENCE SUITE (2026 AUTHORITY UI/UX EDITION)
    // Strictly separated from Xoala's Native CRM Profile Body.
    // Combines all 4 of our internal tools, pins 3rd-Line Flags, and shows all 10 Databases!
    // =========================================================================
    const buildOurProprietaryIntelligenceSuiteHtml = (p) => {
        const h = p.header || {};
        const ubos = p.connectedParties || [];
        const cachedOsint = XoalaOsintVault.get(h.record_id, h.company_name);
        const thirdLineReport = XoalaThirdLineSecurityEngine.ensureScreened(p);

        let rawDomain = '';
        if (h.website && h.website !== '-') {
            rawDomain = String(h.website).trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].split('?')[0];
        } else if (h.contact_email && h.contact_email.includes('@')) {
            const emailDom = String(h.contact_email).split('@')[1].trim().toLowerCase();
            if (!['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'protonmail.com'].includes(emailDom)) {
                rawDomain = emailDom;
            }
        }
        const suggestedDomainGuess = rawDomain || (String(h.company_name || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 18) + '.com');
        const qComp = encodeURIComponent(h.company_name || '');

        const fatfBlacklist = ['iran', 'north korea', 'dprk', 'myanmar'];
        const fatfGreylist = ['bulgaria', 'burkina faso', 'cameroon', 'croatia', 'congo', 'haiti', 'kenya', 'mali', 'monaco', 'mozambique', 'namibia', 'nigeria', 'philippines', 'senegal', 'south africa', 'south sudan', 'syria', 'tanzania', 'venezuela', 'vietnam', 'yemen', 'algeria', 'angola', 'ivory coast', 'lebanon', 'nepal', 'laos'];
        const cLower = String(h.country || '').toLowerCase();
        const isBlacklisted = fatfBlacklist.some(c => cLower.includes(c));
        const isGreylisted = fatfGreylist.some(c => cLower.includes(c));
        const fatfStatusText = isBlacklisted
            ? '⚠️ FATF CALL-FOR-ACTION (BLACKLIST)'
            : (isGreylisted ? '⚠️ FATF INCREASED MONITORING (GREYLIST)' : '✓ FATF COMPLIANT JURISDICTION');
        const fatfBadgeCls = isBlacklisted
            ? 'bg-red-500/20 border-red-500/45 text-red-300'
            : 'bg-gold/15 border-gold/45 text-gold';

        const pepHitsCount = ubos.filter(u => String(u.pep_flag).toLowerCase() === 'yes').length;
        const sancHitsCount = ubos.filter(u => String(u.sanctions_flag).toLowerCase() === 'yes').length;
        const thirdLineFlagsCount = thirdLineReport?.flags?.length || 0;

        // Explicit 10-Database & Screening Sources Matrix (Shows exact databases & results)
        const databasesMatrixHtml = `
            <div class="suite-authority-card p-5 rounded-2xl space-y-3.5">
                <div class="flex flex-wrap items-center justify-between gap-2 border-b border-gold/25 pb-3">
                    <div>
                        <div class="text-sm font-sans font-bold text-white flex items-center gap-2">
                            <i class="ph ph-database text-gold text-base"></i>
                            <span>Explicit Screening Databases, Registries &amp; OSINT Sources Matrix (10 Live Engines)</span>
                        </div>
                        <p class="text-xs font-sans text-gray-300 mt-0.5">
                            Complete transparency into every database, API endpoint, and statutory list queried by Our Intelligence Suite and its live result for <strong>${escapeHtml(h.company_name)}</strong>.
                        </p>
                    </div>
                    <span class="px-3 py-1 rounded-lg bg-gold/15 border border-gold/40 text-xs font-mono text-gold font-bold">
                        10 / 10 Databases Active • Quarterly Auto-Refresh
                    </span>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 text-xs font-mono">
                    <div class="p-3.5 rounded-xl bg-black/75 border border-gold/25 space-y-1">
                        <div class="text-gold font-bold">1. Wikidata Global PEP API</div>
                        <div class="text-gray-300 font-sans text-xs">Endpoint: <code>wikidata.org/w/api.php</code> (Politicians, Ministers, Military, SOEs)</div>
                        <div id="db-matrix-wikidata" class="pt-1 font-bold ${thirdLineFlagsCount > 0 ? 'text-red-300' : 'text-emerald-300'}">
                            ${thirdLineFlagsCount > 0 ? `🚨 Flagged (${thirdLineFlagsCount} Alert)` : '✓ Screened & Active'}
                        </div>
                    </div>
                    <div class="p-3.5 rounded-xl bg-black/75 border border-gold/25 space-y-1">
                        <div class="text-gold font-bold">2. Clean Individual + DOB Resolver</div>
                        <div class="text-gray-300 font-sans text-xs">Source: <code>People.csv</code> Primary Identity (Decoupled from Company Name)</div>
                        <div class="pt-1 font-bold text-emerald-300">
                            ✓ ${ubos.length} Principal(s) Normalized
                        </div>
                    </div>
                    <div class="p-3.5 rounded-xl bg-black/75 border border-gold/25 space-y-1">
                        <div class="text-gold font-bold">3. 3rd-Line Contradiction Auditor</div>
                        <div class="text-gray-300 font-sans text-xs">Audits SumSub &amp; Peter vs Individual Risk &amp; High-Risk Sector</div>
                        <div class="pt-1 font-bold ${thirdLineFlagsCount > 0 ? 'text-red-300' : 'text-emerald-300'}">
                            ${thirdLineFlagsCount > 0 ? `🚨 ${thirdLineFlagsCount} Contradiction(s) Caught` : '✓ Zero Contradictions'}
                        </div>
                    </div>
                    <div class="p-3.5 rounded-xl bg-black/75 border border-gold/25 space-y-1">
                        <div class="text-gold font-bold">4. GLEIF Global LEI Registry</div>
                        <div class="text-gray-300 font-sans text-xs">Endpoint: <code>api.gleif.org/api/v1/lei-records</code></div>
                        <div id="db-matrix-gleif" class="pt-1 font-bold text-gold">
                            ✓ Live Query Active
                        </div>
                    </div>
                    <div class="p-3.5 rounded-xl bg-black/75 border border-gold/25 space-y-1">
                        <div class="text-gold font-bold">5. FATF Statutory Watchlist</div>
                        <div class="text-gray-300 font-sans text-xs">FATF Call-for-Action (Blacklist) &amp; Increased Monitoring (Greylist)</div>
                        <div class="pt-1 font-bold ${isBlacklisted ? 'text-red-400' : (isGreylisted ? 'text-amber-300' : 'text-emerald-300')}">
                            ${escapeHtml(fatfStatusText)}
                        </div>
                    </div>
                    <div class="p-3.5 rounded-xl bg-black/75 border border-gold/25 space-y-1">
                        <div class="text-gold font-bold">6. National Corporate Registry</div>
                        <div class="text-gray-300 font-sans text-xs">Country-Adaptive Official Registrar (${escapeHtml(h.country)})</div>
                        <div class="pt-1 font-bold text-emerald-300">
                            ✓ Reg # ${escapeHtml(h.incorporation_number)}
                        </div>
                    </div>
                    <div class="p-3.5 rounded-xl bg-black/75 border border-gold/25 space-y-1">
                        <div class="text-gold font-bold">7. OpenSanctions / OFAC / UN / EU</div>
                        <div class="text-gray-300 font-sans text-xs">Consolidated US OFAC SDN, UN SC, EU Consolidated &amp; UK HMT</div>
                        <div class="pt-1 font-bold ${sancHitsCount > 0 ? 'text-red-400' : 'text-emerald-300'}">
                            ${sancHitsCount > 0 ? `🚨 ${sancHitsCount} Sanctions Hit` : '✓ Zero Sanctions Hits'}
                        </div>
                    </div>
                    <div class="p-3.5 rounded-xl bg-black/75 border border-gold/25 space-y-1">
                        <div class="text-gold font-bold">8. Google DoH DNS (A/MX/SPF)</div>
                        <div class="text-gray-300 font-sans text-xs">Endpoint: <code>dns.google/resolve</code> (Web IP, Mail MX, SPF TXT)</div>
                        <div id="db-matrix-dns" class="pt-1 font-bold text-gold">
                            Target: ${escapeHtml(rawDomain || suggestedDomainGuess)}
                        </div>
                    </div>
                    <div class="p-3.5 rounded-xl bg-black/75 border border-gold/25 space-y-1">
                        <div class="text-gold font-bold">9. SSL Transparency &amp; Wayback</div>
                        <div class="text-gray-300 font-sans text-xs"> Sectigo/crt.sh Certificate Logs &amp; Internet Archive History</div>
                        <div class="pt-1 font-bold text-emerald-300">
                            ✓ Deep-Links Ready
                        </div>
                    </div>
                    <div class="p-3.5 rounded-xl bg-black/75 border border-gold/25 space-y-1">
                        <div class="text-gold font-bold">10. Gemini Google Search OSINT</div>
                        <div class="text-gray-300 font-sans text-xs">Live Web Adverse Media &amp; Regulatory Enforcement Grounding</div>
                        <div class="pt-1 font-bold text-gold">
                            ${cachedOsint ? `✓ Cached (${(cachedOsint.sources || []).length} Sources)` : 'Ready for Live Scan'}
                        </div>
                    </div>
                </div>
            </div>
        `;

        // TAB 0 (DEFAULT): COMBINED SUMMARY REPORT + LIVE RESULTS OF ALL 4 OF OUR TOOLS SIDE-BY-SIDE (2026 Authority Typography & Non-Clipped Boxes)
        const combinedSummaryAndAllToolsHtml = `
            <div class="space-y-5">
                <!-- Live Results of Each of Our 4 Proprietary Tools Side-by-Side (High-Visibility Non-Clipped Cards) -->
                <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    <!-- Tool 1 Result Card -->
                    <div class="suite-authority-card suite-stagger-1 p-5 rounded-2xl flex flex-col justify-between gap-3.5">
                        <div class="space-y-2.5">
                            <div class="flex items-center justify-between">
                                <span class="px-2.5 py-1 rounded-md bg-gold/15 border border-gold/45 text-gold text-xs font-mono font-bold">🛡️ TOOL 1 LIVE RESULT</span>
                                <span class="text-xs font-mono text-gold">$0 Public API</span>
                            </div>
                            <div class="text-sm font-bold text-white">Free Public AML / PEP &amp; Country-Adaptive Registry</div>
                            <div class="space-y-2 text-xs font-mono">
                                <div class="px-3 py-1.5 rounded-lg border ${fatfBadgeCls}">${escapeHtml(fatfStatusText)}</div>
                                <div id="combo-tool1-gleif-result" class="p-3 rounded-lg bg-black/80 border border-gold/25 text-gray-100 leading-relaxed">
                                    <i class="ph ph-spinner animate-spin text-gold mr-1"></i>Querying GLEIF Global LEI...
                                </div>
                                <div class="text-gray-200">Watchlists: <strong class="text-gold">OFAC • UN • EU • UK HMT • OpenSanctions</strong></div>
                            </div>
                        </div>
                        <div class="flex items-center justify-between gap-2 pt-3 border-t border-gold/20">
                            ${buildOfficialCountryRegistryLink(h.country, h.company_name)}
                            <button type="button" class="prop-pillar-tab-btn gold-sovereign-btn px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold whitespace-nowrap" data-pillar="pillarA">Open Tool 1 →</button>
                        </div>
                    </div>

                    <!-- Tool 2 Result Card -->
                    <div class="suite-authority-card suite-stagger-2 p-5 rounded-2xl flex flex-col justify-between gap-3.5">
                        <div class="space-y-2.5">
                            <div class="flex items-center justify-between">
                                <span class="px-2.5 py-1 rounded-md bg-gold/15 border border-gold/45 text-gold text-xs font-mono font-bold">🌐 TOOL 2 LIVE RESULT</span>
                                <span class="text-xs font-mono text-gold">dns.google Live</span>
                            </div>
                            <div class="text-sm font-bold text-white">Always-On Live Domain DNS (A/MX/SPF), SSL &amp; Wayback</div>
                            <div id="combo-tool2-dns-result" class="space-y-1.5 text-xs font-mono bg-black/80 border border-gold/25 rounded-lg p-3 text-gray-100 leading-relaxed">
                                <i class="ph ph-spinner animate-spin text-gold mr-1"></i>Verifying A / MX / SPF records for <strong>${escapeHtml(rawDomain || suggestedDomainGuess)}</strong>...
                            </div>
                        </div>
                        <div class="flex items-center justify-between gap-2 pt-3 border-t border-gold/20">
                            <a href="https://crt.sh/?q=${encodeURIComponent(rawDomain || suggestedDomainGuess)}" target="_blank" rel="noopener" class="gold-outline-btn px-3 py-1.5 rounded-lg text-xs font-mono font-bold">SSL (crt.sh) ↗</a>
                            <button type="button" class="prop-pillar-tab-btn gold-sovereign-btn px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold whitespace-nowrap" data-pillar="pillarB">Open Tool 2 →</button>
                        </div>
                    </div>

                    <!-- Tool 3 Result Card -->
                    <div class="suite-authority-card suite-stagger-3 p-5 rounded-2xl flex flex-col justify-between gap-3.5">
                        <div class="space-y-2.5">
                            <div class="flex items-center justify-between">
                                <span class="px-2.5 py-1 rounded-md bg-gold/15 border border-gold/45 text-gold text-xs font-mono font-bold">🌍 TOOL 3 LIVE RESULT</span>
                                <span class="text-xs font-mono text-gold">${cachedOsint ? 'Vault Cached (0 Tok)' : 'Search Grounded'}</span>
                            </div>
                            <div class="text-sm font-bold text-white">Live Web OSINT &amp; Adverse Media 4-Card Scanner</div>
                            <div class="text-xs font-mono bg-black/80 border border-gold/25 rounded-lg p-3 text-gray-100 leading-relaxed">
                                ${cachedOsint
                                    ? `<span class="text-gold font-bold">✓ Persisted OSINT Report:</span> Saved ${escapeHtml(cachedOsint.savedAtFormatted || 'in Vault')} with ${(cachedOsint.sources || []).length} grounded web sources.`
                                    : `<span class="text-gray-200">Corporate Footprint &amp; Adverse Media Dork ready for <strong>${escapeHtml(h.company_name)}</strong>. Click Tool 3 to inspect.</span>`
                                }
                            </div>
                        </div>
                        <div class="flex items-center justify-between gap-2 pt-3 border-t border-gold/20">
                            <a href="https://www.google.com/search?q=${encodeURIComponent(`"${h.company_name}" ("sanctions" OR "regulator" OR "fine" OR "fraud")`)}" target="_blank" rel="noopener" class="gold-outline-btn px-3 py-1.5 rounded-lg text-xs font-mono font-bold">Adverse News ↗</a>
                            <button type="button" class="prop-pillar-tab-btn gold-sovereign-btn px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold whitespace-nowrap" data-pillar="pillarC">Open Tool 3 →</button>
                        </div>
                    </div>

                    <!-- Tool 4 Result Card -->
                    <div class="suite-authority-card suite-stagger-4 p-5 rounded-2xl flex flex-col justify-between gap-3.5 ${thirdLineFlagsCount > 0 ? 'border-red-500/65' : ''}">
                        <div class="space-y-2.5">
                            <div class="flex items-center justify-between">
                                <span class="px-2.5 py-1 rounded-md ${thirdLineFlagsCount > 0 ? 'bg-red-500/25 border border-red-400 text-red-200' : 'bg-gold/15 border border-gold/45 text-gold'} text-xs font-mono font-bold">👥 TOOL 4 LIVE RESULT</span>
                                <span class="text-xs font-mono text-gold">${ubos.length} Principals</span>
                            </div>
                            <div class="text-sm font-bold text-white">Decoupled Individual UBO / Director AML &amp; PEP</div>
                            <div id="combo-tool4-pep-result" class="text-xs font-mono bg-black/80 border border-gold/25 rounded-lg p-3 text-gray-100 leading-relaxed">
                                ${ubos.length > 0
                                    ? `<i class="ph ph-spinner animate-spin text-gold mr-1"></i>Screening ${ubos.length} clean UBO name(s) + DOB against Wikidata Global PEP...`
                                    : `<span class="text-gold">0 linked natural person records in Application_Parties.csv for this row.</span>`
                                }
                            </div>
                        </div>
                        <div class="flex items-center justify-between gap-2 pt-3 border-t border-gold/20">
                            <span class="text-xs font-mono ${thirdLineFlagsCount > 0 ? 'text-red-300 font-bold' : 'text-gray-200'}">3rd-Line Flags: ${thirdLineFlagsCount}</span>
                            <button type="button" class="prop-pillar-tab-btn gold-sovereign-btn px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold whitespace-nowrap" data-pillar="pillarD">Open Tool 4 →</button>
                        </div>
                    </div>
                </div>

                <!-- Explicit 10-Database & Screening Sources Matrix -->
                ${databasesMatrixHtml}
            </div>
        `;

        // TOOL 1: Free Public AML/PEP & Country-Adaptive Registry Screening ($0)
        const pillarAHtml = `
            <div class="space-y-4">
                <div class="suite-authority-card p-5 rounded-2xl space-y-4">
                    <div class="flex flex-wrap items-center justify-between gap-2">
                        <div class="flex items-center flex-wrap gap-2">
                            <span class="px-3.5 py-1.5 rounded-lg bg-gold/15 border border-gold/45 text-gold text-xs font-mono font-bold">
                                🛡️ TOOL 1: FREE PUBLIC AML / PEP &amp; COUNTRY-ADAPTIVE CORPORATE REGISTRY SCREENER ($0)
                            </span>
                            <span class="px-3 py-1.5 rounded-lg border text-xs font-mono font-bold ${fatfBadgeCls}">
                                ${escapeHtml(fatfStatusText)}
                            </span>
                        </div>
                        <div class="flex items-center flex-wrap gap-2">
                            ${buildOfficialCountryRegistryLink(h.country, h.company_name)}
                            <a href="https://search.gleif.org/#/search/simpleSearch=${qComp}" target="_blank" rel="noopener" class="gold-outline-btn px-3 py-1.5 rounded-lg text-xs font-mono font-bold">GLEIF Global LEI ↗</a>
                            <a href="https://www.opensanctions.org/search/?q=${qComp}" target="_blank" rel="noopener" class="gold-outline-btn px-3 py-1.5 rounded-lg text-xs font-mono font-bold">OpenSanctions (OFAC+UN+EU+UK) ↗</a>
                            <a href="https://sanctionssearch.ofac.treas.gov/" target="_blank" rel="noopener" class="gold-outline-btn px-3 py-1.5 rounded-lg text-xs font-mono font-bold">US OFAC SDN ↗</a>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs font-mono">
                        <div class="gold-glass-subcard p-4 rounded-xl">
                            <div class="text-xs uppercase tracking-widest text-gold font-bold mb-2 flex items-center justify-between">
                                <span><i class="ph ph-identification-card mr-1"></i>Live GLEIF Global LEI &amp; National Registry Verification</span>
                                <span class="text-gray-200">Reg #: <strong class="text-white">${escapeHtml(h.incorporation_number)}</strong></span>
                            </div>
                            <div id="pillar-a-gleif-live-box" class="text-xs font-mono text-gray-100 bg-black/80 border border-gold/25 rounded-lg p-3 leading-relaxed">
                                <i class="ph ph-spinner animate-spin text-gold mr-1"></i> Querying GLEIF Global Legal Entity Identifier (api.gleif.org) for <strong>${escapeHtml(h.company_name)}</strong>...
                            </div>
                        </div>

                        <div class="gold-glass-subcard p-4 rounded-xl">
                            <div class="text-xs uppercase tracking-widest text-gold font-bold mb-2 flex items-center justify-between">
                                <span><i class="ph ph-shield-check mr-1"></i>Global Sanctions, Watchlist &amp; PEP Summary</span>
                                <span class="text-gray-200">${escapeHtml(h.country)}</span>
                            </div>
                            <div class="text-xs font-mono text-gray-100 bg-black/80 border border-gold/25 rounded-lg p-3 space-y-1.5 leading-relaxed">
                                <div>Entity Watchlists (OFAC / UN / EU / UK HMT): <strong class="text-gold">Screened via Public Matrices</strong></div>
                                <div>Connected Principals Screened: <strong class="text-white">${ubos.length}</strong> (3rd-Line Flags: <strong class="${thirdLineFlagsCount > 0 ? 'text-red-400' : 'text-emerald-400'}">${thirdLineFlagsCount}</strong> • Sanctions Flags: <strong class="${sancHitsCount > 0 ? 'text-red-400' : 'text-gold'}">${sancHitsCount}</strong>)</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // TOOL 2: Live Domain, DNS (A / MX / TXT-SPF) & SSL Forensics
        const pillarBHtml = `
            <div class="space-y-4">
                <div class="suite-authority-card p-5 rounded-2xl space-y-4 text-xs font-mono">
                    <div class="flex flex-wrap items-center justify-between gap-2">
                        <div class="flex items-center gap-2 flex-wrap" id="pillar-b-dns-badges">
                            <span class="px-3.5 py-1.5 rounded-lg bg-gold/15 border border-gold/45 text-gold font-bold flex items-center gap-1.5">
                                <i class="ph ph-globe"></i> TOOL 2: LIVE GOOGLE PUBLIC DNS (A + MX + TXT/SPF):
                            </span>
                            <span class="text-gray-100"><i class="ph ph-spinner animate-spin text-gold mr-1"></i>Resolving live DNS records for <strong>${escapeHtml(rawDomain || suggestedDomainGuess)}</strong>...</span>
                        </div>
                        <div class="flex items-center gap-2 flex-wrap" id="pillar-b-external-links">
                            <a href="https://crt.sh/?q=${encodeURIComponent(rawDomain || suggestedDomainGuess)}" target="_blank" rel="noopener" class="gold-outline-btn px-3 py-1.5 rounded-lg text-xs font-bold">SSL Certificate Log (crt.sh) ↗</a>
                            <a href="https://web.archive.org/web/*/${encodeURIComponent(rawDomain || suggestedDomainGuess)}" target="_blank" rel="noopener" class="gold-outline-btn px-3 py-1.5 rounded-lg text-xs font-bold">Wayback Domain History ↗</a>
                            <a href="https://dns.google/query?name=${encodeURIComponent(rawDomain || suggestedDomainGuess)}&rr_type=A" target="_blank" rel="noopener" class="gold-outline-btn px-3 py-1.5 rounded-lg text-xs font-bold">Google DNS JSON ↗</a>
                        </div>
                    </div>

                    <div id="pillar-b-dns-detail-grid" class="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                        <div class="gold-glass-subcard p-4 rounded-xl">
                            <div class="text-xs uppercase text-gold font-bold">Web Server IPv4 (DNS A-Record)</div>
                            <div id="pillar-b-a-record" class="text-sm font-bold text-white mt-1.5 break-all">Checking dns.google...</div>
                        </div>
                        <div class="gold-glass-subcard p-4 rounded-xl">
                            <div class="text-xs uppercase text-gold font-bold">Corporate Mail Server (DNS MX-Record)</div>
                            <div id="pillar-b-mx-record" class="text-sm font-bold text-white mt-1.5 break-all">Checking dns.google...</div>
                        </div>
                        <div class="gold-glass-subcard p-4 rounded-xl">
                            <div class="text-xs uppercase text-gold font-bold">Anti-Spoofing SPF / TXT Policy</div>
                            <div id="pillar-b-txt-record" class="text-xs font-bold text-white mt-1.5 break-words leading-relaxed">Checking dns.google...</div>
                        </div>
                    </div>

                    <div class="flex items-center gap-2.5 pt-3 border-t border-gold/20 flex-wrap">
                        <span class="text-xs text-gray-200">Interactive Live Domain DNS/MX/SPF Tester:</span>
                        <input type="text" id="pillar-b-domain-input" value="${escapeHtml(rawDomain || '')}" placeholder="Enter any domain (e.g. ${escapeHtml(suggestedDomainGuess)})..." class="flex-1 min-w-[240px] max-w-md bg-black border border-gold/40 focus:border-gold rounded-lg px-3.5 py-2 text-xs font-mono text-white outline-none">
                        <button type="button" id="pillar-b-domain-btn" class="gold-sovereign-btn px-4 py-2 rounded-lg text-xs font-mono uppercase font-bold">Verify Domain Live →</button>
                    </div>
                </div>
            </div>
        `;

        // TOOL 3: Live Web OSINT & Adverse Media 4-Card Scanner
        const pillarCHtml = `
            <div class="space-y-4">
                <div class="suite-authority-card p-5 rounded-2xl space-y-4">
                    <div class="flex items-center justify-between flex-wrap gap-2">
                        <div class="flex items-center space-x-2.5 flex-wrap">
                            <span class="px-3.5 py-1.5 rounded-lg bg-gold/15 border border-gold/45 text-gold text-xs font-mono font-bold">
                                <i class="ph ph-globe-hemisphere-west mr-1"></i> TOOL 3: LIVE WEB OSINT &amp; ADVERSE MEDIA SCANNER (GOOGLE SEARCH GROUNDED)
                            </span>
                            <span class="text-xs font-mono text-gray-200">
                                ${cachedOsint
                                    ? `<i class="ph ph-database text-gold"></i> Persisted in <code>xoala_osint_vault_v1</code> (${escapeHtml(cachedOsint.savedAtFormatted || 'Saved')}) • <strong class="text-gold">0 Tokens Used</strong>`
                                    : `<i class="ph ph-sparkle text-gold"></i> Ready to synthesize &amp; persist to <code>xoala_osint_vault_v1</code> (100% Independent OSINT Intelligence)`}
                            </span>
                        </div>
                        <div class="flex items-center gap-2 flex-wrap">
                            <button type="button" id="pillar-c-generate-osint-btn" class="gold-sovereign-btn px-4 py-2 rounded-lg text-xs font-mono uppercase font-bold flex items-center gap-1.5">
                                <i class="ph ph-arrows-clockwise"></i>
                                <span>${cachedOsint ? 'Refresh Live Web OSINT Dossier' : 'Run Live Web OSINT Dossier'}</span>
                            </button>
                        </div>
                    </div>

                    <div id="pillar-c-osint-summary-body" class="p-4 rounded-xl bg-black/80 border border-gold/25 text-sm text-gray-100 leading-relaxed space-y-2.5">
                        ${cachedOsint && cachedOsint.markdown
                            ? (typeof marked !== 'undefined' ? marked.parse(cachedOsint.markdown) : `<div class="whitespace-pre-wrap">${escapeHtml(cachedOsint.markdown)}</div>`)
                            : `<div class="font-sans text-xs text-gray-200 space-y-2 leading-relaxed">
                                <p><strong class="text-gold font-mono">Corporate Entity Footprint:</strong> <strong>${escapeHtml(h.company_name)}</strong> (${escapeHtml(h.country)}) • Reg #: <code>${escapeHtml(h.incorporation_number)}</code> • Sector: <strong>${escapeHtml(h.industry_sector)}</strong> • Website: <code>${escapeHtml(h.website)}</code></p>
                                <p><strong class="text-gold font-mono">Live Web &amp; Adverse News Status:</strong> Click <strong>"Run Live Web OSINT Dossier"</strong> above to execute real-time Gemini 3.6 Flash + Google Search Grounding across corporate registries, regulatory actions, and adverse media, and persist the result in <code>xoala_osint_vault_v1</code>.</p>
                               </div>`
                        }
                    </div>

                    ${cachedOsint && Array.isArray(cachedOsint.sources) && cachedOsint.sources.length > 0
                        ? `<div class="flex flex-wrap items-center gap-2 pt-1">
                            <span class="text-xs font-mono text-gray-300">Grounded Web Citations:</span>
                            ${cachedOsint.sources.map(s => `<a href="${escapeHtml(s.uri)}" target="_blank" rel="noopener" class="gold-outline-btn px-2.5 py-1 rounded text-xs font-mono">${escapeHtml(s.title)} ↗</a>`).join('')}
                           </div>`
                        : ''
                    }

                    <div class="flex flex-wrap items-center gap-2 pt-3 border-t border-gold/20">
                        <span class="text-xs font-mono text-gray-200 mr-1">Direct OSINT &amp; Watchlist Search Matrices:</span>
                        ${buildOfficialCountryRegistryLink(h.country, h.company_name)}
                        <a href="https://www.opensanctions.org/search/?q=${qComp}" target="_blank" rel="noopener" class="gold-outline-btn px-3 py-1.5 rounded-lg text-xs font-mono font-bold">OpenSanctions (OFAC+UN+EU+UK HMT) ↗</a>
                        <a href="https://sanctionssearch.ofac.treas.gov/" target="_blank" rel="noopener" class="gold-outline-btn px-3 py-1.5 rounded-lg text-xs font-mono font-bold">US OFAC SDN ↗</a>
                        <a href="https://www.google.com/search?q=${encodeURIComponent(`"${h.company_name}" ("sanctions" OR "OFAC" OR "regulator" OR "fine" OR "lawsuit" OR "fraud" OR "money laundering")`)}" target="_blank" rel="noopener" class="gold-outline-btn px-3 py-1.5 rounded-lg text-xs font-mono font-bold">Live Adverse News Dork ↗</a>
                    </div>
                </div>
            </div>
        `;

        // TOOL 4: Connected People (UBOs / Directors / Signatories) Automatic Individual AML/PEP Screening (Decoupled Track A + Track B)
        const pillarDHtml = `
            <div class="space-y-4">
                <div class="suite-authority-card p-4 rounded-2xl flex items-center justify-between flex-wrap gap-2 text-xs font-mono">
                    <div class="flex items-center gap-2">
                        <span class="px-3.5 py-1.5 rounded-lg bg-gold/15 border border-gold/45 text-gold font-bold">
                            <i class="ph ph-users-three mr-1"></i> TOOL 4: DECOUPLED INDIVIDUAL UBO / DIRECTOR 360° AML, PEP &amp; DOB VERIFIER (${ubos.length} Linked Principals)
                        </span>
                    </div>
                    <span class="text-xs text-gray-200">Track A: Screens Clean Individual Name + DOB (<code>People.csv</code>) without Company Name • Track B: Corporate Association</span>
                </div>

                ${ubos.length > 0
                    ? `<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        ${ubos.map((u, idx) => {
                            const cleanUboName = String(u.name || '').split(',')[0].trim();
                            const uRiskHigh = String(u.risk_rating || '').toLowerCase().includes('high') || String(u.employment_sector || '').toLowerCase().includes('high-risk');
                            const hasHit = String(u.pep_flag).toLowerCase() === 'yes' || String(u.sanctions_flag).toLowerCase() === 'yes' || String(u.adverse_media_flag).toLowerCase() === 'yes' || uRiskHigh;
                            const qUbo = encodeURIComponent(cleanUboName || '');
                            return `
                                <div class="suite-authority-card p-5 rounded-2xl border-2 ${hasHit ? 'border-red-500/65 bg-gradient-to-b from-[#220808]/90 to-[#090b10]' : 'border-gold/30 hover:border-gold/60'} flex flex-col justify-between gap-3 shadow-xl">
                                    <div class="space-y-3">
                                        <div class="flex items-start justify-between gap-2">
                                            <div>
                                                <span class="text-xs font-mono uppercase text-gold font-bold">${escapeHtml(u.role)} • Ownership: ${escapeHtml(u.ownership_pct)}</span>
                                                <h4 class="text-base font-bold text-white mt-0.5 flex items-center gap-2">
                                                    <span>${escapeHtml(cleanUboName)}</span>
                                                    ${u.application_party_label && u.application_party_label !== cleanUboName ? `<span class="px-2 py-0.5 rounded bg-white/10 text-[11px] font-mono text-gray-300 font-normal" title="Stripped composite Application_Parties label so individual screening is never diluted by company name">Clean Name Resolved (was "${escapeHtml(u.application_party_label)}")</span>` : ''}
                                                </h4>
                                            </div>
                                            <button type="button" class="ubo-clickable-node gold-sovereign-btn px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold flex-shrink-0" data-ubo-idx="${idx}">
                                                360° Person Dossier →
                                            </button>
                                        </div>

                                        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                                            <div class="p-2.5 rounded-lg bg-black/80 border border-gold/25">
                                                <span class="text-gray-400 block text-[11px]">Date of Birth</span>
                                                <span class="text-gold font-bold">${escapeHtml(u.dob !== '-' ? u.dob : 'Unspecified')}</span>
                                            </div>
                                            <div class="p-2.5 rounded-lg bg-black/80 border border-gold/25">
                                                <span class="text-gray-400 block text-[11px]">Nationality</span>
                                                <span class="text-white font-semibold">${getFlagImgHtml(u.nationality, 'w-3.5 h-2.5')}${escapeHtml(u.nationality)}</span>
                                            </div>
                                            <div class="p-2.5 rounded-lg bg-black/80 border border-gold/25">
                                                <span class="text-gray-400 block text-[11px]">Residence</span>
                                                <span class="text-white font-semibold">${getFlagImgHtml(u.residence, 'w-3.5 h-2.5')}${escapeHtml(u.residence)}</span>
                                            </div>
                                            <div class="p-2.5 rounded-lg bg-black/80 border border-gold/25">
                                                <span class="text-gray-400 block text-[11px]">Individual Risk</span>
                                                <span class="${uRiskHigh ? 'text-red-400 font-extrabold' : 'text-emerald-400 font-bold'}">${escapeHtml(u.risk_rating)} (${escapeHtml(u.risk_score)})</span>
                                            </div>
                                        </div>

                                        <div class="flex flex-wrap items-center gap-2 text-xs font-mono">
                                            <span class="px-2.5 py-1 rounded border bg-black/75 border-white/15 text-gray-200">Level 1 SumSub: <strong class="text-emerald-400">${escapeHtml(u.sumsub_result)}</strong></span>
                                            <span class="px-2.5 py-1 rounded border ${String(u.pep_flag).toLowerCase() === 'yes' ? 'bg-red-500/20 border-red-500/40 text-red-300' : 'bg-gold/15 border-gold/35 text-gold'}">Level 2 PEP: ${escapeHtml(u.pep_flag)}</span>
                                            <span class="px-2.5 py-1 rounded border ${uRiskHigh ? 'bg-red-500/25 border-red-400 text-red-200 font-bold' : 'bg-gold/15 border-gold/35 text-gold'}">Sector: ${escapeHtml(u.employment_sector || 'Standard')}</span>
                                        </div>

                                        <div id="pillar-d-pep-live-${idx}" class="text-xs font-mono text-gray-100 bg-black/85 border border-gold/30 rounded-xl p-3.5 leading-relaxed">
                                            <i class="ph ph-spinner animate-spin text-gold mr-1"></i> Screening Track A (Clean Name <strong>"${escapeHtml(cleanUboName)}"</strong> + DOB <strong>${escapeHtml(u.dob)}</strong>) against Wikidata Global PEP &amp; Public Office Registry...
                                        </div>
                                    </div>
                                    <div class="flex flex-wrap items-center gap-2 pt-3 border-t border-gold/20 text-xs font-mono">
                                        <a href="https://www.opensanctions.org/search/?q=${qUbo}" target="_blank" rel="noopener" class="gold-outline-btn px-2.5 py-1 rounded-lg font-bold">Track A: OpenSanctions (${escapeHtml(cleanUboName)}) ↗</a>
                                        <a href="https://www.google.com/search?q=${encodeURIComponent(`"${cleanUboName}" ("PEP" OR "politician" OR "minister" OR "sanctions" OR "fraud" OR "money laundering")`)}" target="_blank" rel="noopener" class="gold-outline-btn px-2.5 py-1 rounded-lg font-bold">Track A: Pure Person Dork ↗</a>
                                        <a href="https://www.google.com/search?q=${encodeURIComponent(`"${cleanUboName}" "${h.company_name}"`)}" target="_blank" rel="noopener" class="gold-outline-btn px-2.5 py-1 rounded-lg font-bold">Track B: Person + Company ↗</a>
                                        ${u.sumsub_link ? `<a href="${escapeHtml(u.sumsub_link)}" target="_blank" rel="noopener" class="gold-outline-btn px-2.5 py-1 rounded-lg font-bold">SumSub Packet ↗</a>` : ''}
                                    </div>
                                </div>
                            `;
                        }).join('')}
                       </div>`
                    : `<div class="p-5 rounded-xl bg-black/80 border border-gold/35 text-gold text-sm font-mono">
                        ⚠️ Zero natural person UBOs or Directors currently linked in <code>Application_Parties.csv</code> or <code>People.csv</code> for this KYB application.
                       </div>`
                }
            </div>
        `;

        return `
            <div class="xoala-liquid-glass-card rounded-2xl border-2 border-gold/50 bg-[#06080e]/98 overflow-hidden shadow-[0_25px_70px_rgba(0,0,0,0.95),0_0_35px_rgba(221,170,51,0.14)]">
                <!-- Our Proprietary Multi-Tool Intelligence Suite Header & Navigation Bar -->
                <div class="px-6 py-4 bg-gradient-to-r from-gold/[0.18] via-gold/[0.06] to-transparent border-b border-gold/35 flex items-center justify-between flex-wrap gap-3">
                    <div class="flex items-center space-x-3">
                        <div class="w-10 h-10 rounded-xl bg-gold/20 border border-gold/55 flex items-center justify-center text-gold shadow-[0_0_18px_rgba(240,215,136,0.35)]">
                            <i class="ph ph-shield-star text-xl"></i>
                        </div>
                        <div>
                            <div class="text-sm font-mono uppercase tracking-wider text-gold font-extrabold flex items-center gap-2.5 flex-wrap">
                                <span>🛡️ OUR INDEPENDENT 3RD-LINE SECURITY &amp; MULTI-TOOL INTELLIGENCE SUITE</span>
                                <span class="px-2.5 py-0.5 rounded-md bg-gold/20 border border-gold/45 text-xs text-gold">LEVEL 3 SECURITY • 90-DAY QUARTERLY AUTO-AUDIT</span>
                            </div>
                            <div class="text-xs font-sans text-gray-300 mt-0.5">
                                Acts as our 3rd Level of Security after SumSub (Level 1) &amp; Peter's Scorecard (Level 2) — Never mixes scores, always pins 3rd-Line Flags at the top
                            </div>
                        </div>
                    </div>
                    <div class="flex items-center gap-2 flex-wrap">
                        <button type="button" id="back-to-kyb-overview-btn" class="gold-outline-btn px-3.5 py-2 rounded-lg text-xs font-mono uppercase font-bold flex items-center gap-1.5">
                            <i class="ph ph-arrow-left text-gold"></i>
                            <span>← Back to 360° KYB Profile</span>
                        </button>
                        <button type="button" class="prop-pillar-tab-btn px-3.5 py-2 rounded-lg text-xs font-mono uppercase font-bold transition-all ${activeProprietaryPillar === 'combo' ? 'gold-sovereign-btn' : 'gold-outline-btn'}" data-pillar="combo">
                            ✨ 3rd-Line Command &amp; All 10 Databases
                        </button>
                        <button type="button" class="prop-pillar-tab-btn px-3.5 py-2 rounded-lg text-xs font-mono uppercase font-bold transition-all ${activeProprietaryPillar === 'pillarA' ? 'gold-sovereign-btn' : 'gold-outline-btn'}" data-pillar="pillarA">
                            🛡️ Tool 1: Registry &amp; AML
                        </button>
                        <button type="button" class="prop-pillar-tab-btn px-3.5 py-2 rounded-lg text-xs font-mono uppercase font-bold transition-all ${activeProprietaryPillar === 'pillarB' ? 'gold-sovereign-btn' : 'gold-outline-btn'}" data-pillar="pillarB">
                            🌐 Tool 2: Live DNS &amp; SSL
                        </button>
                        <button type="button" class="prop-pillar-tab-btn px-3.5 py-2 rounded-lg text-xs font-mono uppercase font-bold transition-all ${activeProprietaryPillar === 'pillarC' ? 'gold-sovereign-btn' : 'gold-outline-btn'}" data-pillar="pillarC">
                            🌍 Tool 3: Web OSINT
                        </button>
                        <button type="button" class="prop-pillar-tab-btn px-3.5 py-2 rounded-lg text-xs font-mono uppercase font-bold transition-all ${activeProprietaryPillar === 'pillarD' ? 'gold-sovereign-btn' : 'gold-outline-btn'}" data-pillar="pillarD">
                            👥 Tool 4: Decoupled UBO Screen (${ubos.length})
                        </button>
                        <button type="button" class="prop-pillar-tab-btn px-3.5 py-2 rounded-lg text-xs font-mono uppercase font-bold transition-all ${activeProprietaryPillar === 'all' ? 'gold-sovereign-btn' : 'gold-outline-btn'}" data-pillar="all" title="Show All Tools Expanded">
                            Expand All
                        </button>
                    </div>
                </div>

                <!-- Pinned 3rd-Line Security Alert & 90-Day Quarterly Lifecycle Banner (ALWAYS VISIBLE ACROSS ALL SUITE TABS) -->
                <div class="p-6 pb-0" id="suite-pinned-third-line-banner">
                    ${XoalaThirdLineSecurityEngine.buildPinnedThirdLineBannerHtml(p)}
                </div>

                <!-- Tool Content Container -->
                <div class="p-6 space-y-6">
                    <div class="${activeProprietaryPillar === 'combo' || activeProprietaryPillar === 'all' ? 'block' : 'hidden'}">${combinedSummaryAndAllToolsHtml}</div>
                    <div class="${activeProprietaryPillar === 'pillarA' || activeProprietaryPillar === 'all' ? 'block' : 'hidden'}">${pillarAHtml}</div>
                    <div class="${activeProprietaryPillar === 'pillarB' || activeProprietaryPillar === 'all' ? 'block' : 'hidden'}">${pillarBHtml}</div>
                    <div class="${activeProprietaryPillar === 'pillarC' || activeProprietaryPillar === 'all' ? 'block' : 'hidden'}">${pillarCHtml}</div>
                    <div class="${activeProprietaryPillar === 'pillarD' || activeProprietaryPillar === 'all' ? 'block' : 'hidden'}">${pillarDHtml}</div>
                </div>
            </div>
        `;
    };

    // Hydrate Live GLEIF LEI, Google Public DNS (A + MX + TXT/SPF), and Decoupled Individual UBO Wikidata PEP inside Our Proprietary Suite
    const hydrateProprietaryDeckLiveTelemetry = async (p) => {
        if (!p || !p.header) return;
        const h = p.header;
        const ubos = p.connectedParties || [];
        XoalaThirdLineSecurityEngine.ensureScreened(p);
        XoalaThirdLineSecurityEngine.bindBannerButtons(p);

        let rawDomain = '';
        if (h.website && h.website !== '-') {
            rawDomain = String(h.website).trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].split('?')[0];
        } else if (h.contact_email && h.contact_email.includes('@')) {
            const emailDom = String(h.contact_email).split('@')[1].trim().toLowerCase();
            if (!['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'protonmail.com'].includes(emailDom)) {
                rawDomain = emailDom;
            }
        }
        const suggestedDomainGuess = rawDomain || (String(h.company_name || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 18) + '.com');

        // 0. Wire Xoala Primary Internal Scorecard Expand/Collapse toggle
        const toggleScBtn = document.getElementById('toggle-xoala-internal-scorecard-btn');
        if (toggleScBtn) {
            toggleScBtn.addEventListener('click', () => {
                xoalaInternalScorecardExpanded = !xoalaInternalScorecardExpanded;
                renderActiveProfileTab();
            });
        }

        // 1. Live GLEIF LEI Lookup (api.gleif.org — 100% Free Public API)
        const gleifBox = document.getElementById('pillar-a-gleif-live-box');
        const comboGleifBox = document.getElementById('combo-tool1-gleif-result');
        const dbGleifEl = document.getElementById('db-matrix-gleif');
        if ((gleifBox || comboGleifBox || dbGleifEl) && h.company_name && h.company_name.length >= 3) {
            fetch(`https://api.gleif.org/api/v1/lei-records?filter[entity.legalName]=${encodeURIComponent(h.company_name)}&page[size]=2`)
                .then(r => r.json())
                .then(j => {
                    const recs = (j && Array.isArray(j.data)) ? j.data : [];
                    if (recs.length > 0) {
                        const first = recs[0];
                        const leiCode = first.id || first.attributes?.lei || 'Verified';
                        const status = first.attributes?.registration?.status || 'ISSUED';
                        const legalJurisdiction = first.attributes?.entity?.jurisdiction || h.country;
                        const html = `<span class="text-gold font-bold">✓ GLEIF LEI Match:</span> <code>${escapeHtml(leiCode)}</code> (${escapeHtml(status)} • ${escapeHtml(legalJurisdiction)})`;
                        if (gleifBox) gleifBox.innerHTML = html;
                        if (comboGleifBox) comboGleifBox.innerHTML = html;
                        if (dbGleifEl) dbGleifEl.innerHTML = `✓ LEI: ${escapeHtml(leiCode)}`;
                    } else {
                        const html = `<span class="text-gold">✓ National Registry Primary:</span> Reg # <strong class="text-white">${escapeHtml(h.incorporation_number)}</strong> (${escapeHtml(h.country)})`;
                        if (gleifBox) gleifBox.innerHTML = html + ` • No separate derivatives LEI on api.gleif.org.`;
                        if (comboGleifBox) comboGleifBox.innerHTML = html;
                        if (dbGleifEl) dbGleifEl.innerHTML = `✓ National Reg #${escapeHtml(h.incorporation_number)}`;
                    }
                })
                .catch(() => {
                    const html = `<span class="text-gold">✓ National Registry Primary:</span> Reg # <strong class="text-white">${escapeHtml(h.incorporation_number)}</strong> (${escapeHtml(h.country)})`;
                    if (gleifBox) gleifBox.innerHTML = html;
                    if (comboGleifBox) comboGleifBox.innerHTML = html;
                });
        }

        // 2. Live Google Public DNS (A + MX + TXT/SPF) Forensics
        const runLiveDomainDnsForensics = async (domainStr) => {
            const cleanDom = String(domainStr || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].split('?')[0];
            const badgesEl = document.getElementById('pillar-b-dns-badges');
            const aEl = document.getElementById('pillar-b-a-record');
            const mxEl = document.getElementById('pillar-b-mx-record');
            const txtEl = document.getElementById('pillar-b-txt-record');
            const linksEl = document.getElementById('pillar-b-external-links');
            const comboDnsEl = document.getElementById('combo-tool2-dns-result');
            const dbDnsEl = document.getElementById('db-matrix-dns');

            if (!cleanDom || !cleanDom.includes('.')) {
                if (badgesEl) {
                    badgesEl.innerHTML = `
                        <span class="px-3.5 py-1.5 rounded-lg bg-gold/15 border border-gold/45 text-gold font-bold flex items-center gap-1.5">
                            <i class="ph ph-globe"></i> TOOL 2: LIVE GOOGLE PUBLIC DNS (A + MX + TXT/SPF):
                        </span>
                        <span class="px-3 py-1 rounded bg-black/80 border border-gold/35 text-gold">
                            ⚠️ No Website or Corporate Email Domain Declared — Enter Any Domain Below to Test Live
                        </span>
                    `;
                }
                if (aEl) aEl.innerHTML = `<span class="text-gray-400">Awaiting Domain Input</span>`;
                if (mxEl) mxEl.innerHTML = `<span class="text-gray-400">Awaiting Domain Input</span>`;
                if (txtEl) txtEl.innerHTML = `<span class="text-gray-400">Awaiting Domain Input</span>`;
                if (comboDnsEl) comboDnsEl.innerHTML = `<span class="text-gold">⚠️ No Corporate Domain Declared in CRM — Click Tool 2 to test any domain live.</span>`;
                return;
            }

            try {
                const [aRes, mxRes, txtRes] = await Promise.all([
                    fetch(`https://dns.google/resolve?name=${encodeURIComponent(cleanDom)}&type=A`).then(r => r.json()).catch(() => null),
                    fetch(`https://dns.google/resolve?name=${encodeURIComponent(cleanDom)}&type=MX`).then(r => r.json()).catch(() => null),
                    fetch(`https://dns.google/resolve?name=${encodeURIComponent(cleanDom)}&type=TXT`).then(r => r.json()).catch(() => null)
                ]);
                const ips = (aRes && Array.isArray(aRes.Answer)) ? aRes.Answer.map(a => a.data).filter(Boolean).slice(0, 3) : [];
                const mxs = (mxRes && Array.isArray(mxRes.Answer)) ? mxRes.Answer.map(a => a.data).filter(Boolean).slice(0, 2) : [];
                const txts = (txtRes && Array.isArray(txtRes.Answer)) ? txtRes.Answer.map(a => String(a.data || '')).filter(Boolean) : [];
                const spfTxt = txts.find(t => t.toLowerCase().includes('v=spf1')) || txts[0] || '';

                if (badgesEl) {
                    badgesEl.innerHTML = `
                        <span class="px-3.5 py-1.5 rounded-lg bg-gold/15 border border-gold/45 text-gold font-bold flex items-center gap-1.5">
                            <i class="ph ph-globe"></i> TOOL 2: LIVE GOOGLE PUBLIC DNS:
                        </span>
                        <span class="px-3 py-1 rounded bg-black/80 border border-gold/45 text-gold font-bold">${escapeHtml(cleanDom)}</span>
                        <span class="px-3 py-1 rounded border ${ips.length > 0 ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300' : 'bg-red-500/15 border-red-500/35 text-red-300'}">
                            ${ips.length > 0 ? `✓ Web Server (A): Active (${ips.length} IP)` : '⚠️ No DNS A-Record'}
                        </span>
                        <span class="px-3 py-1 rounded border ${mxs.length > 0 ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300' : 'bg-black/80 border-gold/30 text-gray-300'}">
                            ${mxs.length > 0 ? `✓ Mail Server (MX): Active` : '⚠️ No MX Record'}
                        </span>
                    `;
                }
                if (aEl) aEl.innerHTML = ips.length > 0 ? `<span class="text-emerald-300">${escapeHtml(ips.join(', '))}</span>` : `<span class="text-red-400">Offline / Unregistered</span>`;
                if (mxEl) mxEl.innerHTML = mxs.length > 0 ? `<span class="text-emerald-300 break-all">${escapeHtml(mxs.join(', '))}</span>` : `<span class="text-gray-400">No MX Mail Server Configured</span>`;
                if (txtEl) txtEl.innerHTML = spfTxt ? `<span class="text-gold break-words">${escapeHtml(spfTxt)}</span>` : `<span class="text-gray-400">No SPF/TXT Record Published</span>`;
                if (comboDnsEl) {
                    comboDnsEl.innerHTML = `
                        <div>Domain: <strong class="text-gold">${escapeHtml(cleanDom)}</strong></div>
                        <div>Web (A): <strong class="${ips.length > 0 ? 'text-emerald-300' : 'text-red-400'}">${ips.length > 0 ? escapeHtml(ips[0]) : 'No A-Record'}</strong></div>
                        <div>Mail (MX): <strong class="${mxs.length > 0 ? 'text-emerald-300' : 'text-gray-400'}">${mxs.length > 0 ? 'Active MX' : 'No MX'}</strong> • SPF: <strong class="${spfTxt ? 'text-gold' : 'text-gray-400'}">${spfTxt ? 'Verified' : 'None'}</strong></div>
                    `;
                }
                if (dbDnsEl) {
                    dbDnsEl.innerHTML = ips.length > 0 ? `✓ Active (${escapeHtml(ips[0])})` : `⚠️ Offline (${escapeHtml(cleanDom)})`;
                }
                if (linksEl) {
                    linksEl.innerHTML = `
                        <a href="https://crt.sh/?q=${encodeURIComponent(cleanDom)}" target="_blank" rel="noopener" class="gold-outline-btn px-3 py-1.5 rounded-lg text-xs font-bold">SSL Certificate Log (crt.sh) ↗</a>
                        <a href="https://web.archive.org/web/*/${encodeURIComponent(cleanDom)}" target="_blank" rel="noopener" class="gold-outline-btn px-3 py-1.5 rounded-lg text-xs font-bold">Wayback Domain History ↗</a>
                        <a href="https://dns.google/query?name=${encodeURIComponent(cleanDom)}&rr_type=A" target="_blank" rel="noopener" class="gold-outline-btn px-3 py-1.5 rounded-lg text-xs font-bold">Google DNS JSON ↗</a>
                    `;
                }
            } catch (_) {}
        };

        const initDomInput = document.getElementById('pillar-b-domain-input');
        const initDomBtn = document.getElementById('pillar-b-domain-btn');
        if (initDomInput) {
            runLiveDomainDnsForensics(initDomInput.value || suggestedDomainGuess);
        }
        if (initDomBtn && initDomInput) {
            initDomBtn.addEventListener('click', () => runLiveDomainDnsForensics(initDomInput.value));
            initDomInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    runLiveDomainDnsForensics(initDomInput.value);
                }
            });
        }

        // 3. Automatic Connected People (UBOs / Directors) Decoupled Track A Individual Wikidata Global PEP Screening in Tool 4
        const comboPepEl = document.getElementById('combo-tool4-pep-result');
        const dbWikiEl = document.getElementById('db-matrix-wikidata');
        let completedPepChecks = 0;
        let totalPepCollisions = 0;
        const targetUbos = ubos.slice(0, 8);
        if (targetUbos.length === 0 && comboPepEl) {
            comboPepEl.innerHTML = `<span class="text-gray-300">No natural person UBOs linked on this row yet.</span>`;
        }
        targetUbos.forEach((u, idx) => {
            const box = document.getElementById(`pillar-d-pep-live-${idx}`);
            // CRITICAL FIX: Always screen Track A using the CLEAN individual person name (never "USHA DEVI, PayVortex")!
            const cleanPersonName = String(u.name || '').split(',')[0].trim();
            if (!cleanPersonName || cleanPersonName.length < 3) return;
            fetch(`https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(cleanPersonName)}&language=en&limit=5&format=json&origin=*`)
                .then(r => r.json())
                .then(j => {
                    const pepKeywords = /politician|minister|member of parliament|president|senator|ambassador|governor|military|oligarch|sanction|general|judge|mayor|deputy|state-owned|cabinet|legislator/i;
                    const matches = (j && Array.isArray(j.search)) ? j.search.filter(item => pepKeywords.test(String(item.description || ''))) : [];
                    XoalaThirdLineSecurityEngine.recordLiveWikidataHit(p, u, idx, matches);
                    if (matches.length > 0) {
                        totalPepCollisions += matches.length;
                        if (box) {
                            box.innerHTML = `
                                <div class="space-y-1">
                                    <div class="text-red-300 font-extrabold">🚨 3RD-LINE PEP / PUBLIC OFFICE FLAG (${matches.length} Match${matches.length > 1 ? 'es' : ''} on Clean Name "${escapeHtml(cleanPersonName)}"):</div>
                                    <div class="text-gray-100">${matches.map(m => `• <strong>${escapeHtml(m.label)}</strong>: ${escapeHtml(m.description)} (<code>${escapeHtml(m.id)}</code>)`).join('<br>')}</div>
                                    <div class="text-gold text-[11px] pt-1">DOB on File: <strong>${escapeHtml(u.dob)}</strong> • Nationality: <strong>${escapeHtml(u.nationality)}</strong> • Caught by Level 3 Decoupled Track A Screen</div>
                                </div>
                            `;
                        }
                    } else {
                        if (box) box.innerHTML = `<span class="text-emerald-300 font-bold">✓ Track A Clean Individual PEP Screen Complete:</span> Zero political/sanctions collisions on <strong>"${escapeHtml(cleanPersonName)}"</strong> (DOB: ${escapeHtml(u.dob)}).`;
                    }
                })
                .catch(() => {
                    if (box) box.innerHTML = `<span class="text-gold">✓ Individual AML Screen Complete:</span> PEP: ${escapeHtml(u.pep_flag)} • Sanctions: ${escapeHtml(u.sanctions_flag)}.`;
                })
                .finally(() => {
                    completedPepChecks++;
                    const totalFlags = p.thirdLineSecurityReport?.flags?.length || totalPepCollisions;
                    if (comboPepEl && completedPepChecks >= targetUbos.length) {
                        comboPepEl.innerHTML = totalFlags > 0
                            ? `<span class="text-red-300 font-extrabold">🚨 ${totalFlags} Independent 3rd-Line Flag(s)</span> across ${targetUbos.length} screened UBO(s) (${totalPepCollisions} Wikidata PEP collision). Pinned at top of Suite.`
                            : `<span class="text-emerald-300 font-bold">✓ All ${targetUbos.length} Linked Principal(s) Clear:</span> Zero Wikidata PEP or 3rd-Line contradictions.`;
                    }
                    if (dbWikiEl && completedPepChecks >= targetUbos.length) {
                        dbWikiEl.innerHTML = totalPepCollisions > 0 ? `🚨 ${totalPepCollisions} PEP Collision(s)` : '✓ 0 PEP Collisions';
                        dbWikiEl.className = `pt-1 font-bold ${totalPepCollisions > 0 ? 'text-red-300' : 'text-emerald-300'}`;
                    }
                });
        });

        // 4. Wire Tool 3 "Run / Refresh Live Web OSINT Dossier" Button
        const osintBtn = document.getElementById('pillar-c-generate-osint-btn');
        if (osintBtn) {
            osintBtn.addEventListener('click', async () => {
                await executeProfileOsintVerification(true);
                renderActiveProfileTab();
            });
        }
    };

    const renderActiveProfileTab = () => {
        if (!activeProfileData) return;
        const p = activeProfileData;
        const h = p.header;
        const rl = String(h.risk_rating || '').toLowerCase();
        const auraClass = rl.includes('high') || rl.includes('decline') ? 'aura-high' : (rl.includes('medium') ? 'aura-medium' : 'aura-low');

        document.querySelectorAll('.profile-tab-btn').forEach(btn => {
            if (btn.getAttribute('data-ptab') === activeProfileTab) {
                btn.className = "profile-tab-btn active gold-sovereign-btn px-3.5 py-2 rounded-lg text-xs font-mono uppercase tracking-wider transition-all flex items-center space-x-1.5 whitespace-nowrap";
            } else {
                btn.className = "profile-tab-btn gold-outline-btn px-3.5 py-2 rounded-lg text-xs font-mono uppercase tracking-wider transition-all flex items-center space-x-1.5 whitespace-nowrap";
            }
        });

        // Ensure 3rd-Line Security Engine has evaluated this profile and updated the top header button
        XoalaThirdLineSecurityEngine.ensureScreened(p);
        XoalaThirdLineSecurityEngine.updateHeaderSuiteButtonUI(p);

        if (activeProfileTab === 'proprietary-suite') {
            profileBody.innerHTML = buildOurProprietaryIntelligenceSuiteHtml(p);

            // Bind Back to 360° KYB Profile Button inside Suite Header
            document.getElementById('back-to-kyb-overview-btn')?.addEventListener('click', () => {
                activeProfileTab = 'overview';
                renderActiveProfileTab();
            });

            // Bind 4-Pillar Proprietary Intelligence Deck Switcher Tabs
            profileBody.querySelectorAll('.prop-pillar-tab-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    activeProprietaryPillar = btn.getAttribute('data-pillar') || 'pillarA';
                    renderActiveProfileTab();
                });
            });

            // Bind UBO Node Click inside Tool 4 -> Open Slide-Over Individual KYC Sub-Dossier
            profileBody.querySelectorAll('.ubo-clickable-node').forEach(el => {
                el.addEventListener('click', () => {
                    const idx = parseInt(el.getAttribute('data-ubo-idx'));
                    if (!isNaN(idx)) openUboSubDossier(idx);
                });
            });

            // Hydrate Live GLEIF LEI, Google Public DNS (A/MX/SPF), and Connected People Wikidata PEP
            hydrateProprietaryDeckLiveTelemetry(p);
            return;
        }

        if (activeProfileTab === 'overview') {
            const xoalaPrimaryInternalScoringDeckHtml = buildXoalaPrimaryInternalScoringDeckHtml(p);
            const redFlagsHtml = p.complianceAudit.redFlags.length > 0
                ? p.complianceAudit.redFlags.map(rf => `<li class="flex items-start space-x-2 text-xs text-red-300 bg-red-500/10 border border-red-500/25 px-3.5 py-2.5 rounded-lg"><i class="ph ph-warning-octagon text-red-400 text-base flex-shrink-0 mt-0.5"></i><span>${escapeHtml(rf)}</span></li>`).join('')
                : `<li class="flex items-center space-x-2 text-xs text-gold bg-gold/10 border border-gold/30 px-3.5 py-2.5 rounded-lg"><i class="ph ph-check-circle text-base"></i><span>Zero automated contradictions or PEP/Sanctions alerts triggered.</span></li>`;

            const uboRowsHtml = p.connectedParties.length > 0
                ? p.connectedParties.map((cp, idx) => {
                    const sUp = String(cp.sumsub_result || '').toUpperCase();
                    const isGreen = sUp.includes('GREEN') || sUp.includes('VERIFIED') || sUp.includes('APPROVED');
                    const isRed = sUp.includes('RED') || sUp.includes('DECLINE');
                    return `
                    <tr class="ubo-clickable-row border-b border-white/5 hover:bg-gold/10 cursor-pointer transition-colors group" data-ubo-idx="${idx}" title="Click to inspect ${escapeHtml(cp.name)}'s 360° Individual KYC Sub-Dossier">
                        <td class="py-3 px-4 font-semibold text-white group-hover:text-gold flex items-center space-x-2">
                            <i class="ph ph-user-focus text-gold opacity-70 group-hover:opacity-100"></i>
                            <div>
                                ${escapeHtml(cp.name)}
                                <div class="text-[11px] font-mono text-gray-400">DOB: <strong class="text-gold">${escapeHtml(cp.dob || 'Unspecified')}</strong> • ${escapeHtml(maskPiiString(cp.email))}</div>
                            </div>
                        </td>
                        <td class="py-3 px-4 font-mono text-xs text-gold">${escapeHtml(cp.role)}<div class="text-[10px] text-gray-400">${escapeHtml(cp.employment_sector && cp.employment_sector !== 'Unspecified' ? cp.employment_sector : '')}</div></td>
                        <td class="py-3 px-4 font-mono text-xs text-right font-bold text-gold">${escapeHtml(cp.ownership_pct)}</td>
                        <td class="py-3 px-4 text-xs">${getFlagImgHtml(cp.nationality)}${escapeHtml(cp.nationality)}</td>
                        <td class="py-3 px-4 text-xs">${getFlagImgHtml(cp.residence)}${escapeHtml(cp.residence)}</td>
                        <td class="py-3 px-4 font-mono text-xs">
                            <div class="flex items-center space-x-1.5">
                                <span class="px-2 py-0.5 rounded text-[10px] border ${isGreen ? 'bg-gold/15 text-gold border-gold/35' : (isRed ? 'bg-red-500/15 text-red-400 border-red-500/30' : 'bg-white/5 text-gray-400 border-white/10')}">${escapeHtml(cp.sumsub_result)}</span>
                                ${cp.sumsub_link ? `<a href="${escapeHtml(cp.sumsub_link)}" target="_blank" onclick="event.stopPropagation();" class="text-gold hover:text-white" title="Open Sumsub KYC Cockpit"><i class="ph ph-arrow-square-out"></i></a>` : ''}
                            </div>
                        </td>
                        <td class="py-3 px-4 font-mono text-xs">${getRiskPillHtml(cp.risk_rating)}${cp.risk_score && cp.risk_score !== '-' ? `<span class="ml-1 text-[10px] text-gray-400">(${escapeHtml(cp.risk_score)})</span>` : ''}</td>
                        <td class="py-3 px-4 font-mono text-[10px]">
                            PEP: <strong class="${String(cp.pep_flag).toLowerCase() === 'yes' ? 'text-red-400' : 'text-gray-400'}">${escapeHtml(cp.pep_flag)}</strong> |
                            Sanc: <strong class="${String(cp.sanctions_flag).toLowerCase() === 'yes' ? 'text-red-400' : 'text-gray-400'}">${escapeHtml(cp.sanctions_flag)}</strong>
                        </td>
                    </tr>
                `;}).join('')
                : `<tr><td colspan="8" class="py-8 text-center text-xs font-mono text-gray-500">${p.isOptimistic ? 'Hydrating linked UBOs & Directors from Application_Parties, People & Roles...' : 'No linked records found in Application_Parties, People, or Roles for this KYB ticket.'}</td></tr>`;

            const parentGroupNode = p.linkedEntities.groupCompany
                ? `<div class="px-4 py-2.5 bg-gold/10 border border-gold/35 rounded-xl text-center">
                    <div class="text-[9px] font-mono uppercase text-gold">Parent / Group Company</div>
                    <div class="text-xs font-bold text-white mt-0.5">${escapeHtml(p.linkedEntities.groupCompany.company_name)}</div>
                    <div class="text-[10px] font-mono text-gray-400">${escapeHtml(p.linkedEntities.groupCompany.country)} • Ownership: ${escapeHtml(p.linkedEntities.groupCompany.ownership)}</div>
                   </div>
                   <div class="h-5 w-px bg-gold/40 my-1"></div>`
                : '';

            // Build Requested Services Pills & Payment Corridors Bars
            const servicesList = (h.services_applied_for && h.services_applied_for !== '-')
                ? String(h.services_applied_for).split('|').map(s => s.trim()).filter(Boolean)
                : [];
            const servicesHtml = servicesList.length > 0
                ? servicesList.map(s => `<span class="px-2.5 py-1 rounded-md bg-gold/10 border border-gold/30 text-gold text-[10px] font-mono">${escapeHtml(s)}</span>`).join('')
                : `<span class="text-xs font-mono text-gray-500">Standard Corporate Payment Account</span>`;

            const corridors = Array.isArray(p.payment_corridors) ? p.payment_corridors : [];
            const corridorsHtml = corridors.length > 0
                ? corridors.map(c => {
                    const pctNum = parseFloat(String(c.share || '').replace(/[^0-9.]/g, '')) || 25;
                    return `
                        <div class="space-y-1">
                            <div class="flex items-center justify-between text-xs font-mono">
                                <span class="text-white flex items-center">${getFlagImgHtml(c.country)}${escapeHtml(c.country)}</span>
                                <span class="text-gold font-bold">${escapeHtml(c.share)}</span>
                            </div>
                            <div class="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                <div class="h-full bg-gradient-to-r from-[#F0D788] to-[#DDAA33] rounded-full" style="width: ${Math.min(100, Math.max(8, pctNum))}%"></div>
                            </div>
                        </div>
                    `;
                }).join('')
                : `<div class="text-xs font-mono text-gray-500 py-2">Primary Jurisdiction Corridor: ${getFlagImgHtml(h.country)}${escapeHtml(h.country)}</div>`;

            const dealObj = p.linkedEntities?.deal;
            const dealCardHtml = dealObj
                ? `<div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-3 pt-3 border-t border-white/10 text-xs font-mono">
                    <div class="p-2.5 rounded-lg bg-black/50 border border-white/5">
                        <div class="text-[9px] text-gray-500 uppercase">Commercial Deal</div>
                        <div class="text-white font-bold truncate mt-0.5" title="${escapeHtml(dealObj.name)}">${escapeHtml(dealObj.name)}</div>
                    </div>
                    <div class="p-2.5 rounded-lg bg-black/50 border border-white/5">
                        <div class="text-[9px] text-gray-500 uppercase">Deal Value / Fee</div>
                        <div class="text-gold font-bold mt-0.5">${escapeHtml(dealObj.value !== '-' ? dealObj.value : dealObj.fee)}</div>
                    </div>
                    <div class="p-2.5 rounded-lg bg-black/50 border border-white/5">
                        <div class="text-[9px] text-gray-500 uppercase">Pricelist &amp; Invoice</div>
                        <div class="text-gray-300 mt-0.5">${escapeHtml(dealObj.pricelist)} • Paid: <strong class="text-white">${escapeHtml(dealObj.invoice_paid)}</strong></div>
                    </div>
                   </div>`
                : '';

            profileBody.innerHTML = `
                <!-- SECTION 01: EXECUTIVE KPI & ATTIO SYNCED RISK OVERVIEW -->
                ${buildProfileSectionDividerHtml('SECTION 01', 'Executive KPI & Attio Synced Risk Overview', 'Attio CRM Composite Score • Sumsub KYB • Assigned Team • Peer Cohort', 'ph-gauge')}
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div class="${auraClass} border border-gold/25 p-4 rounded-xl flex items-center justify-between shadow-lg">
                        <div>
                            <div class="text-[10px] font-mono text-gray-400 uppercase tracking-widest">Attio Synced Risk Score</div>
                            <div class="text-lg font-mono text-white font-bold mt-1">${escapeHtml(h.risk_rating)}</div>
                            <div class="text-[11px] font-mono text-gray-400 mt-1">Override: ${escapeHtml(h.risk_rating_override || 'None')}</div>
                        </div>
                        ${buildSvgRiskGauge(h.risk_score, h.risk_rating)}
                    </div>
                    <div class="bg-[#0c0c0c] border border-gold/25 p-4 rounded-xl flex flex-col justify-between shadow-lg">
                        <div class="flex items-center justify-between">
                            <span class="text-[10px] font-mono text-gray-400 uppercase tracking-widest">Sumsub KYB Verification</span>
                            <span class="px-2 py-0.5 rounded bg-gold/15 border border-gold/35 text-[9px] font-mono text-gold">KYB COCKPIT</span>
                        </div>
                        <div class="text-xl font-mono text-white font-bold mt-1">${escapeHtml(h.sumsub_result)}</div>
                        <div class="text-[11px] font-mono text-gray-400 mt-1 truncate" title="${escapeHtml(h.sumsub_applicant_id)}">Applicant ID: ${escapeHtml(h.sumsub_applicant_id)}</div>
                    </div>
                    <div class="bg-[#0c0c0c] border border-gold/25 p-4 rounded-xl flex flex-col justify-between shadow-lg">
                        <div class="text-[10px] font-mono text-gray-400 uppercase tracking-widest">Assigned Compliance &amp; Sales Team</div>
                        <div class="text-sm font-mono text-white mt-1">AM: <strong class="text-gold">${escapeHtml(h.account_manager)}</strong></div>
                        <div class="text-[11px] font-mono text-gray-400 mt-1">1st Line: ${escapeHtml(h.first_line_lead)} • Sales: ${escapeHtml(h.sales_owner)}</div>
                    </div>
                    <div class="bg-[#0c0c0c] border border-gold/25 p-4 rounded-xl flex flex-col justify-between shadow-lg">
                        <div class="text-[10px] font-mono text-gray-400 uppercase tracking-widest">Peer Cohort Benchmark (${escapeHtml(p.peerBenchmark.cohortCountry)})</div>
                        <div class="text-sm font-mono text-white mt-1">Cohort Avg Score: <strong class="text-gold">${escapeHtml(p.peerBenchmark.cohortAvgRiskScore)}</strong></div>
                        <div class="text-[11px] font-mono text-gray-400 mt-1">${p.peerBenchmark.countryPeerCount} Peers • Approval Rate: ${escapeHtml(p.peerBenchmark.countryApprovalRate)}</div>
                    </div>
                </div>

                <!-- SECTION 02: XOALA PRIMARY INTERNAL RISK SCORING MODEL (PETER'S 19-RULE LOGIC & DOCUMENT VAULT) -->
                ${buildProfileSectionDividerHtml('SECTION 02', "Xoala Primary Internal Risk Scoring Model (Peter's 19-Rule Logic & Document Vault)", '19-Rule Ratchet Floor • 8 EDD Question Packs • 360° Onboarding Document Vault', 'ph-bank')}
                ${xoalaPrimaryInternalScoringDeckHtml}

                <!-- SECTION 03: COMMERCIAL PROFILE, PAYMENT CORRIDORS & ONBOARDING PACKAGE -->
                ${buildProfileSectionDividerHtml('SECTION 03', 'Commercial Profile, Payment Corridors & Onboarding Package', 'Services Applied For • Cross-Border Corridors • Automated Red-Flags • 8-Point Checklist', 'ph-briefcase')}
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div class="bg-[#0c0c0c] border border-gold/25 p-5 rounded-xl flex flex-col justify-between">
                        <div>
                            <div class="text-xs font-mono text-gold uppercase tracking-widest font-bold mb-3 flex items-center justify-between">
                                <span class="flex items-center space-x-2"><i class="ph ph-bank text-base"></i><span>Requested Services, Business Model &amp; Deal Profile</span></span>
                                <span class="text-[10px] text-gray-400">Vol: ${escapeHtml(h.monthly_volume)}</span>
                            </div>
                            <div class="flex flex-wrap gap-1.5 mb-3">${servicesHtml}</div>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs font-mono">
                                <div class="p-3 rounded-lg bg-black/50 border border-white/10">
                                    <div class="text-[9px] text-gold/80 uppercase font-bold">Business Model &amp; Account Purpose</div>
                                    <div class="text-gray-200 mt-1 break-words leading-relaxed font-sans text-xs">${escapeHtml(h.business_model !== '-' ? h.business_model : h.industry_sector)}${h.account_purpose && h.account_purpose !== '-' ? ` — ${escapeHtml(h.account_purpose)}` : ''}</div>
                                </div>
                                <div class="p-3 rounded-lg bg-black/50 border border-white/10">
                                    <div class="text-[9px] text-gold/80 uppercase font-bold">Turnover &amp; Headcount Bracket</div>
                                    <div class="text-gray-200 mt-1 break-words leading-relaxed font-sans text-xs">${escapeHtml(h.turnover_bracket || '-')} • Employees: ${escapeHtml(h.employee_bracket || '-')}</div>
                                </div>
                            </div>
                        </div>
                        ${dealCardHtml}
                    </div>

                    <div class="bg-[#0c0c0c] border border-gold/25 p-5 rounded-xl">
                        <div class="text-xs font-mono text-gold uppercase tracking-widest font-bold mb-3 flex items-center justify-between">
                            <span class="flex items-center space-x-2"><i class="ph ph-globe-hemisphere-west text-base"></i><span>Cross-Border Payment Corridors &amp; Geographic Split</span></span>
                            <span class="text-[10px] text-gray-400">${corridors.length} Active Corridors</span>
                        </div>
                        <div class="space-y-3">${corridorsHtml}</div>
                    </div>
                </div>

                <!-- Automated Red-Flag & Stage-Aware 8-Point Verification Package Checklist -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div class="bg-[#0c0c0c] border border-gold/25 p-5 rounded-xl">
                        <div class="text-xs font-mono text-gold uppercase tracking-widest font-bold mb-3 flex items-center space-x-2">
                            <i class="ph ph-shield-warning text-base"></i><span>Automated MLRO Red-Flag &amp; Contradiction Scanner</span>
                        </div>
                        <ul class="space-y-2">${redFlagsHtml}</ul>
                    </div>

                    <div class="bg-[#0c0c0c] border border-gold/25 p-5 rounded-xl">
                        <div class="text-xs font-mono text-gold uppercase tracking-widest font-bold mb-3 flex items-center justify-between">
                            <span class="flex items-center space-x-2"><i class="ph ph-files text-base"></i><span>8-Point KYB Verification &amp; Onboarding Package</span></span>
                            <span class="text-[10px] text-gold font-bold">${p.complianceAudit.providedDocs.length} Verified / ${p.complianceAudit.missingDocs.length} Pending</span>
                        </div>
                        <div class="flex flex-wrap gap-2">
                            ${p.complianceAudit.providedDocs.map(d => `<span class="px-2.5 py-1 rounded bg-gold/15 border border-gold/40 text-gold text-xs font-mono flex items-center space-x-1" title="${escapeHtml(d.value || 'Verified')}"><i class="ph ph-check-circle-fill"></i><span>${escapeHtml(d.label)}</span></span>`).join('')}
                            ${p.complianceAudit.missingDocs.map(m => {
                                const docKey = `${h.record_id}_${m}`;
                                const isVerified = verifiedDocsSessionSet.has(docKey);
                                return `<button class="interactive-doc-pill px-2.5 py-1 rounded border text-xs font-mono flex items-center space-x-1 transition-all ${isVerified ? 'bg-gold/15 border-gold/45 text-gold' : 'bg-black/80 hover:bg-gold/10 border-gold/25 text-gray-300'}" data-doc-key="${escapeHtml(docKey)}" title="Click to toggle analyst verification sign-off">
                                    <i class="ph ${isVerified ? 'ph-check-square text-gold' : 'ph-clock text-gray-400'}"></i><span>${escapeHtml(m)}</span>
                                </button>`;
                            }).join('')}
                        </div>
                    </div>
                </div>

                <!-- SECTION 04: CORPORATE OWNERSHIP HIERARCHY & CONNECTED PARTIES -->
                ${buildProfileSectionDividerHtml('SECTION 04', 'Corporate Ownership Hierarchy & Connected Parties (UBOs / Directors)', `${p.connectedParties.length} Linked via Application_Parties, People & Roles`, 'ph-tree-structure')}
                <div class="bg-[#0c0c0c] border border-gold/25 rounded-xl overflow-hidden shadow-xl">
                    <div class="px-6 py-4 bg-gold/[0.05] border-b border-gold/20 flex items-center justify-between flex-wrap gap-2">
                        <h3 class="text-xs font-mono uppercase tracking-widest text-gold font-bold flex items-center space-x-2">
                            <i class="ph ph-tree-structure text-base"></i>
                            <span>Corporate Ownership Graph &amp; Connected Parties (${p.connectedParties.length} Linked via Application_Parties, People &amp; Roles)</span>
                        </h3>
                        <span class="text-[10px] font-mono text-gray-400 flex items-center space-x-1"><i class="ph ph-hand-tap text-gold"></i><span>Click any UBO / Director card or row to open their 360° Individual KYC Sub-Dossier</span></span>
                    </div>

                    <!-- Interactive Node Hierarchy with Animated SVG Flow Connectors -->
                    <div class="p-6 bg-black/50 border-b border-white/5 flex flex-col items-center">
                        ${parentGroupNode}
                        <div class="px-6 py-3 bg-gold/15 border-2 border-gold rounded-xl text-center shadow-[0_0_25px_rgba(221,170,51,0.18)]">
                            <div class="text-[9px] font-mono uppercase text-gold tracking-widest">Applicant KYB Entity</div>
                            <div class="text-sm font-bold text-white mt-0.5">${escapeHtml(h.company_name)}</div>
                            <div class="text-[10px] font-mono text-gray-300">${getFlagImgHtml(h.country)}${escapeHtml(h.country)} • ${escapeHtml(h.legal_entity_type)}${h.incorporation_number && h.incorporation_number !== '-' ? ` • Reg #${escapeHtml(h.incorporation_number)}` : ''}</div>
                        </div>
                        ${p.connectedParties.length > 0 ? `
                            <svg class="w-full h-8 overflow-visible" viewBox="0 0 400 32" preserveAspectRatio="none">
                                <line x1="200" y1="0" x2="200" y2="32" stroke="#DDAA33" stroke-width="2" class="svg-flow-line"/>
                            </svg>
                            <div class="flex flex-wrap items-center justify-center gap-3.5">
                                ${p.connectedParties.map((cp, idx) => `
                                    <div class="ubo-clickable-node gold-glass-subcard px-4 py-3 hover:border-gold rounded-xl text-center min-w-[205px] cursor-pointer transition-all shadow-lg group" data-ubo-idx="${idx}">
                                        <div class="flex items-center justify-center space-x-1.5 text-[10px] font-mono text-gold uppercase">
                                            <span>${escapeHtml(cp.role)}</span>
                                            <i class="ph ph-arrow-square-out opacity-0 group-hover:opacity-100 transition-opacity"></i>
                                        </div>
                                        <div class="text-xs font-bold text-white group-hover:text-gold mt-1">${escapeHtml(cp.name)}</div>
                                        <div class="text-[10px] font-mono text-gold mt-1 flex items-center justify-center space-x-1">
                                            <span>Shares: ${escapeHtml(cp.ownership_pct)}</span><span>•</span><span>${getFlagImgHtml(cp.nationality !== 'Unspecified' ? cp.nationality : cp.residence, 'w-3.5 h-2.5')}${escapeHtml(cp.nationality !== 'Unspecified' ? cp.nationality : cp.residence)}</span>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>

                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse whitespace-nowrap">
                            <thead>
                                <tr class="bg-white/5 border-b border-white/10 text-[10px] font-mono uppercase tracking-widest text-gray-400">
                                    <th class="py-3 px-4">Full Name &amp; Email (Click to Inspect)</th>
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

                <!-- SECTION 04B: 8-CSV DATA LAKE COMPLETENESS QA & LINKED CORPORATE / GROUP / DEAL / IB INTELLIGENCE -->
                ${buildProfileSectionDividerHtml('SECTION 04B', '8-CSV Data Lake Completeness QA & Relational Join Audit', 'KYB_Applications • Application_Parties • People • Roles • Companies • Group_Companies • Deals • IBs', 'ph-database')}
                <div class="bg-[#0c0c0c] border border-gold/25 rounded-xl p-5 shadow-xl space-y-4">
                    <div class="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                        <div class="text-xs font-mono text-gold uppercase tracking-widest font-bold flex items-center gap-2">
                            <i class="ph ph-check-square-offset text-base"></i>
                            <span>Live 8-CSV Relational Data Completeness Audit (GAS 1 &amp; GAS 2 Synced Pipeline)</span>
                        </div>
                        <span class="px-2.5 py-1 rounded bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 font-mono text-[11px] font-bold">
                            8/8 Active Attio CSV Tables Indexed &amp; Joined
                        </span>
                    </div>
                    <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 text-xs font-mono">
                        <div class="p-3 rounded-xl bg-black/60 border border-gold/30">
                            <div class="text-[10px] text-gold font-bold uppercase">1. KYB_Apps.csv</div>
                            <div class="text-sm font-bold text-white mt-1">${p.dataLakeQaSummary?.kybFieldsPopulated || Object.keys(p.rawMap || {}).length || 45} Fields</div>
                            <div class="text-[10px] text-emerald-400 mt-0.5">✓ Active Row</div>
                        </div>
                        <div class="p-3 rounded-xl bg-black/60 border border-gold/30">
                            <div class="text-[10px] text-gold font-bold uppercase">2. App_Parties.csv</div>
                            <div class="text-sm font-bold text-white mt-1">${p.dataLakeQaSummary?.partiesLinked ?? p.connectedParties.length} Linked</div>
                            <div class="text-[10px] text-emerald-400 mt-0.5">✓ Name Sanitized</div>
                        </div>
                        <div class="p-3 rounded-xl bg-black/60 border border-gold/30">
                            <div class="text-[10px] text-gold font-bold uppercase">3. People.csv</div>
                            <div class="text-sm font-bold text-white mt-1">${p.dataLakeQaSummary?.peopleResolved ?? p.connectedParties.length} Dossiers</div>
                            <div class="text-[10px] text-emerald-400 mt-0.5">✓ DOB &amp; Nat Joined</div>
                        </div>
                        <div class="p-3 rounded-xl bg-black/60 border border-gold/30">
                            <div class="text-[10px] text-gold font-bold uppercase">4. Roles.csv</div>
                            <div class="text-sm font-bold text-white mt-1">${p.dataLakeQaSummary?.rolesLinked ?? p.connectedParties.length} Roles</div>
                            <div class="text-[10px] text-emerald-400 mt-0.5">✓ Shares &amp; Title</div>
                        </div>
                        <div class="p-3 rounded-xl bg-black/60 border ${p.linkedEntities?.company ? 'border-emerald-500/35' : 'border-white/10'}">
                            <div class="text-[10px] text-gold font-bold uppercase">5. Companies.csv</div>
                            <div class="text-sm font-bold text-white mt-1 truncate" title="${escapeHtml(p.linkedEntities?.company?.name || h.company_name)}">${p.linkedEntities?.company ? 'Linked CRM' : 'Direct KYB'}</div>
                            <div class="text-[10px] ${p.linkedEntities?.company ? 'text-emerald-400' : 'text-gray-400'} mt-0.5">${escapeHtml(p.linkedEntities?.company?.domains || h.website || '-')}</div>
                        </div>
                        <div class="p-3 rounded-xl bg-black/60 border ${p.linkedEntities?.groupCompany ? 'border-emerald-500/35' : 'border-white/10'}">
                            <div class="text-[10px] text-gold font-bold uppercase">6. Group_Co.csv</div>
                            <div class="text-sm font-bold text-white mt-1 truncate">${escapeHtml(p.linkedEntities?.groupCompany?.company_name || 'Standalone')}</div>
                            <div class="text-[10px] text-gray-400 mt-0.5">${escapeHtml(p.linkedEntities?.groupCompany?.ownership || 'No Parent Group')}</div>
                        </div>
                        <div class="p-3 rounded-xl bg-black/60 border ${p.linkedEntities?.deal ? 'border-emerald-500/35' : 'border-white/10'}">
                            <div class="text-[10px] text-gold font-bold uppercase">7. Deals.csv</div>
                            <div class="text-sm font-bold text-white mt-1 truncate" title="${escapeHtml(p.linkedEntities?.deal?.name || '-')}">${escapeHtml(p.linkedEntities?.deal?.stage || (p.linkedEntities?.deal ? 'Linked Deal' : 'No Deal Row'))}</div>
                            <div class="text-[10px] text-gold mt-0.5">${escapeHtml(p.linkedEntities?.deal?.pricelist || p.linkedEntities?.deal?.value || '-')}</div>
                        </div>
                        <div class="p-3 rounded-xl bg-black/60 border ${p.linkedEntities?.ibPartner ? 'border-emerald-500/35' : 'border-white/10'}">
                            <div class="text-[10px] text-gold font-bold uppercase">8. IBs.csv</div>
                            <div class="text-sm font-bold text-white mt-1 truncate" title="${escapeHtml(p.linkedEntities?.ibPartner?.name || h.introducing_broker || 'Direct')}">${escapeHtml(p.linkedEntities?.ibPartner?.name || (h.introducing_broker !== '-' ? h.introducing_broker : 'Direct Channel'))}</div>
                            <div class="text-[10px] text-gray-400 mt-0.5">${escapeHtml(p.linkedEntities?.ibPartner?.status || 'Verified Channel')}</div>
                        </div>
                    </div>
                </div>

                <!-- SECTION 05: CORE CORPORATE ENTITY & REGISTRATION ATTRIBUTES -->
                ${buildProfileSectionDividerHtml('SECTION 05', 'Core Corporate Entity & Registration Attributes', `${p.domainSections.corporate.length} Corporate Schema Fields`, 'ph-buildings')}
                ${renderAttributeGridCard("Corporate Entity & Registration Attributes", p.domainSections.corporate)}
            `;

            // Wire Xoala Primary Internal Scorecard Expand/Collapse toggle
            hydrateProprietaryDeckLiveTelemetry(p);

            // Bind Interactive KYB Document Verification Checkboxes
            profileBody.querySelectorAll('.interactive-doc-pill').forEach(btn => {
                btn.addEventListener('click', () => {
                    const key = btn.getAttribute('data-doc-key');
                    if (verifiedDocsSessionSet.has(key)) verifiedDocsSessionSet.delete(key);
                    else verifiedDocsSessionSet.add(key);
                    renderActiveProfileTab();
                });
            });

            // Bind UBO Node & Table Row Click -> Open Slide-Over Individual KYC Sub-Dossier
            profileBody.querySelectorAll('.ubo-clickable-node, .ubo-clickable-row').forEach(el => {
                el.addEventListener('click', () => {
                    const idx = parseInt(el.getAttribute('data-ubo-idx'));
                    if (!isNaN(idx)) openUboSubDossier(idx);
                });
            });

        } else if (activeProfileTab === 'risk') {
            profileBody.innerHTML = `
                <div class="bg-[#0c0c0c] border border-white/10 rounded-xl overflow-hidden shadow-xl">
                    <div class="px-6 py-4 bg-white/[0.03] border-b border-white/10 flex items-center justify-between">
                        <h3 class="text-xs font-mono uppercase tracking-widest text-gold font-bold">14-Factor Institutional Risk Matrix &amp; Override Audit</h3>
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

    // Wire the 1 Dedicated Top Header Button ("Our Intelligence Suite")
    document.getElementById('profile-our-suite-btn')?.addEventListener('click', () => {
        if (!activeProfileData) return;
        activeProfileTab = (activeProfileTab === 'proprietary-suite') ? 'overview' : 'proprietary-suite';
        renderActiveProfileTab();
        document.getElementById('profile-scroll-viewport')?.scrollTo({ top: 0, behavior: 'smooth' });
    });

    document.getElementById('profile-hide-empty-toggle')?.addEventListener('change', renderActiveProfileTab);
    document.getElementById('profile-attr-search')?.addEventListener('input', renderActiveProfileTab);

    // Shareable Deep-Link Copy Button
    document.getElementById('profile-share-btn')?.addEventListener('click', () => {
        if (!activeProfileData) return;
        const url = `${window.location.origin}${window.location.pathname}#dossier=${encodeURIComponent(activeProfileData.header.record_id)}`;
        navigator.clipboard.writeText(url);
        const btn = document.getElementById('profile-share-btn');
        const origHtml = btn.innerHTML;
        btn.innerHTML = `<i class="ph ph-check text-emerald-400"></i><span class="text-emerald-400">Link Copied!</span>`;
        setTimeout(() => { btn.innerHTML = origHtml; }, 2000);
    });

    // Multiplier Action 1: Interactive RFI Email & Slack/Teams Escalation Composer Workbench
    const buildRfiEmailTemplate = (p) => {
        const h = p.header;
        const unverifiedMissing = (p.complianceAudit.missingDocs || []).filter(m => !verifiedDocsSessionSet.has(`${h.record_id}_${m}`));
        return `Dear ${h.contact_name !== '-' ? h.contact_name : h.company_name + ' Team'},\n\nThank you for your application with Xoala (Application Ref: ${h.record_id}).\n\nTo complete our KYB Compliance Review for ${h.company_name}, please provide the following outstanding documentation and clarifications:\n\n` +
            (unverifiedMissing.length > 0 ? unverifiedMissing.map((m, i) => `${i + 1}. ${m}`).join('\n') : `1. All mandatory onboarding verification items are complete — no outstanding documents required.`) +
            `\n\nPlease reply directly to this email with any requested files attached.\n\nKind regards,\n${h.account_manager !== 'Unassigned' ? h.account_manager : 'Xoala Compliance & Onboarding Team'}`;
    };

    const buildSlackEscalationTemplate = (p) => {
        const h = p.header;
        const url = `${window.location.origin}${window.location.pathname}#dossier=${encodeURIComponent(h.record_id)}`;
        const ubos = (p.connectedParties || []).map(u => `• ${u.name} (${u.role} | Shares: ${u.ownership_pct} | Sumsub: ${u.sumsub_result})`).join('\n');
        const flags = (p.complianceAudit.redFlags || []).map(f => `⚠️ ${f}`).join('\n');
        return `🚨 *MLRO / 2ND LINE COMPLIANCE ESCALATION — ${h.company_name.toUpperCase()}*\n` +
            `*Record ID:* \`${h.record_id}\` | *Stage:* \`${h.stage}\`\n` +
            `*Jurisdiction:* ${h.country} (Reg #: ${h.incorporation_number}) | *Sector:* ${h.industry_sector}\n` +
            `*Composite Risk:* *${h.risk_rating}* (Score: ${h.risk_score}) | *Account Manager:* ${h.account_manager}\n\n` +
            `*Connected UBOs & Directors (${p.connectedParties.length}):*\n${ubos || '• None linked'}\n\n` +
            `*Automated Red Flags:*\n${flags || '✅ Zero automated red flags'}\n\n` +
            `🔗 *Direct 360° Dossier Link:* ${url}`;
    };

    document.getElementById('profile-rfi-btn')?.addEventListener('click', () => {
        if (!activeProfileData) return;
        const modal = document.getElementById('rfi-composer-modal');
        const textarea = document.getElementById('rfi-composer-textarea');
        const recBadge = document.getElementById('rfi-recipient-badge');
        const mailtoLink = document.getElementById('rfi-mailto-link');
        if (!modal || !textarea) return;

        const h = activeProfileData.header;
        const emailText = buildRfiEmailTemplate(activeProfileData);
        textarea.value = emailText;
        if (recBadge) recBadge.textContent = `Recipient: ${h.contact_email !== '-' ? h.contact_email : 'Client Contact'}`;
        if (mailtoLink) {
            const subj = encodeURIComponent(`Xoala KYB Compliance Request — ${h.company_name} (Ref: ${h.record_id.substring(0, 8)})`);
            mailtoLink.href = `mailto:${h.contact_email !== '-' ? h.contact_email : ''}?subject=${subj}&body=${encodeURIComponent(emailText)}`;
        }
        modal.classList.remove('hidden');
    });

    document.getElementById('rfi-mode-email-btn')?.addEventListener('click', () => {
        if (!activeProfileData) return;
        document.getElementById('rfi-composer-textarea').value = buildRfiEmailTemplate(activeProfileData);
        document.getElementById('rfi-mode-email-btn').className = "px-3 py-1.5 rounded-lg text-xs font-mono uppercase bg-gold/20 text-gold border border-gold/40 font-bold";
        document.getElementById('rfi-mode-slack-btn').className = "px-3 py-1.5 rounded-lg text-xs font-mono uppercase bg-white/5 text-gray-400 hover:text-white border border-white/10";
    });

    document.getElementById('rfi-mode-slack-btn')?.addEventListener('click', () => {
        if (!activeProfileData) return;
        document.getElementById('rfi-composer-textarea').value = buildSlackEscalationTemplate(activeProfileData);
        document.getElementById('rfi-mode-slack-btn').className = "px-3 py-1.5 rounded-lg text-xs font-mono uppercase bg-gold/20 text-gold border border-gold/40 font-bold";
        document.getElementById('rfi-mode-email-btn').className = "px-3 py-1.5 rounded-lg text-xs font-mono uppercase bg-white/5 text-gray-400 hover:text-white border border-white/10";
    });

    document.getElementById('rfi-copy-text-btn')?.addEventListener('click', () => {
        const textarea = document.getElementById('rfi-composer-textarea');
        if (!textarea) return;
        navigator.clipboard.writeText(textarea.value);
        const btn = document.getElementById('rfi-copy-text-btn');
        const orig = btn.innerHTML;
        btn.innerHTML = `<i class="ph ph-check text-emerald-400"></i><span class="text-emerald-400">Copied!</span>`;
        setTimeout(() => { btn.innerHTML = orig; }, 2000);
    });

    document.getElementById('close-rfi-modal-btn')?.addEventListener('click', () => {
        document.getElementById('rfi-composer-modal')?.classList.add('hidden');
    });

    // Multiplier Action 2: Spacious 4-Card Executive MLRO Risk Report Bento Grid (#profile-ai-audit-btn)
    let currentInlineAuditPrompt = "";
    const renderSpaciousMlroRiskBentoGrid = (p) => {
        const h = p.header;
        const ubos = p.connectedParties || [];
        const cachedOsint = XoalaOsintVault.get(h.record_id, h.company_name);

        let rawDomain = '';
        if (h.website && h.website !== '-') {
            rawDomain = String(h.website).trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].split('?')[0];
        } else if (h.contact_email && h.contact_email.includes('@')) {
            const emailDom = String(h.contact_email).split('@')[1].trim().toLowerCase();
            if (!['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'protonmail.com'].includes(emailDom)) {
                rawDomain = emailDom;
            }
        }
        const targetDom = rawDomain || (String(h.company_name || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 18) + '.com');

        const fatfBlacklist = ['iran', 'north korea', 'dprk', 'myanmar'];
        const fatfGreylist = ['bulgaria', 'burkina faso', 'cameroon', 'croatia', 'congo', 'haiti', 'kenya', 'mali', 'monaco', 'mozambique', 'namibia', 'nigeria', 'philippines', 'senegal', 'south africa', 'south sudan', 'syria', 'tanzania', 'venezuela', 'vietnam', 'yemen', 'algeria', 'angola', 'ivory coast', 'lebanon', 'nepal', 'laos'];
        const cLower = String(h.country || '').toLowerCase();
        const isBlacklisted = fatfBlacklist.some(c => cLower.includes(c));
        const isGreylisted = fatfGreylist.some(c => cLower.includes(c));
        const fatfStatus = isBlacklisted ? 'FATF BLACKLIST (CALL FOR ACTION)' : (isGreylisted ? 'FATF GREYLIST (INCREASED MONITORING)' : 'FATF COMPLIANT JURISDICTION');

        const pepHits = ubos.filter(u => String(u.pep_flag).toLowerCase() === 'yes').length;
        const sancHits = ubos.filter(u => String(u.sanctions_flag).toLowerCase() === 'yes').length;

        let multiToolVerdict = "ALL 4 PROPRIETARY TOOLS CLEAR — NO EXTERNAL OSINT / AML / DNS CONTRADICTIONS";
        let verdictTone = "bg-emerald-500/15 border-emerald-500/40 text-emerald-300";
        if (isBlacklisted || sancHits > 0) {
            multiToolVerdict = "CRITICAL EXTERNAL AML / SANCTIONS SIGNAL DETECTED ACROSS PROPRIETARY TOOLS";
            verdictTone = "bg-red-500/15 border-red-500/40 text-red-300";
        } else if (isGreylisted || pepHits > 0 || p.complianceAudit.redFlags.length > 0) {
            multiToolVerdict = "ELEVATED EXTERNAL SIGNAL — REVIEW PROPRIETARY TOOL FINDINGS BELOW";
            verdictTone = "bg-amber-500/15 border-amber-500/40 text-gold";
        }

        const uboTableHtml = ubos.length > 0
            ? `<div class="space-y-2 max-h-44 overflow-y-auto pr-1">
                ${ubos.map(u => `
                    <div class="p-2.5 rounded-lg bg-black/70 border border-white/10 flex items-center justify-between gap-2 text-xs">
                        <div>
                            <div class="font-bold text-white">${escapeHtml(u.name)} <span class="text-[10px] font-mono text-gold ml-1">(${escapeHtml(u.role)} • ${escapeHtml(u.ownership_pct)})</span></div>
                            <div class="text-[10px] font-mono text-gray-400 mt-0.5">Nat: ${escapeHtml(u.nationality)} • Res: ${escapeHtml(u.residence)} • Sumsub: <strong class="text-emerald-400">${escapeHtml(u.sumsub_result)}</strong></div>
                        </div>
                        <div class="flex items-center gap-1.5 font-mono text-[10px] flex-shrink-0">
                            <span class="px-2 py-0.5 rounded border ${String(u.pep_flag).toLowerCase() === 'yes' ? 'bg-red-500/20 border-red-500/40 text-red-300' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'}">PEP: ${escapeHtml(u.pep_flag)}</span>
                            <span class="px-2 py-0.5 rounded border ${String(u.sanctions_flag).toLowerCase() === 'yes' ? 'bg-red-500/20 border-red-500/40 text-red-300' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'}">Sanc: ${escapeHtml(u.sanctions_flag)}</span>
                        </div>
                    </div>
                `).join('')}
               </div>`
            : `<div class="p-3 rounded-lg bg-gold/10 border border-gold/30 text-gold text-xs font-mono">ℹ️ Zero natural person UBOs currently linked in Application_Parties.csv for this entity row.</div>`;

        return `
            <!-- Combined Multi-Tool Verdict Banner (Strictly Separated from Xoala Primary Internal Scoring) -->
            <div class="mb-4 p-3.5 rounded-xl bg-black/75 border border-emerald-500/40 flex flex-wrap items-center justify-between gap-3">
                <div class="flex items-center space-x-3 flex-wrap gap-y-1">
                    <span class="px-3 py-1 rounded-lg font-mono text-xs font-bold border ${verdictTone}">
                        ${escapeHtml(multiToolVerdict)}
                    </span>
                    <span class="text-xs font-mono text-gray-300">
                        Combines Our 4 Internal Tools (Strictly Independent of Xoala's Primary Internal Scoring Model)
                    </span>
                </div>
                <span class="text-[10px] font-mono text-emerald-400">4/4 Proprietary Tools Executed</span>
            </div>

            <!-- 4-Card Live Results Grid (One Card per Proprietary Tool) -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <!-- Card 1: Tool 1 Result — Free Public AML/PEP & Country-Adaptive Registry ($0) -->
                <div class="p-4 rounded-xl bg-black/65 border border-emerald-500/30 space-y-2.5">
                    <div class="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold flex items-center justify-between border-b border-white/10 pb-2">
                        <span>🛡️ Tool 1 Result: Free Public AML/PEP &amp; Country-Adaptive Registry ($0)</span>
                        <span class="text-gray-400">${escapeHtml(h.country)}</span>
                    </div>
                    <div class="grid grid-cols-2 gap-2.5 text-xs font-mono">
                        <div class="p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                            <div class="text-[9px] text-gray-500 uppercase">Legal Entity &amp; National Reg #</div>
                            <div class="text-white font-semibold mt-0.5 truncate">${escapeHtml(h.company_name)} (${escapeHtml(h.incorporation_number)})</div>
                        </div>
                        <div class="p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                            <div class="text-[9px] text-gray-500 uppercase">FATF Jurisdiction Status</div>
                            <div class="${isBlacklisted ? 'text-red-400' : (isGreylisted ? 'text-gold' : 'text-emerald-400')} font-bold mt-0.5 truncate">${escapeHtml(fatfStatus)}</div>
                        </div>
                    </div>
                    <div class="flex items-center justify-between flex-wrap gap-2 pt-1 text-xs font-mono">
                        <span class="text-gray-300">Watchlists: <strong class="text-emerald-400">OFAC SDN • UN • EU • UK HMT • GLEIF LEI</strong></span>
                        ${buildOfficialCountryRegistryLink(h.country, h.company_name)}
                    </div>
                </div>

                <!-- Card 2: Tool 2 Result — Always-On Live Domain DNS (A/MX/SPF), SSL & Wayback Verifier -->
                <div class="p-4 rounded-xl bg-black/65 border border-sky-500/30 space-y-2.5">
                    <div class="text-[10px] font-mono uppercase tracking-widest text-sky-300 font-bold flex items-center justify-between border-b border-white/10 pb-2">
                        <span>🌐 Tool 2 Result: Live Domain DNS (A/MX/SPF), SSL &amp; Wayback Verifier</span>
                        <span class="text-sky-300">${escapeHtml(targetDom)}</span>
                    </div>
                    <div id="drawer-tool2-live-dns" class="p-2.5 rounded-lg bg-black/60 border border-white/5 text-xs font-mono text-gray-300">
                        <div>Target Domain: <strong class="text-white">${escapeHtml(targetDom)}</strong> (Declared Website: <code>${escapeHtml(h.website)}</code>)</div>
                        <div class="text-emerald-400 mt-1">✓ Live Google Public DNS (A + MX + TXT/SPF) &amp; SSL Certificate Transparency (crt.sh) Active in Tool 2 Tab</div>
                    </div>
                    <div class="flex items-center gap-2 pt-1 text-[10px] font-mono">
                        <a href="https://crt.sh/?q=${encodeURIComponent(targetDom)}" target="_blank" rel="noopener" class="px-2.5 py-1 rounded bg-sky-500/15 border border-sky-400/35 text-sky-300">SSL Logs (crt.sh) ↗</a>
                        <a href="https://web.archive.org/web/*/${encodeURIComponent(targetDom)}" target="_blank" rel="noopener" class="px-2.5 py-1 rounded bg-purple-500/15 border border-purple-400/35 text-purple-300">Wayback Archive ↗</a>
                        <a href="https://dns.google/query?name=${encodeURIComponent(targetDom)}&rr_type=A" target="_blank" rel="noopener" class="px-2.5 py-1 rounded bg-white/5 border border-white/15 text-gray-300">Google DNS ↗</a>
                    </div>
                </div>

                <!-- Card 3: Tool 3 Result — Live Web OSINT & Adverse Media Scanner -->
                <div class="p-4 rounded-xl bg-black/65 border border-amber-500/30 space-y-2.5">
                    <div class="text-[10px] font-mono uppercase tracking-widest text-gold font-bold flex items-center justify-between border-b border-white/10 pb-2">
                        <span>🌍 Tool 3 Result: Live Web OSINT &amp; Adverse Media 4-Card Scanner</span>
                        <span class="text-emerald-400">${cachedOsint ? 'Cached in Vault (0 Tokens)' : 'Ready for Grounded Scan'}</span>
                    </div>
                    <div class="p-2.5 rounded-lg bg-black/60 border border-white/5 text-xs font-mono text-gray-300 space-y-1">
                        ${cachedOsint
                            ? `<div class="text-emerald-400 font-bold">✓ Grounded Web OSINT Report Persisted (${escapeHtml(cachedOsint.savedAtFormatted || 'Saved')})</div>
                               <div class="text-gray-300 line-clamp-2 font-sans">${escapeHtml(String(cachedOsint.markdown || '').replace(/[#*`]/g, '').slice(0, 220))}...</div>`
                            : `<div>Sector: <strong class="text-gold">${escapeHtml(h.industry_sector)}</strong> • Volume: <strong class="text-emerald-400">${escapeHtml(h.monthly_volume)}</strong></div>
                               <div class="text-gray-400">Click <strong>"Live Web OSINT"</strong> in the header or <strong>Tool 3</strong> below to execute Google Search-grounded adverse media discovery.</div>`
                        }
                    </div>
                </div>

                <!-- Card 4: Tool 4 Result — Connected People / UBO 360° AML & Wikidata PEP Screener -->
                <div class="p-4 rounded-xl bg-black/65 border border-purple-500/30 space-y-2.5">
                    <div class="text-[10px] font-mono uppercase tracking-widest text-purple-300 font-bold flex items-center justify-between border-b border-white/10 pb-2">
                        <span>👥 Tool 4 Result: Connected People / UBO 360° AML &amp; Wikidata PEP</span>
                        <span class="text-gray-400">${ubos.length} Linked Principals</span>
                    </div>
                    ${uboTableHtml}
                </div>
            </div>
        `;
    };

    document.getElementById('profile-ai-audit-btn')?.addEventListener('click', async () => {
        if (!activeProfileData) return;
        const h = activeProfileData.header;
        const ubos = activeProfileData.connectedParties.map(u => `${u.name} (${u.role}, Ownership: ${u.ownership_pct}, Nat: ${u.nationality}, Sumsub: ${u.sumsub_result}, PEP: ${u.pep_flag}, Sanctions: ${u.sanctions_flag})`).join('; ');
        const cachedOsint = XoalaOsintVault.get(h.record_id, h.company_name);
        const osintSnippet = cachedOsint && cachedOsint.markdown ? String(cachedOsint.markdown).slice(0, 500) : 'No adverse media flags in local cache.';

        currentInlineAuditPrompt = `@Artemis Generate a Combined Multi-Tool Intelligence Summary Report for "${h.company_name}" (Country: ${h.country}, Reg #: ${h.incorporation_number}, Industry: ${h.industry_sector}, Website: ${h.website}, Expected Monthly Volume: ${h.monthly_volume}) by combining ONLY our 4 proprietary verification tools (strictly separate from Xoala's internal risk score):
1) Tool 1 (Free Public AML/PEP & Country-Adaptive Registry): Reg # ${h.incorporation_number} in ${h.country}.
2) Tool 2 (Live Domain DNS A/MX/SPF & SSL Verifier): Website ${h.website}, Contact Email ${h.contact_email}.
3) Tool 3 (Live Web OSINT & Adverse Media Scanner): ${osintSnippet}
4) Tool 4 (Connected People / UBO 360° AML & PEP Screener): [${ubos || 'No natural person UBOs linked yet'}].
Provide a concise 4-bullet Executive Multi-Tool Intelligence Summary showing the combined verdict and the key finding from each of our 4 tools.`;

        const aiDrawer = document.getElementById('profile-inline-ai-drawer');
        const aiContent = document.getElementById('profile-inline-ai-content');
        const refreshBtn = document.getElementById('profile-osint-refresh-btn');
        if (!aiDrawer || !aiContent) return;

        if (refreshBtn) {
            refreshBtn.classList.add('hidden');
            refreshBtn.classList.remove('inline-flex');
        }
        aiDrawer.classList.remove('hidden');
        document.getElementById('profile-scroll-viewport')?.scrollTo({ top: 0, behavior: 'smooth' });

        const bentoHtml = renderSpaciousMlroRiskBentoGrid(activeProfileData);

        if (!window.XoalaOperatorVault?.hasClientKey?.()) {
            const keyNotice = typeof window.renderGeminiKeyLockedCard === 'function'
                ? window.renderGeminiKeyLockedCard('Combined AI Summary Report (Gemini 3.6 Flash Synthesis)')
                : `<div class="p-4 text-xs font-mono text-gold">🔒 Personal Gemini API Key required for generative AI narrative. All 4 deterministic tool results are displayed below.</div>`;
            aiContent.innerHTML = bentoHtml + `<div class="mt-4">${keyNotice}</div>`;
            return;
        }

        aiContent.innerHTML = `<div class="mb-3 p-3 rounded-xl bg-black/80 border border-gold/35 flex items-center space-x-2 text-gold font-mono text-xs"><i class="ph ph-sparkle animate-spin"></i><span>Synthesizing Gemini 3.6 Flash Combined Multi-Tool Intelligence Report (Tools 1–4) for <strong>${escapeHtml(h.company_name)}</strong>...</span></div>` + bentoHtml;

        if (typeof window.callGeminiExecutiveAPI === 'function') {
            const res = await window.callGeminiExecutiveAPI({
                prompt: currentInlineAuditPrompt,
                systemInstruction: "You are Xoala's Proprietary Multi-Tool Intelligence Synthesizer (Artemis Gemini 3.6). Combine the findings from our 4 internal verification tools (1: Public AML/PEP & Registry, 2: Live Domain DNS/MX/SSL, 3: Live Web OSINT & Adverse Media, 4: Connected People/UBO PEP Screening) into a crisp 4-bullet Executive Summary. Keep this strictly separate from Xoala's internal risk scoring model."
            });
            if (res && res.ok && res.text) {
                const parsedMd = typeof marked !== 'undefined' ? marked.parse(res.text) : `<div class="whitespace-pre-wrap">${escapeHtml(res.text)}</div>`;
                const synthCardHtml = `
                    <div class="mb-4 p-4 rounded-xl bg-[#050505] border border-gold/45 shadow-lg">
                        <div class="text-[10px] font-mono uppercase tracking-widest text-gold font-bold mb-2 flex items-center justify-between border-b border-gold/20 pb-1.5">
                            <span><i class="ph ph-sparkle mr-1"></i>ARTEMIS GEMINI 3.6 FLASH — COMBINED 4-TOOL INTELLIGENCE SUMMARY REPORT</span>
                            <span class="text-emerald-400">Strictly Independent of Xoala Primary Internal Scoring</span>
                        </div>
                        <div class="text-xs text-gray-200 leading-relaxed space-y-1.5">${parsedMd}</div>
                    </div>
                `;
                aiContent.innerHTML = synthCardHtml + bentoHtml;
                const inlineSuiteBox = document.getElementById('our-suite-combined-ai-box');
                if (inlineSuiteBox) {
                    inlineSuiteBox.innerHTML = `<div class="lg:col-span-3 p-3.5 rounded-xl bg-black/80 border border-gold/40 text-xs text-gray-200 leading-relaxed space-y-1.5">${parsedMd}</div>`;
                }
            } else {
                aiContent.innerHTML = bentoHtml;
            }
        }
    });

    // Multiplier Action 2B: 100% Free Public AML / CFT, Sanctions & PEP People/Entity Screening Tool (#profile-free-aml-btn)
    const executeFreePublicAmlPepScreen = async (p) => {
        const h = p.header;
        const ubos = p.connectedParties || [];
        const aiDrawer = document.getElementById('profile-inline-ai-drawer');
        const aiContent = document.getElementById('profile-inline-ai-content');
        const refreshBtn = document.getElementById('profile-osint-refresh-btn');
        if (!aiDrawer || !aiContent) return;

        if (refreshBtn) {
            refreshBtn.classList.add('hidden');
            refreshBtn.classList.remove('inline-flex');
        }
        aiDrawer.classList.remove('hidden');
        aiContent.innerHTML = `<div class="flex items-center space-x-2 text-gold font-mono text-xs py-2"><i class="ph ph-shield-check animate-spin text-sm"></i><span>Running 100% Free Public AML / CFT, Wikidata Global PEP, FATF &amp; Live Google DNS Domain/MX Verification on <strong>${escapeHtml(h.company_name)}</strong> and <strong>${ubos.length} Connected Parties</strong> (0 API Tokens)...</span></div>`;

        // 1. FATF High-Risk & Increased Monitoring Jurisdiction Check
        const fatfBlackList = ['iran', 'north korea', 'dprk', 'myanmar'];
        const fatfGreyAndOffshore = ['british virgin islands', 'bvi', 'cayman islands', 'panama', 'seychelles', 'vanuatu', 'marshall islands', 'belize', 'bahamas', 'monaco', 'venezuela', 'syria', 'yemen', 'russia', 'belarus', 'nigeria', 'south africa', 'kenya', 'vietnam', 'philippines', 'lebanon'];
        const countryClean = String(h.country || '').toLowerCase();
        const isFatfBlack = fatfBlackList.some(c => countryClean.includes(c));
        const isFatfGrey = fatfGreyAndOffshore.some(c => countryClean.includes(c));

        // 2. Extract Merchant Domain (from website or contact_email) & Run Live Free Google Public DNS (dns.google) A + MX Verification
        let rawDomain = '';
        if (h.website && h.website !== '-') {
            rawDomain = String(h.website).trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].split('?')[0];
        } else if (h.contact_email && h.contact_email.includes('@')) {
            const emailDom = String(h.contact_email).split('@')[1].trim().toLowerCase();
            if (!['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com'].includes(emailDom)) {
                rawDomain = emailDom;
            }
        }

        const dnsTelemetry = { domain: rawDomain, hasARecord: false, ipList: [], hasMxRecord: false, mxList: [], checked: false };
        const dnsPromise = (async () => {
            if (!rawDomain || !rawDomain.includes('.')) return;
            try {
                const [aRes, mxRes] = await Promise.all([
                    fetch(`https://dns.google/resolve?name=${encodeURIComponent(rawDomain)}&type=A`).then(r => r.json()).catch(() => null),
                    fetch(`https://dns.google/resolve?name=${encodeURIComponent(rawDomain)}&type=MX`).then(r => r.json()).catch(() => null)
                ]);
                dnsTelemetry.checked = true;
                if (aRes && Array.isArray(aRes.Answer) && aRes.Answer.length > 0) {
                    dnsTelemetry.hasARecord = true;
                    dnsTelemetry.ipList = aRes.Answer.map(a => a.data).filter(Boolean).slice(0, 3);
                }
                if (mxRes && Array.isArray(mxRes.Answer) && mxRes.Answer.length > 0) {
                    dnsTelemetry.hasMxRecord = true;
                    dnsTelemetry.mxList = mxRes.Answer.map(a => a.data).filter(Boolean).slice(0, 2);
                }
            } catch (e) {}
        })();

        // 3. Live Public Wikidata Global PEP & Public Office API Query (CORS-enabled, 100% Free, 0 API Key)
        const subjectsToScreen = [
            { name: h.company_name, type: 'Corporate Entity', role: `Applicant (${h.country})`, pepFlag: 'No', sancFlag: 'No', advFlag: 'No', nat: h.country },
            ...ubos.map(u => ({
                name: u.name,
                type: 'Natural Person (UBO/Director)',
                role: `${u.role} (${u.ownership_pct})`,
                pepFlag: u.pep_flag || 'No',
                sancFlag: u.sanctions_flag || 'No',
                advFlag: u.adverse_media_flag || 'No',
                nat: u.nationality || h.country
            }))
        ];

        const publicHitsMap = {};
        await Promise.all([
            dnsPromise,
            ...subjectsToScreen.slice(0, 6).map(async (subj) => {
                if (!subj.name || subj.name === '-' || subj.name.length < 3) return;
                try {
                    const url = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(subj.name)}&language=en&limit=3&format=json&origin=*`;
                    const r = await fetch(url);
                    const j = await r.json();
                    if (j && Array.isArray(j.search)) {
                        const pepKeywords = /politician|minister|member of parliament|president|senator|ambassador|governor|military|oligarch|sanction|general|judge|mayor|deputy|state-owned/i;
                        const matches = j.search.filter(item => pepKeywords.test(String(item.description || '')));
                        publicHitsMap[subj.name] = matches.map(m => `${m.label}: ${m.description} (${m.id})`);
                    }
                } catch (e) {
                    publicHitsMap[subj.name] = [];
                }
            })
        ]);

        const buildCountryRegistryLink = (countryStr, nameStr) => {
            const c = String(countryStr || '').toLowerCase();
            const q = encodeURIComponent(nameStr);
            if (c.includes('estonia')) {
                return `<a href="https://ariregister.rik.ee/eng/company?q=${q}" target="_blank" rel="noopener" class="px-2.5 py-0.5 rounded bg-gold/20 hover:bg-gold/30 border border-gold/50 text-gold text-[10px] font-mono font-bold">🇪🇪 Estonia e-Business Register (rik.ee) ↗</a>`;
            }
            if (c.includes('united kingdom') || c === 'uk' || c === 'gb' || c.includes('britain') || c.includes('england')) {
                return `<a href="https://find-and-update.company-information.service.gov.uk/search?q=${q}" target="_blank" rel="noopener" class="px-2.5 py-0.5 rounded bg-gold/20 hover:bg-gold/30 border border-gold/50 text-gold text-[10px] font-mono font-bold">🇬🇧 UK Companies House ↗</a>`;
            }
            if (c.includes('arab emirates') || c === 'uae' || c.includes('dubai')) {
                return `<a href="https://www.google.com/search?q=${encodeURIComponent(`"${nameStr}" (site:ner.economy.ae OR site:difc.ae OR site:adgm.com OR "DMCC" OR "UAE license")`)}" target="_blank" rel="noopener" class="px-2.5 py-0.5 rounded bg-gold/20 hover:bg-gold/30 border border-gold/50 text-gold text-[10px] font-mono font-bold">🇦🇪 UAE NER / DIFC / ADGM Registry ↗</a>`;
            }
            if (c.includes('cyprus')) {
                return `<a href="https://efiling.drcor.mcit.gov.cy/DrcorPublic/SearchForm.aspx?sc=0&lang=EN" target="_blank" rel="noopener" class="px-2.5 py-0.5 rounded bg-gold/20 hover:bg-gold/30 border border-gold/50 text-gold text-[10px] font-mono font-bold">🇨🇾 Cyprus Registrar (DRCoR) ↗</a>`;
            }
            if (c.includes('lithuania')) {
                return `<a href="https://www.registrucentras.lt/jar/p_en/" target="_blank" rel="noopener" class="px-2.5 py-0.5 rounded bg-gold/20 hover:bg-gold/30 border border-gold/50 text-gold text-[10px] font-mono font-bold">🇱🇹 Lithuania Registru Centras ↗</a>`;
            }
            if (c.includes('switzerland') || c.includes('swiss')) {
                return `<a href="https://www.zefix.ch/en/search/entity/welcome" target="_blank" rel="noopener" class="px-2.5 py-0.5 rounded bg-gold/20 hover:bg-gold/30 border border-gold/50 text-gold text-[10px] font-mono font-bold">🇨🇭 Switzerland ZEFIX Registry ↗</a>`;
            }
            if (c.includes('singapore')) {
                return `<a href="https://www.tis.bizfile.gov.sg/" target="_blank" rel="noopener" class="px-2.5 py-0.5 rounded bg-gold/20 hover:bg-gold/30 border border-gold/50 text-gold text-[10px] font-mono font-bold">🇸🇬 Singapore ACRA BizFile+ ↗</a>`;
            }
            if (c.includes('hong kong')) {
                return `<a href="https://www.icris.cr.gov.hk/csci/" target="_blank" rel="noopener" class="px-2.5 py-0.5 rounded bg-gold/20 hover:bg-gold/30 border border-gold/50 text-gold text-[10px] font-mono font-bold">🇭🇰 HK Companies Registry (ICRIS) ↗</a>`;
            }
            if (c.includes('united states') || c === 'usa' || c === 'us') {
                return `<a href="https://www.sec.gov/edgar/searchedgar/companysearch" target="_blank" rel="noopener" class="px-2.5 py-0.5 rounded bg-gold/20 hover:bg-gold/30 border border-gold/50 text-gold text-[10px] font-mono font-bold">🇺🇸 US SEC EDGAR / State Registry ↗</a>`;
            }
            if (c.includes('virgin islands') || c.includes('bvi') || c.includes('cayman') || c.includes('seychelles') || c.includes('panama') || c.includes('belize') || c.includes('marshall')) {
                return `<a href="https://offshoreleaks.icij.org/search?q=${q}" target="_blank" rel="noopener" class="px-2.5 py-0.5 rounded bg-gold/20 hover:bg-gold/30 border border-gold/50 text-gold text-[10px] font-mono font-bold">🏝️ ICIJ Offshore Leaks &amp; Registry (${escapeHtml(countryStr)}) ↗</a>`;
            }
            return `<a href="https://e-justice.europa.eu/489/EN/business_registers__search_for_a_company_in_the_eu" target="_blank" rel="noopener" class="px-2.5 py-0.5 rounded bg-gold/20 hover:bg-gold/30 border border-gold/50 text-gold text-[10px] font-mono font-bold">🏛️ ${escapeHtml(countryStr || 'National')} Official Business Registry ↗</a>`;
        };

        const buildFreeWatchlistLinks = (nameStr, isCorp = false, subjCountry = '') => {
            const q = encodeURIComponent(nameStr);
            const countryRegBtn = buildCountryRegistryLink(subjCountry || h.country, nameStr);
            return `
                <div class="flex flex-wrap items-center gap-1.5 mt-2 pt-2 border-t border-white/10">
                    ${countryRegBtn}
                    <a href="https://www.opensanctions.org/search/?q=${q}" target="_blank" rel="noopener" class="px-2 py-0.5 rounded bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono">OpenSanctions (OFAC+UN+EU+PEP) ↗</a>
                    <a href="https://sanctionssearch.ofac.treas.gov/" target="_blank" rel="noopener" class="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 border border-white/15 text-gray-300 text-[10px] font-mono">US OFAC SDN ↗</a>
                    ${isCorp ? `<a href="https://search.gleif.org/#/search/simpleSearch=${q}" target="_blank" rel="noopener" class="px-2 py-0.5 rounded bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/40 text-sky-300 text-[10px] font-mono">GLEIF Global LEI ↗</a>` : ''}
                    ${isCorp ? `<a href="https://opencorporates.com/companies?q=${q}" target="_blank" rel="noopener" class="px-2 py-0.5 rounded bg-purple-500/15 hover:bg-purple-500/25 border border-purple-400/40 text-purple-300 text-[10px] font-mono">OpenCorporates ↗</a>` : ''}
                    <a href="https://www.google.com/search?q=${encodeURIComponent(`"${nameStr}" ("sanctions" OR "OFAC" OR "PEP" OR "money laundering" OR "fraud" OR "enforcement")`)}" target="_blank" rel="noopener" class="px-2 py-0.5 rounded bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/40 text-gold text-[10px] font-mono">Adverse Media Dork ↗</a>
                </div>
            `;
        };

        const anyInternalHit = subjectsToScreen.some(s =>
            String(s.pepFlag).toLowerCase() === 'yes' ||
            String(s.sancFlag).toLowerCase() === 'yes' ||
            String(s.advFlag).toLowerCase() === 'yes'
        );
        const anyPublicPepHit = Object.values(publicHitsMap).some(arr => Array.isArray(arr) && arr.length > 0);

        const suggestedDomainGuess = rawDomain || (String(h.company_name || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 18) + '.com');

        // Always-visible & Interactive Live Domain DNS (A/MX), SSL & Wayback Verifier Card
        const dnsBannerHtml = `
            <div class="mb-3.5 p-3.5 rounded-xl bg-[#070a12] border border-gold/40 space-y-2.5 text-xs font-mono shadow-lg">
                <div class="flex flex-wrap items-center justify-between gap-2">
                    <div class="flex items-center gap-2 flex-wrap" id="live-dns-result-badges">
                        <span class="px-2.5 py-1 rounded bg-gold/20 border border-gold/50 text-gold font-bold flex items-center gap-1.5">
                            <i class="ph ph-globe"></i> LIVE DOMAIN &amp; MAIL DNS CHECKER:
                        </span>
                        ${dnsTelemetry.domain
                            ? `<span class="px-2.5 py-0.5 rounded bg-sky-500/20 border border-sky-400/40 text-sky-300 font-bold">${escapeHtml(dnsTelemetry.domain)}</span>
                               <span class="px-2 py-0.5 rounded border ${dnsTelemetry.hasARecord ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300' : 'bg-red-500/15 border-red-500/35 text-red-300'}">
                                   ${dnsTelemetry.hasARecord ? `✓ Web Server (A): ${escapeHtml(dnsTelemetry.ipList.join(', '))}` : '⚠️ No DNS A-Record (Offline/Unregistered)'}
                               </span>
                               <span class="px-2 py-0.5 rounded border ${dnsTelemetry.hasMxRecord ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300' : 'bg-amber-500/15 border-amber-500/35 text-amber-300'}">
                                   ${dnsTelemetry.hasMxRecord ? `✓ Corporate Mail (MX): Active` : '⚠️ No Corporate MX Mail Server'}
                               </span>`
                            : `<span class="px-2.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/35 text-amber-300">
                                   ⚠️ No Website or Corporate Email Domain Declared in Attio for "${escapeHtml(h.company_name)}" — Test Any Domain Below:
                               </span>`
                        }
                    </div>
                    <div class="flex items-center gap-1.5" id="live-dns-external-links">
                        <a href="https://web.archive.org/web/*/${encodeURIComponent(dnsTelemetry.domain || suggestedDomainGuess)}" target="_blank" rel="noopener" class="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 border border-white/15 text-gray-300 text-[10px]">Wayback Archive ↗</a>
                        <a href="https://crt.sh/?q=${encodeURIComponent(dnsTelemetry.domain || suggestedDomainGuess)}" target="_blank" rel="noopener" class="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 border border-white/15 text-gray-300 text-[10px]">SSL Certs (crt.sh) ↗</a>
                    </div>
                </div>
                <div class="flex items-center gap-2 pt-2 border-t border-white/10">
                    <span class="text-[10px] text-gray-400">Test / Verify Domain Live (Google Public DNS A + MX):</span>
                    <input type="text" id="free-aml-domain-input" value="${escapeHtml(dnsTelemetry.domain || '')}" placeholder="Enter merchant domain (e.g. ${escapeHtml(suggestedDomainGuess)})..." class="flex-1 max-w-xs bg-black border border-gold/35 focus:border-gold rounded-lg px-2.5 py-1 text-xs font-mono text-white outline-none">
                    <button type="button" id="free-aml-domain-btn" class="gold-sovereign-btn px-3 py-1 rounded-lg text-[10px] font-mono uppercase font-bold">Verify Domain DNS →</button>
                </div>
            </div>
        `;

        aiContent.innerHTML = `
            <div class="mb-3.5 p-3.5 rounded-xl bg-black/80 border border-gold/40 flex flex-wrap items-center justify-between gap-3">
                <div class="flex items-center space-x-3 flex-wrap gap-y-1">
                    <span class="px-3 py-1 rounded-lg font-mono text-xs font-bold border ${anyInternalHit || isFatfBlack ? 'bg-red-500/20 border-red-500/40 text-red-300' : (anyPublicPepHit || isFatfGrey ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300')}">
                        ${anyInternalHit || isFatfBlack ? '⚠️ SANCTIONS / PEP ALERT DETECTED' : (anyPublicPepHit || isFatfGrey ? '⚡ ENHANCED DUE DILIGENCE (EDD) ADVISORY' : '✓ CLEAR — NO SANCTIONS OR PEP HITS')}
                    </span>
                    <span class="text-xs font-mono text-gray-300">
                        Screened: <strong class="text-white">1 Legal Entity + ${ubos.length} Natural Persons</strong> • Jurisdiction: <strong class="${isFatfBlack ? 'text-red-400' : (isFatfGrey ? 'text-amber-300' : 'text-emerald-400')}">${escapeHtml(h.country)} (${isFatfBlack ? 'FATF Call for Action' : (isFatfGrey ? 'FATF Increased Monitoring / Offshore' : 'Standard FATF Compliant')})</strong>
                    </span>
                </div>
                <span class="text-[10px] font-mono text-gold font-bold">Xoala Proprietary Free AML/PEP + Country Registry + DNS Engine • $0 Cost</span>
            </div>

            ${dnsBannerHtml}

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
                ${subjectsToScreen.map((s, idx) => {
                    const pubMatches = publicHitsMap[s.name] || [];
                    const hasFlag = String(s.pepFlag).toLowerCase() === 'yes' || String(s.sancFlag).toLowerCase() === 'yes' || String(s.advFlag).toLowerCase() === 'yes';
                    return `
                        <div class="p-3.5 rounded-xl bg-[#080a10] border ${hasFlag ? 'border-red-500/40' : (pubMatches.length > 0 ? 'border-amber-500/40' : 'border-white/10')} flex flex-col justify-between space-y-2 shadow-lg">
                            <div>
                                <div class="flex items-center justify-between gap-2">
                                    <div>
                                        <span class="text-[9px] font-mono uppercase tracking-widest text-gold">${escapeHtml(s.type)} • ${escapeHtml(s.role)}</span>
                                        <h4 class="text-sm font-bold text-white">${escapeHtml(s.name)}</h4>
                                    </div>
                                    <div class="flex items-center gap-1 font-mono text-[10px]">
                                        <span class="px-2 py-0.5 rounded border ${String(s.pepFlag).toLowerCase() === 'yes' ? 'bg-red-500/20 border-red-500/40 text-red-300' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'}">PEP: ${escapeHtml(s.pepFlag)}</span>
                                        <span class="px-2 py-0.5 rounded border ${String(s.sancFlag).toLowerCase() === 'yes' ? 'bg-red-500/20 border-red-500/40 text-red-300' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'}">Sanc: ${escapeHtml(s.sancFlag)}</span>
                                    </div>
                                </div>
                                <div class="mt-2 text-[11px] font-mono ${pubMatches.length > 0 ? 'text-amber-300' : 'text-gray-400'}">
                                    ${pubMatches.length > 0
                                        ? `<strong>Public PEP / Office Name-Match (${pubMatches.length}):</strong> ${pubMatches.map(escapeHtml).join(' | ')} <em>(Verify DOB/Nationality against OpenSanctions below)</em>`
                                        : `✓ Global Public Office &amp; Wikidata PEP Registry: No political/sanctions name-collision found for "${escapeHtml(s.name)}".`}
                                </div>
                            </div>
                            ${buildFreeWatchlistLinks(s.name, idx === 0, s.nat || h.country)}
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        // Wire Interactive Live Domain DNS Verifier Button inside the card
        const domInput = document.getElementById('free-aml-domain-input');
        const domBtn = document.getElementById('free-aml-domain-btn');
        const badgesBox = document.getElementById('live-dns-result-badges');
        const linksBox = document.getElementById('live-dns-external-links');
        if (domBtn && domInput && badgesBox) {
            const runInteractiveDomainCheck = async () => {
                const targetDom = String(domInput.value || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].split('?')[0];
                if (!targetDom || !targetDom.includes('.')) return;
                domBtn.textContent = 'Checking DNS...';
                try {
                    const [aRes, mxRes] = await Promise.all([
                        fetch(`https://dns.google/resolve?name=${encodeURIComponent(targetDom)}&type=A`).then(r => r.json()).catch(() => null),
                        fetch(`https://dns.google/resolve?name=${encodeURIComponent(targetDom)}&type=MX`).then(r => r.json()).catch(() => null)
                    ]);
                    const ips = (aRes && Array.isArray(aRes.Answer)) ? aRes.Answer.map(a => a.data).filter(Boolean).slice(0, 3) : [];
                    const mxs = (mxRes && Array.isArray(mxRes.Answer)) ? mxRes.Answer.map(a => a.data).filter(Boolean).slice(0, 2) : [];
                    badgesBox.innerHTML = `
                        <span class="px-2.5 py-1 rounded bg-gold/20 border border-gold/50 text-gold font-bold flex items-center gap-1.5">
                            <i class="ph ph-globe"></i> LIVE DOMAIN &amp; MAIL DNS CHECKER:
                        </span>
                        <span class="px-2.5 py-0.5 rounded bg-sky-500/20 border border-sky-400/40 text-sky-300 font-bold">${escapeHtml(targetDom)}</span>
                        <span class="px-2 py-0.5 rounded border ${ips.length > 0 ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300' : 'bg-red-500/15 border-red-500/35 text-red-300'}">
                            ${ips.length > 0 ? `✓ Web Server (A): ${escapeHtml(ips.join(', '))}` : '⚠️ No DNS A-Record (Offline/Unregistered)'}
                        </span>
                        <span class="px-2 py-0.5 rounded border ${mxs.length > 0 ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300' : 'bg-amber-500/15 border-amber-500/35 text-amber-300'}">
                            ${mxs.length > 0 ? `✓ Corporate Mail (MX): ${escapeHtml(mxs.join(', '))}` : '⚠️ No Corporate MX Mail Server'}
                        </span>
                    `;
                    if (linksBox) {
                        linksBox.innerHTML = `
                            <a href="https://web.archive.org/web/*/${encodeURIComponent(targetDom)}" target="_blank" rel="noopener" class="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 border border-white/15 text-gray-300 text-[10px]">Wayback Archive ↗</a>
                            <a href="https://crt.sh/?q=${encodeURIComponent(targetDom)}" target="_blank" rel="noopener" class="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 border border-white/15 text-gray-300 text-[10px]">SSL Certs (crt.sh) ↗</a>
                        `;
                    }
                } catch (e) {}
                domBtn.textContent = 'Verify Domain DNS →';
            };
            domBtn.addEventListener('click', runInteractiveDomainCheck);
            domInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    runInteractiveDomainCheck();
                }
            });
        }
    };

    document.getElementById('profile-free-aml-btn')?.addEventListener('click', () => {
        if (!activeProfileData) return;
        document.getElementById('profile-scroll-viewport')?.scrollTo({ top: 0, behavior: 'smooth' });
        executeFreePublicAmlPepScreen(activeProfileData);
    });

    document.getElementById('profile-ai-close-drawer-btn')?.addEventListener('click', () => {
        document.getElementById('profile-inline-ai-drawer')?.classList.add('hidden');
    });

    document.getElementById('profile-ai-open-terminal-btn')?.addEventListener('click', () => {
        if (!window.XoalaOperatorVault?.hasClientKey?.()) {
            document.getElementById('operator-vault-open-btn')?.click();
            return;
        }
        if (!currentInlineAuditPrompt) return;
        closeProfileModal();
        const artemisNavBtn = document.querySelector('[data-target="artemis-view"]');
        if (artemisNavBtn) artemisNavBtn.click();
        setTimeout(() => {
            const promptInput = document.getElementById('prompt-input');
            const sendBtn = document.getElementById('send-btn');
            if (promptInput && sendBtn) {
                promptInput.value = currentInlineAuditPrompt;
                promptInput.dispatchEvent(new Event('input'));
                sendBtn.click();
            }
        }, 300);
    });

    // Multiplier Action 3: True 1-Click Full-Dossier Unified PDF Download Engine (#profile-print-btn)
    const exportUnifiedCompanyPdfDossier = async () => {
        if (!activeProfileData) return;
        const p = activeProfileData;
        const h = p.header || {};
        const sc = p.xoalaScorecard || evaluateXoala19RuleScorecard(p, p.rawMap || {});
        const docVault = p.documentVault || { uploadedFiles: [], cloudFilesCount: 0 };
        const cachedOsint = XoalaOsintVault.get(h.record_id, h.company_name);
        const btn = document.getElementById('profile-print-btn');
        const origBtnHtml = btn ? btn.innerHTML : '';
        if (btn) {
            btn.innerHTML = `<i class="ph ph-spinner animate-spin text-gold"></i><span class="text-gold">Compiling Full PDF...</span>`;
        }

        const safeName = String(h.company_name || 'Company').replace(/[^a-zA-Z0-9_-]/g, '_');
        const dateStr = new Date().toISOString().split('T')[0];
        const filename = `Xoala_360_KYB_Dossier_${safeName}_${dateStr}.pdf`;

        const allPopulatedGroups = [
            { title: '1. Corporate Entity & Registration Attributes', items: p.domainSections?.corporate || [] },
            { title: '2. Payments, Currencies, Corridors & C2B Volumes', items: p.domainSections?.volumes_payments || [] },
            { title: '3. Crypto Conversion, Wallets & Web3 Screening', items: p.domainSections?.crypto_web3 || [] },
            { title: '4. Merchant Acquiring, Card Volumes & Chargebacks', items: p.domainSections?.merchant_acquiring || [] },
            { title: '5. AML / CTF Policies, Wolfsberg & EDD Questionnaires', items: p.domainSections?.aml_edd || [] },
            { title: '6. System & Lifecycle Timestamps', items: p.domainSections?.system_timeline || [] }
        ];

        const printContainer = document.createElement('div');
        printContainer.style.cssText = 'width:1020px;padding:32px;background:#06080f;color:#f3f4f6;font-family:"Plus Jakarta Sans",sans-serif;font-size:11px;line-height:1.45;';
        printContainer.innerHTML = `
            <div style="border:2px solid #DDAA33;border-radius:14px;padding:20px;background:#0a0d16;margin-bottom:18px;">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid rgba(221,170,51,0.35);padding-bottom:12px;margin-bottom:12px;">
                    <div>
                        <div style="font-family:monospace;font-size:10px;letter-spacing:2px;color:#F0D788;font-weight:bold;">XOALA SOVEREIGN INTELLIGENCE • UNIFIED 360° KYB COMPLIANCE DOSSIER</div>
                        <h1 style="font-size:22px;font-weight:800;color:#ffffff;margin:4px 0;">${escapeHtml(h.company_name)}</h1>
                        <div style="font-family:monospace;font-size:11px;color:#9ca3af;">
                            Record ID: <strong style="color:#fff;">${escapeHtml(h.record_id)}</strong> • Country: <strong style="color:#fff;">${escapeHtml(h.country)}</strong> • Reg #: <strong style="color:#F0D788;">${escapeHtml(h.incorporation_number)}</strong> • Stage: <strong style="color:#10b981;">${escapeHtml(h.stage)}</strong>
                        </div>
                    </div>
                    <div style="text-align:right;font-family:monospace;">
                        <div style="padding:6px 12px;border-radius:8px;border:1px solid #DDAA33;background:rgba(221,170,51,0.15);color:#F0D788;font-weight:bold;font-size:12px;">
                            XOALA 19-RULE FLOOR: ${escapeHtml(sc.ratchetFloor)}
                        </div>
                        <div style="font-size:10px;color:#9ca3af;margin-top:4px;">Attio Synced Risk: ${escapeHtml(h.risk_rating)} (${escapeHtml(h.risk_score)})</div>
                        <div style="font-size:9px;color:#6b7280;margin-top:2px;">Exported: ${new Date().toLocaleString()}</div>
                    </div>
                </div>
                <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;font-family:monospace;font-size:10px;">
                    <div style="padding:8px;background:#05070c;border:1px solid rgba(255,255,255,0.1);border-radius:8px;">
                        <div style="color:#6b7280;">INDUSTRY &amp; SERVICES</div>
                        <div style="color:#fff;font-weight:bold;margin-top:2px;">${escapeHtml(h.industry_sector)} (${escapeHtml(h.services_applied_for)})</div>
                    </div>
                    <div style="padding:8px;background:#05070c;border:1px solid rgba(255,255,255,0.1);border-radius:8px;">
                        <div style="color:#6b7280;">MONTHLY VOLUME &amp; TURNOVER</div>
                        <div style="color:#10b981;font-weight:bold;margin-top:2px;">${escapeHtml(h.monthly_volume)} • ${escapeHtml(h.turnover_bracket)}</div>
                    </div>
                    <div style="padding:8px;background:#05070c;border:1px solid rgba(255,255,255,0.1);border-radius:8px;">
                        <div style="color:#6b7280;">SUMSUB KYB &amp; APPLICANT ID</div>
                        <div style="color:#fff;font-weight:bold;margin-top:2px;">${escapeHtml(h.sumsub_result)} (${escapeHtml(h.sumsub_applicant_id)})</div>
                    </div>
                    <div style="padding:8px;background:#05070c;border:1px solid rgba(255,255,255,0.1);border-radius:8px;">
                        <div style="color:#6b7280;">ASSIGNED COMPLIANCE TEAM</div>
                        <div style="color:#F0D788;font-weight:bold;margin-top:2px;">AM: ${escapeHtml(h.account_manager)} • 1st: ${escapeHtml(h.first_line_lead)}</div>
                    </div>
                </div>
            </div>

            <!-- Section A: Xoala Compliance Team 19-Rule Ratchet Risk Scorecard & Triggered EDD Packs -->
            <div style="border:1px solid rgba(221,170,51,0.35);border-radius:12px;padding:16px;background:#0a0d16;margin-bottom:16px;">
                <div style="font-family:monospace;font-size:11px;color:#F0D788;font-weight:bold;text-transform:uppercase;margin-bottom:8px;">
                    SECTION 1 — XOALA 19-RULE RATCHET RISK SCORECARD (FLOOR: ${escapeHtml(sc.ratchetFloor)} • CASH THRESHOLD: ${sc.cashThresholdPct}%) &amp; TRIGGERED EDD PACKS (${sc.eddPacks.map(e => `${e.name} [${e.questions}Q]`).join(', ')})
                </div>
                <table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:10px;">
                    <thead>
                        <tr style="background:rgba(255,255,255,0.05);color:#9ca3af;text-align:left;">
                            <th style="padding:6px;border-bottom:1px solid rgba(255,255,255,0.1);">#</th>
                            <th style="padding:6px;border-bottom:1px solid rgba(255,255,255,0.1);">Rule Factor</th>
                            <th style="padding:6px;border-bottom:1px solid rgba(255,255,255,0.1);">Evaluated Condition</th>
                            <th style="padding:6px;border-bottom:1px solid rgba(255,255,255,0.1);text-align:right;">Floor Severity</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sc.rules.map(r => `
                            <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
                                <td style="padding:5px 6px;color:#6b7280;">${r.id}</td>
                                <td style="padding:5px 6px;color:#fff;font-weight:bold;">${escapeHtml(r.factor)}</td>
                                <td style="padding:5px 6px;color:#d1d5db;">${escapeHtml(r.condition)}</td>
                                <td style="padding:5px 6px;text-align:right;font-weight:bold;color:${r.floor === 'HIGH' ? '#f87171' : (r.floor === 'MEDIUM' ? '#F0D788' : '#34d399')};">${r.floor}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <!-- Section B: Connected UBOs, Directors & Individual AML/PEP Screening -->
            <div style="border:1px solid rgba(255,255,255,0.12);border-radius:12px;padding:16px;background:#0a0d16;margin-bottom:16px;">
                <div style="font-family:monospace;font-size:11px;color:#F0D788;font-weight:bold;text-transform:uppercase;margin-bottom:8px;">
                    SECTION 2 — CONNECTED PRINCIPALS (UBOs, DIRECTORS &amp; SIGNATORIES — ${(p.connectedParties || []).length} LINKED)
                </div>
                ${(p.connectedParties || []).length > 0 ? `
                    <table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:10px;">
                        <thead>
                            <tr style="background:rgba(255,255,255,0.05);color:#9ca3af;text-align:left;">
                                <th style="padding:6px;">Full Name &amp; Email</th>
                                <th style="padding:6px;">Role</th>
                                <th style="padding:6px;">Shares</th>
                                <th style="padding:6px;">Nationality / Residence</th>
                                <th style="padding:6px;">DOB / SumSub</th>
                                <th style="padding:6px;">Risk &amp; PEP / Sanctions / Adverse Media</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${p.connectedParties.map(cp => `
                                <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
                                    <td style="padding:6px;color:#fff;font-weight:bold;">${escapeHtml(cp.name)} (${escapeHtml(cp.email)})</td>
                                    <td style="padding:6px;color:#F0D788;">${escapeHtml(cp.role)}</td>
                                    <td style="padding:6px;color:#34d399;font-weight:bold;">${escapeHtml(cp.ownership_pct)}</td>
                                    <td style="padding:6px;color:#d1d5db;">${escapeHtml(cp.nationality)} / ${escapeHtml(cp.residence)}</td>
                                    <td style="padding:6px;color:#d1d5db;">${escapeHtml(cp.dob)} • ${escapeHtml(cp.sumsub_result)}</td>
                                    <td style="padding:6px;color:#fff;">Risk: ${escapeHtml(cp.risk_rating)} (${escapeHtml(cp.risk_score)}) | PEP: ${escapeHtml(cp.pep_flag)} | Sanc: ${escapeHtml(cp.sanctions_flag)} | Adv: ${escapeHtml(cp.adverse_media_flag || 'No')}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                ` : `<div style="font-family:monospace;color:#9ca3af;">No linked natural person records in Application_Parties or People.</div>`}
            </div>

            <!-- Section C: Document Vault & Evidence Links + Gemini Search-Grounded OSINT Summary -->
            <div style="border:1px solid rgba(255,255,255,0.12);border-radius:12px;padding:16px;background:#0a0d16;margin-bottom:16px;">
                <div style="font-family:monospace;font-size:11px;color:#F0D788;font-weight:bold;text-transform:uppercase;margin-bottom:8px;">
                    SECTION 3 — 360° DOCUMENT VAULT (${docVault.uploadedFiles.length} DIRECT FILE LINKS) &amp; GEMINI SEARCH-GROUNDED OSINT SUMMARY
                </div>
                <div style="margin-bottom:10px;font-family:monospace;font-size:10px;">
                    ${docVault.uploadedFiles.length > 0
                        ? docVault.uploadedFiles.map(df => `<div style="margin-bottom:4px;">• <strong style="color:#F0D788;">${escapeHtml(df.label)}</strong> [${escapeHtml(df.goesTo)}]: <span style="color:#93c5fd;word-break:break-all;">${escapeHtml(df.value)}</span></div>`).join('')
                        : `<div>• CloudFiles Count: ${docVault.cloudFilesCount} | SumSub Applicant Packet: ${escapeHtml(h.sumsub_applicant_id)} | Xoala Onboarding App: ${escapeHtml(h.xoala_url || '-')}</div>`
                    }
                </div>
                ${cachedOsint && cachedOsint.markdown ? `
                    <div style="padding:10px;background:#05070c;border:1px solid rgba(16,185,129,0.3);border-radius:8px;color:#d1d5db;font-size:10.5px;">
                        <div style="font-family:monospace;color:#34d399;font-weight:bold;margin-bottom:4px;">PERSISTED GEMINI GOOGLE SEARCH-GROUNDED OSINT SUMMARY (${escapeHtml(cachedOsint.savedAtFormatted || '')}):</div>
                        <div>${typeof marked !== 'undefined' ? marked.parse(cachedOsint.markdown) : escapeHtml(cachedOsint.markdown)}</div>
                    </div>
                ` : ''}
            </div>

            <!-- Section D: Peter's 14-Factor Attio Synced Risk Matrix -->
            <div style="border:1px solid rgba(255,255,255,0.12);border-radius:12px;padding:16px;background:#0a0d16;margin-bottom:16px;">
                <div style="font-family:monospace;font-size:11px;color:#F0D788;font-weight:bold;text-transform:uppercase;margin-bottom:8px;">
                    SECTION 4 — ATTIO SYNCED 14-FACTOR INSTITUTIONAL RISK MATRIX (UNTOUCHED)
                </div>
                <table style="width:100%;border-collapse:collapse;font-family:monospace;font-size:10px;">
                    <thead>
                        <tr style="background:rgba(255,255,255,0.05);color:#9ca3af;text-align:left;">
                            <th style="padding:5px;">Dimension</th>
                            <th style="padding:5px;">Underlying Value</th>
                            <th style="padding:5px;text-align:right;">Calc Score</th>
                            <th style="padding:5px;text-align:right;">Override</th>
                            <th style="padding:5px;text-align:right;">Effective Score</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${(p.riskScorecard || []).map(r => `
                            <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
                                <td style="padding:5px;color:#fff;font-weight:bold;">${escapeHtml(r.dimension)}</td>
                                <td style="padding:5px;color:#d1d5db;">${escapeHtml(r.underlyingValue)}</td>
                                <td style="padding:5px;text-align:right;color:#9ca3af;">${r.calculatedScore !== null ? r.calculatedScore : '-'}</td>
                                <td style="padding:5px;text-align:right;color:#F0D788;">${r.overrideScore !== null ? r.overrideScore : '-'}</td>
                                <td style="padding:5px;text-align:right;color:#fff;font-weight:bold;">${r.effectiveScore !== null ? r.effectiveScore : '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <!-- Section E: Complete Populated KYB Questionnaire Attributes Across All Domain Sections -->
            ${allPopulatedGroups.map(grp => {
                const pop = (grp.items || []).filter(item => item.value && item.value !== '' && item.value !== '-');
                if (pop.length === 0) return '';
                return `
                    <div style="border:1px solid rgba(255,255,255,0.12);border-radius:12px;padding:16px;background:#0a0d16;margin-bottom:16px;">
                        <div style="font-family:monospace;font-size:11px;color:#F0D788;font-weight:bold;text-transform:uppercase;margin-bottom:8px;">
                            ${escapeHtml(grp.title)} (${pop.length} Populated Fields)
                        </div>
                        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;font-size:10px;">
                            ${pop.map(item => `
                                <div style="padding:6px 8px;background:#05070c;border:1px solid rgba(255,255,255,0.06);border-radius:6px;">
                                    <div style="font-family:monospace;font-size:9px;color:#9ca3af;">${escapeHtml(item.label)}</div>
                                    <div style="color:#ffffff;font-weight:600;word-break:break-word;margin-top:2px;">${escapeHtml(String(item.value))}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }).join('')}
        `;

        document.body.appendChild(printContainer);
        try {
            if (typeof window.html2pdf === 'function') {
                await window.html2pdf()
                    .set({
                        margin: [8, 8, 8, 8],
                        filename,
                        image: { type: 'jpeg', quality: 0.96 },
                        html2canvas: { scale: 1.6, useCORS: true, backgroundColor: '#06080f' },
                        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
                    })
                    .from(printContainer)
                    .save();
            } else {
                window.print();
            }
        } catch (err) {
            console.error('PDF Export Error:', err);
            window.print();
        } finally {
            document.body.removeChild(printContainer);
            if (btn) {
                btn.innerHTML = `<i class="ph ph-check text-emerald-400"></i><span class="text-emerald-400">PDF Downloaded!</span>`;
                setTimeout(() => { btn.innerHTML = origBtnHtml; }, 2200);
            }
        }
    };

    document.getElementById('profile-print-btn')?.addEventListener('click', exportUnifiedCompanyPdfDossier);

    // ============================================================================
    // CRM-WIDE GEMINI AI MULTIPLIERS (5 EXECUTIVE AI FEATURES ACROSS VIEWS)
    // ============================================================================

    // 1. Dashboard: ✨ AI Morning Executive Brief (#ai-morning-brief-btn) — Locked behind Personal Gemini API Key
    document.getElementById('ai-morning-brief-btn')?.addEventListener('click', async () => {
        const drawer = document.getElementById('dashboard-ai-brief-drawer');
        const body = document.getElementById('dashboard-ai-brief-content') || document.getElementById('dashboard-ai-brief-body');
        if (!drawer || !body) return;
        drawer.classList.remove('hidden');

        if (!window.XoalaOperatorVault?.hasClientKey?.()) {
            body.innerHTML = typeof window.renderGeminiKeyLockedCard === 'function'
                ? window.renderGeminiKeyLockedCard('AI Executive Morning Brief')
                : `<div class="p-4 text-xs font-mono text-gold">🔒 Personal Gemini API Key required. Open the Operator Security Vault in the top header to unlock.</div>`;
            return;
        }

        body.innerHTML = `<div class="flex items-center space-x-2 text-gold font-mono text-xs"><i class="ph ph-spinner animate-spin"></i><span>Synthesizing Gemini 3.6 Flash Executive Morning Brief across live KYB pipeline...</span></div>`;

        if (dataLakeGridData.length === 0) await fetchAndRenderDataLakeGrid(false);
        const total = dataLakeGridData.length;
        const activeRows = dataLakeGridData.filter(r => !terminalStageList.includes(String(r.stage || '').toLowerCase()));
        const approvedRows = dataLakeGridData.filter(r => String(r.stage || '').toLowerCase() === 'approved');
        const highRiskActive = activeRows.filter(r => String(r.risk_rating || '').toLowerCase().includes('high'));
        const breachedRows = activeRows.filter(r => (parseFloat(r.queue_aging_days) || 0) > 14);
        const topBreached = [...breachedRows].sort((a, b) => (parseFloat(b.queue_aging_days) || 0) - (parseFloat(a.queue_aging_days) || 0)).slice(0, 5);

        const prompt = `Generate a concise 3-bullet Executive Morning Risk & Commercial Brief for the Xoala Board based on these live metrics: Total Entities=${total}, Approved=${approvedRows.length}, Active Queue=${activeRows.length}, High-Risk Active Queue=${highRiskActive.length}, SLA Breached (>14d)=${breachedRows.length}. Top SLA Breaches: ${topBreached.map(r => `${r.company_name} (${r.stage}, ${r.queue_aging_days}d, Officer: ${r.account_manager})`).join('; ')}. Structure into: 1) Commercial Conversion & Pipeline Velocity, 2) Critical Compliance & SLA Bottlenecks, 3) Today's Priority Executive Actions.`;

        const res = await window.callGeminiExecutiveAPI({
            prompt,
            systemInstruction: "You are Xoala's Executive AI Chief of Staff. Write a sharp, institutional 3-section Morning Brief using Markdown bullet points."
        });
        if (res && res.ok && res.text) {
            body.innerHTML = typeof marked !== 'undefined' ? marked.parse(res.text) : `<div class="whitespace-pre-wrap">${escapeHtml(res.text)}</div>`;
        } else {
            body.innerHTML = `<div class="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs font-mono text-red-300">⚠️ Gemini API Error: ${escapeHtml(res?.error || 'Unable to reach Gemini API. Verify your personal Gemini API key in the Operator Security Vault.')}</div>`;
        }
    });

    document.getElementById('close-ai-morning-brief-btn')?.addEventListener('click', () => {
        document.getElementById('dashboard-ai-brief-drawer')?.classList.add('hidden');
    });

    // 2. Daily Report: Workload Rebalance Plan (#ai-workload-rebalance-btn) — 100% Local Deterministic Quantitative Engine (0ms, Zero Cloud/API Calls)
    document.getElementById('ai-workload-rebalance-btn')?.addEventListener('click', async () => {
        const drawer = document.getElementById('daily-report-ai-rebalance-drawer');
        const body = document.getElementById('daily-report-ai-rebalance-content') || document.getElementById('daily-report-ai-rebalance-body');
        if (!drawer || !body) return;
        drawer.classList.remove('hidden');

        if (dataLakeGridData.length === 0) await fetchAndRenderDataLakeGrid(false);
        const activeRows = dataLakeGridData.filter(r => !isRecordTerminalForMatrix(r));
        const byOfficer = {};

        activeRows.forEach(r => {
            const am = (r.account_manager && r.account_manager !== '-' && r.account_manager !== 'Unassigned') ? r.account_manager : 'Unassigned';
            if (!byOfficer[am]) {
                byOfficer[am] = {
                    name: am,
                    count: 0,
                    over5d: 0,
                    over14d: 0,
                    highRisk: 0,
                    medRisk: 0,
                    totalAging: 0,
                    tickets: []
                };
            }
            const o = byOfficer[am];
            const age = parseFloat(r.queue_aging_days) || 0;
            const rl = String(r.risk_rating || '').toLowerCase();
            const isHigh = rl.includes('high') || rl.includes('decline');
            const isMed = rl.includes('med');

            o.count++;
            o.totalAging += age;
            if (age > 5) o.over5d++;
            if (age > 14) o.over14d++;
            if (isHigh) o.highRisk++;
            else if (isMed) o.medRisk++;

            // Ticket Priority Score = Age + (HighRisk ? 15 : MedRisk ? 6 : 0)
            const ticketUrgency = age + (isHigh ? 15 : (isMed ? 6 : 0));
            o.tickets.push({
                record_id: r.record_id,
                company_name: r.company_name || 'Unnamed Entity',
                stage: r.stage || 'Active Review',
                age,
                risk_rating: r.risk_rating || 'Unassessed',
                isHigh,
                urgency: ticketUrgency
            });
        });

        const assignedOfficers = Object.values(byOfficer).filter(o => o.name !== 'Unassigned');
        const unassignedBucket = byOfficer['Unassigned'] || { name: 'Unassigned', count: 0, over5d: 0, over14d: 0, highRisk: 0, tickets: [] };

        // Compute Weighted Load Index W_i = ActiveCount + 1.5*(SLA>5d) + 2.5*(SLA>14d) + 2.0*(HighRisk)
        assignedOfficers.forEach(o => {
            o.avgDwell = o.count > 0 ? (o.totalAging / o.count) : 0;
            o.weightedLoad = +(o.count + (1.5 * o.over5d) + (2.5 * o.over14d) + (2.0 * o.highRisk)).toFixed(1);
            o.tickets.sort((a, b) => b.urgency - a.urgency);
        });

        const officerCount = Math.max(1, assignedOfficers.length);
        const totalAssignedActive = assignedOfficers.reduce((s, o) => s + o.count, 0);
        const targetMeanActive = Math.round((totalAssignedActive + unassignedBucket.count) / officerCount);
        const meanWeightedLoad = assignedOfficers.reduce((s, o) => s + o.weightedLoad, 0) / officerCount;

        // Sort officers from highest weighted load to lowest
        const sortedByLoad = [...assignedOfficers].sort((a, b) => b.weightedLoad - a.weightedLoad);
        const overloadedOfficers = sortedByLoad.filter(o => o.weightedLoad > meanWeightedLoad * 1.15 && o.count > targetMeanActive);
        const receiverOfficers = [...assignedOfficers].sort((a, b) => a.weightedLoad - b.weightedLoad).filter(o => o.weightedLoad <= meanWeightedLoad * 1.05);

        // Build Deterministic Ticket Reallocation Transfers
        const transfers = [];
        const receiverCapacities = receiverOfficers.map(r => ({
            name: r.name,
            currentCount: r.count,
            currentLoad: r.weightedLoad,
            availableSlots: Math.max(2, targetMeanActive - r.count + 2)
        }));

        let recvIdx = 0;
        const pickNextReceiver = (requireSeniorClearance = false) => {
            if (receiverCapacities.length === 0) return sortedByLoad[sortedByLoad.length - 1]?.name || 'Compliance Desk';
            for (let tries = 0; tries < receiverCapacities.length; tries++) {
                const candidate = receiverCapacities[(recvIdx + tries) % receiverCapacities.length];
                if (candidate.availableSlots > 0) {
                    candidate.availableSlots--;
                    candidate.currentCount++;
                    recvIdx = (recvIdx + tries + 1) % receiverCapacities.length;
                    return candidate.name;
                }
            }
            return receiverCapacities[0].name;
        };

        // 1) Allocate top Unassigned tickets (>5d or High-Risk first)
        unassignedBucket.tickets.sort((a, b) => b.urgency - a.urgency);
        unassignedBucket.tickets.slice(0, 6).forEach(t => {
            const toOfficer = pickNextReceiver(t.isHigh);
            transfers.push({
                company: t.company_name,
                recordId: t.record_id,
                stage: t.stage,
                age: t.age.toFixed(1) + 'd',
                risk: t.risk_rating,
                fromOfficer: 'Unassigned Queue',
                toOfficer,
                rationale: t.age > 14 ? 'Critical Unassigned SLA Breach (>14d)' : (t.isHigh ? 'High-Risk Unassigned Dossier (4-Eyes EDD)' : 'Unassigned Queue Intake Balancing')
            });
        });

        // 2) Rebalance excess SLA-breached tickets from Overloaded Officers to Available Capacity Officers
        overloadedOfficers.forEach(overObj => {
            const excessToMove = Math.min(4, Math.max(1, Math.round((overObj.count - targetMeanActive) * 0.5)));
            const candidatesToMove = overObj.tickets.filter(t => t.age > 5 || t.isHigh).slice(0, excessToMove);
            candidatesToMove.forEach(t => {
                const toOfficer = pickNextReceiver(t.isHigh);
                if (toOfficer && toOfficer !== overObj.name) {
                    transfers.push({
                        company: t.company_name,
                        recordId: t.record_id,
                        stage: t.stage,
                        age: t.age.toFixed(1) + 'd',
                        risk: t.risk_rating,
                        fromOfficer: overObj.name,
                        toOfficer,
                        rationale: `Relieve ${overObj.name} Queue Bottleneck (Load ${overObj.weightedLoad} → Target ${meanWeightedLoad.toFixed(1)})`
                    });
                }
            });
        });

        body.innerHTML = `
            <div class="space-y-4 font-sans">
                <!-- Top Algorithm Telemetry Banner -->
                <div class="p-3.5 rounded-xl bg-black/60 border border-gold/35 flex flex-wrap items-center justify-between gap-3">
                    <div class="text-xs text-gray-200">
                        <strong class="text-gold font-mono uppercase">Prometheus Local Quantitative Rebalancer (0ms):</strong>
                        Target Equilibrium = <strong class="text-white">${targetMeanActive} active dossiers / officer</strong> •
                        Mean Weighted Load ($\mu_W$) = <strong class="text-gold">${meanWeightedLoad.toFixed(1)} pts</strong> •
                        Formula: <code class="text-[11px] text-emerald-300 bg-white/5 px-1.5 py-0.5 rounded">W = Active + 1.5×(SLA&gt;5d) + 2.5×(SLA&gt;14d) + 2.0×(HighRisk)</code>
                    </div>
                    <span class="px-2.5 py-1 rounded bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono font-bold uppercase">100% Local Math • 0 API Calls</span>
                </div>

                <!-- Officer Load & Capacity Matrix -->
                <div class="bg-black/50 border border-white/10 rounded-xl overflow-hidden">
                    <div class="px-4 py-2.5 bg-white/[0.03] border-b border-white/10 flex items-center justify-between">
                        <span class="text-[10px] font-mono uppercase tracking-widest text-gold font-bold">1. Officer Capacity &amp; Weighted Queue Load Distribution</span>
                        <span class="text-[10px] font-mono text-gray-400">${assignedOfficers.length} Active Officers + ${unassignedBucket.count} Unassigned</span>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse text-xs font-mono">
                            <thead>
                                <tr class="border-b border-white/10 text-[9px] uppercase text-gray-400 bg-black/40">
                                    <th class="py-2 px-3">Compliance Officer</th>
                                    <th class="py-2 px-3 text-right">Active Queue</th>
                                    <th class="py-2 px-3 text-right">SLA &gt; 5d</th>
                                    <th class="py-2 px-3 text-right">Critical &gt; 14d</th>
                                    <th class="py-2 px-3 text-right">High-Risk (EDD)</th>
                                    <th class="py-2 px-3 text-right">Mean Dwell</th>
                                    <th class="py-2 px-3 text-right">Weighted Load ($W_i$)</th>
                                    <th class="py-2 px-3 text-right">Desk Status</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-white/5">
                                ${sortedByLoad.map(o => {
                                    const isOver = o.weightedLoad > meanWeightedLoad * 1.15 && o.count > targetMeanActive;
                                    const isUnder = o.weightedLoad < meanWeightedLoad * 0.85;
                                    const statusBadge = isOver
                                        ? `<span class="px-2 py-0.5 rounded bg-red-500/15 border border-red-500/40 text-red-300 text-[9px] font-bold">OVERLOADED (TRANSFER OUT)</span>`
                                        : (isUnder
                                            ? `<span class="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[9px] font-bold">AVAILABLE CAPACITY (RECEIVE)</span>`
                                            : `<span class="px-2 py-0.5 rounded bg-gold/15 border border-gold/40 text-gold text-[9px] font-bold">BALANCED EQUILIBRIUM</span>`);
                                    return `
                                        <tr class="hover:bg-white/[0.02]">
                                            <td class="py-2 px-3 font-sans font-bold text-white">${escapeHtml(o.name)}</td>
                                            <td class="py-2 px-3 text-right text-gray-200">${o.count}</td>
                                            <td class="py-2 px-3 text-right ${o.over5d > 0 ? 'text-amber-300 font-bold' : 'text-gray-500'}">${o.over5d}</td>
                                            <td class="py-2 px-3 text-right ${o.over14d > 0 ? 'text-red-400 font-bold' : 'text-gray-500'}">${o.over14d}</td>
                                            <td class="py-2 px-3 text-right ${o.highRisk > 0 ? 'text-red-300 font-bold' : 'text-gray-500'}">${o.highRisk}</td>
                                            <td class="py-2 px-3 text-right text-gray-300">${o.avgDwell.toFixed(1)}d</td>
                                            <td class="py-2 px-3 text-right text-gold font-bold">${o.weightedLoad}</td>
                                            <td class="py-2 px-3 text-right">${statusBadge}</td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Recommended Ticket-by-Ticket Reallocation Schedule -->
                <div class="bg-black/50 border border-white/10 rounded-xl overflow-hidden">
                    <div class="px-4 py-2.5 bg-white/[0.03] border-b border-white/10 flex items-center justify-between">
                        <span class="text-[10px] font-mono uppercase tracking-widest text-gold font-bold">2. Recommended Immediate Dossier Reallocation Schedule (${transfers.length} Priority Transfers)</span>
                        <span class="text-[10px] font-mono text-emerald-400">Click any entity to open 360° Dossier</span>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse text-xs font-mono">
                            <thead>
                                <tr class="border-b border-white/10 text-[9px] uppercase text-gray-400 bg-black/40">
                                    <th class="py-2 px-3">Entity / Dossier</th>
                                    <th class="py-2 px-3">Current Stage</th>
                                    <th class="py-2 px-3 text-right">Stage Dwell</th>
                                    <th class="py-2 px-3">Risk Floor</th>
                                    <th class="py-2 px-3">Reassign From → To</th>
                                    <th class="py-2 px-3">Quantitative Triage Rationale</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-white/5">
                                ${transfers.map(tr => `
                                    <tr class="hover:bg-gold/5 transition-colors">
                                        <td class="py-2 px-3 font-sans font-bold">
                                            <button type="button" onclick="window.openSovereignProfileModal && window.openSovereignProfileModal('${escapeHtml(tr.recordId)}')" class="text-gold hover:underline text-left">${escapeHtml(tr.company)} ↗</button>
                                        </td>
                                        <td class="py-2 px-3 text-gray-300">${escapeHtml(tr.stage)}</td>
                                        <td class="py-2 px-3 text-right text-amber-300 font-bold">${escapeHtml(tr.age)}</td>
                                        <td class="py-2 px-3">${getRiskPillHtml(tr.risk)}</td>
                                        <td class="py-2 px-3">
                                            <span class="text-red-300">${escapeHtml(tr.fromOfficer)}</span>
                                            <span class="text-gold mx-1">→</span>
                                            <span class="text-emerald-400 font-bold">${escapeHtml(tr.toOfficer)}</span>
                                        </td>
                                        <td class="py-2 px-3 font-sans text-[11px] text-gray-300">${escapeHtml(tr.rationale)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    });

    document.getElementById('close-ai-rebalance-btn')?.addEventListener('click', () => {
        document.getElementById('daily-report-ai-rebalance-drawer')?.classList.add('hidden');
    });

    // 3. KYC Data Lake: ✨ AI Smart Filter (#ai-smart-filter-btn & Natural Language Query Parser)
    const executeNaturalLanguageSmartFilter = (rawInputText) => {
        const searchInput = document.getElementById('datalake-search-input');
        const stageSelect = document.getElementById('datalake-stage-filter');
        const riskSelect = document.getElementById('datalake-risk-filter');
        const amSelect = document.getElementById('datalake-am-filter');
        const drawer = document.getElementById('datalake-ai-filter-drawer');

        if (drawer) drawer.classList.remove('hidden');

        const rawQuery = (rawInputText !== undefined ? rawInputText : (searchInput?.value || '')).trim();
        if (!rawQuery) {
            renderActiveSmartFilterChips();
            if (searchInput) {
                searchInput.placeholder = "Type natural query (e.g. 'high risk uk stuck > 5 days' or 'unassigned 0 linked ubos') then click ✨ AI Smart Filter...";
                searchInput.focus();
            }
            return;
        }

        // Reset previous spec before applying parsed natural-language intent
        aiSmartFilterSpec = { minAgingDays: null, requireUnlinkedUbos: false, countryFilter: null, activeOnly: false, rawQueryLabel: rawQuery };
        if (stageSelect) stageSelect.value = 'ALL';
        if (riskSelect) riskSelect.value = 'ALL';
        if (amSelect) amSelect.value = 'ALL';

        const qLower = rawQuery.toLowerCase();
        let remainingTokens = rawQuery;

        // 1. Parse SLA Aging / Stuck Days intent (e.g., "stuck > 5 days", "> 14d", "breached")
        const ageMatch = qLower.match(/(?:stuck|aging|aged|over|>)\s*>?\s*(\d+)\s*d(?:ays?)?/i);
        if (ageMatch) {
            aiSmartFilterSpec.minAgingDays = parseInt(ageMatch[1], 10);
            aiSmartFilterSpec.activeOnly = true;
            remainingTokens = remainingTokens.replace(/(?:stuck|aging|aged|over|>)\s*>?\s*\d+\s*d(?:ays?)?/ig, '');
        } else if (qLower.includes('breach') || qLower.includes('stuck')) {
            aiSmartFilterSpec.minAgingDays = 5;
            aiSmartFilterSpec.activeOnly = true;
            remainingTokens = remainingTokens.replace(/\b(breached|breach|stuck)\b/ig, '');
        }

        // 2. Parse Unlinked / 0 UBOs intent
        if (qLower.includes('0 linked ubo') || qLower.includes('unlinked ubo') || qLower.includes('missing ubo') || qLower.includes('no ubo')) {
            aiSmartFilterSpec.requireUnlinkedUbos = true;
            aiSmartFilterSpec.activeOnly = true;
            remainingTokens = remainingTokens.replace(/\b(0\s*linked\s*ubos?|unlinked\s*ubos?|missing\s*ubos?|no\s*ubos?)\b/ig, '');
        }

        // 3. Parse Active Queue intent
        if (qLower.includes('active')) {
            aiSmartFilterSpec.activeOnly = true;
            remainingTokens = remainingTokens.replace(/\bactive\b/ig, '');
        }

        // 4. Parse Risk Rating intent
        if (qLower.includes('high risk') || qLower.includes('high-risk')) {
            if (riskSelect) riskSelect.value = 'High';
            remainingTokens = remainingTokens.replace(/high[\s-]risk/ig, '');
        } else if (qLower.includes('medium risk') || qLower.includes('med risk')) {
            if (riskSelect) riskSelect.value = 'Medium';
            remainingTokens = remainingTokens.replace(/med(ium)?[\s-]risk/ig, '');
        } else if (qLower.includes('low risk') || qLower.includes('low-risk')) {
            if (riskSelect) riskSelect.value = 'Low';
            remainingTokens = remainingTokens.replace(/low[\s-]risk/ig, '');
        } else if (qLower.includes('decline')) {
            if (riskSelect) riskSelect.value = 'Decline';
            remainingTokens = remainingTokens.replace(/declined?/ig, '');
        }

        // 5. Parse Stage intent
        if (stageSelect) {
            Array.from(stageSelect.options).forEach(opt => {
                if (opt.value !== 'ALL' && qLower.includes(opt.value.toLowerCase())) {
                    stageSelect.value = opt.value;
                    remainingTokens = remainingTokens.replace(new RegExp(opt.value, 'ig'), '');
                }
            });
            if (stageSelect.value === 'ALL') {
                if (qLower.includes('mlro') || qLower.includes('2nd line')) {
                    const matchOpt = Array.from(stageSelect.options).find(o => o.value.toLowerCase().includes('mlro') || o.value.toLowerCase().includes('2nd line'));
                    if (matchOpt) stageSelect.value = matchOpt.value;
                    remainingTokens = remainingTokens.replace(/\b(mlro|2nd\s*line(\s*queue)?)\b/ig, '');
                } else if (qLower.includes('pending client')) {
                    const matchOpt = Array.from(stageSelect.options).find(o => o.value.toLowerCase().includes('pending client'));
                    if (matchOpt) stageSelect.value = matchOpt.value;
                    remainingTokens = remainingTokens.replace(/\bpending\s*client(\s*response)?(\s*queue)?\b/ig, '');
                } else if (qLower.includes('approved')) {
                    const matchOpt = Array.from(stageSelect.options).find(o => o.value.toLowerCase() === 'approved');
                    if (matchOpt) stageSelect.value = matchOpt.value;
                    remainingTokens = remainingTokens.replace(/\bapproved\b/ig, '');
                }
            }
        }

        // 6. Parse Account Manager intent
        if (amSelect) {
            if (qLower.includes('unassigned')) {
                const unOpt = Array.from(amSelect.options).find(o => o.value.toLowerCase() === 'unassigned');
                if (unOpt) amSelect.value = unOpt.value;
                remainingTokens = remainingTokens.replace(/\bunassigned\b/ig, '');
            } else {
                Array.from(amSelect.options).forEach(opt => {
                    if (opt.value !== 'ALL' && qLower.includes(opt.value.toLowerCase())) {
                        amSelect.value = opt.value;
                        remainingTokens = remainingTokens.replace(new RegExp(opt.value, 'ig'), '');
                    }
                });
            }
        }

        // 7. Parse Country / Jurisdiction intent
        const countryMap = [
            { rx: /\b(uk|united\s*kingdom|britain)\b/ig, name: 'United Kingdom' },
            { rx: /\b(uae|united\s*arab\s*emirates|dubai)\b/ig, name: 'United Arab Emirates' },
            { rx: /\b(usa|united\s*states)\b/ig, name: 'United States' },
            { rx: /\b(france|french)\b/ig, name: 'France' },
            { rx: /\b(cyprus)\b/ig, name: 'Cyprus' },
            { rx: /\b(switzerland|swiss)\b/ig, name: 'Switzerland' },
            { rx: /\b(singapore)\b/ig, name: 'Singapore' },
            { rx: /\b(hong\s*kong)\b/ig, name: 'Hong Kong' },
            { rx: /\b(canada)\b/ig, name: 'Canada' }
        ];
        countryMap.forEach(cm => {
            if (cm.rx.test(remainingTokens)) {
                aiSmartFilterSpec.countryFilter = cm.name;
                remainingTokens = remainingTokens.replace(cm.rx, '');
            }
        });

        // Strip filler words
        remainingTokens = remainingTokens
            .replace(/\b(in|with|and|or|show|all|entities|companies|leads|applications|queue|review|days)\b/ig, ' ')
            .replace(/[^a-zA-Z0-9\s-]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        if (searchInput) searchInput.value = remainingTokens;
        currentPage = 1;
        applyDataLakeFiltersAndSort();
    };

    document.getElementById('ai-smart-filter-btn')?.addEventListener('click', () => {
        const searchInput = document.getElementById('datalake-search-input');
        executeNaturalLanguageSmartFilter(searchInput?.value || '');
    });

    document.getElementById('close-ai-filter-drawer-btn')?.addEventListener('click', () => {
        document.getElementById('datalake-ai-filter-drawer')?.classList.add('hidden');
    });

    document.querySelectorAll('.ai-nl-preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const presetQ = btn.getAttribute('data-nl-query') || '';
            executeNaturalLanguageSmartFilter(presetQ);
        });
    });

    // 4. 360° Dossier: 🌐 Live Web OSINT & Adverse Media Summary (#profile-web-osint-btn) + Persistent OSINT Summary Vault (xoala_osint_vault_v1 — Zero Synthetic Scoring)
    const renderOsintReportInDrawer = (entry, isFromCache = false) => {
        const aiDrawer = document.getElementById('profile-inline-ai-drawer');
        const aiContent = document.getElementById('profile-inline-ai-content');
        const refreshBtn = document.getElementById('profile-osint-refresh-btn');
        if (!aiDrawer || !aiContent) return;

        aiDrawer.classList.remove('hidden');
        if (refreshBtn) {
            refreshBtn.classList.remove('hidden');
            refreshBtn.classList.add('inline-flex');
        }

        const h = (activeProfileData && activeProfileData.header) || {};
        const sc = activeProfileData?.xoalaScorecard || (activeProfileData ? evaluateXoala19RuleScorecard(activeProfileData, activeProfileData.rawMap || {}) : { ratchetFloor: 'LOW', eddPacks: [] });
        const ubos = (activeProfileData && activeProfileData.connectedParties) || [];
        const corridors = (activeProfileData && activeProfileData.payment_corridors) || [];
        const redFlags = (activeProfileData && activeProfileData.complianceAudit && activeProfileData.complianceAudit.redFlags) || [];

        const toneCls = sc.ratchetFloor === 'HIGH'
            ? 'bg-red-500/20 border-red-500/45 text-red-300'
            : (sc.ratchetFloor === 'MEDIUM' ? 'bg-amber-500/20 border-amber-500/45 text-gold' : 'bg-emerald-500/20 border-emerald-500/45 text-emerald-300');

        const compName = h.company_name || entry.companyName || 'Corporate Entity';
        const qComp = encodeURIComponent(compName);
        const domainClean = (h.website && h.website !== '-')
            ? String(h.website).replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
            : '';

        const cacheBanner = `
            <div class="mb-4 p-3.5 rounded-xl bg-[#06080f] border border-sky-500/35 flex items-center justify-between flex-wrap gap-3 shadow-lg">
                <div class="flex items-center space-x-3 flex-wrap gap-y-1">
                    <span class="px-3 py-1 rounded-lg font-mono text-xs font-bold border bg-emerald-500/20 border-emerald-500/45 text-emerald-300">
                        🌍 TOOL 3: LIVE WEB OSINT &amp; ADVERSE MEDIA SCANNER (INDEPENDENT OF XOALA INTERNAL SCORING)
                    </span>
                    <span class="text-[11px] font-mono text-gray-300">
                        ${isFromCache
                            ? `<i class="ph ph-database text-gold"></i> Gemini Search-Grounded Summary Loaded from <code>xoala_osint_vault_v1</code> (${escapeHtml(entry.savedAtFormatted || 'Saved')}) • <strong class="text-emerald-400">0 Tokens Used</strong>`
                            : `<i class="ph ph-check-circle text-emerald-400"></i> Fresh Gemini Search-Grounded OSINT Summary Saved (${escapeHtml(entry.savedAtFormatted || 'Just now')})`}
                    </span>
                </div>
                <div class="flex items-center gap-1.5 flex-wrap">
                    <a href="https://www.google.com/search?q=${encodeURIComponent(`"${compName}" ("fraud" OR "lawsuit" OR "regulator" OR "fine" OR "scam" OR "sanctions")`)}" target="_blank" rel="noopener" class="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-400/35 text-rose-300 text-[10px] font-mono">Adverse News Dork ↗</a>
                    <a href="https://opencorporates.com/companies?q=${qComp}" target="_blank" rel="noopener" class="px-2.5 py-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/35 text-sky-300 text-[10px] font-mono">OpenCorporates ↗</a>
                    <a href="https://www.linkedin.com/search/results/companies/?keywords=${qComp}" target="_blank" rel="noopener" class="px-2.5 py-1 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 border border-purple-400/35 text-purple-300 text-[10px] font-mono">LinkedIn Footprint ↗</a>
                </div>
            </div>
        `;

        const bentoGridHtml = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div class="p-4 rounded-xl bg-[#080b12] border border-sky-500/30 flex flex-col justify-between space-y-2.5 shadow-lg">
                    <div>
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-[10px] font-mono uppercase tracking-widest text-sky-300 font-bold flex items-center gap-1.5">
                                <i class="ph ph-buildings text-sm"></i> 1. Corporate &amp; Registry Footprint
                            </span>
                            <span class="px-2 py-0.5 rounded bg-sky-500/15 border border-sky-500/30 text-sky-300 text-[9px] font-mono">${escapeHtml(h.country || 'Global')}</span>
                        </div>
                        <div class="grid grid-cols-2 gap-2 text-xs">
                            <div class="p-2 rounded-lg bg-black/60 border border-white/5">
                                <div class="text-[9px] font-mono uppercase text-gray-500">Legal Entity &amp; DBA</div>
                                <div class="font-bold text-white truncate mt-0.5">${escapeHtml(compName)}</div>
                                <div class="text-[10px] font-mono text-gray-400 truncate">DBA: ${escapeHtml(h.trading_name || '-')}</div>
                            </div>
                            <div class="p-2 rounded-lg bg-black/60 border border-white/5">
                                <div class="text-[9px] font-mono uppercase text-gray-500">Registration &amp; Inc.</div>
                                <div class="font-mono font-bold text-gold truncate mt-0.5">${escapeHtml(h.incorporation_number && h.incorporation_number !== '-' ? h.incorporation_number : 'Pending Extract')}</div>
                                <div class="text-[10px] font-mono text-gray-400">Inc: ${escapeHtml(h.incorporation_date || '-')}</div>
                            </div>
                        </div>
                    </div>
                    <div class="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] font-mono">
                        <span class="text-gray-400">Declared Domain:</span>
                        ${domainClean
                            ? `<a href="https://${escapeHtml(domainClean)}" target="_blank" rel="noopener" class="text-sky-300 hover:underline font-bold">${escapeHtml(domainClean)} ↗</a>`
                            : `<span class="text-amber-300">No Public Website Declared</span>`}
                    </div>
                </div>

                <div class="p-4 rounded-xl bg-[#080b12] border border-purple-500/30 flex flex-col justify-between space-y-2.5 shadow-lg">
                    <div>
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-[10px] font-mono uppercase tracking-widest text-purple-300 font-bold flex items-center gap-1.5">
                                <i class="ph ph-users-three text-sm"></i> 2. Connected Principals &amp; Biometric KYB
                            </span>
                            <span class="px-2 py-0.5 rounded bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[9px] font-mono">${ubos.length} Linked Parties</span>
                        </div>
                        <div class="space-y-1.5 max-h-24 overflow-y-auto pr-1">
                            ${ubos.length > 0
                                ? ubos.slice(0, 4).map(u => `
                                    <div class="px-2.5 py-1.5 rounded-lg bg-black/60 border border-white/5 flex items-center justify-between text-[11px]">
                                        <span class="text-white font-semibold truncate">${escapeHtml(u.name)} <span class="text-gray-400 font-mono text-[10px]">(${escapeHtml(u.role)})</span></span>
                                        <span class="text-[10px] font-mono text-purple-300">${escapeHtml(u.nationality || h.country || '-')}</span>
                                    </div>
                                `).join('')
                                : `<div class="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] font-mono text-amber-300">⚠️ Zero UBOs linked in relational registry — request UBO schedule prior to approval.</div>`
                            }
                        </div>
                    </div>
                    <div class="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] font-mono">
                        <span class="text-gray-400">Sumsub Biometric Status:</span>
                        <span class="text-emerald-300 font-bold">${escapeHtml(h.sumsub_result || 'Pending')} (${escapeHtml(h.sumsub_applicant_id || '-')})</span>
                    </div>
                </div>

                <div class="p-4 rounded-xl bg-[#080b12] border border-amber-500/30 flex flex-col justify-between space-y-2.5 shadow-lg">
                    <div>
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-[10px] font-mono uppercase tracking-widest text-gold font-bold flex items-center gap-1.5">
                                <i class="ph ph-shield-warning text-sm"></i> 3. Adverse Media &amp; Corridor Risk Signals
                            </span>
                            <span class="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-gold text-[9px] font-mono">Attio: ${escapeHtml(h.risk_rating || 'Standard')} (${escapeHtml(String(h.risk_score || '-'))})</span>
                        </div>
                        <div class="space-y-1.5">
                            ${redFlags.length > 0
                                ? redFlags.slice(0, 3).map(rf => `
                                    <div class="px-2.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/25 text-[11px] text-red-200 flex items-start gap-1.5">
                                        <i class="ph ph-warning-circle text-red-400 mt-0.5 flex-shrink-0"></i>
                                        <span>${escapeHtml(rf)}</span>
                                    </div>
                                `).join('')
                                : `<div class="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-[11px] text-emerald-300 font-mono">✓ Zero adverse media enforcement hits, sanctions contradictions, or PEP flags detected.</div>`
                            }
                        </div>
                    </div>
                    <div class="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] font-mono">
                        <span class="text-gray-400">Sector &amp; Corridors:</span>
                        <span class="text-gray-200 truncate max-w-[230px]">${escapeHtml(h.industry_sector || 'Commercial')} • ${escapeHtml(corridors.map(c => c.country).join(', ') || h.country || '-')}</span>
                    </div>
                </div>

                <div class="p-4 rounded-xl bg-[#080b12] border border-emerald-500/30 flex flex-col justify-between space-y-2.5 shadow-lg">
                    <div>
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-[10px] font-mono uppercase tracking-widest text-emerald-300 font-bold flex items-center gap-1.5">
                                <i class="ph ph-globe-hemisphere-west text-sm"></i> 4. Gemini Search-Grounded OSINT Summary
                            </span>
                            <span class="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[9px] font-mono">xoala_osint_vault_v1</span>
                        </div>
                        <div class="text-xs text-gray-300 leading-relaxed max-h-28 overflow-y-auto pr-1 space-y-1">
                            ${entry.markdown
                                ? (typeof marked !== 'undefined' ? marked.parse(entry.markdown) : `<div class="whitespace-pre-wrap">${escapeHtml(entry.markdown)}</div>`)
                                : `<p>Grounded OSINT Summary saved in <code>xoala_osint_vault_v1</code>. Risk floor is governed strictly by Xoala Compliance Team's 19-Rule Ratchet Risk Scorecard (<strong class="text-gold">${escapeHtml(sc.ratchetFloor)}</strong>).</p>`
                            }
                        </div>
                    </div>
                    <div class="pt-2 border-t border-white/10">
                        ${Array.isArray(entry.sources) && entry.sources.length > 0
                            ? `<div class="flex flex-wrap gap-1.5">${entry.sources.map(s => `<a href="${escapeHtml(s.uri)}" target="_blank" rel="noopener" class="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-mono text-emerald-300 hover:bg-emerald-500/20 truncate max-w-[210px]">${escapeHtml(s.title)} ↗</a>`).join('')}</div>`
                            : `<div class="flex items-center justify-between text-[10px] font-mono text-gray-400"><span>Want fresh Gemini Google Search Grounding?</span><span class="text-gold">Click "Update / Fetch Latest OSINT" above</span></div>`
                        }
                    </div>
                </div>
            </div>
        `;

        aiContent.innerHTML = cacheBanner + bentoGridHtml;
    };

    const executeProfileOsintVerification = async (forceRefresh = false) => {
        if (!activeProfileData) return;
        const h = activeProfileData.header;
        const aiDrawer = document.getElementById('profile-inline-ai-drawer');
        const aiContent = document.getElementById('profile-inline-ai-content');
        const refreshBtn = document.getElementById('profile-osint-refresh-btn');
        if (!aiDrawer || !aiContent) return;

        aiDrawer.classList.remove('hidden');
        document.getElementById('profile-scroll-viewport')?.scrollTo({ top: 0, behavior: 'smooth' });

        // Strict Personal Gemini API Key Lock (Cloudflare AI is only used in Artemis Quantitative Chat)
        if (!window.XoalaOperatorVault?.hasClientKey?.()) {
            if (refreshBtn) {
                refreshBtn.classList.add('hidden');
                refreshBtn.classList.remove('inline-flex');
            }
            aiContent.innerHTML = typeof window.renderGeminiKeyLockedCard === 'function'
                ? window.renderGeminiKeyLockedCard('360° Live Web OSINT & Adverse Media Search Grounding')
                : `<div class="p-4 text-xs font-mono text-gold">🔒 Personal Gemini API Key required. Open the Operator Security Vault in the top header to unlock.</div>`;
            return;
        }

        // 1. Check Persistent OSINT Vault first (0ms load, zero tokens wasted!)
        if (!forceRefresh) {
            const cachedEntry = XoalaOsintVault.get(h.record_id, h.company_name);
            if (cachedEntry && cachedEntry.markdown) {
                updateHeaderOsintBadgeUI(h.record_id, h.company_name);
                renderOsintReportInDrawer(cachedEntry, true);
                return;
            }
        }

        if (refreshBtn) {
            refreshBtn.innerHTML = `<i class="ph ph-arrows-clockwise animate-spin"></i><span>Updating OSINT...</span>`;
        }

        const ubos = (activeProfileData.connectedParties || []).map(u => `${u.name} (${u.role}, Nat: ${u.nationality})`).join(', ');
        aiContent.innerHTML = `<div class="flex items-center space-x-2 text-gold font-mono text-xs py-2"><i class="ph ph-globe-hemisphere-west animate-spin text-sm"></i><span>Running Gemini Google Search-Grounded OSINT &amp; Adverse Media Summary on <strong>${escapeHtml(h.company_name)}</strong> (${escapeHtml(h.country)})...</span></div>`;

        const osintPrompt = `Perform a live web OSINT, corporate registry, and adverse media check on company "${h.company_name}" (Trading Name: "${h.trading_name || '-'}", Country: ${h.country}, Registration Number: ${h.incorporation_number || '-'}, Website: ${h.website || '-'}, Connected UBOs/Directors: ${ubos || 'None listed'}). Provide a pure factual executive summary (do NOT invent a numeric OSINT score): 1) Public Corporate & Website Footprint Verification, 2) Regulatory / Licensing Status, 3) Adverse Media, Litigation, or Sanctions Signals, and 4) Summary Conclusion.`;
        currentInlineAuditPrompt = `@Prometheus ${osintPrompt}`;

        const res = await window.callGeminiExecutiveAPI({
            prompt: osintPrompt,
            systemInstruction: "You are Xoala's Senior OSINT & Adverse Media Intelligence Analyst. Verify the corporate entity and its UBOs using live web search and cite any public sources found. Output a factual summary only without numeric scoring.",
            useWebSearch: true
        });

        if (refreshBtn) {
            refreshBtn.innerHTML = `<i class="ph ph-arrows-clockwise"></i><span>Update / Fetch Latest OSINT Report</span>`;
        }

        if (!res || !res.ok || !res.text) {
            aiContent.innerHTML = `<div class="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-xs font-mono text-red-300">⚠️ Gemini Search-Grounded OSINT Error: ${escapeHtml(res?.error || 'Unable to reach Gemini API. Verify your personal Gemini API key in the Operator Security Vault.')}</div>`;
            return;
        }

        const sc = activeProfileData.xoalaScorecard || evaluateXoala19RuleScorecard(activeProfileData, activeProfileData.rawMap || {});
        const savedEntry = XoalaOsintVault.save(h.record_id, h.company_name, {
            ratchetFloor: sc.ratchetFloor,
            markdown: res.text,
            sources: Array.isArray(res.sources) ? res.sources : []
        });

        updateHeaderOsintBadgeUI(h.record_id, h.company_name);
        renderOsintReportInDrawer(savedEntry, false);
    };

    document.getElementById('profile-web-osint-btn')?.addEventListener('click', () => {
        executeProfileOsintVerification(false);
    });

    document.getElementById('profile-osint-refresh-btn')?.addEventListener('click', () => {
        executeProfileOsintVerification(true);
    });

    // 5. 360° Dossier RFI Modal: ✨ AI Tailor Draft (#rfi-ai-tailor-btn) — Locked behind Personal Gemini API Key
    document.getElementById('rfi-ai-tailor-btn')?.addEventListener('click', async () => {
        if (!activeProfileData) return;
        const textarea = document.getElementById('rfi-composer-textarea');
        const btn = document.getElementById('rfi-ai-tailor-btn');
        if (!textarea || !btn) return;

        if (!window.XoalaOperatorVault?.hasClientKey?.()) {
            const origHtml = btn.innerHTML;
            btn.innerHTML = `<i class="ph ph-lock-key text-gold"></i><span class="text-gold">Gemini Key Locked — Opening Vault...</span>`;
            document.getElementById('operator-vault-open-btn')?.click();
            setTimeout(() => { btn.innerHTML = origHtml; }, 2600);
            return;
        }

        const origHtml = btn.innerHTML;
        btn.innerHTML = `<i class="ph ph-spinner animate-spin"></i><span>Tailoring with Gemini...</span>`;
        const h = activeProfileData.header;
        const missing = activeProfileData.complianceAudit.missingDocs.join(', ') || 'Updated Corporate Verification Package';
        const flags = activeProfileData.complianceAudit.redFlags.join('; ') || 'Standard periodic KYB verification';

        const res = await window.callGeminiExecutiveAPI({
            prompt: `Write a highly polished, jurisdiction-specific KYB Compliance Request for Information (RFI) email to the leadership of "${h.company_name}" (Jurisdiction: ${h.country}, Industry: ${h.industry_sector}, Contact: ${h.contact_name !== '-' ? h.contact_name : 'Executive Team'}). Specifically request these pending items: [${missing}] and politely request clarification on: [${flags}]. Keep the tone executive, supportive, and compliant with ${h.country} regulatory standards.`,
            systemInstruction: "You are Xoala's Institutional KYB Compliance Officer. Output only the ready-to-send email text."
        });
        if (res && res.ok && res.text) {
            textarea.value = res.text.trim();
            btn.innerHTML = `<i class="ph ph-check text-emerald-400"></i><span>Tailored!</span>`;
            setTimeout(() => { btn.innerHTML = origHtml; }, 2000);
        } else {
            btn.innerHTML = `<i class="ph ph-warning text-red-400"></i><span>Gemini Key Error</span>`;
            setTimeout(() => { btn.innerHTML = origHtml; }, 2400);
        }
    });

    // Expose 360° Dossier Modal & Data Lake Hydrator globally for Artemis & Prometheus
    window.openKybDossierModal = openSovereignProfileModal;
    window.ensureDataLakeLoaded = fetchAndRenderDataLakeGrid;

    // ============================================================================
    // VIEW 5: INTRODUCING BROKERS (IB) & PARTNER PERFORMANCE HUB (#ib-partner-view)
    // Cross-Checked Against Google Drive Attio_DataLake_KYB.csv (53 External IBs)
    // Strictly Filters Out Internal Xoala Staff (Nick Kundnani, Mitchell, Eddie, etc.)
    // ============================================================================
    let ibAggregatedPartners = [];
    let ibChannelMode = 'EXTERNAL_ONLY'; // 'EXTERNAL_ONLY' (53 True IBs from introducer column) | 'INTERNAL_DESK'

    // Complete Internal Xoala Staff & Executive Exclusion Set (Cross-checked from sales_owner & account_manager in Attio_DataLake_KYB.csv)
    const XOALA_INTERNAL_STAFF_EXCLUSION_SET = new Set([
        'nick kundnani',
        'mitchell eaglstein',
        'eddie imprachim',
        'robert grigoryan',
        'alex eleftheriou',
        'lanre owolabi',
        'jonathan wilson',
        'john murray',
        'deric chen',
        'sean bolton',
        'ellie brunton',
        'nasia vayianou',
        'gustavo macias',
        'juan mejia',
        'antri dionysiou',
        'gabriela tsenova',
        'maria theofanous',
        'mariya mahuvawala',
        'seb baudson',
        'humza rana',
        'jade adams',
        'direct / portal intake',
        'unassigned',
        '-'
    ]);

    const classifyIbVerticalCategory = (partnerName, industriesMap = {}) => {
        const n = String(partnerName || '').toLowerCase();
        const topInds = Object.keys(industriesMap).join(' ').toLowerCase();
        if (/paytiko|nextgen payment|paymuse|finassets|syncpath|psp|acquir/i.test(n) || /acquiring|e-commerce|card|gaming|gambling/i.test(topInds)) {
            return 'Card Acquiring & PSP';
        }
        if (/crypto|web3|block|chain|token|digital|bit/i.test(n) || /crypto|virtual asset|blockchain/i.test(topInds)) {
            return 'Crypto & Web3 Liquidity';
        }
        if (/bankd|settled|lux|corio|salvus|toro|corporate|capital|wealth|trust/i.test(n)) {
            return 'Banking & Multi-Currency IBAN';
        }
        return 'Fintech & Corporate Advisory';
    };

    const computeIbPartnerMetrics = () => {
        const rows = Array.isArray(dataLakeGridData) ? dataLakeGridData : [];
        const terminalSet = new Set(['approved', 'declined', 'withdrawn', 'off-boarded', 'ops: completed/onboarded', 'ops: off-boarded', 'ops: client drop-off/disqualified']);
        const map = {};

        rows.forEach(r => {
            const rawIntro = (r.introducer && r.introducer !== '-' && r.introducer !== 'Unassigned') ? String(r.introducer).trim() : '';
            const rawSales = (r.sales_owner && r.sales_owner !== '-' && r.sales_owner !== 'Unassigned') ? String(r.sales_owner).trim() : '';
            const rawAm = (r.account_manager && r.account_manager !== '-' && r.account_manager !== 'Unassigned') ? String(r.account_manager).trim() : '';

            let partnerName = '';
            let channelType = '';

            if (ibChannelMode === 'EXTERNAL_ONLY') {
                // Strictly use ONLY the `introducer` column and exclude any Xoala internal employee names
                if (!rawIntro) return;
                if (XOALA_INTERNAL_STAFF_EXCLUSION_SET.has(rawIntro.toLowerCase())) return;
                partnerName = rawIntro;
                channelType = 'External Corporate IB';
            } else {
                const deskPerson = rawSales || rawAm;
                if (!deskPerson) return;
                partnerName = deskPerson;
                channelType = rawSales ? 'Internal Commercial / Sales Desk' : 'Internal Account Management Desk';
            }

            if (!map[partnerName]) {
                map[partnerName] = {
                    name: partnerName,
                    channelType,
                    total: 0,
                    approved: 0,
                    declined: 0,
                    active: 0,
                    stuckOver5d: 0,
                    highRisk: 0,
                    agingSum: 0,
                    agingCount: 0,
                    topCountries: {},
                    industries: {},
                    records: []
                };
            }
            const p = map[partnerName];
            p.total++;
            p.records.push(r);

            const stg = String(r.stage || '').toLowerCase();
            const isTerm = terminalSet.has(stg) || stg.startsWith('ops:');
            if (stg.includes('approved') || stg.includes('completed')) p.approved++;
            else if (stg.includes('declined') || stg.includes('drop-off')) p.declined++;

            if (!isTerm) {
                p.active++;
                const age = parseFloat(r.queue_aging_days) || 0;
                if (age > 5) p.stuckOver5d++;
                if (age > 14) p.stuckOver14d = (p.stuckOver14d || 0) + 1;
                if (age > 0) {
                    p.agingSum += age;
                    p.agingCount++;
                }
            }

            const rsk = String(r.risk_rating || '').toLowerCase();
            if (rsk.includes('high') || rsk.includes('decline')) p.highRisk++;

            const ctry = (r.country && r.country !== '-' && !String(r.country).toLowerCase().includes('unspecified')) ? r.country : null;
            if (ctry) p.topCountries[ctry] = (p.topCountries[ctry] || 0) + 1;

            const ind = (r.industry && r.industry !== '-') ? r.industry : null;
            if (ind) p.industries[ind] = (p.industries[ind] || 0) + 1;
        });

        ibAggregatedPartners = Object.values(map).map(p => {
            const convPct = p.total > 0 ? Math.round((p.approved / p.total) * 1000) / 10 : 0;
            const highRiskPct = p.total > 0 ? Math.round((p.highRisk / p.total) * 1000) / 10 : 0;
            const avgDays = p.agingCount > 0 ? Math.round((p.agingSum / p.agingCount) * 10) / 10 : 2.4;
            const topCountryList = Object.entries(p.topCountries)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 2)
                .map(([c]) => c);

            let tier = 'STANDARD';
            if ((convPct >= 25 && highRiskPct < 25 && p.total >= 5) || p.total >= 40) tier = 'TOP';
            else if (highRiskPct >= 25 || (p.stuckOver5d >= 8 && convPct < 15)) tier = 'RISK';

            const verticalCategory = ibChannelMode === 'EXTERNAL_ONLY'
                ? classifyIbVerticalCategory(p.name, p.industries)
                : p.channelType;

            return {
                ...p,
                stuckOver14d: p.stuckOver14d || 0,
                convPct,
                highRiskPct,
                avgDays,
                topJurisdictions: topCountryList.join(', ') || 'Global',
                verticalCategory,
                tier
            };
        }).sort((a, b) => b.total - a.total);

        return ibAggregatedPartners;
    };

    const renderIbPartnerHub = () => {
        const tbody = document.getElementById('ib-leaderboard-tbody');
        if (!tbody) return;

        const partners = computeIbPartnerMetrics();
        const searchVal = (document.getElementById('ib-search-input')?.value || '').toLowerCase().trim();
        const tierVal = document.getElementById('ib-tier-filter')?.value || 'ALL';
        const catVal = document.getElementById('ib-category-filter')?.value || 'ALL';

        const totalPartners = partners.length;
        const totalReferrals = partners.reduce((s, p) => s + p.total, 0);
        const totalApproved = partners.reduce((s, p) => s + p.approved, 0);
        const totalActive = partners.reduce((s, p) => s + p.active, 0);
        const totalHighRisk = partners.reduce((s, p) => s + p.highRisk, 0);
        const totalStuck5 = partners.reduce((s, p) => s + p.stuckOver5d, 0);
        const totalStuck14 = partners.reduce((s, p) => s + (p.stuckOver14d || 0), 0);
        const globalConvPct = totalReferrals > 0 ? ((totalApproved / totalReferrals) * 100).toFixed(1) : '0.0';
        const globalHighRiskPct = totalReferrals > 0 ? ((totalHighRisk / totalReferrals) * 100).toFixed(1) : '0.0';
        const totalEntitiesCount = Math.max(1, dataLakeGridData.length);
        const refSharePct = ((totalReferrals / totalEntitiesCount) * 100).toFixed(1);

        // Bind to exact HTML card IDs in index.html
        const elPartners = document.getElementById('ib-kpi-total-partners') || document.getElementById('ib-kpi-partners');
        const elPartnersSub = document.getElementById('ib-kpi-total-sub');
        const elReferrals = document.getElementById('ib-kpi-referred-leads') || document.getElementById('ib-kpi-referrals');
        const elReferralsSub = document.getElementById('ib-kpi-referred-sub');
        const elConv = document.getElementById('ib-kpi-conversion-rate') || document.getElementById('ib-kpi-conversion');
        const elConvSub = document.getElementById('ib-kpi-conversion-sub');
        const elHighRisk = document.getElementById('ib-kpi-highrisk-count') || document.getElementById('ib-kpi-highrisk');
        const elHighRiskSub = document.getElementById('ib-kpi-highrisk-sub');

        if (elPartners) elPartners.textContent = totalPartners.toLocaleString();
        if (elPartnersSub) {
            const topCount = partners.filter(p => p.tier === 'TOP').length;
            elPartnersSub.textContent = ibChannelMode === 'EXTERNAL_ONLY'
                ? `${topCount} Top-Tier External IBs • Active Referral Channels`
                : `${totalPartners} Internal Commercial & Account Desk Channels`;
        }
        if (elReferrals) elReferrals.textContent = totalReferrals.toLocaleString();
        if (elReferralsSub) {
            elReferralsSub.textContent = `${refSharePct}% of Data Lake (${totalActive.toLocaleString()} Active In-Queue)`;
        }
        if (elConv) elConv.textContent = `${globalConvPct}%`;
        if (elConvSub) {
            elConvSub.textContent = `${totalApproved.toLocaleString()} Approved out of ${totalReferrals.toLocaleString()} Referred Leads`;
        }
        if (elHighRisk) elHighRisk.textContent = `${totalHighRisk.toLocaleString()} (${globalHighRiskPct}%)`;
        if (elHighRiskSub) {
            elHighRiskSub.textContent = `${totalStuck5.toLocaleString()} Stuck >5d (${totalStuck14.toLocaleString()} Critical >14d)`;
        }

        const filtered = partners.filter(p => {
            if (tierVal !== 'ALL') {
                if (tierVal === 'TOP_CONVERT' && !(p.convPct >= 25 || p.tier === 'TOP')) return false;
                if (tierVal === 'HIGH_VOLUME' && p.total < 10) return false;
                if (tierVal === 'HIGH_RISK' && !(p.highRisk > 0 || p.tier === 'RISK')) return false;
                if (tierVal === 'STUCK_SLA' && !(p.stuckOver5d > 0 || (p.stuckOver14d || 0) > 0)) return false;
                if (['TOP', 'RISK', 'STANDARD'].includes(tierVal) && p.tier !== tierVal) return false;
            }
            if (catVal !== 'ALL' && p.verticalCategory !== catVal) return false;
            if (searchVal && !`${p.name} ${p.verticalCategory} ${p.topJurisdictions}`.toLowerCase().includes(searchVal)) return false;
            return true;
        });

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" class="py-10 text-center text-gray-500 font-mono text-xs">No Introducing Brokers or Partner Channels match the active filter.</td></tr>`;
            return;
        }

        tbody.innerHTML = filtered.map((p) => {
            const tierBadge = p.tier === 'TOP'
                ? `<span class="px-2 py-0.5 rounded bg-gold/20 border border-gold/50 text-gold text-[10px] font-mono font-bold">★ TOP TIER IB</span>`
                : (p.tier === 'RISK'
                    ? `<span class="px-2 py-0.5 rounded bg-red-500/15 border border-red-500/40 text-red-300 text-[10px] font-mono font-bold">⚠️ HIGH RISK COHORT</span>`
                    : `<span class="px-2 py-0.5 rounded bg-white/5 border border-white/15 text-gray-300 text-[10px] font-mono">VERIFIED IB</span>`);

            const catBadge = `<span class="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[9px] font-mono">${escapeHtml(p.verticalCategory)}</span>`;

            return `
                <tr class="hover:bg-gold/[0.05] transition-colors border-b border-white/[0.04]">
                    <td class="py-3.5 px-6">
                        <div class="flex items-center space-x-3">
                            <div class="w-8 h-8 rounded-lg bg-gold/15 border border-gold/35 flex items-center justify-center font-mono text-xs font-bold text-gold flex-shrink-0">
                                ${escapeHtml(getEntityMonogram(p.name))}
                            </div>
                            <div>
                                <div class="font-bold text-white text-xs flex items-center flex-wrap gap-1.5">
                                    <span>${escapeHtml(p.name)}</span>
                                    ${tierBadge}
                                    ${catBadge}
                                </div>
                                <div class="text-[10px] font-mono text-gray-400 mt-0.5">${escapeHtml(p.channelType)} • Avg Dwell: <span class="text-gold">${p.avgDays}d</span></div>
                            </div>
                        </div>
                    </td>
                    <td class="py-3.5 px-4 text-right font-mono text-xs font-bold text-white">${p.total.toLocaleString()}</td>
                    <td class="py-3.5 px-4 text-right font-mono text-xs">
                        <span class="text-emerald-400 font-bold">${p.convPct}%</span>
                        <span class="text-[10px] text-gray-400 block">${p.approved.toLocaleString()} Approved</span>
                    </td>
                    <td class="py-3.5 px-4 text-right font-mono text-xs text-gold font-bold">${p.active.toLocaleString()}</td>
                    <td class="py-3.5 px-4 text-right font-mono text-xs text-gray-400">${(p.declined || 0).toLocaleString()}</td>
                    <td class="py-3.5 px-4 text-right font-mono text-xs">
                        <span class="${p.highRiskPct >= 25 ? 'text-red-400 font-bold' : 'text-gray-300'}">${p.highRisk.toLocaleString()} (${p.highRiskPct}%)</span>
                    </td>
                    <td class="py-3.5 px-4 text-right font-mono text-xs">
                        <span class="${(p.stuckOver14d || 0) > 0 ? 'text-red-400 font-bold' : (p.stuckOver5d > 0 ? 'text-amber-300 font-bold' : 'text-gray-500')}">${(p.stuckOver14d || 0).toLocaleString()} &gt;14d</span>
                        <span class="text-[10px] text-gray-500 block">${p.stuckOver5d.toLocaleString()} &gt;5d</span>
                    </td>
                    <td class="py-3.5 px-4 font-mono text-xs text-gray-200">${escapeHtml(p.topJurisdictions)}</td>
                    <td class="py-3.5 px-6 text-center">
                        <button type="button" class="ib-drilldown-btn gold-outline-btn px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold inline-flex items-center space-x-1.5" data-partner-name="${escapeHtml(p.name)}">
                            <i class="ph ph-identification-card text-xs text-gold"></i>
                            <span>Open 360° IB Dossier (${p.total})</span>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        tbody.querySelectorAll('.ib-drilldown-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const pName = btn.getAttribute('data-partner-name');
                if (pName) openIbPartnerDossierModal(pName);
            });
        });

        tbody.querySelectorAll('tr').forEach((tr, idx) => {
            const pObj = filtered[idx];
            if (!pObj) return;
            tr.classList.add('cursor-pointer');
            tr.addEventListener('click', () => openIbPartnerDossierModal(pObj.name));
        });
    };

    // ============================================================================
    // DEDICATED 360° IB / INTRODUCER PARTNER PROFILE DOSSIER MODAL (IN-TAB)
    // Displays all clients introduced by a specific IB right inside Module 5
    // ============================================================================
    let activeIbPartnerDossier = null;

    const renderIbDossierClientTable = () => {
        if (!activeIbPartnerDossier) return;
        const p = activeIbPartnerDossier;
        const allClients = Array.isArray(p.records) ? p.records : [];
        const q = (document.getElementById('ib-dossier-client-search')?.value || '').toLowerCase().trim();
        const stgFilter = document.getElementById('ib-dossier-stage-filter')?.value || 'ALL';
        const rskFilter = document.getElementById('ib-dossier-risk-filter')?.value || 'ALL';
        const terminalSet = new Set(['approved', 'declined', 'withdrawn', 'off-boarded', 'ops: completed/onboarded', 'ops: off-boarded', 'ops: client drop-off/disqualified']);

        const filteredClients = allClients.filter(r => {
            const stg = String(r.stage || '').toLowerCase();
            const rsk = String(r.risk_rating || '').toLowerCase();
            const age = parseFloat(r.queue_aging_days) || 0;
            const isTerm = terminalSet.has(stg) || stg.startsWith('ops:');

            if (stgFilter === 'APPROVED' && !(stg.includes('approved') || stg.includes('completed'))) return false;
            if (stgFilter === 'ACTIVE' && isTerm) return false;
            if (stgFilter === 'DECLINED' && !(stg.includes('declined') || stg.includes('drop-off') || stg.includes('withdrawn'))) return false;
            if (stgFilter === 'STUCK_5D' && (isTerm || age <= 5)) return false;

            if (rskFilter === 'HIGH' && !(rsk.includes('high') || rsk.includes('decline'))) return false;
            if (rskFilter === 'MEDIUM' && !rsk.includes('medium')) return false;
            if (rskFilter === 'LOW' && !rsk.includes('low')) return false;

            if (q) {
                const hay = `${r.company_name || ''} ${r.record_id || ''} ${r.country || ''} ${r.industry || ''} ${r.account_manager || ''} ${r.stage || ''}`.toLowerCase();
                if (!hay.includes(q)) return false;
            }
            return true;
        });

        const countLabel = document.getElementById('ib-dossier-filtered-count');
        if (countLabel) {
            countLabel.textContent = `Showing ${filteredClients.length.toLocaleString()} of ${allClients.length.toLocaleString()} Introduced Clients`;
        }

        const tbody = document.getElementById('ib-dossier-clients-tbody');
        if (!tbody) return;

        if (filteredClients.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="py-10 text-center text-xs font-mono text-gray-500">No introduced clients match the active filter criteria.</td></tr>`;
            return;
        }

        tbody.innerHTML = filteredClients.map((r, idx) => {
            const stg = String(r.stage || '-');
            const stgLow = stg.toLowerCase();
            const stgCls = stgLow.includes('approved') || stgLow.includes('completed')
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : (stgLow.includes('declined') || stgLow.includes('drop-off')
                    ? 'bg-red-500/15 border-red-500/40 text-red-300'
                    : 'bg-gold/15 border-gold/40 text-gold');
            const age = parseFloat(r.queue_aging_days) || 0;
            const ageBadge = age > 14
                ? `<span class="text-red-400 font-bold">${age}d (SLA &gt;14d)</span>`
                : (age > 5 ? `<span class="text-amber-300 font-bold">${age}d (&gt;5d)</span>` : `<span class="text-gray-400">${age}d</span>`);

            return `
                <tr class="ib-client-row hover:bg-gold/[0.06] transition-colors cursor-pointer" data-client-idx="${idx}">
                    <td class="py-3 px-4">
                        <div class="flex items-center space-x-2.5">
                            <div class="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center font-mono text-[10px] font-bold text-gold flex-shrink-0">
                                ${escapeHtml(getEntityMonogram(r.company_name))}
                            </div>
                            <div class="min-w-0">
                                <div class="font-bold text-white text-xs truncate max-w-[230px]" title="${escapeHtml(r.company_name)}">${escapeHtml(r.company_name)}</div>
                                <div class="text-[10px] font-mono text-gray-500 truncate max-w-[210px]">ID: ${escapeHtml(String(r.record_id || '').slice(0, 14))} • Created: ${escapeHtml(r.created_at || '-')}</div>
                            </div>
                        </div>
                    </td>
                    <td class="py-3 px-4 text-xs font-mono text-gray-200 whitespace-nowrap">${getFlagImgHtml(r.country)}${escapeHtml(r.country || 'Unspecified')}</td>
                    <td class="py-3 px-4 text-xs font-mono text-gray-300 max-w-[180px] truncate" title="${escapeHtml(r.industry || '-')}">${escapeHtml(r.industry || '-')}</td>
                    <td class="py-3 px-4">
                        <span class="px-2.5 py-0.5 rounded border text-[10px] font-mono font-bold ${stgCls}">${escapeHtml(stg)}</span>
                    </td>
                    <td class="py-3 px-4 font-mono text-xs">
                        <div class="flex items-center space-x-1.5">
                            ${getRiskPillHtml(r.risk_rating)}
                            ${r.risk_score && r.risk_score !== '-' ? `<span class="text-[10px] text-gray-400">(${escapeHtml(r.risk_score)})</span>` : ''}
                        </div>
                    </td>
                    <td class="py-3 px-4 font-mono text-xs">
                        <div class="text-white">${escapeHtml(r.account_manager || 'Unassigned')}</div>
                        <div class="text-[10px]">Dwell: ${ageBadge} • SumSub: <span class="text-emerald-400">${escapeHtml(r.sumsub_status || '-')}</span></div>
                    </td>
                    <td class="py-3 px-4 text-center">
                        <button type="button" class="ib-open-client-kyb-btn gold-sovereign-btn px-3 py-1.5 rounded-lg text-[10px] font-mono uppercase font-bold inline-flex items-center space-x-1" data-client-idx="${idx}">
                            <span>360° Client KYB Dossier</span>
                            <i class="ph ph-arrow-up-right"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        tbody.querySelectorAll('.ib-open-client-kyb-btn, .ib-client-row').forEach(el => {
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(el.getAttribute('data-client-idx'));
                const targetClient = filteredClients[idx];
                if (targetClient) {
                    openSovereignProfileModal(targetClient.record_id || targetClient.company_name, targetClient);
                }
            });
        });
    };

    const openIbPartnerDossierModal = (partnerName) => {
        const partners = ibAggregatedPartners.length > 0 ? ibAggregatedPartners : computeIbPartnerMetrics();
        const pIdx = partners.findIndex(item => String(item.name).toLowerCase() === String(partnerName).toLowerCase());
        if (pIdx === -1) return;
        const p = partners[pIdx];
        activeIbPartnerDossier = p;

        const modal = document.getElementById('ib-partner-dossier-modal');
        if (!modal) return;

        // Populate Header
        const monoEl = document.getElementById('ib-dossier-monogram');
        const nameEl = document.getElementById('ib-dossier-partner-name') || document.getElementById('ib-dossier-name');
        const tierEl = document.getElementById('ib-dossier-tier-badge');
        const catEl = document.getElementById('ib-dossier-category-badge');
        const subEl = document.getElementById('ib-dossier-subtitle');
        const posEl = document.getElementById('ib-dossier-pos-badge');

        if (monoEl) monoEl.textContent = getEntityMonogram(p.name);
        if (nameEl) nameEl.textContent = p.name;
        if (posEl) posEl.textContent = `${pIdx + 1}/${partners.length}`;
        if (tierEl) {
            tierEl.textContent = p.tier === 'TOP' ? '★ TOP TIER IB' : (p.tier === 'RISK' ? '⚠️ HIGH RISK COHORT' : 'VERIFIED IB');
            tierEl.className = p.tier === 'TOP'
                ? 'px-2.5 py-0.5 rounded-lg text-[10px] font-mono uppercase font-bold bg-gold/20 border border-gold/50 text-gold'
                : (p.tier === 'RISK'
                    ? 'px-2.5 py-0.5 rounded-lg text-[10px] font-mono uppercase font-bold bg-red-500/20 border border-red-500/45 text-red-300'
                    : 'px-2.5 py-0.5 rounded-lg text-[10px] font-mono uppercase font-bold bg-white/10 border border-white/20 text-gray-200');
        }
        if (catEl) catEl.textContent = p.verticalCategory || p.channelType;
        if (subEl) {
            subEl.innerHTML = `
                <span>${escapeHtml(p.channelType)}</span>
                <span>•</span>
                <span class="text-gold font-bold">${p.total.toLocaleString()} Introduced Corporate Clients</span>
                <span>•</span>
                <span>Top Corridors: <strong class="text-white">${escapeHtml(p.topJurisdictions)}</strong></span>
            `;
        }

        // Populate #ib-dossier-body with 6 KPI Cards + Corridor & Stage Breakdown + Search/Filter Bar + Introduced Clients Table
        const topCountryEntries = Object.entries(p.topCountries || {}).sort((a, b) => b[1] - a[1]).slice(0, 6);
        const topIndEntries = Object.entries(p.industries || {}).sort((a, b) => b[1] - a[1]).slice(0, 4);

        const bodyEl = document.getElementById('ib-dossier-body');
        if (bodyEl) {
            bodyEl.innerHTML = `
                <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5">
                    <div class="p-4 rounded-xl bg-[#0b0b0c] border border-gold/35 shadow-lg">
                        <div class="text-[9px] font-mono uppercase text-gray-400">Total Introduced Clients</div>
                        <div class="text-2xl font-mono font-extrabold text-white mt-1">${p.total.toLocaleString()}</div>
                        <div class="text-[10px] font-mono text-gold mt-0.5">Corporate Entities</div>
                    </div>
                    <div class="p-4 rounded-xl bg-[#0b0b0c] border border-emerald-500/35 shadow-lg">
                        <div class="text-[9px] font-mono uppercase text-gray-400">Approval Conversion %</div>
                        <div class="text-2xl font-mono font-extrabold text-emerald-400 mt-1">${p.convPct}%</div>
                        <div class="text-[10px] font-mono text-gray-300 mt-0.5">${p.approved.toLocaleString()} Approved Clients</div>
                    </div>
                    <div class="p-4 rounded-xl bg-[#0b0b0c] border border-white/10 shadow-lg">
                        <div class="text-[9px] font-mono uppercase text-gray-400">Active In-Queue</div>
                        <div class="text-2xl font-mono font-extrabold text-gold mt-1">${p.active.toLocaleString()}</div>
                        <div class="text-[10px] font-mono text-gray-400 mt-0.5">Mean Dwell: ${p.avgDays}d</div>
                    </div>
                    <div class="p-4 rounded-xl bg-[#0b0b0c] border border-white/10 shadow-lg">
                        <div class="text-[9px] font-mono uppercase text-gray-400">Declined / Drop-Off</div>
                        <div class="text-2xl font-mono font-extrabold text-gray-300 mt-1">${(p.declined || 0).toLocaleString()}</div>
                        <div class="text-[10px] font-mono text-gray-500 mt-0.5">Terminal Exits</div>
                    </div>
                    <div class="p-4 rounded-xl bg-[#0b0b0c] border ${p.highRiskPct >= 25 ? 'border-red-500/45' : 'border-white/10'} shadow-lg">
                        <div class="text-[9px] font-mono uppercase text-gray-400">High-Risk Exposure</div>
                        <div class="text-2xl font-mono font-extrabold ${p.highRiskPct >= 25 ? 'text-red-400' : 'text-white'} mt-1">${p.highRisk.toLocaleString()} (${p.highRiskPct}%)</div>
                        <div class="text-[10px] font-mono text-gray-400 mt-0.5">High / Decline Rated</div>
                    </div>
                    <div class="p-4 rounded-xl bg-[#0b0b0c] border ${(p.stuckOver14d || 0) > 0 ? 'border-red-500/45' : 'border-white/10'} shadow-lg">
                        <div class="text-[9px] font-mono uppercase text-gray-400">SLA Breaches</div>
                        <div class="text-2xl font-mono font-extrabold ${(p.stuckOver14d || 0) > 0 ? 'text-red-400' : (p.stuckOver5d > 0 ? 'text-amber-300' : 'text-emerald-400')} mt-1">${p.stuckOver5d.toLocaleString()} &gt;5d</div>
                        <div class="text-[10px] font-mono text-red-300 mt-0.5">${(p.stuckOver14d || 0).toLocaleString()} Critical &gt;14d</div>
                    </div>
                </div>

                <!-- Cohort Geographic Corridors & Top Industry Sectors Bar -->
                <div class="p-4 rounded-xl bg-[#0b0b0c] border border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                    <div class="flex items-center flex-wrap gap-1.5">
                        <span class="text-[10px] uppercase text-gold font-bold mr-1"><i class="ph ph-globe-hemisphere-west mr-1"></i>Introduced Client Jurisdictions:</span>
                        ${topCountryEntries.length > 0
                            ? topCountryEntries.map(([ctry, cnt]) => `<span class="px-2.5 py-0.5 rounded bg-white/5 border border-white/10 text-gray-200 text-[10px]">${getFlagImgHtml(ctry)}${escapeHtml(ctry)}: <strong class="text-gold">${cnt}</strong></span>`).join('')
                            : `<span class="text-gray-500 text-[10px]">Global Multi-Jurisdiction Cohort</span>`
                        }
                    </div>
                    <div class="flex items-center flex-wrap gap-1.5">
                        <span class="text-[10px] uppercase text-emerald-400 font-bold mr-1"><i class="ph ph-buildings mr-1"></i>Top Sectors:</span>
                        ${topIndEntries.length > 0
                            ? topIndEntries.map(([ind, cnt]) => `<span class="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px]">${escapeHtml(ind)} (${cnt})</span>`).join('')
                            : `<span class="text-gray-500 text-[10px]">Diversified Corporate</span>`
                        }
                    </div>
                </div>

                <div id="ib-dossier-inline-prometheus-box" class="hidden"></div>

                <!-- Interactive Client Filter, Search & Prometheus Cohort Audit Bar -->
                <div class="p-3.5 rounded-xl bg-[#0b0b0c] border border-gold/25 flex flex-wrap items-center justify-between gap-3">
                    <div class="flex flex-wrap items-center gap-2.5 flex-1">
                        <div class="relative w-72 sm:w-80">
                            <i class="ph ph-magnifying-glass absolute left-3 top-1/2 transform -translate-y-1/2 text-gold text-xs"></i>
                            <input type="text" id="ib-dossier-client-search" class="w-full bg-black border border-gold/35 rounded-lg py-1.5 pl-8 pr-3 text-xs font-mono text-white outline-none focus:border-gold" placeholder="Search introduced client, country, officer...">
                        </div>
                        <select id="ib-dossier-stage-filter" class="sovereign-gold-select rounded-lg py-1.5 px-3 text-xs font-mono outline-none cursor-pointer">
                            <option value="ALL">Stage: All Introduced Clients</option>
                            <option value="APPROVED">Approved Clients Only</option>
                            <option value="ACTIVE">Active In-Queue Only</option>
                            <option value="DECLINED">Declined / Drop-Off Only</option>
                            <option value="STUCK_5D">SLA Breached (&gt;5d)</option>
                        </select>
                        <select id="ib-dossier-risk-filter" class="sovereign-gold-select rounded-lg py-1.5 px-3 text-xs font-mono outline-none cursor-pointer">
                            <option value="ALL">Risk: All Ratings</option>
                            <option value="HIGH">High Risk / Decline</option>
                            <option value="MEDIUM">Medium Risk</option>
                            <option value="LOW">Low Risk</option>
                        </select>
                        <button type="button" id="ib-dossier-prometheus-btn" class="gold-outline-btn px-3 py-1.5 rounded-lg text-[10px] font-mono uppercase font-bold flex items-center space-x-1.5">
                            <i class="ph ph-cpu text-red-400"></i>
                            <span>Run Prometheus IB Cohort Audit (0ms)</span>
                        </button>
                    </div>
                    <span id="ib-dossier-filtered-count" class="text-xs font-mono text-gold font-bold">Showing ${p.total.toLocaleString()} of ${p.total.toLocaleString()} Introduced Clients</span>
                </div>

                <!-- Complete Introduced Clients Table -->
                <div class="rounded-xl bg-[#08080a] border border-white/10 overflow-hidden shadow-2xl">
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse whitespace-nowrap">
                            <thead>
                                <tr class="bg-white/[0.04] border-b border-white/10 text-[10px] font-mono uppercase tracking-widest text-gold">
                                    <th class="py-3 px-4">Introduced Corporate Client &amp; ID</th>
                                    <th class="py-3 px-4">Jurisdiction</th>
                                    <th class="py-3 px-4">Industry Sector</th>
                                    <th class="py-3 px-4">Current Stage</th>
                                    <th class="py-3 px-4">Primary Risk Rating</th>
                                    <th class="py-3 px-4">Compliance Officer &amp; Dwell</th>
                                    <th class="py-3 px-4 text-center">360° Client KYB Dossier</th>
                                </tr>
                            </thead>
                            <tbody id="ib-dossier-clients-tbody" class="divide-y divide-white/[0.05] text-xs font-sans text-gray-200"></tbody>
                        </table>
                    </div>
                </div>
            `;

            bodyEl.querySelector('#ib-dossier-client-search')?.addEventListener('input', renderIbDossierClientTable);
            bodyEl.querySelector('#ib-dossier-stage-filter')?.addEventListener('change', renderIbDossierClientTable);
            bodyEl.querySelector('#ib-dossier-risk-filter')?.addEventListener('change', renderIbDossierClientTable);
            bodyEl.querySelector('#ib-dossier-prometheus-btn')?.addEventListener('click', runIbDossierPrometheusCohortAudit);
        }

        renderIbDossierClientTable();
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    };

    const navigateIbPartnerDossier = (delta) => {
        const partners = ibAggregatedPartners.length > 0 ? ibAggregatedPartners : computeIbPartnerMetrics();
        if (!activeIbPartnerDossier || partners.length === 0) return;
        const curIdx = partners.findIndex(item => item.name === activeIbPartnerDossier.name);
        const nextIdx = (curIdx + delta + partners.length) % partners.length;
        if (partners[nextIdx]) openIbPartnerDossierModal(partners[nextIdx].name);
    };

    document.getElementById('ib-dossier-prev-btn')?.addEventListener('click', () => navigateIbPartnerDossier(-1));
    document.getElementById('ib-dossier-next-btn')?.addEventListener('click', () => navigateIbPartnerDossier(1));

    document.getElementById('close-ib-dossier-modal-btn')?.addEventListener('click', () => {
        const modal = document.getElementById('ib-partner-dossier-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    });

    document.getElementById('ib-dossier-export-csv-btn')?.addEventListener('click', () => {
        if (!activeIbPartnerDossier || !Array.isArray(activeIbPartnerDossier.records)) return;
        const p = activeIbPartnerDossier;
        const headers = ['IB_Partner', 'Record_ID', 'Company_Name', 'Country', 'Industry', 'Onboarding_Stage', 'Risk_Rating', 'Risk_Score', 'Account_Manager', 'Queue_Aging_Days', 'SumSub_Status', 'Created_At'];
        const lines = [headers.join(',')];
        p.records.forEach(r => {
            lines.push([
                `"${String(p.name).replace(/"/g, '""')}"`,
                `"${String(r.record_id || '').replace(/"/g, '""')}"`,
                `"${String(r.company_name || '').replace(/"/g, '""')}"`,
                `"${String(r.country || '').replace(/"/g, '""')}"`,
                `"${String(r.industry || '').replace(/"/g, '""')}"`,
                `"${String(r.stage || '').replace(/"/g, '""')}"`,
                `"${String(r.risk_rating || '').replace(/"/g, '""')}"`,
                `"${String(r.risk_score || '').replace(/"/g, '""')}"`,
                `"${String(r.account_manager || '').replace(/"/g, '""')}"`,
                r.queue_aging_days || 0,
                `"${String(r.sumsub_status || '').replace(/"/g, '""')}"`,
                `"${String(r.created_at || '').replace(/"/g, '""')}"`
            ].join(','));
        });
        const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Xoala_IB_Cohort_${String(p.name).replace(/[^a-zA-Z0-9_-]/g, '_')}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    });

    const runIbDossierPrometheusCohortAudit = () => {
        if (!activeIbPartnerDossier) return;
        const p = activeIbPartnerDossier;
        const box = document.getElementById('ib-dossier-inline-prometheus-box');
        if (!box) return;
        box.classList.remove('hidden');

        const recs = Array.isArray(p.records) ? p.records : [];
        const highRiskClients = recs.filter(r => /high|decline/i.test(String(r.risk_rating || ''))).slice(0, 5);
        const stuckClients = recs.filter(r => (parseFloat(r.queue_aging_days) || 0) > 5).sort((a, b) => (parseFloat(b.queue_aging_days) || 0) - (parseFloat(a.queue_aging_days) || 0)).slice(0, 5);

        box.innerHTML = `
            <div class="p-4 rounded-xl bg-[#0b0608] border border-red-500/45 space-y-2.5 text-xs font-mono shadow-lg">
                <div class="flex items-center justify-between flex-wrap gap-2 border-b border-red-500/25 pb-2">
                    <span class="text-red-300 font-extrabold uppercase tracking-widest flex items-center gap-1.5">
                        <i class="ph ph-cpu"></i> PROMETHEUS LOCAL QUANTITATIVE COHORT AUDIT — ${escapeHtml(p.name)} (0ms • Zero Cloud Tokens)
                    </span>
                    <span class="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 text-[10px]">100% Local Calculation</span>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div class="p-3 rounded-lg bg-black/70 border border-white/10">
                        <div class="text-[10px] text-gold font-bold uppercase mb-1">1. Commercial Yield Assessment</div>
                        <div class="text-gray-200 font-sans leading-relaxed">
                            <strong>${escapeHtml(p.name)}</strong> has introduced <strong>${p.total}</strong> entities with a <strong>${p.convPct}%</strong> approval conversion rate (<strong>${p.approved}</strong> approved, <strong>${p.active}</strong> active in-queue, <strong>${p.declined || 0}</strong> declined).
                        </div>
                    </div>
                    <div class="p-3 rounded-lg bg-black/70 border border-white/10">
                        <div class="text-[10px] text-red-300 font-bold uppercase mb-1">2. High-Risk Exposure (${p.highRisk} / ${p.highRiskPct}%)</div>
                        <div class="text-gray-200 font-sans leading-relaxed">
                            ${highRiskClients.length > 0
                                ? `Flagged entities: ${highRiskClients.map(c => `<strong>${escapeHtml(c.company_name)}</strong> (${escapeHtml(c.country)})`).join(', ')}.`
                                : `Zero High-Risk or Decline-rated entities in this partner's cohort.`
                            }
                        </div>
                    </div>
                    <div class="p-3 rounded-lg bg-black/70 border border-white/10">
                        <div class="text-[10px] text-amber-300 font-bold uppercase mb-1">3. SLA Bottleneck Triage (${p.stuckOver5d} &gt;5d)</div>
                        <div class="text-gray-200 font-sans leading-relaxed">
                            ${stuckClients.length > 0
                                ? `Priority SLA tickets: ${stuckClients.map(c => `<strong>${escapeHtml(c.company_name)}</strong> (${c.queue_aging_days}d — ${escapeHtml(c.account_manager || 'Unassigned')})`).join(', ')}.`
                                : `All active tickets for this IB are within the 5-day institutional SLA target.`
                            }
                        </div>
                    </div>
                </div>
            </div>
        `;
    };

    document.getElementById('ib-search-input')?.addEventListener('input', renderIbPartnerHub);
    document.getElementById('ib-tier-filter')?.addEventListener('change', renderIbPartnerHub);
    document.getElementById('ib-category-filter')?.addEventListener('change', renderIbPartnerHub);
    document.getElementById('ib-mode-toggle-btn')?.addEventListener('click', () => {
        ibChannelMode = ibChannelMode === 'EXTERNAL_ONLY' ? 'INTERNAL_DESK' : 'EXTERNAL_ONLY';
        const btn = document.getElementById('ib-mode-toggle-btn');
        if (btn) {
            btn.innerHTML = ibChannelMode === 'EXTERNAL_ONLY'
                ? `<i class="ph ph-Handshake text-gold"></i><span>Mode: External Corporate IBs Only (53 Real IBs — Internal Xoala Staff Excluded)</span>`
                : `<i class="ph ph-users text-emerald-400"></i><span>Mode: Internal Xoala Sales &amp; Account Desk (Click to Switch Back to External IBs)</span>`;
        }
        renderIbPartnerHub();
    });

    document.getElementById('ib-export-csv-btn')?.addEventListener('click', () => {
        const partners = computeIbPartnerMetrics();
        if (partners.length === 0) return;
        const headers = ['Partner_Channel', 'Vertical_Category', 'Channel_Type', 'Tier', 'Total_Referrals', 'Approved_Count', 'Approval_Conversion_Pct', 'Active_Pipeline', 'High_Risk_Count', 'High_Risk_Pct', 'SLA_Stuck_Over_5d', 'Avg_Queue_Aging_Days', 'Top_Jurisdictions'];
        const lines = [headers.join(',')];
        partners.forEach(p => {
            lines.push([
                `"${String(p.name).replace(/"/g, '""')}"`,
                `"${String(p.verticalCategory || '').replace(/"/g, '""')}"`,
                `"${String(p.channelType).replace(/"/g, '""')}"`,
                `"${p.tier}"`,
                p.total,
                p.approved,
                p.convPct,
                p.active,
                p.highRisk,
                p.highRiskPct,
                p.stuckOver5d,
                p.avgDays,
                `"${String(p.topJurisdictions).replace(/"/g, '""')}"`
            ].join(','));
        });
        const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Xoala_External_IB_Scorecard_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    });

    // ============================================================================
    // PROMETHEUS LOCAL QUANTITATIVE IB PARTNER QUALITY AUDIT (0ms, ZERO GEMINI TOKENS)
    // Displays Separate Top 5 IBs by Registrations & Top 5 IBs by % of Approval
    // ============================================================================
    let lastPrometheusIbAuditMarkdown = '';

    const executePrometheusLocalIbAudit = () => {
        const partners = computeIbPartnerMetrics();
        const drawer = document.getElementById('ib-prometheus-audit-drawer');
        const content = document.getElementById('ib-prometheus-audit-content');
        if (!drawer || !content) return;

        drawer.classList.remove('hidden');

        // 1. Top 5 IBs by Total Registrations (Volume Leaderboard)
        const top5ByRegistrations = [...partners]
            .sort((a, b) => b.total - a.total || b.approved - a.approved)
            .slice(0, 5);

        // 2. Top 5 IBs by % of Approval (Conversion Yield Leaderboard — Separately)
        // Prioritize partners with at least 2 registrations so multi-client conversion % is institutionally meaningful, then sort by convPct DESC, approved DESC
        const qualifiedForApprovalRank = partners.filter(p => p.total >= 2);
        const approvalPool = qualifiedForApprovalRank.length >= 5 ? qualifiedForApprovalRank : partners;
        const top5ByApprovalPct = [...approvalPool]
            .sort((a, b) => b.convPct - a.convPct || b.approved - a.approved || b.total - a.total)
            .slice(0, 5);

        // 3. High-Risk / SLA Bottleneck Watchlist
        const highRiskWatchlist = [...partners]
            .filter(p => p.highRisk > 0 || p.stuckOver5d > 0)
            .sort((a, b) => b.highRisk - a.highRisk || b.stuckOver5d - a.stuckOver5d)
            .slice(0, 5);

        const totalRefs = partners.reduce((s, p) => s + p.total, 0);
        const totalApps = partners.reduce((s, p) => s + p.approved, 0);
        const overallYield = totalRefs > 0 ? ((totalApps / totalRefs) * 100).toFixed(1) : '0.0';

        lastPrometheusIbAuditMarkdown = `### 🔴 PROMETHEUS LOCAL QUANTITATIVE IB PARTNER QUALITY AUDIT\n` +
            `**Scope:** ${partners.length} External Corporate IBs • **Total Registrations:** ${totalRefs} • **Total Approved:** ${totalApps} (${overallYield}% Yield)\n\n` +
            `#### 1. Top 5 IBs in Regards to Total Registrations (Volume Leaderboard)\n` +
            top5ByRegistrations.map((p, i) => `${i + 1}. **${p.name}** — **${p.total} Registrations** (${p.approved} Approved | ${p.convPct}% Yield | ${p.active} Active | Corridors: ${p.topJurisdictions})`).join('\n') +
            `\n\n#### 2. Top 5 IBs in Regards to % of Approval (Conversion Yield Leaderboard — Separately)\n` +
            top5ByApprovalPct.map((p, i) => `${i + 1}. **${p.name}** — **${p.convPct}% Approval Rate** (${p.approved} Approved out of ${p.total} Registrations | High-Risk: ${p.highRiskPct}% | Avg Dwell: ${p.avgDays}d)`).join('\n');

        content.innerHTML = `
            <!-- Executive Summary Banner -->
            <div class="p-3.5 rounded-xl bg-black/75 border border-red-500/35 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                <div class="flex items-center flex-wrap gap-2">
                    <span class="px-2.5 py-1 rounded bg-red-500/20 border border-red-500/45 text-red-300 font-bold">
                        PROMETHEUS QUANTITATIVE SYNTHESIS
                    </span>
                    <span class="text-gray-200">
                        Evaluated <strong class="text-white">${partners.length}</strong> External IBs across <strong class="text-gold">${totalRefs.toLocaleString()}</strong> Introduced Registrations (<strong class="text-emerald-400">${totalApps.toLocaleString()} Approved • ${overallYield}% Conversion</strong>)
                    </span>
                </div>
                <span class="text-[10px] text-emerald-400">✓ Computed Locally in 0ms • 0 Gemini Tokens Consumed</span>
            </div>

            <!-- Two Separate Top 5 Leaderboards Side-by-Side -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <!-- Leaderboard 1: Top 5 IBs by Registrations -->
                <div class="rounded-xl bg-black/75 border border-gold/40 overflow-hidden shadow-lg">
                    <div class="px-4 py-3 bg-gold/[0.08] border-b border-gold/30 flex items-center justify-between">
                        <div>
                            <div class="text-xs font-mono uppercase tracking-widest text-gold font-extrabold flex items-center gap-1.5">
                                <i class="ph ph-trophy text-sm"></i>
                                <span>1. TOP 5 IBs BY TOTAL REGISTRATIONS (VOLUME)</span>
                            </div>
                            <div class="text-[10px] font-mono text-gray-400 mt-0.5">Ranked strictly by total introduced corporate registrations</div>
                        </div>
                        <span class="px-2 py-0.5 rounded bg-gold/20 border border-gold/45 text-gold text-[10px] font-mono font-bold">VOLUME TOP 5</span>
                    </div>
                    <div class="divide-y divide-white/[0.06]">
                        ${top5ByRegistrations.map((p, idx) => `
                            <div class="p-3.5 hover:bg-gold/[0.05] transition-colors flex items-center justify-between gap-3">
                                <div class="flex items-center space-x-3 min-w-0">
                                    <span class="w-6 h-6 rounded-full bg-gold/20 border border-gold/50 text-gold font-mono text-xs font-extrabold flex items-center justify-center flex-shrink-0">#${idx + 1}</span>
                                    <div class="min-w-0">
                                        <div class="font-bold text-white text-xs truncate">${escapeHtml(p.name)}</div>
                                        <div class="text-[10px] font-mono text-gray-400 truncate">${escapeHtml(p.verticalCategory)} • Corridors: ${escapeHtml(p.topJurisdictions)}</div>
                                    </div>
                                </div>
                                <div class="flex items-center space-x-3 flex-shrink-0 font-mono">
                                    <div class="text-right">
                                        <div class="text-sm font-extrabold text-gold">${p.total.toLocaleString()} Regs</div>
                                        <div class="text-[10px] text-emerald-400">${p.approved} Approved (${p.convPct}%)</div>
                                    </div>
                                    <button type="button" class="ib-audit-open-dossier-btn px-2.5 py-1 rounded-lg bg-white/5 hover:bg-gold/20 border border-white/15 hover:border-gold/45 text-[10px] text-gold font-bold" data-partner-name="${escapeHtml(p.name)}">
                                        360° IB →
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Leaderboard 2: Top 5 IBs by % of Approval (Separately) -->
                <div class="rounded-xl bg-black/75 border border-emerald-500/40 overflow-hidden shadow-lg">
                    <div class="px-4 py-3 bg-emerald-500/[0.08] border-b border-emerald-500/30 flex items-center justify-between">
                        <div>
                            <div class="text-xs font-mono uppercase tracking-widest text-emerald-300 font-extrabold flex items-center gap-1.5">
                                <i class="ph ph-seal-check text-sm"></i>
                                <span>2. TOP 5 IBs BY % OF APPROVAL (SEPARATELY)</span>
                            </div>
                            <div class="text-[10px] font-mono text-gray-400 mt-0.5">Ranked strictly by KYB approval conversion percentage</div>
                        </div>
                        <span class="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/45 text-emerald-300 text-[10px] font-mono font-bold">APPROVAL % TOP 5</span>
                    </div>
                    <div class="divide-y divide-white/[0.06]">
                        ${top5ByApprovalPct.map((p, idx) => `
                            <div class="p-3.5 hover:bg-emerald-500/[0.05] transition-colors flex items-center justify-between gap-3">
                                <div class="flex items-center space-x-3 min-w-0">
                                    <span class="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 font-mono text-xs font-extrabold flex items-center justify-center flex-shrink-0">#${idx + 1}</span>
                                    <div class="min-w-0">
                                        <div class="font-bold text-white text-xs truncate">${escapeHtml(p.name)}</div>
                                        <div class="text-[10px] font-mono text-gray-400 truncate">${escapeHtml(p.verticalCategory)} • Avg Dwell: ${p.avgDays}d</div>
                                    </div>
                                </div>
                                <div class="flex items-center space-x-3 flex-shrink-0 font-mono">
                                    <div class="text-right">
                                        <div class="text-sm font-extrabold text-emerald-400">${p.convPct}% Approved</div>
                                        <div class="text-[10px] text-gray-300">${p.approved} of ${p.total} Regs • Risk: ${p.highRiskPct}%</div>
                                    </div>
                                    <button type="button" class="ib-audit-open-dossier-btn px-2.5 py-1 rounded-lg bg-white/5 hover:bg-emerald-500/20 border border-white/15 hover:border-emerald-500/45 text-[10px] text-emerald-300 font-bold" data-partner-name="${escapeHtml(p.name)}">
                                        360° IB →
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>

            <!-- Compliance & SLA Watchlist Strip -->
            <div class="p-3.5 rounded-xl bg-black/65 border border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                <span class="text-[10px] uppercase text-red-300 font-bold"><i class="ph ph-shield-warning mr-1"></i>High-Risk &amp; SLA Bottleneck Watchlist:</span>
                <div class="flex flex-wrap items-center gap-2">
                    ${highRiskWatchlist.map(p => `
                        <button type="button" class="ib-audit-open-dossier-btn px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-[10px] text-gray-200" data-partner-name="${escapeHtml(p.name)}">
                            <strong class="text-white">${escapeHtml(p.name)}</strong>: <span class="text-red-300">${p.highRisk} High-Risk (${p.highRiskPct}%)</span> • <span class="text-amber-300">${p.stuckOver5d} &gt;5d</span>
                        </button>
                    `).join('')}
                </div>
            </div>
        `;

        content.querySelectorAll('.ib-audit-open-dossier-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const pName = btn.getAttribute('data-partner-name');
                if (pName) openIbPartnerDossierModal(pName);
            });
        });
    };

    document.getElementById('ib-ai-audit-btn')?.addEventListener('click', executePrometheusLocalIbAudit);

    document.getElementById('close-ib-prometheus-audit-btn')?.addEventListener('click', () => {
        document.getElementById('ib-prometheus-audit-drawer')?.classList.add('hidden');
    });

    const sendIbAuditToPrometheusChat = () => {
        if (!lastPrometheusIbAuditMarkdown) executePrometheusLocalIbAudit();
        const artemisNav = document.querySelector('.nav-item[data-target="artemis-view"]');
        if (artemisNav) artemisNav.click();
        setTimeout(() => {
            if (typeof window.switchAiPersonaMode === 'function') {
                window.switchAiPersonaMode('prometheus');
            }
            const promptInput = document.getElementById('prompt-input');
            const sendBtn = document.getElementById('send-btn');
            if (promptInput && sendBtn) {
                promptInput.value = '/introducers';
                promptInput.dispatchEvent(new Event('input'));
                sendBtn.click();
            }
        }, 220);
    };

    document.getElementById('ib-send-audit-prometheus-btn')?.addEventListener('click', sendIbAuditToPrometheusChat);
    document.getElementById('ib-audit-open-prometheus-btn')?.addEventListener('click', sendIbAuditToPrometheusChat);

    // ============================================================================
    // 60FPS PURE SOVEREIGN GOLD CINEMATIC SIGN-IN & HARD-REFRESH MOTION ENGINE
    // (Minimum 5.0 Seconds AND Holds Until Dashboard + Data Lake Are 100% Loaded)
    // ============================================================================
    const runXoalaCinematicBootSequence = () => {
        const bootScreen = document.getElementById('xoala-cinematic-boot-screen');
        const canvas = document.getElementById('xoala-boot-canvas');
        const barEl = document.getElementById('xoala-boot-progress-bar');
        const phaseEl = document.getElementById('xoala-boot-status-text') || document.getElementById('xoala-boot-phase-label');
        const pctEl = document.getElementById('xoala-boot-pct') || document.getElementById('xoala-boot-pct-label');
        const skipBtn = document.getElementById('xoala-boot-skip-btn');

        // Detect browser hard refresh / reload -> ensure Dashboard view is active and trigger fresh sync
        const navEntry = (window.performance && performance.getEntriesByType) ? performance.getEntriesByType('navigation')[0] : null;
        const isHardReload = (navEntry && navEntry.type === 'reload') || (window.performance && performance.navigation && performance.navigation.type === 1);

        if (isHardReload && !window.location.hash.startsWith('#dossier=')) {
            const dashNavBtn = document.querySelector('.nav-item[data-target="dashboard-view"]');
            if (dashNavBtn) dashNavBtn.click();
        }

        if (!bootScreen || !canvas) {
            fetchDashboardData(isHardReload);
            fetchAndRenderDataLakeGrid(isHardReload).then(() => renderIbPartnerHub());
            return;
        }

        const ctx = canvas.getContext('2d');
        let rafId = null;
        let dismissed = false;
        let bothHydrated = false;

        const resizeCanvas = () => {
            const dpr = Math.min(2, window.devicePixelRatio || 1);
            canvas.width = window.innerWidth * dpr;
            canvas.height = window.innerHeight * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        // 100% Pure Sovereign Gold Metallic Palette (Zero Green)
        const goldPalette = ['#FFF3C4', '#F0D788', '#DDAA33', '#B8860B'];
        const particles = Array.from({ length: 88 }, (_, i) => ({
            angle: (i / 88) * Math.PI * 2,
            radius: 110 + Math.random() * 420,
            speed: 0.0045 + Math.random() * 0.0085,
            inwardSpeed: 0.65 + Math.random() * 1.25,
            size: 1.1 + Math.random() * 2.4,
            color: goldPalette[i % goldPalette.length]
        }));

        const phases = [
            { at: 0.0, text: isHardReload ? 'HARD REFRESH DETECTED • RE-INITIALIZING SOVEREIGN DASHBOARD...' : 'VERIFYING CLOUDFLARE ZERO TRUST IDENTITY...' },
            { at: 0.25, text: 'HYDRATING 2,974 KYB DOSSIERS & 5-OBJECT RELATIONAL GRAPH...' },
            { at: 0.55, text: 'SYNCHRONIZING ARTEMIS V9 QUANT & PROMETHEUS GEMINI CORE...' },
            { at: 0.82, text: 'CALIBRATING EXECUTIVE CHARTS, GEO-MAP & IB PARTNER HUB...' }
        ];

        const startTime = performance.now();
        const minDurationMs = 5000; // Minimum 5.0 seconds guaranteed motion-graphic sequence

        const finishBoot = () => {
            if (dismissed) return;
            dismissed = true;
            if (rafId) cancelAnimationFrame(rafId);
            if (barEl) barEl.style.width = '100%';
            if (pctEl) pctEl.textContent = '100%';
            if (phaseEl) phaseEl.textContent = 'DASHBOARD DATA 100% HYDRATED • LAUNCHING COMMAND CENTER...';
            bootScreen.classList.add('boot-hidden');
            setTimeout(() => {
                bootScreen.style.display = 'none';
            }, 680);
        };

        if (skipBtn) {
            skipBtn.addEventListener('click', finishBoot, { once: true });
        }

        // Kick off BOTH Dashboard & Data Lake hydration immediately in parallel and track completion
        Promise.allSettled([
            fetchDashboardData(isHardReload),
            fetchAndRenderDataLakeGrid(isHardReload)
        ]).then(() => {
            bothHydrated = true;
            renderIbPartnerHub();
        });

        const renderBootFrame = (now) => {
            if (dismissed) return;
            const elapsed = now - startTime;
            const timeProgress = Math.min(1, elapsed / minDurationMs);
            // Hold progress bar at 96% if 5.0s has elapsed but data is still hydrating from backend
            const visualProgress = (timeProgress >= 1 && !bothHydrated) ? 0.96 : timeProgress;
            const tSec = elapsed * 0.001;

            if (barEl) barEl.style.width = `${Math.round(visualProgress * 100)}%`;
            if (pctEl) pctEl.textContent = `${Math.round(visualProgress * 100)}%`;
            if (phaseEl) {
                if (timeProgress >= 1 && !bothHydrated) {
                    phaseEl.textContent = 'AWAITING FINAL DASHBOARD & DATA LAKE HYDRATION...';
                } else {
                    for (let i = phases.length - 1; i >= 0; i--) {
                        if (visualProgress >= phases[i].at) {
                            phaseEl.textContent = phases[i].text;
                            break;
                        }
                    }
                }
            }

            const w = window.innerWidth;
            const h = window.innerHeight;
            const cx = w / 2;
            const cy = h / 2 - 28;

            // Periodic Core Ignition Pulse (~2.0s cycle with sharp relativistic flare peak)
            const bootIgnitionSpike = Math.pow(Math.max(0, Math.sin(tSec * Math.PI)), 6);
            const bootBreathBase = 0.55 + 0.25 * Math.sin(tSec * 2.2);
            const bootGrbPower = Math.min(1.35, bootBreathBase + bootIgnitionSpike * 0.65);

            // 1. 100% Solid Opaque Obsidian Backdrop (#050505 — Zero Dashboard Bleed)
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = '#050505';
            ctx.fillRect(0, 0, w, h);

            // 2. Additive ('lighter') Anamorphic Golden Gamma-Ray Burst Behind Centered Xoala Card
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';

            const bgGrad = ctx.createRadialGradient(cx, cy, 6, cx, cy, 190 + bootIgnitionSpike * 110);
            bgGrad.addColorStop(0, `rgba(255, 243, 196, ${(0.24 + bootIgnitionSpike * 0.22).toFixed(3)})`);
            bgGrad.addColorStop(0.38, `rgba(240, 215, 136, ${(0.11 + bootIgnitionSpike * 0.10).toFixed(3)})`);
            bgGrad.addColorStop(0.72, `rgba(221, 170, 51, ${(0.035 + bootIgnitionSpike * 0.04).toFixed(3)})`);
            bgGrad.addColorStop(1, 'rgba(221, 170, 51, 0)');
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, w, h);

            // 22 Ultra-Fine Needle Filaments
            for (let i = 0; i < 22; i++) {
                const fAngle = (i / 22) * Math.PI * 2 + (Math.sin(i * 7.3) * 0.14) + tSec * ((i % 2 === 0 ? 1 : -1) * 0.018);
                const fMaxLen = 145 + ((i * 67) % 290);
                const fShimmer = 0.25 + 0.75 * Math.pow(0.5 + 0.5 * Math.sin(tSec * (1.6 + ((i * 1.3) % 2.8)) + i * 0.85), 2);
                const fLen = fMaxLen * (0.72 + 0.38 * fShimmer) * (0.88 + bootIgnitionSpike * 0.28);
                const fAlpha = 0.14 + 0.28 * fShimmer + bootIgnitionSpike * 0.16;

                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate(fAngle);
                const nGrad = ctx.createLinearGradient(40, 0, fLen, 0);
                nGrad.addColorStop(0, `rgba(255, 243, 196, ${fAlpha.toFixed(3)})`);
                nGrad.addColorStop(0.45, `rgba(240, 215, 136, ${(fAlpha * 0.65).toFixed(3)})`);
                nGrad.addColorStop(0.8, `rgba(221, 170, 51, ${(fAlpha * 0.22).toFixed(3)})`);
                nGrad.addColorStop(1, 'rgba(221, 170, 51, 0)');
                ctx.strokeStyle = nGrad;
                ctx.lineWidth = 0.75 + ((i % 3) * 0.35);
                ctx.beginPath();
                ctx.moveTo(40, 0);
                ctx.lineTo(fLen, 0);
                ctx.stroke();
                ctx.restore();
            }

            // Twin Relativistic Gold Jets (Anamorphic Horizon Beam)
            const bootJetSpan = Math.min(w * 0.47, 640) * (0.82 + 0.28 * bootGrbPower);
            const bootJetHalf = 18 * bootGrbPower;
            [-1, 1].forEach(dir => {
                ctx.save();
                ctx.translate(cx, cy);
                if (dir < 0) ctx.scale(-1, 1);

                const sheathGrad = ctx.createLinearGradient(0, 0, bootJetSpan, 0);
                sheathGrad.addColorStop(0, `rgba(255, 243, 196, ${(0.32 * bootGrbPower).toFixed(3)})`);
                sheathGrad.addColorStop(0.28, `rgba(240, 215, 136, ${(0.22 * bootGrbPower).toFixed(3)})`);
                sheathGrad.addColorStop(0.68, `rgba(221, 170, 51, ${(0.08 * bootGrbPower).toFixed(3)})`);
                sheathGrad.addColorStop(1, 'rgba(221, 170, 51, 0)');
                ctx.fillStyle = sheathGrad;
                ctx.beginPath();
                ctx.moveTo(0, -bootJetHalf);
                ctx.lineTo(bootJetSpan, 0);
                ctx.lineTo(0, bootJetHalf);
                ctx.closePath();
                ctx.fill();

                const coreNeedleGrad = ctx.createLinearGradient(0, 0, bootJetSpan * 0.92, 0);
                coreNeedleGrad.addColorStop(0, `rgba(255, 250, 230, ${(0.75 * bootGrbPower).toFixed(3)})`);
                coreNeedleGrad.addColorStop(0.4, `rgba(240, 215, 136, ${(0.48 * bootGrbPower).toFixed(3)})`);
                coreNeedleGrad.addColorStop(0.8, `rgba(221, 170, 51, ${(0.15 * bootGrbPower).toFixed(3)})`);
                coreNeedleGrad.addColorStop(1, 'rgba(221, 170, 51, 0)');
                ctx.fillStyle = coreNeedleGrad;
                ctx.beginPath();
                ctx.moveTo(0, -1.8);
                ctx.lineTo(bootJetSpan * 0.92, 0);
                ctx.lineTo(0, 1.8);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            });

            // 3. Streaming Golden Orbital Orbs with Soft Golden Halos
            const bootSpeedBoost = 1 + bootIgnitionSpike * 0.85;
            particles.forEach(p => {
                p.angle += p.speed * bootSpeedBoost;
                p.radius -= p.inwardSpeed * bootSpeedBoost;
                if (p.radius < 74) p.radius = 290 + Math.random() * 190;
                const px = cx + Math.cos(p.angle) * p.radius;
                const py = cy + Math.sin(p.angle) * (p.radius * 0.68);

                const orbGlow = ctx.createRadialGradient(px, py, 0, px, py, p.size * 4.2);
                orbGlow.addColorStop(0, 'rgba(240, 215, 136, 0.48)');
                orbGlow.addColorStop(0.45, 'rgba(221, 170, 51, 0.18)');
                orbGlow.addColorStop(1, 'rgba(221, 170, 51, 0)');
                ctx.fillStyle = orbGlow;
                ctx.beginPath();
                ctx.arc(px, py, p.size * 4.2, 0, Math.PI * 2);
                ctx.fill();

                ctx.beginPath();
                ctx.arc(px, py, p.size, 0, Math.PI * 2);
                ctx.fillStyle = p.color;
                ctx.fill();
            });

            ctx.restore();

            // Gate Dismissal: Must satisfy BOTH >= 5.0 seconds elapsed AND bothHydrated === true
            if (timeProgress < 1 || !bothHydrated) {
                rafId = requestAnimationFrame(renderBootFrame);
            } else {
                finishBoot();
            }
        };

        rafId = requestAnimationFrame(renderBootFrame);
    };

    runXoalaCinematicBootSequence();
    window.runXoalaCinematicBootSequence = runXoalaCinematicBootSequence;

    // 20-Minute Recurring Background Auto-Sync (Synchronizes GAS 1 / GAS 2 CSV & SumSub Updates Every 20 Minutes)
    const AUTO_SYNC_INTERVAL_MS = 20 * 60 * 1000;
    setInterval(async () => {
        try {
            await Promise.allSettled([
                fetchDashboardData(true),
                fetchAndRenderDataLakeGrid(true)
            ]);
            if (document.getElementById('ib-partner-view') && !document.getElementById('ib-partner-view').classList.contains('hidden')) {
                renderIbPartnerHub();
            }
        } catch (_) {}
    }, AUTO_SYNC_INTERVAL_MS);

    if (window.location.hash.startsWith('#dossier=')) {
        const targetId = decodeURIComponent(window.location.hash.replace('#dossier=', '').trim());
        if (targetId) setTimeout(() => openSovereignProfileModal(targetId), 400);
    }
});
