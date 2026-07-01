import { state } from '../app/state.js';
import { CONSTANTS } from '../app/constants.js';
import { alcoholBadgeHTML, typeBadgeHTML, productThumbHTML } from './badges.js';
import { escapeHTML } from '../utils/dom.js';
import { renderSuggestions } from './search-ui.js';

/** Re-render the dashboard hero, stats, badges, and recently rated. */
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
        <div class="premium-hero animate-fade-in">
            <div class="bokeh-spot bokeh-spot--1"></div>
            <div class="bokeh-spot bokeh-spot--2"></div>
            <div class="hero-halo hero-halo--amber"></div>
            <div class="hero-halo hero-halo--blue"></div>

            <div class="greeting-header">
                <div class="profile-icon">
                    <i data-lucide="wine" class="profile-icon-svg" aria-hidden="true"></i>
                </div>
                <div class="greeting-text">
                    <h1 class="greeting-title">Przegląd</h1>
                    <p class="greeting-sub">Twoje oceny, ulubione i ostatnie trunki w jednym miejscu.</p>
                </div>
            </div>

            <div class="hero-stats-row">
                <div class="hero-stat-item">
                    <i data-lucide="layers" class="stat-icon" aria-hidden="true"></i>
                    <span class="hero-stat-val">${escapeHTML(String(total))}</span>
                    <span class="hero-stat-label">Oceny</span>
                </div>
                <div class="hero-divider"></div>
                <div class="hero-stat-item">
                    <i data-lucide="star" class="stat-icon stat-icon--star" aria-hidden="true"></i>
                    <span class="hero-stat-val">${escapeHTML(avgScore)}</span>
                    <span class="hero-stat-label">Średnia</span>
                </div>
                <div class="hero-divider"></div>
                <div class="hero-stat-item">
                    <i data-lucide="wine" class="stat-icon" aria-hidden="true"></i>
                    <span class="hero-stat-val category-truncate" style="text-transform:capitalize;font-size:16px">${escapeHTML(topCategory)}</span>
                    <span class="hero-stat-label">Top</span>
                </div>
            </div>
        </div>


        <div class="quick-actions-grid">
            <button class="action-btn primary animate-fade-in" data-action="open-search" style="animation-delay:50ms">
                <div class="action-icon-wrap">
                    <i data-lucide="search" class="action-icon-svg" aria-hidden="true"></i>
                </div>
                <span>Szukaj trunku</span>
            </button>
            <button class="action-btn secondary animate-fade-in" data-action="open-favorites" style="animation-delay:100ms">
                <div class="action-icon-wrap">
                    <i data-lucide="folder-plus" class="action-icon-svg" aria-hidden="true"></i>
                </div>
                <span>Ulubione</span>
            </button>
        </div>
    `;

    if (window.lucide) {
        window.lucide.createIcons();
    }

    if (state.currentTab === 'search' && !state.el.searchInput?.value?.trim()) {
        renderSuggestions();
    }

    updateRecentlyRated();
}

/** Re-render the horizontal recently-rated scroll strip. */
export function updateRecentlyRated() {
    const container = state.el.recentlyRated;
    const recent = state.favorites.slice(0, CONSTANTS.MAX_RECENT_ITEMS);

    if (recent.length === 0) {
        container.innerHTML = '<p style="opacity:0.38;font-size:13px;padding:10px 0;font-weight:400;">Oceń pierwszy trunek, aby zobaczyć go tutaj.</p>';
        return;
    }

    container.innerHTML = recent.map((fav, idx) => `
        <div class="recent-card animate-fade-in" data-item-name="${escapeHTML(fav.item.name)}" style="animation-delay:${idx * 40}ms">
            ${productThumbHTML(fav.item.image_url, fav.tag, 86)}
            <div class="recent-name">${escapeHTML(fav.item.name)}${alcoholBadgeHTML(fav.item.alcohol)}</div>
            <div class="recent-meta">${escapeHTML(fav.tag)}${typeBadgeHTML(fav.item.type)}</div>
            <div class="recent-stars"><i data-lucide="star" class="inline-star-icon" aria-hidden="true"></i> ${escapeHTML(String(fav.stars))}</div>
        </div>
    `).join('');
}
