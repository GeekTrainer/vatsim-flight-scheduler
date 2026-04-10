# Testing Infrastructure Review

_Reviewed against the full project codebase on the `copilot/review-testing-infrastructure` branch._

---

## Summary

The project has a solid testing foundation: 16 unit-test files (283 tests) covering the
TypeScript library layer, and 21 E2E spec files (≈162 tests) covering core user flows
with mocked external APIs. Overall unit coverage sits at **~92 % statements / ~87 %
branches**. The approach is sound, but there are several concrete issues that should be
fixed before this infrastructure can be considered production-quality.

---

## Bugs (tests that are silently wrong today)

### 1. `ctaf-display.spec.ts` mocks a dead URL

**File:** `tests/e2e/ctaf-display.spec.ts` line 31

```typescript
// WRONG — this URL is never called by the app
await page.route('https://datis.clowd.io/api/*', async (route) => { … });
```

The app fetches FAA D-ATIS from `https://atis.info/api/*` (see `src/lib/atis.ts`
line 21). The mock registers against the old provider URL `datis.clowd.io` which is
never requested, so the mock never fires. Every CTAF E2E test therefore makes a real
outbound call to `atis.info` during the test run.

**Fix:** Change the pattern to `https://atis.info/api/*`.

---

### 2. `setupWithFlightPageMocks` leaves server-side proxy routes unmocked

**File:** `tests/e2e/helpers/setup.ts`

The shared flight-page setup helper mocks the VATSIM, FAA D-ATIS, and SimBrief APIs,
but omits the two SvelteKit server routes that every flight-page load triggers:

| Route | Calls out to |
|-------|-------------|
| `/api/ctaf/[icao]` | `ourairports.com` (HTML scrape) |
| `/api/metar/[icao]` | `aviationweather.gov` (NOAA) |

These are relative-URL routes handled by the dev server, so Playwright **can** intercept
them with `**/api/ctaf/**` and `**/api/metar/**` patterns. Because they are not mocked,
any test that uses `setupWithFlightPageMocks()` (used by `flight-page.spec.ts`,
`flight-page-features.spec.ts`, `simbrief.spec.ts`, `mobile-flight-page.spec.ts`, and
`user-journey.spec.ts`) silently makes real HTTP calls to two external services on every
run. This makes tests slower, fragile in offline environments, and potentially subject to
rate-limiting.

**Fix:** Add `**/api/ctaf/**` → `{ frequency: null }` and `**/api/metar/**` → `[]` to
`setupWithFlightPageMocks()`.

---

### 3. Stale JSDoc comment in `src/lib/atis.ts`

**File:** `src/lib/atis.ts` line 3

```typescript
// WRONG — the old provider
 * Fetches real-world Digital ATIS from the FAA via datis.clowd.io
```

The actual constant on line 21 is `const DATIS_API_URL = 'https://atis.info/api'`. The
comment is misleading for anyone reading the source or writing new mocks.

**Fix:** Update the comment to reference `atis.info`.

---

## Coverage Gaps

### 4. `getVatsimATIS` has zero unit-test coverage

**File:** `src/lib/vatsim.ts` lines 180–214  
**Coverage:** 0 % (the function is entirely uncovered in the coverage report)

`getVatsimATIS` is a public export that contains non-trivial branching logic:
- Filters ATIS stations by ICAO prefix
- Prefers role-specific (`_A_ATIS` / `_D_ATIS`) entries over combined ones
- Falls back to `matches[0]` when neither role-specific nor combined is found
- Returns `null` when `text_atis` is empty
- Sets `atisType` based on the callsign pattern

All of this logic is currently only exercised through E2E tests, which are slow and
cannot easily cover every branch. This is the most important unit-coverage gap in the
codebase given how central ATIS lookup is to the flight page.

---

### 5. Netlify Blobs paths in `ctaf-cache.ts` are completely untested

**File:** `src/lib/server/ctaf-cache.ts` lines 28–36, 57–64  
**Coverage:** 48 % statements

The `isNetlifyEnvironment()` branch (the `getStore` / Blobs code path) is never
executed in tests. The test file only exercises the in-memory fallback. This means any
regression in the Netlify production code path would go undetected. Mocking
`process.env.NETLIFY` and `@netlify/blobs` in a unit test would cover these paths.

---

### 6. `fetchCTAFFromOurAirports` network path untested

**File:** `src/lib/server/ourairports.ts` lines 11–23  
**Coverage:** 68 % statements

The actual HTTP fetch (lines 11–23) and the non-ok response branch (line 18) are not
tested — only the pure HTML parser `parseCTAFFromHTML` is. A unit test that mocks
`global.fetch` would cover the fetch error path and the happy path where the HTML
response feeds into the parser.

---

## Documentation Problems

### 7. `TESTING.md` lists only 3 of the 16 unit-test files

**File:** `TESTING.md` — "Test Structure" section

The file enumerates `routes.test.ts`, `vatsim.test.ts`, and `atc-utils.test.ts`. The
project now has 16 unit-test files. Any developer reading this document to orient
themselves will miss: `atis.test.ts`, `metar.test.ts`, `ctaf.test.ts`, `enroute.test.ts`,
`simbrief.test.ts`, `route-display.test.ts`, five files under `utils/`, and two files
under `server/`.

---

### 8. `tests/e2e/README.md` references files that do not exist

**File:** `tests/e2e/README.md`

- "Mock Data" section points to `tests/e2e/fixtures/mock-vatsim-data.ts` — the actual
  file is `vatsim-data.ts`.
- "Test Structure" section lists `filtering.spec.ts` — this file does not exist; the
  filtering tests are split across `atc-filtering.spec.ts`, `arrival-filtering.spec.ts`,
  and `airport-selection.spec.ts`.
- The "Test Coverage" section is an abbreviated subset of the 21 spec files that now
  exist.

---

## Minor / Lower-Priority Observations

### 9. `expectATCLevelButtonActive` uses CSS class names as the signal

**File:** `tests/e2e/helpers/assertions.ts`

```typescript
const isActive = classAttr?.includes('atc-ctr-active') || …
```

This ties the assertion to implementation details (Tailwind class names). If a class is
renamed, the test gives a false negative with no obvious error message. A more robust
approach would be to expose the state via a `data-active` attribute on the button and
assert on that.

---

### 10. `api-recovery.spec.ts` has a 90-second test timeout

**File:** `tests/e2e/api-recovery.spec.ts` line 13

```typescript
test.setTimeout(90000);
```

The test waits for the app's 30-second auto-refresh cycle. This is unavoidable if the
real timer is used, but it makes the CI job slower and more fragile. The test could be
refactored to use a page `evaluate()` call that manually fires the refresh event, or by
exposing a test-only mechanism to trigger a refresh without waiting the full 30 seconds.

---

### 11. Several flight-page tests in `controller-time.spec.ts` do not mock CTAF/METAR

**File:** `tests/e2e/controller-time.spec.ts`

This spec mocks VATSIM, FAA D-ATIS, and SimBrief, but not `/api/ctaf/**` or
`/api/metar/**` (the same problem as finding #2, but in a file that does not use the
shared helper). Real outbound calls to OurAirports and NOAA are made on each test run.

---

## Priority Order

| # | Finding | Severity |
|---|---------|----------|
| 1 | `ctaf-display.spec.ts` mocks wrong URL | **High** — mock never fires; real calls made |
| 2 | `setupWithFlightPageMocks` missing CTAF/METAR mocks | **High** — real calls on every flight-page test |
| 11 | `controller-time.spec.ts` missing CTAF/METAR mocks | **High** — same issue, different file |
| 4 | `getVatsimATIS` has no unit tests | **Medium** — critical function, branches only covered by slow E2E |
| 5 | Netlify Blobs paths untested | **Medium** — production path never exercised |
| 6 | `fetchCTAFFromOurAirports` network path untested | **Medium** — error handling never exercised |
| 3 | Stale JSDoc comment in `atis.ts` | **Low** — misleading but not functional |
| 7 | `TESTING.md` out of date | **Low** — documentation drift |
| 8 | `tests/e2e/README.md` references nonexistent files | **Low** — documentation drift |
| 9 | CSS class-based assertion in `assertions.ts` | **Low** — fragile, not wrong today |
| 10 | 90-second test in `api-recovery.spec.ts` | **Low** — slow CI, not incorrect |
