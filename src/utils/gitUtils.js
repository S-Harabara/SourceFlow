const { ipcRenderer } = window.require('electron');

export async function selectProjectFolder() {
    return await ipcRenderer.invoke('select-folder');
}

/** @param {string} projectPath */
export async function getGitBranches(projectPath) {
    return await ipcRenderer.invoke('get-git-branches', projectPath);
}

/** 
 * @param {string} projectPath
 * @param {string} source
 * @param {string} target
 */
export async function getGitDiff(projectPath, source, target) {
    return await ipcRenderer.invoke('get-git-diff', { projectPath, source, target });
}

/** 
 * @param {string} projectPath
 * @param {string} branch
 */
export async function checkBranchLocal(projectPath, branch) {
    return await ipcRenderer.invoke('check-branch-local', { projectPath, branch });
}

/** 
 * @param {string} projectPath
 * @param {string} branch
 */
export async function fetchBranch(projectPath, branch) {
    return await ipcRenderer.invoke('fetch-branch', { projectPath, branch });
}
