<script lang="ts">
	import { onMount } from 'svelte';

	onMount(() => {
		if (window.opener) {
			window.opener.postMessage({ type: 'simbrief-plan-ready' }, window.location.origin);
		}
		// Auto-close after a short delay
		setTimeout(() => window.close(), 1500);
	});
</script>

<svelte:head>
	<title>SimBrief — Plan Generated</title>
</svelte:head>

<div class="min-h-screen bg-gray-950 flex items-center justify-center">
	<div class="text-center text-gray-300 space-y-3 p-8">
		<div class="text-4xl">✅</div>
		<p class="text-lg font-semibold">Flight plan generated!</p>
		<p class="text-sm text-gray-500">This window will close automatically...</p>
		<p class="text-xs text-gray-600 mt-4">
			If it doesn't close, you can close it manually and return to the flight page.
		</p>
	</div>
</div>
