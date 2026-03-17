<script>
    import { savedSkills, favoriteSkillIds, addSkill, removeSkill, toggleFavorite, updateSkill } from '../skillsStore.js';
    import { fetchSkillFromUrl, parseSkillFile } from '../utils/skillsFetcher.js';
    import { fade, slide } from 'svelte/transition';

    let urlInput = '';
    let isFetching = false;
    let fetchError = '';
    let activeTab = 'library'; // 'library' | 'create'
    let isDragging = false;

    // Skill Preview/Edit Modal State
    let selectedSkill = null;
    let isEditMode = false;
    let editName = '';
    let editDescription = '';
    let editContent = '';

    // Create My Skill form
    let createTitle = '';
    let createDescription = '';
    let createSaveError = '';

    async function handleAddUrl(targetUrl = urlInput) {
        if (!targetUrl.trim()) return;

        isFetching = true;
        fetchError = '';
        try {
            const skill = await fetchSkillFromUrl(targetUrl);
            addSkill(skill);
            urlInput = '';
            activeTab = 'library';
        } catch (e) {
            fetchError = e.message;
        } finally {
            isFetching = false;
        }
    }

    // ---- Skill Modal ----
    function openSkillModal(skill) {
        selectedSkill = skill;
        isEditMode = false;
        editName = skill.name;
        editDescription = skill.description;
        editContent = skill.content;
    }

    function closeSkillModal() {
        selectedSkill = null;
        isEditMode = false;
    }

    function enterEditMode() {
        isEditMode = true;
        editName = selectedSkill.name;
        editDescription = selectedSkill.description;
        editContent = selectedSkill.content;
    }

    function saveSkillEdits() {
        updateSkill(selectedSkill.id, {
            name: editName.trim() || selectedSkill.name,
            description: editDescription.trim(),
            content: editContent,
        });
        // Refresh local reference
        selectedSkill = { ...selectedSkill, name: editName.trim() || selectedSkill.name, description: editDescription.trim(), content: editContent };
        isEditMode = false;
    }

    // ---- Create My Skill ----
    function handleCreateSkill() {
        if (!createTitle.trim()) {
            createSaveError = 'Please enter a skill title.';
            return;
        }
        createSaveError = '';

        const id = createTitle.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.random().toString(36).substr(2, 5);
        const skill = {
            id,
            name: createTitle.trim(),
            description: createDescription.trim() || 'Custom skill',
            content: createDescription.trim(),
            sourceUrl: 'custom://' + id,
            isLocal: false,
            isCustom: true,
        };
        addSkill(skill);
        createTitle = '';
        createDescription = '';
        activeTab = 'library';
    }

    // ---- Drag and Drop ----
    function handleDragEnter(e) { e.preventDefault(); isDragging = true; }
    function handleDragLeave(e) { e.preventDefault(); isDragging = false; }
    function handleDragOver(e) { e.preventDefault(); isDragging = true; }
    function handleDrop(e) {
        e.preventDefault();
        isDragging = false;
        fetchError = '';

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            Array.from(files).forEach(file => {
                if (file.name.endsWith('.md')) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const content = event.target.result;
                        const skill = parseSkillFile(content);
                        skill.sourceUrl = 'local://' + file.name;
                        skill.isLocal = true;
                        if (skill.name === 'unknown-skill') {
                            skill.name = file.name.replace('.md', '');
                        }
                        addSkill(skill);
                    };
                    reader.readAsText(file);
                } else {
                    fetchError = 'Dropped file must be a Markdown (.md) file.';
                }
            });
            activeTab = 'library';
        }
    }
</script>

<div class="flex-grow flex flex-col p-6 h-full overflow-hidden bg-gray-50 dark:bg-dark-bg transition-colors"
    on:dragenter={handleDragEnter}
    on:dragleave={handleDragLeave}
    on:dragover={handleDragOver}
    on:drop={handleDrop}>

    <!-- Drag overlay -->
    {#if isDragging}
        <div class="absolute inset-0 z-50 bg-blue-500/10 backdrop-blur-sm border-4 border-dashed border-blue-500 flex items-center justify-center rounded-2xl m-4">
            <div class="bg-white dark:bg-dark-card p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-4 animate-bounce">
                <i class="fas fa-file-import text-6xl text-blue-500"></i>
                <h2 class="text-2xl font-black">Drop SKILL.md here</h2>
            </div>
        </div>
    {/if}

    <div class="max-w-5xl w-full mx-auto flex flex-col h-full gap-6">

        <!-- Header -->
        <div class="flex items-end justify-between shrink-0">
            <div>
                <h1 class="text-3xl font-black tracking-tight flex items-center gap-3">
                    <i class="fas fa-book-sparkles text-blue-500"></i> Skills Library
                </h1>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-2 font-medium">Manage custom instructions to power up your agent generations.</p>
            </div>
        </div>

        <!-- skills.sh Callout Banner -->
        <div class="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 border border-indigo-100 dark:border-indigo-800/30 rounded-2xl p-4 flex items-start gap-4 shrink-0">
            <div class="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5">
                <i class="fas fa-compass text-lg"></i>
            </div>
            <div class="flex-grow">
                <h3 class="font-bold text-sm text-indigo-700 dark:text-indigo-300">Discover Skills at skills.sh</h3>
                <p class="text-xs text-indigo-600/80 dark:text-indigo-400/80 mt-1 leading-relaxed">
                    Browse thousands of community-built skills at
                    <a href="https://skills.sh/" target="_blank" rel="noreferrer"
                        class="underline font-bold hover:text-indigo-800 dark:hover:text-indigo-200 transition-colors">skills.sh</a>.
                    Find one you like, copy its GitHub URL, and paste it below to add it to your library instantly.
                </p>
            </div>
            <a href="https://skills.sh/" target="_blank" rel="noreferrer"
                class="shrink-0 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-1.5">
                <i class="fas fa-arrow-up-right-from-square"></i> Visit
            </a>
        </div>

        <!-- Add Skill Bar -->
        <div class="bg-white dark:bg-dark-card rounded-2xl p-4 border dark:border-dark-border shadow-sm flex flex-col gap-3 shrink-0">
            <h3 class="text-xs font-bold uppercase tracking-wider text-gray-400">Add Skill from GitHub</h3>
            <div class="flex gap-3">
                <div class="relative flex-grow">
                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <i class="fab fa-github text-gray-400"></i>
                    </div>
                    <input
                        type="text"
                        bind:value={urlInput}
                        on:keydown={(e) => e.key === 'Enter' && handleAddUrl()}
                        placeholder="Paste a GitHub URL to a SKILL.md file or directory..."
                        class="w-full bg-gray-50 dark:bg-gray-800/50 border dark:border-dark-border rounded-xl py-3 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    >
                </div>
                <button
                    on:click={() => handleAddUrl()}
                    disabled={isFetching || !urlInput.trim()}
                    class="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2">
                    {#if isFetching}
                        <i class="fas fa-spinner fa-spin"></i> Fetching...
                    {:else}
                        <i class="fas fa-plus"></i> Add
                    {/if}
                </button>
            </div>
            {#if fetchError}
                <div class="text-red-500 text-xs font-bold flex items-center gap-2 mt-1">
                    <i class="fas fa-circle-exclamation"></i> {fetchError}
                </div>
            {/if}
            <div class="text-[10px] text-gray-400 font-medium ml-1">
                <i class="fas fa-info-circle"></i> Tip: You can also drag and drop local <code class="bg-gray-100 dark:bg-gray-800 px-1 rounded">SKILL.md</code> files anywhere on this page.
            </div>
        </div>

        <!-- Tabs -->
        <div class="flex gap-2 border-b dark:border-dark-border shrink-0">
            <button
                class="px-6 py-3 font-bold text-sm border-b-2 transition-colors {activeTab === 'library' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}"
                on:click={() => activeTab = 'library'}>
                <i class="fas fa-layer-group mr-2"></i> My Library ({$savedSkills.length})
            </button>
            <button
                class="px-6 py-3 font-bold text-sm border-b-2 transition-colors {activeTab === 'create' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}"
                on:click={() => activeTab = 'create'}>
                <i class="fas fa-pen-nib mr-2"></i> Create My Skill
            </button>
        </div>

        <!-- Tab Content -->
        <div class="flex-grow overflow-y-auto custom-scrollbar pb-8 relative">

            {#if activeTab === 'library'}
                {#if $savedSkills.length === 0}
                    <div class="absolute inset-0 flex flex-col items-center justify-center text-gray-400 gap-4">
                        <i class="fas fa-box-open text-6xl opacity-20"></i>
                        <p class="font-medium text-sm text-center max-w-xs">Your library is empty. Paste a GitHub URL above to add a skill, or create your own in the "Create My Skill" tab.</p>
                        <button on:click={() => activeTab = 'create'} class="mt-2 px-4 py-2 bg-white dark:bg-dark-card border dark:border-dark-border rounded-lg text-sm font-bold shadow-sm hover:border-blue-500 transition-colors">
                            <i class="fas fa-pen-nib mr-2 text-blue-500"></i> Create a Skill
                        </button>
                    </div>
                {:else}
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {#each $savedSkills as skill (skill.id)}
                            <!-- svelte-ignore a11y-click-events-have-key-events -->
                            <div
                                class="bg-white dark:bg-dark-card border dark:border-dark-border rounded-2xl p-4 flex flex-col gap-3 shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all group relative cursor-pointer"
                                on:click={() => openSkillModal(skill)}
                                role="button"
                                tabindex="0">
                                <div class="flex items-start justify-between">
                                    <div class="flex items-center gap-3">
                                        <div class="w-10 h-10 rounded-xl {skill.isCustom ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-500' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-500'} flex items-center justify-center shrink-0">
                                            <i class="fas {skill.isCustom ? 'fa-pen-nib' : 'fa-bolt'} text-lg"></i>
                                        </div>
                                        <div>
                                            <h4 class="font-bold text-sm">{skill.name}</h4>
                                            <div class="flex items-center gap-1.5 mt-0.5">
                                                {#if skill.isLocal}
                                                    <span class="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-gray-500">Local File</span>
                                                {/if}
                                                {#if skill.isCustom}
                                                    <span class="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/40 rounded text-purple-600 dark:text-purple-400">Custom</span>
                                                {/if}
                                                {#if skill.linkedFiles && skill.linkedFiles.length > 0}
                                                    <span class="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 rounded text-green-600 dark:text-green-400">
                                                        <i class="fas fa-link mr-0.5"></i>{skill.linkedFiles.length} linked
                                                    </span>
                                                {/if}
                                            </div>
                                        </div>
                                    </div>
                                    <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" on:click|stopPropagation>
                                        <button
                                            class="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                            on:click={() => toggleFavorite(skill.id)}
                                            title="Favorite">
                                            <i class="fa-star {$favoriteSkillIds.includes(skill.id) ? 'fas text-yellow-400' : 'far text-gray-400'}"></i>
                                        </button>
                                        <button
                                            class="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors"
                                            on:click={() => removeSkill(skill.id)}
                                            title="Remove">
                                            <i class="fas fa-trash-alt"></i>
                                        </button>
                                    </div>
                                </div>
                                <p class="text-xs text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-2 mt-1">{skill.description}</p>
                                <div class="text-[10px] text-gray-300 dark:text-gray-600 font-bold uppercase tracking-wider flex items-center gap-1 mt-auto">
                                    <i class="fas fa-arrow-up-right-from-square"></i> Click to preview &amp; edit
                                </div>
                            </div>
                        {/each}
                    </div>
                {/if}

            {:else if activeTab === 'create'}
                <div class="max-w-2xl mx-auto pt-4">
                    <div class="bg-white dark:bg-dark-card border dark:border-dark-border rounded-2xl p-6 shadow-sm flex flex-col gap-5">
                        <div class="flex items-center gap-3 mb-1">
                            <div class="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-500">
                                <i class="fas fa-pen-nib text-lg"></i>
                            </div>
                            <div>
                                <h2 class="font-black text-lg">Create My Skill</h2>
                                <p class="text-xs text-gray-400 font-medium">Write a custom instruction set to reuse in your prompts.</p>
                            </div>
                        </div>

                        <!-- Title -->
                        <div class="flex flex-col gap-2">
                            <label class="text-xs font-bold uppercase tracking-wider text-gray-400" for="skill-title">Skill Title</label>
                            <input
                                id="skill-title"
                                type="text"
                                bind:value={createTitle}
                                placeholder="e.g. Senior TypeScript Reviewer"
                                class="bg-gray-50 dark:bg-gray-800/50 border dark:border-dark-border rounded-xl py-3 px-4 text-sm outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                            >
                        </div>

                        <!-- Description / Instructions -->
                        <div class="flex flex-col gap-2">
                            <label class="text-xs font-bold uppercase tracking-wider text-gray-400" for="skill-description">Instructions</label>
                            <textarea
                                id="skill-description"
                                bind:value={createDescription}
                                placeholder="Describe what this skill should do. This will be included in your generated prompt as a set of instructions for the AI..."
                                rows="10"
                                class="bg-gray-50 dark:bg-gray-800/50 border dark:border-dark-border rounded-xl py-3 px-4 text-sm outline-none focus:ring-2 focus:ring-purple-500 transition-all resize-y font-mono leading-relaxed"
                            ></textarea>
                        </div>

                        {#if createSaveError}
                            <div class="text-red-500 text-xs font-bold flex items-center gap-2">
                                <i class="fas fa-circle-exclamation"></i> {createSaveError}
                            </div>
                        {/if}

                        <button
                            on:click={handleCreateSkill}
                            class="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-purple-500/20 transition-all flex items-center justify-center gap-2">
                            <i class="fas fa-floppy-disk"></i> Save Skill to My Library
                        </button>
                    </div>
                </div>
            {/if}

        </div>
    </div>
</div>

<!-- Skill Preview / Edit Modal -->
{#if selectedSkill}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div class="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6" transition:fade={{duration: 150}}>
        <div class="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" on:click={closeSkillModal} role="button" tabindex="-1"></div>

        <div class="relative bg-white dark:bg-dark-card w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" transition:slide={{duration: 300}}>

            <!-- Modal Header -->
            <div class="p-5 border-b dark:border-dark-border flex items-center justify-between bg-gradient-to-r {selectedSkill.isCustom ? 'from-purple-500 to-indigo-600' : 'from-blue-500 to-indigo-600'} text-white shrink-0">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl shadow-inner">
                        <i class="fas {selectedSkill.isCustom ? 'fa-pen-nib' : 'fa-bolt'}"></i>
                    </div>
                    <div>
                        <h2 class="text-xl font-black">{isEditMode ? 'Edit Skill' : selectedSkill.name}</h2>
                        <div class="flex items-center gap-2 mt-0.5 opacity-80 text-xs font-bold">
                            {#if selectedSkill.isCustom}
                                <span><i class="fas fa-pen-nib mr-1"></i>Custom Skill</span>
                            {:else if selectedSkill.isLocal}
                                <span><i class="fas fa-file mr-1"></i>Local File</span>
                            {:else}
                                <span><i class="fab fa-github mr-1"></i>GitHub Skill</span>
                            {/if}
                            {#if selectedSkill.linkedFiles && selectedSkill.linkedFiles.length > 0}
                                <span class="opacity-80">· {selectedSkill.linkedFiles.length} linked file(s) included</span>
                            {/if}
                        </div>
                    </div>
                </div>
                <div class="flex gap-2">
                    {#if !isEditMode}
                        <button on:click={enterEditMode}
                            class="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center"
                            title="Edit skill">
                            <i class="fas fa-pencil text-sm"></i>
                        </button>
                    {/if}
                    <button on:click={closeSkillModal}
                        class="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>

            <!-- Modal Body -->
            <div class="flex-grow overflow-y-auto p-6 custom-scrollbar flex flex-col gap-5">

                {#if isEditMode}
                    <!-- Edit Form -->
                    <div class="flex flex-col gap-4">
                        <div class="flex flex-col gap-1.5">
                            <label class="text-xs font-bold uppercase tracking-wider text-gray-400">Skill Name</label>
                            <input
                                type="text"
                                bind:value={editName}
                                class="bg-gray-50 dark:bg-gray-800/50 border dark:border-dark-border rounded-xl py-2.5 px-4 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold"
                            >
                        </div>
                        <div class="flex flex-col gap-1.5">
                            <label class="text-xs font-bold uppercase tracking-wider text-gray-400">Description</label>
                            <input
                                type="text"
                                bind:value={editDescription}
                                class="bg-gray-50 dark:bg-gray-800/50 border dark:border-dark-border rounded-xl py-2.5 px-4 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            >
                        </div>
                        <div class="flex flex-col gap-1.5">
                            <label class="text-xs font-bold uppercase tracking-wider text-gray-400">Instructions / Content</label>
                            <textarea
                                bind:value={editContent}
                                rows="14"
                                class="bg-gray-50 dark:bg-gray-800/50 border dark:border-dark-border rounded-xl py-3 px-4 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-y font-mono leading-relaxed"
                            ></textarea>
                        </div>
                    </div>
                {:else}
                    <!-- View Mode -->
                    <div class="flex flex-col gap-1.5">
                        <div class="text-xs font-bold uppercase tracking-wider text-gray-400">Description</div>
                        <p class="text-sm text-gray-700 dark:text-gray-300 leading-relaxed italic">"{selectedSkill.description}"</p>
                    </div>

                    {#if selectedSkill.sourceUrl && !selectedSkill.isCustom}
                        <div class="flex flex-col gap-1.5">
                            <div class="text-xs font-bold uppercase tracking-wider text-gray-400">Source</div>
                            <a href={selectedSkill.sourceUrl} target="_blank" rel="noreferrer"
                                class="text-xs text-blue-600 dark:text-blue-400 hover:underline font-mono break-all flex items-center gap-1.5">
                                <i class="fas fa-arrow-up-right-from-square text-[10px]"></i>{selectedSkill.sourceUrl}
                            </a>
                        </div>
                    {/if}

                    {#if selectedSkill.linkedFiles && selectedSkill.linkedFiles.length > 0}
                        <div class="flex flex-col gap-2">
                            <div class="text-xs font-bold uppercase tracking-wider text-gray-400">Linked Files ({selectedSkill.linkedFiles.length})</div>
                            <div class="flex flex-wrap gap-2">
                                {#each selectedSkill.linkedFiles as lf}
                                    <span class="text-[10px] font-bold font-mono px-2 py-1 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/30 rounded-lg text-green-700 dark:text-green-400">
                                        <i class="fas fa-file-code mr-1"></i>{lf.path}
                                    </span>
                                {/each}
                            </div>
                        </div>
                    {/if}

                    <div class="flex flex-col gap-1.5">
                        <div class="text-xs font-bold uppercase tracking-wider text-gray-400">Content Preview</div>
                        <pre class="bg-gray-50 dark:bg-gray-900/50 border dark:border-dark-border rounded-xl p-4 text-xs font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap break-words max-h-64 overflow-y-auto custom-scrollbar text-gray-700 dark:text-gray-300">{selectedSkill.content}</pre>
                    </div>
                {/if}
            </div>

            <!-- Modal Footer -->
            <div class="p-5 border-t dark:border-dark-border flex gap-3 shrink-0">
                {#if isEditMode}
                    <button on:click={saveSkillEdits}
                        class="flex-grow bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2">
                        <i class="fas fa-floppy-disk"></i> Save Changes
                    </button>
                    <button on:click={() => isEditMode = false}
                        class="px-5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl transition-all">
                        Cancel
                    </button>
                {:else}
                    <button on:click={enterEditMode}
                        class="flex-grow bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2">
                        <i class="fas fa-pencil"></i> Edit Skill
                    </button>
                    <button on:click={() => { removeSkill(selectedSkill.id); closeSkillModal(); }}
                        class="px-5 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-500 font-bold rounded-xl transition-all flex items-center gap-2">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                    <button on:click={closeSkillModal}
                        class="px-5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl transition-all">
                        Close
                    </button>
                {/if}
            </div>
        </div>
    </div>
{/if}
