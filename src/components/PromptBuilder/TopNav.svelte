<script>
	import {
		totalSelectedSize,
		totalSelectedTokens,
		selectedFiles
	} from '../../promptStore.js';
</script>

<nav
	class="h-14 border-b dark:border-dark-border bg-white dark:bg-dark-card flex items-center justify-between px-4 z-50 shrink-0 select-none"
>
	<div class="flex items-center gap-4 invisible w-10"></div>
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
		<div class="flex flex-col items-end border-l dark:border-dark-border pl-8">
			<span class="text-blue-500 opacity-80">Global Tokens (est)</span>
			<span class="text-blue-600 dark:text-blue-400 font-mono tracking-normal">{$totalSelectedTokens.toLocaleString()}</span>
		</div>
	</div>

	<div class="flex items-center gap-2">
		<!-- Folder picker moved to Explorer -->
	</div>
</nav>
