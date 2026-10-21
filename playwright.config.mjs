import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests/e2e',
    fullyParallel: false,
    workers: 2,
    timeout: 30000,
    expect: { timeout: 10000 },
    reporter: [['list'], ['html', { open: 'never' }]],
    use: {
        baseURL: 'http://127.0.0.1:4175/AlkoRater/',
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        reducedMotion: 'reduce',
    },
    projects: [
        {
            name: 'chromium',
            use: {
                browserName: 'chromium',
                viewport: { width: 390, height: 844 },
                isMobile: true,
                hasTouch: true,
            },
        },
        {
            name: 'chromium-desktop',
            use: { browserName: 'chromium', viewport: { width: 1366, height: 900 } },
        },
        { name: 'webkit', use: { ...devices['iPhone 13'], browserName: 'webkit' } },
        { name: 'firefox', use: { browserName: 'firefox', viewport: { width: 390, height: 844 } } },
    ],
    webServer: {
        command: 'node scripts/serve.mjs --port 4175',
        url: 'http://127.0.0.1:4175/AlkoRater/',
        reuseExistingServer: !process.env.CI,
    },
});
