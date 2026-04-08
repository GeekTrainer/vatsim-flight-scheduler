<!--
	ATCStatusDisplay.svelte
	
	Displays ATC (Air Traffic Control) status for an airport location.
	Shows position badges (DEL, GND, TWR, APP, CTR) with online/offline indicators.
	When no upper ATC coverage (CTR, APP, TWR) is online, fetches and displays the CTAF frequency.
	
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
		locationControllers,
		enableCtaf = false
	}: {
		icao: string;
		artcc: string;
		locationControllers: LocationControllers;
		enableCtaf?: boolean;
	} = $props();

	let ctafFrequency = $state<number | null>(null);
	let ctafRequestVersion = 0;

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

	const centerControllers = $derived(getControllers(artcc, ControllerPosition.CTR));
	const approachControllers = $derived(getControllers(icao, ControllerPosition.APP));
	const towerControllers = $derived(getControllers(icao, ControllerPosition.TWR));

	// Top-down coverage: CTAF only needed when no CTR, APP, or TWR is online
	const noUpperCoverage = $derived(
		centerControllers.length === 0 &&
		approachControllers.length === 0 &&
		towerControllers.length === 0
	);

	// Fetch CTAF when no upper coverage is online (only on flight details page)
	$effect(() => {
		const version = ++ctafRequestVersion;
		if (enableCtaf && noUpperCoverage && icao) {
			fetchCTAF(icao).then((freq) => {
				if (version === ctafRequestVersion) {
					ctafFrequency = freq;
				}
			});
		} else {
			ctafFrequency = null;
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
