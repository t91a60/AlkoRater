import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';
import { createStaticServer } from './serve.mjs';

const phase = process.argv[2] || 'after';
if (!['before', 'after'].includes(phase)) throw new Error('Expected before or after');
const dir = `docs/screenshots/correction/${process.argv[3] || phase}`;
await mkdir(dir, { recursive: true });
const server = await createStaticServer();
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const url = `http://127.0.0.1:${server.address().port}/AlkoRater/`;
const browser = await chromium.launch();
const evidence = { phase, browser: browser.version(), errors: [], geometry: [], captures: [] };
async function shot(page, name) {
    if (await page.locator('.toast').count()) {
        await page.locator('.toast').waitFor({ state: 'detached' });
    }
    await expect
        .poll(() =>
            page.evaluate(() =>
                Math.abs(
                    document.querySelector('.app-container').getBoundingClientRect().height -
                        visualViewport.height,
                ),
            ),
        )
        .toBeLessThan(2);
    if (await page.locator('.toast-dismiss').count()) await page.locator('.toast-dismiss').click();
    await page.screenshot({ path: `${dir}/${name}.png`, animations: 'disabled' });
    evidence.captures.push(name);
}
try {
    for (const colorScheme of ['dark', 'light']) {
        const context = await browser.newContext({
            viewport: { width: 393, height: 852 },
            colorScheme,
            reducedMotion: 'reduce',
            isMobile: true,
            hasTouch: true,
        });
        const page = await context.newPage();
        page.on('pageerror', (e) => evidence.errors.push(e.message));
        await page.goto(url);
        await expect(page.locator('#catalogStatus')).toContainText('336 produktów');
        await shot(page, `${colorScheme}-home-empty`);
        evidence.geometry.push(
            await page.evaluate(() => ({
                theme: matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
                height: innerHeight,
                nav: document.querySelector('.bottom-nav').getBoundingClientRect().toJSON(),
                content: document.querySelector('.content-area').getBoundingClientRect().toJSON(),
            })),
        );
        await page.locator('#nav-favorites').click();
        await shot(page, `${colorScheme}-ratings-empty`);
        await page.locator('#nav-search').click();
        await shot(page, `${colorScheme}-search-idle`);
        await page.locator('#search-input').fill('Harnaś');
        await expect(page.locator('.search-card')).toHaveCount(4);
        await shot(page, `${colorScheme}-search-results`);
        await page.locator('.search-card').first().click();
        await page.getByRole('radio', { name: '4 z 5', exact: true }).click();
        await page.locator('#note-input').fill('Notatka testowa: aromat zboża, łagodny finisz.');
        await shot(page, `${colorScheme}-sheet`);
        await page.locator('#saveButton').click();
        await expect(page.getByRole('dialog')).toBeHidden();
        await page.locator('#nav-favorites').click();
        await shot(page, `${colorScheme}-ratings-1`);
        await page.locator('#nav-start').click();
        await shot(page, `${colorScheme}-home-populated`);
        if (phase === 'after') {
            for (const count of [10, 100]) {
                await page.evaluate(async (count) => {
                    const { state } = await import('./src/js/app/state.js');
                    const { mutateFavorites } = await import('./src/js/services/storage.js');
                    state.favorites = await mutateFavorites(() => []);
                    const { createRecord, upsertFavorite } =
                        await import('./src/js/data/favorite-repo.js');
                    for (const [i, item] of state.appData.slice(0, count).entries()) {
                        await upsertFavorite(
                            state.favorites,
                            createRecord(item, {
                                stars: (i % 5) + 1,
                                note:
                                    i === 0
                                        ? 'Długa notatka testowa. '.repeat(100)
                                        : 'Dane testowe',
                            }),
                        );
                    }
                }, count);
                await page.locator('#nav-favorites').click();
                await expect(page.locator('.favorite-card')).toHaveCount(count);
                await shot(page, `${colorScheme}-ratings-${count}`);
                await page.locator('#nav-start').click();
            }
            for (const [name, width, height, scale] of [
                ['small', 320, 568, 100],
                ['large-text', 393, 852, 200],
                ['desktop', 1280, 900, 100],
            ]) {
                await page.setViewportSize({ width, height });
                await page.evaluate((scale) => {
                    document.documentElement.style.fontSize = `${scale}%`;
                }, scale);
                await shot(page, `${colorScheme}-${name}`);
            }
            await page.setViewportSize({ width: 393, height: 852 });
            await page.evaluate(() => {
                document.documentElement.style.fontSize = '';
            });
            await page.evaluate(async () => {
                await navigator.serviceWorker.ready;
            });
            await page.reload();
            await context.setOffline(true);
            await page.reload();
            await expect(page.locator('#catalogStatus')).toContainText('336 produktów');
            await page.locator('#nav-favorites').click();
            await shot(page, `${colorScheme}-offline`);
        }
        await context.close();
    }
    const gallery = await browser.newPage({ viewport: { width: 1572, height: 900 } });
    const images = await Promise.all(
        evidence.captures.map(
            async (name) =>
                `<figure><figcaption>${name}</figcaption><img src="data:image/png;base64,${(await readFile(`${dir}/${name}.png`)).toString('base64')}"></figure>`,
        ),
    );
    await gallery.setContent(
        `<style>body{margin:0;display:grid;grid-template-columns:repeat(4,1fr);background:#ccc;font:14px system-ui}figure{margin:0}img{width:100%}figcaption{padding:8px}</style>${images.join('')}`,
    );
    await gallery.screenshot({ path: `${dir}/overview.png`, fullPage: true });
    await writeFile(`${dir}/evidence.json`, JSON.stringify(evidence, null, 2));
    console.log(JSON.stringify(evidence, null, 2));
} finally {
    await browser.close();
    server.closeAllConnections();
    await new Promise((done) => server.close(done));
}
