<script lang="ts">
	import type { ParsedATIS } from '$lib/utils/atis-parser';
	import { formatWind } from '$lib/utils/atis-parser';

	interface Props {
		parsedAtis: ParsedATIS;
	}

	let { parsedAtis }: Props = $props();

	const hasData = $derived(
		parsedAtis.wind || parsedAtis.altimeter || 
		parsedAtis.arrivalRunways.length > 0 || parsedAtis.departureRunways.length > 0
	);
</script>

{#if hasData}
	<div data-testid="atis-summary" class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
		{#if parsedAtis.wind}
			<span class="text-gray-400 flex items-center gap-1.5">
				<span>🌬️</span> Wind
			</span>
			<span data-testid="atis-summary-wind" class="text-gray-200 font-medium">{formatWind(parsedAtis.wind)}</span>
		{/if}

		{#if parsedAtis.altimeter}
			<span class="text-gray-400 flex items-center gap-1.5">
				<span>📊</span> Altimeter
			</span>
			<span data-testid="atis-summary-altimeter" class="text-gray-200 font-medium">{parsedAtis.altimeter}"</span>
		{/if}

		{#if parsedAtis.arrivalRunways.length > 0}
			<span class="text-gray-400 flex items-center gap-1.5">
				<span>🛬</span> Arriving
			</span>
			<span data-testid="atis-summary-arrivals" class="text-gray-200 font-medium">
				{#each parsedAtis.arrivalRunways as rwy (rwy.runway)}
					{@const i = parsedAtis.arrivalRunways.indexOf(rwy)}
					{#if i > 0}<span class="text-gray-500">, </span>{/if}
					Rwy {rwy.runway}{#if rwy.approachType}<span class="text-gray-400"> ({rwy.approachType})</span>{/if}
				{/each}
			</span>
		{/if}

		{#if parsedAtis.departureRunways.length > 0}
			<span class="text-gray-400 flex items-center gap-1.5">
				<span>🛫</span> Departing
			</span>
			<span data-testid="atis-summary-departures" class="text-gray-200 font-medium">
				{#each parsedAtis.departureRunways as rwy (rwy.runway)}
					{@const i = parsedAtis.departureRunways.indexOf(rwy)}
					{#if i > 0}<span class="text-gray-500">, </span>{/if}
					Rwy {rwy.runway}
				{/each}
			</span>
		{/if}
	</div>
{/if}
