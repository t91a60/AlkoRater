import { state } from '../app/state.js';

/** @param {boolean} show */
export function toggleSkeletons(show) {
    const container = state.el.skeletons;
    if (show) {
        container.style.display = 'block';
        container.innerHTML = Array(6).fill('<div class="skeleton-row"></div>').join('');
    } else {
        container.style.display = 'none';
    }
}
