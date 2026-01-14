# Architecture & Separation of Concerns

This document explains how the codebase follows Svelte 5 best practices for clean architecture and separation of concerns.

## Core Principles

Following Svelte 5 best practices, we maintain clear boundaries between:

1. **Business Logic** - Pure TypeScript functions in `/src/lib/`
2. **Presentation Components** - Svelte components focused on UI rendering
3. **State Management** - Svelte 5 runes (`$state`, `$derived`, `$effect`)
4. **Data Fetching** - API integration with caching

## Module Organization

### `/src/lib/` - Business Logic Layer

Pure TypeScript modules containing reusable business logic:

#### `atc-utils.ts` - ATC Business Logic
Centralized utilities for ATC (Air Traffic Control) operations:

- `hasAnyControllers()` - Checks if a location has active controllers
- `getUniqueAirports()` - Extracts and filters unique airports from routes
- `filterRoutes()` - Applies multiple filter criteria to routes

**Why separate?**
- Eliminates code duplication across components
- Makes logic testable without mounting components
- Follows single responsibility principle
- Enables easy reuse across multiple components

#### `routes.ts` - Route Generation Logic
Route generation algorithm and airport data access:

- `generateRoutes()` - Creates diverse route pairings with geographic distribution
- `airports` - Export of airport database

**Why separate?**
- Complex algorithm independent of UI
- Can be tested in isolation
- Used by multiple consumers

#### `vatsim.ts` - VATSIM API Integration
Network data fetching with intelligent caching:

- `fetchVatsimData()` - Fetches VATSIM network data with 30s cache
- `getLocationControllers()` - Processes raw controller data into structured map
- Controller matching logic for consolidated TRACONs

**Why separate?**
- Encapsulates external API details
- Provides caching layer
- Business logic for controller position mapping
- Shared across all components that need VATSIM data

#### `types.ts` & `types/vatsim.ts` - Type Definitions
TypeScript interfaces and enums:

- `Airport`, `Route` interfaces
- `VatsimData`, `ATCController` interfaces
- `ControllerPosition` enum

**Why separate?**
- Shared type safety across entire app
- Single source of truth for data structures
- Enables proper type checking

### `/src/lib/components/` - Presentation Layer

Svelte components focused on rendering and user interaction:

#### Container Components
- `RouteTable.svelte` - Layout switcher (mobile/desktop)
- `+page.svelte` - Page-level state orchestration

**Responsibilities:**
- Manage local UI state with `$state()`
- Call business logic functions
- Pass props to child components
- Handle side effects with `$effect()`

#### Presentation Components
- `RouteRow.svelte` - Desktop table row rendering
- `RouteCard.svelte` - Mobile card rendering
- `ATCStatusDisplay.svelte` - ATC badge and accordion
- `DepartureFilter.svelte` / `ArrivalFilter.svelte` - Filter controls
- `LoadingState.svelte` / `EmptyState.svelte` / `NetworkStatus.svelte` - UI states

**Responsibilities:**
- Pure presentation - render props into DOM
- Minimal local state (UI-only state like `isExpanded`)
- Use `$derived()` for view-specific computations
- Emit events or use `$bindable()` for two-way binding

## Data Flow

```
┌─────────────────────────────────────────────────────────┐
│ +page.svelte (Orchestration Layer)                       │
│                                                           │
│ • Fetches VATSIM data via vatsim.ts                       │
│ • Generates routes via routes.ts                          │
│ • Manages filter state ($state)                           │
│ • Computes filtered routes ($derived + atc-utils.ts)      │
└───────────────────┬─────────────────────────────────────┘
                    │ Props ↓
                    │
    ┌───────────────┼───────────────┐
    │               │               │
    ▼               ▼               ▼
┌─────────┐   ┌──────────┐   ┌──────────────┐
│ Filters │   │RouteTable│   │NetworkStatus │
│         │   │          │   │              │
│• Uses   │   │• Layout  │   │• Display     │
│  atc-   │   │  switch  │   │  stats       │
│  utils  │   │          │   │              │
└─────────┘   └────┬─────┘   └──────────────┘
                   │
           ┌───────┴───────┐
           │               │
           ▼               ▼
      ┌─────────┐    ┌─────────┐
      │RouteRow │    │RouteCard│
      │         │    │         │
      │• Desktop│    │• Mobile │
      │  view   │    │  view   │
      └────┬────┘    └────┬────┘
           │              │
           └──────┬───────┘
                  │
                  ▼
          ┌───────────────┐
          │ATCStatusDisplay│
          │                │
          │• Reusable      │
          │  across both   │
          │  views         │
          └────────────────┘
```

## Best Practices Applied

### ✅ Extracted Reusable Logic
- **Before:** `hasAnyControllers()` duplicated in 3 files
- **After:** Single source in `atc-utils.ts`

### ✅ Composable Functions
```typescript
// Business logic is pure functions
export function filterRoutes(routes, controllers, filters) {
  // Pure function - no side effects
  return routes.filter(route => {
    // Uses hasAnyControllers() internally
  });
}
```

### ✅ Components Use, Don't Contain Logic
```svelte
<!-- Component calls utility, doesn't implement -->
const filteredRoutes = $derived.by(() => {
  return filterRoutes(routes, locationControllers, {
    showOnlyDepartureWithATC,
    showOnlyArrivalWithATC,
    selectedDeparture,
    selectedArrival
  });
});
```

### ✅ Single Responsibility
Each module has one clear purpose:
- `atc-utils.ts` - ATC operations
- `routes.ts` - Route generation
- `vatsim.ts` - Network data
- Components - UI rendering only

### ✅ Testability
Pure functions in `/src/lib/` can be tested without:
- Mounting components
- Mocking browser APIs
- Complex setup

### ✅ Svelte 5 Runes Properly Used
- `$state()` - Local component state only
- `$derived()` - View-specific computations
- `$effect()` - Side effects (API calls, timers)
- `$bindable()` - Two-way binding between components
- No legacy stores - modern runes-based reactivity

## Adding New Features

### When to add logic to a TypeScript module:
- Business rule that could be tested independently
- Logic shared across multiple components
- Complex algorithm or data transformation
- Anything that doesn't directly manipulate DOM

### When to keep logic in a component:
- UI-specific state (accordion expanded, modal open)
- DOM measurements or animations
- Event handler coordination
- View-specific derived values from props

### Example: Adding Flight Duration Calculation

**❌ Wrong - In Component:**
```svelte
<script>
  function calculateFlightTime(departure, arrival) {
    // Complex calculation logic in component
  }
</script>
```

**✅ Right - In Utility Module:**
```typescript
// src/lib/flight-utils.ts
export function calculateFlightTime(
  departure: Airport,
  arrival: Airport
): number {
  // Complex calculation logic
}

// Component just calls it:
const flightTime = $derived(calculateFlightTime(route.departure, route.arrival));
```

## References

- [Svelte 5 Runes Documentation](https://svelte.dev/docs/svelte/runes)
- [SvelteKit Best Practices](https://kit.svelte.dev/docs/best-practices)
- Project Instructions: `.github/instructions/svelte.instructions.md`
- Project Context: `.github/copilot-instructions.md`
