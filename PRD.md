# Product Requirements Document (PRD)
## VATSIM Flight Scheduler - Virtual Southwest Airlines

### 1. Overview

**Product Name:** VATSIM Flight Scheduler  
**Version:** 1.0 (MVP)  
**Date:** January 3, 2026  
**Author:** Product Team

### 2. Product Vision

The VATSIM Flight Scheduler is a web application designed to help virtual pilots on the VATSIM network (Virtual Air Traffic Simulation Network) discover and select flight routes based on real-time air traffic controller availability across all ATC positions (Delivery, Ground, Tower, Approach, and Center). The application focuses on Virtual Southwest Airlines routes and provides live updates on controller staffing.

### 3. Problem Statement

VATSIM is a volunteer-run virtual air traffic control network where ATC positions are not always staffed. Virtual pilots currently lack an easy way to:
- Identify which airports have active ATC coverage across all positions (DEL, GND, TWR, APP, CTR)
- See real-time controller information including callsigns, frequencies, and online duration
- Plan routes that provide a realistic ATC experience from departure to arrival
- Discover flight opportunities with comprehensive controller coverage

### 4. Target Audience

- **Primary:** VATSIM virtual pilots who fly Southwest Airlines routes
- **Secondary:** Flight simulation enthusiasts looking for ATC-covered routes

### 5. Goals & Success Metrics

**MVP Goals:**
- Display 20+ Southwest Airlines routes with real-time ATC position information
- Show live controller data across all positions: Delivery (DEL), Ground (GND), Tower (TWR), Approach (APP), Center (CTR)
- Provide a clean, modern interface for route browsing with expandable controller details
- Auto-refresh controller data every 30 seconds for real-time accuracy

**Success Metrics:**
- User engagement with route listings
- Page load performance (<2s initial load)
- Mobile and desktop accessibility

### 6. Scope

#### 6.1 In Scope (MVP - v1.0)

**Core Features:**
1. **Route Display**
   - Show list of 20 pre-generated Southwest Airlines routes
   - Display departure and arrival cities with ICAO codes
   - Real-time ATC position status for each airport (DEL, GND, TWR, APP, CTR)
   - Visual indicators showing online/offline status for each ATC position

2. **Live Controller Information**
   - Integration with VATSIM live data API
   - Expandable accordion showing detailed controller information:
     * Controller callsign
     * Radio frequency
     * Time online (updated in real-time)
   - Support for consolidated TRACON facilities (SOCAL, NORCAL, N90, etc.)
   - 30-second auto-refresh for current data

3. **User Interface**
   - Modern, clean design using Tailwind CSS v4
   - Dark mode theme optimized for readability
   - Responsive layout with distinct mobile (card) and desktop (table) views
   - Color-coded position badges for quick status identification
   - Clickable accordion controls for detailed controller information

4. **Data Management**
   - JSON-based airport database (70 Southwest airports)
   - Route generation algorithm ensuring variety in cities and ARTCC coverage
   - ARTCC (Air Route Traffic Control Center) mapping for center controllers
   - Support for consolidated approach facilities covering multiple airports

**Technical Stack:**
- **Framework:** SvelteKit
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Data Format:** CSV (or JSON if migrated)

#### 6.2 Out of Scope (Future Versions)

- Route filtering by city or ICAO code
- Route filtering by active controllers or ATC coverage level
- Sorting routes by ATC coverage
- User accounts and saved preferences
- Flight planning tools (route calculation, fuel planning)
- Weather integration (METAR/TAF display)
- Flight booking/scheduling system
- Multiple airline support (United, American, Delta, etc.)
- Advanced search functionality
- Route favoriting and history
- Controller ATIS display
- Airport charts and procedures

### 7. Functional Requirements

#### FR-1: Route Display
**Priority:** P0 (Critical)

- The application SHALL display a list of 20 Southwest Airlines routes on the landing page
- Each route SHALL include:
  - Departure city name and ICAO code
  - Arrival city name and ICAO code
  - Real-time ATC position status indicators (DEL, GND, TWR, APP, CTR) for both departure and arrival
  - Expandable controller details showing callsign, frequency, and online time
- Routes SHALL be generated from the Southwest airports JSON data
- Routes SHALL feature variety in cities and ARTCC coverage
- Routes SHALL display in both desktop (table) and mobile (card) responsive formats

#### FR-2: Real-Time ATC Data Integration
**Priority:** P0 (Critical)

- The application SHALL fetch live controller data from VATSIM API (https://data.vatsim.net/v3/vatsim-data.json)
- The application SHALL process controller data for all ATC positions (facility types 2-6):
  - Delivery (facility 2)
  - Ground (facility 3)
  - Tower (facility 4)
  - Approach (facility 5)
  - Center (facility 6)
- The application SHALL cache API responses for 30 seconds to minimize network requests
- The application SHALL auto-refresh controller data every 30 seconds
- The application SHALL map controllers to airports based on callsign parsing
- The application SHALL support consolidated TRACON facilities (SOCAL, NORCAL, N90, etc.)
- The application SHALL display last update timestamp to users
- The application SHALL show online controller count

#### FR-3: Data Management
**Priority:** P0 (Critical)

- Airport data SHALL be stored in JSON format
- Data SHALL include: ICAO code, VATSIM code, city name, airport name, ARTCC code
- The application SHALL read and parse airport data at build time
- Data file SHALL be located in `src/lib/data/airports.json`

#### FR-4: User Interface
**Priority:** P0 (Critical)

- The landing page SHALL display routes in a clear, scannable format
- The UI SHALL use dark mode theme by default
- The design SHALL follow modern web design principles using Tailwind CSS v4
- The layout SHALL be responsive with distinct views:
  - Desktop: Table layout with columns for Departure, ATC Status, Arrival, ATC Status
  - Mobile: Card layout with departure and arrival stacked vertically
- ATC position badges SHALL use color coding:
  - CTR (Center): Green
  - APP (Approach): Blue
  - TWR (Tower): Red
  - GND (Ground): Yellow
  - DEL (Delivery): Purple
- Position badges SHALL show online status with:
  - Bold colored text and pulsing indicator when online
  - Grayed out appearance when offline
- Controller details SHALL be expandable via accordion interface
- The header SHALL display:
  - Application title and description
  - Total online controller count
  - Last data update timestamp
  - Loading indicator during data refresh

### 8. Non-Functional Requirements

#### NFR-1: Performance
- Initial page load SHALL complete in under 2 seconds
- Route rendering SHALL be smooth with no layout shifts

#### NFR-2: Accessibility
- Application SHALL meet WCAG 2.1 Level AA standards
- Dark mode SHALL maintain sufficient contrast ratios
- Interactive elements SHALL be keyboard accessible

#### NFR-3: Browser Compatibility
- Application SHALL support latest 2 versions of Chrome, Firefox, Safari, Edge
- Mobile browsers SHALL be supported (iOS Safari, Chrome Mobile)

#### NFR-4: Code Quality
- TypeScript SHALL be used for type safety
- Code SHALL follow SvelteKit best practices
- Components SHALL be modular and reusable

### 9. User Stories

**US-1:** As a virtual pilot, I want to see available Southwest routes so that I can choose where to fly.

**US-2:** As a virtual pilot, I want to see real-time ATC position status for each airport so that I can choose routes with active controller coverage.

**US-3:** As a virtual pilot, I want to view detailed controller information (callsign, frequency, online time) so that I can properly contact ATC during my flight.

**US-4:** As a mobile user, I want to browse routes on my phone so that I can plan flights while away from my PC.

**US-5:** As a virtual pilot, I want to see which ATC positions are online (DEL, GND, TWR, APP, CTR) so that I can anticipate the level of ATC service available for my flight.

### 10. Technical Architecture

#### 10.1 Data Layer
```
src/lib/data/
  └── airports.json (70 Southwest airports with ICAO, VATSIM codes, ARTCC)
```

#### 10.2 Application Structure
```
src/
  ├── routes/
  │   ├── +layout.svelte (Root layout with favicon)
  │   └── +page.svelte (Landing page with data fetching)
  ├── lib/
  │   ├── data/
  │   │   └── airports.json (Airport database)
  │   ├── components/
  │   │   ├── RouteTable.svelte (Main container - mobile/desktop views)
  │   │   ├── RouteCard.svelte (Mobile card view for single route)
  │   │   ├── RouteRow.svelte (Desktop table row for single route)
  │   │   └── ATCStatusDisplay.svelte (ATC position badges & accordion)
  │   ├── types/
  │   │   └── vatsim.ts (VATSIM API types and enums)
  │   ├── types.ts (Airport and Route interfaces)
  │   ├── routes.ts (Airport data import & route generation)
  │   └── vatsim.ts (VATSIM API integration & controller processing)
  └── app.html (Root HTML template)
```

#### 10.3 Data Model

**Airport Interface:**
```typescript
interface Airport {
  icao: string;         // Standard ICAO code (e.g., "KLAS")
  vatsim_code: string;  // VATSIM facility code (e.g., "LAS")
  city: string;         // City name (e.g., "Las Vegas")
  name: string;         // Airport name (e.g., "McCarran International")
  artcc: string;        // ARTCC code (e.g., "ZLA")
}
```

**Route Interface:**
```typescript
interface Route {
  id: string;           // Unique route identifier
  departure: Airport;   // Departure airport
  arrival: Airport;     // Arrival airport
}
```

**Controller Position Enum:**
```typescript
enum ControllerPosition {
  DEL = 'DEL',  // Delivery
  GND = 'GND',  // Ground
  TWR = 'TWR',  // Tower
  APP = 'APP',  // Approach/Departure
  CTR = 'CTR'   // Center (ARTCC)
}
```

**Controller Interface:**
```typescript
interface Controller {
  callsign: string;           // e.g., "KLAX_TWR"
  name: string;               // Controller name
  frequency: string;          // Radio frequency
  onlineTimeMinutes: number;  // Duration online
  position: ControllerPosition;
}
```

**Location Controllers Map:**
```typescript
Map<string, Map<ControllerPosition, Controller[]>>
// Structure: Airport/ARTCC Code -> Position Type -> Array of Controllers
// Example: "KLAX" -> CTR -> [controller1, controller2]
```

### 11. Design Requirements

#### 11.1 Visual Design
- **Theme:** Dark mode (primary)
- **Color Scheme:** Professional aviation theme (blues, grays, whites)
- **Typography:** Clean, readable sans-serif font
- **Spacing:** Generous whitespace for readability

#### 11.2 Layout
- Centered content container (max-width)
- Clear header with application branding
- Route table/grid with clear visual hierarchy
- Mobile: Stacked card layout
- Desktop: Table layout with columns

### 12. Future Enhancements (Post-MVP)

**Phase 2 - Real-time Integration:** ✅ COMPLETED
- ✅ Connect to VATSIM API for live controller data
- ✅ Display active controllers with position types
- ✅ Show controller callsigns, frequencies, and online times
- ✅ Support for consolidated TRACON facilities

**Phase 3 - Filtering & Search:**
- Filter routes by departure/arrival city
- Filter by minimum ATC coverage level (e.g., only show routes with tower+)
- Search by ICAO code
- Sort routes by ATC coverage quality
- Distance/duration information for routes
- Filter by specific ARTCC coverage

**Phase 4 - Enhanced ATC Information:**
- Display controller ATIS text
- Show controller rating/certification level
- Visual range indicators for controllers
- Historical ATC coverage statistics
- Predictive staffing patterns

**Phase 5 - Advanced Features:**
- User preferences and saved routes
- Flight planning tools (fuel, alternate airports)
- Weather overlays (METAR/TAF)
- Multiple airline support (United, American, Delta, etc.)
- Community features (flight sharing, comments)
- Airport charts and procedures
- Integration with flight planning tools (SimBrief)

### 13. Launch Criteria

The MVP is ready to launch when:
- [x] 20 routes are displayed correctly
- [x] All ARTCC information is accurate
- [x] Dark mode theme is fully implemented
- [x] Application is responsive on mobile and desktop
- [x] Page loads in under 2 seconds
- [x] Real-time VATSIM API integration is functional
- [x] All ATC positions (DEL, GND, TWR, APP, CTR) are tracked and displayed
- [x] Controller details (callsign, frequency, online time) are shown
- [x] Auto-refresh updates controller data every 30 seconds
- [x] Consolidated TRACON facilities are properly supported
- [x] Component architecture follows Svelte 5 best practices
- [x] No critical bugs exist

**Status:** ✅ MVP COMPLETE - All launch criteria met

### 14. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| CSV parsing issues | High | Validate data structure, consider JSON migration |
| Poor mobile UX | Medium | Test early on mobile devices, use responsive design patterns |
| Slow route generation | Low | Pre-generate routes at build time if needed |

### 15. Resolved Questions

1. ✅ Should we migrate from CSV to JSON for better performance?
   - **Resolution:** Migrated to JSON format for TypeScript integration and performance

2. ✅ What should the route generation algorithm prioritize?
   - **Resolution:** Algorithm prioritizes variety in cities and ARTCC coverage

3. ✅ Should we include real-time VATSIM integration in MVP?
   - **Resolution:** Yes, real-time integration implemented with 30-second refresh

### 15. Open Questions

1. Should we add route filtering by ATC coverage level?
2. Should we display controller ATIS information in the accordion?
3. Should we add a map view showing route paths and ATC coverage areas?
4. Should we implement user accounts for saving favorite routes?

### 16. Appendix

**Reference Links:**
- VATSIM Network: https://vatsim.net
- SvelteKit Documentation: https://kit.svelte.dev
- Tailwind CSS: https://tailwindcss.com

**ARTCC Codes Referenced:**
ZAB, ZAN, ZAU, ZBW, ZDC, ZDV, ZFW, ZHN, ZHU, ZID, ZJX, ZKC, ZLA, ZLC, ZMA, ZME, ZMP, ZNY, ZOA, ZOB, ZSE, ZTL
