# VATSIM Flight Scheduler - Copilot Instructions

## Project Overview
A SvelteKit app that helps VATSIM virtual pilots find Southwest Airlines routes with real-time ATC (Air Traffic Control) coverage. Displays 1,219 routes between 109 Southwest airports with live controller data across all positions (Delivery, Ground, Tower, Approach, Center).

## AI Notes

- **DO NOT** create summary documents of work completed
- **DO NOT** merge branches to main unless ALL tests pass (unit tests AND E2E tests)
- **CRITICAL**: **DO NOT** merge any branch to main without explicit human approval, even if all tests pass

## Testing Requirements

### Before Merging to Main
- ✅ All unit tests must pass: `npm test` (currently 43/43)
- ✅ All E2E tests must pass: `npm run test:e2e` (currently 72/72)
- ✅ TypeScript must be clean: `npm run check` (0 errors)

### Test Data Attributes
**CRITICAL**: Add `data-testid` attributes to components for reliable E2E testing:
- Use semantic, descriptive test IDs (e.g., `data-testid="route-row-PHX-LAS"`)
- Add to interactive elements (buttons, inputs, selects)
- Add to containers that display dynamic data (route rows, ATC badges)
- Format: `data-testid="component-purpose-identifier"`

Examples:
```svelte
<!-- Route display -->
<div data-testid="route-row-{route.departure.vatsim_code}-{route.arrival.vatsim_code}">

<!-- Filter controls -->
<select data-testid="filter-departure-airport">
<button data-testid="filter-clear-all">

<!-- ATC badges -->
<button data-testid="atc-badge-{position}-{airport.vatsim_code}">
```

## Architecture & Data Flow

### Airport Code Duality Pattern
**Critical**: Airports use TWO different codes for different lookup purposes:
- `icao`: Standard ICAO code (e.g., "KLAS") - use for DEL/GND/TWR/APP controller lookups
- `vatsim_code`: VATSIM facility code (e.g., "LAS") - use for callsign matching
- `artcc`: ARTCC code (e.g., "ZLA") - use ONLY for CTR (center) controller lookups

See [src/lib/types.ts](src/lib/types.ts#L1-L8) for the Airport interface.

### VATSIM Data Integration
**Controller Matching Logic** ([src/lib/vatsim.ts](src/lib/vatsim.ts)):
1. API provides `callsign` (e.g., "BOS_TWR", "SOCAL_APP", "SEA_161_CTR") and `facility` number (2-6)
2. Extract location code from callsign using `vatsim_code` for matching
3. Map facility types: 2=DEL, 3=GND, 4=TWR, 5=APP, 6=CTR
4. Handle consolidated TRACONs (e.g., SOCAL covers LAX/SAN/SNA, N90 covers NYC area)
5. Store controllers in nested Map: `Map<location_code, Map<ControllerPosition, ATCController[]>>`

**Consolidated TRACON Facilities** (lines 14-46):
- Large TRACONs like SOCAL, NORCAL, N90, A90 serve multiple airports
- When matching APP controllers, check both airport-specific and consolidated facilities
- Example: LAX is covered by both "LAX_APP" and "SOCAL_APP"

### Caching Strategy
**30-Second Cache** ([src/lib/vatsim.ts](src/lib/vatsim.ts#L6-L9)):
- VATSIM API cached for 30s to reduce network calls
- Frontend auto-refreshes every 30s via `$effect()` in [+page.svelte](src/routes/+page.svelte#L31-L36)
- Always check cache timestamp before fetching fresh data

## Component Patterns

### Responsive Design Approach
**Desktop vs Mobile** ([src/lib/components/RouteRow.svelte](src/lib/components/RouteRow.svelte), [RouteCard.svelte](src/lib/components/RouteCard.svelte)):
- Desktop: Table-based layout with RouteRow (horizontal)
- Mobile: Card-based layout with RouteCard (vertical stack)
- Media query switches at `md:` breakpoint
- DO NOT create hybrid components - keep separate for clarity

### Component Extraction Philosophy
**Keep components focused and small** - extract new components instead of adding more code to existing ones:
- [RouteTable.svelte](src/lib/components/RouteTable.svelte) is a **thin container** (~60 lines) - only handles layout switching and iteration
- [RouteRow.svelte](src/lib/components/RouteRow.svelte) and [RouteCard.svelte](src/lib/components/RouteCard.svelte) handle **individual route rendering**
- [ATCStatusDisplay.svelte](src/lib/components/ATCStatusDisplay.svelte) is **reusable** across both row and card views

**When to create a new component:**
- Any distinct UI pattern that could be reused (like ATC status display)
- When a component exceeds ~100-150 lines - look for extraction opportunities
- When adding new features to RouteTable/RouteRow/RouteCard - consider if it should be its own component
- Example: If adding flight time estimates, create `FlightTimeDisplay.svelte`, don't embed in RouteRow

### State Management with Svelte 5 Runes
Use Svelte 5's modern state system throughout:
```typescript
let isExpanded = $state(false);        // Reactive state
let filtered = $derived.by(() => {...}); // Computed values
$effect(() => {...});                  // Side effects (timers, API calls)
```
See [+page.svelte](src/routes/+page.svelte#L11-L15) for examples.

### ATC Status Display Component
[ATCStatusDisplay.svelte](src/lib/components/ATCStatusDisplay.svelte) is reusable across RouteRow/RouteCard:
- Requires BOTH `icao` (for airport positions) and `artcc` (for center lookup)
- Displays 5 position badges: CTR, APP, TWR, GND, DEL
- Accordion expands to show controller details (callsign, frequency, time online)
- Color-coded badges: green=CTR, blue=APP, red=TWR, yellow=GND, purple=DEL

## Development Workflows

### Running the App
```bash
npm run dev          # Dev server on http://localhost:5173
npm run build        # Production build
npm run preview      # Preview production build
npm run check        # TypeScript/Svelte validation
```

### Data Processing (Archive)
Legacy Python scripts in [archive/](archive/):
- `parse-airports.py`: Converts FAA data to airport JSON
- `create-southwest-airports.py`: Filters Southwest-served airports
- Run these ONLY if updating the airport database

## Key Files Reference

**Core Logic:**
- [src/lib/routes.ts](src/lib/routes.ts) - Route loading from real Southwest Airlines route data
- [src/lib/vatsim.ts](src/lib/vatsim.ts) - VATSIM API client, controller matching, TRACON mappings
- [src/lib/types.ts](src/lib/types.ts) - TypeScript interfaces for Airport/Route/LocationControllers

**Components:**
- [src/lib/components/ATCStatusDisplay.svelte](src/lib/components/ATCStatusDisplay.svelte) - Reusable ATC badge/accordion
- [src/lib/components/RouteRow.svelte](src/lib/components/RouteRow.svelte) - Desktop table row
- [src/lib/components/RouteCard.svelte](src/lib/components/RouteCard.svelte) - Mobile card layout

**Data:**
- [src/lib/data/airports.json](src/lib/data/airports.json) - 109 Southwest airports with ICAO/VATSIM/ARTCC codes
- [src/lib/data/routes.json](src/lib/data/routes.json) - 1,219 Southwest route pairs

**Test Helpers:**
- [tests/e2e/helpers/assertions.ts](tests/e2e/helpers/assertions.ts) - Shared test assertion helpers
- [tests/e2e/helpers/setup.ts](tests/e2e/helpers/setup.ts) - Test setup utilities

**Pages:**
- [src/routes/+page.svelte](src/routes/+page.svelte) - Main landing page with filtering and stats

## Code Quality & DRY Principles

### Type Safety
- **Use `LocationControllers` type alias**: Import from `$lib/types` instead of verbose `Map<string, Map<ControllerPosition, ATCController[]>>`
- **Strict TypeScript**: All components use explicit types, no `any` types allowed

### CSS Utilities (src/routes/layout.css)
Centralized utility classes to avoid inline duplication:
- `.airport-code` - Airport code styling (lg, semibold, white)
- `.airport-code-mono` - Monospace variant for ICAO codes
- `.city-label` - City name styling (xs, gray-300)
- `.section-header` - Section header styling (xs, gray-400, uppercase)
- `.label-md` - Main filter section headers (xl, bold, centered)
- ATC color classes: `.atc-ctr-active`, `.atc-app-active`, `.atc-twr-active`, `.atc-gnd-active`, `.atc-del-active`

### Test Helpers
- **Use shared helpers**: Import from `tests/e2e/helpers/assertions.ts` for common test patterns
- `expectATCLevelButtonActive()` - Check ATC level button state
- `expectATCBadgeStatus()` - Verify ATC badge online/offline status
- **Don't duplicate helpers**: Extract to shared module if used in 2+ test files

## Common Pitfalls

1. **Don't confuse airport codes**: Use `icao` for airport ATC, `artcc` for center, `vatsim_code` for callsign matching
2. **Don't bypass caching**: Always use `fetchVatsimData()`, never fetch API directly
3. **Don't ignore consolidated TRACONs**: APP controllers may use facility-level callsigns (SOCAL, N90)
4. **Don't use Svelte 4 syntax**: This is Svelte 5 - use runes (`$state`, `$derived`, `$effect`)
5. **Don't create unnecessary API calls**: Leverage the 30s cache and shared state in +page.svelte
6. **Don't bloat existing components**: Extract new components instead of making RouteTable/RouteRow/RouteCard larger
7. **Don't use verbose types**: Use `LocationControllers` instead of the full Map type
8. **Don't inline repeated CSS**: Use centralized utility classes from layout.css
