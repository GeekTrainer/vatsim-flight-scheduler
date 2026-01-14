<script lang="ts">
	import ATCStatusDisplay from './ATCStatusDisplay.svelte';
	import type { Airport, Route, LocationControllers } from '$lib/types';
	import type { ATCController } from '$lib/types/vatsim';
	import { ControllerPosition } from '$lib/types/vatsim';

	interface Props {
		departureAirport: Airport;
		routes: Route[];
		locationControllers: LocationControllers;
	}

	let { departureAirport, routes, locationControllers }: Props = $props();
	
	let isExpanded = $state(false);
	
	const arrivalCount = $derived(routes.length);
</script>

<div 
	data-testid="departure-group-{departureAirport.vatsim_code}"
	class="card-themed overflow-hidden"
>
	<!-- Departure Airport Header (Always Visible) -->
	<button
		data-testid="expand-button-{departureAirport.vatsim_code}"
		onclick={() => isExpanded = !isExpanded}
		class="w-full px-6 py-5 flex items-center justify-between hover:bg-blue-900/10 transition-all text-left bg-gradient-to-r from-blue-950/30 via-transparent to-blue-950/30 border-b-2 border-blue-800/30"
	>
		<div class="flex items-start gap-2 md:gap-4 lg:gap-6 flex-1">
			<!-- Airport Info -->
			<div class="w-32 sm:w-40 md:w-48 shrink-0">
				<div class="flex items-center gap-2">
					<span class="text-xl font-bold text-blue-300">{departureAirport.icao}</span>
					<span class="text-sm text-blue-400/60">({departureAirport.vatsim_code})</span>
				</div>
				<div class="text-sm font-medium text-gray-200">{departureAirport.city}</div>
				<div class="text-secondary mt-1">
					<span class="inline-flex items-center gap-1">
						<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
							<path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
						</svg>
						{arrivalCount} {arrivalCount === 1 ? 'destination' : 'destinations'}
					</span>
				</div>
			</div>

			<!-- ATC Status -->
			<div class="flex-1">
				<ATCStatusDisplay
					icao={departureAirport.icao}
					artcc={departureAirport.artcc}
					{locationControllers}
				/>
			</div>
		</div>

		<!-- Expand/Collapse Icon -->
		<div class="ml-4">
			<svg
				class="w-6 h-6 text-blue-300 transition-transform {isExpanded ? 'rotate-180' : ''}"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7" />
			</svg>
		</div>
	</button>

	<!-- Arrival Airports List (Expandable) -->
	{#if isExpanded}
		<div 
			class="border-t border-gray-800 bg-gray-900/30"
			data-testid="arrivals-section-{departureAirport.vatsim_code}"
		>
			<div class="px-6 py-4 bg-gray-800/30">
				<h4 class="text-base font-bold text-gray-200">Available Destinations</h4>
			</div>
			<div class="divide-y divide-gray-800">
				{#each routes as route}
					<div class="px-6 py-3 interactive-subtle">
						<div class="flex items-start gap-2 md:gap-4 lg:gap-6">
							<!-- Arrival Airport Info -->
							<div class="w-32 sm:w-40 md:w-48 shrink-0">
								<div class="flex items-center gap-2">
									<span class="text-base font-semibold text-green-400">{route.arrival.icao}</span>
									<span class="text-xs text-gray-500">({route.arrival.vatsim_code})</span>
								</div>
								<div class="text-sm text-gray-400">{route.arrival.city}</div>
							</div>

							<!-- Arrival ATC Status -->
							<div class="flex-1">
								<ATCStatusDisplay
									icao={route.arrival.icao}
									artcc={route.arrival.artcc}
									{locationControllers}
								/>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>
