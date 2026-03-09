/**
 * OurAirports frequency page parser.
 * Fetches a single airport's frequency page and extracts the CTAF or TWR frequency.
 */

/**
 * Fetch the CTAF frequency for an airport from OurAirports.
 * Looks for an explicit CTAF entry first, then falls back to the first TWR frequency.
 */
export async function fetchCTAFFromOurAirports(icao: string): Promise<number | null> {
	const url = `https://ourairports.com/airports/${encodeURIComponent(icao)}/frequencies.html`;

	const response = await fetch(url, {
		headers: { 'User-Agent': 'VATSIM-Flight-Scheduler/1.0 (educational)' }
	});

	if (!response.ok) {
		console.warn(`OurAirports returned ${response.status} for ${icao}`);
		return null;
	}

	const html = await response.text();
	return parseCTAFFromHTML(html);
}

/**
 * Parse CTAF or TWR frequency from OurAirports HTML.
 * The page structure has entries like:
 *   **TWR**\n118.7 MHz\nRWAY 08-26
 *   **CTAF**\n122.9 MHz\nCTAF
 *
 * Strategy: look for CTAF first, fall back to first TWR entry.
 */
export function parseCTAFFromHTML(html: string): number | null {
	// Match frequency entries: type label followed by frequency in MHz
	// OurAirports renders as: <strong>TYPE</strong> then frequency text
	// The markdown/text version shows: **TYPE**\nFREQ MHz

	// Try to find explicit CTAF entry first
	const ctafFreq = extractFrequencyForType(html, 'CTAF');
	if (ctafFreq !== null) return ctafFreq;

	// Fall back to first TWR entry
	const twrFreq = extractFrequencyForType(html, 'TWR');
	if (twrFreq !== null) return twrFreq;

	return null;
}

/**
 * Extract the frequency for a given type (CTAF, TWR, etc.) from the HTML.
 */
function extractFrequencyForType(html: string, type: string): number | null {
	// OurAirports HTML structure has <td> cells with type and frequency
	// Pattern: the type appears in bold/strong, followed by the frequency value
	// We look for patterns like: >TYPE</...> followed by a number ending in MHz

	// Approach: find the type label, then look for a frequency number nearby
	// The HTML has table rows with: type cell | frequency cell | description cell
	const patterns = [
		// Pattern 1: HTML table - type in one cell, freq in next
		new RegExp(`<td[^>]*>\\s*${type}\\s*</td>\\s*<td[^>]*>\\s*([\\d.]+)\\s*(?:MHz)?`, 'i'),
		// Pattern 2: Strong/bold tag followed by frequency
		new RegExp(`<strong>${type}</strong>[^\\d]*?([\\d.]+)\\s*MHz`, 'i'),
		// Pattern 3: Plain text pattern (from markdown conversion)
		new RegExp(`\\*\\*${type}\\*\\*[^\\d]*?([\\d.]+)\\s*MHz`, 'i'),
		// Pattern 4: Type text followed by frequency on next line/nearby
		new RegExp(`>${type}<[^>]*>[^\\d]*?([\\d.]+)`, 'i')
	];

	for (const pattern of patterns) {
		const match = html.match(pattern);
		if (match) {
			const freq = parseFloat(match[1]);
			// Validate it's a reasonable aviation frequency (108-137 MHz for comm/nav)
			if (freq >= 108 && freq <= 137) {
				return freq;
			}
		}
	}

	return null;
}
