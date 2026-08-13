import { state } from '../app/state.js';
import { CONSTANTS } from '../app/constants.js';
import { alcoholBadgeHTML, typeBadgeHTML, productThumbHTML } from './badges.js';
import { escapeHTML } from '../utils/dom.js';
import { renderSuggestions } from './search-ui.js';

/**
 * Polska odmiana rzeczownika po liczebniku: 1 -> forms[0], 2-4 (ale nie 12-14)
 * -> forms[1], reszta (5+, 0, 11-14...) -> forms[2].
 * @param {number} n
 * @param {[string, string, string]} forms
 * @returns {string}
 */
export function plPlural(n, [one, few, many]) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (n === 1) { return one; }
    if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) { return few; }
    return many;
}

/** Zwraca powitanie na podstawie godziny i dnia tygodnia */
function getSmartGreeting(total) {
    const h = new Date().getHours();
    const day = new Date().getDay(); // 0=niedziela, 5=piątek, 6=sobota
    const isWeekend = day === 0 || day === 5 || day === 6;

    if (h >= 0 && h < 6)   { return { emoji: '🌙', title: 'Nocna degustacja?', sub: 'Trunki nie śpią, ale ty powinieneś.' }; }
    if (h >= 6 && h < 10)  { return { emoji: '☀️', title: 'Dzień dobry', sub: 'Gotowy na nowe odkrycia?' }; }
    if (h >= 10 && h < 12) { return { emoji: '🥂', title: 'Pora na coś dobrego', sub: 'Twoja kolekcja czeka.' }; }
    if (h >= 12 && h < 17) { return { emoji: '🍺', title: 'Popołudniowa okazja', sub: total > 0 ? `Masz już ${total} ocen. Nie zwalniaj.` : 'Zacznij swoją kolekcję.' }; }
    if (h >= 17 && h < 20 && isWeekend) { return { emoji: '🎉', title: 'Weekendowy wieczór', sub: 'Najlepszy czas na nowego odkrycia.' }; }
    if (h >= 17 && h < 20) { return { emoji: '🌆', title: 'Wieczorne odkrycia', sub: 'Coś nowego na dziś?' }; }
    return { emoji: '🌃', title: 'Dobry wieczór', sub: isWeekend ? 'Weekend, czas na coś wyjątkowego.' : 'Spokojny wieczór z dobrym trunkiem.' };
}

/** Zwraca kolor gradientu i ikonę dla top kategorii */
function getCategoryAccent(tag) {
    const map = {
        'Piwo': { color: 'rgb(251 191 36)', icon: 'beer', bg: 'rgb(251 191 36 / 12%)' },
        'Wódka': { color: 'rgb(116 200 255)', icon: 'flask-conical', bg: 'rgb(116 200 255 / 12%)' },
        'Wino': { color: 'rgb(236 72 153)', icon: 'wine', bg: 'rgb(236 72 153 / 12%)' },
        'Whisky': { color: 'rgb(251 146 60)', icon: 'flame', bg: 'rgb(251 146 60 / 12%)' },
    };
    return map[tag] || { color: 'rgb(212 160 23)', icon: 'star', bg: 'rgb(212 160 23 / 12%)' };
}

/** Oblicza "streak" — ile dni z rzędu coś oceniałeś */
function calcStreak(favorites) {
    if (favorites.length === 0) { return 0; }
    const days = new Set(favorites.map((f) => new Date(f.date).toDateString()));
    let streak = 0;
    const d = new Date();
    while (days.has(d.toDateString())) {
        streak++;
        d.setDate(d.getDate() - 1);
    }
    return streak;
}

/** Re-render the dashboard hero, stats, badges, and recently rated. */
export function updateDashboard() {
    const total = state.favorites.length;
    const categoryCount = {};
    let totalScore = 0;
    let bestEntry = null;

    state.favorites.forEach((fav) => {
        const strictCategory = fav.tag || 'Nieznane';
        categoryCount[strictCategory] = (categoryCount[strictCategory] || 0) + 1;
        const stars = parseInt(fav.stars, 10);
        totalScore += stars;
        if (!bestEntry || stars > parseInt(bestEntry.stars, 10)) { bestEntry = fav; }
    });

    const avgScore = total ? (totalScore / total).toFixed(1) : '—';
    const topCategory = Object.keys(categoryCount).length > 0
        ? Object.keys(categoryCount).reduce((a, b) => categoryCount[a] > categoryCount[b] ? a : b)
        : null;
    const streak = calcStreak(state.favorites);
    const greeting = getSmartGreeting(total);
    const catAccent = topCategory ? getCategoryAccent(topCategory) : getCategoryAccent(null);

    // Pasek ratingu wizualny
    const ratingWidth = total ? Math.min(100, (parseFloat(avgScore) / 10) * 100) : 0;
    const ratingColor = parseFloat(avgScore) >= 7 ? 'rgb(48 209 88)' : parseFloat(avgScore) >= 5 ? 'rgb(255 214 10)' : 'rgb(255 69 58)';

    state.el.dashboardGrid.innerHTML = `
        <div class="start-greeting animate-fade-in">
            <div class="start-greeting-emoji">${greeting.emoji}</div>
            <div class="start-greeting-copy">
                <span class="start-greeting-title">${greeting.title}</span>
                <span class="start-greeting-sub">${greeting.sub}</span>
            </div>
            ${streak > 1 ? `<div class="start-streak"><i data-lucide="zap" aria-hidden="true"></i>${streak}d</div>` : ''}
        </div>

        <div class="start-stats-grid animate-fade-in" style="animation-delay:60ms">
            <div class="start-stat-card start-stat-main animate-fade-in" style="animation-delay:80ms">
                <div class="start-stat-header">
                    <i data-lucide="bar-chart-2" class="start-stat-ico" aria-hidden="true"></i>
                    <span class="start-stat-lbl">Ocenionych</span>
                </div>
                <div class="start-stat-big">${escapeHTML(String(total))}</div>
                <div class="start-stat-sub">${escapeHTML(plPlural(total, ['trunek', 'trunki', 'trunków']))} w kolekcji</div>
            </div>

            <div class="start-stat-card animate-fade-in" style="animation-delay:115ms">
                <div class="start-stat-header">
                    <i data-lucide="star" class="start-stat-ico start-stat-ico--gold" aria-hidden="true"></i>
                    <span class="start-stat-lbl">Średnia</span>
                </div>
                <div class="start-stat-big start-stat-big--sm">${escapeHTML(avgScore)}</div>
                <div class="start-rating-bar">
                    <div class="start-rating-fill" style="--fill:${ratingWidth / 100};background:${ratingColor}"></div>
                </div>
            </div>

            ${topCategory ? `
            <div class="start-stat-card animate-fade-in" style="animation-delay:150ms;--cat-bg:${catAccent.bg};--cat-color:${catAccent.color}">
                <div class="start-stat-header">
                    <i data-lucide="${catAccent.icon}" class="start-stat-ico start-stat-ico--cat" aria-hidden="true"></i>
                    <span class="start-stat-lbl">Faworyci</span>
                </div>
                <div class="start-stat-cat">${escapeHTML(topCategory)}</div>
                <div class="start-stat-sub">${categoryCount[topCategory]} ${escapeHTML(plPlural(categoryCount[topCategory], ['wpis', 'wpisy', 'wpisów']))}</div>
            </div>
            ` : `
            <div class="start-stat-card start-stat-empty">
                <i data-lucide="plus-circle" class="start-stat-ico" aria-hidden="true"></i>
                <span class="start-stat-lbl">Dodaj</span>
                <span class="start-stat-sub">pierwszy trunek</span>
            </div>
            `}

            ${bestEntry ? `
            <div class="start-stat-card start-stat-best animate-fade-in" style="animation-delay:80ms" data-item-name="${escapeHTML(bestEntry.item.name)}">
                <div class="start-stat-header">
                    <i data-lucide="trophy" class="start-stat-ico start-stat-ico--trophy" aria-hidden="true"></i>
                    <span class="start-stat-lbl">Najlepszy</span>
                </div>
                <div class="start-best-name">${escapeHTML(bestEntry.item.name)}</div>
                <div class="start-best-rating">
                    <i data-lucide="star" aria-hidden="true"></i>
                    ${escapeHTML(String(bestEntry.stars))}/5
                </div>
            </div>
            ` : ''}
        </div>

        <div class="quick-actions-grid animate-fade-in" style="animation-delay:120ms">
            <button class="action-btn primary" data-action="open-search">
                <div class="action-icon-wrap">
                    <i data-lucide="search" class="action-icon-svg" aria-hidden="true"></i>
                </div>
                <span>Szukaj trunku</span>
            </button>
            <button class="action-btn secondary" data-action="open-favorites">
                <div class="action-icon-wrap">
                    <i data-lucide="bookmark" class="action-icon-svg" aria-hidden="true"></i>
                </div>
                <span>Ulubione</span>
            </button>
        </div>
    `;

    if (window.lucide) {
        window.lucide.createIcons();
    }

    const streakEl = document.querySelector('.start-streak');
    if (streakEl && streak > 1) {
        streakEl.classList.add('bump');
        setTimeout(() => streakEl.classList.remove('bump'), 300);
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
        <div class="recent-card animate-fade-in" data-item-name="${escapeHTML(fav.item.name)}" style="animation-delay:${Math.min(idx, 5) * 40}ms">
            ${productThumbHTML(fav.item.image_url, fav.tag, 86)}
            <div class="recent-name">${escapeHTML(fav.item.name)}${alcoholBadgeHTML(fav.item.alcohol)}</div>
            <div class="recent-meta">${escapeHTML(fav.tag)}${typeBadgeHTML(fav.item.type)}</div>
            <div class="recent-stars"><i data-lucide="star" class="inline-star-icon" aria-hidden="true"></i> ${escapeHTML(String(fav.stars))}</div>
        </div>
    `).join('');
}
