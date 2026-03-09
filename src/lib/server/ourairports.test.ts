import { describe, it, expect } from 'vitest';
import { parseCTAFFromHTML } from './ourairports';

describe('parseCTAFFromHTML', () => {
	it('should extract CTAF frequency from explicit CTAF entry', () => {
		const html = `
			<table>
				<tr><td>CTAF</td><td>122.9 MHz</td><td>CTAF</td></tr>
				<tr><td>TWR</td><td>118.7 MHz</td><td>RWAY 08-26</td></tr>
			</table>
		`;
		// Should prefer CTAF over TWR
		expect(parseCTAFFromHTML(html)).toBe(122.9);
	});

	it('should fall back to TWR frequency when no CTAF entry', () => {
		const html = `
			<table>
				<tr><td>A/D</td><td>119.2 MHz</td><td>APP/DEP</td></tr>
				<tr><td>TWR</td><td>118.7 MHz</td><td>RWAY 08-26</td></tr>
				<tr><td>GND</td><td>121.9 MHz</td><td>Ground</td></tr>
			</table>
		`;
		expect(parseCTAFFromHTML(html)).toBe(118.7);
	});

	it('should handle bold/strong formatted type labels', () => {
		const html = `
			<div><strong>TWR</strong> 119.9 MHz Tower</div>
		`;
		expect(parseCTAFFromHTML(html)).toBe(119.9);
	});

	it('should handle markdown-style bold formatting', () => {
		const html = `**TWR**\n119.9 MHz\nTower`;
		expect(parseCTAFFromHTML(html)).toBe(119.9);
	});

	it('should parse real KPHX-like HTML', () => {
		// Simulating the OurAirports page structure
		const html = `
			<table class="table">
				<tr><td>A/D</td><td>119.2</td><td>319-057° 7500' AND ABOVE</td></tr>
				<tr><td>ATIS</td><td>127.575</td><td></td></tr>
				<tr><td>CLD</td><td>118.1</td><td>CLNC DEL</td></tr>
				<tr><td>GND</td><td>119.75</td><td>NORTH</td></tr>
				<tr><td>TWR</td><td>118.7</td><td>RWAY 08-26</td></tr>
				<tr><td>TWR</td><td>120.9</td><td>RWAY 07-25</td></tr>
			</table>
		`;
		expect(parseCTAFFromHTML(html)).toBe(118.7);
	});

	it('should parse real KLAS-like HTML', () => {
		const html = `
			<table class="table">
				<tr><td>APP</td><td>125.025</td><td>LAS VEGAS APP</td></tr>
				<tr><td>TWR</td><td>119.9</td><td>Tower</td></tr>
				<tr><td>GND</td><td>121.1</td><td>Ground</td></tr>
			</table>
		`;
		expect(parseCTAFFromHTML(html)).toBe(119.9);
	});

	it('should return null when no TWR or CTAF entries exist', () => {
		const html = `
			<table>
				<tr><td>GND</td><td>121.9</td><td>Ground</td></tr>
				<tr><td>UNIC</td><td>122.95</td><td>UNICOM</td></tr>
			</table>
		`;
		expect(parseCTAFFromHTML(html)).toBeNull();
	});

	it('should return null for empty HTML', () => {
		expect(parseCTAFFromHTML('')).toBeNull();
	});

	it('should reject frequencies outside aviation range', () => {
		const html = `
			<table>
				<tr><td>TWR</td><td>44.0</td><td>Military</td></tr>
			</table>
		`;
		// 44 MHz is outside valid aviation comm range (108-137)
		expect(parseCTAFFromHTML(html)).toBeNull();
	});

	it('should prefer CTAF over TWR when both exist', () => {
		const html = `
			<table>
				<tr><td>CTAF</td><td>122.9 MHz</td><td>CTAF</td></tr>
				<tr><td>TWR</td><td>118.7 MHz</td><td>Tower</td></tr>
			</table>
		`;
		expect(parseCTAFFromHTML(html)).toBe(122.9);
	});

	it('should handle HTML with nested tags around type', () => {
		const html = `
			<tr><td><span>TWR</span></td><td>120.5</td></tr>
		`;
		// The >TWR< pattern should match
		expect(parseCTAFFromHTML(html)).toBe(120.5);
	});
});
