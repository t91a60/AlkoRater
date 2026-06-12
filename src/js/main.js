/**
 * @module main
 * Entry point — wires up DOM refs, event listeners, and kicks off init().
 * This is the only file referenced from index.html (type="module").
 */

import { CONSTANTS, state } from './state.js';
import { loadFavorites } from './storage.js';
import { loadAllData } from './data.js';
import {
    debounce,
    showToast,
    toggleSkeletons,
    updateDashboard,
    switchTab,
    renderFavorites,
    filterFavorites,
    deleteFavorite,
    handleSearch,
    openRateModal,
    setRating,
    closeModal,
    saveRating,
} from './ui.js';

// ─── DOM Reference Init ───────────────────────────────────────────────────────

const initEl = () => {
    state.el = {
        headerTitle: document.getElementById('headerTitle'),
        tabs: {
            start: document.getElementById('tab-start'),
            search: document.getElementById('tab-search'),
            favorites: document.getElementById('tab-favorites'),
        },
        navItems: document.querySelectorAll('.nav-item'),
        searchInput: document.getElementById('searchInput'),
        searchResults: document.getElementById('searchResults'),
        favoritesList: document.getElementById('favoritesList'),
        dashboardGrid: document.getElementById('dashboardGrid'),
        recentlyRated: document.getElementById('recentlyRated'),
        skeletons: document.getElementById('searchSkeletons'),
        noResults: document.getElementById('noResults'),
        modal: document.getElementById('modal-wrapper'),
    };
};

// ─── Event Listeners ──────────────────────────────────────────────────────────

const setupListeners = () => {
    // ── Storage error → toast ─────────────────────────────────────────────────
    document.addEventListener('alkorater:storage-error', (e) => {
        showToast(e.detail?.message || 'Błąd zapisu');
    });

    // ── Global image fallback (replaces inline onerror handlers) ─────────────
    document.addEventListener(
        'error',
        (e) => {
            const target = e.target;
            if (!(target instanceof HTMLImageElement)) {return;}
            if (target.dataset.fallbackApplied === 'true') {return;}

            target.dataset.fallbackApplied = 'true';
            target.src = './icons/icon-60.png';
        },
        true,
    );

    // ── Event delegation: Recently Rated ──────────────────────────────────────
    state.el.recentlyRated.addEventListener('click', (e) => {
        const card = e.target.closest('.recent-card');
        if (!card) {return;}
        const fav = state.favorites.find((f) => f.item.name === card.dataset.itemName);
        if (fav) {openRateModal(fav.item);}
    });

    // ── Event delegation: Search Results ──────────────────────────────────────
    state.el.searchResults.addEventListener('click', (e) => {
        const card = e.target.closest('.search-item');
        if (!card) {return;}
        const item = state.appData.find((i) => i.name === card.dataset.itemName);
        if (item) {openRateModal(item);}
    });

    // ── Event delegation: Favorites List (card click + delete) ────────────────
    state.el.favoritesList.addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('.delete-btn');
        if (deleteBtn) {
            e.stopPropagation();
            deleteFavorite(deleteBtn.dataset.deleteId);
            return;
        }
        const card = e.target.closest('.favorite-card');
        if (card) {
            const fav = state.favorites.find((f) => f.item.name === card.dataset.itemName);
            if (fav) {openRateModal(fav.item);}
        }
    });

    // ── Dashboard actions (replaces inline onclick) ───────────────────────────
    state.el.dashboardGrid.addEventListener('click', (e) => {
        const actionBtn = e.target.closest('[data-action]');
        if (!actionBtn) {return;}

        if (actionBtn.dataset.action === 'open-search') {switchTab('search');}
        if (actionBtn.dataset.action === 'open-favorites') {switchTab('favorites');}
    });

    const showAllFavoritesBtn = document.getElementById('showAllFavoritesBtn');
    if (showAllFavoritesBtn) {
        showAllFavoritesBtn.addEventListener('click', () => switchTab('favorites'));
    }

    // ── iOS keyboard body class
    document.addEventListener('focusin', (e) => {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
            document.body.classList.add('keyboard-open');
        }
    });
    document.addEventListener('focusout', (e) => {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
            document.body.classList.remove('keyboard-open');
        }
    });

    // ── Bottom navigation tabs ────────────────────────────────────────────────
    state.el.navItems.forEach((btn) =>
        btn.addEventListener('click', () => switchTab(btn.dataset.tab))
    );

    // ── Search input + clear button ───────────────────────────────────────────
    state.el.searchInput.addEventListener('input', debounce(handleSearch, CONSTANTS.SEARCH_DEBOUNCE_MS));
    const clearBtn = document.getElementById('clearSearch');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            state.el.searchInput.value = '';
            handleSearch({ target: { value: '' } });
            state.el.searchInput.focus();
        });
    }

    // ── Modal: close, overlay, save, stars, keyboard ────────────────────────
    document.getElementById('modalClose').addEventListener('click', closeModal);
    state.el.modal.addEventListener('click', (e) => {
        if (e.target === state.el.modal || e.target.classList.contains('modal-overlay')) {
            closeModal();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && state.el.modal.classList.contains('active')) {
            closeModal();
        }
    });

    document.getElementById('saveButton').addEventListener('click', saveRating);

    document.querySelector('.stars-container').addEventListener('click', (e) => {
        if (e.target.classList.contains('star')) {
            setRating(parseInt(e.target.dataset.value, 10));
        }
    });

    document.querySelector('.stars-container').addEventListener('keydown', (e) => {
        const target = e.target;
        if (!(target instanceof HTMLElement) || !target.classList.contains('star')) {return;}
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setRating(parseInt(target.dataset.value, 10));
        }
    });

    // ── Filter chips ──────────────────────────────────────────────────────────
    document.querySelectorAll('.filter-chip').forEach((chip) => {
        chip.addEventListener('click', () => filterFavorites(chip.dataset.filter));
    });
};

// ─── Application Init ─────────────────────────────────────────────────────────

const init = async () => {
    initEl();
    loadFavorites();
    setupListeners();
    toggleSkeletons(true);

    try {
        await loadAllData();
    } catch (error) {
        showToast('Błąd ładowania bazy danych');
        console.error('[Init] loadAllData failed:', error);
    }

    toggleSkeletons(false);
    updateDashboard();

    // Handle PWA shortcut: ?action=search
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('action') === 'search') {
        switchTab('search');
        window.history.replaceState({}, document.title, window.location.pathname);
    }
};

document.addEventListener('DOMContentLoaded', init);