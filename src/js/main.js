import { state } from './app/state.js';
import { debounce } from './utils/debounce.js';
import { loadFavorites } from './data/favorite-repo.js';
import { productKey } from './data/product.js';
import { loadAllData } from './services/data-loader.js';
import { onExternalChange, storageStatus } from './services/storage.js';
import { registerSW } from './services/sw-service.js';
import { setupContextMenus } from './ui/context-menu.js';
import { THUMB_FALLBACK_SVG } from './ui/badges.js';
import { createIcons } from './ui/icons.js';
import { setupBackup } from './ui/backup.js';
import { setupPullToRefresh } from './ui/pull-to-refresh.js';
import {
    showToast,
    toggleSkeletons,
    updateDashboard,
    switchTab,
    snapNavPill,
    renderFavorites,
    filterFavorites,
    deleteFavorite,
    handleSearch,
    renderSuggestions,
    removeRecentSearch,
    openRateModal,
    setRating,
    closeModal,
    saveRating,
    setupModalDismiss,
} from './ui/index.js';

function initElements() {
    state.el = {
        headerTitle: document.getElementById('headerTitle'),
        tabs: Object.fromEntries(
            ['start', 'search', 'favorites'].map((name) => [
                name,
                document.getElementById(`tab-${name}`),
            ]),
        ),
        navItems: document.querySelectorAll('.nav-item'),
        searchInput: document.getElementById('search-input'),
        searchResults: document.getElementById('searchResults'),
        favoritesList: document.getElementById('favorites-list'),
        dashboardGrid: document.getElementById('dashboardGrid'),
        recentlyRated: document.getElementById('recentlyRated'),
        skeletons: document.getElementById('searchSkeletons'),
        noResults: document.getElementById('noResults'),
        modal: document.getElementById('modal-wrapper'),
    };
}

function openProduct(key, origin = null) {
    const saved = state.favorites.find((f) => productKey(f.item) === key);
    const item = saved?.item || state.appData.find((p) => productKey(p) === key);
    if (item) {
        const trigger =
            origin ||
            [...state.el.tabs[state.currentTab].querySelectorAll('[data-item-id]')].find(
                (el) => el.dataset.itemId === key,
            );
        openRateModal(
            item,
            trigger?.matches('button') ? trigger : trigger?.querySelector('button'),
        );
    }
}

function status() {
    const notice = document.getElementById('appNotice');
    const errors = [];
    if (state.storageError) {
        errors.push(
            'Nie można wczytać Twoich ocen. Zapis jest zablokowany, aby nie zastąpić danych pustą kolekcją. Spróbuj ponownie lub pobierz kopię odzyskiwania na ekranie Start.',
        );
    }
    if (state.catalogError) {
        errors.push(
            'Nie można wczytać całego katalogu. Sprawdź połączenie i spróbuj ponownie. Twoje zapisane oceny nadal są dostępne.',
        );
    }
    notice.hidden = !errors.length;
    document.getElementById('repairOffline').hidden =
        !state.catalogError || !navigator.serviceWorker?.controller;
    document.getElementById('appNoticeText').textContent = errors.join(' ');
    document.getElementById('catalogStatus').textContent = state.catalogError
        ? 'Katalog nie jest w pełni dostępny'
        : `${state.appData.length} produktów w katalogu`;
    const storage = storageStatus();
    document.getElementById('storageStatus').textContent = state.storageError
        ? 'Dane wymagają odzyskania. Nie czyść pamięci witryny.'
        : storage.backend === 'localStorage'
          ? `Tryb awaryjny: localStorage.${storage.writable ? '' : ' Bezpieczny zapis nie jest dostępny.'}`
          : 'Zapis lokalny: IndexedDB. Kopia JSON jest niezależna od pamięci witryny.';
    if (state.storageError) {
        document.getElementById('recoveryBackup').hidden = false;
    }
    document.getElementById('offlineStatus').textContent = navigator.onLine
        ? 'Gotowość offline jest sprawdzana…'
        : 'Tryb offline';
    if (navigator.serviceWorker?.controller && navigator.onLine) {
        document.getElementById('offlineStatus').textContent =
            'Aplikacja obsługiwana przez pamięć offline';
    }
}

async function refresh() {
    const results = await Promise.allSettled([loadFavorites(), loadAllData()]);
    updateDashboard();
    renderFavorites(document.querySelector('.filter-chip.active')?.dataset.filter);
    handleSearch({ target: state.el.searchInput });
    status();
    return results.every((result) => result.status === 'fulfilled');
}

function setupListeners() {
    const searchClick = (event) => {
        const remove = event.target.closest('.recent-chip-remove');
        if (remove) {
            removeRecentSearch(remove.dataset.query);
            return;
        }
        const chip = event.target.closest('[data-query]');
        if (chip) {
            state.el.searchInput.value = chip.dataset.query;
            handleSearch({ target: state.el.searchInput });
            return;
        }
        const card = event.target.closest('[data-item-id]');
        if (card) {
            openProduct(card.dataset.itemId, card);
        }
    };
    state.el.searchResults.addEventListener('click', searchClick);
    state.el.noResults.addEventListener('click', searchClick);
    state.el.recentlyRated.addEventListener('click', searchClick);
    state.el.dashboardGrid.addEventListener('click', (event) => {
        const action = event.target.closest('[data-action]')?.dataset.action;
        if (action === 'open-search') {
            switchTab('search');
        }
        if (action === 'open-favorites') {
            switchTab('favorites');
        }
        const item = event.target.closest('[data-item-id]');
        if (item) {
            openProduct(item.dataset.itemId, item);
        }
    });
    state.el.favoritesList.addEventListener('click', (event) => {
        const remove = event.target.closest('[data-delete-id]');
        if (remove) {
            deleteFavorite(remove.dataset.deleteId);
            return;
        }
        if (event.target.closest('[data-action="open-search"]')) {
            switchTab('search');
            return;
        }
        const card = event.target.closest('.fav-main')?.closest('[data-item-id]');
        if (card) {
            openProduct(card.dataset.itemId, card.querySelector('.fav-main'));
        }
    });
    state.el.navItems.forEach((button) => {
        button.tabIndex = button.classList.contains('active') ? 0 : -1;
        button.addEventListener('click', () => switchTab(button.dataset.tab));
        button.addEventListener('keydown', (event) => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
                return;
            }
            event.preventDefault();
            const buttons = [...state.el.navItems];
            const current = buttons.indexOf(button);
            const next =
                event.key === 'Home'
                    ? 0
                    : event.key === 'End'
                      ? 2
                      : (current + (event.key === 'ArrowRight' ? 1 : -1) + 3) % 3;
            switchTab(buttons[next].dataset.tab);
            buttons[next].focus();
        });
    });
    document
        .getElementById('showAllFavoritesBtn')
        .addEventListener('click', () => switchTab('favorites'));
    state.el.searchInput.addEventListener(
        'input',
        debounce(() => handleSearch({ target: state.el.searchInput }), 150),
    );
    document.getElementById('clearSearch').addEventListener('click', () => {
        state.el.searchInput.value = '';
        handleSearch({ target: state.el.searchInput });
        state.el.searchInput.focus();
    });
    document
        .getElementById('favorites-search')
        .addEventListener('input', () =>
            renderFavorites(document.querySelector('.filter-chip.active')?.dataset.filter),
        );
    document
        .querySelectorAll('.filter-chip')
        .forEach((chip) =>
            chip.addEventListener('click', () => filterFavorites(chip.dataset.filter)),
        );
    document.getElementById('modalClose').addEventListener('click', () => closeModal());
    state.el.modal.addEventListener('click', (event) => {
        if (event.target === state.el.modal || event.target.classList.contains('modal-overlay')) {
            closeModal();
        }
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && state.el.modal.classList.contains('active')) {
            closeModal(true);
        }
    });
    document.getElementById('saveButton').addEventListener('click', saveRating);
    document.querySelector('.stars-container').addEventListener('click', (event) => {
        const star = event.target.closest('.star');
        if (star) {
            setRating(Number(star.dataset.value));
        }
    });
    document.addEventListener(
        'error',
        (event) => {
            const image = event.target;
            if (!(image instanceof HTMLImageElement) || image.dataset.fallbackApplied) {
                return;
            }
            image.dataset.fallbackApplied = 'true';
            const thumb = image.closest('.product-thumb');
            if (thumb) {
                thumb.classList.add('thumb-broken');
                thumb.innerHTML = THUMB_FALLBACK_SVG;
            }
        },
        true,
    );
    document.getElementById('retryData').addEventListener('click', async (event) => {
        event.target.disabled = true;
        await refresh();
        event.target.disabled = false;
    });
    window.addEventListener('online', status);
    window.addEventListener('offline', status);
    navigator.serviceWorker?.addEventListener('controllerchange', status);
    onExternalChange(async () => {
        try {
            await loadFavorites();
            updateDashboard();
            if (state.currentTab === 'favorites') {
                renderFavorites(document.querySelector('.filter-chip.active')?.dataset.filter);
            }
            if (state.currentTab === 'search') {
                handleSearch({ target: state.el.searchInput });
            }
        } catch {
            status();
        }
    });
    window.addEventListener('beforeunload', (event) => {
        const dirty =
            state.el.modal.classList.contains('active') &&
            JSON.stringify([
                state.ratingConfig.stars,
                document.getElementById('note-input').value,
            ]) !== state.modalInitial;
        if (dirty || state.saving) {
            event.preventDefault();
            event.returnValue = '';
        }
    });
}

function setupViewport() {
    const update = () => {
        const height = window.visualViewport?.height || window.innerHeight;
        document.documentElement.style.setProperty('--vh', `${height * 0.01}px`);
        document.documentElement.style.setProperty('--window-height', `${height}px`);
        document.documentElement.style.setProperty(
            '--viewport-top',
            `${window.visualViewport?.offsetTop || 0}px`,
        );
    };
    update();
    const resize = debounce(update, 32);
    window.visualViewport?.addEventListener('resize', resize);
    window.visualViewport?.addEventListener('scroll', resize);
    window.addEventListener('resize', resize);
    window.addEventListener('pageshow', update);
}

async function init() {
    initElements();
    setupListeners();
    setupBackup();
    setupViewport();
    setupModalDismiss();
    setupContextMenus(state.el.searchResults, { onRate: openProduct });
    setupContextMenus(state.el.favoritesList, {
        onRate: openProduct,
        onDelete: (key) => {
            const record = state.favorites.find((f) => productKey(f.item) === key);
            if (record) {
                deleteFavorite(record.id);
            }
        },
    });
    setupPullToRefresh(document.querySelector('.content-area'), async () => {
        if (await refresh()) {
            showToast('Odświeżono katalog i oceny', 'success');
        } else {
            showToast('Nie udało się odświeżyć wszystkich danych', 'warning');
        }
    });
    state.el.dashboardGrid.innerHTML =
        '<p class="empty-copy" role="status">Wczytywanie Twoich ocen…</p>';
    toggleSkeletons(true);
    document.body.classList.add('app-loaded');
    await refresh();
    toggleSkeletons(false);
    renderSuggestions();
    createIcons();
    snapNavPill();
    registerSW();
    const action = new URLSearchParams(window.location.search).get('action');
    if (action === 'search' || action === 'favorites') {
        switchTab(action);
    }
}

document.addEventListener('DOMContentLoaded', init);
