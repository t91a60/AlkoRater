/**
 * @module ui
 * All rendering, modal, tab switching, toast, haptics, search, backup.
 * Imports: state (read/write), storage (saveFavorites).
 * No circular dependencies.
 */

import { CONSTANTS, state } from './state.js';
import { saveFavorites } from './storage.js';
import { normalizeSearchText } from './data.js';

// ─── Utilities ────────────────────────────────────────────────────────────────

/**
 * Escapes HTML to prevent XSS attacks.
 * @param {string} str - Raw string
 * @returns {string} Escaped string
 */
export const escapeHTML = (str) => {
    if (str === null || str === undefined || str === '') return '';
    return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

/**
 * Debounces a function call.
 * @param {Function} func - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
export const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), delay);
    };
};

// ─── Haptics ──────────────────────────────────────────────────────────────────

export const haptics = {
    light: () => { if (navigator.vibrate) navigator.vibrate(10); },
    success: () => { if (navigator.vibrate) navigator.vibrate([10, 30, 10]); },
    warning: () => { if (navigator.vibrate) navigator.vibrate([50, 50, 50, 50]); },
};

// ─── Toast ────────────────────────────────────────────────────────────────────

/**
 * Shows a toast notification with iOS-style animation.
 * @param {string} msg - Toast message
 */
export const showToast = (msg) => {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const t = document.createElement('div');
    t.className = 'toast';
    const span = document.createElement('span');
    span.textContent = msg; // textContent — XSS safe
    t.appendChild(span);
    document.body.appendChild(t);

    setTimeout(() => {
        t.style.animation = 'toastSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1) reverse forwards';
        setTimeout(() => t.remove(), 400);
    }, 2000);
};

// ─── Skeletons ────────────────────────────────────────────────────────────────

/**
 * Toggles loading skeleton placeholders.
 * @param {boolean} show - Whether to show skeletons
 */
export const toggleSkeletons = (show) => {
    const container = state.el.skeletons;
    if (show) {
        container.style.display = 'block';
        container.innerHTML = Array(6).fill('<div class="skeleton-row"></div>').join('');
    } else {
        container.style.display = 'none';
    }
};

// ─── Dashboard ────────────────────────────────────────────────────────────────

/**
 * Updates the dashboard statistics.
 */
export const updateDashboard = () => {
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
};

/**
 * Updates the recently rated items horizontal scroll.
 */
export const updateRecentlyRated = () => {
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
};

// ─── Tab Navigation ───────────────────────────────────────────────────────────

/**
 * Switches between tabs with iOS-style animation.
 * @param {string} tabName - Target tab name
 */
export const switchTab = (tabName) => {
    if (state.currentTab === tabName) return;
    haptics.light();

    const currentEl = state.el.tabs[state.currentTab];
    const nextEl = state.el.tabs[tabName];

    state.el.navItems.forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    const titles = { start: 'Start', search: 'Szukaj', favorites: 'Ulubione' };
    state.el.headerTitle.textContent = titles[tabName];

    if (currentEl) {
        currentEl.classList.remove('active', 'tab-enter');
        currentEl.classList.add('tab-exit');
        setTimeout(() => {
            currentEl.classList.remove('tab-exit');
            currentEl.style.display = 'none';
        }, 350);
    }

    if (nextEl) {
        nextEl.style.display = 'block';
        nextEl.classList.remove('tab-exit');
        nextEl.classList.add('active', 'tab-enter');
        setTimeout(() => nextEl.classList.remove('tab-enter'), 350);
    }

    state.currentTab = tabName;
    document.querySelector('.content-area').scrollTo({ top: 0, behavior: 'smooth' });

    if (tabName === 'favorites') renderFavorites(document.querySelector('.filter-chip.active')?.dataset.filter);
    if (tabName === 'start') updateDashboard();
};

// ─── Favorites ────────────────────────────────────────────────────────────────

const GHOST_SVG = `
    <svg class="ghost-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z"></path>
        <circle cx="9" cy="10" r="1.2" fill="currentColor"></circle>
        <circle cx="15" cy="10" r="1.2" fill="currentColor"></circle>
    </svg>`;

const TRASH_SVG = `
    <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2" fill="none">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    </svg>`;

/**
 * Generates HTML for alcohol badge.
 * @param {string} alcohol - Alcohol percentage
 * @returns {string} HTML string
 */
const alcoholBadgeHTML = (alcohol) => {
    if (!alcohol) return '';
    const val = alcohol.includes('%') ? alcohol : alcohol + '%';
    return `<span class="separator">·</span><span class="alcohol-badge">${escapeHTML(val)}</span>`;
};

/**
 * Renders the favorites list with staggered animations.
 * @param {string} filter - Active filter category
 */
export const renderFavorites = (filter = 'wszystkie') => {
    const container = state.el.favoritesList;
    container.innerHTML = '';
    const activeFilter = (filter || 'wszystkie').toLowerCase();
    const list = activeFilter === 'wszystkie'
        ? state.favorites
        : state.favorites.filter((f) => f.tag.toLowerCase() === activeFilter);

    if (list.length === 0) {
        container.innerHTML = `
            <div class="empty-state-animated">
                <div class="floating-ghost">${GHOST_SVG}</div>
                <p style="opacity:0.6;font-weight:500;">Brak ulubionych</p>
            </div>`;
        return;
    }

    container.innerHTML = list.map((fav, idx) => `
        <div id="fav-${fav.id}" class="favorite-card animate-fade-in" data-item-name="${escapeHTML(fav.item.name)}" style="animation-delay: ${idx * 30}ms">
            <img src="${escapeHTML(fav.item.image_url || './icons/icon-60.png')}" loading="lazy" alt="${escapeHTML(fav.item.name)}">
            <div class="item-info">
                <div class="item-name">${escapeHTML(fav.item.name)}${alcoholBadgeHTML(fav.item.alcohol)}</div>
                <div class="item-meta">${escapeHTML(fav.tag)}</div>
            </div>
            <div class="item-stars">${escapeHTML(fav.stars)} <span style="font-size:12px;margin-left:1px;">★</span></div>
            <button class="delete-btn" data-delete-id="${fav.id}" aria-label="Usuń">${TRASH_SVG}</button>
        </div>
    `).join('');
};

/**
 * Filters favorites by category.
 * @param {string} type - Filter type
 */
export const filterFavorites = (type) => {
    haptics.light();
    document.querySelectorAll('.filter-chip').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.filter === type);
    });
    renderFavorites(type);
};

/**
 * Deletes a favorite item with slide-out animation.
 * @param {string|number} id - Item ID to delete
 */
export const deleteFavorite = (id) => {
    haptics.light();
    const el = document.getElementById(`fav-${id}`);
    if (el) el.classList.add('slide-out-left');

    setTimeout(() => {
        state.favorites = state.favorites.filter((f) => String(f.id) !== String(id));
        saveFavorites();
        const activeFilter = document.querySelector('.filter-chip.active')?.dataset.filter || 'wszystkie';
        renderFavorites(activeFilter);
        updateDashboard();
        showToast('Usunięto z ulubionych');
        haptics.warning();
    }, 300);
};

// ─── Search ───────────────────────────────────────────────────────────────────

/**
 * Scores a result item for relevance against a normalized query.
 * Higher = better. Items scoring 0 are excluded.
 *
 * @param {Object} item - Normalized data item
 * @param {string} normQuery - Already-normalized query string
 * @returns {number} Score 0–3
 */
const scoreResult = (item, normQuery) => {
    const normName = normalizeSearchText(item.name || '');
    if (!normName.includes(normQuery)) return 0;

    if (normName.startsWith(normQuery)) return 3;
    return 1;
};

/**
 * Handles search input changes.
 *
 * Design decisions:
 * - NO stop-word removal: search is purely name-driven and should stay predictable
 * - Results sorted by relevance score desc, then alphabetically (no type bias)
 * - Works from the FIRST character typed
 *
 * @param {Event} e - Input event
 */
export const handleSearch = (e) => {
    const raw = e.target.value;

    if (!raw || !raw.trim()) {
        state.el.searchResults.innerHTML = '';
        state.el.noResults.style.display = 'none';
        return;
    }

    const normQuery = normalizeSearchText(raw);
    if (!normQuery) {
        state.el.searchResults.innerHTML = '';
        state.el.noResults.style.display = 'none';
        // Note: Skeletons handle visibility via HTML structure
        return;
    }

    // Score every item; exclude score=0
    const scored = [];
    for (const item of state.appData) {
        const score = scoreResult(item, normQuery);
        if (score > 0) scored.push({ item, score });
    }

    // Best score first, then Polish alphabetical order by name
    scored.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return (a.item.name || '').localeCompare(b.item.name || '', 'pl');
    });

    const results = scored.slice(0, 50).map((s) => s.item);

    const noResultsText = state.el.noResults.querySelector('p');
    if (noResultsText) noResultsText.textContent = 'Brak wyników.';

    renderResults(results);
};

/**
 * Renders search results with staggered animations.
 * @param {Array} list - Array of matching items
 */
export const renderResults = (list) => {
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
};

// ─── Modal ────────────────────────────────────────────────────────────────────

/**
 * Opens the rating modal with iOS sheet animation.
 * @param {Object} item - Product item to rate
 */
export const openRateModal = (item) => {
    haptics.light();
    state.currentItem = item;
    const strictCategory = item.category || 'Nieznane';
    const existing = state.favorites.find((f) => f.item.name === item.name);

    if (existing) {
        state.ratingConfig = { stars: existing.stars, tag: strictCategory, note: existing.note || '' };
        document.getElementById('saveButton').textContent = 'Zaktualizuj';
    } else {
        state.ratingConfig = { stars: 0, tag: strictCategory, note: '' };
        document.getElementById('saveButton').textContent = 'Zapisz Ocenę';
    }

    document.getElementById('modalTitle').innerHTML =
        `${escapeHTML(item.name)}${alcoholBadgeHTML(item.alcohol)}`;
    document.getElementById('modalCategoryTag').textContent = `Kategoria: ${strictCategory}`;
    document.getElementById('noteInput').value = state.ratingConfig.note;

    document.querySelector('.app-container').classList.add('scale-back');
    document.querySelector('.bottom-nav').classList.add('tab-bar-hidden');
    state.el.modal.style.display = 'block';

    // Trigger reflow for animation
    requestAnimationFrame(() => {
        state.el.modal.classList.add('active');
    });

    renderModalState();
};

/**
 * Re-renders the modal state (stars, validation).
 */
export const renderModalState = () => {
    document.querySelectorAll('.star').forEach((s) => {
        s.classList.toggle('active', parseInt(s.dataset.value) <= state.ratingConfig.stars);
    });

    // Star pop animation for 5-star rating
    if (state.ratingConfig.stars === 5) {
        document.querySelectorAll('.star').forEach((s, idx) => {
            setTimeout(() => s.classList.add('star-pop'), idx * 50);
        });
        setTimeout(() => {
            document.querySelectorAll('.star').forEach((s) => s.classList.remove('star-pop'));
        }, 800);
    }

    validateSave();
};

/**
 * Sets the current rating.
 * @param {number} val - Rating value (1-5)
 */
export const setRating = (val) => {
    state.ratingConfig.stars = val;
    haptics.light();
    if (val === 5) haptics.success();
    renderModalState();
};

/**
 * Validates whether the save button should be enabled.
 */
export const validateSave = () => {
    document.getElementById('saveButton').disabled = state.ratingConfig.stars < 1;
};

/**
 * Closes the rating modal with reverse animation.
 */
export const closeModal = () => {
    document.querySelector('.app-container').classList.remove('scale-back');
    document.querySelector('.bottom-nav').classList.remove('tab-bar-hidden');
    state.el.modal.classList.remove('active');
    setTimeout(() => {
        state.el.modal.style.display = 'none';
    }, 400);
};

/**
 * Saves the rating to favorites.
 */
export const saveRating = () => {
    if (!state.currentItem) return;
    state.ratingConfig.note = document.getElementById('noteInput').value;

    const record = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        item: state.currentItem,
        ...state.ratingConfig,
        date: new Date().toISOString(),
    };

    const existingIndex = state.favorites.findIndex((f) => f.item.name === state.currentItem.name);
    if (existingIndex >= 0) {
        state.favorites = state.favorites.map((f, i) => i === existingIndex ? record : f);
        showToast('Zaktualizowano ocenę!');
    } else {
        state.favorites = [record, ...state.favorites];
        showToast('Zapisano ocenę!');
    }

    saveFavorites();
    updateDashboard();
    if (state.currentTab === 'favorites') {
        renderFavorites(document.querySelector('.filter-chip.active')?.dataset.filter);
    }
    haptics.success();
    closeModal();
};

// ─── Share & Backup ───────────────────────────────────────────────────────────
// Features completely removed to streamline the static application.