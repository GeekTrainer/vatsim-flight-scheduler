import { describe, it, expect } from 'vitest';
import { parseCTAFFromHTML } from './ourairports';

describe('parseCTAFFromHTML', () => {
	it('should extract CTAF frequency from explicit CTAF entry', () => {
		const html = `
			<section class="frequency listing row">
				<div class="col-xs-4 col-sm-2"><p><b>CTAF</b></p></div>
				<div class="col-xs-8 col-sm-10"><p>122.9 MHz</p></div>
			</section>
			<section class="frequency listing row">
				<div class="col-xs-4 col-sm-2"><p><b>TWR</b></p></div>
				<div class="col-xs-8 col-sm-10"><p>118.7 MHz</p></div>
			</section>
		`;
		// Should prefer CTAF over TWR
		expect(parseCTAFFromHTML(html)).toBe(122.9);
	});

	it('should fall back to TWR frequency when no CTAF entry', () => {
		const html = `
			<section class="frequency listing row">
				<div class="col-xs-4 col-sm-2"><p><b>A/D</b></p></div>
				<div class="col-xs-8 col-sm-10"><p>119.2 MHz</p></div>
			</section>
			<section class="frequency listing row">
				<div class="col-xs-4 col-sm-2"><p><b>TWR</b></p></div>
				<div class="col-xs-8 col-sm-10"><p>118.7 MHz</p></div>
			</section>
			<section class="frequency listing row">
				<div class="col-xs-4 col-sm-2"><p><b>GND</b></p></div>
				<div class="col-xs-8 col-sm-10"><p>121.9 MHz</p></div>
			</section>
		`;
		expect(parseCTAFFromHTML(html)).toBe(118.7);
	});

	it('should handle strong-formatted type labels', () => {
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
		const html = `
			<section class="frequency listing row">
				<div class="col-xs-4 col-sm-2"><p><b>A/D</b></p></div>
				<div class="col-xs-8 col-sm-10"><p>119.2 MHz</p><p class="text-muted">319-057</p></div>
			</section>
			<section class="frequency listing row">
				<div class="col-xs-4 col-sm-2"><p><b>ATIS</b></p></div>
				<div class="col-xs-8 col-sm-10"><p>127.575 MHz</p></div>
			</section>
			<section class="frequency listing row">
				<div class="col-xs-4 col-sm-2"><p><b>TWR</b></p></div>
				<div class="col-xs-8 col-sm-10"><p>118.7 MHz</p><p class="text-muted">RWAY 08-26</p></div>
			</section>
			<section class="frequency listing row">
				<div class="col-xs-4 col-sm-2"><p><b>TWR</b></p></div>
				<div class="col-xs-8 col-sm-10"><p>120.9 MHz</p><p class="text-muted">RWAY 07-25</p></div>
			</section>
		`;
		expect(parseCTAFFromHTML(html)).toBe(118.7);
	});

	it('should parse real KLAS-like HTML', () => {
		const html = `
			<section class="frequency listing row">
				<div class="col-xs-4 col-sm-2"><p><b>APP</b></p></div>
				<div class="col-xs-8 col-sm-10"><p>125.025 MHz</p><p class="text-muted">LAS VEGAS APP</p></div>
			</section>
			<section class="frequency listing row">
				<div class="col-xs-4 col-sm-2"><p><b>TWR</b></p></div>
				<div class="col-xs-8 col-sm-10"><p>119.9 MHz</p><p class="text-muted">Tower</p></div>
			</section>
			<section class="frequency listing row">
				<div class="col-xs-4 col-sm-2"><p><b>GND</b></p></div>
				<div class="col-xs-8 col-sm-10"><p>121.1 MHz</p><p class="text-muted">Ground</p></div>
			</section>
		`;
		expect(parseCTAFFromHTML(html)).toBe(119.9);
	});

	it('should return null when no TWR or CTAF entries exist', () => {
		const html = `
			<section class="frequency listing row">
				<div class="col-xs-4 col-sm-2"><p><b>GND</b></p></div>
				<div class="col-xs-8 col-sm-10"><p>121.9 MHz</p></div>
			</section>
			<section class="frequency listing row">
				<div class="col-xs-4 col-sm-2"><p><b>UNIC</b></p></div>
				<div class="col-xs-8 col-sm-10"><p>122.95 MHz</p></div>
			</section>
		`;
		expect(parseCTAFFromHTML(html)).toBeNull();
	});

	it('should return null for empty HTML', () => {
		expect(parseCTAFFromHTML('')).toBeNull();
	});

	it('should reject frequencies outside aviation range', () => {
		const html = `
			<section class="frequency listing row">
				<div class="col-xs-4 col-sm-2"><p><b>TWR</b></p></div>
				<div class="col-xs-8 col-sm-10"><p>44.0 MHz</p><p class="text-muted">Military</p></div>
			</section>
		`;
		// 44 MHz is outside valid aviation comm range (108-137)
		expect(parseCTAFFromHTML(html)).toBeNull();
	});

	it('should prefer CTAF over TWR when both exist', () => {
		const html = `
			<section class="frequency listing row">
				<div class="col-xs-4 col-sm-2"><p><b>CTAF</b></p></div>
				<div class="col-xs-8 col-sm-10"><p>122.9 MHz</p></div>
			</section>
			<section class="frequency listing row">
				<div class="col-xs-4 col-sm-2"><p><b>TWR</b></p></div>
				<div class="col-xs-8 col-sm-10"><p>118.7 MHz</p></div>
			</section>
		`;
		expect(parseCTAFFromHTML(html)).toBe(122.9);
	});

	it('should handle HTML with nested tags around type', () => {
		const html = `
			<td><span>TWR</span></td><td>120.5 MHz</td>
		`;
		expect(parseCTAFFromHTML(html)).toBe(120.5);
	});
});
