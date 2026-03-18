import { writable } from 'svelte/store';

export const sourceBranch = writable("");
export const targetBranch = writable("");
export const branchesList = writable([]);
export const diffOutput = writable("");
export const isGeneratingDiff = writable(false);
export const codeReviewProjectName = writable("");
export const codeReviewProjectPath = writable("");
export const isSourceLocal = writable(false);
export const isTargetLocal = writable(false);
export const fetchingBranch = writable(""); // name of the branch being fetched
