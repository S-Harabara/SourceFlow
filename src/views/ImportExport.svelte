<script>
    import { savedSkills, addSkill } from '../skillsStore.js';
    import Button from '../components/Common/Button.svelte';
    import { fade, slide } from 'svelte/transition';

    const { ipcRenderer } = window.require('electron');

    /** @type {Set<string>} */
    let exportSelection = new Set();
    /** @type {any} */
    let importData = null; // { skills: [] }
    /** @type {any[]} */
    let importSelection = []; // [{ skillIndex, selected: bool, files: [ { path, selected: bool } ] }]
    let activeTab = 'export'; // 'export' | 'import'

    $: allSelected = $savedSkills.length > 0 && exportSelection.size === $savedSkills.length;

    function toggleSelectAll() {
        if (allSelected) {
            exportSelection = new Set();
        } else {
            exportSelection = new Set($savedSkills.map(s => s.id));
        }
    }

    /** @param {string} id */
    function toggleSkillExport(id) {
        if (exportSelection.has(id)) {
            exportSelection.delete(id);
        } else {
            exportSelection.add(id);
        }
        exportSelection = exportSelection; // trigger reactivity
    }

    async function handleExport() {
        if (exportSelection.size === 0) return;

        const skillsToExport = $savedSkills.filter(s => exportSelection.has(s.id));
        const exportObj = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            skills: skillsToExport
        };

        const result = await ipcRenderer.invoke('file:save-dialog', {
            defaultPath: 'skills_backup.json',
            filters: [{ name: 'JSON', extensions: ['json'] }]
        });

        if (!result.canceled && result.filePath) {
            await ipcRenderer.invoke('file:write-file', {
                filePath: result.filePath,
                content: JSON.stringify(exportObj, null, 2)
            });
            alert('Skills exported successfully!');
        }
    }

    async function handleImportPicker() {
        const result = await ipcRenderer.invoke('file:open-dialog', {
            filters: [{ name: 'JSON', extensions: ['json'] }]
        });

        if (!result.canceled && result.filePaths.length > 0) {
            try {
                const content = await ipcRenderer.invoke('file:read-file', { filePath: result.filePaths[0] });
                const parsed = JSON.parse(content);
                
                if (!parsed.skills || !Array.isArray(parsed.skills)) {
                    throw new Error('Invalid skill pack format.');
                }

                importData = parsed;
                importSelection = parsed.skills.map((/** @type {any} */ s, /** @type {number} */ idx) => ({
                    skillIndex: idx,
                    selected: true,
                    files: (s.linkedFiles || []).map((/** @type {any} */ f) => ({ path: f.path, selected: true }))
                }));
            } catch (/** @type {any} */ e) {
                alert('Error reading import file: ' + e.message);
            }
        }
    }

    async function completeImport() {
        /** @type {any[]} */
        const skillsToImport = [];
        
        importSelection.forEach(sel => {
            if (sel.selected) {
                const originalSkill = importData.skills[sel.skillIndex];
                const selectedFiles = originalSkill.linkedFiles ? originalSkill.linkedFiles.filter((/** @type {any} */ f, /** @type {number} */ fIdx) => sel.files[fIdx].selected) : [];
                
                // Reconstruct content based on selected files if needed
                // Note: The original content might already have appended files. 
                // We might want to strip them and re-append only selected ones, 
                // but for simplicity, we'll just use the skill as is if it's custom, 
                // or update it if it has linked files.
                
                const skillCopy = { ...originalSkill };
                skillCopy.linkedFiles = selectedFiles;
                
                // Update content to only include selected files
                // We assuming the content preserved the original instructions before <!-- Linked file -->
                const parts = skillCopy.content.split('\n\n---\n<!-- Linked file:');
                let baseContent = parts[0];
                
                if (selectedFiles.length > 0) {
                    const appendedContent = selectedFiles
                        .map((/** @type {any} */ f) => `\n\n---\n<!-- Linked file: ${f.path} -->\n${f.content}`)
                        .join('');
                    skillCopy.content = baseContent + appendedContent;
                } else {
                    skillCopy.content = baseContent;
                }

                // Generate new ID to avoid collisions or keep if intended?
                // User might want to overwrite or add as new.
                // Let's add a suffix if ID already exists.
                const exists = $savedSkills.some(s => s.id === skillCopy.id);
                if (exists) {
                    skillCopy.id = skillCopy.id + '-imported-' + Math.random().toString(36).substr(2, 4);
                    skillCopy.name = skillCopy.name + ' (Imported)';
                }

                skillsToImport.push(skillCopy);
            }
        });

        if (skillsToImport.length > 0) {
            for (const skill of skillsToImport) {
                await addSkill(skill);
            }
            alert(`Successfully imported ${skillsToImport.length} skill(s).`);
            importData = null;
            importSelection = [];
            activeTab = 'export';
        }
    }

    /** @param {number} idx */
    function toggleImportSkill(idx) {
        importSelection[idx].selected = !importSelection[idx].selected;
        importSelection = [...importSelection];
    }

    /** 
     * @param {number} sIdx 
     * @param {number} fIdx 
     */
    function toggleImportFile(sIdx, fIdx) {
        importSelection[sIdx].files[fIdx].selected = !importSelection[sIdx].files[fIdx].selected;
        importSelection = [...importSelection];
    }

    /** @param {KeyboardEvent} e, @param {string} id */
    function handleSkillKeyDown(e, id) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleSkillExport(id);
        }
    }

    /** @param {KeyboardEvent} e, @param {number} idx */
    function handleImportSkillKeyDown(e, idx) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleImportSkill(idx);
        }
    }
</script>

<div class="grow flex flex-col p-6 h-full overflow-hidden bg-gray-50 dark:bg-dark-bg transition-colors relative">
    <div class="max-w-5xl w-full mx-auto flex flex-col h-full gap-6">
        
        <!-- Header -->
        <div class="flex items-end justify-between shrink-0">
            <div>
                <h1 class="text-3xl font-black tracking-tight flex items-center gap-3">
                    <i class="fas fa-file-export text-blue-500"></i> Import/Export Skills
                </h1>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-2 font-medium">Backup your library or share skills with others.</p>
            </div>
        </div>

        <!-- Tabs -->
        <div class="flex gap-2 border-b dark:border-dark-border shrink-0">
            <button
                class="px-6 py-3 font-bold text-sm border-b-2 transition-colors {activeTab === 'export' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}"
                on:click={() => { activeTab = 'export'; importData = null; }}>
                <i class="fas fa-file-arrow-up mr-2"></i> Export Skills
            </button>
            <button
                class="px-6 py-3 font-bold text-sm border-b-2 transition-colors {activeTab === 'import' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}"
                on:click={() => activeTab = 'import'}>
                <i class="fas fa-file-arrow-down mr-2"></i> Import Skills
            </button>
        </div>

        <div class="grow overflow-y-auto custom-scrollbar pb-8">
            {#if activeTab === 'export'}
                <div class="flex flex-col gap-4">
                    <div class="flex items-center justify-between bg-white dark:bg-dark-card border dark:border-dark-border p-4 rounded-2xl shadow-sm">
                        <div class="flex items-center gap-4">
                            <label class="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={allSelected} on:change={toggleSelectAll} class="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500">
                                <span class="text-sm font-bold">{allSelected ? 'Deselect All' : 'Select All'}</span>
                            </label>
                            <span class="text-xs text-gray-400 font-medium">{exportSelection.size} skills selected for export</span>
                        </div>
                        <Button 
                            onclick={handleExport}
                            variant="primary"
                            disabled={exportSelection.size === 0}
                            icon="fas fa-download"
                            label="Export Selected"
                        />
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {#each $savedSkills as skill (skill.id)}
                            <!-- svelte-ignore a11y-click-events-have-key-events -->
                            <div
                                class="bg-white dark:bg-dark-card border dark:border-dark-border rounded-2xl p-4 flex items-start gap-4 shadow-sm hover:shadow-md transition-all cursor-pointer {exportSelection.has(skill.id) ? 'border-blue-500 ring-1 ring-blue-500' : ''}"
                                on:click={() => toggleSkillExport(skill.id)}
                                on:keydown={(e) => handleSkillKeyDown(e, skill.id)}
                                role="checkbox"
                                aria-checked={exportSelection.has(skill.id)}
                                tabindex="0"
                            >
                                <input type="checkbox" checked={exportSelection.has(skill.id)} class="w-4 h-4 mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500 shrink-0">
                                <div class="grow min-w-0">
                                    <h4 class="font-bold text-sm truncate">{skill.name}</h4>
                                    <p class="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">{skill.description}</p>
                                    <div class="flex gap-2 mt-2">
                                        {#if skill.linkedFiles && skill.linkedFiles.length > 0}
                                            <span class="text-[9px] font-bold px-1.5 py-0.5 bg-green-50 dark:bg-green-900/20 text-green-600 rounded">
                                                {skill.linkedFiles.length} files
                                            </span>
                                        {/if}
                                        <span class="text-[9px] font-bold px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded">
                                            {skill.author || 'Me'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        {/each}
                    </div>
                </div>
            {:else}
                <div class="flex flex-col gap-6">
                    {#if !importData}
                        <div class="flex flex-col items-center justify-center p-12 border-2 border-dashed dark:border-dark-border rounded-3xl bg-white dark:bg-dark-card/30">
                            <i class="fas fa-file-import text-6xl text-gray-200 dark:text-gray-700 mb-4"></i>
                            <h3 class="text-lg font-bold mb-2">Ready to Import?</h3>
                            <p class="text-sm text-gray-400 text-center max-w-sm mb-6">Select a skills backup file (.json) to see what's inside and choose which skills to add to your library.</p>
                            <Button 
                                onclick={handleImportPicker}
                                variant="primary"
                                icon="fas fa-folder-open"
                                label="Select Skill Pack"
                                class="px-8! py-3!"
                            />
                        </div>
                    {:else}
                        <div class="flex items-center justify-between bg-white dark:bg-dark-card border dark:border-dark-border p-4 rounded-2xl shadow-sm sticky top-0 z-10">
                            <div class="flex items-center gap-4">
                                <span class="text-sm font-bold text-blue-500">{importData.skills.length} skills found in file</span>
                                <span class="text-xs text-gray-400 font-medium">{importSelection.filter(s => s.selected).length} selected for import</span>
                            </div>
                            <div class="flex gap-2">
                                <Button 
                                    onclick={() => importData = null}
                                    variant="secondary"
                                    label="Cancel"
                                />
                                <Button 
                                    onclick={completeImport}
                                    variant="primary"
                                    disabled={importSelection.filter(s => s.selected).length === 0}
                                    icon="fas fa-plus"
                                    label="Import Selected"
                                />
                            </div>
                        </div>

                        <div class="flex flex-col gap-4">
                            {#each importData.skills as skill, idx}
                                <div class="bg-white dark:bg-dark-card border dark:border-dark-border rounded-2xl overflow-hidden shadow-sm transition-all {importSelection[idx].selected ? 'ring-1 ring-blue-500 border-blue-500' : 'opacity-60'}">
                                    <div class="p-4 flex items-start gap-4 cursor-pointer" on:click={() => toggleImportSkill(idx)} on:keydown={(e) => handleImportSkillKeyDown(e, idx)} role="button" tabindex="0">
                                        <input type="checkbox" checked={importSelection[idx].selected} class="w-4 h-4 mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500 shrink-0">
                                        <div class="grow min-w-0">
                                            <div class="flex items-center gap-3">
                                                <h4 class="font-bold text-base truncate">{skill.name}</h4>
                                                <span class="text-[10px] font-bold text-gray-400">by {skill.author || 'Unknown'}</span>
                                            </div>
                                            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">{skill.description}</p>
                                        </div>
                                    </div>
                                    
                                    {#if importSelection[idx].selected && skill.linkedFiles && skill.linkedFiles.length > 0}
                                        <div class="bg-gray-50 dark:bg-gray-800/50 p-4 border-t dark:border-dark-border" transition:slide>
                                            <div class="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3">Include Linked Files:</div>
                                            <div class="flex flex-wrap gap-3">
                                                {#each skill.linkedFiles as file, fIdx}
                                                    <label class="flex items-center gap-2 p-2 bg-white dark:bg-dark-card border dark:border-dark-border rounded-xl cursor-pointer hover:border-blue-400 transition-colors">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={importSelection[idx].files[fIdx].selected}
                                                            on:change={() => toggleImportFile(idx, fIdx)}
                                                            class="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                        >
                                                        <span class="text-[11px] font-mono font-bold truncate max-w-[150px]">{file.path}</span>
                                                    </label>
                                                {/each}
                                            </div>
                                        </div>
                                    {/if}
                                </div>
                            {/each}
                        </div>
                    {/if}
                </div>
            {/if}
        </div>
    </div>
</div>

<style>
    .custom-scrollbar::-webkit-scrollbar {
        width: 6px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
        background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
        background: #e2e8f0;
        border-radius: 10px;
    }
    :global(.dark) .custom-scrollbar::-webkit-scrollbar-thumb {
        background: #334155;
    }
</style>
