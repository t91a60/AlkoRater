import { escapeHTML } from '../utils/dom.js';

const TOAST_ICONS = {
    success:
        '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    update: '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36"/></svg>',
    warning:
        '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
};

/**
 * @param {string} msg
 * @param {'success'|'update'|'warning'} type
 * @param {{ onUndo?: Function, undoLabel?: string }} [opts]
 */
export function showToast(msg, type, opts = {}) {
    const existing = document.querySelector('.toast');
    if (existing) {
        existing._undoCancelled = true;
        existing.classList.remove('visible');
        existing.remove();
    }

    const t = document.createElement('div');
    t.className = 'toast';
    t.dataset.type = type;
    t.setAttribute('role', 'status');
    t.setAttribute('aria-live', 'polite');

    const undoLabel = opts.undoLabel || 'Cofnij';
    const hasUndo = typeof opts.onUndo === 'function';

    t.innerHTML = `
        ${TOAST_ICONS[type] || ''}
        <span>${escapeHTML(msg)}</span>
        ${hasUndo ? `<button class="toast-undo-btn">${escapeHTML(undoLabel)}</button>` : ''}
        ${hasUndo ? '<button class="toast-dismiss" aria-label="Zamknij powiadomienie"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 6 12 12M18 6 6 18"/></svg></button>' : ''}
    `;
    t.style.display = 'flex';
    t.style.alignItems = 'center';
    t.style.gap = '8px';
    document.body.appendChild(t);
    t.offsetHeight;
    t.classList.add('visible');

    const dismiss = () => {
        if (t._undoCancelled) {
            return;
        }
        t.classList.remove('visible');
        t.classList.add('closing');
        t.inert = true;
        setTimeout(() => t.remove(), 250);
    };

    const timeoutId = hasUndo ? null : setTimeout(dismiss, 2200);

    if (hasUndo) {
        t.querySelector('.toast-dismiss').addEventListener('click', dismiss);
        t.querySelector('.toast-undo-btn').addEventListener('click', () => {
            clearTimeout(timeoutId);
            t._undoCancelled = true;
            opts.onUndo();
            t.classList.remove('visible');
            t.classList.add('closing');
            t.inert = true;
            setTimeout(() => t.remove(), 250);
        });
    }
}
