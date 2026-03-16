<script>
    import { activeModalFile } from '../../promptStore.js';

    function closeModal() {
        activeModalFile.set(null);
    }
</script>

{#if $activeModalFile}
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-black/60 backdrop-blur-sm" on:click={closeModal}>
    <div class="bg-white dark:bg-dark-card w-full max-w-6xl h-full rounded-2xl shadow-2xl flex flex-col overflow-hidden" on:click|stopPropagation>
        <div class="p-4 border-b dark:border-dark-border flex items-center justify-between shrink-0">
            <h3 class="font-bold text-sm truncate dark:text-gray-300">{$activeModalFile.name}</h3>
            <button on:click={closeModal} class="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="flex-grow overflow-auto p-6 custom-scrollbar bg-gray-50 dark:bg-transparent">
            <pre class="font-mono text-xs whitespace-pre-wrap break-words dark:text-gray-400">{$activeModalFile.content}</pre>
        </div>
    </div>
</div>
{/if}
