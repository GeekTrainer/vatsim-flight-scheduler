#!/usr/bin/env node
/**
 * Build complete airports.json from Southwest routes and existing airport database
 * 
 * Strategy:
 * 1. Extract unique airport codes from routes CSV
 * 2. Load existing airports.json for reference data (ARTCC, city, name)
 * 3. For missing airports, look up data from FAA database or manual mapping
 * 4. Generate complete airports.json with all Southwest airports
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

interface Airport {
	icao: string;
	city: string;
	name: string;
	artcc: string;
	vatsim_code: string;
}

// Manual mappings for airports not in current database
const MANUAL_AIRPORT_DATA: Record<string, Omit<Airport, 'vatsim_code'>> = {
	// US Airports
	'KBNA': { icao: 'KBNA', city: 'Nashville', name: 'Nashville International', artcc: 'ZME' },
	'KBOS': { icao: 'KBOS', city: 'Boston', name: 'Boston Logan International', artcc: 'ZBW' },
	'KCAK': { icao: 'KCAK', city: 'Akron', name: 'Akron-Canton Regional', artcc: 'ZOB' },
	'KCHS': { icao: 'KCHS', city: 'Charleston', name: 'Charleston International/AFB', artcc: 'ZJX' },
	'KCLE': { icao: 'KCLE', city: 'Cleveland', name: 'Cleveland Hopkins International', artcc: 'ZOB' },
	'KCLT': { icao: 'KCLT', city: 'Charlotte', name: 'Charlotte Douglas International', artcc: 'ZDC' },
	'KDAY': { icao: 'KDAY', city: 'Dayton', name: 'James M Cox Dayton International', artcc: 'ZID' },
	'KDFW': { icao: 'KDFW', city: 'Dallas/Fort Worth', name: 'Dallas/Fort Worth International', artcc: 'ZFW' },
	'KDTW': { icao: 'KDTW', city: 'Detroit', name: 'Detroit Metropolitan Wayne County', artcc: 'ZOB' },
	'KECP': { icao: 'KECP', city: 'Panama City Beach', name: 'Northwest Florida Beaches International', artcc: 'ZJX' },
	'KEWR': { icao: 'KEWR', city: 'Newark', name: 'Newark Liberty International', artcc: 'ZNY' },
	'KEYW': { icao: 'KEYW', city: 'Key West', name: 'Key West International', artcc: 'ZMA' },
	'KFNT': { icao: 'KFNT', city: 'Flint', name: 'Bishop International', artcc: 'ZOB' },
	'KHOU': { icao: 'KHOU', city: 'Houston', name: 'William P Hobby', artcc: 'ZHU' },
	'KIAD': { icao: 'KIAD', city: 'Washington', name: 'Washington Dulles International', artcc: 'ZDC' },
	'KICT': { icao: 'KICT', city: 'Wichita', name: 'Wichita Dwight D Eisenhower National', artcc: 'ZKC' },
	'KIND': { icao: 'KIND', city: 'Indianapolis', name: 'Indianapolis International', artcc: 'ZID' },
	'KJAN': { icao: 'KJAN', city: 'Jackson', name: 'Jackson-Medgar Wiley Evers International', artcc: 'ZME' },
	'KLGA': { icao: 'KLGA', city: 'New York', name: 'LaGuardia', artcc: 'ZNY' },
	'KLGB': { icao: 'KLGB', city: 'Long Beach', name: 'Long Beach Airport', artcc: 'ZLA' },
	'KLIT': { icao: 'KLIT', city: 'Little Rock', name: 'Bill and Hillary Clinton National/Adams Field', artcc: 'ZME' },
	'KMAF': { icao: 'KMAF', city: 'Midland/Odessa', name: 'Midland International Air and Space Port', artcc: 'ZFW' },
	'KMEM': { icao: 'KMEM', city: 'Memphis', name: 'Memphis International', artcc: 'ZME' },
	'KMSY': { icao: 'KMSY', city: 'New Orleans', name: 'Louis Armstrong New Orleans International', artcc: 'ZHU' },
	'KOKC': { icao: 'KOKC', city: 'Oklahoma City', name: 'Will Rogers World', artcc: 'ZKC' },
	'KOMA': { icao: 'KOMA', city: 'Omaha', name: 'Eppley Airfield', artcc: 'ZKC' },
	'KONT': { icao: 'KONT', city: 'Ontario', name: 'Ontario International', artcc: 'ZLA' },
	'KPBI': { icao: 'KPBI', city: 'West Palm Beach', name: 'Palm Beach International', artcc: 'ZMA' },
	'KPHL': { icao: 'KPHL', city: 'Philadelphia', name: 'Philadelphia International', artcc: 'ZNY' },
	'KPHX': { icao: 'KPHX', city: 'Phoenix', name: 'Phoenix Sky Harbor International', artcc: 'ZAB' },
	'KPVD': { icao: 'KPVD', city: 'Providence', name: 'Rhode Island TF Green International', artcc: 'ZBW' },
	'KPWM': { icao: 'KPWM', city: 'Portland', name: 'Portland International Jetport', artcc: 'ZBW' },
	'KRIC': { icao: 'KRIC', city: 'Richmond', name: 'Richmond International', artcc: 'ZDC' },
	'KRNO': { icao: 'KRNO', city: 'Reno', name: 'Reno/Tahoe International', artcc: 'ZOA' },
	'KROC': { icao: 'KROC', city: 'Rochester', name: 'Greater Rochester International', artcc: 'ZOB' },
	'KSDF': { icao: 'KSDF', city: 'Louisville', name: 'Louisville Muhammad Ali International', artcc: 'ZID' },
	'KSFO': { icao: 'KSFO', city: 'San Francisco', name: 'San Francisco International', artcc: 'ZOA' },
	'KSJC': { icao: 'KSJC', city: 'San Jose', name: 'Norman Y Mineta San Jose International', artcc: 'ZOA' },
	'KTPA': { icao: 'KTPA', city: 'Tampa', name: 'Tampa International', artcc: 'ZJX' },
	'KBKG': { icao: 'KBKG', city: 'Branson', name: 'Branson Airport', artcc: 'ZKC' },
	'KITO': { icao: 'KITO', city: 'Hilo', name: 'Hilo International', artcc: 'ZHN' },
	'KLIH': { icao: 'KLIH', city: 'Lihue', name: 'Lihue Airport', artcc: 'ZHN' },
	'KOGG': { icao: 'KOGG', city: 'Maui', name: 'Kahului Airport', artcc: 'ZHN' },
	
	// International Airports
	'TNCA': { icao: 'TNCA', city: 'Oranjestad', name: 'Queen Beatrix International', artcc: 'TJZS' }, // AUA
	'MZBZ': { icao: 'MZBZ', city: 'Belize City', name: 'Philip S W Goldson International', artcc: 'MHTG' }, // BZE
	'MMUN': { icao: 'MMUN', city: 'Cancun', name: 'Cancun International', artcc: 'MMFR' }, // CUN
	'MYGF': { icao: 'MYGF', city: 'Grand Cayman', name: 'Owen Roberts International', artcc: 'MHTG' }, // GCM
	'MKJP': { icao: 'MKJP', city: 'Montego Bay', name: 'Sangster International', artcc: 'MHTG' }, // MBJ
	'MYNN': { icao: 'MYNN', city: 'Nassau', name: 'Lynden Pindling International', artcc: 'MHTG' }, // NAS
	'MDPP': { icao: 'MDPP', city: 'Puerto Plata', name: 'Gregorio Luperon International', artcc: 'MDCS' }, // PLS
	'MDPC': { icao: 'MDPC', city: 'Punta Cana', name: 'Punta Cana International', artcc: 'MDCS' }, // PUJ
	'MMPR': { icao: 'MMPR', city: 'Puerto Vallarta', name: 'Licenciado Gustavo Diaz Ordaz International', artcc: 'MMFR' }, // PVR
	'MMSD': { icao: 'MMSD', city: 'Los Cabos', name: 'Los Cabos International', artcc: 'MMFR' }, // SJD
	'MROC': { icao: 'MROC', city: 'San Jose', name: 'Juan Santamaria International', artcc: 'MHTG' }, // SJO
	'TJSJ': { icao: 'TJSJ', city: 'San Juan', name: 'Luis Munoz Marin International', artcc: 'TJZS' }, // SJU
};

// ARTCC lookup helper for common patterns
const ARTCC_BY_STATE: Record<string, string> = {
	'AK': 'ZAN', // Alaska
	'HI': 'ZHN', // Honolulu
};

function iataToIcao(iata: string): string {
	// International airports with non-standard ICAO codes
	const specialCases: Record<string, string> = {
		'AUA': 'TNCA', // Aruba
		'BZE': 'MZBZ', // Belize
		'CUN': 'MMUN', // Cancun
		'GCM': 'MYGF', // Grand Cayman
		'MBJ': 'MKJP', // Montego Bay
		'NAS': 'MYNN', // Nassau
		'PLS': 'MDPP', // Puerto Plata
		'PUJ': 'MDPC', // Punta Cana
		'PVR': 'MMPR', // Puerto Vallarta
		'SJD': 'MMSD', // Los Cabos
		'SJO': 'MROC', // San Jose, Costa Rica
		'SJU': 'TJSJ', // San Juan
	};
	
	if (specialCases[iata]) {
		return specialCases[iata];
	}
	
	// Most US airports: IATA -> K + IATA
	if (iata.length === 3) {
		return 'K' + iata;
	}
	
	return iata;
}

function buildAirportsJSON() {
	console.log('🔍 Extracting airport codes from routes...');
	
	// Read routes CSV to get all airport codes
	const csvPath = resolve('raw-data/southwest_routes_all.csv');
	const csvContent = readFileSync(csvPath, 'utf-8');
	
	const airportCodes = new Set<string>();
	const lines = csvContent.trim().split('\n');
	
	for (let i = 1; i < lines.length; i++) {
		const [origin, destination] = lines[i].split(',').map(s => s.trim());
		if (origin) airportCodes.add(origin);
		if (destination) airportCodes.add(destination);
	}
	
	console.log(`   Found ${airportCodes.size} unique airports in routes`);
	
	// Load existing airports.json
	const existingPath = resolve('src/lib/data/airports.json');
	const existingAirports: Airport[] = JSON.parse(readFileSync(existingPath, 'utf-8'));
	
	// Create lookup map by VATSIM code (IATA)
	const existingMap = new Map<string, Airport>();
	existingAirports.forEach(airport => {
		existingMap.set(airport.vatsim_code, airport);
	});
	
	console.log(`   Loaded ${existingAirports.length} existing airports`);
	
	// Build complete airport list
	const allAirports: Airport[] = [];
	const missingAirports: string[] = [];
	
	for (const iata of Array.from(airportCodes).sort()) {
		const existing = existingMap.get(iata);
		
		if (existing && existing.city !== `UNKNOWN_${iata}`) {
			// Use existing data if it's not a placeholder
			allAirports.push(existing);
		} else {
			// Check manual mappings
			const icao = iataToIcao(iata);
			const manual = MANUAL_AIRPORT_DATA[icao];
			
			if (manual) {
				allAirports.push({
					...manual,
					vatsim_code: iata
				});
			} else {
				// Mark as missing for manual review
				missingAirports.push(iata);
				
				// Create placeholder entry
				allAirports.push({
					icao: icao,
					city: `UNKNOWN_${iata}`,
					name: `UNKNOWN - ${iata}`,
					artcc: 'UNKNOWN',
					vatsim_code: iata
				});
			}
		}
	}
	
	// Sort by ICAO code
	allAirports.sort((a, b) => a.icao.localeCompare(b.icao));
	
	// Write updated airports.json
	const outputPath = resolve('src/lib/data/airports.json');
	const jsonContent = JSON.stringify(allAirports, null, 2);
	writeFileSync(outputPath, jsonContent, 'utf-8');
	
	console.log(`\n✅ Successfully created ${outputPath}`);
	console.log(`   ${allAirports.length} total airports`);
	console.log(`   ${allAirports.length - missingAirports.length} airports with complete data`);
	
	if (missingAirports.length > 0) {
		console.log(`\n⚠️  ${missingAirports.length} airports need manual data entry:`);
		console.log('   ' + missingAirports.join(', '));
		console.log('\n   Please add these to MANUAL_AIRPORT_DATA in this script.');
		console.log('   You can find airport data in archive/raw-data/airports.csv');
		
		// Write missing airports to file for reference
		const missingPath = resolve('raw-data/missing-airports.txt');
		writeFileSync(missingPath, missingAirports.join('\n'), 'utf-8');
		console.log(`   📝 Missing airports list saved to: ${missingPath}`);
	}
	
	// Summary stats
	const unknownCount = allAirports.filter(a => a.artcc === 'UNKNOWN').length;
	if (unknownCount > 0) {
		console.log(`\n⚠️  ${unknownCount} airports missing ARTCC codes`);
	}
}

try {
	buildAirportsJSON();
} catch (error) {
	console.error('❌ Error:', error);
	process.exit(1);
}
