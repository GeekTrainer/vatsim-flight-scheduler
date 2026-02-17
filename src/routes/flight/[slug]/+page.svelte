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
		<div class="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 py-2 sm:py-3">
			<div class="flex items-center gap-4">
				<a
					href="/"
					data-testid="flight-back-link"
					class="text-sm text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 shrink-0"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
					</svg>
					Back to Routes
				</a>
				<h1 class="text-base sm:text-xl font-bold text-white truncate">
					{data.departure.icao}
					<span class="text-gray-500 mx-1">→</span>
					{data.arrival.icao}
				</h1>
			</div>
		</div>
	</header>

	<main class="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6">
		<!-- Flight Route Header -->
		<div class="card-themed p-4 sm:p-6">
			<div class="flex items-center justify-center gap-4 sm:gap-8">
				<!-- Departure -->
				<div class="text-center">
					<div class="text-2xl sm:text-4xl font-bold text-blue-300" data-testid="flight-departure-code">{data.departure.icao}</div>
					<div class="text-sm sm:text-base text-gray-200 font-medium">{data.departure.city}</div>
					<div class="text-xs text-gray-400">{data.departure.name}</div>
				</div>
				<!-- Arrow -->
				<div class="flex flex-col items-center gap-1">
					<svg class="w-8 h-8 sm:w-10 sm:h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
					</svg>
					<span class="text-xs text-gray-500">Flight Route</span>
				</div>
				<!-- Arrival -->
				<div class="text-center">
					<div class="text-2xl sm:text-4xl font-bold text-green-400" data-testid="flight-arrival-code">{data.arrival.icao}</div>
					<div class="text-sm sm:text-base text-gray-200 font-medium">{data.arrival.city}</div>
					<div class="text-xs text-gray-400">{data.arrival.name}</div>
				</div>
			</div>
		</div>

		{#if isLoading}
			<div class="flex justify-center py-12">
				<div class="spinner"></div>
			</div>
		{:else}
			<!-- Two-column layout: Departure (left) | Arrival (right) -->
			<div class="grid grid-cols-2 gap-6">
				<!-- Departure Airport Section -->
				<section data-testid="flight-departure-section" class="space-y-4">
					<h2 class="text-lg font-bold text-blue-300 flex items-center gap-2">
						<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
							<path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
						</svg>
						Departure — {data.departure.icao}
					</h2>

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
					<h2 class="text-lg font-bold text-green-400 flex items-center gap-2">
						<svg class="w-5 h-5 rotate-90" fill="currentColor" viewBox="0 0 20 20">
							<path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
						</svg>
						Arrival — {data.arrival.icao}
					</h2>

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
