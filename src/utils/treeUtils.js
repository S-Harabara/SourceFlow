/**
 * Generates a clean, token-efficient tree representation of the project.
 * 
 * Includes smart summarization for directories with many similar files (e.g. images).
 * 
 * @param {any[]} treeData - Array of nodes { name, kind, children }
 * @param {string} [prefix=''] - Internal use for recursion
 * @param {string} [projectName=''] - Root project name
 * @returns {string}
 */
export function getProjectStructure(treeData, prefix = '', projectName = '') {
    if (!treeData || treeData.length === 0) return '';

    let res = '';

    /** @param {any} node */
    const isOnlyNonTextRecursive = (node) => {
        if (node.kind === 'file') {
            return !node.isText;
        }
        if (node.kind === 'directory') {
            if (!node.children || node.children.length === 0) return true;
            return node.children.every((/** @type {any} */ child) => isOnlyNonTextRecursive(child));
        }
        return false;
    };

    /**
     * @param {any[]} nodes
     * @param {string} currentPrefix
     */
    const internalBuild = (nodes, currentPrefix = '') => {
        const nonTextFiles = nodes.filter((/** @type {any} */ c) => c.kind === 'file' && !c.isText);
        const hasHiddenAssets = nonTextFiles.length > 5;

        const sorted = [...nodes]
            .filter((/** @type {any} */ node) => {
                if (node.name === 'node_modules' || node.name === '.git') return false;
                if (node.kind === 'directory' && isOnlyNonTextRecursive(node)) return false;
                if (node.kind === 'file' && !node.isText) return false;
                return true;
            })
            .sort((a, b) => {
                if (a.kind === b.kind) return a.name.localeCompare(b.name);
                return a.kind === 'directory' ? -1 : 1;
            });

        for (let i = 0; i < sorted.length; i++) {
            const node = sorted[i];
            const isLastInSorted = i === sorted.length - 1;
            const isActuallyLast = isLastInSorted && !hasHiddenAssets;

            const branch = isActuallyLast ? '└── ' : '├── ';
            const nextPrefix = currentPrefix + (isActuallyLast ? '    ' : '│   ');

            res += `${currentPrefix}${branch}${node.name}${node.kind === 'directory' ? '/' : ''}\n`;

            if (node.kind === 'directory' && node.children && node.children.length > 0) {
                internalBuild(node.children, nextPrefix);
            }
        }

        if (hasHiddenAssets) {
            res += `${currentPrefix}└── ... (${nonTextFiles.length} non-text assets hidden)\n`;
        }
    };

    internalBuild(treeData, '');

    const header = projectName ? `${projectName}/\n` : 'PROJECT STRUCTURE:\n';
    return header + res;
}
