import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const rewriteData = (filename, sourcePrefix) => {
    const filePath = path.join(root, 'data', filename);
    const data = JSON.parse(readFileSync(filePath, 'utf8'));

    const standardizedData = data.map((item, index) => ({
        id: item.id ?? `${sourcePrefix}-${index + 1}`,
        name: item.name ?? item.title ?? item.productName ?? '',
        alcohol: item.alcohol ?? item.abv ?? item.abvPercent ?? '',
        image_url: item.image_url ?? item.image ?? item.imageUrl ?? '',
    }));

    writeFileSync(filePath, JSON.stringify(standardizedData, null, 2), 'utf8');
    console.log(`Standardized ${filename}`);
};

rewriteData('piwa.json', 'beer');
rewriteData('wodki.json', 'vodka');
rewriteData('wina.json', 'wine');
