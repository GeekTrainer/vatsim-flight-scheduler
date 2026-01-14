<!--
	ATCStatusDisplay.svelte
	
	Displays ATC (Air Traffic Control) status for an airport location.
	Shows position badges (DEL, GND, TWR, APP, CTR) with online/offline indicators.
	
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

	let { 
		icao, 
		artcc, 
		locationControllers
	}: {
		icao: string;
		artcc: string;
		locationControllers: LocationControllers;
	} = $props();

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
</script>

<div class="space-y-2">
	<!-- Position Badges -->
	<div class="flex gap-2">
		{#each POSITIONS as pos}
			{@const locationCode = pos.type === ControllerPosition.CTR ? artcc : icao}
			{@const controllers = getControllers(locationCode, pos.type)}
			
			<ATCBadge 
				position={pos.type}
				label={pos.label}
				color={pos.color}
				{controllers}
			/>
		{/each}
	</div>
</div>
