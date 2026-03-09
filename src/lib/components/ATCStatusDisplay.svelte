<!--
	ATCStatusDisplay.svelte
	
	Displays ATC (Air Traffic Control) status for an airport location.
	Shows position badges (DEL, GND, TWR, APP, CTR) with online/offline indicators.
	When TWR is offline, fetches and displays the CTAF frequency.
	
	Props:
	- icao: Airport ICAO code (e.g., "KSEA") - used for airport-based positions (DEL, GND, TWR, APP)
	- artcc: ARTCC code (e.g., "ZSE") - used for center (CTR) controller lookups
	- locationControllers: Map of controllers organized by location code and position type
	
	Note: We need both icao and artcc because airport positions (DEL/GND/TWR/APP) are mapped
	by airport ICAO code, while center controllers (CTR) are mapped by their ARTCC code.
-->
<script lang="ts">
	import ATCBadge from './ATCBadge.svelte';
	import type { LocationControllers } from '$lib/types';
	import type { ATCController } from '$lib/types/vatsim';
	import { ControllerPosition } from '$lib/types/vatsim';
	import { fetchCTAF } from '$lib/ctaf';

	let { 
		icao, 
		artcc, 
		locationControllers
	}: {
		icao: string;
		artcc: string;
		locationControllers: LocationControllers;
	} = $props();

	let ctafFrequency = $state<number | null>(null);

	const POSITIONS = [
		{ type: ControllerPosition.CTR, label: 'CTR', color: 'green' },
		{ type: ControllerPosition.APP, label: 'APP', color: 'blue' },
		{ type: ControllerPosition.TWR, label: 'TWR', color: 'red' },
		{ type: ControllerPosition.GND, label: 'GND', color: 'yellow' },
		{ type: ControllerPosition.DEL, label: 'DEL', color: 'purple' }
	];

	function getControllers(locationCode: string, position: ControllerPosition): ATCController[] {
		const positions = locationControllers.get(locationCode);
		return positions?.get(position) || [];
	}

	const towerControllers = $derived(getControllers(icao, ControllerPosition.TWR));
	const towerOffline = $derived(towerControllers.length === 0);

	// Fetch CTAF when tower is offline
	$effect(() => {
		if (towerOffline && icao) {
			fetchCTAF(icao).then((freq) => {
				ctafFrequency = freq;
			});
		}
	});
</script>

<div>
	<!-- Position Badges -->
	<div class="grid grid-cols-5 gap-1.5">
		{#each POSITIONS as pos (pos.type)}
			{@const locationCode = pos.type === ControllerPosition.CTR ? artcc : icao}
			{@const controllers = getControllers(locationCode, pos.type)}
			
			<ATCBadge 
				position={pos.type}
				label={pos.label}
				color={pos.color}
				{controllers}
				ctafFrequency={pos.type === ControllerPosition.TWR ? ctafFrequency : null}
			/>
		{/each}
	</div>
</div>
