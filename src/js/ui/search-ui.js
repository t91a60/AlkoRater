import { state } from '../app/state.js';
import { escapeHTML } from '../utils/dom.js';
import { search } from '../services/search.js';
import { alcoholBadgeHTML, typeBadgeHTML, productThumbHTML } from './badges.js';

const RECENT_KEY = 'alkorater:recent-searches';
const MAX_RECENT = 6;

const SUGGESTIONS = [
    { label: 'Piwo', icon: 'beer', query: 'piwo', color: '#d4a054' },
    { label: 'Wódka', icon: 'glass-water', query: 'wódka', color: '#6bc5f7' },
    { label: 'Wino', icon: 'wine', query: 'wino', color: '#b84a62' },
    { label: '0.0%', icon: 'wine-off', query: '0.0%', color: '#30d158' },
    { label: 'IPA', icon: 'beer', query: 'ipa', color: '#ff9f0a' },
    { label: 'Lager', icon: 'beer', query: 'lager', color: '#d4a054' },
];

/* ─── Highlight ─── */

function highlightText(text, query) {
    if (!query || !query.trim()) {
        return escapeHTML(text);
    }
    const words = query.trim().split(/\s+/).filter(Boolean)
        .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('|');
    if (!words) {
        return escapeHTML(text);
    }
    const escaped = escapeHTML(text);
    const regex = new RegExp(`(${words})`, 'gi');
    return escaped.replace(regex, '<mark class="search-highlight">$1</mark>');
}

/* ─── Recent searches ─── */

function getRecentSearches() {
    try {
        return JSON.parse(localStorage.getItem(RECENT_KEY)) || [];
    } catch { return []; }
}

function saveRecentQuery(query) {
    const recent = getRecentSearches().filter((s) => s !== query);
    recent.unshift(query);
    if (recent.length > MAX_RECENT) {
        recent.pop();
    }
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
}

export function removeRecentSearch(query) {
    const recent = getRecentSearches().filter((s) => s !== query);
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
    renderSuggestions();
}

function renderRecentSearchesHTML() {
    const recent = getRecentSearches();
    if (recent.length === 0) {
        return '';
    }
    return `
        <div class="recent-searches">
            <p class="recent-searches-label">Ostatnio szukane</p>
            <div class="recent-chips">
                ${recent.map(q => `
                    <button class="recent-chip" data-query="${escapeHTML(q)}">
                        <i data-lucide="clock" style="width:12px;height:12px;opacity:0.5" stroke-width="2" aria-hidden="true"></i>
                        ${escapeHTML(q)}
                        <span class="recent-chip-remove" data-action="remove-recent" data-query="${escapeHTML(q)}">✕</span>
                    </button>
                `).join('')}
            </div>
        </div>
    `;
}

function renderSearchIntroHTML() {
    const recentCount = getRecentSearches().length;

    return `
        <div class="search-intro-card animate-fade-in">
            <div class="search-intro-top">
                <div class="search-intro-copy">
                    <p class="search-intro-kicker">Wyszukiwanie</p>
                    <h2 class="search-intro-title">Szukaj po nazwie, stylu i mocy.</h2>
                    <p class="search-intro-sub">Baza działa offline. Wyniki, ostatnie zapytania i sugestie są zawsze pod ręką.</p>
                </div>
                <div class="search-intro-orb" aria-hidden="true"></div>
            </div>
            <div class="search-intro-stats">
                <div class="search-metric">
                    <span class="search-metric-value">${escapeHTML(String(state.appData.length))}</span>
                    <span class="search-metric-label">W bazie</span>
                </div>
                <div class="search-metric">
                    <span class="search-metric-value">${escapeHTML(String(state.favorites.length))}</span>
                    <span class="search-metric-label">Ulubione</span>
                </div>
                <div class="search-metric">
                    <span class="search-metric-value">${escapeHTML(String(recentCount))}</span>
                    <span class="search-metric-label">Ostatnie</span>
                </div>
            </div>
        </div>
    `;
}



function renderNoResultsHTML(query) {
    const safeQuery = query.trim();
    return `
        <div class="search-empty-card animate-fade-in">
            <div class="search-empty-orb" aria-hidden="true">
                <i data-lucide="search-x" aria-hidden="true"></i>
            </div>
            <h3 class="search-empty-title">Brak wyników</h3>
            <p class="search-empty-copy">Nie znaleźliśmy nic dla „${escapeHTML(safeQuery)}”. Spróbuj krótszej nazwy, kategorii albo mocy.</p>
            <div class="search-empty-actions">
                ${SUGGESTIONS.slice(0, 3).map((item) => `
                    <button class="search-empty-chip" data-query="${escapeHTML(item.query)}">${escapeHTML(item.label)}</button>
                `).join('')}
            </div>
        </div>
    `;
}

/* ─── Render suggestions ─── */

export function renderSuggestions() {
    const container = state.el.searchResults;
    container.innerHTML = `
        <div class="search-suggestions">
            ${renderSearchIntroHTML()}
            <p class="suggestions-label">Popularne kategorie</p>
            <div class="suggestions-grid">
                ${SUGGESTIONS.map((s) => `
                    <button class="suggestion-chip" data-query="${escapeHTML(s.query)}" style="--chip-accent:${s.color}">
                        <i data-lucide="${s.icon}" class="suggestion-icon" stroke-width="2" aria-hidden="true"></i>
                        <span>${escapeHTML(s.label)}</span>
                    </button>
                `).join('')}
            </div>
            ${renderRecentSearchesHTML()}
        </div>
    `;
    if (window.lucide) {
        window.lucide.createIcons();
    }
}

/* ─── Handle search input ─── */

export function handleSearch(e) {
    const raw = e.target.value;

    if (!raw || !raw.trim()) {
        renderSuggestions();
        state.el.noResults.style.display = 'none';
        return;
    }

    saveRecentQuery(raw.trim());
    const results = search(raw);

    renderResults(results, raw);
}

/* ─── Render results as cards ─── */

export function renderResults(list, query) {
    const container = state.el.searchResults;
    container.innerHTML = '';

    if (list.length === 0) {
        state.el.noResults.innerHTML = renderNoResultsHTML(query);
        state.el.noResults.style.display = 'block';
        if (window.lucide) {
            window.lucide.createIcons();
        }
        return;
    }
    state.el.noResults.style.display = 'none';

    const favoritedNames = new Set(state.favorites.map(f => f.item.name));

    container.innerHTML = list.map((item, idx) => {
        const isFav = favoritedNames.has(item.name);
        const fav = isFav ? state.favorites.find(f => f.item.name === item.name) : null;
        return `
            <div class="search-card animate-fade-in" data-item-name="${escapeHTML(item.name)}" style="animation-delay:${idx * 25}ms">
                <div class="search-card-main">
                    ${productThumbHTML(item.image_url, item.category, 50)}
                    <div class="item-info">
                        <div class="item-name">${highlightText(item.name, query)}${alcoholBadgeHTML(item.alcohol)}</div>
                        <div class="item-meta">${escapeHTML(item.category)}${typeBadgeHTML(item.type)}</div>
                    </div>
                    ${isFav && fav ? `<div class="search-card-rating"><i data-lucide="star" class="inline-star-icon" aria-hidden="true"></i> ${fav.stars}</div>` : ''}
                </div>
            </div>
        `;
    }).join('');



    if (window.lucide) {
        window.lucide.createIcons();
    }
}
