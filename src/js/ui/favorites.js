import { state } from '../app/state.js';
import { escapeHTML } from '../utils/dom.js';
import { haptics } from './haptics.js';
import { showToast } from './toast.js';
import { updateDashboard } from './dashboard.js';
import { saveFavorites } from '../data/favorite-repo.js';
import { alcoholBadgeHTML, typeBadgeHTML } from './badges.js';

const GHOST_SVG = `
    <svg class="ghost-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z"></path>
        <circle cx="9" cy="10" r="1.2" fill="currentColor"></circle>
        <circle cx="15" cy="10" r="1.2" fill="currentColor"></circle>
    </svg>`;

const TRASH_SVG = `
    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="1.8" fill="none">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    </svg>`;

export function renderFavorites(filter = 'wszystkie') {
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
                <p class="empty-state-text">Brak ulubionych</p>
            </div>`;
        return;
    }

    container.innerHTML = list.map((fav, idx) => `
        <div id="fav-${fav.id}" class="favorite-card animate-fade-in" data-item-name="${escapeHTML(fav.item.name)}" style="animation-delay: ${idx * 30}ms">
            <div class="fav-main">
                <img src="${escapeHTML(fav.item.image_url || './icons/icon-60.png')}" loading="lazy" alt="${escapeHTML(fav.item.name)}">
                <div class="item-info">
                    <div class="item-name">${escapeHTML(fav.item.name)}${alcoholBadgeHTML(fav.item.alcohol)}</div>
                    <div class="item-meta">${escapeHTML(fav.tag)}${typeBadgeHTML(fav.item.type)}</div>
                </div>
                <div class="item-stars">★ ${escapeHTML(fav.stars)}</div>
            </div>
            <button class="delete-btn" data-delete-id="${fav.id}" aria-label="Usuń">${TRASH_SVG}</button>
        </div>
    `).join('');
}

export function filterFavorites(type) {
    haptics.light();
    document.querySelectorAll('.filter-chip').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.filter === type);
    });
    renderFavorites(type);
}

export function deleteFavorite(id) {
    haptics.light();
    const el = document.getElementById(`fav-${id}`);

    const finish = new Promise((resolve) => {
        if (el) {
            el.classList.add('slide-out-left');
            el.addEventListener('animationend', resolve, { once: true });
        }
        setTimeout(resolve, 350);
    });

    finish.then(async () => {
        state.favorites = state.favorites.filter((f) => String(f.id) !== String(id));
        await saveFavorites(state.favorites);
        const activeFilter = document.querySelector('.filter-chip.active')?.dataset.filter || 'wszystkie';
        renderFavorites(activeFilter);
        updateDashboard();
        showToast('Usunięto z ulubionych', 'warning');
        haptics.warning();
    });
}
