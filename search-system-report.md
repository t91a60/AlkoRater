# AlkoRater — Search System Fix Report

## Status: 🟢 ALL 15/15 EVALS PASS

---

## Root Causes Found

### Bug 1 — CRITICAL: `category` not in `searchText`

Beer items have English types (`"Lager"`, `"IPA"`). When a user typed `"piwo"`,
there was no match because `"Piwo"` (the derived category) was never included in the
search index. `buildSearchIndex` only used `name`, `brand`, `type`, `country`.

```js
// BEFORE (broken)
buildSearchIndex = (item) => normalize([item.name, item.brand, item.type, item.country].join(' '));

// AFTER (fixed)
buildSearchIndex = (item) => normalize([item.name, item.brand, item.type, item.category, item.country].join(' '));
```

**Secondary issue:** `category` was derived *after* `searchText` was built, so it was always missing from the index. Fixed by deriving `category` first.

---

### Bug 2 — CRITICAL: Stop-words stripped category queries

```js
// BEFORE (broken)
const stopWords = ['piwo', 'wódka', 'wino', 'vodka', 'beer', 'wine'];
const cleanQuery = (raw) => raw.split(/\s+/).filter(w => !stopWords.includes(w)).join('');
// "piwo" → stripped to "" → fallback to raw → still 0 results
```

`cleanQuery` removed the most useful category keywords the user would naturally type.
The `|| raw` fallback did not help because beer items had no Polish "piwo" in `name`/`brand`/`type`.

**Fix:** `stopWords` and `cleanQuery` removed entirely. Query is normalized directly.

---

### Bug 3 — MEDIUM: Results biased toward first-loaded dataset

`filter().slice(50)` returns items in array insertion order. Since `state.appData`
is built as `[...beers, ...vodkas, ...wines]` and vodkas are 134 entries, many queries
showed only vodkas. Żubrówka dominated "Żu" searches.

**Fix:** Scored relevance sort:

| Score | Condition |
|-------|-----------|
| 3 | `name` starts with query |
| 2 | `brand` starts with query |
| 1 | query appears anywhere in `searchText` |
| 0 | no match — excluded |

Results sorted descending by score, then Polish `localeCompare` alphabetically.

---

### Bug 4 — MEDIUM: `alcohol` field inconsistent across JSON files

| File | Type | Example |
|------|------|---------|
| `piwa.json` | `number` | `5.2` |
| `wodki.json` | `string` | `"40%"` |
| `wina.json` | `string` | `"13.5%"` |

`alcoholBadgeHTML()` called `.includes('%')` which throws on a number.

**Fix:** `normalizeLoadedItem` now always converts to a formatted string:

```js
const alcoholDisplay =
    rawAlcohol === ''                  ? '' :
    typeof rawAlcohol === 'number'     ? `${rawAlcohol}%` :
    String(rawAlcohol).includes('%')   ? String(rawAlcohol) :
                                         `${rawAlcohol}%`;
```

---

### Bug 5 — MEDIUM: `ł` survived NFD normalization

`ł` does not decompose via `.normalize('NFD')`. It must be replaced **before** NFD,
not after. The old code applied `.replace(/ł/g, 'l')` after stripping — too late.

```js
// WRONG — ł survives:
.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ł/g, 'l')

// RIGHT — ł removed before NFD:
.toLowerCase().replace(/ł/g, 'l').replace(/ß/g, 'ss')
.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
```

---

## Files Changed

| File | Changes |
|------|---------|
| `src/js/data.js` | NFD order fixed; `buildSearchIndex` includes `category`; `normalizeLoadedItem` derives `category` first then builds `searchText`; `alcohol` normalized to string; `normalized_name` field added; `deriveCategory` uses normalized type matching |
| `src/js/ui.js` | `stopWords` and `cleanQuery` removed; `handleSearch` replaced with scored, sorted implementation via `scoreResult()` |
| `scripts/eval-search.mjs` | New — eval harness with 10 capability + 5 regression evals |

---

## Eval Results

```
CAPABILITY EVALS:
  [EVAL-1]  PASS  "piw" returns beers
  [EVAL-2]  PASS  "piwo" returns beers (stop word no longer stripped)
  [EVAL-3]  PASS  "zubr" returns Żubrówka (diacritic-insensitive)
  [EVAL-4]  PASS  "t" returns results from the first character
  [EVAL-5]  PASS  "lager" returns Lager beer items
  [EVAL-6]  PASS  "wino" returns wines
  [EVAL-7]  PASS  Broad "a" returns beers, vodkas, and wines
  [EVAL-8]  PASS  Top result for "ty" has name starting with "ty"
  [EVAL-9]  PASS  All items have non-empty brand field
  [EVAL-10] PASS  Category included in all searchText fields

REGRESSION EVALS:
  [REG-1]   PASS  Polish characters normalize correctly (Żubrówka → zubrowka)
  [REG-2]   PASS  Empty query returns empty results
  [REG-3]   PASS  deriveCategory classifies Piwo / Wino / Wódka correctly
  [REG-4]   PASS  All alcohol fields are strings
  [REG-5]   PASS  Full dataset: 63 beers + 134 vodkas + 99 wines = 296 items

Capability:  10/10
Regression:   5/5
Total:       15/15  ✅ ALL PASS
```

---

## Before vs After

| Query | Before | After |
|-------|--------|-------|
| `"piw"` | 0 results | All beers (Tyskie, Żywiec, Lech…) |
| `"piwo"` | 0 results | All beers via category match |
| `"zubr"` | Żubrówka vodka only | Żubrówka + Żubr beer |
| `"t"` | Biased or empty | Tyskie, Tatra, Tuborg, Tatrzańska… |
| `"lager"` | Vodkas dominated | Beers first (Tyskie, Żywiec, Beck's…) |
| `"wino"` | 0 results | All wines via category match |
