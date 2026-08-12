import { springModal } from '../utils/spring.js';
import { state } from '../app/state.js';
import { CONSTANTS } from '../app/constants.js';
import { escapeHTML } from '../utils/dom.js';
import { haptics } from './haptics.js';
import { showToast } from './toast.js';
import { updateDashboard } from './dashboard.js';
import { renderFavorites } from './favorites.js';
import { createRecord, upsertFavorite } from '../data/favorite-repo.js';
import { alcoholBadgeHTML, typeBadgeHTML } from './badges.js';

const DISMISS_THRESHOLD = 100;
const FLING_VELOCITY = 300;
const RUBBERBAND_CONSTANT = 0.55;
const MIN_RADIUS = 32;
const MAX_RADIUS = 48;

function rubberband(overshoot, dimension = 100) {
    return (overshoot * dimension * RUBBERBAND_CONSTANT) / (dimension + RUBBERBAND_CONSTANT * Math.abs(overshoot));
}

function setCategoryAccent(category) {
    const accent = CONSTANTS.CATEGORY_ACCENTS[category] || {
        hue: '42',
        sat: '58',
        lit: '52',
        hex: '#d4a054',
    };
    const root = document.querySelector('.modal-content');
    root.style.setProperty('--modal-accent', accent.hex);
    root.style.setProperty(
        '--modal-accent-dim',
        `hsla(${accent.hue}, ${accent.sat}%, ${accent.lit}%, 0.12)`,
    );
    const badge = document.getElementById('modalCategoryTag');
    badge.style.background = `hsla(${accent.hue}, ${accent.sat}%, ${accent.lit}%, 0.12)`;
    badge.style.color = accent.hex;
    const btn = document.getElementById('saveButton');
    btn.style.background = accent.hex;
    btn.style.setProperty('--btn-accent', accent.hex);
}

function resetCategoryAccent() {
    const root = document.querySelector('.modal-content');
    root.style.removeProperty('--modal-accent');
    root.style.removeProperty('--modal-accent-dim');
    const badge = document.getElementById('modalCategoryTag');
    badge.style.background = '';
    badge.style.color = '';
    const btn = document.getElementById('saveButton');
    btn.style.background = '';
    btn.style.removeProperty('--btn-accent');
}

function getModalFocusable() {
    return state.el.modal.querySelectorAll(
        'button:not([disabled]):not([tabindex="-1"]), input:not([disabled]):not([tabindex="-1"]), textarea:not([disabled]):not([tabindex="-1"]), [tabindex="0"]',
    );
}

function handleModalKeydown(e) {
    if (e.key !== 'Tab') { return; }
    const focusable = getModalFocusable();
    if (focusable.length === 0) { return; }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
        if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
        }
    } else {
        if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    }
}

/** @param {Object} item */
export function openRateModal(item) {
    haptics.light();
    state.currentItem = item;
    state._previousFocus = document.activeElement;
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        state.lastSearchQuery = searchInput.value;
    }
    const strictCategory = item.category || 'Nieznane';
    const existing = state.favorites.find((f) => f.item.name === item.name);

    if (existing) {
        state.ratingConfig = {
            stars: existing.stars,
            tag: strictCategory,
            note: existing.note || '',
        };
        document.getElementById('saveButton').textContent = 'Zaktualizuj';
    } else {
        state.ratingConfig = { stars: 0, tag: strictCategory, note: '' };
        document.getElementById('saveButton').textContent = 'Zapisz Ocenę';
    }

    document.getElementById('modalTitle').innerHTML =
        `${escapeHTML(item.name)}${alcoholBadgeHTML(item.alcohol)}`;
    document.getElementById('modalCategoryTag').innerHTML =
        `Kategoria: ${escapeHTML(strictCategory)}${typeBadgeHTML(item.type)}`;
    document.getElementById('note-input').value = state.ratingConfig.note;

    setCategoryAccent(strictCategory);

    document.querySelector('.app-container').classList.add('scale-back');
    document.querySelector('.bottom-nav').classList.add('tab-bar-hidden');
    state.el.modal.style.display = 'block';
    state.el.modal.addEventListener('keydown', handleModalKeydown);

    const content = document.querySelector('.modal-content');
    content.style.transition = 'none';
    content.style.transform = 'translateY(104%)';
    content.style.borderRadius = `${MIN_RADIUS}px ${MIN_RADIUS}px 0 0`;
    content.offsetHeight; // force reflow
    content.style.transition = '';

    requestAnimationFrame(() => {
        state.el.modal.classList.add('active');
        springModal(content, { y: 0, radius: MIN_RADIUS }, {
            stiffness: 200,
            damping: 12,
            mass: 0.8,
        });
        const focusable = getModalFocusable();
        if (focusable.length > 0) {
            focusable[0].focus();
        }
    });

    renderModalState();
}

export function renderModalState() {
    document.querySelectorAll('.star').forEach((s) => {
        s.classList.toggle('active', parseInt(s.dataset.value) <= state.ratingConfig.stars);
    });

    if (state.ratingConfig.stars === 5) {
        document.querySelectorAll('.star').forEach((s, idx) => {
            setTimeout(() => s.classList.add('star-pop'), idx * 50);
        });
        setTimeout(() => {
            document.querySelectorAll('.star').forEach((s) => s.classList.remove('star-pop'));
        }, 800);
    }

    validateSave();
}

export function setRating(val) {
    state.ratingConfig.stars = val;
    haptics.light();
    if (val === 5) {
        haptics.success();
    }
    renderModalState();
}

export function validateSave() {
    document.getElementById('saveButton').disabled = state.ratingConfig.stars < 1;
}

function restoreFocus() {
    state.el.modal.removeEventListener('keydown', handleModalKeydown);
    const prev = state._previousFocus;
    if (prev && prev.focus) {
        prev.focus();
        state._previousFocus = null;
    }
}

export function closeModal(instant) {
    document.querySelector('.app-container').classList.remove('scale-back');
    document.querySelector('.bottom-nav').classList.remove('tab-bar-hidden');

    const content = document.querySelector('.modal-content');
    const overlay = document.querySelector('.modal-overlay');

    if (instant) {
        state.el.modal.classList.remove('active', 'closing');
        state.el.modal.style.display = 'none';
        content.style.transform = '';
        content.style.borderRadius = '';
        if (overlay) { overlay.style.opacity = ''; }
        resetCategoryAccent();
        restoreFocus();
        return;
    }

    state.el.modal.classList.remove('active');
    content.style.transition = 'none';

    const finishClose = () => {
        state.el.modal.style.display = 'none';
        content.style.transform = '';
        content.style.borderRadius = '';
        if (overlay) { overlay.style.opacity = ''; }
        resetCategoryAccent();
        restoreFocus();
    };

    springModal(content, { y: window.innerHeight * 1.04, radius: MAX_RADIUS }, {
        stiffness: 200,
        damping: 12,
        mass: 0.8,
        onFinish: finishClose,
    });
}

/** Persist current rating to storage. */
export async function saveRating() {
    if (!state.currentItem) {
        return;
    }
    state.ratingConfig.note = document.getElementById('note-input').value;

    const record = createRecord(state.currentItem, state.ratingConfig);

    const result = await upsertFavorite(state.favorites, record);

    if (result === 'updated') {
        showToast('Zaktualizowano ocenę!', 'update');
    } else {
        showToast('Zapisano ocenę!', 'success');
    }

    updateDashboard();
    if (state.currentTab === 'favorites') {
        const activeChip = document.querySelector('.filter-chip.active');
        renderFavorites(activeChip?.dataset.filter);
    }
    if (state.currentTab === 'search' && state.lastSearchQuery) {
        const searchInput = document.getElementById('search-input');
        if (searchInput && !searchInput.value) {
            searchInput.value = state.lastSearchQuery;
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }
    haptics.success();
    closeModal();
}

/** iOS-style pull-down to dismiss the rating modal. */
export function setupModalDismiss() {
    const content = document.querySelector('.modal-content');
    const overlay = document.querySelector('.modal-overlay');
    const grabber = document.querySelector('.modal-grabber');
    let startY = 0;
    let dragging = false;
    let history = [];

    function onPointerDown(e) {
        const touchY = e.touches[0].clientY;
        const rect = content.getBoundingClientRect();
        const hitZone = grabber
            ? grabber.getBoundingClientRect().bottom
            : rect.top + 60;
        if (touchY > hitZone) { return; }
        startY = touchY;
        dragging = true;
        history = [{ y: touchY, t: performance.now() }];
        content.style.transition = 'none';
    }

    function onPointerMove(e) {
        if (!dragging) { return; }
        const touchY = e.touches[0].clientY;
        const delta = touchY - startY;
        if (delta < 0) {
            dragging = false;
            content.style.transition = '';
            return;
        }

        history.push({ y: touchY, t: performance.now() });
        if (history.length > 6) { history.shift(); }

        const damped = delta > DISMISS_THRESHOLD
            ? DISMISS_THRESHOLD + rubberband(delta - DISMISS_THRESHOLD)
            : delta;
        const progress = Math.min(damped / DISMISS_THRESHOLD, 1);

        content.style.transform = `translateY(${damped}px)`;
        content.style.borderRadius = `${MIN_RADIUS + (MAX_RADIUS - MIN_RADIUS) * progress}px ${MIN_RADIUS + (MAX_RADIUS - MIN_RADIUS) * progress}px 0 0`;

        if (overlay) {
            overlay.style.opacity = String(1 - progress * 0.6);
        }
    }

    function onPointerUp(e) {
        if (!dragging) { return; }
        dragging = false;
        content.style.transition = '';

        const delta = e.changedTouches[0].clientY - startY;

        let velocity = 0;
        if (history.length >= 2) {
            const last = history[history.length - 1];
            const prev = history[Math.max(0, history.length - 3)];
            const dt = last.t - prev.t;
            if (dt > 0) {
                velocity = (last.y - prev.y) / (dt / 1000);
            }
        }

        const shouldDismiss = delta > DISMISS_THRESHOLD || velocity > FLING_VELOCITY;

        if (shouldDismiss) {
            closeModal();
        } else {
            haptics.light();
            if (overlay) { overlay.style.opacity = ''; }
            springModal(content, { y: 0, radius: MIN_RADIUS }, {
                stiffness: 200,
                damping: 12,
                mass: 0.8,
            });
        }
    }

    function onPointerCancel() {
        if (!dragging) { return; }
        dragging = false;
        haptics.light();
        content.style.transition = '';
        if (overlay) { overlay.style.opacity = ''; }
        springModal(content, { y: 0, radius: MIN_RADIUS }, {
            stiffness: 200,
            damping: 12,
            mass: 0.8,
        });
    }

    content.addEventListener('touchstart', onPointerDown, { passive: true });
    content.addEventListener('touchmove', onPointerMove, { passive: true });
    content.addEventListener('touchend', onPointerUp);
    content.addEventListener('touchcancel', onPointerCancel);
}
