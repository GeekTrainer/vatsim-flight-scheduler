/**
 * ATIS Text Parser
 * 
 * Extracts key operational information from ATIS text:
 * - Wind (direction, speed, gusts, variable)
 * - Altimeter setting
 * - Arrival runways with approach type
 * - Departure runways
 * 
 * Runway order is preserved as listed in the ATIS (first = ATC preferred).
 */

export interface RunwayInfo {
	runway: string;
	approachType?: string;
}

export interface ParsedWind {
	direction: number | 'VRB';
	speed: number;
	gust?: number;
	variable?: { from: number; to: number };
	calm: boolean;
	raw: string;
}

export interface ParsedATIS {
	wind?: ParsedWind;
	altimeter?: string;
	arrivalRunways: RunwayInfo[];
	departureRunways: RunwayInfo[];
}

/**
 * Parse ATIS text and extract key operational information
 */
export function parseATIS(text: string): ParsedATIS {
	const result: ParsedATIS = {
		arrivalRunways: [],
		departureRunways: []
	};

	if (!text) return result;

	result.wind = parseWind(text);
	result.altimeter = parseAltimeter(text);

	const { arrivals, departures } = parseRunways(text);
	result.arrivalRunways = arrivals;
	result.departureRunways = departures;

	return result;
}

/**
 * Parse wind from ATIS text
 * Formats: 24016G23KT, 00000KT, VRB05KT, 36003KT 350V080
 */
export function parseWind(text: string): ParsedWind | undefined {
	// Match main wind group
	const windMatch = text.match(/\b(VRB|\d{3})(\d{2,3})(G(\d{2,3}))?KT\b/);
	if (!windMatch) return undefined;

	const raw = windMatch[0];
	const dirStr = windMatch[1];
	const speed = parseInt(windMatch[2], 10);
	const gust = windMatch[4] ? parseInt(windMatch[4], 10) : undefined;

	const calm = dirStr === '000' && speed === 0;
	const direction: number | 'VRB' = dirStr === 'VRB' ? 'VRB' : parseInt(dirStr, 10);

	// Check for variable wind direction (e.g., 350V080)
	const variableMatch = text.match(/\b(\d{3})V(\d{3})\b/);
	let variable: { from: number; to: number } | undefined;
	if (variableMatch) {
		variable = {
			from: parseInt(variableMatch[1], 10),
			to: parseInt(variableMatch[2], 10)
		};
	}

	return { direction, speed, gust, variable, calm, raw };
}

/**
 * Parse altimeter setting from ATIS text
 * Format: A2978 → "29.78"
 */
export function parseAltimeter(text: string): string | undefined {
	const match = text.match(/\bA(\d{2})(\d{2})\b/);
	if (!match) return undefined;
	return `${match[1]}.${match[2]}`;
}

/**
 * Parse runway information from ATIS text
 * Extracts arrival runways (with approach type) and departure runways
 * Preserves order as listed (first = preferred by ATC)
 */
export function parseRunways(text: string): { arrivals: RunwayInfo[]; departures: RunwayInfo[] } {
	const arrivals: RunwayInfo[] = [];
	const departures: RunwayInfo[] = [];
	const seenArrival = new Set<string>();
	const seenDeparture = new Set<string>();

	// Split into sentences for analysis
	const sentences = text.split(/\.\s*/);

	for (const sentence of sentences) {
		const upper = sentence.toUpperCase();

		// Skip closed runways, NOTAMs, hold short instructions
		if (/\bCLSD\b/.test(upper) || /\bOTS\b/.test(upper) || /\bHOLD SHORT\b/.test(upper)) {
			continue;
		}

		// Combined landing and departing pattern
		const comboMatch = upper.match(/(?:LANDING|LDG|LNDG)\s+AND\s+(?:DEPARTING|DEPG|DEPTG)\s+(.*)/);
		if (comboMatch) {
			const rwys = extractRunwayNumbers(comboMatch[1]);
			for (const rwy of rwys) {
				if (!seenArrival.has(rwy)) { arrivals.push({ runway: rwy }); seenArrival.add(rwy); }
				if (!seenDeparture.has(rwy)) { departures.push({ runway: rwy }); seenDeparture.add(rwy); }
			}
			continue;
		}

		// Approach patterns (arrivals)
		parseApproachSentence(upper, arrivals, seenArrival);

		// Landing patterns (arrivals without explicit approach type)
		if (/(?:LANDING|LDG|LND)\s/.test(upper) && !comboMatch) {
			const landMatch = upper.match(/(?:LANDING|LDG|LND)\s+(?:AND\s+)?(?:RWY|RY|RWYS|RUNWAY|RUNWAYS)\s*(.*?)(?:\.|$)/);
			if (landMatch) {
				const rwys = extractRunwayNumbers(landMatch[1]);
				for (const rwy of rwys) {
					if (!seenArrival.has(rwy)) { arrivals.push({ runway: rwy }); seenArrival.add(rwy); }
				}
			}
		}

		// Departure patterns — capture everything after DEPG/DEPARTING up to sentence end
		const depMatch = upper.match(/(?:DEPG|DEPARTING|DEPART|DEPTG)\s+(?:RWY|RY|RWYS|RUNWAY|RUNWAYS)?\s*([\d\w\s,AND&]+?)(?:\.|$)/);
		if (depMatch && !comboMatch) {
			const rwys = extractRunwayNumbers(depMatch[1]);
			for (const rwy of rwys) {
				if (!seenDeparture.has(rwy)) { departures.push({ runway: rwy }); seenDeparture.add(rwy); }
			}
		}
	}

	return { arrivals, departures };
}

/**
 * Parse approach-related sentences for arrival runways
 */
function parseApproachSentence(sentence: string, arrivals: RunwayInfo[], seen: Set<string>): void {
	// Detect approach types present in the sentence
	const approachTypes: { pattern: RegExp; label: string }[] = [
		{ pattern: /\bILS\b/, label: 'ILS' },
		{ pattern: /\bVISUAL|VIS\b/, label: 'Visual' },
		{ pattern: /\bRNAV\b/, label: 'RNAV' },
		{ pattern: /\bGPS\b/, label: 'GPS' },
		{ pattern: /\bRNP\b/, label: 'RNP' },
		{ pattern: /\bLDA\b/, label: 'LDA' },
	];

	// Pattern: "[APPROACH_TYPE] APCH RWY 8R" or "APPROACH_TYPE RWY 8R APCH"
	// or "EXPECT [APPROACH_TYPE] APCH RWY 8R"
	const approachPatterns = [
		// "ARRIVALS EXPECT ILS RWY 8R, RWY 9, RWY 12"
		/(?:ARRIVALS?\s+)?(?:EXPECT|EXP)\s+((?:ILS|VISUAL|VIS|RNAV|GPS|RNP|LDA)(?:\s+(?:OR|AND)\s+(?:ILS|VISUAL|VIS|RNAV|GPS|RNP|LDA))*)\s+(?:APCH\s+)?(?:RWY|RY|RWYS|RUNWAY|RUNWAYS)\s+([\d\w\s,AND&RWY]+?)(?:\.|$)/,
		// "ILS OR VIS APCH RWY 10" / "ILS RWY 22L APCH IN USE"
		/((?:ILS|VISUAL|VIS|RNAV|GPS|RNP|LDA)(?:\s+(?:OR|AND|Z|Y)\s+(?:ILS|VISUAL|VIS|RNAV|GPS|RNP|LDA))*)\s+(?:APCHS?|APPROACH(?:ES)?)\s+(?:TO\s+)?(?:RWY|RY|RWYS|RUNWAY|RUNWAYS)\s+([\d\w\s,AND&RWY]+?)(?:\s+(?:APCHS?|IN USE|APCH)|\.|$)/,
		// "VISUAL APPROACH RWY 6 IN USE" / "VISUAL APPROACH RWY 8L, VISUAL APPROACH RWY 9R"
		/(VISUAL|VIS)\s+(?:APPROACH(?:ES)?|APCHS?)\s+(?:TO\s+)?(?:RWY|RY|RWYS|RUNWAY|RUNWAYS)\s+([\d\w\s,AND&]+?)(?:\s+IN USE|\.|,\s*(?:VISUAL|VIS)|$)/,
		// "APPROACH IN USE ILS RY 22L"
		/APPROACH(?:ES)?\s+IN USE\s+((?:ILS|VISUAL|VIS|RNAV|GPS|RNP|LDA))\s+(?:RWY|RY|RWYS)\s+([\d\w\s,AND&]+?)(?:\.|$)/,
		// "ILS RY 19 APCH IN USE"
		/(ILS|RNAV|RNP|GPS|LDA)\s+(?:RWY|RY|RWYS)\s+([\d\w\s,AND&]+?)\s+APCH/,
		// "RWYS 6 IN USE, EXPECT ILS APCH"
		/(?:RWY|RY|RWYS|RUNWAY|RUNWAYS)\s+([\d\w\s,AND&]+?)\s+IN USE.*?(?:EXPECT|EXP)\s+(ILS|VISUAL|VIS|RNAV|GPS|RNP|LDA)\s+APCH/,
	];

	for (const pattern of approachPatterns) {
		const match = sentence.match(pattern);
		if (match) {
			let approachStr: string;
			let runwayStr: string;

			// Last pattern has runway first, then approach
			if (pattern === approachPatterns[approachPatterns.length - 1]) {
				runwayStr = match[1];
				approachStr = match[2];
			} else {
				approachStr = match[1];
				runwayStr = match[2];
			}

			const approachType = normalizeApproachType(approachStr);
			const rwys = extractRunwayNumbers(runwayStr);
			for (const rwy of rwys) {
				if (!seen.has(rwy)) {
					arrivals.push({ runway: rwy, approachType });
					seen.add(rwy);
				}
			}

			// For "VISUAL APPROACH RWY 8L, VISUAL APPROACH RWY 9R" — find additional matches
			const remaining = sentence.slice((match.index || 0) + match[0].length);
			if (remaining.length > 5) {
				parseApproachSentence(remaining, arrivals, seen);
			}
			return;
		}
	}

	// Check for generic approach mentions with runways in same sentence
	if (/\bAPCH|APPROACH\b/.test(sentence)) {
		let detectedType: string | undefined;
		for (const { pattern, label } of approachTypes) {
			if (pattern.test(sentence)) {
				detectedType = label;
				break;
			}
		}

		// Handle "APCHS IN USE VIS 8L, VIS 9R, VIS 10" or "ILS 22L, ILS 22R"
		// Pattern: approach type directly before runway number, comma-separated
		const inlineMatches = [...sentence.matchAll(/\b(ILS|VISUAL|VIS|RNAV|GPS|RNP|LDA)\s+(\d{1,2}[LRC]?)\b/g)];
		if (inlineMatches.length > 0) {
			for (const m of inlineMatches) {
				const apchType = normalizeApproachType(m[1]);
				const rwy = m[2];
				const num = parseInt(rwy, 10);
				if (num >= 1 && num <= 36 && !seen.has(rwy)) {
					arrivals.push({ runway: rwy, approachType: apchType });
					seen.add(rwy);
				}
			}
			return;
		}

		const rwyMatch = sentence.match(/(?:RWY|RY|RWYS|RUNWAY|RUNWAYS)\s+([\d\w\s,AND&]+?)(?:\s+(?:APCHS?|IN USE|APCH)|\.|$)/);
		if (rwyMatch) {
			const rwys = extractRunwayNumbers(rwyMatch[1]);
			for (const rwy of rwys) {
				if (!seen.has(rwy)) {
					arrivals.push({ runway: rwy, approachType: detectedType });
					seen.add(rwy);
				}
			}
		}
	}
}

/**
 * Normalize approach type string to a clean label
 */
function normalizeApproachType(str: string): string {
	const upper = str.toUpperCase().trim();
	const types: string[] = [];

	if (/\bILS\b/.test(upper)) types.push('ILS');
	if (/\bVISUAL\b|\bVIS\b/.test(upper)) types.push('Visual');
	if (/\bRNAV\b/.test(upper)) types.push('RNAV');
	if (/\bGPS\b/.test(upper)) types.push('GPS');
	if (/\bRNP\b/.test(upper)) types.push('RNP');
	if (/\bLDA\b/.test(upper)) types.push('LDA');

	return types.join('/') || upper;
}

/**
 * Extract runway numbers from a text fragment
 * Handles: "25L AND 25R", "8R, RWY 9, RWY 12", "17L & RWY 17R", "24 AND 25"
 * Preserves order as listed.
 */
function extractRunwayNumbers(text: string): string[] {
	const runways: string[] = [];
	// Match runway designators: 1-2 digits optionally followed by L, R, or C
	const matches = text.matchAll(/\b(\d{1,2}[LRC]?)\b/g);
	for (const match of matches) {
		const rwy = match[1];
		// Filter out numbers that are clearly not runways (> 36)
		const num = parseInt(rwy, 10);
		if (num >= 1 && num <= 36 && !runways.includes(rwy)) {
			runways.push(rwy);
		}
	}
	return runways;
}

/**
 * Format parsed wind for display
 */
export function formatWind(wind: ParsedWind): string {
	if (wind.calm) return 'Calm';

	const dir = wind.direction === 'VRB' ? 'Variable' : `${wind.direction}°`;
	let result = `${dir} at ${wind.speed}kt`;

	if (wind.gust) {
		result += `, gusting ${wind.gust}kt`;
	}

	if (wind.variable && wind.direction !== 'VRB') {
		result += ` (variable ${wind.variable.from}°–${wind.variable.to}°)`;
	}

	return result;
}
