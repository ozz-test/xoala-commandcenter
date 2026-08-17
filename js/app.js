// === XOALA COMMAND CENTER: UI/UX LOGIC ===

document.addEventListener('DOMContentLoaded', () => {
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
            // Slight delay to allow CSS display:flex to apply before animating opacity
            setTimeout(() => {
                targetView.classList.add('active');
            }, 10);
        });
    });
});
