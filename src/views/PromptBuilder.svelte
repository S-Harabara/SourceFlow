<script>
    import TopNav from '../components/PromptBuilder/TopNav.svelte';
    import Explorer from '../components/PromptBuilder/Explorer.svelte';
    import GenerationPanel from '../components/PromptBuilder/GenerationPanel.svelte';
</script>

<div class="flex flex-col flex-grow h-screen overflow-hidden">
    <TopNav />
    <main class="flex flex-grow overflow-hidden p-4 gap-2 flex-row relative h-[calc(100vh-3.5rem)]">
        <div class="w-[40%] flex-shrink-0 relative overflow-hidden">
            <Explorer />
        </div>
        
        <!-- Quick visual divider since resizer logic is complex in pure css without libraries -->
        <div class="w-1 bg-gray-200 dark:bg-gray-800 rounded-full mx-1"></div>

        <div class="flex-grow relative overflow-hidden">
            <GenerationPanel />
        </div>
    </main>
</div>
