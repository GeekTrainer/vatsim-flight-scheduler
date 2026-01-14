# VATSIM Flight Scheduler

A web application designed to help virtual pilots on the VATSIM network find Southwest Airlines routes with real-time ATC (Air Traffic Control) coverage across all positions.

## 🎯 Project Overview

This application displays flight routes between Southwest Airlines airports with live VATSIM controller data, helping pilots plan flights with comprehensive ATC coverage from departure to arrival.

## ✨ Features

- **1,219 Real Southwest Routes**: Browse actual Southwest Airlines route pairs
- **Advanced Filtering**: Filter by departure/arrival airports and specific ATC positions
- **Granular ATC Level Selection**: Choose specific positions (Center, Approach, Tower, Ground, Delivery)
- **Real-Time Controller Data**: Live updates every 30 seconds from VATSIM API
- **Detailed Controller Information**: View callsigns, frequencies, and online time
- **Pagination**: Browse routes with 25/50/100 per page options
- **Dark Mode**: Modern dark theme optimized for readability
- **Responsive Design**: Distinct mobile (card) and desktop (table) layouts
- **Filter-First UX**: Start with filters to find exactly what you need

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or later)
- npm or pnpm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser to `http://localhost:5173`

### Building for Production

```bash
npm run build
npm run preview
```

## 📁 Project Structure

```
vatsim-flight-scheduler/
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   ├── ATCLevelSelector.svelte      # ATC position selector UI
│   │   │   ├── ATCStatusDisplay.svelte      # Controller details accordion
│   │   │   ├── DepartureGroupedList.svelte  # Routes grouped by departure
│   │   │   ├── EmptyState.svelte            # Empty state UI
│   │   │   ├── LoadingState.svelte          # Loading indicator
│   │   │   ├── NetworkStatus.svelte         # VATSIM status display
│   │   │   ├── Pagination.svelte            # Pagination controls
│   │   │   ├── RouteCard.svelte             # Mobile route card layout
│   │   │   ├── RouteFilterPanel.svelte      # Main filter UI
│   │   │   ├── RouteRow.svelte              # Desktop route row layout
│   │   │   └── RouteTable.svelte            # Route display container
│   │   ├── data/
│   │   │   ├── airports.json                # 109 Southwest airports
│   │   │   └── routes.json                  # 1,219 route pairs
│   │   ├── types/
│   │   │   └── vatsim.ts                    # VATSIM API types
│   │   ├── utils/
│   │   │   ├── filter-utils.ts              # Shared filter state utilities
│   │   │   └── route-filter.ts              # Centralized route filtering
│   │   ├── atc-utils.ts                     # ATC coverage checking
│   │   ├── routes.ts                        # Route loading
│   │   ├── vatsim.ts                        # VATSIM API integration
│   │   ├── types.ts                         # Core interfaces
│   │   └── index.ts                         # Public API exports
│   └── routes/
│       ├── +layout.svelte                   # Root layout
│       └── +page.svelte                     # Main page (filter-first UX)
├── tests/
│   └── e2e/                                 # Playwright E2E tests (72 tests)
│       ├── fixtures/                        # Mock VATSIM data
│       └── helpers/                         # Test utilities
├── scripts/                                  # Data migration tools
├── archive/                                  # Legacy Python data scripts
├── ARCHITECTURE.md                           # Clean architecture docs
├── PRD.md                                    # Product requirements
├── TESTING.md                                # Testing strategy & TDD
└── README.md                                 # This file
```

## 🛠️ Tech Stack

- **Framework**: SvelteKit 5 (with runes - $state, $derived, $effect)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS v4
- **Testing**: 
  - Vitest for unit tests (43 tests passing)
  - Playwright for E2E tests (72 tests passing)
- **Data**: JSON-based (client-side, no backend required)
- **Architecture**: Clean separation of concerns with DRY principles

## 📊 Data Structure

### Core Interfaces

#### Airport
```typescript
interface Airport {
  icao: string;         // ICAO code (e.g., "KLAS") - use for DEL/GND/TWR/APP lookups
  vatsim_code: string;  // VATSIM code (e.g., "LAS") - use for callsign matching
  city: string;         // City name
  name: string;         // Full airport name
  artcc: string;        // ARTCC code (e.g., "ZLA") - use for CTR lookups
}
```

#### Route
```typescript
interface Route {
  id: string;           // Unique route identifier
  departure: Airport;   // Departure airport
  arrival: Airport;     // Arrival airport
}
```

#### Controller Positions
```typescript
enum ControllerPosition {
  DEL = 'DEL',  // Delivery (Clearance Delivery)
  GND = 'GND',  // Ground
  TWR = 'TWR',  // Tower
  APP = 'APP',  // Approach/Departure
  CTR = 'CTR'   // Center (ARTCC)
}
```

### Data Flow

```
User Interaction → Filter State → Route Filtering → Display

1. User selects filters (airport, ATC level, etc.)
   ↓
2. Filter state updates (Svelte 5 $state runes)
   ↓
3. $derived recomputes filtered routes using filterRoutes()
   ↓
4. Routes are grouped by departure airport
   ↓
5. VATSIM data refreshes every 30s via $effect()
   ↓
6. ATC status updates trigger re-render
```

**Key Design Patterns:**
- **Reactive State**: Svelte 5 runes ($state, $derived, $effect)
- **Centralized Filtering**: `filterRoutes()` in `route-filter.ts`
- **Cached API Calls**: 30-second VATSIM data cache
- **Component Composition**: Small, focused components with clear responsibilities

## 🗺️ Feature Status

### ✅ Completed
- **Phase 1 (MVP)**
  - ✅ Display routes with ARTCC information
  - ✅ Dark mode UI
  - ✅ Responsive design (mobile + desktop)

- **Phase 2 (Real-Time Integration)**
  - ✅ VATSIM API integration
  - ✅ Live controller data across all 5 positions
  - ✅ Controller details (callsign, frequency, online time)
  - ✅ 30-second auto-refresh
  - ✅ Consolidated TRACON support

- **Phase 3 (Filtering)**
  - ✅ Filter by departure/arrival airports
  - ✅ Granular ATC level filtering (CTR/APP/TWR/GND/DEL)
  - ✅ Separate filters for departure vs arrival
  - ✅ Dynamic airport availability based on filters
  - ✅ Pagination (25/50/100 per page)

### 🔮 Future Enhancements
- [ ] Route sorting (by distance, ATC coverage, etc.)
- [ ] Flight distance and duration estimates
- [ ] Search by ICAO code
- [ ] User accounts and saved preferences
- [ ] Weather integration (METAR/TAF)
- [ ] Multiple airline support
- [ ] Flight planning tools
- [ ] Controller ATIS display

## 📄 Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) - Clean architecture and separation of concerns
- [PRD.md](PRD.md) - Complete product requirements document
- [TESTING.md](TESTING.md) - Testing strategy and TDD approach

## 🎮 About VATSIM

VATSIM (Virtual Air Traffic Simulation Network) is a volunteer-run network providing realistic air traffic control for flight simulation enthusiasts. Since not all ATC positions are staffed at all times, this tool helps pilots find routes where controllers are active.

## 🧪 Testing

Run the test suites:
```bash
# Unit tests (Vitest)
npm test          # Watch mode
npm run test:run  # Single run

# E2E tests (Playwright)
npm run test:e2e  # Run all E2E tests

# TypeScript checks
npm run check     # Validate types and compilation
```

Current status: 
- ✅ **43/43 unit tests passing**
- ✅ **72/72 E2E tests passing**
- ✅ **0 TypeScript errors**

## 📝 License

This project is for educational and entertainment purposes.

## 🤝 Contributing

This is currently a personal project, but suggestions and feedback are welcome!

### For Developers

#### Key Architecture Concepts

**Airport Code Duality Pattern** 🔑
Airports use TWO different codes for different purposes:
- `vatsim_code` (e.g., "PHX") - Use for airport selection, route matching, user-facing displays
- `icao` (e.g., "KPHX") - Use for DEL/GND/TWR/APP controller lookups
- `artcc` (e.g., "ZAB") - Use ONLY for CTR (center) controller lookups

**Filter-First UX Pattern** 🎯
The app intentionally shows no routes until filters are applied. This prevents overwhelming users with 1,219 routes and encourages purposeful exploration.

**Consolidated TRACON Facilities** 🛫
Large approach facilities (SOCAL, N90, NORCAL) serve multiple airports. When matching APP controllers, check both airport-specific and consolidated facilities. See `CONSOLIDATED_APPROACH_FACILITIES` in `src/lib/vatsim.ts`.

**30-Second VATSIM Cache** ⏱️
All VATSIM API calls are cached for 30 seconds to avoid rate limiting. Always use `fetchVatsimData()`, never fetch the API directly.

**DRY Utilities** 🔧
Filter logic is centralized in `src/lib/utils/`:
- `filter-utils.ts` - Shared filter state management
- `route-filter.ts` - Centralized route filtering logic

#### Code Style
- Use Svelte 5 runes (`$state`, `$derived`, `$effect`) - no legacy stores
- Add `data-testid` attributes to all interactive and testable elements
- Follow TypeScript strict mode - all types must be explicit
- Keep components focused and small (extract new components vs. bloating existing ones)

#### Testing Requirements
Before merging to main:
- ✅ All 43 unit tests must pass: `npm run test:run`
- ✅ All 72 E2E tests must pass: `npm run test:e2e`
- ✅ TypeScript must be clean: `npm run check`

See [TESTING.md](TESTING.md) for comprehensive testing guidelines.

---

**Note**: This application is not affiliated with VATSIM, Southwest Airlines, or any official aviation authority. It is a community tool for flight simulation enthusiasts.
