import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const count of [0, 1, 10, 100]) {
    test(`kolekcja ${count}: kontrolki, sortowanie, długi tekst i brak zdjęcia`, async ({
        page,
    }) => {
        await page.goto('./');
        await expect(page.locator('#catalogStatus')).toContainText('336 produktów');
        await page.evaluate(async (count) => {
            const { state, setFavorites } = await import('./src/js/app/state.js');
            const { createRecord } = await import('./src/js/data/favorite-repo.js');
            const { mutateFavorites } = await import('./src/js/services/storage.js');
            const records = state.appData.slice(0, count).map((item, i) =>
                createRecord(
                    {
                        ...item,
                        name:
                            i === 0
                                ? `${item.name} ${'Długa nazwa testowa '.repeat(8)}`
                                : item.name,
                        image_url: '',
                    },
                    {
                        stars: (i % 5) + 1,
                        note: i === 0 ? 'Długa notatka testowa. '.repeat(300) : 'Dane testowe',
                    },
                ),
            );
            setFavorites(await mutateFavorites(() => records));
        }, count);
        await page.locator('#nav-favorites').click();
        await expect(page.locator('.favorite-card')).toHaveCount(count);
        if (!count) {
            await expect(page.locator('#collectionControls')).toBeHidden();
            await expect(page.getByRole('button', { name: 'Znajdź produkt' })).toBeVisible();
            return;
        }
        await expect(page.locator('#collectionControls')).toBeVisible();
        await page.locator('#favorites-sort').selectOption('rating');
        const scores = await page.locator('.item-stars').allTextContents();
        expect(scores.map(Number.parseFloat)).toEqual(
            scores.map(Number.parseFloat).sort((a, b) => b - a),
        );
        await page.locator('#favorites-search').fill('Długa nazwa testowa');
        await expect(page.locator('.favorite-card')).toHaveCount(1);
        await page.locator('.fav-main').click();
        await expect(page.locator('#note-input')).toHaveValue(
            'Długa notatka testowa. '.repeat(300),
        );
        await page.locator('#modalClose').click();
        await expect(page.locator('.fav-main')).toBeFocused();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
            true,
        );
        expect(
            (
                await new AxeBuilder({ page })
                    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
                    .analyze()
            ).violations,
        ).toEqual([]);
    });
}

test('CTA nie ukrywa fokusu; pasek nie przykrywa treści po zmianie rozmiaru i skali tekstu', async ({
    page,
}) => {
    const warnings = [];
    page.on('console', (message) => {
        if (['error', 'warning'].includes(message.type())) warnings.push(message.text());
    });
    await page.goto('./');
    // WebKit touch clicks do not necessarily focus buttons. Exercise the keyboard-owned CTA path explicitly.
    await page.getByRole('button', { name: 'Znajdź produkt' }).focus();
    await page.getByRole('button', { name: 'Znajdź produkt' }).press('Enter');
    await expect(page.locator('#nav-search')).toBeFocused();
    await page.locator('#nav-favorites').click();
    await page.getByRole('button', { name: 'Znajdź produkt' }).click();
    for (const width of [320, 393]) {
        await page.setViewportSize({ width, height: 852 });
        await page.evaluate(() => {
            document.documentElement.style.fontSize = '200%';
        });
        await expect
            .poll(() =>
                page.evaluate(() => {
                    const nav = document.querySelector('.bottom-nav').getBoundingClientRect();
                    const content = document.querySelector('.content-area').getBoundingClientRect();
                    return (
                        Math.abs(nav.bottom - visualViewport.height) < 2 &&
                        content.bottom <= nav.top
                    );
                }),
            )
            .toBe(true);
    }
    expect(warnings).toEqual([]);
});
