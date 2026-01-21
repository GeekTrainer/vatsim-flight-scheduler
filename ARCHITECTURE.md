# Architecture

This document outlines the architecture and design patterns used in the VATSIM Flight Scheduler.

## Core Principles

1. **Separation of Concerns** - Business logic separate from UI components
2. **Pure Functions** - Testable utilities without side effects  
3. **Svelte 5 Runes** - Modern reactivity with `$state`, `$derived`, `$effect`
4. **Type Safety** - Strict TypeScript throughout

## Project Structure

```
src/lib/
├── components/      # Svelte UI components
├── data/           # JSON data (airports, routes)
├── utils/          # Utility functions
├── types/          # TypeScript interfaces
├── atc-utils.ts    # ATC business logic
├── routes.ts       # Route loading
└── vatsim.ts       # VATSIM API integration
```

## Key Modules

### Business Logic (`/src/lib/`)

**`vatsim.ts`** - VATSIM API integration
- Fetches controller data with 30-second caching
- Parses controller positions and callsigns
- Handles consolidated TRACON facilities

**`routes.ts`** - Route data
- Loads routes from JSON
- Provides airport database access

**`atc-utils.ts`** - ATC utilities
- Checks controller availability
- Filters airports and routes by ATC coverage

**`utils/`** - Shared utilities
- `route-filter.ts` - Centralized route filtering
- `filter-utils.ts` - Filter state management
- `controller-parser.ts` - Controller data parsing
- `filter-airports.ts` - Airport filtering

### Components (`/src/lib/components/`)

**Container Components**
- `DepartureGroupedList.svelte` - Main route display
- `RouteFilterPanel.svelte` - Filter controls

**Presentation Components**  
- `RouteRow.svelte` / `RouteCard.svelte` - Route display (desktop/mobile)
- `ATCStatusDisplay.svelte` - Controller information
- `ATCBadge.svelte` - Position badges
- UI state components (Loading, Empty, Network status)

## Data Flow

```
User Input → Filter State → Route Filtering → Grouped Display

1. User selects filters (airports, ATC levels)
2. Filter state updates via $state runes
3. $derived recomputes filtered routes
4. Routes grouped by departure airport
5. VATSIM data refreshes every 30s
```

## Design Patterns

### Airport Code Duality
Airports use different codes for different lookups:
- `icao` (e.g., "KPHX") - For DEL/GND/TWR/APP controllers
- `vatsim_code` (e.g., "PHX") - For route matching
- `artcc` (e.g., "ZAB") - For CTR (center) controllers

### VATSIM Data Caching
- API responses cached for 30 seconds
- Prevents rate limiting
- Auto-refresh via `$effect()` hook

### Centralized Filtering
All route filtering logic lives in `utils/route-filter.ts`:
- Single source of truth
- Easier to test and maintain
- Used by multiple components

## Svelte 5 Patterns

### State Management
```typescript
// Reactive state
let selectedAirport = $state<string | null>(null);

// Computed values
const filteredRoutes = $derived.by(() => 
  filterRoutes(allRoutes, locationControllers, filters)
);

// Side effects
$effect(() => {
  const interval = setInterval(loadVatsimData, 30000);
  return () => clearInterval(interval);
});
```

### Component Props
```typescript
let { route, locationControllers }: {
  route: Route;
  locationControllers: Map<...>;
} = $props();
```

## Testing

- **Unit tests** - Business logic in `src/lib/*.test.ts`
- **E2E tests** - User flows with Playwright
- All interactive elements have `data-testid` attributes

See [TESTING.md](TESTING.md) for details.
