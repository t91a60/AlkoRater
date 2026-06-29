import { state } from '../app/state.js';
import { escapeHTML } from '../utils/dom.js';
import { search } from '../services/search.js';
import { alcoholBadgeHTML, typeBadgeHTML } from './badges.js';

/** @param {Event} e */
export function handleSearch(e) {
    const raw = e.target.value;

    if (!raw || !raw.trim()) {
        state.el.searchResults.innerHTML = '';
        state.el.noResults.style.display = 'block';
        const noResultsText = state.el.noResults.querySelector('p');
        if (noResultsText) {noResultsText.textContent = '';}
        return;
    }

    const results = search(raw);

    const noResultsText = state.el.noResults.querySelector('p');
    if (noResultsText) {noResultsText.textContent = 'Brak wyników.';}

    renderResults(results);
}

/** @param {Array} list */
export function renderResults(list) {
    const container = state.el.searchResults;
    container.innerHTML = '';

    if (list.length === 0) {
        state.el.noResults.style.display = 'block';
        return;
    }
    state.el.noResults.style.display = 'none';

    container.innerHTML = list.map((item, idx) => `
        <div class="search-item animate-fade-in" data-item-name="${escapeHTML(item.name)}" style="animation-delay: ${idx * 25}ms">
            <img src="${escapeHTML(item.image_url || './icons/icon-60.png')}" loading="lazy" alt="img">
            <div class="item-info">
                <div class="item-name">${escapeHTML(item.name)}${alcoholBadgeHTML(item.alcohol)}</div>
                <div class="item-meta">${escapeHTML(item.category)}${typeBadgeHTML(item.type)}</div>
            </div>
        </div>
    `).join('');
}
