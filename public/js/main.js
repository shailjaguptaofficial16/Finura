// Global Frontend Interactions
document.addEventListener('DOMContentLoaded', () => {
    initHeaderScroll();
    initMobileMenu();
    updateNavigationState();
});

// Change header background on scroll
function initHeaderScroll() {
    const header = document.querySelector('header');
    if (!header) return;

    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });
}

// Toggle mobile navigation menu
function initMobileMenu() {
    const btn = document.querySelector('.mobile-menu-btn');
    const nav = document.querySelector('nav');
    if (!btn || !nav) return;

    btn.addEventListener('click', () => {
        nav.classList.toggle('open');
        btn.textContent = nav.classList.contains('open') ? '✕' : '☰';
    });
}

// Update header menu items based on Auth state
function updateNavigationState() {
    const token = API.getToken();
    const authActions = document.querySelector('.header-actions');
    if (!authActions) return;

    // Check if token exists
    if (token) {
        // Logged In structure
        authActions.innerHTML = `
            <a href="dashboard.html" class="btn btn-outline" style="padding: 8px 20px;">Dashboard</a>
            <button id="logout-btn" class="btn btn-primary" style="padding: 8px 20px;">Logout</button>
        `;
        
        // Add listener for logout button
        document.getElementById('logout-btn').addEventListener('click', async (e) => {
            e.preventDefault();
            await API.logout();
            window.location.href = 'index.html';
        });
    } else {
        // Guest structure
        authActions.innerHTML = `
            <a href="auth.html?mode=login" class="btn-text">Login</a>
            <a href="auth.html?mode=register" class="btn btn-primary" style="padding: 8px 20px;">Create Account</a>
        `;
    }

    // Set Active Menu Link based on pathname
    const links = document.querySelectorAll('nav ul li a');
    const path = window.location.pathname.split('/').pop() || 'index.html';
    
    links.forEach(link => {
        const href = link.getAttribute('href');
        if (href === path) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}
