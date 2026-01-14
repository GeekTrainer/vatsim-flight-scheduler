# Data Migration Scripts

TypeScript scripts to convert Southwest Airlines route and airport data from CSV to JSON format.

## Scripts

### `convert-routes-csv-to-json.ts`
Converts the Southwest routes CSV file to JSON format.

**Input:** `raw-data/southwest_routes_all.csv`
**Output:** `src/lib/data/routes.json`

Creates an array of route objects with `origin` and `destination` IATA codes:
```json
[
  { "origin": "ABQ", "destination": "BWI" },
  { "origin": "ABQ", "destination": "DAL" }
]
```

### `build-airports-json.ts`
Builds a complete airports database from routes and manual airport data.

**Input:** 
- `raw-data/southwest_routes_all.csv` (to extract required airports)
- `src/lib/data/airports.json` (existing airport data)
- Manual airport mappings in the script

**Output:** `src/lib/data/airports.json`

Creates airport objects with full metadata:
```json
[
  {
    "icao": "KPHX",
    "city": "Phoenix",
    "name": "Phoenix Sky Harbor International",
    "artcc": "ZAB",
    "vatsim_code": "PHX"
  }
]
```

## Usage

### Run individual scripts:
```bash
npm run data:routes    # Convert routes CSV to JSON
npm run data:airports  # Build airports database
```

### Run all data scripts:
```bash
npm run data:build     # Runs both scripts in sequence
```

## Data Files

### Generated Files:
- `src/lib/data/routes.json` - 1,219 Southwest route pairs
- `src/lib/data/airports.json` - 109 airports with full metadata
- `raw-data/unique-airports.txt` - List of unique airport codes (for reference)

### File Sizes:
- routes.json: ~67 KB
- airports.json: ~16 KB
- **Total: ~83 KB** (perfect for client-side JSON)

## Maintenance

### Adding New Airports
If routes are added that include new airports not in the database:

1. Run `npm run data:airports`
2. Check the console output for missing airports
3. Add missing airports to `MANUAL_AIRPORT_DATA` in `build-airports-json.ts`
4. Run `npm run data:airports` again

### Updating Routes
When `raw-data/southwest_routes_all.csv` is updated:

```bash
npm run data:build
```

This will regenerate both routes and airports files.

## Airport Code Mapping

The scripts handle three types of airport codes:

1. **ICAO** - Standard 4-letter code (e.g., KPHX, TJSJ, MMUN)
2. **IATA** - 3-letter code used in routes (e.g., PHX, SJU, CUN)  
3. **VATSIM Code** - Usually same as IATA, used for controller callsign matching

### US Airports
Most US airports follow the pattern: IATA → K + IATA
- LAX → KLAX
- ORD → KORD
- DFW → KDFW

### International Airports
International airports require manual ICAO mapping:
- CUN (Cancun) → MMUN
- SJU (San Juan) → TJSJ
- NAS (Nassau) → MYNN

These mappings are defined in the `specialCases` object and `MANUAL_AIRPORT_DATA` in `build-airports-json.ts`.
