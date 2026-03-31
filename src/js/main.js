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
    shareCurrentItem,
    exportBackup,
    importBackup,
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
    // ── Event delegation: Recently Rated ──────────────────────────────────────
    state.el.recentlyRated.addEventListener('click', (e) => {
        const card = e.target.closest('.recent-card');
        if (!card) return;
        const fav = state.favorites.find((f) => f.item.name === card.dataset.itemName);
        if (fav) openRateModal(fav.item);
    });

    // ── Event delegation: Search Results ──────────────────────────────────────
    state.el.searchResults.addEventListener('click', (e) => {
        const card = e.target.closest('.search-item');
        if (!card) return;
        const item = state.appData.find((i) => i.name === card.dataset.itemName);
        if (item) openRateModal(item);
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
            if (fav) openRateModal(fav.item);
        }
    });

    // ── Backup / Import ───────────────────────────────────────────────────────
    const btnExport = document.getElementById('btnExport');
    const btnImport = document.getElementById('btnImport');
    const fileImport = document.getElementById('fileImport');
    const modalShare = document.getElementById('modalShare');

    if (btnExport) btnExport.addEventListener('click', exportBackup);
    if (btnImport) btnImport.addEventListener('click', () => fileImport?.click());
    if (fileImport) fileImport.addEventListener('change', importBackup);
    if (modalShare) modalShare.addEventListener('click', shareCurrentItem);

    // ── iOS keyboard body class ───────────────────────────────────────────────
    document.querySelectorAll('input, textarea').forEach((input) => {
        input.addEventListener('focus', () => document.body.classList.add('keyboard-open'));
        input.addEventListener('blur', () => document.body.classList.remove('keyboard-open'));
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
            setRating(parseInt(e.target.dataset.value));
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