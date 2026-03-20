import { writable } from 'svelte/store';

export const currentView = writable('promptBuilder'); // 'promptBuilder', 'codeReview', 'skillsLibrary', or 'importExport'
