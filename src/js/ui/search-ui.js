import { state } from '../app/state.js';
import { escapeHTML } from '../utils/dom.js';
import { search } from '../services/search.js';
import { debounce } from '../utils/debounce.js';
import { alcoholBadgeHTML, typeBadgeHTML, productThumbHTML } from './badges.js';
import { createIcons } from './icons.js';
import { plPlural } from '../utils/plural.js';
import { productKey } from '../data/product.js';

const RECENT_KEY = 'alkorater:recent-searches';
const MAX_RECENT = 6;
const MIN_RECENT_QUERY_LENGTH = 2;
const RECENT_SAVE_DELAY_MS = 900;

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
    const words = query
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('|');
    if (!words) {
        return escapeHTML(text);
    }
    const regex = new RegExp(`(${words})`, 'gi');
    return String(text)
        .split(regex)
        .map((part, index) =>
            index % 2
                ? `<mark class="search-highlight">${escapeHTML(part)}</mark>`
                : escapeHTML(part),
        )
        .join('');
}

/* ─── Recent searches ─── */

function getRecentSearches() {
    try {
        const parsed = JSON.parse(localStorage.getItem(RECENT_KEY));
        return Array.isArray(parsed)
            ? parsed.filter((q) => typeof q === 'string' && q.length <= 160).slice(0, MAX_RECENT)
            : [];
    } catch {
        return [];
    }
}

function saveRecentQuery(query) {
    const recent = getRecentSearches().filter((s) => s !== query);
    recent.unshift(query);
    if (recent.length > MAX_RECENT) {
        recent.pop();
    }
    try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
    } catch {
        /* Search works without history. */
    }
}

// Recording to "Ostatnio szukane" is decoupled from live search-as-you-type:
// handleSearch already runs on its own (shorter) debounce so results feel
// instant, but committing every one of those settled-but-still-partial
// queries to history ("p", "pi", "piw", "piwo") would flood the recent list.
// This second, longer debounce only commits once typing has been quiet for
// RECENT_SAVE_DELAY_MS, i.e. the user has actually paused, not just between
// keystrokes.
const debouncedSaveRecentQuery = debounce((query) => {
    const trimmed = query.trim();
    if (trimmed.length >= MIN_RECENT_QUERY_LENGTH) {
        saveRecentQuery(trimmed);
    }
}, RECENT_SAVE_DELAY_MS);

export function removeRecentSearch(query) {
    const recent = getRecentSearches().filter((s) => s !== query);
    try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
    } catch {
        /* Search works without history. */
    }
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
                ${recent
                    .map(
                        (q) => `
                    <span class="recent-query"><button class="recent-chip" data-query="${escapeHTML(q)}">${escapeHTML(q)}</button><button class="recent-chip-remove" data-query="${escapeHTML(q)}" aria-label="${escapeHTML(`Usuń zapytanie: ${q}`)}">×</button></span>
                `,
                    )
                    .join('')}
            </div>
        </div>
    `;
}

function renderSearchIntroHTML() {
    return `
        <div class="search-intro-copy">
            <h2 class="search-intro-title">Co chcesz zapamiętać?</h2>
            <p class="search-intro-sub">Wpisz nazwę, styl lub zawartość alkoholu, np. „Żywiec”, „IPA” albo „40%”. Wybierz produkt, aby dodać ocenę.</p>
        </div>
    `;
}

function renderNoResultsHTML(query) {
    const safeQuery = query.trim();
    return `
        <div class="search-empty-card">
            <h3 class="search-empty-title">Brak wyników</h3>
            <p class="search-empty-copy">Nie znaleźliśmy nic dla „${escapeHTML(safeQuery)}”. Spróbuj krótszej nazwy, kategorii albo mocy.</p>
            <div class="search-empty-actions">
                ${SUGGESTIONS.slice(0, 3)
                    .map(
                        (item) => `
                    <button class="search-empty-chip" data-query="${escapeHTML(item.query)}">${escapeHTML(item.label)}</button>
                `,
                    )
                    .join('')}
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
            <p class="suggestions-label">Przeglądaj katalog</p>
            <div class="suggestions-grid">
                ${SUGGESTIONS.map(
                    (s) => `
                    <button class="suggestion-chip" data-query="${escapeHTML(s.query)}" style="--chip-accent:${s.color}">
                        <i data-lucide="${s.icon}" class="suggestion-icon" stroke-width="2" aria-hidden="true"></i>
                        <span>${escapeHTML(s.label)}</span>
                    </button>
                `,
                ).join('')}
            </div>
            ${renderRecentSearchesHTML()}
        </div>
    `;
    createIcons();
}

/* ─── Handle search input ─── */

export function handleSearch(e) {
    const raw = e.target.value.slice(0, 160);

    if (!raw || !raw.trim()) {
        renderSuggestions();
        state.el.noResults.style.display = 'none';
        const status = document.getElementById('searchStatus');
        if (status) {
            status.textContent = '';
        }
        return;
    }

    debouncedSaveRecentQuery(raw);
    const results = search(raw);

    renderResults(results, raw);
}

/* ─── Render results as cards ─── */

export function renderResults(list, query) {
    const container = state.el.searchResults;
    const status = document.getElementById('searchStatus');
    container.innerHTML = '';

    if (list.length === 0) {
        state.el.noResults.innerHTML = renderNoResultsHTML(query);
        state.el.noResults.style.display = 'block';
        if (status) {
            status.textContent = '';
        }
        createIcons();
        return;
    }
    state.el.noResults.style.display = 'none';

    if (status) {
        const n = list.length;
        status.textContent =
            n === 50
                ? 'Pierwsze 50 wyników. Doprecyzuj zapytanie, aby zawęzić listę.'
                : `${n} ${plPlural(n, ['wynik', 'wyniki', 'wyników'])}`;
    }

    const favorites = new Map(state.favorites.map((f) => [productKey(f.item), f]));

    container.innerHTML = list
        .map((item) => {
            const fav = favorites.get(productKey(item));
            return `
            <button class="search-card" data-item-id="${escapeHTML(productKey(item))}" aria-label="${escapeHTML(`${item.name}, ${item.category}${fav ? `, twoja ocena ${fav.stars} z 5` : ', dodaj ocenę'}`)}">
                <span class="search-card-main">
                    ${productThumbHTML(item.image_url, item.category, 50)}
                    <span class="item-info">
                        <span class="item-name">${highlightText(item.name, query)}${alcoholBadgeHTML(item.alcohol)}</span>
                        <span class="item-meta">${escapeHTML(item.category)}${typeBadgeHTML(item.type)}</span>
                    </span>
                    ${fav ? `<span class="search-card-rating">${fav.stars}/5</span>` : ''}
                </span>
            </button>
        `;
        })
        .join('');

    createIcons();
}
