import { readFileSync, writeFileSync, copyFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dryRun = process.argv.includes('--dry-run');

const rewriteData = (filename, sourcePrefix) => {
    const filePath = path.join(root, 'data', filename);
    const backupPath = path.join(root, 'data', `${filename}.bak`);
    const data = JSON.parse(readFileSync(filePath, 'utf8'));

    const standardizedData = data.map((item, index) => ({
        id: item.id ?? `${sourcePrefix}-${index + 1}`,
        name: item.name ?? item.title ?? item.productName ?? '',
        alcohol: item.alcohol ?? item.abv ?? item.abvPercent ?? '',
        image_url: item.image_url ?? item.image ?? item.imageUrl ?? '',
    }));

    if (dryRun) {
        console.log(`[DRY RUN] Would standardize ${filename}: ${data.length} -> ${standardizedData.length} items`);
        return;
    }

    // Create backup before overwriting
    copyFileSync(filePath, backupPath);
    writeFileSync(filePath, JSON.stringify(standardizedData, null, 2), 'utf8');
    console.log(`Standardized ${filename} (backup: ${filename}.bak)`);
};

console.log('WARNING: This script strips fields (brand, type, country, etc.) from data files.');
console.log('The search system depends on these fields. Only run if you know what you are doing.\n');

if (!dryRun) {
    console.log('Use --dry-run to preview changes without writing.\n');
}

rewriteData('piwa.json', 'beer');
rewriteData('wodki.json', 'vodka');
rewriteData('wina.json', 'wine');
