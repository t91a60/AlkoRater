import { describe, expect, it } from 'vitest';
import { MAX_NOTE_LENGTH, normalizeRecord, normalizeRecords } from '../records.js';

function record(overrides = {}) {
    return {
        id: 'rating-1',
        item: {
            id: 17,
            source: 'beer',
            category: 'Piwo',
            name: 'Harnaś',
            alcohol: '5,5%',
        },
        stars: 4,
        note: 'Własna notatka',
        date: '2026-09-01T12:00:00+02:00',
        ...overrides,
    };
}

describe('normalizeRecord', () => {
    it('normalizes legacy IDs, ratings and dates without changing the original snapshot', () => {
        const raw = record({ id: 42, stars: '4' });
        const original = structuredClone(raw);

        expect(normalizeRecord(raw)).toEqual({
            id: '42',
            productId: 'beer:17',
            item: {
                id: '17',
                source: 'beer',
                category: 'Piwo',
                name: 'Harnaś',
                brand: '',
                type: '',
                country: '',
                alcohol: '5.5%',
                image_url: '',
            },
            stars: 4,
            tag: 'Piwo',
            note: 'Własna notatka',
            date: '2026-09-01T10:00:00.000Z',
            revision: 1,
        });
        expect(raw).toEqual(original);
    });

    it('keeps snapshots without catalogue IDs under an explicit legacy identity', () => {
        const normalized = normalizeRecord(
            record({ item: { name: 'Harnaś', brand: 'Żywiec' }, tag: 'Piwo' }),
        );

        expect(normalized.productId).toBe('legacy:piwo|zywiec|harnas');
        expect(normalized.item).toMatchObject({
            name: 'Harnaś',
            brand: 'Żywiec',
            category: 'Piwo',
            alcohol: '',
        });
        expect(normalized.item).not.toHaveProperty('id');
    });

    it('rejects out-of-range or non-integer ratings instead of repairing them', () => {
        for (const stars of [0, 6, 2.5, NaN, Infinity, null, true, '2.5', ' 3 ']) {
            expect(() => normalizeRecord(record({ stars }))).toThrow(/Ocena/);
        }
    });

    it('validates required fields, dates and positive safe revisions', () => {
        for (const raw of [
            null,
            [],
            record({ id: '' }),
            record({ id: 'x'.repeat(201) }),
            record({ item: null }),
            record({ item: { name: '   ' } }),
            record({ date: 'not-a-date' }),
            record({ date: 123 }),
            record({ revision: 0 }),
            record({ revision: 1.5 }),
            record({ revision: Number.MAX_SAFE_INTEGER + 1 }),
        ]) {
            expect(() => normalizeRecord(raw)).toThrow();
        }
    });

    it('preserves legacy notes longer than the new editor limit and rejects non-text notes', () => {
        const note = `  <img src=x onerror="alert(1)">\n${'ą'.repeat(MAX_NOTE_LENGTH - 36)}`;
        expect(normalizeRecord(record({ note })).note).toBe(note);
        expect(normalizeRecord(record({ note: 'x'.repeat(MAX_NOTE_LENGTH) })).note).toHaveLength(
            MAX_NOTE_LENGTH,
        );
        expect(
            normalizeRecord(record({ note: 'x'.repeat(MAX_NOTE_LENGTH + 1) })).note,
        ).toHaveLength(MAX_NOTE_LENGTH + 1);
        expect(() => normalizeRecord(record({ note: { html: '<script>1</script>' } }))).toThrow(
            /note/,
        );
    });
});

describe('normalizeRecords', () => {
    it('sorts newest first with a stable ID tie-break without mutating the input', () => {
        const older = record({ id: 'older', date: '2025-01-01T00:00:00Z' });
        const second = record({ id: 'b' });
        const first = record({ id: 'a' });
        const input = [older, second, first];

        expect(normalizeRecords(input).map((entry) => entry.id)).toEqual(['a', 'b', 'older']);
        expect(input).toEqual([older, second, first]);
        expect(input[0]).toBe(older);
    });

    it('rejects the whole collection if a row is corrupt or normalized IDs collide', () => {
        expect(() => normalizeRecords([record(), record({ id: 'bad', stars: 0 })])).toThrow();
        expect(() => normalizeRecords([record({ id: 42 }), record({ id: '42' })])).toThrow(
            /identyfikatory/,
        );
        expect(() => normalizeRecords({ records: [] })).toThrow(/kolekcja/);
        expect(() => normalizeRecords(Array(20001).fill(record()))).toThrow(/kolekcja/);
    });
});
