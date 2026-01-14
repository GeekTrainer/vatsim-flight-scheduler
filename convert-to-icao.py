#!/usr/bin/env python3
"""Convert airport codes to proper ICAO format"""
import json

# Read current airports
with open('src/lib/data/airports.json', 'r') as f:
    airports = json.load(f)

# Convert to ICAO codes
# US airports: Add K prefix (SEA -> KSEA)
# Most US airports follow this pattern
for airport in airports:
    current_code = airport['icao']
    # US airports get K prefix
    if len(current_code) == 3:
        airport['icao'] = 'K' + current_code
    # Keep the 3-letter code for VATSIM matching
    airport['vatsim_code'] = current_code

# Write updated airports
with open('src/lib/data/airports.json', 'w') as f:
    json.dump(airports, f, indent=2)

print(f"Converted {len(airports)} airports to ICAO format")
print("Sample conversions:")
for airport in airports[:5]:
    print(f"  {airport['vatsim_code']} -> {airport['icao']} ({airport['city']})")
