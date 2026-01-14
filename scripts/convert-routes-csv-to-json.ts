#!/usr/bin/env node
/**
 * Convert Southwest routes CSV to JSON format
 * Input: raw-data/southwest_routes_all.csv
 * Output: src/lib/data/routes.json
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

interface Route {
	origin: string;
	destination: string;
}

function convertRoutesToJSON() {
	const csvPath = resolve('raw-data/southwest_routes_all.csv');
	const outputPath = resolve('src/lib/data/routes.json');

	console.log('Reading CSV file...');
	const csvContent = readFileSync(csvPath, 'utf-8');
	
	const lines = csvContent.trim().split('\n');
	const routes: Route[] = [];
	
	// Skip header row
	for (let i = 1; i < lines.length; i++) {
		const line = lines[i].trim();
		if (!line) continue;
		
		const [origin, destination] = line.split(',').map(s => s.trim());
		
		if (origin && destination) {
			routes.push({ origin, destination });
		}
	}

	console.log(`Parsed ${routes.length} routes`);
	
	// Get unique airport codes
	const airportCodes = new Set<string>();
	routes.forEach(r => {
		airportCodes.add(r.origin);
		airportCodes.add(r.destination);
	});
	
	console.log(`Found ${airportCodes.size} unique airports`);
	
	// Write JSON file
	const jsonContent = JSON.stringify(routes, null, 2);
	writeFileSync(outputPath, jsonContent, 'utf-8');
	
	console.log(`✅ Successfully created ${outputPath}`);
	console.log(`   ${routes.length} routes`);
	console.log(`   ${airportCodes.size} unique airports`);
	
	// Write list of unique airports for reference
	const airportsListPath = resolve('raw-data/unique-airports.txt');
	const sortedAirports = Array.from(airportCodes).sort();
	writeFileSync(airportsListPath, sortedAirports.join('\n'), 'utf-8');
	console.log(`📝 Created reference file: ${airportsListPath}`);
}

try {
	convertRoutesToJSON();
} catch (error) {
	console.error('❌ Error:', error);
	process.exit(1);
}
