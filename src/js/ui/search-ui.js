import { state } from '../app/state.js';
import { escapeHTML } from '../utils/dom.js';
import { search } from '../services/search.js';

const alcoholBadgeHTML = (alcohol) => {
    if (!alcohol) {return '';}
    const val = alcohol.includes('%') ? alcohol : `${alcohol}%`;
    return `<span class="separator">·</span><span class="alcohol-badge">${escapeHTML(val)}</span>`;
};

export function handleSearch(e) {
    const raw = e.target.value;

    if (!raw || !raw.trim()) {
        state.el.searchResults.innerHTML = '';
        state.el.noResults.style.display = 'none';
        return;
    }

    const results = search(raw);

    const noResultsText = state.el.noResults.querySelector('p');
    if (noResultsText) {noResultsText.textContent = 'Brak wyników.';}

    renderResults(results);
}

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
                <div class="item-meta">${escapeHTML(item.category)}</div>
            </div>
        </div>
    `).join('');
}
