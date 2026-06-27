/** @param {*} str @returns {string} */
export const escapeHTML = (str) => {
    if (str === null || str === undefined || str === '') {return '';}
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

export const $ = (selector, ctx = document) => ctx.querySelector(selector);

export const $$ = (selector, ctx = document) => [...ctx.querySelectorAll(selector)];
