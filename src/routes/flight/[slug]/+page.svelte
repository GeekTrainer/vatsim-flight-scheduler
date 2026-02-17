<script lang="ts">
	import ATCStatusDisplay from '$lib/components/ATCStatusDisplay.svelte';
	import ATISDisplay from '$lib/components/ATISDisplay.svelte';
	import { fetchVatsimData, getLocationControllers, getVatsimATIS } from '$lib/vatsim';
	import { fetchFAADatis } from '$lib/atis';
	import type { LocationControllers, ATISInfo } from '$lib/types';
	import type { VatsimATIS } from '$lib/types/vatsim';

	let { data } = $props();

	let locationControllers = $state<LocationControllers>(new Map());
	let atisStations = $state<VatsimATIS[]>([]);
	let departureFaaAtis = $state<ATISInfo | null>(null);
	let arrivalFaaAtis = $state<ATISInfo | null>(null);
	let departureOtherFaaAtis = $state<ATISInfo | null>(null);
	let arrivalOtherFaaAtis = $state<ATISInfo | null>(null);
	let isLoading = $state(true);

	// Primary ATIS for each side (role-specific)
	let departureVatsimAtis = $derived(getVatsimATIS(atisStations, data.departure.icao, 'departure'));
	let arrivalVatsimAtis = $derived(getVatsimATIS(atisStations, data.arrival.icao, 'arrival'));

	// Other side's ATIS for situational awareness (only shown for split ATIS airports)
	let departureOtherVatsimAtis = $derived(getVatsimATIS(atisStations, data.departure.icao, 'arrival'));
	let arrivalOtherVatsimAtis = $derived(getVatsimATIS(atisStations, data.arrival.icao, 'departure'));

	async function loadVatsimData() {
		try {
			const vatsimData = await fetchVatsimData();
			locationControllers = getLocationControllers(vatsimData.controllers);
			atisStations = vatsimData.atis;
			isLoading = false;
		} catch (error) {
			console.error('Failed to load VATSIM data:', error);
			isLoading = false;
		}
	}

	$effect(() => {
		loadVatsimData();
		loadFaaAtis();
		const interval = setInterval(loadVatsimData, 30000);
		return () => clearInterval(interval);
	});

	async function loadFaaAtis() {
		const [depAtis, arrAtis, depOtherAtis, arrOtherAtis] = await Promise.all([
			fetchFAADatis(data.departure.icao, 'departure'),
			fetchFAADatis(data.arrival.icao, 'arrival'),
			fetchFAADatis(data.departure.icao, 'arrival'),
			fetchFAADatis(data.arrival.icao, 'departure')
		]);
		departureFaaAtis = depAtis;
		arrivalFaaAtis = arrAtis;
		departureOtherFaaAtis = depOtherAtis;
		arrivalOtherFaaAtis = arrOtherAtis;
	}
</script>

<svelte:head>
	<title>{data.departure.icao} → {data.arrival.icao} | VATSIM Flight Scheduler</title>
</svelte:head>

<div data-testid="flight-page" class="min-h-screen bg-gray-950">
	<!-- Header -->
	<header class="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
		<div class="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-1 sm:py-1.5">
			<div class="flex items-center gap-3">
				<a
					href="/"
					data-testid="flight-back-link"
					class="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 shrink-0"
				>
					<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
					</svg>
					Back
				</a>
				<h1 class="text-sm font-bold text-white truncate">
					{data.departure.icao}
					<span class="text-gray-500 mx-1">→</span>
					{data.arrival.icao}
				</h1>
			</div>
		</div>
	</header>

	<main class="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6">
		{#if isLoading}
			<div class="flex justify-center py-12">
				<div class="spinner"></div>
			</div>
		{:else}
			<!-- Two-column layout: Departure (left) | Arrival (right) -->
			<div class="grid grid-cols-2 gap-6">
				<!-- Departure Airport Section -->
				<section data-testid="flight-departure-section" class="space-y-4">
					<div>
						<h2 class="text-2xl font-bold text-blue-300" data-testid="flight-departure-code">
							Departure — {data.departure.icao}
						</h2>
						<div class="text-sm text-gray-400">{data.departure.name} · {data.departure.city}</div>
					</div>

					<div class="card-subtle p-4">
						<h3 class="text-sm font-semibold text-gray-300 mb-3">ATC Coverage</h3>
						<ATCStatusDisplay
							icao={data.departure.icao}
							artcc={data.departure.artcc}
							{locationControllers}
						/>
					</div>

					<div>
						<h3 class="text-sm font-semibold text-gray-300 mb-3">ATIS Information</h3>
						<ATISDisplay
							vatsimAtis={departureVatsimAtis}
							faaAtis={departureFaaAtis}
							otherVatsimAtis={departureOtherVatsimAtis}
							otherFaaAtis={departureOtherFaaAtis}
							airportCode={data.departure.icao}
						/>
					</div>
				</section>

				<!-- Arrival Airport Section -->
				<section data-testid="flight-arrival-section" class="space-y-4">
					<div>
						<h2 class="text-2xl font-bold text-green-400" data-testid="flight-arrival-code">
							Arrival — {data.arrival.icao}
						</h2>
						<div class="text-sm text-gray-400">{data.arrival.name} · {data.arrival.city}</div>
					</div>

					<div class="card-subtle p-4">
						<h3 class="text-sm font-semibold text-gray-300 mb-3">ATC Coverage</h3>
						<ATCStatusDisplay
							icao={data.arrival.icao}
							artcc={data.arrival.artcc}
							{locationControllers}
						/>
					</div>

					<div>
						<h3 class="text-sm font-semibold text-gray-300 mb-3">ATIS Information</h3>
						<ATISDisplay
							vatsimAtis={arrivalVatsimAtis}
							faaAtis={arrivalFaaAtis}
							otherVatsimAtis={arrivalOtherVatsimAtis}
							otherFaaAtis={arrivalOtherFaaAtis}
							airportCode={data.arrival.icao}
						/>
					</div>
				</section>
			</div>
		{/if}

		<!-- Footer -->
		<div class="text-center text-xs text-gray-600 pt-4">
			<p>VATSIM data refreshes every 30 seconds. FAA D-ATIS is real-world data from the FAA.</p>
		</div>
	</main>
</div>
