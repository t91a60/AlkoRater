import { springModal } from '../utils/spring.js';
import { state } from '../app/state.js';
import { escapeHTML, prefersReducedMotion } from '../utils/dom.js';
import { haptics } from './haptics.js';
import { showToast } from './toast.js';
import { updateDashboard } from './dashboard.js';
import { renderFavorites } from './favorites.js';
import { createRecord, upsertFavorite, findFavorite } from '../data/favorite-repo.js';
import { alcoholBadgeHTML, typeBadgeHTML } from './badges.js';
import { handleSearch } from './search-ui.js';

const DISMISS_THRESHOLD = 100;
const FLING_VELOCITY = 300;
const RUBBERBAND_CONSTANT = 0.55;
const MIN_RADIUS = 32;
const MAX_RADIUS = 48;
let lastDismissVelocity = 0;
let openSpring = null;
let closeSpring = null;
let openFrame = null;

function rubberband(overshoot, dimension = 100) {
    return (
        (overshoot * dimension * RUBBERBAND_CONSTANT) /
        (dimension + RUBBERBAND_CONSTANT * Math.abs(overshoot))
    );
}

function getModalFocusable() {
    return state.el.modal.querySelectorAll(
        'button:not([disabled]):not([tabindex="-1"]), input:not([disabled]):not([tabindex="-1"]), textarea:not([disabled]):not([tabindex="-1"]), [tabindex="0"]',
    );
}

function handleModalKeydown(e) {
    if (
        e.target.closest('.star') &&
        ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)
    ) {
        e.preventDefault();
        const current = Number(e.target.dataset.value);
        const next =
            e.key === 'Home'
                ? 1
                : e.key === 'End'
                  ? 5
                  : Math.max(
                        1,
                        Math.min(5, current + (['ArrowRight', 'ArrowUp'].includes(e.key) ? 1 : -1)),
                    );
        setRating(next);
        document.querySelector(`.star[data-value="${next}"]`).focus();
        return;
    }
    if (e.key !== 'Tab') {
        return;
    }
    const focusable = getModalFocusable();
    if (focusable.length === 0) {
        return;
    }
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
export function openRateModal(item, trigger = document.activeElement) {
    if (state.saving) {
        return;
    }
    closeSpring?.stop();
    if (openFrame !== null) {
        cancelAnimationFrame(openFrame);
    }
    closeSpring = null;
    haptics.light();
    lastDismissVelocity = 0;
    state.currentItem = item;
    state._previousFocus = trigger;
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        state.lastSearchQuery = searchInput.value;
    }
    const strictCategory = item.category || 'Nieznane';
    const existing = findFavorite(state.favorites, item);
    state.editRevision = existing?.revision || 0;
    state.editId = existing?.id || null;
    document.getElementById('modalError').textContent = '';

    if (existing) {
        state.ratingConfig = {
            stars: existing.stars,
            tag: strictCategory,
            note: existing.note || '',
        };
        document.getElementById('saveButton').textContent = 'Zapisz zmiany';
    } else {
        state.ratingConfig = { stars: 0, tag: strictCategory, note: '' };
        document.getElementById('saveButton').textContent = 'Zapisz ocenę';
    }

    document.getElementById('modalTitle').innerHTML =
        `${escapeHTML(item.name)}${alcoholBadgeHTML(item.alcohol)}`;
    document.getElementById('modalCategoryTag').innerHTML =
        `Kategoria: ${escapeHTML(strictCategory)}${typeBadgeHTML(item.type)}`;
    document.getElementById('note-input').value = state.ratingConfig.note;
    state.modalInitial = JSON.stringify([state.ratingConfig.stars, state.ratingConfig.note]);

    document.querySelector('.app-container').inert = true;
    document.querySelector('.bottom-nav').classList.add('tab-bar-hidden');
    state.el.modal.style.display = 'flex';
    state.el.modal.classList.add('active');
    state.el.modal.addEventListener('keydown', handleModalKeydown);

    const content = document.querySelector('.modal-content');
    content.style.transition = 'none';
    content.style.transform = 'translateY(104%)';
    content.style.borderRadius = `${MIN_RADIUS}px ${MIN_RADIUS}px 0 0`;
    content.offsetHeight; // force reflow
    content.style.transition = '';

    openFrame = requestAnimationFrame(() => {
        openFrame = null;
        if (!state.el.modal.classList.contains('active')) {
            return;
        }
        if (openSpring) {
            openSpring.stop();
        }
        if (prefersReducedMotion()) {
            content.style.transform = 'translateY(0)';
        } else {
            openSpring = springModal(
                content,
                { y: 0, radius: MIN_RADIUS },
                {
                    stiffness: 200,
                    damping: 20,
                    mass: 0.8,
                    onFinish: () => {
                        openSpring = null;
                    },
                },
            );
        }
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
        s.setAttribute(
            'aria-checked',
            String(Number(s.dataset.value) === state.ratingConfig.stars),
        );
        s.tabIndex = Number(s.dataset.value) === (state.ratingConfig.stars || 1) ? 0 : -1;
    });
    document.getElementById('ratingHelp').textContent = state.ratingConfig.stars
        ? `Twoja ocena: ${state.ratingConfig.stars} z 5`
        : 'Wybierz ocenę od 1 do 5.';
    validateSave();
}

export function setRating(val) {
    if (!Number.isInteger(val) || val < 1 || val > 5 || state.saving) {
        return;
    }
    state.ratingConfig.stars = val;
    haptics.light();
    renderModalState();
}

export function validateSave() {
    document.getElementById('note-input').disabled = state.saving;
    document.getElementById('modalClose').disabled = state.saving;
    document.querySelectorAll('.star').forEach((star) => {
        star.disabled = state.saving;
    });
    document.getElementById('saveButton').disabled =
        state.ratingConfig.stars < 1 || !state.storageReady || state.saving;
    if (!state.storageReady) {
        document.getElementById('modalError').textContent =
            'Zapis jest zablokowany, ponieważ nie udało się wczytać Twoich danych. Wróć na Start i spróbuj ponownie.';
    }
}

function restoreFocus() {
    state.el.modal.removeEventListener('keydown', handleModalKeydown);
    const prev = state._previousFocus;
    if (prev?.isConnected && prev.focus) {
        prev.focus();
        state._previousFocus = null;
    } else {
        document.querySelector(`.nav-item[data-tab="${state.currentTab}"]`)?.focus();
    }
}

export function closeModal(instant = false, discard = false) {
    if (state.saving) {
        return;
    }
    const changed =
        JSON.stringify([state.ratingConfig.stars, document.getElementById('note-input').value]) !==
        state.modalInitial;
    if (!discard && changed && !window.confirm('Odrzucić niezapisane zmiany oceny i notatki?')) {
        return;
    }
    if (openFrame !== null) {
        cancelAnimationFrame(openFrame);
        openFrame = null;
    }
    if (openSpring) {
        openSpring.stop();
        openSpring = null;
    }
    document.querySelector('.app-container').inert = false;
    document.querySelector('.bottom-nav').classList.remove('tab-bar-hidden');

    const content = document.querySelector('.modal-content');
    const overlay = document.querySelector('.modal-overlay');

    if (instant === true || prefersReducedMotion()) {
        state.el.modal.classList.remove('active', 'closing');
        state.el.modal.style.display = 'none';
        content.style.transform = '';
        content.style.borderRadius = '';
        if (overlay) {
            overlay.style.opacity = '';
        }
        restoreFocus();
        document.dispatchEvent(new Event('alkorater:modal-closed'));
        return;
    }

    state.el.modal.classList.remove('active');
    content.style.transition = 'none';

    const finishClose = () => {
        state.el.modal.style.display = 'none';
        content.style.transform = '';
        content.style.borderRadius = '';
        if (overlay) {
            overlay.style.opacity = '';
        }
        restoreFocus();
        closeSpring = null;
        document.dispatchEvent(new Event('alkorater:modal-closed'));
    };

    closeSpring = springModal(
        content,
        { y: window.innerHeight * 1.04, radius: MAX_RADIUS },
        {
            stiffness: 200,
            damping: 20,
            mass: 0.8,
            velocity: lastDismissVelocity,
            onFinish: finishClose,
        },
    );
}

/** Persist current rating to storage. */
export async function saveRating() {
    if (
        !state.currentItem ||
        state.saving ||
        !state.storageReady ||
        !Number.isInteger(state.ratingConfig.stars) ||
        state.ratingConfig.stars < 1 ||
        state.ratingConfig.stars > 5
    ) {
        return;
    }
    state.ratingConfig.note = document.getElementById('note-input').value;

    state.saving = true;
    validateSave();
    const button = document.getElementById('saveButton');
    const label = button.textContent;
    button.textContent = 'Zapisywanie…';
    document.getElementById('modalError').textContent = '';
    try {
        const record = createRecord(state.currentItem, state.ratingConfig);
        const result = await upsertFavorite(
            state.favorites,
            record,
            state.editRevision,
            state.editId,
        );
        showToast(result === 'updated' ? 'Zaktualizowano ocenę' : 'Zapisano ocenę', 'success');

        updateDashboard();
        if (state.currentTab === 'favorites') {
            const activeChip = document.querySelector('.filter-chip.active');
            renderFavorites(activeChip?.dataset.filter);
        }
        if (state.currentTab === 'search') {
            handleSearch({ target: state.el.searchInput });
        }
        haptics.success();
        state.saving = false;
        closeModal(false, true);
    } catch (error) {
        document.getElementById('modalError').textContent = `Nie zapisano oceny. ${error.message}`;
    } finally {
        state.saving = false;
        button.textContent = label;
        validateSave();
    }
}

/** iOS-style pull-down to dismiss the rating modal. */
export function setupModalDismiss() {
    if (prefersReducedMotion()) {
        return;
    }
    const content = document.querySelector('.modal-content');
    const overlay = document.querySelector('.modal-overlay');
    const grabber = document.querySelector('.modal-grabber');
    let startY = 0;
    let dragging = false;
    let history = [];
    let activeSpring = null;

    function readVelocity() {
        if (history.length >= 2) {
            const last = history[history.length - 1];
            const prev = history[Math.max(0, history.length - 3)];
            const dt = last.t - prev.t;
            if (dt > 0) {
                return (last.y - prev.y) / (dt / 1000);
            }
        }
        return 0;
    }

    function snapBack(velocity = 0) {
        haptics.light();
        if (overlay) {
            overlay.style.opacity = '';
        }
        activeSpring = springModal(
            content,
            { y: 0, radius: MIN_RADIUS },
            {
                stiffness: 200,
                damping: 20,
                mass: 0.8,
                // Carry the finger's velocity through the re-target — otherwise
                // the sheet freezes mid-motion at release (a velocity cliff).
                velocity,
                onFinish: () => {
                    activeSpring = null;
                },
            },
        );
    }

    function onPointerDown(e) {
        if (openSpring) {
            openSpring.stop();
            openSpring = null;
        }
        if (activeSpring) {
            activeSpring.stop();
            activeSpring = null;
        }
        const touchY = e.touches[0].clientY;
        const rect = content.getBoundingClientRect();
        const hitZone = grabber ? grabber.getBoundingClientRect().bottom : rect.top + 60;
        if (touchY > hitZone) {
            return;
        }
        startY = touchY;
        dragging = true;
        history = [{ y: touchY, t: performance.now() }];
        content.style.transition = 'none';
    }

    function onPointerMove(e) {
        if (!dragging) {
            return;
        }
        const touchY = e.touches[0].clientY;
        const delta = touchY - startY;
        if (delta < 0) {
            dragging = false;
            content.style.transition = '';
            return;
        }

        history.push({ y: touchY, t: performance.now() });
        if (history.length > 6) {
            history.shift();
        }

        const damped =
            delta > DISMISS_THRESHOLD
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
        if (!dragging) {
            return;
        }
        dragging = false;
        content.style.transition = '';

        const delta = e.changedTouches[0].clientY - startY;

        const velocity = readVelocity();

        const shouldDismiss = delta > DISMISS_THRESHOLD || velocity > FLING_VELOCITY;

        if (shouldDismiss) {
            lastDismissVelocity = velocity;
            closeModal();
        } else {
            snapBack(velocity);
        }
    }

    function onPointerCancel() {
        if (!dragging) {
            return;
        }
        dragging = false;
        content.style.transition = '';
        snapBack(readVelocity());
    }

    content.addEventListener('touchstart', onPointerDown, { passive: true });
    content.addEventListener('touchmove', onPointerMove, { passive: true });
    content.addEventListener('touchend', onPointerUp);
    content.addEventListener('touchcancel', onPointerCancel);
}
