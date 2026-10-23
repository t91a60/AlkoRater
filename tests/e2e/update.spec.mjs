import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { test, expect } from '@playwright/test';
import { createStaticServer } from '../../scripts/serve.mjs';

async function releaseServer({ legacy = false } = {}) {
    const source = await readFile(new URL('../../service-worker.js', import.meta.url), 'utf8');
    const server = await createStaticServer();
    const serve = server.listeners('request')[0];
    let release = 'e2e-v1';
    let releaseNumber = 1;
    let broken = false;
    let probeUnavailable = false;
    let holdAsset = false;
    let releaseAsset;
    let signalPaused;
    const paused = new Promise((resolve) => {
        signalPaused = resolve;
    });
    const historical = new Map();
    server.removeAllListeners('request');
    server.on('request', (request, response) => {
        const path = request.url.split('?')[0];
        const file = path.replace(/^\/AlkoRater\//, '') || 'index.html';
        if (
            legacy &&
            release === 'e2e-v1' &&
            /^(?:index\.html|service-worker\.js|manifest\.json|data\/(?:piwa|wina|wodki)\.json|src\/(?:js\/[\w/-]+\.js|css\/style\.css))$/.test(
                file,
            )
        ) {
            if (!historical.has(file))
                historical.set(file, execFileSync('git', ['show', `e707724:${file}`]));
            const type = file.endsWith('.js')
                ? 'text/javascript'
                : file.endsWith('.css')
                  ? 'text/css'
                  : file.endsWith('.json')
                    ? 'application/json'
                    : 'text/html';
            response.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
            response.end(historical.get(file));
            return;
        }
        if (path.endsWith('/service-worker.js')) {
            if (probeUnavailable) {
                response.writeHead(503);
                response.end('Simulated offline worker probe');
                return;
            }
            response.writeHead(200, {
                'Content-Type': 'text/javascript',
                'Cache-Control': 'no-store',
            });
            response.end(
                source.replace(
                    /const CACHE_VERSION = '[^']+';/,
                    `const CACHE_VERSION = '${release}';`,
                ),
            );
        } else if (holdAsset && release === 'e2e-v3' && path.endsWith('/src/js/utils/plural.js')) {
            releaseAsset = () => serve(request, response);
            signalPaused();
        } else if (broken && path.endsWith('/src/js/utils/plural.js')) {
            response.writeHead(503);
            response.end('Simulated incomplete deployment');
        } else {
            serve(request, response);
        }
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    return {
        url: `http://127.0.0.1:${server.address().port}/AlkoRater/`,
        next: () => {
            release = `e2e-v${++releaseNumber}`;
        },
        pause: () => {
            holdAsset = true;
        },
        paused,
        resume: () => {
            holdAsset = false;
            const resume = releaseAsset;
            releaseAsset = null;
            resume?.();
        },
        fail: () => {
            broken = true;
        },
        offlineProbe: (unavailable) => {
            probeUnavailable = unavailable;
        },
        close: () =>
            new Promise((resolve) => {
                server.closeAllConnections();
                server.close(resolve);
            }),
    };
}

async function installed(page, url) {
    await page.goto(url);
    await expect(page.locator('#catalogStatus')).toContainText('336 produktów');
    await page.evaluate(async () => {
        await navigator.serviceWorker.ready;
    });
    await page.reload();
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
}

async function updateState(page) {
    return page.evaluate(async () => {
        const registration = await navigator.serviceWorker.ready;
        await registration.update();
        if (registration.waiting) return 'installed';
        const worker = registration.installing;
        if (!worker) return 'none';
        return new Promise((resolve) => {
            const check = () => {
                if (['installed', 'redundant'].includes(worker.state)) resolve(worker.state);
            };
            worker.addEventListener('statechange', check);
            check();
        });
    });
}

test('aktywacja wydania 2 nie usuwa cache równolegle instalowanego wydania 3', async ({ page }) => {
    const server = await releaseServer();
    try {
        await installed(page, server.url);
        server.next();
        expect(await updateState(page)).toBe('installed');
        server.next();
        server.pause();
        const installing = page
            .evaluate(async () => {
                const registration = await navigator.serviceWorker.ready;
                await registration.update();
                const worker = registration.installing;
                return new Promise((resolve) => {
                    const check = () => {
                        if (['installed', 'redundant'].includes(worker.state))
                            resolve(worker.state);
                    };
                    worker.addEventListener('statechange', check);
                    check();
                });
            })
            .catch(() => 'navigation');
        await server.paused;
        const reload2 = page.waitForEvent('load');
        await page.locator('#update-btn').click();
        await reload2;
        await expect(page.locator('#catalogStatus')).toContainText('336 produktów');
        await expect
            .poll(() =>
                page.evaluate(
                    () =>
                        new Promise((resolve) => {
                            const channel = new MessageChannel();
                            channel.port1.onmessage = (event) => {
                                channel.port1.close();
                                resolve(event.data.version);
                            };
                            navigator.serviceWorker.controller.postMessage(
                                { type: 'GET_VERSION' },
                                [channel.port2],
                            );
                        }),
                ),
            )
            .toBe('e2e-v2');
        server.resume();
        await installing;
        await expect(page.locator('#update-banner')).toBeVisible();
        const reload3 = page.waitForEvent('load');
        await page.locator('#update-btn').click();
        await reload3;
        await expect(page.locator('#catalogStatus')).toContainText('336 produktów');
        await expect.poll(() => page.evaluate(() => window.__SW_VERSION__)).toBe('e2e-v3');
    } finally {
        server.resume();
        await server.close();
    }
});

for (const fault of ['missing-main', 'broken-catalog']) {
    test(`naprawa cache ${fault} nie usuwa zapisanych ocen`, async ({ page, context }) => {
        const server = await releaseServer();
        try {
            await installed(page, server.url);
            await page.getByRole('tab', { name: 'Szukaj', exact: true }).click();
            await page
                .getByRole('searchbox', { name: 'Szukaj produktu w katalogu' })
                .fill('Żywiec');
            await page.locator('.search-card').first().click();
            await page.getByRole('radio', { name: '4 z 5' }).click();
            await page
                .getByLabel('Twoja notatka (opcjonalnie)')
                .fill('Nie usuwaj podczas naprawy cache');
            await page.locator('#saveButton').click();
            await expect(page.getByRole('dialog')).toBeHidden();
            await page.evaluate(async (fault) => {
                const names = await caches.keys();
                const name = names.find((name) =>
                    name.startsWith(
                        fault === 'missing-main' ? 'alko-rater-static-' : 'alko-rater-data-',
                    ),
                );
                const cache = await caches.open(name);
                if (fault === 'missing-main')
                    await cache.delete(new URL('./src/js/main.js', location.href));
                else
                    await cache.put(
                        new URL('./data/wina.json', location.href),
                        new Response('{broken', {
                            headers: { 'Content-Type': 'application/json' },
                        }),
                    );
            }, fault);
            await page.reload();
            if (fault === 'missing-main') {
                await expect(
                    page.getByRole('heading', { name: 'Odzyskiwanie aplikacji' }),
                ).toBeVisible();
                server.offlineProbe(true);
                await context.setOffline(true);
                await page
                    .getByRole('link', { name: 'Napraw pamięć offline', exact: true })
                    .click();
                await expect(page.getByText(/internetem/).first()).toBeVisible();
                await context.setOffline(false);
                server.offlineProbe(false);
                await page
                    .getByRole('link', { name: 'Napraw pamięć offline', exact: true })
                    .click();
            } else {
                await expect(page.locator('#appNotice')).toBeVisible();
                await page
                    .getByRole('link', { name: 'Napraw pamięć offline bez usuwania ocen' })
                    .click();
            }
            await expect(page.locator('#catalogStatus')).toContainText('336 produktów');
            await page.getByRole('tab', { name: 'Moje oceny', exact: true }).click();
            await expect(page.locator('.item-note')).toHaveText('Nie usuwaj podczas naprawy cache');
        } finally {
            await context.setOffline(false);
            await server.close();
        }
    });
}

test('aktualizacja nie przeładowuje innych kart i zachowuje oceny offline', async ({
    page,
    context,
}) => {
    const server = await releaseServer();
    try {
        await installed(page, server.url);
        await page.getByRole('tab', { name: 'Szukaj', exact: true }).click();
        await page.getByRole('searchbox', { name: 'Szukaj produktu w katalogu' }).fill('Żywiec');
        await page.locator('.search-card').first().click();
        await page.getByRole('radio', { name: '4 z 5' }).click();
        await page.getByLabel('Twoja notatka (opcjonalnie)').fill('Zachowana po aktualizacji');
        await page.locator('#saveButton').click();
        await expect(page.getByRole('dialog')).toBeHidden();
        const other = await context.newPage();
        await other.goto(server.url);
        await other.getByRole('tab', { name: 'Szukaj', exact: true }).click();
        await other.getByRole('searchbox', { name: 'Szukaj produktu w katalogu' }).fill('Harnaś');
        await other.locator('.search-card').first().click();
        await other.getByLabel('Twoja notatka (opcjonalnie)').fill('Szkic w drugiej karcie');
        server.next();
        expect(await updateState(page)).toBe('installed');
        await expect(page.locator('#update-banner')).toBeVisible();
        await page.getByRole('button', { name: 'Aktualizuj', exact: true }).click();
        await expect(page.locator('.update-text')).toContainText('pozostałe karty');
        await expect(other.getByLabel('Twoja notatka (opcjonalnie)')).toHaveValue(
            'Szkic w drugiej karcie',
        );
        other.once('dialog', (dialog) => dialog.accept());
        await other.keyboard.press('Escape');
        await other.close();
        const navigation = page.waitForEvent('load');
        await page.getByRole('button', { name: 'Aktualizuj', exact: true }).click();
        await navigation;
        await expect.poll(() => page.evaluate(() => window.__SW_VERSION__)).toBe('e2e-v2');
        await context.setOffline(true);
        await page.reload();
        await expect(page.locator('#catalogStatus')).toContainText('336 produktów');
        await page.getByRole('tab', { name: 'Moje oceny', exact: true }).click();
        await expect(page.locator('.item-note')).toHaveText('Zachowana po aktualizacji');
        await context.setOffline(false);
    } finally {
        await server.close();
    }
});

test('rzeczywista aktualizacja z commita 2.13.1 zachowuje ID, ocenę i notatkę', async ({
    page,
    context,
}) => {
    const server = await releaseServer({ legacy: true });
    try {
        await page.goto(server.url);
        await expect(page.locator('#dbCount')).toHaveText('336');
        await page.evaluate(async () => {
            await navigator.serviceWorker.ready;
        });
        await expect
            .poll(() =>
                page.evaluate(() => !!navigator.serviceWorker.controller).catch(() => false),
            )
            .toBe(true);
        // The historical worker reloads on its first controllerchange. A controller alone
        // is not a ready UI: wait for that reload and the restored catalog before clicking.
        await expect
            .poll(() =>
                page
                    .evaluate(() => performance.getEntriesByType('navigation')[0]?.type)
                    .catch(() => null),
            )
            .toBe('reload');
        await expect(page.locator('#dbCount')).toHaveText('336');
        await page.getByRole('tab', { name: 'Szukaj', exact: true }).click();
        await page.locator('#search-input').fill('Żywiec');
        await page.locator('.search-card').first().click();
        await page.locator('.star[data-value="4"]').click();
        await page.locator('#note-input').fill('Prawdziwy zapis wersji 2.13.1');
        await page.locator('#saveButton').click();
        await expect(page.getByRole('dialog')).toBeHidden();
        const before = await page.evaluate(async () =>
            (await import('./src/js/app/state.js')).state.favorites.map(({ id, note, stars }) => ({
                id,
                note,
                stars,
            })),
        );
        expect(before).toHaveLength(1);
        server.next();
        expect(await updateState(page)).toBe('installed');
        await expect(page.locator('#update-banner')).toBeVisible();
        const navigation = page.waitForEvent('load');
        await page.locator('#update-btn').click();
        await navigation;
        await expect(page.locator('#catalogStatus')).toContainText('336 produktów');
        const after = await page.evaluate(async () =>
            (await import('./src/js/app/state.js')).state.favorites.map(({ id, note, stars }) => ({
                id,
                note,
                stars,
            })),
        );
        expect(after).toEqual(before);
        await context.setOffline(true);
        await page.reload();
        await page.getByRole('tab', { name: 'Moje oceny', exact: true }).click();
        await expect(page.locator('.item-note')).toHaveText('Prawdziwy zapis wersji 2.13.1');
        await context.setOffline(false);
    } finally {
        await server.close();
    }
});

test('niekompletny precache odrzuca aktualizację, a poprzednia wersja działa offline', async ({
    page,
    context,
}) => {
    const server = await releaseServer();
    try {
        await installed(page, server.url);
        server.next();
        server.fail();
        expect(await updateState(page)).toBe('redundant');
        await expect(page.locator('#update-banner')).toBeHidden();
        await context.setOffline(true);
        await page.reload();
        await expect(page.locator('#catalogStatus')).toContainText('336 produktów');
        await expect.poll(() => page.evaluate(() => window.__SW_VERSION__)).toBe('e2e-v1');
        await context.setOffline(false);
    } finally {
        await server.close();
    }
});
