<script>
	import { sourceBranch, targetBranch, codeReviewProjectName } from '../../codeReviewStore.js';
	import { previewSize, previewTokens } from '../../promptStore.js';
	import { selectFolder } from '../../utils/folderPicker.js';
	import TokenPill from '../PromptBuilder/TokenPill.svelte';
</script>

<nav
	class="h-14 border-b dark:border-dark-border bg-white dark:bg-dark-card flex items-center justify-between px-4 z-50 shrink-0 select-none"
>
	<div class="flex items-center gap-4">
		<button
			on:click={selectFolder}
			class="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-xs font-bold shadow-sm"
		>
			<i class="fas fa-folder-open"></i>
			<span>{$codeReviewProjectName ? 'CHANGE PROJECT' : 'SELECT PROJECT'}</span>
		</button>

		{#if $codeReviewProjectName}
			<div class="h-6 w-px bg-gray-200 dark:bg-dark-border mx-2"></div>
			<div class="flex items-center gap-2 text-xs font-mono text-gray-500 dark:text-gray-400">
				<i class="fas fa-code-branch text-[10px]"></i>
				<span class="font-bold text-gray-900 dark:text-gray-100">{$sourceBranch || '...'}</span>
				<i class="fas fa-arrow-right text-[10px] opacity-30"></i>
				<span class="font-bold text-gray-900 dark:text-gray-100">{$targetBranch || '...'}</span>
			</div>
		{/if}
	</div>

	<div class="flex items-center gap-8 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
		<div class="flex flex-col items-end">
			<span class="opacity-60">Diff Size</span>
			<span class="text-gray-900 dark:text-white font-mono">{($previewSize / 1024).toFixed(1)} KB</span>
		</div>
		<TokenPill tokens={$previewTokens} label="Prompt Tokens" />
	</div>
</nav>
