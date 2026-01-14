# E2E Tests with Playwright

End-to-end tests for the VATSIM Flight Scheduler, focusing on core user flows and filtering functionality.

## Philosophy

Following the project's testing guidelines:
- **Core functionality only** - Testing critical user paths, not every edge case
- **Mocked API calls** - All VATSIM API requests are mocked to avoid rate limits
- **Practical scenarios** - Real-world user flows that matter

## Running Tests

```bash
# Run all E2E tests (headless)
npm run test:e2e

# Run with UI (interactive mode)
npm run test:e2e:ui

# Run in debug mode
npm run test:e2e:debug
```

## Test Coverage

### Core Filtering Flows ✅
- Empty state when no filters applied
- Filter by departure airport
- Filter by arrival airport
- Filter by multiple airports (departure + arrival)
- Filter by ATC level (Tower, Ground, etc.)
- Filter by multiple ATC levels (OR logic)
- Clear all filters

### ATC Status Display ✅
- Display color-coded ATC badges
- Expand/collapse controller details

### Pagination ✅
- Navigate between pages when results > page size
- Page size controls

### Error Handling ✅
- Graceful handling of VATSIM API failures
- Empty controller list handling

## Mock Data

Located in `tests/e2e/fixtures/mock-vatsim-data.ts`:

- **mockVatsimData** - Minimal realistic controller data
  - Phoenix: TWR + GND
  - Las Vegas: TWR
  - Baltimore: DEL
  - Los Angeles: CTR
  - SOCAL: APP

- **mockVatsimDataEmpty** - No controllers online (for error testing)

## Test Structure

```
tests/
└── e2e/
    ├── fixtures/
    │   └── mock-vatsim-data.ts    # Mock VATSIM API responses
    └── filtering.spec.ts          # Core filtering tests
```

## Configuration

See `playwright.config.ts` for:
- Test directory: `./tests/e2e`
- Base URL: `http://localhost:5173`
- Browser: Chromium only (for speed)
- Web server: Auto-starts dev server
- Retries: 2 in CI, 0 locally

## Writing New Tests

When adding tests:

1. **Mock the VATSIM API** in `beforeEach`:
```typescript
await page.route('https://data.vatsim.net/v3/vatsim-data.json', async (route) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(mockVatsimData),
  });
});
```

2. **Focus on user flows**, not implementation details
3. **Keep tests simple and readable**
4. **Use accessible selectors** (roles, labels) when possible

## CI/CD

Tests run automatically on CI with:
- 2 retries for flaky tests
- Single worker (no parallel execution)
- HTML report generation

## Notes

- Tests use mocked VATSIM data to avoid rate limiting
- Dev server starts automatically (port 5173)
- Only Chromium browser configured (add others if needed)
- Tests are independent and can run in parallel locally
