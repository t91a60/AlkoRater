import { describe, expect, it } from 'vitest';
import { collectionStats } from '../dashboard.js';

describe('collection statistics', () => {
    it('uses the actual five-star scale, with no NaN for an empty collection', () => {
        expect(collectionStats([])).toMatchObject({ total: 0, average: 0, best: null });
        expect(collectionStats([{ stars: 5, tag: 'Piwo' }]).average / 5).toBe(1);
        expect(collectionStats([{ stars: 1 }, { stars: 5 }]).average).toBe(3);
    });

    it('excludes invalid ratings and has a deterministic highest rating', () => {
        const best = { stars: 4, tag: 'Wino' };
        const stats = collectionStats([
            best,
            { stars: 4, tag: 'Piwo' },
            { stars: 0 },
            { stars: NaN },
            { stars: 6 },
        ]);
        expect(stats.total).toBe(2);
        expect(stats.best).toBe(best);
        expect(stats.categories).toContainEqual({ name: 'Wino', count: 1 });
    });
});
