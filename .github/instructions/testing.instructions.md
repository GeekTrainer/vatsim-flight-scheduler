# Testing Best Practices for Svelte Components

## Overview
This document defines testing standards for the VATSIM Flight Scheduler project. All components must be testable with E2E tests using Playwright.

## Playwright and Svelte Reactivity

### Critical: Understanding Svelte $derived and DOM Updates

Svelte 5's `$derived` runes update **synchronously** in JavaScript, but the **DOM updates asynchronously** in the next microtask. This creates a timing challenge for Playwright:

1. User action (e.g., checkbox .check()) triggers state change
2. Svelte's `$derived` recalculates **immediately** (synchronous)
3. DOM updates are **scheduled** for next microtask (asynchronous)
4. Playwright action may execute before DOM updates

### The WRONG Approach: waitForTimeout

**NEVER use `page.waitForTimeout()` or `waitForLoadState('networkidle')`** - these are anti-patterns that:
- Make tests slower and flakier
- Don't actually verify the condition you care about
- Break when timing changes

### The RIGHT Approach: Await Observable Results

Instead of arbitrary timeouts, **wait for the specific DOM change you expect**:

```typescript
// ❌ WRONG: Arbitrary timeout
await page.getByTestId('filter').check();
await page.waitForTimeout(100); // Anti-pattern!
await page.getByTestId('result').click();

// ✅ RIGHT: Wait for observable result
await page.getByTestId('filter').check();
await expect(page.getByTestId('result')).toBeVisible(); // Auto-waits up to 5s
await page.getByTestId('result').click();
```

### Special Case: Checking Elements Before Actions

When you need to interact with an element that appears based on reactive state:

```typescript
// ✅ CORRECT: Assert visibility before clicking
const element = page.getByTestId('dynamic-element');
await expect(element).toBeVisible(); // Waits up to 5s for element
await element.click(); // Now safe to click
```

### Special Case: Waiting for Options in Select

When filtering changes a dropdown's options:

```typescript
// ✅ CORRECT: Wait for specific option to appear
await page.getByTestId('filter').check();
await expect(page.getByTestId('select').locator('option[value="PHX"]')).toBeAttached();
await page.getByTestId('select').selectOption('PHX');
```

## Core Principles

### 1. Always Use Data Attributes for Testability
**CRITICAL**: Every interactive element and key UI component MUST have a `data-testid` attribute.

#### When to Add data-testid
- All form inputs (checkboxes, selects, text inputs, radio buttons)
- All buttons (except purely decorative ones)
- All clickable elements that trigger state changes
- All containers that show/hide based on application state
- All elements that display dynamic data
- Any element that a test might need to verify or interact with

#### Naming Convention
Use kebab-case with descriptive, semantic names:
- `data-testid="departure-airport-select"` - Clear what it is and what it does
- `data-testid="atc-badge-twr"` - Position-specific, predictable pattern
- `data-testid="controller-callsign-{CALLSIGN}"` - Dynamic but consistent

**Good examples:**
```svelte
<select data-testid="departure-airport-select">
<input type="checkbox" data-testid="any-atc-departure-atc-filtering" />
<div data-testid="departure-group-{airport.vatsim_code}">
<button data-testid="clear-all-filters">
```

**Bad examples:**
```svelte
<select> <!-- Missing data-testid -->
<div data-testid="div-1"> <!-- Not semantic -->
<button data-testid="btn"> <!-- Not specific enough -->
```

### 2. Use Data Attributes for State Information
For elements with multiple states, use additional data attributes to expose state:

```svelte
<div 
  data-testid="atc-badge-twr"
  data-status="online"  <!-- or "offline" -->
>
```

This allows tests to verify state without fragile text matching:
```typescript
await expect(badge).toHaveAttribute('data-status', 'online');
```

### 3. Svelte 5 Event Handlers and Playwright Compatibility
**Known Limitation**: Svelte 5 uses `onclick` as the preferred event handler syntax (replacing deprecated `on:click`). However, Playwright tests have compatibility issues with `onclick` handlers.

#### Use onclick for Production Code
✅ **Correct Svelte 5 pattern:**
```svelte
<button onclick={() => doSomething()}>Click me</button>
```

❌ **Deprecated (Don't use):**
```svelte
<button on:click={() => doSomething()}>Click me</button>  <!-- Svelte 5 warns about this -->
```

#### Testing onclick Handlers in Playwright
Since `onclick` handlers don't reliably trigger in Playwright, use these workarounds:

**Option 1: Use `.click({ force: true })`** (for onclick buttons)
```typescript
await page.getByTestId('expand-button-PHX').click({ force: true });
```

**Option 2: Use native HTML controls where possible** (for forms)
```svelte
<!-- Prefer checkboxes/inputs with onchange - these work reliably -->
<input type="checkbox" onchange={handleChange} />
```

**Option 3: Add data-testid to clickable elements**
```svelte
<button 
  data-testid="expand-button-{id}"
  onclick={() => toggle()}
>
```

See `tests/e2e/expansion-collapse.spec.ts` for examples of testing `onclick` buttons.

### 4. Backfill Missing Data Attributes When Adding Tests
**Workflow when writing a new test:**
1. Identify the component you need to test
2. Check if required elements have `data-testid` attributes
3. If missing, add them to the component FIRST
4. Then write the test using the new attributes
5. Commit both the component changes and tests together

**Example workflow:**
```bash
# You want to test the filter clear button
# 1. Check the component
view src/lib/components/RouteFilterPanel.svelte

# 2. Add data-testid if missing
edit src/lib/components/RouteFilterPanel.svelte
# Add: data-testid="clear-all-filters"

# 3. Write the test
create tests/e2e/filter-clearing.spec.ts
# Use: page.getByTestId('clear-all-filters')
```

### 5. Use Role-Based Selectors as Fallback Only
While Playwright recommends role-based selectors, use `data-testid` as the primary selector:

✅ **Preferred:**
```typescript
await page.getByTestId('departure-airport-select').selectOption('PHX');
```

⚠️ **Fallback:**
```typescript
await page.getByRole('combobox', { name: 'From (Departure)' }).selectOption('PHX');
```

**Rationale**: `data-testid` is more stable and doesn't break when labels or ARIA attributes change.

## Testing Patterns

### Pattern 1: Filter Components
```svelte
<!-- Component -->
<select 
  data-testid="departure-airport-select"
  onchange={handleChange}
>
  <option value="">Any airport</option>
  {#each airports as airport}
    <option value={airport.vatsim_code}>{airport.city}</option>
  {/each}
</select>
```

```typescript
// Test
const select = page.getByTestId('departure-airport-select');
await select.selectOption('PHX');
await expect(select).toHaveValue('PHX');
```

### Pattern 2: Checkbox Toggles
```svelte
<!-- Component -->
<input
  type="checkbox"
  data-testid="any-atc-departure-atc-filtering"
  checked={anyATCChecked}
  onchange={handleChange}
/>
```

```typescript
// Test
const checkbox = page.getByTestId('any-atc-departure-atc-filtering');
await checkbox.check();
await expect(checkbox).toBeChecked();
```

### Pattern 3: Dynamic State Display
```svelte
<!-- Component -->
<div 
  data-testid="atc-badge-twr"
  data-status={online ? 'online' : 'offline'}
>
  {#if online}
    <div data-testid="controller-callsign-{controller.callsign}">
      {controller.callsign}
    </div>
  {/if}
</div>
```

```typescript
// Test
const badge = page.getByTestId('atc-badge-twr');
await expect(badge).toHaveAttribute('data-status', 'online');
await expect(page.getByTestId('controller-callsign-PHX_TWR')).toBeVisible();
```

### Pattern 4: Conditional Rendering
```svelte
<!-- Component -->
{#if hasActiveFilters}
  <div data-testid="active-routes-container">
    <!-- Routes display -->
  </div>
{:else}
  <div data-testid="filter-hint">
    💡 Select at least one filter to view routes
  </div>
{/if}
```

```typescript
// Test - No filters
await expect(page.getByTestId('filter-hint')).toBeVisible();
await expect(page.getByTestId('active-routes-container')).not.toBeVisible();

// Test - With filters
await page.getByTestId('any-atc-departure-atc-filtering').check();
await expect(page.getByTestId('active-routes-container')).toBeVisible();
await expect(page.getByTestId('filter-hint')).not.toBeVisible();
```

## Mock Data Requirements

### Always Mock External APIs
Never hit real APIs in E2E tests. Always use fixtures:

```typescript
import { mockVatsimDataWithControllers } from './fixtures/vatsim-data';

test.beforeEach(async ({ page }) => {
  await page.route('https://data.vatsim.net/v3/vatsim-data.json', async (route) => {
    await route.fulfill({ 
      status: 200, 
      body: JSON.stringify(mockVatsimDataWithControllers) 
    });
  });
});
```

## Test Organization

### File Structure
```
tests/
  e2e/
    fixtures/
      vatsim-data.ts          # Mock API data
    basic-functionality.spec.ts   # Core page functionality
    atc-filtering.spec.ts        # "Any ATC online" filter tests
    atc-level-filtering.spec.ts  # Specific ATC level tests
    atc-status-display.spec.ts   # ATC badge display tests
```

### Test Naming
Use descriptive test names that explain the behavior:

✅ **Good:**
```typescript
test('should filter departures by Tower level only', async ({ page }) => {
test('should combine multiple ATC levels for departure (Tower + Delivery)', async ({ page }) => {
```

❌ **Bad:**
```typescript
test('tower filter', async ({ page }) => {
test('test 1', async ({ page }) => {
```

## Checklist for New Components

Before considering a component "complete":
- [ ] All interactive elements have `data-testid` attributes
- [ ] State changes are exposed via data attributes (e.g., `data-status`)
- [ ] Uses `onchange` for inputs, not `onclick` for buttons (unless button is non-critical)
- [ ] E2E test exists that verifies core functionality
- [ ] Test uses mocked external data
- [ ] Test names clearly describe behavior being tested

## Checklist for New Tests

When writing a new test:
- [ ] Identified all elements the test needs to interact with
- [ ] Verified all elements have `data-testid` attributes (add if missing)
- [ ] Used `page.getByTestId()` as primary selector
- [ ] Mocked all external API calls
- [ ] Added meaningful assertions that verify behavior, not implementation
- [ ] Test name clearly describes what is being tested

## Common Pitfalls to Avoid

1. **Don't search by text content** - Use `data-testid` instead
   ```typescript
   // ❌ Fragile
   await page.getByText('Phoenix (PHX)').click();
   
   // ✅ Stable
   await page.getByTestId('departure-group-PHX').click();
   ```

2. **Don't use onclick for testable elements** - Use native events
   ```svelte
   <!-- ❌ Won't work in tests -->
   <button onclick={() => handleClick()}>Click</button>
   
   <!-- ✅ Works in tests -->
   <input type="checkbox" onchange={handleChange} />
   ```

3. **Don't skip VATSIM API mocking** - Always mock to avoid rate limits
   ```typescript
   // ❌ Will hit real API
   test('my test', async ({ page }) => {
     await page.goto('/');
   });
   
   // ✅ Mocked
   test('my test', async ({ page }) => {
     await page.route('https://data.vatsim.net/v3/vatsim-data.json', ...);
     await page.goto('/');
   });
   ```

4. **Don't use excessive waits** - Use minimal timeouts
   ```typescript
   // ❌ Slow
   await page.waitForTimeout(5000);
   
   // ✅ Fast
   await page.waitForTimeout(100);
   ```

## References

- Playwright Documentation: https://playwright.dev/
- Svelte 5 Documentation: https://svelte.dev/docs/svelte/overview
- See `.github/instructions/playwright.instructions.md` for Playwright-specific best practices
