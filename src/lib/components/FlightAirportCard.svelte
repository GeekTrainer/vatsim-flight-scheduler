<script lang="ts">
	import type { Airport, LocationControllers, ATISInfo } from '$lib/types';
	import { ControllerPosition } from '$lib/types/vatsim';
	import type { ParsedATIS } from '$lib/utils/atis-parser';
	import { parseATIS } from '$lib/utils/atis-parser';
	import ATCStatusDisplay from './ATCStatusDisplay.svelte';
	import ATISDisplay from './ATISDisplay.svelte';
	import CompactATISSummary from './CompactATISSummary.svelte';

	interface Props {
		airport: Airport;
		role: 'departure' | 'arrival';
		locationControllers: LocationControllers;
		vatsimAtis: ATISInfo | null;
		faaAtis: ATISInfo | null;
		otherVatsimAtis?: ATISInfo | null;
		otherFaaAtis?: ATISInfo | null;
		isExpanded: boolean;
		onToggle: () => void;
	}

	let {
		airport, role, locationControllers,
		vatsimAtis, faaAtis,
		otherVatsimAtis = null, otherFaaAtis = null,
		isExpanded, onToggle
	}: Props = $props();

	const colorClass = $derived(role === 'departure' ? 'text-blue-300' : 'text-green-400');
	const borderClass = $derived(role === 'departure' ? 'border-blue-800/40' : 'border-green-800/40');
	const label = $derived(role === 'departure' ? 'Departure' : 'Arrival');

	// Parse ATIS for compact summary (use whichever is available)
	let activeAtis = $derived(vatsimAtis || faaAtis);
	let otherAtis = $derived(
		(vatsimAtis ? otherVatsimAtis : otherFaaAtis)
	);
	let parsedAtis = $derived.by((): ParsedATIS | null => {
		if (!activeAtis) return null;
		const primary = parseATIS(activeAtis.text);
		if (otherAtis && otherAtis.atisType !== 'combined' && otherAtis.text !== activeAtis.text) {
			const other = parseATIS(otherAtis.text);
			const seenArr = new Set(primary.arrivalRunways.map(r => r.runway));
			const seenDep = new Set(primary.departureRunways.map(r => r.runway));
			for (const rwy of other.arrivalRunways) {
				if (!seenArr.has(rwy.runway)) primary.arrivalRunways.push(rwy);
			}
			for (const rwy of other.departureRunways) {
				if (!seenDep.has(rwy.runway)) primary.departureRunways.push(rwy);
			}
		}
		return primary;
	});

	// Compact ATC: check which positions are online
	const positions = [ControllerPosition.CTR, ControllerPosition.APP, ControllerPosition.TWR, ControllerPosition.GND, ControllerPosition.DEL];
	const posColors: Record<ControllerPosition, string> = {
		[ControllerPosition.CTR]: 'bg-green-400', [ControllerPosition.APP]: 'bg-blue-400', [ControllerPosition.TWR]: 'bg-red-400', [ControllerPosition.GND]: 'bg-yellow-400', [ControllerPosition.DEL]: 'bg-purple-400'
	};

	function hasController(pos: ControllerPosition): boolean {
		const code = pos === ControllerPosition.CTR ? airport.artcc : airport.icao;
		const posMap = locationControllers.get(code);
		return posMap?.has(pos) && (posMap.get(pos)?.length ?? 0) > 0 || false;
	}
</script>

<div
	data-testid="flight-card-{role}"
	class="rounded-lg border {borderClass} overflow-hidden transition-all {isExpanded ? 'bg-gray-800/50' : 'bg-gray-800/30'}"
>
	<!-- Card Header (always visible, tappable) -->
	<button
		data-testid="flight-card-toggle-{role}"
		onclick={onToggle}
		class="w-full text-left px-4 py-3 flex items-start justify-between gap-3 hover:bg-gray-800/30 transition-colors"
	>
		<div class="flex-1 min-w-0">
			<!-- Airport code + name -->
			<div class="flex items-center gap-2">
				<span class="text-lg font-bold {colorClass}">{label} — {airport.icao}</span>
				<svg
					class="w-4 h-4 text-gray-500 transition-transform shrink-0 {isExpanded ? 'rotate-180' : ''}"
					fill="none" stroke="currentColor" viewBox="0 0 24 24"
				>
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
				</svg>
			</div>
			<div class="text-xs text-gray-500">{airport.name} · {airport.city}</div>

			<!-- Compact summary (always visible) -->
			{#if parsedAtis}
				<div class="mt-1.5">
					<CompactATISSummary {parsedAtis} />
				</div>
			{/if}

			<!-- Compact ATC dots -->
			<div class="flex items-center gap-1.5 mt-1.5">
				{#each positions as pos (pos)}
					<div class="flex items-center gap-0.5">
						<span class="w-2 h-2 rounded-full {hasController(pos) ? posColors[pos] : 'bg-gray-700'}"></span>
						<span class="text-[9px] {hasController(pos) ? 'text-gray-300' : 'text-gray-600'}">{pos}</span>
					</div>
				{/each}
			</div>
		</div>
	</button>

	<!-- Expanded Content -->
	{#if isExpanded}
		<div class="px-4 pb-4 space-y-4 border-t border-gray-800">
			<!-- Full ATC Coverage -->
			<div class="pt-3">
				<h3 class="text-sm font-semibold text-gray-300 mb-3">ATC Coverage</h3>
				<ATCStatusDisplay
					icao={airport.icao}
					artcc={airport.artcc}
					{locationControllers}
					enableCtaf={true}
				/>
			</div>

			<!-- ATIS Information -->
			<div>
				<h3 class="text-sm font-semibold text-gray-300 mb-3">ATIS Information</h3>
				<ATISDisplay
					{vatsimAtis}
					{faaAtis}
					{otherVatsimAtis}
					{otherFaaAtis}
					airportCode={airport.icao}
				/>
			</div>
		</div>
	{/if}
</div>
