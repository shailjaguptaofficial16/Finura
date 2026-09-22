// Blog Page Dynamics
document.addEventListener('DOMContentLoaded', () => {
    initBlog();
    initNewsletterSubscription();
});

let allArticles = [];
let activeCategory = 'All';
let searchKeyword = '';

async function initBlog() {
    const spotlightContainer = document.getElementById('featured-article-spotlight');
    const gridContainer = document.getElementById('blog-grid');
    
    if (!gridContainer) return;

    try {
        allArticles = await API.getBlog();
        if (allArticles && allArticles.length > 0) {
            renderFeaturedSpotlight();
            renderArticlesGrid();
            setupFilters();
            setupSearch();
        } else {
            gridContainer.innerHTML = '<p class="text-center" style="grid-column: 1/-1;">No articles found.</p>';
        }
    } catch (e) {
        console.error("Failed to load blog articles:", e);
        gridContainer.innerHTML = '<p class="text-center" style="grid-column: 1/-1; color: var(--color-orange);">Failed to load resources.</p>';
    }
}

// 1. Render Featured Article Spotlight
function renderFeaturedSpotlight() {
    const spotlightContainer = document.getElementById('featured-article-spotlight');
    if (!spotlightContainer) return;

    // Find article marked as featured, or fall back to first one
    const featured = allArticles.find(art => art.featured) || allArticles[0];
    
    if (!featured) {
        spotlightContainer.innerHTML = '';
        return;
    }

    spotlightContainer.innerHTML = `
        <div class="featured-article">
            <img src="${featured.image}" alt="${featured.title}" class="featured-img">
            <div class="featured-content">
                <div class="blog-meta">
                    <span class="badge badge-primary">${featured.category}</span>
                    <span class="blog-meta-date">${featured.date}</span>
                </div>
                <h2>${featured.title}</h2>
                <p>${featured.snippet}</p>
                <a href="#" class="btn btn-outline" style="align-self: flex-start;" onclick="alert('Full article content reading is coming soon!'); return false;">Read Article</a>
            </div>
        </div>
    `;
}

// 2. Filter & Render Remaining Articles Grid
function renderArticlesGrid() {
    const gridContainer = document.getElementById('blog-grid');
    if (!gridContainer) return;

    // Filter out the featured article so it doesn't duplicate
    const featured = allArticles.find(art => art.featured) || allArticles[0];
    const featuredId = featured ? featured.id : null;
    
    const filtered = allArticles.filter(art => {
        // Exclude featured spotlight
        if (art.id === featuredId) return false;
        
        // Category check
        const matchesCategory = activeCategory === 'All' || art.category === activeCategory;
        
        // Search check
        const matchesSearch = art.title.toLowerCase().includes(searchKeyword.toLowerCase()) || 
                             art.snippet.toLowerCase().includes(searchKeyword.toLowerCase()) ||
                             art.category.toLowerCase().includes(searchKeyword.toLowerCase());
                             
        return matchesCategory && matchesSearch;
    });

    if (filtered.length === 0) {
        gridContainer.innerHTML = '<p class="text-center" style="grid-column: 1/-1; padding: 40px; color: var(--color-text-muted);">No matching articles found.</p>';
        return;
    }

    gridContainer.innerHTML = filtered.map(art => `
        <div class="blog-grid-card">
            <img src="${art.image}" alt="${art.title}">
            <div class="blog-meta">
                <span class="badge badge-primary" style="font-size: 0.7rem; padding: 4px 10px;">${art.category}</span>
                <span class="blog-meta-date" style="font-size: 0.75rem;">${art.date}</span>
            </div>
            <h3>${art.title}</h3>
            <p>${art.snippet}</p>
            <a href="#" class="btn-text" onclick="alert('Full article reading is coming soon!'); return false;">Read article ↗</a>
        </div>
    `).join('');
}

// 3. Setup Category Clicking
function setupFilters() {
    const filterContainer = document.getElementById('category-filters');
    if (!filterContainer) return;

    const buttons = filterContainer.querySelectorAll('.blog-filter-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active states
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Re-render grid
            activeCategory = btn.getAttribute('data-category');
            renderArticlesGrid();
        });
    });
}

// 4. Setup Live Search Input
function setupSearch() {
    const searchInput = document.getElementById('blog-search-input');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        searchKeyword = e.target.value;
        renderArticlesGrid();
    });
}

// 5. Subscription handling
function initNewsletterSubscription() {
    const form = document.getElementById('subscribe-form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = form.querySelector('input[type="email"]');
        const email = input.value;
        
        alert(`Thanks for subscribing! Newsletter notifications will be sent to: ${email}`);
        input.value = '';
    });
}
