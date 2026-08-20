// === XOALA COMMAND CENTER: CORE APP & DASHBOARD LOGIC ===

const DASHBOARD_API_URL = 'https://xoala-command-center-middleware.osama-mohammad.workers.dev'; 

document.addEventListener('DOMContentLoaded', () => {
    
    // --- TAB NAVIGATION ---
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
                    if (targetId === 'daily-report-view') fetchMatrixData(); // Load Matrix automatically
                }
            }
        });
    });

    // --- SIDEBAR TOGGLE ---
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

    // --- MATRIX LOGIC (DAILY REPORT) ---
    
    // Default Dates: Current Week (Mon to Current Working Day)
    const setMatrixDefaultDates = () => {
        const now = new Date();
        const currentDay = now.getDay(); // 0=Sun, 1=Mon
        const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
        
        const start = new Date(now);
        start.setDate(now.getDate() + diffToMonday);
        
        const end = new Date(now);
        if (currentDay === 0) end.setDate(now.getDate() - 2); // If Sun, show till Fri
        else if (currentDay === 6) end.setDate(now.getDate() - 1); // If Sat, show till Fri
        
        document.getElementById('matrix-start-date').value = start.toISOString().split('T')[0];
        document.getElementById('matrix-end-date').value = end.toISOString().split('T')[0];
    };
    setMatrixDefaultDates();

    const fetchMatrixData = async () => {
        const syncIcon = document.getElementById('matrix-sync-icon');
        const tbody = document.getElementById('matrix-table-body');
        const startDate = document.getElementById('matrix-start-date').value;
        const endDate = document.getElementById('matrix-end-date').value;

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
                    secret: 'system_dashboard_init', // Ghost auth bypass
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
        tbody.innerHTML = '';

        if (matrixData.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="py-12 text-center text-gray-500 font-mono text-xs">No tickets found in this date range.</td></tr>`;
            return;
        }

        matrixData.forEach((mgr, mgrIndex) => {
            // Level 1: Account Manager Row
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
                // Level 2: Status Row
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

                // Level 3: Lead Detail Row
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

                // Toggling Logic for Statuses -> Leads
                trStg.addEventListener('click', () => {
                    const leadRows = document.querySelectorAll(`.stg-${mgrIndex}-${stgIndex}-child`);
                    const icon = trStg.querySelector('i');
                    leadRows.forEach(r => r.classList.toggle('hidden'));
                    if (icon.classList.contains('ph-caret-right')) icon.classList.replace('ph-caret-right', 'ph-caret-down');
                    else icon.classList.replace('ph-caret-down', 'ph-caret-right');
                });
            });

            // Toggling Logic for Managers -> Statuses
            trMgr.addEventListener('click', () => {
                const statusRows = document.querySelectorAll(`.mgr-${mgrIndex}-child`);
                const icon = trMgr.querySelector('i');
                statusRows.forEach(r => {
                    // Hide everything below it as well
                    if (!r.classList.contains('hidden') || r.classList.contains('stg-')) {
                         r.classList.add('hidden');
                    } else if (!r.classList.contains('stg-')) {
                         r.classList.remove('hidden'); // Only reveal level 2
                    }
                });
                // Reset all level 2 icons
                document.querySelectorAll(`.mgr-${mgrIndex}-child .ph-caret-down`).forEach(i => i.classList.replace('ph-caret-down', 'ph-caret-right'));
                
                if (icon.classList.contains('ph-plus-square')) icon.classList.replace('ph-plus-square', 'ph-minus-square');
                else icon.classList.replace('ph-minus-square', 'ph-plus-square');
            });
        });
    };

    // --- MAIN DASHBOARD LOGIC (Keep existing unchanged) ---
    // (Ensure your previous fetchDashboardData and renderCharts functions are pasted back here)
    
    const fetchDashboardData = async () => {
        // Your previous logic goes here
    };

    const renderCharts = (riskData, bottleneckData) => {
        // Your previous logic goes here
    };

    document.getElementById('matrix-refresh-btn').addEventListener('click', fetchMatrixData);
    document.getElementById('dashboard-refresh-btn').addEventListener('click', fetchDashboardData);
    fetchDashboardData();
});
