<!--
	RouteRow.svelte
	
	Desktop table row displaying a single flight route.
	Shows departure and arrival airports in a tabular format with ATC status.
	Optimized for larger screens with horizontal layout.
	
	Props:
	- route: Route object containing departure and arrival airport information
	- locationControllers: Map of active controllers by location and position
-->
<script lang="ts">
	import type { Route, LocationControllers } from '$lib/types';
	import type { ATCController } from '$lib/types/vatsim';
	import { ControllerPosition } from '$lib/types/vatsim';
	import ATCStatusDisplay from './ATCStatusDisplay.svelte';

	let { route, locationControllers }: {
		route: Route;
		locationControllers: LocationControllers;
	} = $props();
</script>

<tr class="hover:bg-gray-800/50 transition-colors">
	<!-- Departure Airport -->
	<td class="py-4 px-1 align-top">
		<div class="flex flex-col">
			<span class="airport-code-mono">{route.departure.icao}</span>
			<span class="city-label">{route.departure.city}</span>
		</div>
	</td>

	<!-- Departure ATC Status -->
	<td class="py-4 px-1 align-top">
		<ATCStatusDisplay
			icao={route.departure.icao}
			artcc={route.departure.artcc}
			{locationControllers}
		/>
	</td>

	<!-- Arrow Separator -->
	<td class="py-4 px-1 text-center align-top">
		<svg class="w-5 h-5 text-gray-600 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
		</svg>
	</td>

	<!-- Arrival Airport -->
	<td class="py-4 px-1 align-top">
		<div class="flex flex-col">
			<span class="airport-code-mono">{route.arrival.icao}</span>
			<span class="city-label">{route.arrival.city}</span>
		</div>
	</td>

	<!-- Arrival ATC Status -->
	<td class="py-4 px-1 align-top">
		<ATCStatusDisplay
			icao={route.arrival.icao}
			artcc={route.arrival.artcc}
			{locationControllers}
		/>
	</td>
</tr>
