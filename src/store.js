import { writable } from 'svelte/store';

export const currentView = writable('promptBuilder'); // 'promptBuilder' or 'codeReview'
