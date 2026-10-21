// @vitest-environment node

import { readFileSync, readdirSync } from 'node:fs';
import { URL } from 'node:url';
import { runInNewContext } from 'node:vm';
import { JSDOM } from 'jsdom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const workerSource = readFileSync(
    new URL('../../../../service-worker.js', import.meta.url),
    'utf8',
);
const clientSource = readFileSync(new URL('../sw-service.js', import.meta.url), 'utf8');
const testDocument = new JSDOM().window.document;
const ORIGIN = 'https://example.test';
const VERSION = 'v8.1-apple-rc3';
const cacheName = (kind, scope = '/AlkoRater/') =>
    `alko-rater-${kind}-${encodeURIComponent(scope)}-${VERSION}`;
const requestURL = (request) => (typeof request === 'string' ? request : request.url);

function createCacheStorage(fetchResponse) {
    const stores = new Map();
    return {
        stores,
        open: vi.fn(async (name) => {
            if (!stores.has(name)) {
                const entries = new Map();
                stores.set(name, {
                    entries,
                    keys: vi.fn(async () => [...entries.keys()].map((url) => new Request(url))),
                    addAll: vi.fn(async (requests) => {
                        const responses = await Promise.all(
                            requests.map(async (request) => {
                                const response = await fetchResponse(request);
                                if (!response.ok) {
                                    throw new TypeError(`Precache failed: ${request.url}`);
                                }
                                return [request.url, response];
                            }),
                        );
                        responses.forEach(([url, response]) => entries.set(url, response));
                    }),
                    match: vi.fn(async (request) => entries.get(requestURL(request))?.clone()),
                    put: vi.fn(async (request, response) => {
                        entries.set(requestURL(request), response);
                    }),
                    delete: vi.fn(async (request) => entries.delete(requestURL(request))),
                });
            }
            return stores.get(name);
        }),
        keys: vi.fn(async () => [...stores.keys()]),
        delete: vi.fn(async (name) => stores.delete(name)),
        match: vi.fn(async (request) => {
            for (const cache of stores.values()) {
                const response = await cache.match(request);
                if (response) {
                    return response;
                }
            }
        }),
    };
}

function createWorker({ scope = '/AlkoRater/', failPath } = {}) {
    const listeners = new Map();
    const fetchMock = vi.fn(async (request) => {
        const path = new URL(requestURL(request)).pathname;
        return new Response(`snapshot:${path}`, { status: path === failPath ? 404 : 200 });
    });
    const caches = createCacheStorage(fetchMock);
    const client = { id: 'current-tab', url: `${ORIGIN}${scope}` };
    const self = {
        registration: { scope: `${ORIGIN}${scope}`, unregister: vi.fn(async () => true) },
        location: new URL(`${ORIGIN}${scope}service-worker.js`),
        addEventListener: (type, handler) => {
            if (!listeners.has(type)) {
                listeners.set(type, []);
            }
            listeners.get(type).push(handler);
        },
        skipWaiting: vi.fn(async () => {}),
        clients: {
            matchAll: vi.fn(async () => [client]),
            claim: vi.fn(async () => {}),
        },
    };
    runInNewContext(workerSource, { self, caches, fetch: fetchMock, Request, Response, URL });

    const dispatch = (type, details = {}) => {
        const pending = [];
        let response;
        const event = {
            ...details,
            waitUntil: vi.fn((promise) => pending.push(promise)),
            respondWith: vi.fn((promise) => {
                response = Promise.resolve(promise);
            }),
        };
        for (const handler of listeners.get(type) || []) {
            handler(event);
        }
        return { event, response, done: Promise.all(pending) };
    };
    const fetchRequest = (path, { mode = 'cors', method = 'GET', accept = '' } = {}) =>
        dispatch('fetch', {
            request: {
                url: new URL(path, `${ORIGIN}${scope}`).href,
                method,
                mode,
                headers: new Headers({ accept }),
            },
        });

    return { self, caches, client, fetchMock, dispatch, fetchRequest };
}

describe('service worker snapshots', () => {
    it('awaits the full scoped shell and catalog before installation succeeds', async () => {
        const worker = createWorker();
        const install = worker.dispatch('install');
        expect(install.event.waitUntil).toHaveBeenCalledOnce();
        await install.done;

        const shell = worker.caches.stores.get(cacheName('static'));
        const data = worker.caches.stores.get(cacheName('data'));
        expect([...shell.entries.keys()]).toEqual(
            expect.arrayContaining([
                `${ORIGIN}/AlkoRater/index.html`,
                `${ORIGIN}/AlkoRater/src/js/data/product.js`,
                `${ORIGIN}/AlkoRater/src/js/data/records.js`,
                `${ORIGIN}/AlkoRater/src/js/services/backup.js`,
                `${ORIGIN}/AlkoRater/src/js/ui/backup.js`,
            ]),
        );
        expect([...data.entries.keys()]).toEqual([
            `${ORIGIN}/AlkoRater/data/piwa.json`,
            `${ORIGIN}/AlkoRater/data/wodki.json`,
            `${ORIGIN}/AlkoRater/data/wina.json`,
        ]);
        expect(worker.fetchMock.mock.calls.every(([request]) => request.cache === 'reload')).toBe(
            true,
        );
        expect(worker.self.skipWaiting).not.toHaveBeenCalled();
        expect(worker.self.clients.claim).not.toHaveBeenCalled();
    });

    it.each(['src/js/data/records.js', 'data/wina.json'])(
        'rejects installation when the required %s cannot be precached',
        async (path) => {
            const worker = createWorker({ failPath: `/AlkoRater/${path}` });
            await expect(worker.dispatch('install').done).rejects.toThrow('Precache failed');
            expect(worker.self.skipWaiting).not.toHaveBeenCalled();
            expect(worker.self.clients.claim).not.toHaveBeenCalled();
        },
    );

    it('includes every production JavaScript module in the offline shell', async () => {
        const worker = createWorker();
        await worker.dispatch('install').done;
        const modules = readdirSync(new URL('../../', import.meta.url), { recursive: true })
            .map((path) => path.replaceAll('\\', '/'))
            .filter((path) => path.endsWith('.js') && !path.includes('__tests__/'));
        const shell = worker.caches.stores.get(cacheName('static'));
        expect([...shell.entries.keys()]).toEqual(
            expect.arrayContaining(modules.map((path) => `${ORIGIN}/AlkoRater/src/js/${path}`)),
        );
    });

    it('rejects installation if cache storage is unavailable', async () => {
        const worker = createWorker();
        worker.caches.open.mockRejectedValue(new Error('quota exceeded'));
        await expect(worker.dispatch('install').done).rejects.toThrow('quota exceeded');
    });

    it('never deletes foreign or previous-generation caches or claims existing tabs', async () => {
        const worker = createWorker();
        const names = ['another-app-v12.3', 'alko-rater-static-v7.10', 'alko-rater-data-v7.10'];
        for (const name of names) {
            await worker.caches.open(name);
        }
        await worker.dispatch('install').done;
        await worker.dispatch('activate').done;

        expect(await worker.caches.keys()).toEqual(expect.arrayContaining(names));
        expect(worker.caches.delete).not.toHaveBeenCalled();
        expect(worker.self.clients.claim).not.toHaveBeenCalled();
    });

    it('bounds scoped snapshots to the current and previous generation', async () => {
        const worker = createWorker();
        const metadata = await worker.caches.open('alko-rater-release-%2FAlkoRater%2F');
        await metadata.put(`${ORIGIN}/AlkoRater/.alkorater-active-release`, new Response('v7.9'));
        for (const kind of ['static', 'data']) {
            for (const version of ['v7.8', 'v7.9']) {
                await worker.caches.open(`alko-rater-${kind}-%2FAlkoRater%2F-${version}`);
            }
        }
        await worker.caches.open('alko-rater-static-%2FAnotherApp%2F-v1');
        await worker.dispatch('install').done;
        await worker.dispatch('activate').done;
        const names = await worker.caches.keys();
        expect(names).not.toContain('alko-rater-static-%2FAlkoRater%2F-v7.8');
        expect(names).not.toContain('alko-rater-data-%2FAlkoRater%2F-v7.8');
        expect(names).toContain('alko-rater-static-%2FAlkoRater%2F-v7.9');
        expect(names).toContain('alko-rater-static-%2FAnotherApp%2F-v1');
        expect(names).toContain(cacheName('static'));
    });

    it('does not delete snapshots belonging to a concurrent newer installation', async () => {
        const worker = createWorker();
        const metadata = await worker.caches.open('alko-rater-release-%2FAlkoRater%2F');
        await metadata.put(`${ORIGIN}/AlkoRater/.alkorater-active-release`, new Response('v7.9'));
        await worker.dispatch('install').done;
        const future = [
            'alko-rater-static-%2FAlkoRater%2F-v8.1',
            'alko-rater-data-%2FAlkoRater%2F-v8.1',
        ];
        for (const name of future) {
            await worker.caches.open(name);
        }
        await worker.dispatch('activate').done;
        expect(await worker.caches.keys()).toEqual(expect.arrayContaining(future));
    });

    it('removes both of its own snapshots after failed installation, never the active release', async () => {
        const worker = createWorker({ failPath: '/AlkoRater/data/wina.json' });
        await worker.caches.open('alko-rater-static-%2FAlkoRater%2F-v7.9');
        await expect(worker.dispatch('install').done).rejects.toThrow('Precache failed');
        const names = await worker.caches.keys();
        expect(names).not.toContain(cacheName('static'));
        expect(names).not.toContain(cacheName('data'));
        expect(names).toContain('alko-rater-static-%2FAlkoRater%2F-v7.9');
    });

    it.each(['/', '/AlkoRater/'])(
        'serves the offline catalog snapshot for scope %s, including query strings',
        async (scope) => {
            const worker = createWorker({ scope });
            await worker.dispatch('install').done;
            worker.fetchMock.mockClear().mockRejectedValue(new Error('offline'));

            const response = await worker.fetchRequest('./data/piwa.json?refresh=1').response;
            expect(response.status).toBe(200);
            expect(await response.text()).toBe(`snapshot:${scope}data/piwa.json`);
            expect(worker.fetchMock).not.toHaveBeenCalled();
        },
    );

    it('keeps online HTML, modules, styles and catalog on the same installed generation', async () => {
        const worker = createWorker();
        await worker.dispatch('install').done;
        worker.fetchMock.mockClear().mockResolvedValue(new Response('new release'));

        for (const path of [
            'index.html',
            'src/js/main.js',
            'src/css/style.css',
            'data/wina.json',
        ]) {
            const response = await worker.fetchRequest(`./${path}`).response;
            expect(await response.text()).toBe(`snapshot:/AlkoRater/${path}`);
        }
        expect(worker.fetchMock).not.toHaveBeenCalled();
        for (const cache of worker.caches.stores.values()) {
            expect(cache.put).not.toHaveBeenCalled();
        }
    });

    it.each([{ mode: 'navigate' }, { accept: 'text/html' }])(
        'uses its own index snapshot for navigation and HTML requests: %j',
        async (options) => {
            const worker = createWorker();
            const foreign = await worker.caches.open('foreign-v1.2');
            await foreign.put(`${ORIGIN}/AlkoRater/index.html`, new Response('foreign HTML'));
            await worker.dispatch('install').done;
            worker.fetchMock.mockClear().mockRejectedValue(new Error('offline'));

            const response = await worker.fetchRequest('./missing-page?from=home', options)
                .response;
            expect(response.status).toBe(200);
            expect(await response.text()).toBe('snapshot:/AlkoRater/index.html');
            expect(worker.fetchMock).not.toHaveBeenCalled();
            expect(worker.caches.match).not.toHaveBeenCalled();
        },
    );

    it.each(['index.html', 'src/js/main.js', 'data/piwa.json'])(
        'returns a real 503 instead of mixing releases when %s is missing',
        async (path) => {
            const worker = createWorker();
            await worker.dispatch('install').done;
            for (const cache of worker.caches.stores.values()) {
                cache.entries.delete(`${ORIGIN}/AlkoRater/${path}`);
            }
            worker.fetchMock.mockClear().mockResolvedValue(new Response('unversioned replacement'));

            const response = await worker.fetchRequest(`./${path}`).response;
            expect(response).toBeInstanceOf(Response);
            expect(response.status).toBe(503);
            expect(await response.text()).toBe('Offline');
            expect(worker.fetchMock).not.toHaveBeenCalled();
        },
    );

    it('returns a real offline navigation response even when cache access rejects', async () => {
        const worker = createWorker();
        worker.caches.open.mockRejectedValue(new Error('storage denied'));
        const response = await worker.fetchRequest('./', { mode: 'navigate' }).response;
        expect(response).toBeInstanceOf(Response);
        expect(response.status).toBe(503);
        expect(response.headers.get('cache-control')).toBe('no-store');
    });

    it('does not fetch unlisted runtime modules from a different release', async () => {
        const worker = createWorker();
        const response = await worker.fetchRequest('./src/js/not-precached.js').response;
        expect(response.status).toBe(503);
        expect(worker.fetchMock).not.toHaveBeenCalled();
    });

    it('passes unrelated in-scope resources to the network with a defined offline fallback', async () => {
        const worker = createWorker();
        const online = await worker.fetchRequest('./attachment.txt').response;
        expect(await online.text()).toBe('snapshot:/AlkoRater/attachment.txt');
        worker.fetchMock.mockRejectedValue(new Error('offline'));
        const offline = await worker.fetchRequest('./attachment.txt').response;
        expect(offline.status).toBe(503);
        expect(worker.caches.open).not.toHaveBeenCalled();
    });

    it.each([
        ['/data/piwa.json', {}],
        ['/AlkoRater-other/data/piwa.json', {}],
        ['https://another.test/AlkoRater/data/piwa.json', {}],
        ['./data/piwa.json', { method: 'POST' }],
    ])('does not intercept out-of-scope or non-GET requests: %s', (path, options) => {
        const worker = createWorker();
        expect(worker.fetchRequest(path, options).event.respondWith).not.toHaveBeenCalled();
    });
});

describe('service worker update messages', () => {
    it('answers GET_VERSION using the standard transferred port', async () => {
        const worker = createWorker();
        const port = { postMessage: vi.fn() };
        await worker.dispatch('message', { data: { type: 'GET_VERSION' }, ports: [port] }).done;
        expect(port.postMessage).toHaveBeenCalledWith({ version: VERSION });
    });

    it('awaits an explicit activation request from the only in-scope tab', async () => {
        const worker = createWorker();
        const port = { postMessage: vi.fn() };
        let finishActivation;
        worker.self.skipWaiting.mockImplementation(
            () =>
                new Promise((resolve) => {
                    finishActivation = resolve;
                }),
        );
        worker.self.clients.matchAll.mockResolvedValue([
            worker.client,
            { id: 'unrelated-tab', url: `${ORIGIN}/other-app/` },
        ]);

        const message = worker.dispatch('message', {
            data: { type: 'SKIP_WAITING' },
            source: worker.client,
            ports: [port],
        });
        expect(message.event.waitUntil).toHaveBeenCalledOnce();
        await vi.waitFor(() => expect(worker.self.skipWaiting).toHaveBeenCalledOnce());
        expect(port.postMessage).not.toHaveBeenCalled();
        finishActivation();
        await message.done;
        expect(port.postMessage).toHaveBeenCalledWith({ type: 'UPDATE_ACCEPTED' });
        expect(worker.self.clients.matchAll).toHaveBeenCalledWith({
            type: 'window',
            includeUncontrolled: true,
        });
    });

    it('defers activation while another app tab is open, including uncontrolled pages', async () => {
        const worker = createWorker();
        const port = { postMessage: vi.fn() };
        worker.self.clients.matchAll.mockResolvedValue([
            worker.client,
            { id: 'editing-tab', url: `${ORIGIN}/AlkoRater/index.html` },
        ]);
        await worker.dispatch('message', {
            data: { type: 'SKIP_WAITING' },
            source: worker.client,
            ports: [port],
        }).done;
        expect(worker.self.skipWaiting).not.toHaveBeenCalled();
        expect(port.postMessage).toHaveBeenCalledWith({
            type: 'UPDATE_DEFERRED',
            reason: 'other-tabs',
        });
    });

    it('fails closed when clients cannot be inspected', async () => {
        const worker = createWorker();
        const port = { postMessage: vi.fn() };
        worker.self.clients.matchAll.mockRejectedValue(new Error('unavailable'));
        await worker.dispatch('message', {
            data: { type: 'SKIP_WAITING' },
            source: worker.client,
            ports: [port],
        }).done;
        expect(worker.self.skipWaiting).not.toHaveBeenCalled();
        expect(port.postMessage).toHaveBeenCalledWith({
            type: 'UPDATE_DEFERRED',
            reason: 'unavailable',
        });
    });

    it.each([null, {}, { id: 'foreign', url: `${ORIGIN}/other-app/` }])(
        'does not activate for an invalid or out-of-scope source: %j',
        async (source) => {
            const worker = createWorker();
            await worker.dispatch('message', { data: { type: 'SKIP_WAITING' }, source }).done;
            expect(worker.self.skipWaiting).not.toHaveBeenCalled();
        },
    );
});

function createEventTarget() {
    const listeners = new Map();
    return {
        addEventListener: vi.fn((type, handler) => {
            if (!listeners.has(type)) {
                listeners.set(type, new Set());
            }
            listeners.get(type).add(handler);
        }),
        removeEventListener: vi.fn((type, handler) => listeners.get(type)?.delete(handler)),
        emit: (type) => [...(listeners.get(type) || [])].forEach((handler) => handler({ type })),
    };
}

class TestMessageChannel {
    constructor() {
        const port1 = { close: vi.fn(), onmessage: null };
        const port2 = { close: vi.fn(), postMessage: (data) => port1.onmessage?.({ data }) };
        this.port1 = port1;
        this.port2 = port2;
    }
}

function createClient({ scope = '/AlkoRater/', firstInstall = false, waitingWorker } = {}) {
    const pageDocument = testDocument.implementation.createHTMLDocument();
    pageDocument.body.innerHTML = `
        <div id="update-banner" style="display: none">
            <span class="update-text">Nowa wersja dostępna</span>
            <button id="update-btn">Aktualizuj</button>
            <button id="update-dismiss">Zamknij</button>
        </div>
        <div id="modal-wrapper" style="display: none"><textarea id="note-input"></textarea></div>
    `;
    const active = {
        ...createEventTarget(),
        state: 'activated',
        postMessage: vi.fn((message, ports) => {
            if (message.type === 'GET_VERSION') {
                ports[0].postMessage({ version: VERSION });
            }
        }),
    };
    const waiting = waitingWorker || {
        ...createEventTarget(),
        state: 'installed',
        postMessage: vi.fn((message, ports) => {
            if (message.type === 'SKIP_WAITING') {
                ports[0].postMessage({ type: 'UPDATE_ACCEPTED' });
            }
        }),
    };
    const registration = {
        ...createEventTarget(),
        scope: `${ORIGIN}${scope}`,
        active: firstInstall ? null : active,
        waiting,
        update: vi.fn(async () => {}),
    };
    const serviceWorker = {
        ...createEventTarget(),
        controller: firstInstall ? null : active,
        register: vi.fn(async () => registration),
    };
    const pageWindow = { location: { reload: vi.fn() } };
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const context = {
        document: pageDocument,
        window: pageWindow,
        navigator: { serviceWorker },
        logger,
        MessageChannel: TestMessageChannel,
        URL,
        setTimeout,
        clearTimeout,
        setInterval,
        requestAnimationFrame: (callback) => callback(),
    };
    // Only the import/export syntax is adapted; execute the production update flow.
    const script = clientSource
        .replace(/^import[^\n]+\n/, '')
        .replace('export async function registerSW()', 'async function registerSW()')
        .replace(
            'import.meta.url',
            JSON.stringify(`${ORIGIN}${scope}src/js/services/sw-service.js`),
        );
    runInNewContext(script, context);
    return {
        document: pageDocument,
        window: pageWindow,
        registration,
        serviceWorker,
        waiting,
        logger,
        register: () => context.registerSW(),
        button: pageDocument.getElementById('update-btn'),
        banner: pageDocument.getElementById('update-banner'),
        modal: pageDocument.getElementById('modal-wrapper'),
        activate: () => {
            waiting.state = 'activated';
            registration.waiting = null;
            registration.active = waiting;
            serviceWorker.controller = waiting;
            waiting.emit('statechange');
            serviceWorker.emit('controllerchange');
        },
    };
}

afterEach(() => {
    vi.useRealTimers();
});

describe('service worker registration and per-tab update consent', () => {
    it.each(['/', '/AlkoRater/'])(
        'registers the worker relative to its module at scope %s',
        async (scope) => {
            vi.useFakeTimers();
            const client = createClient({ scope });
            await client.register();
            expect(client.serviceWorker.register).toHaveBeenCalledWith(
                `${ORIGIN}${scope}service-worker.js`,
                { scope: `${ORIGIN}${scope}`, updateViaCache: 'none' },
            );
            expect(client.window.__SW_VERSION__).toBe(VERSION);
            expect(vi.getTimerCount()).toBe(1);
        },
    );

    it('does not reload or show an update on first installation', async () => {
        vi.useFakeTimers();
        const client = createClient({ firstInstall: true });
        await client.register();
        client.activate();
        expect(client.window.location.reload).not.toHaveBeenCalled();
        expect(client.banner.style.display).toBe('none');
        expect(client.waiting.postMessage).not.toHaveBeenCalled();
    });

    it('keeps a draft intact on an unsolicited controller change', async () => {
        vi.useFakeTimers();
        const client = createClient();
        await client.register();
        client.modal.classList.add('active');
        const note = client.document.getElementById('note-input');
        note.value = 'Unfinished rating';
        client.activate();
        expect(client.window.location.reload).not.toHaveBeenCalled();
        expect(note.value).toBe('Unfinished rating');
    });

    it('dismisses the banner without requesting activation', async () => {
        vi.useFakeTimers();
        const client = createClient();
        await client.register();
        client.document.getElementById('update-dismiss').onclick();
        await vi.advanceTimersByTimeAsync(350);
        expect(client.banner.style.display).toBe('none');
        expect(client.waiting.postMessage).not.toHaveBeenCalled();
        expect(client.window.location.reload).not.toHaveBeenCalled();
    });

    it('refuses an explicit update while the rating editor is open', async () => {
        vi.useFakeTimers();
        const client = createClient();
        await client.register();
        client.modal.style.display = 'block';
        await client.button.onclick();
        expect(client.waiting.postMessage).not.toHaveBeenCalled();
        expect(client.window.location.reload).not.toHaveBeenCalled();
        expect(client.banner.textContent).toContain('Zapisz lub zamknij ocenę');
        expect(client.button.disabled).toBe(false);
    });

    it('keeps a deferred multi-tab update retryable without reloading', async () => {
        vi.useFakeTimers();
        const client = createClient();
        client.waiting.postMessage.mockImplementation((_, ports) =>
            ports[0].postMessage({
                type: 'UPDATE_DEFERRED',
                reason: 'other-tabs',
            }),
        );
        await client.register();
        await client.button.onclick();
        expect(client.banner.textContent).toContain('Zamknij pozostałe karty');
        expect(client.banner.style.display).toBe('block');
        expect(client.window.location.reload).not.toHaveBeenCalled();
        expect(client.button.disabled).toBe(false);
    });

    it('reloads only the consenting tab and only after activation', async () => {
        vi.useFakeTimers();
        const client = createClient();
        const otherClient = createClient({ waitingWorker: client.waiting });
        await client.register();
        await otherClient.register();
        const applying = client.button.onclick();
        await Promise.resolve();
        expect(client.window.location.reload).not.toHaveBeenCalled();
        client.activate();
        otherClient.activate();
        await applying;
        expect(client.window.location.reload).toHaveBeenCalledOnce();
        expect(otherClient.window.location.reload).not.toHaveBeenCalled();
        client.serviceWorker.emit('controllerchange');
        expect(client.window.location.reload).toHaveBeenCalledOnce();
    });

    it('requires another click if a rating is opened during activation', async () => {
        vi.useFakeTimers();
        const client = createClient();
        await client.register();
        const applying = client.button.onclick();
        await Promise.resolve();
        client.modal.classList.add('active');
        client.activate();
        await applying;
        expect(client.window.location.reload).not.toHaveBeenCalled();
        expect(client.banner.textContent).toContain('Zapisz lub zamknij ocenę');
        client.modal.classList.remove('active');
        await client.button.onclick();
        expect(client.window.location.reload).toHaveBeenCalledOnce();
        expect(client.waiting.postMessage).toHaveBeenCalledOnce();
    });

    it('handles a missing worker reply without an unhandled rejection or reload', async () => {
        vi.useFakeTimers();
        const client = createClient();
        client.waiting.postMessage.mockImplementation(() => {});
        await client.register();
        const applying = client.button.onclick();
        await vi.advanceTimersByTimeAsync(3000);
        await applying;
        expect(client.window.location.reload).not.toHaveBeenCalled();
        expect(client.logger.warn).toHaveBeenCalledOnce();
        expect(client.button.disabled).toBe(false);
        expect(client.banner.textContent).toContain('Spróbuj ponownie');
    });

    it('catches failed periodic update checks', async () => {
        vi.useFakeTimers();
        const client = createClient();
        client.registration.update.mockRejectedValue(new Error('offline'));
        await client.register();
        await vi.advanceTimersByTimeAsync(60 * 60 * 1000);
        expect(client.registration.update).toHaveBeenCalledOnce();
        expect(client.logger.warn).toHaveBeenCalledOnce();
        expect(client.window.location.reload).not.toHaveBeenCalled();
    });
});
