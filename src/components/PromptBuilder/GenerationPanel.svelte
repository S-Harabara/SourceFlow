<script>
	import {
		includeGoal,
		goalText,
		includeStructure,
		removeComments,
		minifyOutput,
		generatedOutput,
		isGenerating,
		previewSize,
		previewTokens,
		selectedFiles,
		fileTreeData,
		fileHandles
	} from '../../promptStore.js';

	import { getProjectStructure } from '../../utils/treeUtils.js';

	import { minify as terserMinify } from 'terser';
	import { minify as cssoMinify } from 'csso';
	import tippy from 'tippy.js';

	const cleanComments = (s) => {
		if (!s) return s;
		// 1. Remove multi-line comments
		let res = s.replace(/\/\*[\s\S]*?\*\//g, '');
		// 2. Remove single-line comments line by line
		return res
			.split('\n')
			.map((line) => {
				const index = line.indexOf('//');
				if (index !== -1) {
					const before = line.substring(0, index);
					if (!before.trim().endsWith('http:') && !before.trim().endsWith('https:')) {
						return before.trimEnd();
					}
				}
				return line;
			})
			.join('\n');
	};

	/** @param {string} s */
	const minifyHTML = (s) => {
		if (!s) return s;
		return s
			.replace(/<!--[\s\S]*?-->/g, '') // Remove HTML comments
			.replace(/>\s+</g, '><') // Remove space between tags
			.replace(/\s+/g, ' ') // Collapse other whitespace
			.trim();
	};

	const minifyCode = async (s, filename = '') => {
		if (!s) return s;
		const ext = filename.split('.').pop().toLowerCase();

		try {
			if (['js', 'ts', 'jsx', 'tsx'].includes(ext)) {
				const result = await terserMinify(s, {
					compress: true,
					mangle: false,
					format: { comments: false }
				});
				return result.code || s;
			} else if (['css', 'scss', 'less'].includes(ext)) {
				// csso is generally safe in browser
				return cssoMinify(s).css;
			} else if (['html', 'svelte', 'vue', 'svg'].includes(ext)) {
				// Avoiding html-minifier-terser as it requires Node 'path'
				return minifyHTML(s);
			}
		} catch (e) {
			console.warn(`Library minification failed for ${filename}, falling back to regex:`, e);
		}

		// Generic fallback
		const noComments = cleanComments(s);
		return noComments.replace(/\s+/g, ' ').trim();
	};

	import SkillsSelector from './SkillsSelector.svelte';
	import TransformationPanel from './TransformationPanel.svelte';
	import TokenPill from '../Common/TokenPill.svelte';
	import Button from '../Common/Button.svelte';
	import VirtualPromptEditor from '../Common/VirtualPromptEditor.svelte';
	import { savedSkills, selectedSkillsForPrompt, incrementSkillUsage } from '../../skillsStore.js';

	let isDirty = $state(false);
	/** @type {any} */
	let editorComponent = $state();

	async function safeGeneratePrompt() {
		if (isDirty) {
			if (!confirm('You have manually edited the output. Regenerating will override your changes. Continue?')) {
				return;
			}
		}
		await generatePrompt();
		isDirty = false;
	}

	async function generatePrompt() {
		if ($selectedFiles.size === 0 && !$includeStructure) {
			alert('Select files first');
			return;
		}

		isGenerating.set(true);
		try {
			let res = '';

			if ($includeGoal) res += `GOAL:\n${$goalText}\n\n`;

			// Inject Skills
			const selectedSkills = $savedSkills.filter((/** @type {any} */ s) => $selectedSkillsForPrompt.includes(s.id));
			if (selectedSkills.length > 0) {
				res += `SKILLS INSTRUCTIONS:\n`;
				selectedSkills.forEach((/** @type {any} */ skill) => {
					res += `--- SKILL: ${skill.name} ---\n${skill.content}\n\n`;
					incrementSkillUsage(skill.id);
				});
			}

			if ($includeStructure) res += getProjectStructure($fileTreeData);

			const paths = Array.from($selectedFiles);
			for (const p of paths) {
				const h = $fileHandles.find((x) => x.p === p);
				if (h) {
					const file = await h.h.getFile();
					let txt = await file.text();

					if ($removeComments) txt = cleanComments(txt);
					if ($minifyOutput) {
						try {
							txt = await minifyCode(txt, p);
						} catch (err) {
							console.error(`Minification failed for ${p}:`, err);
						}
					}

					res += `--- FILE: ${p} ---\n${txt}\n\n`;
				}
			}

			generatedOutput.set(res.trim());
		} catch (error) {
			console.error('Error in generatePrompt:', error);
			alert('An error occurred during generation. Check console for details.');
		} finally {
			isGenerating.set(false);
		}
	}

	/** @param {any} e */
	function copyToClipboard(e) {
		navigator.clipboard.writeText($generatedOutput);
		/** @type {any} */ (tippy)(e.currentTarget, {
			content: 'Copied!',
			showOnCreate: true,
			theme: 'onyx',
			onHidden: (/** @type {any} */ instance) => instance.destroy()
		});
	}

	function downloadFile() {
		const b = new Blob([$generatedOutput], { type: 'text/plain' });
		const a = document.createElement('a');
		a.href = URL.createObjectURL(b);
		a.download = 'prompt.txt';
		a.click();
	}
</script>

<section class="flex-grow flex flex-col gap-4 overflow-hidden h-full">
	<div
		class="bg-white dark:bg-dark-card rounded-2xl border dark:border-dark-border p-4 shadow-sm flex flex-col gap-4 overflow-hidden h-full"
	>
		<div class="flex items-center justify-between pb-2 border-b dark:border-dark-border shrink-0">
			<h2 class="font-bold flex items-center gap-2">
				<i class="fas fa-terminal text-blue-500"></i> Generation
			</h2>

			<div class="flex items-center gap-3">
				<!-- Size pill -->
				<div class="flex items-center gap-1.5 text-[10px] font-bold uppercase text-gray-400">
					<span>Size:</span>
					<span class="text-blue-500 font-mono">{($previewSize / 1024).toFixed(1)} KB</span>
				</div>

				<TokenPill tokens={$previewTokens} label="tokens" />
			</div>
		</div>

		<div class="">
			<div class="">
				<div class="flex items-center justify-between">
					<label class="flex items-center gap-2 cursor-pointer">
						<input type="checkbox" bind:checked={$includeGoal} onchange={safeGeneratePrompt} class="w-4 h-4 rounded border-gray-300" />
						<span class="text-xs font-bold py-1">Include Project Goal</span>
					</label>
					<label class="flex items-center gap-2 cursor-pointer">
						<input type="checkbox" bind:checked={$includeStructure} onchange={safeGeneratePrompt} class="w-4 h-4 rounded border-gray-300" />
						<span class="text-xs font-bold py-1">Include Structure</span>
					</label>
				</div>
				{#if $includeGoal}
					<textarea
						bind:value={$goalText}
						class="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-lg text-xs p-2 h-14 outline-none focus:ring-1 focus:ring-blue-500"
						placeholder="What should the AI achieve?"
					></textarea>
				{/if}
			</div>
			<div class="w-full mt-3.5">
				<TransformationPanel onchange={safeGeneratePrompt} />

				<div class="mt-2 text-left w-full">
					<SkillsSelector onchange={safeGeneratePrompt} />
				</div>
			</div>
		</div>

		<div class="flex-grow flex flex-col relative overflow-hidden bg-white dark:bg-gray-900/40 rounded-xl p-0.5 border dark:border-none w-full min-h-[100px]">
			{#if $isGenerating}
				<div class="absolute inset-0 bg-white/50 dark:bg-dark-bg/50 backdrop-blur-sm z-100 flex items-center justify-center rounded-xl">
					<div class="flex flex-col items-center gap-3">
						<div class="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
						<span class="text-xs font-bold text-blue-600">Processing...</span>
					</div>
				</div>
			{/if}
			
			<div class="absolute top-2 right-4 z-50 flex gap-1">
				<Button onclick={() => editorComponent?.expandAll()} variant="ghost" class="px-2! py-1! text-[9px]! text-gray-400 hover:text-blue-500" icon="fas fa-expand-arrows-alt" label="EXPAND ALL" />
				<Button onclick={() => editorComponent?.collapseAll()} variant="ghost" class="px-2! py-1! text-[9px]! text-gray-400 hover:text-blue-500" icon="fas fa-compress-arrows-alt" label="COLLAPSE ALL" />
			</div>

			<VirtualPromptEditor 
				bind:this={editorComponent}
				bind:value={$generatedOutput} 
				bind:isDirty={isDirty}
			/>
		</div>

		<div class="flex items-center justify-between gap-4 pt-1 shrink-0">
			<Button onclick={safeGeneratePrompt} variant="primary" class="grow" icon="fas fa-bolt" label="GENERATE PROMPT" loading={$isGenerating} />
			<div class="flex gap-2">
				<Button onclick={(e) => copyToClipboard(e)} variant="secondary" icon="fas fa-copy" iconClass="text-blue-500" label="COPY" />
				<Button onclick={downloadFile} variant="secondary" icon="fas fa-download" iconClass="text-indigo-500" label="DOWNLOAD" />
			</div>
		</div>
	</div>
</section>
