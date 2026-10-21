import { createReadStream } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, isAbsolute, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { isProductionPath, repositoryRoot } from './build.mjs';

const contentTypes = {
    '.avif': 'image/avif',
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.ico': 'image/x-icon',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.txt': 'text/plain; charset=utf-8',
    '.webp': 'image/webp',
    '.xml': 'application/xml; charset=utf-8',
};

export async function createStaticServer({ root = repositoryRoot, cache = false } = {}) {
    const realRoot = await realpath(root);

    return createServer(async (request, response) => {
        response.setHeader('Cache-Control', 'no-store');
        response.setHeader('X-Content-Type-Options', 'nosniff');

        function fail(statusCode, message) {
            response.writeHead(statusCode, { 'Content-Type': 'text/plain; charset=utf-8' });
            response.end(request.method === 'HEAD' ? undefined : `${message}\n`);
        }

        if (request.method !== 'GET' && request.method !== 'HEAD') {
            response.setHeader('Allow', 'GET, HEAD');
            fail(405, 'Method not allowed');
            return;
        }

        const [rawPath, query] = (request.url || '/').split('?', 2);
        let pathname;
        try {
            pathname = decodeURIComponent(rawPath);
        } catch {
            fail(400, 'Malformed URL');
            return;
        }

        if (
            !pathname.startsWith('/') ||
            pathname.startsWith('//') ||
            /[:\\]/.test(pathname) ||
            [...pathname].some(
                (character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
            ) ||
            pathname.split('/').some((part) => part === '.' || part === '..')
        ) {
            fail(400, 'Invalid path');
            return;
        }

        if (pathname === '/AlkoRater') {
            response.writeHead(308, { Location: `/AlkoRater/${query ? `?${query}` : ''}` });
            response.end();
            return;
        }

        const path = pathname.startsWith('/AlkoRater/') ? pathname.slice(11) : pathname.slice(1);
        const relativePath = path || 'index.html';
        if (!isProductionPath(relativePath)) {
            fail(404, 'Not found');
            return;
        }

        try {
            const file = await realpath(resolve(realRoot, relativePath));
            const withinRoot = relative(realRoot, file);
            if (
                withinRoot.startsWith('..') ||
                isAbsolute(withinRoot) ||
                !isProductionPath(withinRoot.split(sep).join('/'))
            ) {
                fail(403, 'Forbidden');
                return;
            }

            const info = await stat(file);
            if (!info.isFile()) {
                fail(404, 'Not found');
                return;
            }

            response.writeHead(200, {
                'Content-Type': contentTypes[extname(file)] || 'text/plain; charset=utf-8',
                'Content-Length': info.size,
                'Cache-Control':
                    cache && relativePath !== 'service-worker.js'
                        ? 'public, max-age=3600'
                        : 'no-store',
            });
            if (request.method === 'HEAD') {
                response.end();
                return;
            }

            const stream = createReadStream(file);
            stream.on('error', () => response.destroy());
            response.on('close', () => stream.destroy());
            stream.pipe(response);
        } catch (error) {
            if (['ENOENT', 'ENOTDIR'].includes(error.code)) {
                fail(404, 'Not found');
            } else if (error.code === 'EACCES') {
                fail(403, 'Forbidden');
            } else {
                console.error(error);
                fail(500, 'Internal server error');
            }
        }
    });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
    const { values } = parseArgs({
        options: {
            port: { type: 'string', default: '4173' },
            root: { type: 'string', default: '.' },
            cache: { type: 'boolean', default: false },
        },
    });
    const port = Number(values.port);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error('--port must be an integer between 1 and 65535.');
    }

    const server = await createStaticServer({
        root: resolve(repositoryRoot, values.root),
        cache: values.cache,
    });
    server.on('error', (error) => {
        console.error(error.message);
        process.exitCode = 1;
    });
    server.listen(port, '127.0.0.1', () => {
        console.log(`AlkoRater: http://127.0.0.1:${port}/AlkoRater/`);
    });
}
