<!--
	RouteCard.svelte
	
	Mobile-friendly card view for displaying a single flight route.
	Shows departure and arrival airports with their cities and ATC status.
	Includes a visual arrow separator between departure and arrival.
	
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

<div class="bg-gray-800 rounded-lg p-4 border border-gray-700">
	<div class="space-y-4">
		<!-- Departure -->
		<div>
			<div class="section-header">Departure</div>
			<div class="airport-code">{route.departure.icao}</div>
			<div class="city-label mb-2">{route.departure.city}</div>
			
			<ATCStatusDisplay
				icao={route.departure.icao}
				artcc={route.departure.artcc}
				{locationControllers}
			/>
		</div>

		<!-- Arrow Separator -->
		<div class="flex justify-center">
			<svg class="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
			</svg>
		</div>

		<!-- Arrival -->
		<div>
			<div class="section-header">Arrival</div>
			<div class="airport-code">{route.arrival.icao}</div>
			<div class="city-label mb-2">{route.arrival.city}</div>

			<ATCStatusDisplay
				icao={route.arrival.icao}
				artcc={route.arrival.artcc}
				{locationControllers}
			/>
		</div>
	</div>
</div>
