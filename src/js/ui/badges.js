import { CONSTANTS } from '../app/constants.js';
import { escapeHTML } from '../utils/dom.js';

const TYPE_COLORS = {};
for (const key of Object.keys(CONSTANTS.BEER_TYPES)) {
    TYPE_COLORS[key] = CONSTANTS.BEER_TYPES[key].hex;
}

/** @returns {string} HTML for an alcohol percentage badge, or empty string. */
export const alcoholBadgeHTML = (alcohol) => {
    if (!alcohol) {return '';}
    const val = alcohol.includes('%') ? alcohol : `${alcohol}%`;
    return `<span class="separator">·</span><span class="alcohol-badge">${escapeHTML(val)}</span>`;
};

/** @returns {string} HTML for a colored beer-type badge, or empty string. */
export const typeBadgeHTML = (type) => {
    if (!type) {return '';}
    const hex = TYPE_COLORS[type.toLowerCase()] || '#636e72';
    return `<span class="type-badge" style="--type-color:${hex};--type-bg:${hex}22">${escapeHTML(type)}</span>`;
};
