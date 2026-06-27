import { state } from '../app/state.js';
import { CONSTANTS } from '../app/constants.js';
import { escapeHTML } from '../utils/dom.js';

/** Re-render the dashboard hero, stats, and recently rated. */
export function updateDashboard() {
    const total = state.favorites.length;
    const categoryCount = {};
    let totalScore = 0;

    state.favorites.forEach((fav) => {
        const strictCategory = fav.tag || 'Nieznane';
        categoryCount[strictCategory] = (categoryCount[strictCategory] || 0) + 1;
        totalScore += parseInt(fav.stars, 10);
    });

    const avgScore = total ? (totalScore / total).toFixed(1) : '0.0';
    const topCategory = Object.keys(categoryCount).length > 0
        ? Object.keys(categoryCount).reduce((a, b) => categoryCount[a] > categoryCount[b] ? a : b)
        : 'Brak';

    state.el.dashboardGrid.innerHTML = `
        <div class="hero-card animate-fade-in glass">
            <div class="hero-decorative-circle"></div>
            <div class="hero-content">
                <div class="hero-greeting">
                    <h2>Twoje Podsumowanie</h2>
                    <p>Oto kolekcja ocenionych trunków.</p>
                </div>
                
                <div class="hero-stats-row">
                    <div class="hero-stat-item">
                        <span class="hero-stat-val">${escapeHTML(total)}</span>
                        <span class="hero-stat-label">Oceniono</span>
                    </div>
                    <div class="hero-divider"></div>
                    <div class="hero-stat-item">
                        <span class="hero-stat-val">${escapeHTML(avgScore)} <span class="hero-star">★</span></span>
                        <span class="hero-stat-label">Średnia</span>
                    </div>
                    <div class="hero-divider"></div>
                    <div class="hero-stat-item">
                        <span class="hero-stat-val category-truncate" style="text-transform:capitalize;">${escapeHTML(topCategory)}</span>
                        <span class="hero-stat-label">Ulubione</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="quick-actions-grid">
            <button class="action-btn primary animate-fade-in" data-action="open-search" style="animation-delay: 50ms;">
                <div class="action-icon">
                    <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2.5" fill="none"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                </div>
                <span>Szukaj i Oceń</span>
            </button>
            <button class="action-btn secondary animate-fade-in" data-action="open-favorites" style="animation-delay: 100ms;">
                <div class="action-icon">
                    <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2.5" fill="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                </div>
                <span>Kolekcja</span>
            </button>
        </div>
    `;

    updateRecentlyRated();
}

/** Re-render the horizontal recently-rated scroll strip. */
export function updateRecentlyRated() {
    const container = state.el.recentlyRated;
    const recent = state.favorites.slice(0, CONSTANTS.MAX_RECENT_ITEMS);

    if (recent.length === 0) {
        container.innerHTML = '<p style="opacity:0.4;font-size:13px;padding:10px;">Brak ocenionych produktów</p>';
        return;
    }

    container.innerHTML = recent.map((fav, idx) => `
        <div class="recent-card animate-fade-in" data-item-name="${escapeHTML(fav.item.name)}" style="animation-delay: ${idx * 40}ms">
            <img src="${escapeHTML(fav.item.image_url || './icons/icon-60.png')}" loading="lazy" alt="img">
            <div class="recent-name">${escapeHTML(fav.item.name)}</div>
            <div class="recent-stars">${escapeHTML(fav.stars)} ★</div>
        </div>
    `).join('');
}
