<script>
	import {
		totalSelectedSize,
		totalSelectedTokens,
		selectedFiles
	} from '../../promptStore.js';
	import { selectFolder } from '../../utils/folderPicker.js';
	import TokenPill from '../Common/TokenPill.svelte';
</script>

<nav
	class="h-14 border-b dark:border-dark-border bg-white dark:bg-dark-card flex items-center justify-between px-4 z-50 shrink-0 select-none"
>
	<div class="flex items-center gap-4">
		<button
			on:click={selectFolder}
			class="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-xs font-bold shadow-sm"
		>
			<i class="fas fa-folder-open"></i>
			<span>SELECT PROJECT</span>
		</button>
	</div>
	<!-- spacing -->

	<div class="flex items-center gap-8 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
		<div class="flex flex-col items-end">
			<span class="opacity-60">Total Selected</span>
			<span class="text-gray-900 dark:text-white font-mono">{($totalSelectedSize / 1024).toFixed(1)} KB</span>
		</div>
		<div class="flex flex-col items-end">
			<span class="opacity-60">Selected Files</span>
			<span class="text-gray-900 dark:text-white font-mono">{$selectedFiles.size}</span>
		</div>
		<TokenPill tokens={$totalSelectedTokens} label="Total Tokens" />
	</div>

	<div class="flex items-center gap-2">
		<!-- Folder picker moved to Explorer -->
	</div>
</nav>
