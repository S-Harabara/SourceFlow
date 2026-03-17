<script>
    import {
        includeGoal,
        goalText,
        includeStructure,
        generatedOutput,
        isGenerating,
        previewSize,
        previewTokens,
        fileTreeData
    } from '../../promptStore.js';
    import { 
        sourceBranch, 
        targetBranch, 
        codeReviewProjectPath,
        isGeneratingDiff 
    } from '../../codeReviewStore.js';
    import { getGitDiff } from '../../utils/gitUtils.js';
    import TokenPill from '../PromptBuilder/TokenPill.svelte';
    import TransformationPanel from '../PromptBuilder/TransformationPanel.svelte';
    import SkillsSelector from '../PromptBuilder/SkillsSelector.svelte';
    import { savedSkills, selectedSkillsForPrompt } from '../../skillsStore.js';
    import tippy from 'tippy.js';

    function getProjectStructure() {
        let res = 'PROJECT STRUCTURE:\n';
        const buildStr = (nodes, depth) => {
            nodes
                .sort((a, b) => (a.kind === 'directory' ? -1 : 1))
                .forEach((n) => {
                    const icon = n.kind === 'directory' ? '📁 ' : '📄 ';
                    res += '  '.repeat(depth) + icon + n.name + '\n';
                    if (n.kind === 'directory' && n.children) buildStr(n.children, depth + 1);
                });
        };
        buildStr($fileTreeData, 0);
        return res + '\n';
    }

    async function generatePrompt() {
        if (!$codeReviewProjectPath || !$sourceBranch || !$targetBranch) {
            alert('Select project and branches first');
            return;
        }

        isGenerating.set(true);
        isGeneratingDiff.set(true);
        try {
            let res = '';

            // Inject Skills
            const selectedSkills = $savedSkills.filter((s) => $selectedSkillsForPrompt.includes(s.id));
            if (selectedSkills.length > 0) {
                res += `SKILLS INSTRUCTIONS:\n`;
                selectedSkills.forEach((skill) => {
                    res += `--- SKILL: ${skill.name} ---\n${skill.content}\n\n`;
                });
            }

            if ($includeGoal) res += `GOAL:\n${$goalText}\n\n`;
            if ($includeStructure) res += getProjectStructure();

            res += `GIT DIFF (${$sourceBranch} -> ${$targetBranch}):\n`;
            
            const diff = await getGitDiff($codeReviewProjectPath, $sourceBranch, $targetBranch);
            res += diff + '\n\n';

            generatedOutput.set(res.trim());
        } catch (error) {
            console.error('Error in generateCodeReviewPrompt:', error);
            alert('An error occurred during diff generation. Check console for details.');
        } finally {
            isGenerating.set(false);
            isGeneratingDiff.set(false);
        }
    }

    function copyToClipboard(e) {
        navigator.clipboard.writeText($generatedOutput);
        tippy(e.currentTarget, {
            content: 'Copied!',
            showOnCreate: true,
            theme: 'onyx',
            onHidden: (instance) => instance.destroy()
        });
    }

    function downloadFile() {
        const b = new Blob([$generatedOutput], { type: 'text/plain' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(b);
        a.download = 'code-review-prompt.txt';
        a.click();
    }
</script>

<section class="flex-grow flex flex-col gap-4 overflow-hidden h-full">
    <div class="bg-white dark:bg-dark-card rounded-2xl border dark:border-dark-border p-4 shadow-sm flex flex-col gap-4 overflow-hidden h-full">
        <div class="flex items-center justify-between pb-2 border-b dark:border-dark-border shrink-0">
            <h2 class="font-bold flex items-center gap-2">
                <i class="fas fa-microscope text-purple-500"></i> Review Generation
            </h2>

            <div class="flex items-center gap-3">
                <div class="flex items-center gap-1.5 text-[10px] font-bold uppercase text-gray-400">
                    <span>Size:</span>
                    <span class="text-emerald-500 font-mono">{($previewSize / 1024).toFixed(1)} KB</span>
                </div>
                <TokenPill tokens={$previewTokens} label="tokens" />
            </div>
        </div>

        <div class="">
            <div class="flex items-center justify-between">
                <label class="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" bind:checked={$includeGoal} class="w-4 h-4 rounded border-gray-300" />
                    <span class="text-xs font-bold py-1">Include Project Goal</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" bind:checked={$includeStructure} class="w-4 h-4 rounded border-gray-300" />
                    <span class="text-xs font-bold py-1">Include Structure</span>
                </label>
            </div>
            {#if $includeGoal}
                <textarea
                    bind:value={$goalText}
                    class="w-full mt-2 bg-gray-50 dark:bg-gray-800 border-none rounded-lg text-xs p-2 h-14 outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="What should the AI look for in this review?"
                ></textarea>
            {/if}
            
            <div class="w-full mt-3.5">
                <TransformationPanel on:change={generatePrompt} />
                <div class="mt-2 text-left w-full">
                    <SkillsSelector on:change={generatePrompt} />
                </div>
            </div>
        </div>

        <div class="flex-grow flex flex-col relative overflow-hidden bg-gray-100 dark:bg-gray-900/40 rounded-xl p-1 w-full min-h-[100px]">
            {#if $isGenerating}
                <div class="absolute inset-0 bg-white/50 dark:bg-dark-bg/50 backdrop-blur-sm z-50 flex items-center justify-center rounded-xl">
                    <div class="flex flex-col items-center gap-3">
                        <div class="w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                        <span class="text-xs font-bold text-purple-600">Generating Diff...</span>
                    </div>
                </div>
            {/if}
            <textarea
                bind:value={$generatedOutput}
                class="w-full h-full bg-transparent border-none p-4 font-mono text-[11px] outline-none custom-scrollbar resize-none absolute inset-0 pb-1"
                readonly
                placeholder="Git diff and prompt will appear here..."
            ></textarea>
        </div>

        <div class="flex items-center justify-between gap-4 pt-1 shrink-0">
            <button
                on:click={generatePrompt}
                class="flex-grow bg-purple-600 hover:bg-purple-700 text-white font-black py-3 px-8 rounded-xl shadow-lg shadow-purple-500/20 transform transition-all active:scale-95 flex items-center justify-center gap-3 text-sm"
            >
                <i class="fas fa-wand-magic-sparkles"></i> GENERATE REVIEW PROMPT
            </button>
            <div class="flex gap-2">
                <button
                    on:click={(e) => copyToClipboard(e)}
                    class="flex items-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl text-xs font-bold transition-all"
                >
                    <i class="fas fa-copy text-purple-500"></i> COPY
                </button>
                <button
                    on:click={downloadFile}
                    class="flex items-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl text-xs font-bold transition-all"
                >
                    <i class="fas fa-download text-indigo-500"></i> DOWNLOAD
                </button>
            </div>
        </div>
    </div>
</section>
