import { state } from './app/state.js';
import { debounce } from './utils/debounce.js';
import { loadFavorites as restoreFavorites } from './data/favorite-repo.js';
import { loadAllData } from './services/data-loader.js';
import { registerSW } from './services/sw-service.js';
import {
    showToast,
    toggleSkeletons,
    updateDashboard,
    switchTab,
    filterFavorites,
    deleteFavorite,
    handleSearch,
    openRateModal,
    setRating,
    closeModal,
    saveRating,
} from './ui/index.js';

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

const setupListeners = () => {
    document.addEventListener('alkorater:storage-error', (e) => {
        showToast(e.detail?.message || 'Błąd zapisu');
    });

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

    state.el.recentlyRated.addEventListener('click', (e) => {
        const card = e.target.closest('.recent-card');
        if (!card) {return;}
        const fav = state.favorites.find((f) => f.item.name === card.dataset.itemName);
        if (fav) {openRateModal(fav.item);}
    });

    state.el.searchResults.addEventListener('click', (e) => {
        const card = e.target.closest('.search-item');
        if (!card) {return;}
        const item = state.appData.find((i) => i.name === card.dataset.itemName);
        if (item) {openRateModal(item);}
    });

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

    state.el.navItems.forEach((btn) =>
        btn.addEventListener('click', () => switchTab(btn.dataset.tab))
    );

    state.el.searchInput.addEventListener('input', debounce(handleSearch, 300));
    const clearBtn = document.getElementById('clearSearch');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            state.el.searchInput.value = '';
            handleSearch({ target: { value: '' } });
            state.el.searchInput.focus();
        });
    }

    document.getElementById('modalClose').addEventListener('click', closeModal);
    state.el.modal.addEventListener('click', (e) => {
        if (e.target === state.el.modal || e.target.classList.contains('modal-overlay')) {
            closeModal();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && state.el.modal.classList.contains('active')) {
            closeModal(true);
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

    document.querySelectorAll('.filter-chip').forEach((chip) => {
        chip.addEventListener('click', () => filterFavorites(chip.dataset.filter));
    });
};

const setVH = () => {
    const vh = window.visualViewport?.height || window.innerHeight;
    document.documentElement.style.setProperty('--vh', `${vh * 0.01}px`);
    document.documentElement.style.setProperty('--window-height', `${vh}px`);
};

const initViewport = () => {
    setVH();
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', setVH);
        window.visualViewport.addEventListener('scroll', setVH);
    }
    window.addEventListener('resize', setVH);
    window.addEventListener('orientationchange', () => setTimeout(setVH, 150));
};

const setupKeyboardHandlers = () => {
    document.addEventListener('focusin', () => {
        document.body.classList.add('keyboard-open');
    });
    document.addEventListener('focusout', () => {
        setTimeout(() => {
            document.body.classList.remove('keyboard-open');
            setVH();
        }, 100);
    });
};

const setupPageVisibility = () => {
    window.addEventListener('pageshow', (e) => {
        if (e.persisted) {
            document.querySelector('.content-area')?.scrollTo(0, 0);
            setVH();
        }
    });
};

const init = async () => {
    initEl();

    try {
        await restoreFavorites();
    } catch {
        showToast('Błąd wczytywania danych');
    }

    setupListeners();
    setupKeyboardHandlers();
    initViewport();
    setupPageVisibility();
    toggleSkeletons(true);

    try {
        await loadAllData();
    } catch {
        showToast('Błąd ładowania bazy danych');
    }

    toggleSkeletons(false);
    updateDashboard();

    registerSW();

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('action') === 'search') {
        switchTab('search');
        window.history.replaceState({}, document.title, window.location.pathname);
    }
};

document.addEventListener('DOMContentLoaded', init);
