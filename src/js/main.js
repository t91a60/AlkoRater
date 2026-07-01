import { state } from './app/state.js';
import { debounce } from './utils/debounce.js';
import { loadFavorites as restoreFavorites } from './data/favorite-repo.js';
import { loadAllData } from './services/data-loader.js';
import { registerSW } from './services/sw-service.js';
import { setupContextMenus } from './ui/context-menu.js';
import { setupPullToRefresh } from './ui/pull-to-refresh.js';
import {
    showToast,
    toggleSkeletons,
    updateDashboard,
    switchTab,
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

const initEl = () => {
    state.el = {
        headerTitle: document.getElementById('headerTitle'),
        tabs: {
            start: document.getElementById('tab-start'),
            search: document.getElementById('tab-search'),
            favorites: document.getElementById('tab-favorites'),
        },
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
};

const setupListeners = () => {
    const handleSearchAreaClick = (e) => {
        const removeBtn = e.target.closest('.recent-chip-remove');
        if (removeBtn) {
            e.stopPropagation();
            removeRecentSearch(removeBtn.dataset.query);
            return;
        }
        const chip = e.target.closest('.recent-chip, .suggestion-chip, .search-empty-chip');
        if (chip) {
            const query = chip.dataset.query;
            state.el.searchInput.value = query;
            handleSearch({ target: { value: query } });
            return;
        }
        const card = e.target.closest('.search-card');
        if (!card) {return;}
        const item = state.appData.find((i) => i.name === card.dataset.itemName);
        if (item) {openRateModal(item);}
    };

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

    state.el.searchResults.addEventListener('click', handleSearchAreaClick);
    state.el.noResults.addEventListener('click', handleSearchAreaClick);

    state.el.favoritesList.addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('.delete-btn');
        if (deleteBtn) {
            e.stopPropagation();
            deleteFavorite(deleteBtn.dataset.deleteId);
            return;
        }
        const card = e.target.closest('.favorite-card');
        if (card) {
            const main = card.querySelector('.fav-main');
            if (main && main.classList.contains('swiped')) {
                main.classList.remove('swiped');
                main.style.transform = '';
                return;
            }
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



    const noteInput = document.getElementById('note-input');
    const toolbar = document.getElementById('keyboardToolbar');
    const kbDone = document.getElementById('keyboardDone');
    if (noteInput && toolbar && kbDone) {
        noteInput.addEventListener('focus', () => {
            toolbar.style.display = 'flex';
            requestAnimationFrame(() => toolbar.classList.add('visible'));
        });
        noteInput.addEventListener('blur', () => {
            toolbar.classList.remove('visible');
            setTimeout(() => { toolbar.style.display = 'none'; }, 300);
        });
        kbDone.addEventListener('click', () => {
            noteInput.blur();
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
        const star = e.target.closest('.star');
        if (star) {
            setRating(parseInt(star.dataset.value, 10));
        }
    });

    document.querySelector('.stars-container').addEventListener('keydown', (e) => {
        const target = e.target.closest('.star');
        if (!target) {return;}
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

const setupPageShow = () => {
    window.addEventListener('pageshow', (e) => {
        if (e.persisted) {
            document.querySelector('.content-area')?.scrollTo(0, 0);
            setVH();
        }
    });
};

function setupSwipeTabs(container) {
    const tabs = ['start', 'search', 'favorites'];
    let startX = 0;
    let swiping = false;

    container.addEventListener('touchstart', (e) => {
        if (container.scrollTop > 0) {return;}
        const target = e.target;
        if (target.closest('.search-card, .search-item, .favorite-card, .recent-card, .action-btn, .filter-chip, .nav-item')) {return;}
        startX = e.touches[0].clientX;
        swiping = true;
    }, { passive: true });

    container.addEventListener('touchmove', (e) => {
        if (!swiping) {return;}
        const delta = e.touches[0].clientX - startX;
        if (Math.abs(delta) > 10) {
            e.preventDefault();
        }
    }, { passive: false });

    container.addEventListener('touchend', (e) => {
        if (!swiping) {return;}
        swiping = false;
        const delta = e.changedTouches[0].clientX - startX;
        if (Math.abs(delta) > 70) {
            const idx = tabs.indexOf(state.currentTab);
            if (delta < 0 && idx < tabs.length - 1) {
                switchTab(tabs[idx + 1]);
            } else if (delta > 0 && idx > 0) {
                switchTab(tabs[idx - 1]);
            }
        }
    });
}

function setupSwipeDelete(container) {
    let startX = 0;
    let currentTranslate = 0;
    let isSwiping = false;
    let activeCard = null;
    const REVEAL_WIDTH = 60;

    container.addEventListener('touchstart', (e) => {
        const card = e.target.closest('.favorite-card');
        if (!card) {return;}
        if (e.target.closest('.delete-btn')) {return;}
        const main = card.querySelector('.fav-main');
        if (!main) {return;}
        document.querySelectorAll('.fav-main.swiped').forEach((el) => {
            if (el !== main) {el.classList.remove('swiped'); el.style.transform = '';}
        });
        startX = e.touches[0].clientX;
        isSwiping = true;
        activeCard = { card, main };
        currentTranslate = main.classList.contains('swiped') ? -REVEAL_WIDTH : 0;
    }, { passive: true });

    container.addEventListener('touchmove', (e) => {
        if (!isSwiping || !activeCard) {return;}
        const delta = e.touches[0].clientX - startX;
        if (delta > 0 && currentTranslate >= 0) {return;}
        const newTranslate = Math.max(-REVEAL_WIDTH - 10, Math.min(0, currentTranslate + delta));
        activeCard.main.style.transform = `translateX(${newTranslate}px)`;
        activeCard.main.style.transition = 'none';
    }, { passive: true });

    const resetSwipe = () => {
        if (!activeCard) {return;}
        const main = activeCard.main;
        const style = getComputedStyle(main);
        const matrix = new DOMMatrixReadOnly(style.transform);
        const x = matrix.m41 || 0;
        if (x < -40) {
            main.classList.add('swiped');
        } else {
            main.classList.remove('swiped');
        }
        main.style.transform = '';
        main.style.transition = '';
        isSwiping = false;
        activeCard = null;
    };

    container.addEventListener('touchend', resetSwipe);
    container.addEventListener('touchcancel', resetSwipe);
}

const init = async () => {
    initEl();

    try {
        await restoreFavorites();
    } catch {
        showToast('Błąd wczytywania danych');
    }

    setupListeners();
    setupContextMenus(state.el.searchResults, {
        onRate: (itemName) => {
            const item = state.appData.find((i) => i.name === itemName);
            if (item) {openRateModal(item);}
        },
    });
    setupSwipeDelete(state.el.favoritesList);
    setupModalDismiss();
    setupSwipeTabs(document.querySelector('.content-area'));
    setupContextMenus(state.el.favoritesList, {
        onRate: (itemName) => {
            const fav = state.favorites.find((f) => f.item.name === itemName);
            if (fav) {openRateModal(fav.item);}
        },
        onDelete: (itemName) => {
            const fav = state.favorites.find((f) => f.item.name === itemName);
            if (fav) {deleteFavorite(fav.id);}
        },
    });
    setupPullToRefresh(document.querySelector('.content-area'), async () => {
        await loadAllData();
        updateDashboard();
        if (state.currentTab === 'favorites') {
            const activeChip = document.querySelector('.filter-chip.active');
            const { renderFavorites } = await import('./ui/index.js');
            renderFavorites(activeChip?.dataset.filter);
        }
        showToast('Odświeżono', 'success');
    });
    setupKeyboardHandlers();
    initViewport();
    setupPageShow();
    toggleSkeletons(true);

    try {
        await loadAllData();
    } catch {
        showToast('Błąd ładowania bazy danych');
    }

    toggleSkeletons(false);
    updateDashboard();
    renderSuggestions();
    window.lucide?.createIcons();

    registerSW();

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('action') === 'search') {
        switchTab('search');
        window.history.replaceState({}, document.title, window.location.pathname);
    }
};

document.addEventListener('DOMContentLoaded', init);
