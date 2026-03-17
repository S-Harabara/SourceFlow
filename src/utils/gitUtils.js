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
