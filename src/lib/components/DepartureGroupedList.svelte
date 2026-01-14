<script lang="ts">
	import DepartureAirportGroup from './DepartureAirportGroup.svelte';
	import type { Route, LocationControllers } from '$lib/types';
	import type { ATCController } from '$lib/types/vatsim';
	import { ControllerPosition } from '$lib/types/vatsim';

	interface Props {
		routes: Route[];
		locationControllers: LocationControllers;
	}

	let { routes, locationControllers }: Props = $props();

	// Group routes by departure airport
	const groupedByDeparture = $derived.by(() => {
		const grouped = new Map<string, Route[]>();
		
		for (const route of routes) {
			const key = route.departure.icao;
			if (!grouped.has(key)) {
				grouped.set(key, []);
			}
			grouped.get(key)!.push(route);
		}
		
		// Sort by departure ICAO code
		return Array.from(grouped.entries())
			.sort((a, b) => a[0].localeCompare(b[0]))
			.map(([icao, routes]) => ({
				airport: routes[0].departure,
				routes: routes.sort((a, b) => a.arrival.icao.localeCompare(b.arrival.icao))
			}));
	});
</script>

<div class="space-y-4">
	{#each groupedByDeparture as group}
		<DepartureAirportGroup
			departureAirport={group.airport}
			routes={group.routes}
			{locationControllers}
		/>
	{/each}
</div>
