import { state } from '../app/state.js';
import { CONSTANTS } from '../app/constants.js';
import { alcoholBadgeHTML, typeBadgeHTML, productThumbHTML } from './badges.js';
import { escapeHTML } from '../utils/dom.js';
import { renderSuggestions } from './search-ui.js';
import { createIcons } from './icons.js';
import { plPlural } from '../utils/plural.js';
import { productKey } from '../data/product.js';

export { plPlural };

export function collectionStats(favorites) {
    const rated = favorites.filter(
        (f) => Number.isInteger(f.stars) && f.stars >= 1 && f.stars <= 5,
    );
    const total = rated.length;
    const average = total ? rated.reduce((sum, f) => sum + f.stars, 0) / total : 0;
    const categories = ['Piwo', 'Wino', 'Wódka'].map((name) => ({
        name,
        count: rated.filter((f) => f.tag === name).length,
    }));
    const best = rated.reduce(
        (result, f) => (!result || f.stars > result.stars ? f : result),
        null,
    );
    return { total, average, categories, best };
}

export function updateDashboard() {
    const { total, average, categories, best } = collectionStats(state.favorites);
    state.el.dashboardGrid.dataset.populated = String(total > 0);
    document.getElementById('recentSection')?.toggleAttribute('hidden', !total);
    state.el.dashboardGrid.innerHTML =
        total && !state.storageError
            ? ''
            : `
        <div class="collection-intro">
            <h2>${state.storageError ? 'Twoje dane wymagają uwagi' : 'Jeszcze nic nie oceniono'}</h2>
            <p>${state.storageError ? 'Nie udało się odczytać kolekcji. Opcje odzyskiwania znajdziesz poniżej.' : 'Wyszukaj produkt i zapisz pierwszą ocenę.'}</p>
            ${state.storageError ? '' : '<button class="action-btn primary" data-action="open-search">Znajdź produkt</button>'}
        </div>
    `;
    state.el.dashboardDetails.innerHTML = total
        ? `
        <div class="collection-overview"><dl class="collection-summary">
            <div><dt>Ocenione produkty</dt><dd>${total}</dd></div>
            <div><dt>Średnia ocen</dt><dd>${average.toLocaleString('pl-PL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}<small> / 5</small><div class="start-rating-bar" aria-hidden="true"><div class="start-rating-fill" style="--fill:${average / 5}"></div></div></dd></div>
        </dl>
        <p class="category-summary">${categories
            .filter((c) => c.count)
            .map((c) => `${c.name}: ${c.count}`)
            .join(' · ')}</p></div>
        <button class="collection-best" data-item-id="${escapeHTML(productKey(best.item))}">
            <span><span class="collection-best-label">Najwyżej ocenione</span><strong>${escapeHTML(best.item.name)}</strong><span class="item-meta">${escapeHTML(best.item.category)}${typeBadgeHTML(best.item.type)}${alcoholBadgeHTML(best.item.alcohol)}</span></span>
            <span class="item-stars">${best.stars}/5</span>
        </button>`
        : '';
    updateRecentlyRated();
    createIcons();
    if (state.currentTab === 'search' && !state.el.searchInput?.value?.trim()) {
        renderSuggestions();
    }
}

export function updateRecentlyRated() {
    const container = state.el.recentlyRated;
    const recent = state.favorites.slice(0, CONSTANTS.MAX_RECENT_ITEMS);
    if (!recent.length) {
        container.innerHTML =
            '<p class="empty-copy">Zapisane produkty pojawią się tutaj. Zacznij od wyszukiwarki.</p>';
        return;
    }
    container.innerHTML = recent
        .map(
            (fav) => `
        <button class="recent-card" data-item-id="${escapeHTML(productKey(fav.item))}">
            ${productThumbHTML(fav.item.image_url, fav.tag, 50)}
            <span class="recent-name">${escapeHTML(fav.item.name)}</span>
            <span class="recent-meta">${escapeHTML(fav.tag)}${typeBadgeHTML(fav.item.type)}</span>
            <span class="recent-stars">${fav.stars}/5${alcoholBadgeHTML(fav.item.alcohol)}</span>
        </button>
    `,
        )
        .join('');
}
