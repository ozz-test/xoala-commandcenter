// === XOALA COMMAND CENTER: UI/UX LOGIC ===

document.addEventListener('DOMContentLoaded', () => {
    // --- NAVIGATION LOGIC ---
    const navItems = document.querySelectorAll('.nav-item');
    const viewSections = document.querySelectorAll('.view-section');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            if (item.disabled) return;
            navItems.forEach(nav => nav.classList.remove('active'));
            viewSections.forEach(view => {
                view.classList.remove('active');
                view.classList.add('hidden');
            });

            item.classList.add('active');
            const targetId = item.getAttribute('data-target');
            const targetView = document.getElementById(targetId);
            
            targetView.classList.remove('hidden');
            setTimeout(() => { targetView.classList.add('active'); }, 10);
        });
    });

    // --- SIDEBAR MINIMIZE LOGIC ---
    const sidebar = document.getElementById('main-sidebar');
    const toggleBtn = document.getElementById('sidebar-toggle');
    const toggleIcon = document.getElementById('sidebar-toggle-icon');

    toggleBtn.addEventListener('click', () => {
        if (sidebar.classList.contains('sidebar-expanded')) {
            sidebar.classList.remove('sidebar-expanded');
            sidebar.classList.add('sidebar-collapsed');
            toggleIcon.classList.replace('ph-caret-left', 'ph-caret-right');
        } else {
            sidebar.classList.remove('sidebar-collapsed');
            sidebar.classList.add('sidebar-expanded');
            toggleIcon.classList.replace('ph-caret-right', 'ph-caret-left');
        }
    });

    // --- DATE INJECTION ---
    const dateEl = document.getElementById('current-date');
    if (dateEl) {
        const options = { month: 'short', day: 'numeric', year: 'numeric' };
        dateEl.textContent = new Date().toLocaleDateString('en-US', options).toUpperCase();
    }

    // --- CHART.JS INITIALIZATION ---
    Chart.defaults.color = '#888888';
    Chart.defaults.font.family = "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace";
    
    const ctxGeo = document.getElementById('geoChart');
    if (ctxGeo) {
        new Chart(ctxGeo, {
            type: 'doughnut',
            data: {
                labels: ['Cyprus', 'UK', 'UAE', 'Pakistan', 'Other'],
                datasets: [{
                    data: [45, 25, 15, 10, 5],
                    backgroundColor: ['#DDAA33', '#F0D788', '#997722', '#1a1a1a', '#333333'],
                    borderColor: '#050505', borderWidth: 2, hoverOffset: 4
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { position: 'right', labels: { boxWidth: 12, padding: 20 } } },
                cutout: '75%'
            }
        });
    }

    const ctxTrend = document.getElementById('trendChart');
    if (ctxTrend) {
        new Chart(ctxTrend, {
            type: 'bar',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Tickets Processed',
                    data: [120, 190, 150, 220, 180, 40, 60],
                    backgroundColor: '#DDAA33', borderRadius: 4,
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(255, 255, 255, 0.05)' }, border: { display: false } },
                    x: { grid: { display: false }, border: { display: false } }
                }
            }
        });
    }
});
