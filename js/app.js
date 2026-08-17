// === XOALA COMMAND CENTER: UI/UX LOGIC & ANALYTICS ===

document.addEventListener('DOMContentLoaded', () => {
    // --- 1. NAVIGATION LOGIC ---
    const navItems = document.querySelectorAll('.nav-item');
    const viewSections = document.querySelectorAll('.view-section');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            if (item.disabled) return;

            // Strip active classes
            navItems.forEach(nav => nav.classList.remove('active'));
            viewSections.forEach(view => {
                view.classList.remove('active');
                view.classList.add('hidden');
            });

            // Apply active class to target
            item.classList.add('active');
            const targetId = item.getAttribute('data-target');
            const targetView = document.getElementById(targetId);
            
            targetView.classList.remove('hidden');
            
            setTimeout(() => {
                targetView.classList.add('active');
            }, 10);
        });
    });

    // --- 2. DATE INJECTION ---
    const dateEl = document.getElementById('current-date');
    if (dateEl) {
        const options = { month: 'short', day: 'numeric', year: 'numeric' };
        dateEl.textContent = new Date().toLocaleDateString('en-US', options).toUpperCase();
    }

    // --- 3. CHART.JS INITIALIZATION (Obsidian Theme) ---
    // Global defaults for dark mode
    Chart.defaults.color = '#888888';
    Chart.defaults.font.family = "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace";
    
    // Chart 1: Registrations by Country (Doughnut)
    const ctxGeo = document.getElementById('geoChart');
    if (ctxGeo) {
        new Chart(ctxGeo, {
            type: 'doughnut',
            data: {
                labels: ['Cyprus', 'UK', 'UAE', 'Pakistan', 'Other'],
                datasets: [{
                    data: [45, 25, 15, 10, 5],
                    backgroundColor: [
                        '#DDAA33', // Gold
                        '#F0D788', // Light Gold
                        '#997722', // Dark Gold
                        '#1a1a1a', // Panel Dark
                        '#333333'  // Border Gray
                    ],
                    borderColor: '#050505',
                    borderWidth: 2,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'right', labels: { boxWidth: 12, padding: 20 } }
                },
                cutout: '75%'
            }
        });
    }

    // Chart 2: Pipeline Volume (Bar Chart)
    const ctxTrend = document.getElementById('trendChart');
    if (ctxTrend) {
        new Chart(ctxTrend, {
            type: 'bar',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Tickets Processed',
                    data: [120, 190, 150, 220, 180, 40, 60],
                    backgroundColor: '#DDAA33',
                    borderRadius: 4,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        border: { display: false }
                    },
                    x: {
                        grid: { display: false },
                        border: { display: false }
                    }
                }
            }
        });
    }
});
