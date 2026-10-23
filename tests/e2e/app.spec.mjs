import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const legacyRecord = {
    id: 'old-1',
    item: { id: 8, name: 'Harnaś', category: 'Piwo', alcohol: '5.8%' },
    stars: 3,
    note: 'Stara notatka',
    tag: 'Piwo',
    date: '2024-01-02T12:00:00.000Z',
};

async function start(page) {
    await page.goto('./');
    await expect(page.locator('#catalogStatus')).toContainText('336 produktów');
}

async function openRating(page, query, category = 'Piwo') {
    await page.getByRole('tab', { name: 'Szukaj', exact: true }).click();
    await page.getByRole('searchbox', { name: 'Szukaj produktu w katalogu' }).fill(query);
    const result = page
        .locator('.search-card')
        .filter({ has: page.locator('.item-meta', { hasText: category }) })
        .first();
    await result.click();
    await expect(page.getByRole('dialog')).toBeVisible();
}

async function save(page, stars, note = '') {
    await page.getByRole('radio', { name: `${stars} z 5`, exact: true }).click();
    await page.getByLabel('Twoja notatka (opcjonalnie)').fill(note);
    await page.locator('#saveButton').click();
    await expect(page.getByRole('dialog')).toBeHidden();
}

async function axe(page) {
    const result = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze();
    expect(
        result.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) })),
    ).toEqual([]);
}

test('pierwsze otwarcie, puste stany i klawiatura nawigacji', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await start(page);
    await expect(page.getByRole('heading', { name: 'Jeszcze nic nie oceniono' })).toBeVisible();
    await page.getByRole('button', { name: 'Znajdź produkt', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Kategorie' })).toBeVisible();
    await page.getByRole('tab', { name: 'Start', exact: true }).click();
    await page.getByRole('tab', { name: 'Moje oceny', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Nie masz jeszcze ocen' })).toBeVisible();
    await expect(page.locator('#collectionControls')).toBeHidden();
    await page.getByRole('button', { name: 'Znajdź produkt', exact: true }).click();
    await page.getByRole('tab', { name: 'Start', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Wszystkie oceny', exact: true })).toBeHidden();
    await page.getByRole('tab', { name: 'Start', exact: true }).click();
    await page.getByRole('tab', { name: 'Start', exact: true }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('tab', { name: 'Szukaj', exact: true })).toBeFocused();
    await expect(page.getByRole('heading', { name: 'Kategorie' })).toBeVisible();
    await page.keyboard.press('End');
    await expect(page.getByRole('tab', { name: 'Moje oceny', exact: true })).toBeFocused();
    await expect(page.getByRole('heading', { name: 'Nie masz jeszcze ocen' })).toBeVisible();
    expect(errors).toEqual([]);
});

test('ocena i notatka, edycja, wyszukanie kolekcji i prawidłowa średnia', async ({ page }) => {
    await start(page);
    await openRating(page, 'Żywiec Jasne Pełne');
    await save(page, 5, 'Cytrusowy aromat, wrócić do notatki.');
    await expect(page.locator('.search-card-rating')).toContainText('5/5');
    await page.getByRole('tab', { name: 'Start', exact: true }).click();
    expect(
        await page
            .locator('.start-rating-fill')
            .evaluate((el) => el.style.getPropertyValue('--fill')),
    ).toBe('1');
    await expect(page.locator('.collection-best')).toHaveCount(0);
    await page.locator('.recent-card').first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.recent-card').first()).toBeFocused();
    await page.getByRole('tab', { name: 'Moje oceny', exact: true }).click();
    await page.getByLabel('Znajdź w swoich ocenach').fill('cytrusowy');
    await expect(page.locator('.favorite-card')).toHaveCount(1);
    await page.locator('.fav-main').click();
    await expect(page.getByRole('radio', { name: '5 z 5' })).toHaveAttribute(
        'aria-checked',
        'true',
    );
    await save(page, 2, 'Zmieniona notatka');
    await page.getByLabel('Znajdź w swoich ocenach').fill('');
    await expect(page.locator('.favorite-card')).toHaveCount(1);
    await page.reload();
    await page.getByRole('tab', { name: 'Moje oceny', exact: true }).click();
    await expect(page.locator('.item-note')).toHaveText('Zmieniona notatka');
    await expect(page.locator('.favorite-card .item-stars')).toContainText('2/5');
});

test('produkty o tej samej nazwie nie otwierają i nie nadpisują innego produktu', async ({
    page,
}) => {
    await start(page);
    await openRating(page, 'harnas wodka', 'Wódka');
    await expect(page.locator('#modalCategoryTag')).toContainText('Wódka');
    await save(page, 2, 'Wpis dla wódki');
    await openRating(page, 'harnas piwo', 'Piwo');
    await expect(page.locator('#ratingHelp')).toHaveText('Wybierz ocenę od 1 do 5.');
    await save(page, 4, 'Wpis dla piwa');
    await page.getByRole('tab', { name: 'Moje oceny', exact: true }).click();
    await expect(page.locator('.favorite-card')).toHaveCount(2);
    await page.getByRole('button', { name: 'Wódka', exact: true }).click();
    await expect(page.locator('.item-note')).toHaveText('Wpis dla wódki');
    await page.getByRole('button', { name: 'Piwo', exact: true }).click();
    await expect(page.locator('.item-note')).toHaveText('Wpis dla piwa');
});

test('gwiazdki: kierunek, strzałki, fokus i niezapisana notatka', async ({ page }) => {
    await start(page);
    await openRating(page, 'Żywiec');
    const one = page.getByRole('radio', { name: '1 z 5' });
    const five = page.getByRole('radio', { name: '5 z 5' });
    expect((await one.boundingBox()).x).toBeLessThan((await five.boundingBox()).x);
    await one.focus();
    await page.keyboard.press('Space');
    await expect(one).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('radio', { name: '2 z 5' })).toBeFocused();
    await expect(page.getByRole('radio', { name: '2 z 5' })).toHaveAttribute(
        'aria-checked',
        'true',
    );
    await page.getByLabel('Twoja notatka (opcjonalnie)').fill('Nie zgub tego tekstu');
    page.once('dialog', (dialog) => dialog.dismiss());
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByLabel('Twoja notatka (opcjonalnie)')).toHaveValue(
        'Nie zgub tego tekstu',
    );
    page.once('dialog', (dialog) => dialog.accept());
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(page.locator('.search-card').first()).toBeFocused();
});

test('usunięcie zapisuje się przed odświeżeniem, a Cofnij przywraca osobną mutacją', async ({
    page,
}) => {
    await start(page);
    await openRating(page, 'Żywiec');
    await save(page, 3, 'Do usunięcia');
    await page.getByRole('tab', { name: 'Moje oceny', exact: true }).click();
    await expect(page.locator('.delete-btn svg')).toBeVisible();
    await page.locator('.delete-btn').click();
    await expect(page.locator('.favorite-card')).toHaveCount(0);
    await page.getByRole('button', { name: 'Cofnij', exact: true }).click();
    await expect(page.locator('.favorite-card')).toHaveCount(1);
    await page.locator('.delete-btn').click();
    await expect(page.locator('.favorite-card')).toHaveCount(0);
    await page.reload();
    await page.getByRole('tab', { name: 'Moje oceny', exact: true }).click();
    await expect(page.locator('.favorite-card')).toHaveCount(0);
});

test('pierwsza instalacja i ponowne otwarcie offline pod ścieżką GitHub Pages', async ({
    page,
    context,
}) => {
    await start(page);
    await openRating(page, 'Żywiec');
    await save(page, 4, 'Dostępna offline');
    await page.evaluate(async () => {
        await navigator.serviceWorker.ready;
    });
    await page.reload();
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
    await context.setOffline(true);
    await page.reload();
    await expect(page.locator('#catalogStatus')).toContainText('336 produktów');
    await expect(page.locator('#offlineStatus')).toContainText('offline');
    await page.getByRole('tab', { name: 'Moje oceny', exact: true }).click();
    await expect(page.locator('.item-note')).toHaveText('Dostępna offline');
    await page.locator('.fav-main').click();
    await save(page, 2, 'Zmieniona offline');
    await page.reload();
    await page.getByRole('tab', { name: 'Moje oceny', exact: true }).click();
    await expect(page.locator('.item-note')).toHaveText('Zmieniona offline');
    await context.setOffline(false);
});

test('równoległe karty: niezależne wpisy i konflikt tej samej oceny', async ({ page, context }) => {
    await start(page);
    const other = await context.newPage();
    await start(other);
    await openRating(page, 'harnas piwo');
    await openRating(other, 'harnas wodka', 'Wódka');
    await Promise.all([save(page, 3, 'Piwo'), save(other, 4, 'Wódka')]);
    await page.getByRole('tab', { name: 'Moje oceny', exact: true }).click();
    await expect(page.locator('.favorite-card')).toHaveCount(2);
    await openRating(page, 'harnas piwo');
    await openRating(other, 'harnas piwo');
    await save(page, 5, 'Nowszy wpis');
    await other.getByLabel('Twoja notatka (opcjonalnie)').fill('Nie nadpisuj nowszego');
    await other.locator('#saveButton').click();
    await expect(other.locator('#modalError')).toContainText('innej karcie');
    await expect(other.getByLabel('Twoja notatka (opcjonalnie)')).toHaveValue(
        'Nie nadpisuj nowszego',
    );
    other.once('dialog', (dialog) => dialog.accept());
    await other.keyboard.press('Escape');
});

test('migracja starego localStorage nie wskrzesza usuniętej oceny', async ({ page }) => {
    await page.addInitScript((record) => {
        if (!localStorage.getItem('migration-test-seeded')) {
            localStorage.setItem('favorites', JSON.stringify([record]));
            localStorage.setItem('migration-test-seeded', '1');
        }
    }, legacyRecord);
    await start(page);
    await page.getByRole('tab', { name: 'Moje oceny', exact: true }).click();
    await expect(page.locator('.item-note')).toHaveText('Stara notatka');
    await page.locator('.delete-btn').click();
    await expect(page.locator('.favorite-card')).toHaveCount(0);
    await page.reload();
    await page.getByRole('tab', { name: 'Moje oceny', exact: true }).click();
    await expect(page.locator('.favorite-card')).toHaveCount(0);
});

test('uszkodzony zapis nie jest pustą kolekcją i nie można go nadpisać', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('favorites', '{broken'));
    await start(page);
    await expect(page.locator('#appNotice')).toBeVisible();
    await expect(page.locator('#appNoticeText')).toContainText('Zapis jest zablokowany');
    await openRating(page, 'Żywiec');
    await page.getByRole('radio', { name: '4 z 5' }).click();
    await expect(page.locator('#saveButton')).toBeDisabled();
    expect(await page.evaluate(() => localStorage.getItem('favorites'))).toBe('{broken');
    page.once('dialog', (dialog) => dialog.accept());
    await page.keyboard.press('Escape');
    await page.getByRole('tab', { name: 'Start', exact: true }).click();
    await expect(page.locator('#librarySettings')).toHaveAttribute('open', '');
    await page.getByText('Kopia i przenoszenie danych', { exact: true }).click();
    const recoveryDownload = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Pobierz kopię odzyskiwania', exact: true }).click();
    const recoveryStream = await (await recoveryDownload).createReadStream();
    const chunks = [];
    for await (const chunk of recoveryStream) chunks.push(chunk);
    const recovery = JSON.parse(Buffer.concat(chunks).toString());
    expect(recovery.app).toBe('AlkoRater-recovery');
    expect(recovery.localStorage).toBe('{broken');
});

test('kopia JSON: pobranie, walidowany import i brak nadpisania konfliktu', async ({
    page,
    browser,
}) => {
    await start(page);
    await openRating(page, 'Żywiec');
    await save(page, 3, '<img src=x onerror=alert(1)> Prywatna notatka');
    await page.getByRole('tab', { name: 'Start', exact: true }).click();
    await page.getByText('Ustawienia i dane', { exact: true }).click();
    await page.getByText('Kopia i przenoszenie danych', { exact: true }).click();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Pobierz kopię JSON' }).click();
    const download = await downloadPromise;
    const stream = await download.createReadStream();
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const exportedBytes = Buffer.concat(chunks);
    const backup = JSON.parse(exportedBytes.toString());
    expect(backup.records[0].stars).toBe(3);
    backup.records[0].stars = 1;
    page.once('dialog', (dialog) => dialog.accept());
    await page.locator('#backupFile').setInputFiles({
        name: 'backup.json',
        mimeType: 'application/json',
        buffer: Buffer.from(JSON.stringify(backup)),
    });
    await expect(page.locator('#backupStatus')).toContainText('Dodano: 0');
    await expect(page.locator('#backupStatus')).toContainText('konflikty: 1');
    await page.getByRole('tab', { name: 'Moje oceny', exact: true }).click();
    await expect(page.locator('.favorite-card .item-stars')).toContainText('3/5');
    await expect(page.locator('.item-note')).toHaveText(
        '<img src=x onerror=alert(1)> Prywatna notatka',
    );
    await expect(page.locator('.item-note img')).toHaveCount(0);
    const restoredContext = await browser.newContext();
    try {
        const restored = await restoredContext.newPage();
        await restored.goto(page.url());
        await expect(restored.locator('#catalogStatus')).toContainText('336 produktów');
        await restored.getByRole('tab', { name: 'Start', exact: true }).click();
        await restored.getByText('Ustawienia i dane', { exact: true }).click();
        await restored.getByText('Kopia i przenoszenie danych', { exact: true }).click();
        const chooserPromise = restored.waitForEvent('filechooser');
        await restored.getByRole('button', { name: 'Wczytaj kopię', exact: true }).click();
        const chooser = await chooserPromise;
        restored.once('dialog', (dialog) => dialog.accept());
        await chooser.setFiles({
            name: 'restored.json',
            mimeType: 'application/json',
            buffer: exportedBytes,
        });
        await expect(restored.locator('#backupStatus')).toContainText('Dodano: 1');
        await restored.getByRole('tab', { name: 'Moje oceny', exact: true }).click();
        await expect(restored.locator('.favorite-card .item-stars')).toContainText('3/5');
        await expect(restored.locator('.item-note')).toHaveText(
            '<img src=x onerror=alert(1)> Prywatna notatka',
        );
    } finally {
        await restoredContext.close();
    }
});

test('dłuższa historyczna notatka nie blokuje kolekcji i nie jest skracana przy edycji oceny', async ({
    page,
}) => {
    const note = 'ą'.repeat(10001);
    await page.addInitScript(
        (record) => localStorage.setItem('favorites', JSON.stringify([record])),
        { ...legacyRecord, note },
    );
    await start(page);
    await expect(page.locator('#appNotice')).toBeHidden();
    await page.getByRole('tab', { name: 'Moje oceny', exact: true }).click();
    await page.locator('.fav-main').click();
    await expect(page.getByLabel('Twoja notatka (opcjonalnie)')).toHaveValue(note);
    await page.getByRole('radio', { name: '4 z 5' }).click();
    await page.locator('#saveButton').click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await page.reload();
    await page.getByRole('tab', { name: 'Moje oceny', exact: true }).click();
    await page.locator('.fav-main').click();
    await expect(page.getByLabel('Twoja notatka (opcjonalnie)')).toHaveValue(note);
    await expect(page.getByRole('radio', { name: '4 z 5' })).toHaveAttribute(
        'aria-checked',
        'true',
    );
});

test('wybrany tryb awaryjny localStorage pozostaje spójny po otwarciu nowej karty', async ({
    page,
    context,
}) => {
    await page.addInitScript(() =>
        Object.defineProperty(window, 'indexedDB', { value: undefined, configurable: true }),
    );
    await start(page);
    await openRating(page, 'Żywiec');
    await save(page, 4, 'Zapis w trybie awaryjnym');
    const other = await context.newPage();
    await start(other);
    await expect(other.locator('#storageStatus')).toContainText('localStorage');
    await other.getByRole('tab', { name: 'Moje oceny', exact: true }).click();
    await expect(other.locator('.item-note')).toHaveText('Zapis w trybie awaryjnym');
});

test('każda sugestia, ostatnie zapytania i menu kontekstowe mają działanie', async ({ page }) => {
    await start(page);
    await page.getByRole('tab', { name: 'Szukaj', exact: true }).click();
    for (const label of ['Piwo', 'Wódka', 'Wino', '0.0%', 'IPA', 'Lager']) {
        await page.locator('.suggestion-chip').filter({ hasText: label }).click();
        await expect(page.locator('.search-card').first()).toBeVisible();
        await page.getByRole('button', { name: 'Wyczyść wyszukiwanie' }).click();
    }
    await page.getByRole('searchbox', { name: 'Szukaj produktu w katalogu' }).fill('Żywiec');
    await page.locator('.search-card').first().click({ button: 'right' });
    await expect(page.locator('.context-menu')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.context-menu')).toHaveCount(0);
    await page.locator('.search-card').first().click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Oceń', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect
        .poll(() =>
            page.evaluate(() =>
                JSON.parse(localStorage.getItem('alkorater:recent-searches') || '[]').includes(
                    'Żywiec',
                ),
            ),
        )
        .toBe(true);
    await page.getByRole('button', { name: 'Wyczyść wyszukiwanie' }).click();
    await page.getByRole('button', { name: 'Usuń zapytanie: Żywiec', exact: true }).click();
    await expect(
        page.getByRole('button', { name: 'Usuń zapytanie: Żywiec', exact: true }),
    ).toHaveCount(0);
});

test('automatyczna dostępność całej ścieżki', async ({ page }) => {
    await start(page);
    await axe(page);
    await page.getByRole('tab', { name: 'Szukaj', exact: true }).click();
    await axe(page);
    await openRating(page, 'Żywiec');
    await axe(page);
    await save(page, 3, 'Notatka testowa');
    await page.getByRole('tab', { name: 'Moje oceny', exact: true }).click();
    await axe(page);
    await openRating(page, 'Hardys Stamp Chardonnay', 'Wino');
    await page.getByRole('radio', { name: '3 z 5' }).click();
    await axe(page);
});

test('wąski ekran, długi tekst i tekst powiększony do 200%', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await start(page);
    await openRating(page, 'Żywiec');
    await save(page, 4, 'BardzoDługaNotatkaBezSpacji'.repeat(25));
    await page.getByRole('tab', { name: 'Moje oceny', exact: true }).click();
    await page.evaluate(() => {
        document.documentElement.style.fontSize = '200%';
    });
    expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.locator('.fav-main').click();
    expect(
        await page.evaluate(
            () => document.querySelector('.modal-content').scrollWidth <= window.innerWidth,
        ),
    ).toBe(true);
    await expect(page.locator('#saveButton')).toBeVisible();
});

test('błąd zapisu zachowuje formularz, a ponowienie faktycznie zapisuje dane', async ({ page }) => {
    await start(page);
    await openRating(page, 'Żywiec');
    await page.getByRole('radio', { name: '4 z 5' }).click();
    await page.getByLabel('Twoja notatka (opcjonalnie)').fill('Nie zgub przy błędzie zapisu');
    await page.evaluate(() => {
        const put = IDBObjectStore.prototype.put;
        window.restoreTestPut = () => {
            IDBObjectStore.prototype.put = put;
        };
        IDBObjectStore.prototype.put = () => {
            throw new DOMException('Test quota', 'QuotaExceededError');
        };
    });
    await page.locator('#saveButton').click();
    await expect(page.locator('#modalError')).toContainText('Nie zapisano oceny');
    await expect(page.getByLabel('Twoja notatka (opcjonalnie)')).toHaveValue(
        'Nie zgub przy błędzie zapisu',
    );
    await page.evaluate(() => {
        window.restoreTestPut();
        delete window.restoreTestPut;
    });
    await page.locator('#saveButton').click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await page.reload();
    await page.getByRole('tab', { name: 'Moje oceny', exact: true }).click();
    await expect(page.locator('.item-note')).toHaveText('Nie zgub przy błędzie zapisu');
});

test('awaria jednego katalogu jest widoczna, oceny działają, a ponowienie przywraca komplet', async ({
    page,
}) => {
    await page.addInitScript(
        (record) => localStorage.setItem('favorites', JSON.stringify([record])),
        legacyRecord,
    );
    await page.route('**/data/wina.json', (route) =>
        route.fulfill({ status: 503, body: 'Test catalog failure' }),
    );
    await page.goto('./');
    await expect(page.locator('#appNoticeText')).toContainText('całego katalogu');
    await page.getByRole('tab', { name: 'Moje oceny', exact: true }).click();
    await expect(page.locator('.item-note')).toHaveText('Stara notatka');
    await page.unroute('**/data/wina.json');
    await page.getByRole('button', { name: 'Spróbuj ponownie', exact: true }).click();
    await expect(page.locator('#catalogStatus')).toContainText('336 produktów');
    await expect(page.locator('#appNotice')).toBeHidden();
});

test('offline działa także przy wdrożeniu w katalogu głównym', async ({ page, context }) => {
    await page.goto('http://127.0.0.1:4175/');
    await expect(page.locator('#catalogStatus')).toContainText('336 produktów');
    await page.evaluate(async () => {
        await navigator.serviceWorker.ready;
    });
    await page.reload();
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
    await context.setOffline(true);
    await page.reload();
    await expect(page.locator('#catalogStatus')).toContainText('336 produktów');
    await context.setOffline(false);
});
