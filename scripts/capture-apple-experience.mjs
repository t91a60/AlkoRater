import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { cpus } from 'node:os';
import { resolve } from 'node:path';
import { chromium, expect } from '@playwright/test';
import { createStaticServer } from './serve.mjs';

const phase = process.argv[2];
if (!['before', 'after'].includes(phase)) {
    throw new Error('Use: node scripts/capture-apple-experience.mjs before|after');
}
const output = resolve('docs/screenshots/apple');
const evidence = resolve('docs/measurements/apple');
await mkdir(output, { recursive: true });
await mkdir(evidence, { recursive: true });
const server = await createStaticServer();
await new Promise((ready) => server.listen(0, '127.0.0.1', ready));
const origin = `http://127.0.0.1:${server.address().port}/AlkoRater/`;
const browser = await chromium.launch();
const errors = [];
const captures = [];

async function screenshot(page, name) {
    const file = `${phase}-${name}.png`;
    await page.screenshot({ path: resolve(output, file), animations: 'disabled' });
    captures.push(file);
}

try {
    const samples = [];
    for (let i = 0; i < 5; i++) {
        const context = await browser.newContext({
            viewport: { width: 393, height: 852 },
            colorScheme: 'dark',
            serviceWorkers: 'block',
        });
        const page = await context.newPage();
        const cdp = await context.newCDPSession(page);
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
        await page.addInitScript(() => {
            window.lab = { cls: 0, lcp: null, ready: null };
            new PerformanceObserver((list) => {
                for (const e of list.getEntries()) {
                    if (!e.hadRecentInput) window.lab.cls += e.value;
                }
            }).observe({ type: 'layout-shift', buffered: true });
            new PerformanceObserver((list) => {
                for (const e of list.getEntries()) window.lab.lcp = e.startTime;
            }).observe({ type: 'largest-contentful-paint', buffered: true });
            new MutationObserver(() => {
                if (
                    !window.lab.ready &&
                    document.querySelector('#catalogStatus')?.textContent.includes('336 produktów')
                ) {
                    window.lab.ready = performance.now();
                }
            }).observe(document, { subtree: true, childList: true, characterData: true });
        });
        await page.goto(origin);
        await page.waitForFunction(() => window.lab.ready !== null);
        await page.waitForTimeout(750);
        samples.push(
            await page.evaluate(() => ({
                ...window.lab,
                fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? null,
            })),
        );
        await context.close();
    }
    const median = (key) => samples.map((s) => s[key]).sort((a, b) => a - b)[2];
    const themes = phase === 'before' ? ['dark'] : ['dark', 'light'];
    for (const colorScheme of themes) {
        const context = await browser.newContext({
            viewport: { width: 393, height: 852 },
            isMobile: true,
            hasTouch: true,
            colorScheme,
            reducedMotion: 'reduce',
        });
        const page = await context.newPage();
        page.on('pageerror', (e) => errors.push(e.message));
        await page.goto(origin);
        await expect(page.locator('#catalogStatus')).toContainText('336 produktów');
        await page.evaluate(async () => {
            await navigator.serviceWorker.ready;
        });
        await page.reload();
        await expect(page.locator('#catalogStatus')).toContainText('336 produktów');
        await screenshot(page, `${colorScheme}-empty`);
        await page.getByRole('tab', { name: 'Szukaj', exact: true }).click();
        await screenshot(page, `${colorScheme}-discovery`);
        await page.getByRole('searchbox', { name: 'Szukaj produktu w katalogu' }).fill('Harnaś');
        const beer = page.getByRole('button', { name: 'Harnaś, Piwo, dodaj ocenę', exact: true });
        await expect(beer).toBeVisible();
        await screenshot(page, `${colorScheme}-search`);
        await beer.click();
        await page.getByRole('radio', { name: '4 z 5', exact: true }).click();
        await page
            .getByLabel('Twoja notatka (opcjonalnie)')
            .fill('Notatka testowa: wyraźny aromat, łagodny finisz.');
        await screenshot(page, `${colorScheme}-sheet`);
        await page.locator('#saveButton').click();
        await expect(page.getByRole('dialog')).toBeHidden();
        await screenshot(page, `${colorScheme}-toast`);
        await page.locator('.toast').waitFor({ state: 'detached' });
        await page.getByRole('button', { name: 'Harnaś, Wódka, dodaj ocenę', exact: true }).click();
        await page.getByRole('radio', { name: '2 z 5', exact: true }).click();
        await page
            .getByLabel('Twoja notatka (opcjonalnie)')
            .fill('Drugi produkt o tej samej nazwie. Dane testowe.');
        await page.locator('#saveButton').click();
        await expect(page.getByRole('dialog')).toBeHidden();
        await page.locator('.toast').waitFor({ state: 'detached' });
        await page.getByRole('tab', { name: 'Moje oceny', exact: true }).click();
        await screenshot(page, `${colorScheme}-collection`);
        await page.locator('.favorite-card').first().click({ button: 'right' });
        await expect(page.locator('.context-menu')).toBeVisible();
        await screenshot(page, `${colorScheme}-context`);
        await page.keyboard.press('Escape');
        await page.getByRole('tab', { name: 'Start', exact: true }).click();
        await screenshot(page, `${colorScheme}-home`);

        if (colorScheme === 'dark') {
            for (const [name, width, height] of [
                ['small', 375, 667],
                ['large', 430, 932],
                ['tablet', 834, 1112],
                ['desktop', 1440, 900],
            ]) {
                await page.setViewportSize({ width, height });
                await page.getByRole('tab', { name: 'Moje oceny', exact: true }).click();
                await page.getByRole('tab', { name: 'Start', exact: true }).click();
                await screenshot(page, name);
            }
        }
        await context.setOffline(true);
        await page.reload();
        await expect(page.locator('#catalogStatus')).toContainText('336 produktów');
        await page.getByRole('tab', { name: 'Moje oceny', exact: true }).click();
        await expect(page.locator('.favorite-card')).toHaveCount(2);
        if (phase === 'after') {
            await page.setViewportSize({ width: 393, height: 852 });
            await screenshot(page, `${colorScheme}-offline`);
        }
        await context.close();
    }

    const gallery = await browser.newPage({ viewport: { width: 1230, height: 1780 } });
    const main = [
        'dark-home',
        'dark-discovery',
        'dark-sheet',
        'dark-collection',
        ...(phase === 'after' ? ['light-home', 'light-sheet'] : ['dark-search', 'dark-context']),
    ];
    const images = await Promise.all(
        main.map(async (name) => {
            const bytes = await readFile(resolve(output, `${phase}-${name}.png`));
            return `<figure><figcaption>${phase}: ${name}</figcaption><img src="data:image/png;base64,${bytes.toString('base64')}"></figure>`;
        }),
    );
    await gallery.setContent(
        `<style>body{margin:0;padding:12px;background:#bbb;display:grid;grid-template-columns:repeat(3,1fr);gap:12px;font:16px system-ui}figure{margin:0}figcaption{height:24px}img{display:block;width:100%}</style>${images.join('')}`,
    );
    await gallery.screenshot({ path: resolve(output, `${phase}-overview.png`), fullPage: true });
    const result = {
        date: new Date().toISOString(),
        phase,
        head: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
        dirty: execFileSync('git', ['-c', 'core.safecrlf=false', 'diff', '--name-only'], {
            encoding: 'utf8',
        })
            .trim()
            .split(/\r?\n/)
            .filter(Boolean),
        browser: browser.version(),
        node: process.version,
        cpu: cpus()[0].model,
        method: 'Five cold contexts per phase, Chromium 393x852, CPU 4x, localhost unthrottled, service workers blocked for lab samples only. Screenshots and offline checks use service workers. Synthetic data only.',
        samples,
        medians: Object.fromEntries(
            ['fcp', 'ready', 'lcp', 'cls'].map((key) => [key, median(key)]),
        ),
        captures,
        pageErrors: errors,
        physicalIOS: false,
    };
    await writeFile(resolve(evidence, `${phase}.json`), `${JSON.stringify(result, null, 2)}\n`);
    expect(errors).toEqual([]);
    console.log(
        JSON.stringify(
            { medians: result.medians, screenshots: captures.length, pageErrors: errors },
            null,
            2,
        ),
    );
} finally {
    await browser.close();
    server.closeAllConnections();
    await new Promise((done) => server.close(done));
}
