# Testing Guide

This project uses [Vitest](https://vitest.dev/) for unit testing TypeScript library files.

## Running Tests

```bash
# Run tests in watch mode (recommended for development)
npm test

# Run tests once (useful for CI/CD)
npm run test:run

# Run tests with UI (interactive browser interface)
npm run test:ui

# Run tests with coverage report
npm run test:coverage
```

## Test Structure

Tests are located alongside the source files with the `.test.ts` extension:

- `src/lib/routes.test.ts` - Tests for route generation logic
- `src/lib/vatsim.test.ts` - Tests for VATSIM API integration (with mocked API calls)
- `src/lib/atc-utils.test.ts` - Tests for ATC utility functions

## Testing Philosophy

Following the project's guidelines, we focus on:

1. **Core functionality only** - Not aiming for 100% coverage, just the important parts
2. **Library files only** - Currently testing TypeScript files, not Svelte components
3. **Mocked external calls** - VATSIM API calls are always mocked to avoid hitting the real API
4. **Practical tests** - Testing real-world scenarios and edge cases

## Writing New Tests

When adding new tests:

1. Create a test file alongside the source file (e.g., `myfile.test.ts` next to `myfile.ts`)
2. Import test utilities from vitest:
   ```typescript
   import { describe, it, expect, beforeEach, vi } from 'vitest';
   ```
3. Mock external dependencies, especially API calls:
   ```typescript
   global.fetch = vi.fn();
   ```
4. Write focused tests that validate core behavior
5. Use descriptive test names that explain what is being tested

## Example Test Structure

```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from './myfile';

describe('myFunction', () => {
	it('should do something specific', () => {
		const result = myFunction('input');
		expect(result).toBe('expected output');
	});

	it('should handle edge cases', () => {
		expect(myFunction('')).toBe('');
		expect(myFunction(null)).toBe(null);
	});
});
```

## Test Coverage Areas

### routes.test.ts
- Route generation algorithm
- Featured route (SEA-MHT) inclusion
- Duplicate prevention
- Edge cases (requesting more routes than possible)

### vatsim.test.ts
- API data fetching with caching (30-second cache)
- Controller position extraction and mapping
- Consolidated TRACON facility handling
- ARTCC code extraction
- Mock data ensures no real API calls

### atc-utils.test.ts
- Controller availability checking
- Airport filtering logic
- Route filtering by ATC status
- Cross-filtering (departure with arrival ATC, etc.)

## Configuration

Test configuration is in [vite.config.ts](../vite.config.ts):

```typescript
test: {
  globals: true,
  environment: 'happy-dom',
  include: ['src/**/*.{test,spec}.{js,ts}'],
  coverage: {
    reporter: ['text', 'json', 'html'],
    exclude: ['**/*.config.*', '**/types/**', '**/*.d.ts']
  }
}
```

## Best Practices

1. **Keep tests focused** - Each test should validate one specific behavior
2. **Use descriptive names** - Test names should clearly explain what's being tested
3. **Mock external dependencies** - Always mock API calls, file system operations, etc.
4. **Test edge cases** - Include tests for empty inputs, null values, boundary conditions
5. **Maintain test data** - Use realistic test data that matches actual airport codes in the system
6. **Don't over-test** - Focus on business logic, not implementation details

## Troubleshooting

**Tests failing due to missing airports:**
- Ensure test data uses airport codes that exist in `src/lib/data/airports.json`
- Check `vatsim_code` field matches the callsign prefix used in tests

**Cache-related issues:**
- Use `clearCache()` in `beforeEach` to reset state between tests
- Use `vi.useFakeTimers()` when testing time-dependent behavior

**Mock not working:**
- Verify mocks are set up before the code under test runs
- Use `vi.clearAllMocks()` in `beforeEach` to reset mocks
- Check that `vi.restoreAllMocks()` is called in `afterEach`
