import { copyFile, lstat, mkdir, readdir, rm } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));

const rootFiles = [
    'index.html',
    'service-worker.js',
    'manifest.json',
    'robots.txt',
    'sitemap.xml',
    'humans.txt',
    'llms.txt',
    'llms-full.txt',
    'favicon.ico',
    'logo.png',
    'LICENSE',
];

const assetDirectories = [
    { path: 'src/js', extensions: ['.js'] },
    { path: 'src/css', extensions: ['.css'] },
    { path: 'data', extensions: ['.json'] },
    { path: 'icons', extensions: ['.png', '.svg', '.ico', '.webp', '.avif', '.jpg', '.jpeg'] },
];

const excludedDirectories = ['__tests__', '__snapshots__', 'test', 'tests', 'node_modules'];

export function isProductionPath(path) {
    if (rootFiles.includes(path)) {
        return true;
    }

    if (
        path
            .split('/')
            .some((part) => part.startsWith('.') || excludedDirectories.includes(part)) ||
        /\.(test|spec)\.[^/]+$/.test(path)
    ) {
        return false;
    }

    return assetDirectories.some(
        (directory) =>
            path.startsWith(`${directory.path}/`) && directory.extensions.includes(extname(path)),
    );
}

export async function listProductionFiles(root = repositoryRoot) {
    const files = [];

    async function visit(path) {
        const entries = await readdir(join(root, path), { withFileTypes: true });
        for (const entry of entries) {
            const relativePath = `${path}/${entry.name}`;
            if (entry.isSymbolicLink()) {
                throw new Error(`Refusing to stage a symbolic link: ${relativePath}`);
            }
            if (entry.isDirectory()) {
                if (!entry.name.startsWith('.') && !excludedDirectories.includes(entry.name)) {
                    await visit(relativePath);
                }
            } else if (entry.isFile() && isProductionPath(relativePath)) {
                files.push(relativePath);
            }
        }
    }

    for (const path of rootFiles) {
        if (!(await lstat(join(root, path))).isFile()) {
            throw new Error(`Expected a production file: ${path}`);
        }
        files.push(path);
    }

    for (const directory of assetDirectories) {
        if (!(await lstat(join(root, directory.path))).isDirectory()) {
            throw new Error(`Expected an asset directory: ${directory.path}`);
        }
        await visit(directory.path);
    }

    return files.sort();
}

export async function build() {
    const files = await listProductionFiles();
    const destination = join(repositoryRoot, 'dist');
    await rm(destination, { recursive: true, force: true });

    for (const path of files) {
        const target = join(destination, path);
        await mkdir(dirname(target), { recursive: true });
        await copyFile(join(repositoryRoot, path), target);
    }

    console.log(`Staged ${files.length} production files in dist/.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
    await build();
}
