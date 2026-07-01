import { state } from '../app/state.js';
import { escapeHTML } from '../utils/dom.js';
import { haptics } from './haptics.js';
import { showToast } from './toast.js';
import { updateDashboard } from './dashboard.js';
import { renderFavorites } from './favorites.js';
import { createRecord, upsertFavorite } from '../data/favorite-repo.js';
import { alcoholBadgeHTML, typeBadgeHTML } from './badges.js';

const CATEGORY_ACCENTS = {
    Piwo: { hue: '42', sat: '58', lit: '52', hex: '#d4a054' },
    Wódka: { hue: '203', sat: '88', lit: '71', hex: '#6bc5f7' },
    Wino: { hue: '346', sat: '44', lit: '51', hex: '#b84a62' },
};

function setCategoryAccent(category) {
    const accent = CATEGORY_ACCENTS[category] || { hue: '42', sat: '58', lit: '52', hex: '#d4a054' };
    const root = document.querySelector('.modal-content');
    root.style.setProperty('--modal-accent', accent.hex);
    root.style.setProperty('--modal-accent-dim', `hsla(${accent.hue}, ${accent.sat}%, ${accent.lit}%, 0.12)`);
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

/** @param {Object} item */
export function openRateModal(item) {
    haptics.light();
    state.currentItem = item;
    // Zapamiętaj aktualne query wyszukiwarki
    const searchInput = document.getElementById('search-input');
    if (searchInput) { state.lastSearchQuery = searchInput.value; }
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
    document.getElementById('modalCategoryTag').innerHTML = `Kategoria: ${escapeHTML(strictCategory)}${typeBadgeHTML(item.type)}`;
    document.getElementById('note-input').value = state.ratingConfig.note;

    setCategoryAccent(strictCategory);

    document.querySelector('.app-container').classList.add('scale-back');
    document.querySelector('.bottom-nav').classList.add('tab-bar-hidden');
    state.el.modal.style.display = 'block';

    requestAnimationFrame(() => {
        state.el.modal.classList.add('active');
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
    if (val === 5) {haptics.success();}
    renderModalState();
}

export function validateSave() {
    document.getElementById('saveButton').disabled = state.ratingConfig.stars < 1;
}

export function closeModal(instant) {
    document.querySelector('.app-container').classList.remove('scale-back');
    document.querySelector('.bottom-nav').classList.remove('tab-bar-hidden');

    if (instant) {
        state.el.modal.classList.remove('active', 'closing');
        state.el.modal.style.display = 'none';
        resetCategoryAccent();
        return;
    }

    state.el.modal.classList.add('closing');
    state.el.modal.classList.remove('active');
    setTimeout(() => {
        state.el.modal.style.display = 'none';
        state.el.modal.classList.remove('closing');
        resetCategoryAccent();
    }, 300);
}

/** Persist current rating to storage. */
export async function saveRating() {
    if (!state.currentItem) {return;}
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
    // Przywróć query wyszukiwarki jeśli user wraca do zakładki search
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
    let startY = 0;
    let dragging = false;

    content.addEventListener('touchstart', (e) => {
        const touchY = e.touches[0].clientY;
        const rect = content.getBoundingClientRect();
        if (touchY > rect.top + 60) {return;}
        startY = touchY;
        dragging = true;
    }, { passive: true });

    content.addEventListener('touchmove', (e) => {
        if (!dragging) {return;}
        const delta = e.touches[0].clientY - startY;
        if (delta < 0) {dragging = false; return;}
        content.style.transition = 'none';
        content.style.transform = `translateY(${Math.min(delta, 200)}px)`;
    }, { passive: true });

    content.addEventListener('touchend', (e) => {
        if (!dragging) {return;}
        dragging = false;
        content.style.transition = '';
        const delta = e.changedTouches[0].clientY - startY;
        if (delta > 100) {
            closeModal();
        } else {
            content.style.transform = '';
        }
    });

    content.addEventListener('touchcancel', () => {
        if (!dragging) {return;}
        dragging = false;
        content.style.transition = '';
        content.style.transform = '';
    });
}
