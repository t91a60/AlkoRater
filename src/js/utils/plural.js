/**
 * Polska odmiana rzeczownika po liczebniku: 1 -> forms[0], 2-4 (ale nie 12-14)
 * -> forms[1], reszta (5+, 0, 11-14...) -> forms[2].
 * @param {number} n
 * @param {[string, string, string]} forms
 * @returns {string}
 */
export function plPlural(n, [one, few, many]) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (n === 1) {
        return one;
    }
    if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) {
        return few;
    }
    return many;
}
