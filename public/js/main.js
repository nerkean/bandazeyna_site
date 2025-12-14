document.addEventListener('DOMContentLoaded', () => {
    // Безопасный поиск кнопки меню
    const menuBtn = document.querySelector('.mobile-menu-btn');
    const navMenu = document.getElementById('navMenu');
    const navOverlay = document.getElementById('navOverlay');

    // Проверяем, существует ли кнопка, прежде чем вешать события
    if (menuBtn && navMenu) {
        menuBtn.addEventListener('click', () => {
            navMenu.classList.toggle('active');
            menuBtn.classList.toggle('open');
            if (navOverlay) navOverlay.classList.toggle('active');
        });
    }

    // То же самое для оверлея
    if (navOverlay) {
        navOverlay.addEventListener('click', () => {
            if (navMenu) navMenu.classList.remove('active');
            if (menuBtn) menuBtn.classList.remove('open');
            navOverlay.classList.remove('active');
        });
    }
});