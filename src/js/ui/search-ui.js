import { state } from '../app/state.js';
import { escapeHTML } from '../utils/dom.js';
import { search } from '../services/search.js';
import { alcoholBadgeHTML, typeBadgeHTML, productThumbHTML } from './badges.js';

const SUGGESTIONS = [
    { label: 'Piwo', icon: 'beer', query: 'piwo' },
    { label: 'Wódka', icon: 'glass-water', query: 'wódka' },
    { label: 'Wino', icon: 'wine', query: 'wino' },
    { label: '0.0%', icon: 'wine-off', query: '0.0%' },
    { label: 'IPA', icon: 'beer', query: 'ipa' },
    { label: 'Lager', icon: 'beer', query: 'lager' },
];

export function renderSuggestions() {
    const container = state.el.searchResults;
    container.innerHTML = `
        <div class="search-suggestions">
            <p class="suggestions-label">Popularne kategorie</p>
            <div class="suggestions-grid">
                ${SUGGESTIONS.map((s) => `
                    <button class="suggestion-chip" data-query="${escapeHTML(s.query)}">
                        <i data-lucide="${s.icon}" class="suggestion-icon" stroke-width="2" aria-hidden="true"></i>
                        <span>${escapeHTML(s.label)}</span>
                    </button>
                `).join('')}
            </div>
        </div>
    `;
    if (window.lucide) {
        window.lucide.createIcons();
    }
}

/** @param {Event} e */
export function handleSearch(e) {
    const raw = e.target.value;

    if (!raw || !raw.trim()) {
        renderSuggestions();
        state.el.noResults.style.display = 'none';
        return;
    }

    const results = search(raw);

    const noResultsText = state.el.noResults.querySelector('p');
    if (noResultsText) { noResultsText.textContent = 'Brak wyników.'; }

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
        <div class="search-item animate-fade-in" data-item-name="${escapeHTML(item.name)}" style="animation-delay:${idx * 25}ms">
            ${productThumbHTML(item.image_url, item.category, 50)}
            <div class="item-info">
                <div class="item-name">${escapeHTML(item.name)}${alcoholBadgeHTML(item.alcohol)}</div>
                <div class="item-meta">${escapeHTML(item.category)}${typeBadgeHTML(item.type)}</div>
            </div>
        </div>
    `).join('');
}
