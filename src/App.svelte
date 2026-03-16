<script>
    import { onMount } from 'svelte';
    import Sidebar from './components/Sidebar.svelte';
    import PromptBuilder from './views/PromptBuilder.svelte';
    import CodeReview from './views/CodeReview.svelte';
    import SkillsLibrary from './views/SkillsLibrary.svelte';
    import FileModal from './components/PromptBuilder/FileModal.svelte';
    import { currentView } from './store.js';

    let isDark = false;
    
    onMount(() => {
        isDark = localStorage.getItem('theme') !== 'light';
        document.documentElement.classList.toggle('dark', isDark);
    });
</script>

<div class="bg-gray-50 dark:bg-dark-bg text-gray-900 dark:text-gray-100 h-screen flex flex-col transition-colors duration-300 overflow-hidden">
    <div class="flex flex-grow overflow-hidden">
        <Sidebar bind:isDark />
        
        {#if $currentView === 'promptBuilder'}
            <PromptBuilder />
        {:else if $currentView === 'skillsLibrary'}
            <SkillsLibrary />
        {:else if $currentView === 'codeReview'}
            <CodeReview />
        {/if}
    </div>
    <FileModal />
</div>
