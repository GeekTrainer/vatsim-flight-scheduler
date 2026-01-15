<!--
	ATCBadge.svelte
	
	Displays a single ATC position badge with online/offline status and controller details.
	Supports both online (with controller data) and offline (empty badge) states.
	
	Props:
	- position: Type of ATC position (DEL, GND, TWR, APP, CTR)
	- label: Display label for the position
	- color: Color theme key (purple, yellow, red, blue, green)
	- controllers: Array of controllers at this position (empty for offline)
-->
<script lang="ts">
	import type { ATCController } from '$lib/types/vatsim';
	import { ATC_COLORS } from '$lib/constants/atc-colors';

	let { 
		position,
		label,
		color,
		controllers = []
	}: {
		position: string;
		label: string;
		color: string;
		controllers: ATCController[];
	} = $props();

	const online = $derived(controllers.length > 0);

	function formatOnlineTime(minutes: number): string {
		const hours = Math.floor(minutes / 60);
		const mins = minutes % 60;
		return `${hours}:${mins.toString().padStart(2, '0')}`;
	}

	function getBadgeClasses(): string {
		if (!online) {
			return 'atc-inactive';
		}
		// Map color prop to ATC class
		const colorMap: Record<string, string> = {
			green: 'atc-ctr-active',
			blue: 'atc-app-active',
			red: 'atc-twr-active',
			yellow: 'atc-gnd-active',
			purple: 'atc-del-active'
		};
		return colorMap[color] || 'atc-ctr-active';
	}
</script>

{#if online}
	<!-- Online - Show controller details -->
	<div 
		data-testid="atc-badge-{position.toLowerCase()}"
		data-status="online"
		class="badge-interactive {getBadgeClasses()}"
	>
		<div class="flex flex-col gap-0.5">
			<!-- Position Label -->
			<div class="text-xs font-bold flex items-center gap-1">
				{label}
				<span class="status-dot-pulse"></span>
			</div>
			<!-- Controllers (stacked vertically if multiple) -->
			{#each controllers as controller, index (controller.callsign)}
				{#if index > 0}
					<div class="border-t border-current/20 my-1"></div>
				{/if}
				<!-- Callsign -->
				<div 
					class="text-xs font-semibold"
					data-testid="controller-callsign-{controller.callsign}"
				>
					{controller.callsign}
				</div>
				<!-- Frequency -->
				<div 
					class="text-xs opacity-80"
					data-testid="controller-frequency-{controller.callsign}"
				>
					{controller.frequency}
				</div>
				<!-- Time Online -->
				<div 
					class="text-xs opacity-60"
					data-testid="controller-time-{controller.callsign}"
				>
					{formatOnlineTime(controller.onlineTimeMinutes)}
				</div>
			{/each}
		</div>
	</div>
{:else}
	<!-- Offline - Show simple badge -->
	<div 
		data-testid="atc-badge-{position.toLowerCase()}"
		data-status="offline"
		class="badge-interactive text-center {getBadgeClasses()}"
	>
		<div class="text-xs font-bold opacity-50">{label}</div>
	</div>
{/if}
