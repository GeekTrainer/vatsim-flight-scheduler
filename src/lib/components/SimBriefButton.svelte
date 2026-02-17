<script lang="ts">
import {
buildDispatchUrl,
fetchSimBriefPlan,
getStoredUsername
} from '$lib/simbrief';
import type { SimBriefPlan } from '$lib/types/simbrief';

interface Props {
departureIcao: string;
arrivalIcao: string;
onPlanLoaded: (plan: SimBriefPlan) => void;
}

let { departureIcao, arrivalIcao, onPlanLoaded }: Props = $props();

let username = $state(getStoredUsername() || '');
let isLoading = $state(false);
let error = $state<string | null>(null);

const isConfigured = $derived(username.length > 0);

function openSimBrief() {
error = null;
const url = buildDispatchUrl(departureIcao, arrivalIcao, `${window.location.origin}/simbrief/callback`);

const popup = window.open(url, 'simbrief', 'width=1000,height=750');
if (!popup) {
error = 'Popup blocked! Please allow popups for this site.';
return;
}

isLoading = true;

// Timeout after 10 minutes
const timeout = setTimeout(() => {
clearInterval(pollInterval);
window.removeEventListener('message', handler);
isLoading = false;
error = 'SimBrief session timed out. Try again.';
}, 10 * 60 * 1000);

const pollInterval = setInterval(async () => {
if (popup.closed) {
clearInterval(pollInterval);
clearTimeout(timeout);
window.removeEventListener('message', handler);
await loadPlan();
}
}, 2000);

const handler = async (event: MessageEvent) => {
if (event.origin !== window.location.origin) return;
if (event.data?.type === 'simbrief-plan-ready') {
window.removeEventListener('message', handler);
clearInterval(pollInterval);
clearTimeout(timeout);
await loadPlan();
}
};
window.addEventListener('message', handler);
}

async function loadPlan() {
isLoading = true;
error = null;

const plan = await fetchSimBriefPlan(username);
isLoading = false;

if (!plan) {
error = 'Could not fetch your SimBrief plan. Check your username in Settings.';
return;
}

onPlanLoaded(plan);
}
</script>

<div data-testid="simbrief-section" class="space-y-3">
{#if isConfigured}
<div class="flex items-center gap-2 flex-wrap">
<button
data-testid="simbrief-file-button"
onclick={openSimBrief}
disabled={isLoading}
class="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
>
{#if isLoading}
<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
Loading plan...
{:else}
📋 File with SimBrief
{/if}
</button>
<button
data-testid="simbrief-load-button"
onclick={loadPlan}
disabled={isLoading}
class="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 text-gray-200 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
>
{#if isLoading}
<div class="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
{:else}
📥 Load from SimBrief
{/if}
</button>
</div>
{:else}
<div class="card-subtle p-3 flex items-center justify-between">
<span class="text-sm text-gray-400">Connect SimBrief to generate flight plans</span>
<a
href="/settings"
data-testid="simbrief-settings-link"
class="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors"
>
Set up in Settings
</a>
</div>
{/if}

{#if error}
<div data-testid="simbrief-error" class="text-sm text-red-400 bg-red-900/20 border border-red-800/50 rounded-lg p-3">
{error}
</div>
{/if}
</div>
