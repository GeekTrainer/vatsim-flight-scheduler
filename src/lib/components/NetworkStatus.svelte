<!--
	NetworkStatus.svelte
	
	Displays VATSIM network connection status.
	Shows a pulsing indicator, online controller count, and last update time.
	
	Props:
	- onlineControllers: Number of controllers currently online
	- lastUpdate: Time string for last data update
	- isLoading: Whether data is still loading
-->
<script lang="ts">
	let { 
		onlineControllers,
		lastUpdate,
		isLoading
	}: {
		onlineControllers: number;
		lastUpdate: string;
		isLoading: boolean;
	} = $props();
</script>

<div class="flex flex-wrap items-center gap-x-3 gap-y-1" data-testid="network-status">
	<div class="flex items-center space-x-2">
		<div class="w-2 h-2 bg-green-500 rounded-full status-dot-pulse"></div>
		<span class="text-secondary">VATSIM Network</span>
	</div>
	{#if !isLoading}
		<div class="text-secondary">
			<span>{onlineControllers} controllers</span>
			<span class="hidden sm:inline"> • Updated {lastUpdate}</span>
		</div>
	{/if}
</div>
