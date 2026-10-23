import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function start(page) {
    await page.goto('./');
    await expect(page.locator('#catalogStatus')).toContainText('336 produktów');
}

async function open(page) {
    await page.getByRole('tab', { name: 'Szukaj', exact: true }).click();
    await page.getByRole('searchbox', { name: 'Szukaj produktu w katalogu' }).fill('Harnaś');
    await page.getByRole('button', { name: 'Harnaś, Piwo, dodaj ocenę', exact: true }).click();
    await expect(page.locator('#modalClose')).toBeFocused();
}

const luminance = (rgb) =>
    rgb
        .map((value) => {
            const c = value / 255;
            return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
        })
        .reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);

function ratio(foreground, background) {
    const rgb = (s) =>
        s
            .match(/[\d.]+/g)
            .map(Number)
            .slice(0, 3);
    const values = [luminance(rgb(foreground)), luminance(rgb(background))].sort((a, b) => b - a);
    return (values[0] + 0.05) / (values[1] + 0.05);
}

for (const colorScheme of ['light', 'dark']) {
    test(`${colorScheme}: nazwy, tekst, zapis, szkło i kontrast rzeczywistych kolorów`, async ({
        page,
    }) => {
        await page.emulateMedia({ colorScheme });
        await start(page);
        const background = await page
            .locator('body')
            .evaluate((el) => getComputedStyle(el).backgroundColor);
        expect(background).toBe(colorScheme === 'light' ? 'rgb(245, 245, 243)' : 'rgb(24, 25, 27)');
        const text = await page
            .locator('.collection-intro p')
            .evaluate((el) => getComputedStyle(el).color);
        expect(ratio(text, background)).toBeGreaterThanOrEqual(4.5);
        await open(page);
        await page.getByRole('radio', { name: '4 z 5', exact: true }).click();
        const colors = await page.locator('#saveButton').evaluate((el) => {
            const style = getComputedStyle(el);
            return [style.color, style.backgroundColor];
        });
        expect(ratio(...colors)).toBeGreaterThanOrEqual(4.5);
        const metadata = await page
            .locator('#modalCategoryTag')
            .evaluate((el) => [
                getComputedStyle(el).color,
                getComputedStyle(el.closest('.modal-content')).backgroundColor,
            ]);
        expect(ratio(...metadata)).toBeGreaterThanOrEqual(4.5);
        const note = page.getByLabel('Twoja notatka (opcjonalnie)');
        await note.fill('Zaznaczenie tekstu musi pozostać czytelne.');
        await note.press('ControlOrMeta+A');
        const selection = await note.evaluate((el) => {
            const style = getComputedStyle(el, '::selection');
            return [style.color, style.backgroundColor];
        });
        expect(ratio(...selection)).toBeGreaterThanOrEqual(4.5);
        expect(
            (
                await new AxeBuilder({ page })
                    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
                    .analyze()
            ).violations,
        ).toEqual([]);
        page.once('dialog', (dialog) => dialog.accept());
        await page.keyboard.press('Escape');
        await page.getByRole('tab', { name: 'Start', exact: true }).click();
        await page.getByText('Ustawienia i dane', { exact: true }).click();
        await page.getByText('Wygląd i reakcje', { exact: true }).click();
        await page.getByLabel('Przezroczyste elementy', { exact: true }).uncheck();
        expect(
            await page
                .locator('.bottom-nav')
                .evaluate(
                    (el) =>
                        getComputedStyle(el).backdropFilter ||
                        getComputedStyle(el).webkitBackdropFilter ||
                        'none',
                ),
        ).toBe('none');
        await page.reload();
        await expect(page.locator('html')).toHaveAttribute('data-opaque-surfaces', '');
        await page.emulateMedia({ colorScheme, contrast: 'more' });
        expect(await page.evaluate(() => matchMedia('(prefers-contrast: more)').matches)).toBe(
            true,
        );
        expect(
            await page
                .locator('.bottom-nav')
                .evaluate(
                    (el) =>
                        getComputedStyle(el).backdropFilter ||
                        getComputedStyle(el).webkitBackdropFilter ||
                        'none',
                ),
        ).toBe('none');
    });
}

test('karty zachowują zapytanie, przewijanie i historię Back/Forward', async ({ page }) => {
    await start(page);
    await page.getByRole('tab', { name: 'Szukaj', exact: true }).click();
    await page.getByRole('searchbox').fill('piwo');
    await expect(page.locator('.search-card').first()).toBeVisible();
    const scroller = page.locator('.content-area');
    await scroller.evaluate((el) => {
        el.scrollTop = 300;
    });
    await page.getByRole('tab', { name: 'Moje oceny', exact: true }).click();
    await page.getByRole('tab', { name: 'Szukaj', exact: true }).click();
    await expect(page.getByRole('searchbox')).toHaveValue('piwo');
    expect(await scroller.evaluate((el) => el.scrollTop)).toBeGreaterThanOrEqual(290);
    await page.goBack();
    await expect(page.getByRole('tab', { name: 'Moje oceny', exact: true })).toHaveAttribute(
        'aria-selected',
        'true',
    );
    await page.goForward();
    await expect(page.getByRole('tab', { name: 'Szukaj', exact: true })).toHaveAttribute(
        'aria-selected',
        'true',
    );
    expect(await scroller.evaluate((el) => el.scrollTop)).toBeGreaterThanOrEqual(290);
});

test('Back chroni tekst arkusza, a po zamknięciu wraca do poprzedniej karty', async ({ page }) => {
    await start(page);
    await open(page);
    await page.getByLabel('Twoja notatka (opcjonalnie)').fill('Nie zgub przy Back.');
    page.once('dialog', (dialog) => dialog.dismiss());
    await page.goBack();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByLabel('Twoja notatka (opcjonalnie)')).toHaveValue('Nie zgub przy Back.');
    page.once('dialog', (dialog) => dialog.accept());
    await page.goBack();
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(page.getByRole('tab', { name: 'Szukaj', exact: true })).toHaveAttribute(
        'aria-selected',
        'true',
    );
    await page.goBack();
    await expect(page.getByRole('tab', { name: 'Start', exact: true })).toHaveAttribute(
        'aria-selected',
        'true',
    );
});

test('szybkie przejścia i Escape nie pozostawiają animacji ani inert', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await start(page);
    for (const label of ['Szukaj', 'Moje oceny', 'Start', 'Moje oceny', 'Szukaj']) {
        await page.getByRole('tab', { name: label, exact: true }).click();
        await expect(page.locator('.tab-view.active')).toHaveCount(1);
    }
    await page.getByRole('searchbox').fill('Harnaś');
    const result = page.getByRole('button', { name: 'Harnaś, Piwo, dodaj ocenę', exact: true });
    for (let i = 0; i < 3; i++) {
        await result.click();
        await page.keyboard.press('Escape');
        await expect(page.getByRole('dialog')).toBeHidden();
    }
    expect(await page.locator('.app-container').evaluate((el) => el.inert)).toBe(false);
    await result.click();
    await page.getByRole('radio', { name: '4 z 5', exact: true }).click();
    await page.locator('#saveButton').click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(page.locator('.search-card-rating').first()).toContainText('4/5');
    expect(errors).toEqual([]);
});

test('syntetyczny visualViewport: stopka nad klawiaturą, zoom nie jest klawiaturą', async ({
    page,
}) => {
    await page.addInitScript(() => {
        const viewport = new EventTarget();
        let height = window.innerHeight;
        let top = 0;
        let scale = 1;
        Object.defineProperties(viewport, {
            height: { get: () => height },
            offsetTop: { get: () => top },
            scale: { get: () => scale },
        });
        Object.defineProperty(window, 'visualViewport', { value: viewport });
        window.testViewport = (h, t, s) => {
            height = h;
            top = t;
            scale = s;
            viewport.dispatchEvent(new Event('resize'));
        };
    });
    await start(page);
    await open(page);
    const note = page.getByLabel('Twoja notatka (opcjonalnie)');
    await note.fill('Notatka testowa przy zmniejszonym widoku.');
    await page.evaluate(() => window.testViewport(360, 80, 1));
    await expect(page.locator('body')).toHaveClass(/keyboard-open/);
    await expect(page.locator('.bottom-nav')).toBeHidden();
    await expect
        .poll(() =>
            note.evaluate((el) => {
                const field = el.getBoundingClientRect();
                const body = el.closest('.sheet-body').getBoundingClientRect();
                return field.top >= body.top - 1 && field.bottom <= body.bottom + 1;
            }),
        )
        .toBe(true);
    const box = await page.locator('#saveButton').boundingBox();
    expect(box.y).toBeGreaterThanOrEqual(80);
    expect(box.y + box.height).toBeLessThanOrEqual(441);
    await page.evaluate(() => window.testViewport(360, 80, 2));
    await expect(page.locator('body')).not.toHaveClass(/keyboard-open/);
    await page.evaluate(() => window.testViewport(window.innerHeight, 0, 1));
    const fullHeight = await page.evaluate(() => `${window.innerHeight}px`);
    await expect
        .poll(() =>
            page.locator('html').evaluate((el) => el.style.getPropertyValue('--window-height')),
        )
        .toBe(fullHeight);
    await page.getByRole('radio', { name: '3 z 5', exact: true }).click();
    await page.locator('#saveButton').click();
    await expect(page.getByRole('dialog')).toBeHidden();
});

test('syntetyczny gest: notatka nie uruchamia drag, odmowa wraca na miejsce', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await start(page);
    await open(page);
    await page.getByLabel('Twoja notatka (opcjonalnie)').fill('Zachowaj tekst po geście.');
    const gesture = async (selector, distance) =>
        page.evaluate(
            ({ selector, distance }) => {
                const el = document.querySelector(selector);
                const y = el.getBoundingClientRect().top + 8;
                for (const [type, clientY] of [
                    ['touchstart', y],
                    ['touchmove', y + distance],
                    ['touchend', y + distance],
                ]) {
                    const e = new Event(type, { bubbles: true, cancelable: true });
                    Object.defineProperty(e, 'touches', { value: [{ clientY }] });
                    Object.defineProperty(e, 'changedTouches', { value: [{ clientY }] });
                    el.dispatchEvent(e);
                }
            },
            { selector, distance },
        );
    let dialogs = 0;
    const refuse = async (dialog) => {
        dialogs++;
        await dialog.dismiss();
    };
    page.on('dialog', refuse);
    await gesture('#note-input', 140);
    expect(dialogs).toBe(0);
    await gesture('.modal-grabber', 140);
    await expect.poll(() => dialogs).toBe(1);
    await expect
        .poll(() =>
            page
                .locator('.modal-content')
                .evaluate((el) =>
                    Math.abs(new DOMMatrixReadOnly(getComputedStyle(el).transform).m42),
                ),
        )
        .toBeLessThan(0.1);
    await expect(page.getByLabel('Twoja notatka (opcjonalnie)')).toHaveValue(
        'Zachowaj tekst po geście.',
    );
    page.off('dialog', refuse);
    page.once('dialog', (dialog) => dialog.accept());
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
});

test('Cofnij nie znika po czterech sekundach, menu działa z klawiatury', async ({ page }) => {
    await start(page);
    await open(page);
    await page.getByRole('radio', { name: '4 z 5', exact: true }).click();
    await page.locator('#saveButton').click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await page.getByRole('tab', { name: 'Moje oceny', exact: true }).click();
    await page.locator('.favorite-card').click({ button: 'right' });
    await expect(page.getByRole('menu')).toBeVisible();
    await page.keyboard.press('End');
    await expect(page.getByRole('menuitem', { name: 'Usuń', exact: true })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('.favorite-card')).toHaveCount(0);
    await page.waitForTimeout(4300);
    await page.getByRole('button', { name: 'Cofnij', exact: true }).click();
    await expect(page.locator('.favorite-card')).toHaveCount(1);
    await page.locator('.delete-btn').click();
    await page.getByRole('button', { name: 'Zamknij powiadomienie', exact: true }).click();
    await expect(page.locator('.toast')).toHaveCount(0);
});

test('jasny mały widok 200%, długa nazwa i reduced motion', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 320, height: 568 });
    await start(page);
    await page.getByRole('tab', { name: 'Szukaj', exact: true }).click();
    await page.getByRole('searchbox').fill('santa rita');
    await page.locator('.search-card').first().click();
    await page.getByRole('radio', { name: '4 z 5', exact: true }).click();
    await page.evaluate(() => {
        document.documentElement.style.fontSize = '200%';
    });
    await expect(page.locator('#saveButton')).toBeVisible();
    expect(
        await page.evaluate(
            () =>
                document.documentElement.scrollWidth <= innerWidth &&
                document.querySelector('.modal-content').scrollWidth <= innerWidth,
        ),
    ).toBe(true);
    expect(
        await page
            .locator('.star svg')
            .first()
            .evaluate((el) => getComputedStyle(el).transitionDuration),
    ).toBe('0s');
    expect(
        (
            await new AxeBuilder({ page })
                .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
                .analyze()
        ).violations,
    ).toEqual([]);
});

test('HIG: pojedynczy wynik ma widoczny fokus, etykiety 200% nie nachodzą', async ({ page }) => {
    await start(page);
    await page.getByRole('tab', { name: 'Szukaj', exact: true }).click();
    const field = page.getByRole('searchbox');
    await field.fill('Harnaś Mocne');
    const result = page.locator('.search-card');
    await expect(result).toHaveCount(1);
    const withoutFocus = await result.screenshot();
    await field.focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await expect(result).toBeFocused();
    const focused = await result.screenshot();
    expect(focused.equals(withoutFocus)).toBe(false);
    expect(await result.evaluate((el) => getComputedStyle(el).outlineWidth)).toBe('3px');
    await result.click();
    await page.getByRole('radio', { name: '4 z 5', exact: true }).click();
    await page.locator('#saveButton').click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await page.getByRole('tab', { name: 'Moje oceny', exact: true }).click();
    await page.evaluate(() => {
        document.documentElement.style.fontSize = '200%';
    });
    for (const width of [320, 393]) {
        await page.setViewportSize({ width, height: 852 });
        const fits = await page.locator('.filter-chip').evaluateAll((buttons) =>
            buttons.every((button, index) => {
                const box = button.getBoundingClientRect();
                return (
                    button.scrollWidth <= button.clientWidth &&
                    buttons.slice(index + 1).every((other) => {
                        const next = other.getBoundingClientRect();
                        return (
                            Math.min(box.right, next.right) <= Math.max(box.left, next.left) ||
                            Math.min(box.bottom, next.bottom) <= Math.max(box.top, next.top)
                        );
                    })
                );
            }),
        );
        expect(fits).toBe(true);
    }
});

test('HIG: Forward odtwarza właściwy produkt, nie odrzuconą notatkę', async ({ page }) => {
    await start(page);
    await page.getByRole('tab', { name: 'Szukaj', exact: true }).click();
    await page.getByRole('searchbox').fill('Harnaś');
    await page.getByRole('button', { name: 'Harnaś, Wódka, dodaj ocenę', exact: true }).click();
    await page.getByLabel('Twoja notatka (opcjonalnie)').fill('Ten tekst świadomie odrzucam.');
    page.once('dialog', (dialog) => dialog.accept());
    await page.goBack();
    await expect(page.getByRole('dialog')).toBeHidden();
    const length = await page.evaluate(() => history.length);
    await page.goForward();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.locator('#modalCategoryTag')).toContainText('Wódka');
    await expect(page.getByLabel('Twoja notatka (opcjonalnie)')).toHaveValue('');
    expect(await page.evaluate(() => history.length)).toBe(length);
    expect(await page.evaluate(() => history.state.alkoraterProduct)).toBe('vodka:vodka-152');
    expect(await page.locator('.app-container').evaluate((el) => el.inert)).toBe(true);
});

test('Anti-Slop: wpis przed podsumowaniem i rozróżnialny wyróżniony produkt', async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 852 });
    await start(page);
    await open(page);
    await page.getByRole('radio', { name: '4 z 5', exact: true }).click();
    await page.locator('#saveButton').click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await page.getByRole('tab', { name: 'Start', exact: true }).click();
    const first = await page.locator('.recent-card').first().boundingBox();
    const nav = await page.locator('.bottom-nav').boundingBox();
    const details = await page.locator('#collectionDetails').boundingBox();
    expect(first.y + first.height).toBeLessThan(nav.y);
    expect(first.y).toBeLessThan(details.y);
    await expect(page.locator('.collection-best')).toHaveCount(0);
    await expect(page.locator('.recent-card').first()).toContainText('Piwo');
    await expect(page.locator('.recent-card').first()).toContainText('5,8%');
});
