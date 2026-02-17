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
	<div class="text-xs text-gray-300 space-y-0.5">
		<!-- Line 1: Wind + Altimeter -->
		<div class="flex items-center gap-x-3">
			{#if parsedAtis.wind}
				<span data-testid="compact-wind" class="flex items-center gap-1">
					🌬️ <span class="font-medium">{formatWind(parsedAtis.wind)}</span>
				</span>
			{/if}
			{#if parsedAtis.altimeter}
				<span data-testid="compact-altimeter" class="flex items-center gap-1">
					📊 <span class="font-medium">{parsedAtis.altimeter}"</span>
				</span>
			{/if}
		</div>
		<!-- Line 2: Runways -->
		{#if parsedAtis.arrivalRunways.length > 0 || parsedAtis.departureRunways.length > 0}
			<div class="flex items-center gap-x-3">
				{#if parsedAtis.arrivalRunways.length > 0}
					<span data-testid="compact-arrivals" class="flex items-center gap-1">
						🛬
						{#each parsedAtis.arrivalRunways as rwy, i}
							{#if i > 0}<span class="text-gray-500">/</span>{/if}
							<span class="font-medium">{rwy.runway}</span>
						{/each}
					</span>
				{/if}
				{#if parsedAtis.departureRunways.length > 0}
					<span data-testid="compact-departures" class="flex items-center gap-1">
						🛫
						{#each parsedAtis.departureRunways as rwy, i}
							{#if i > 0}<span class="text-gray-500">/</span>{/if}
							<span class="font-medium">{rwy.runway}</span>
						{/each}
					</span>
				{/if}
			</div>
		{/if}
	</div>
{/if}
