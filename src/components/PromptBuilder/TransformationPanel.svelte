<script>
	import { removeComments, minifyOutput } from '../../promptStore.js';
	import { slide } from 'svelte/transition';
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	let isExpanded = false;

	function onChange() {
		dispatch('change');
	}
</script>

<div class="flex flex-col w-full">
	<button
		on:click={() => (isExpanded = !isExpanded)}
		class="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all border dark:border-dark-border"
	>
		<div class="flex items-center gap-2">
			<i class="fas fa-magic text-yellow-500 text-xs"></i>
			<span class="text-[11px] font-bold uppercase tracking-wider">Transformation</span>
		</div>
		<i class="fas fa-chevron-down text-[10px] transition-transform duration-300" class:rotate-180={isExpanded}></i>
	</button>

	{#if isExpanded}
		<div
			transition:slide={{ duration: 300 }}
			class="mt-2 grid grid-cols-2 gap-2 p-2 bg-gray-50/50 dark:bg-gray-800/50 rounded-lg border border-dashed dark:border-dark-border"
		>
			<label class="flex items-center gap-2 px-2 py-1.5 bg-white dark:bg-dark-card border dark:border-dark-border rounded-md cursor-pointer hover:shadow-sm transition-all">
				<input
					type="checkbox"
					bind:checked={$removeComments}
					on:change={onChange}
					class="w-3.5 h-3.5 border-gray-300 dark:border-dark-border"
				/>
				<span class="text-[10px] font-medium">No Comments</span>
			</label>
			<label class="flex items-center gap-2 px-2 py-1.5 bg-white dark:bg-dark-card border dark:border-dark-border rounded-md cursor-pointer hover:shadow-sm transition-all">
				<input
					type="checkbox"
					bind:checked={$minifyOutput}
					on:change={onChange}
					class="w-3.5 h-3.5 border-gray-300 dark:border-dark-border"
				/>
				<span class="text-[10px] font-medium">Minify</span>
			</label>
		</div>
	{/if}
</div>
