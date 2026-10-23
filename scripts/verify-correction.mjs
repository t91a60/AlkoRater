import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';
import { createStaticServer } from './serve.mjs';

const dir = 'docs/screenshots/correction/qa';
await mkdir(dir, { recursive: true });
const server = await createStaticServer();
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const browser = await chromium.launch();
const url = `http://127.0.0.1:${server.address().port}/AlkoRater/`;
const evidence = { contrasts: [], console: [], controls: [] };
const luminance = (rgb) =>
    rgb
        .map((v) => {
            const c = v / 255;
            return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
        })
        .reduce((s, c, i) => s + c * [0.2126, 0.7152, 0.0722][i], 0);
const contrast = (a, b) => {
    const l = [a, b]
        .map((v) =>
            luminance(
                v
                    .match(/[\d.]+/g)
                    .slice(0, 3)
                    .map(Number),
            ),
        )
        .sort((x, y) => y - x);
    return (l[0] + 0.05) / (l[1] + 0.05);
};
try {
    for (const colorScheme of ['light', 'dark']) {
        const context = await browser.newContext({
            viewport: { width: 393, height: 852 },
            colorScheme,
            reducedMotion: 'reduce',
        });
        const page = await context.newPage();
        page.on('console', (m) => {
            if (['error', 'warning'].includes(m.type())) evidence.console.push(m.text());
        });
        await page.addInitScript(() => {
            const v = new EventTarget();
            let height = innerHeight;
            Object.defineProperties(v, {
                height: { get: () => height },
                offsetTop: { value: 0 },
                scale: { value: 1 },
            });
            Object.defineProperty(window, 'visualViewport', { value: v });
            window.resizeTestViewport = (h) => {
                height = h;
                v.dispatchEvent(new Event('resize'));
            };
        });
        await page.goto(url);
        await expect(page.locator('#catalogStatus')).toContainText('336 produktów');
        const pairs = await page.evaluate(() => {
            const root = getComputedStyle(document.documentElement);
            const rgb = (token) => {
                const el = document.createElement('span');
                el.style.color = root.getPropertyValue(token);
                document.body.append(el);
                const color = getComputedStyle(el).color;
                el.remove();
                return color;
            };
            return ['--bg', '--surface-1', '--surface-2', '--surface-3'].flatMap((bg) =>
                ['--fg', '--fg-secondary', '--accent'].map((fg) => ({
                    fg,
                    bg,
                    foreground: rgb(fg),
                    background: rgb(bg),
                })),
            );
        });
        for (const pair of pairs) {
            const ratio = contrast(pair.foreground, pair.background);
            evidence.contrasts.push({ colorScheme, ...pair, ratio });
            expect(ratio).toBeGreaterThanOrEqual(4.5);
        }
        await page.getByRole('button', { name: 'Znajdź produkt' }).click();
        await page.locator('#search-input').fill('Harnaś');
        await expect(page.locator('.search-card')).toHaveCount(4);
        await page.locator('#clearSearch').click();
        await expect(page.locator('#search-input')).toHaveValue('');
        await expect(page.locator('#clearSearch')).toBeHidden();
        await page.getByRole('button', { name: 'Piwo', exact: true }).click();
        await expect(page.locator('.search-card')).toHaveCount(50);
        await page.locator('#search-input').fill('Harnaś');
        await expect(page.locator('.search-card').first()).toContainText('Harnaś');
        await page.locator('.search-card').first().click();
        await page.getByRole('radio', { name: '4 z 5', exact: true }).click();
        await page
            .locator('#note-input')
            .fill('Dane testowe: formularz przy ograniczonym visualViewport.');
        await page.evaluate(() => window.resizeTestViewport(430));
        await expect(page.locator('body')).toHaveClass(/keyboard-open/);
        await page.screenshot({ path: `${dir}/${colorScheme}-keyboard-synthetic.png` });
        const save = await page.locator('#saveButton').boundingBox();
        expect(save.y + save.height).toBeLessThanOrEqual(430);
        await page.evaluate(() => {
            window.resizeTestViewport(innerHeight);
            document.documentElement.style.fontSize = '200%';
        });
        await expect(page.locator('body')).not.toHaveClass(/keyboard-open/);
        await page.screenshot({ path: `${dir}/${colorScheme}-sheet-200.png` });
        await page.locator('#saveButton').click();
        await expect(page.getByRole('dialog')).toBeHidden();
        await page.locator('#nav-favorites').click();
        await page.screenshot({ path: `${dir}/${colorScheme}-ratings-200.png` });
        await page.locator('#nav-search').click();
        await page.screenshot({ path: `${dir}/${colorScheme}-search-200.png` });
        evidence.controls.push({
            colorScheme,
            checked: [
                'Home CTA -> Search, focus outside hidden panel',
                'query -> four results',
                'clear -> empty focused input',
                'Piwo -> 50 results',
                'result -> sheet',
                '4 stars -> enabled Save',
                'synthetic keyboard -> Save inside 430px',
                '200% sheet -> saved',
                'tabs -> preserved query and rating',
            ],
        });
        await context.close();
    }
    expect(evidence.console).toEqual([]);
    await writeFile(`${dir}/verification.json`, JSON.stringify(evidence, null, 2));
    console.log(
        JSON.stringify(
            {
                minContrast: Math.min(...evidence.contrasts.map((p) => p.ratio)),
                console: evidence.console,
                controls: evidence.controls,
            },
            null,
            2,
        ),
    );
} finally {
    await browser.close();
    server.closeAllConnections();
    await new Promise((done) => server.close(done));
}
