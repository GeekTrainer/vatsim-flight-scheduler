<script lang="ts">
	import type { ATISInfo } from '$lib/types';
	import type { ParsedATIS } from '$lib/utils/atis-parser';
	import { formatWind } from '$lib/utils/atis-parser';

	interface Props {
		parsedAtis: ParsedATIS | null;
	}

	let { parsedAtis }: Props = $props();
</script>

{#if parsedAtis}
	<div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-300">
		{#if parsedAtis.wind}
			<span data-testid="compact-wind" class="flex items-center gap-1">
				<span>🌬️</span>
				<span class="font-medium">{formatWind(parsedAtis.wind)}</span>
			</span>
		{/if}
		{#if parsedAtis.altimeter}
			<span data-testid="compact-altimeter" class="flex items-center gap-1">
				<span>📊</span>
				<span class="font-medium">{parsedAtis.altimeter}"</span>
			</span>
		{/if}
		{#if parsedAtis.arrivalRunways.length > 0}
			<span data-testid="compact-arrivals" class="flex items-center gap-1">
				<span>🛬</span>
				{#each parsedAtis.arrivalRunways as rwy, i}
					{#if i > 0}<span class="text-gray-500">/</span>{/if}
					<span class="font-medium">{rwy.runway}</span>
				{/each}
			</span>
		{/if}
		{#if parsedAtis.departureRunways.length > 0}
			<span data-testid="compact-departures" class="flex items-center gap-1">
				<span>🛫</span>
				{#each parsedAtis.departureRunways as rwy, i}
					{#if i > 0}<span class="text-gray-500">/</span>{/if}
					<span class="font-medium">{rwy.runway}</span>
				{/each}
			</span>
		{/if}
	</div>
{/if}
