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
	// OurAirports HTML structure uses <section> blocks with:
	//   <div><p><b>TYPE</b></p></div>
	//   <div><p>FREQ MHz</p></div>
	// We need a pattern that finds the type in a <b> tag, then locates
	// the frequency in the next sibling <div>.

	const patterns = [
		// Pattern 1: OurAirports actual structure - <b>TYPE</b> ... MHz in next div's <p>
		// Use a multiline approach: find <b>TYPE</b>, skip tags until we find a frequency
		new RegExp(`<b>${type}</b>[\\s\\S]*?</div>\\s*<div[^>]*>\\s*<p>\\s*([\\d.]+)\\s*MHz`, 'i'),
		// Pattern 2: HTML table - type in one cell (possibly with nested tags), freq in next
		new RegExp(`<td[^>]*>[\\s\\S]*?${type}[\\s\\S]*?</td>\\s*<td[^>]*>\\s*([\\d.]+)\\s*(?:MHz)?`, 'i'),
		// Pattern 3: Strong tag followed by frequency
		new RegExp(`<strong>${type}</strong>[\\s\\S]*?([\\d.]+)\\s*MHz`, 'i'),
		// Pattern 4: Plain text pattern (from markdown conversion)
		new RegExp(`\\*\\*${type}\\*\\*[^\\d]*?([\\d.]+)\\s*MHz`, 'i'),
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
