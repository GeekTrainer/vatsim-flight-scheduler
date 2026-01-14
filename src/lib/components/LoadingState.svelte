<!--
	LoadingState.svelte
	
	Loading indicator with spinner and message.
	Displays an animated spinner and loading message while waiting for data.
	
	Props:
	- message: Optional loading message (defaults to "Loading live ATC data...")
-->
<script lang="ts">
	let { 
		message = "Loading live ATC data..."
	}: {
		message?: string;
	} = $props();
</script>

<div class="flex items-center justify-center py-12" data-testid="loading-state">
	<div class="text-center">
		<div class="spinner mx-auto mb-3"></div>
		<p class="text-gray-400">{message}</p>
	</div>
</div>
