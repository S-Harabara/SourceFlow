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
        isGeneratingDiff,
        isSourceLocal,
        isTargetLocal 
    } from '../../codeReviewStore.js';
    import { getGitDiff } from '../../utils/gitUtils.js';
    import TransformationPanel from '../PromptBuilder/TransformationPanel.svelte';
    import SkillsSelector from '../PromptBuilder/SkillsSelector.svelte';
    import { savedSkills, selectedSkillsForPrompt, incrementSkillUsage } from '../../skillsStore.js';
    import Button from '../Common/Button.svelte';
    import tippy from 'tippy.js';
    import { getProjectStructure } from '../../utils/treeUtils.js';
    import VirtualPromptEditor from '../Common/VirtualPromptEditor.svelte';

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
        if (!$codeReviewProjectPath || !$sourceBranch || !$targetBranch) {
            alert('Select project and branches first');
            return;
        }

        if (!$isSourceLocal || !$isTargetLocal) {
            alert('Both branches must be fetched to local before generating diff.');
            return;
        }

        isGenerating.set(true);
        isGeneratingDiff.set(true);
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

    /** @param {any} e */
    function copyToClipboard(e) {
        navigator.clipboard.writeText($generatedOutput);
        /** @type {any} */(tippy)(e.currentTarget, {
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
        a.download = 'code-review-prompt.txt';
        a.click();
    }
</script>

<section class="grow flex flex-col gap-4 overflow-hidden h-full">
    <div class="bg-white dark:bg-dark-card rounded-2xl border dark:border-dark-border p-4 shadow-sm flex flex-col gap-4 overflow-hidden h-full">
        <div class="flex items-center justify-between pb-2 border-b dark:border-dark-border shrink-0">
            <h2 class="font-bold flex items-center gap-2 text-sm tracking-tight">
                <i class="fas fa-microscope text-blue-500"></i> Review Generation
            </h2>
        </div>

        <div class="shrink-0">
            <div class="flex items-center justify-between">
                <label class="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" bind:checked={$includeGoal} onchange={safeGeneratePrompt} class="w-4 h-4 rounded border-gray-300" />
                    <span class="text-[11px] font-bold py-1 text-gray-600 dark:text-gray-400">Include Project Goal</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" bind:checked={$includeStructure} onchange={safeGeneratePrompt} class="w-4 h-4 rounded border-gray-300" />
                    <span class="text-[11px] font-bold py-1 text-gray-600 dark:text-gray-400">Include Structure</span>
                </label>
            </div>
            {#if $includeGoal}
                <textarea
                    bind:value={$goalText}
                    class="w-full mt-2 bg-gray-50 dark:bg-gray-800 border-none rounded-lg text-xs p-2.5 h-16 outline-none focus:ring-1 focus:ring-blue-500 custom-scrollbar resize-none"
                    placeholder="What should the AI look for in this review?"
                ></textarea>
            {/if}
            
            <div class="w-full mt-3.5">
                <TransformationPanel onchange={generatePrompt} />
                <div class="mt-2 text-left w-full">
                    <SkillsSelector onchange={generatePrompt} />
                </div>
            </div>
        </div>

        <div class="grow flex flex-col relative overflow-hidden bg-white dark:bg-gray-900/40 rounded-xl p-0.5 border dark:border-none w-full min-h-[100px]">
            {#if $isGenerating}
                <div class="absolute inset-0 bg-white/50 dark:bg-dark-bg/50 backdrop-blur-sm z-100 flex items-center justify-center rounded-xl">
                    <div class="flex flex-col items-center gap-3">
                        <div class="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        <span class="text-xs font-bold text-blue-600">Generating Diff...</span>
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
            <Button
                onclick={safeGeneratePrompt}
                variant="primary"
                class="grow"
                icon="fas fa-wand-magic-sparkles"
                label="GENERATE REVIEW PROMPT"
                loading={$isGenerating}
                disabled={!$isGeneratingDiff && (!$isSourceLocal || !$isTargetLocal)}
            />
            <div class="flex gap-2">
                <Button
                    onclick={(e) => copyToClipboard(e)}
                    variant="secondary"
                    icon="fas fa-copy"
                    iconClass="text-blue-500"
                    label="COPY"
                />
                <Button
                    onclick={downloadFile}
                    variant="secondary"
                    icon="fas fa-download"
                    iconClass="text-indigo-500"
                    title="Download Review Prompt"
                />
            </div>
        </div>
    </div>
</section>
