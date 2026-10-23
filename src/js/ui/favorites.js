import { state } from '../app/state.js';
import { escapeHTML } from '../utils/dom.js';
import { showToast } from './toast.js';
import { updateDashboard } from './dashboard.js';
import { removeFavorite, restoreFavorite } from '../data/favorite-repo.js';
import { productKey, normalizeSearchText } from '../data/product.js';
import { alcoholBadgeHTML, typeBadgeHTML, productThumbHTML } from './badges.js';
import { createIcons } from './icons.js';

export function renderFavorites(filter = 'wszystkie') {
    document
        .getElementById('collectionControls')
        ?.toggleAttribute('hidden', !state.favorites.length || !!state.storageError);
    const query = normalizeSearchText(document.getElementById('favorites-search')?.value || '');
    const activeFilter = (filter || 'wszystkie').toLowerCase();
    const list = state.favorites.filter(
        (f) =>
            (activeFilter === 'wszystkie' || f.tag.toLowerCase() === activeFilter) &&
            normalizeSearchText([f.item.name, f.item.brand, f.note].join(' ')).includes(query),
    );
    const container = state.el.favoritesList;
    const sort = document.getElementById('favorites-sort')?.value;
    if (sort === 'rating') {
        list.sort((a, b) => b.stars - a.stars);
    }
    if (sort === 'name') {
        list.sort((a, b) => a.item.name.localeCompare(b.item.name, 'pl'));
    }
    if (state.storageError) {
        container.innerHTML =
            '<p class="empty-copy">Nie można odczytać zapisanych ocen. Wróć na Start, aby spróbować ponownie lub pobrać kopię odzyskiwania. Dane nie zostały usunięte.</p>';
        return;
    }
    if (!list.length) {
        container.innerHTML = state.favorites.length
            ? '<p class="empty-copy">Brak ocen pasujących do filtrów. Zmień kategorię lub wpisaną nazwę.</p>'
            : '<div class="collection-empty"><h2>Nie masz jeszcze ocen</h2><p>Ocenione produkty i notatki pojawią się tutaj.</p><button class="action-btn primary" data-action="open-search">Znajdź produkt</button></div>';
        return;
    }
    container.innerHTML = list
        .map(
            (fav, index) => `
        <div id="fav-${escapeHTML(fav.id)}" class="favorite-card" data-item-id="${escapeHTML(productKey(fav.item))}">
            <button class="fav-main" aria-label="${escapeHTML(`Edytuj: ${fav.item.name}, ${fav.tag}, ocena ${fav.stars} z 5`)}" ${fav.note ? `aria-describedby="favorite-note-${index}"` : ''}>
                ${productThumbHTML(fav.item.image_url, fav.tag, 48)}
                <span class="item-info">
                    <span class="item-name">${escapeHTML(fav.item.name)}${alcoholBadgeHTML(fav.item.alcohol)}</span>
                    <span class="item-meta">${escapeHTML(fav.tag)}${typeBadgeHTML(fav.item.type)}</span>
                    ${fav.note ? `<span class="item-note" id="favorite-note-${index}">${escapeHTML(fav.note.slice(0, 180))}${fav.note.length > 180 ? '…' : ''}</span>` : ''}
                </span>
                <span class="item-stars">${fav.stars}/5</span>
            </button>
            <button class="delete-btn" data-delete-id="${escapeHTML(fav.id)}" aria-label="${escapeHTML(`Usuń ocenę: ${fav.item.name}`)}"><i data-lucide="trash-2" aria-hidden="true"></i></button>
        </div>
    `,
        )
        .join('');
    createIcons();
}

export function filterFavorites(type) {
    document.querySelectorAll('.filter-chip').forEach((btn) => {
        const active = btn.dataset.filter === type;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-pressed', String(active));
    });
    renderFavorites(type);
}

export async function deleteFavorite(id) {
    if (!state.storageReady) {
        return;
    }
    const record = state.favorites.find((f) => f.id === String(id));
    if (!record) {
        return;
    }
    const filter = document.querySelector('.filter-chip.active')?.dataset.filter;
    const button = document.getElementById(`fav-${id}`)?.querySelector('.delete-btn');
    if (button) {
        button.disabled = true;
    }
    try {
        await removeFavorite(record);
        renderFavorites(filter);
        updateDashboard();
        const focusTarget = state.favorites.length
            ? document.getElementById('favorites-search')
            : containerSearchButton();
        focusTarget?.focus({ preventScroll: true });
        showToast('Usunięto ocenę', 'warning', {
            onUndo: async () => {
                try {
                    await restoreFavorite(record);
                    renderFavorites(filter);
                    updateDashboard();
                    showToast('Przywrócono ocenę', 'success');
                } catch (error) {
                    showToast(error.message, 'warning');
                }
            },
        });
    } catch (error) {
        showToast(`Nie usunięto oceny. ${error.message}`, 'warning');
        if (button) {
            button.disabled = false;
        }
    }
}

function containerSearchButton() {
    return state.el.favoritesList.querySelector('[data-action="open-search"]');
}
