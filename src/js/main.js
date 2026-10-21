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
        dashboardDetails: document.getElementById('collectionDetails'),
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
        return true;
    }
    return false;
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
    const dashboardClick = (event) => {
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
    };
    state.el.dashboardGrid.addEventListener('click', dashboardClick);
    state.el.dashboardDetails.addEventListener('click', dashboardClick);
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
    for (const input of [state.el.searchInput, document.getElementById('favorites-search')]) {
        input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                if (input === state.el.searchInput) {
                    handleSearch({ target: input });
                }
                input.blur();
            }
        });
    }
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
    window.addEventListener('popstate', (event) => {
        if (state.el.modal.classList.contains('active') && !event.state?.alkoraterSheet) {
            if (closeModal(true) === false) {
                window.history.pushState(
                    {
                        alkoraterTab: state.currentTab,
                        alkoraterSheet: true,
                        alkoraterProduct: productKey(state.currentItem),
                    },
                    '',
                );
                return;
            }
        }
        if (event.state?.alkoraterTab) {
            switchTab(event.state.alkoraterTab, { recordHistory: false });
        }
        if (event.state?.alkoraterSheet && !state.el.modal.classList.contains('active')) {
            const key = event.state.alkoraterProduct;
            const restore = () => {
                if (
                    window.history.state?.alkoraterSheet &&
                    window.history.state.alkoraterProduct === key &&
                    !openProduct(key)
                ) {
                    window.history.replaceState({ alkoraterTab: state.currentTab }, '');
                }
            };
            if (state.el.modal.classList.contains('closing')) {
                document.addEventListener('alkorater:modal-closed', restore, { once: true });
            } else {
                restore();
            }
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
        const editing = document.activeElement?.matches('input:not([type="checkbox"]), textarea');
        const keyboard =
            editing &&
            (window.visualViewport?.scale || 1) <= 1.05 &&
            window.innerHeight - height > 150;
        document.body.classList.toggle('keyboard-open', Boolean(keyboard));
        if (keyboard && state.el.modal?.classList.contains('active')) {
            requestAnimationFrame(() => {
                const input = document.activeElement;
                const body = document.querySelector('.sheet-body');
                if (!body?.contains(input) || !input.matches('input, textarea')) {
                    return;
                }
                const field = input.getBoundingClientRect();
                const region = body.getBoundingClientRect();
                if (field.top < region.top + 8 || field.bottom > region.bottom - 8) {
                    input.scrollIntoView({ block: 'nearest', behavior: 'instant' });
                }
            });
        }
    };
    update();
    const resize = debounce(update, 32);
    window.visualViewport?.addEventListener('resize', resize);
    window.visualViewport?.addEventListener('scroll', resize);
    window.addEventListener('resize', resize);
    window.addEventListener('pageshow', update);
    document.addEventListener('focusin', update);
    document.addEventListener('focusout', () => requestAnimationFrame(update));
}

function setupAppearance() {
    const transparency = document.getElementById('useTransparency');
    const haptics = document.getElementById('useHaptics');
    const read = (key) => {
        try {
            return localStorage.getItem(key);
        } catch {
            return null;
        }
    };
    const write = (key, value) => {
        try {
            localStorage.setItem(key, String(value));
        } catch {
            /* Preferences are optional. */
        }
    };
    transparency.checked = read('alkorater:opaque-surfaces') !== 'true';
    document.documentElement.toggleAttribute('data-opaque-surfaces', !transparency.checked);
    transparency.addEventListener('change', () => {
        document.documentElement.toggleAttribute('data-opaque-surfaces', !transparency.checked);
        write('alkorater:opaque-surfaces', !transparency.checked);
    });
    const supported = typeof navigator.vibrate === 'function';
    document.getElementById('hapticsSetting').hidden = !supported;
    document.getElementById('hapticsSupport').textContent = supported
        ? 'Wibracje są opcjonalne. Ich odczuwanie zależy od urządzenia i ustawień przeglądarki.'
        : 'Ta przeglądarka nie udostępnia wibracji. Wszystkie działania pozostają dostępne.';
    haptics.checked = supported && read('alkorater:haptics') === 'true';
    haptics.addEventListener('change', () => write('alkorater:haptics', haptics.checked));
}

async function init() {
    initElements();
    setupListeners();
    setupBackup();
    setupViewport();
    setupAppearance();
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
    const action =
        window.location.hash.slice(1) || new URLSearchParams(window.location.search).get('action');
    if (action === 'search' || action === 'favorites') {
        switchTab(action, { recordHistory: false });
    }
    window.history.replaceState({ alkoraterTab: state.currentTab }, '');
}

document.addEventListener('DOMContentLoaded', init);
