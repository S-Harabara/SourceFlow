/**
 * Converts a regular GitHub URL to a raw.githubusercontent.com URL for fetching.
 * Handles both tree/blob URLs and automatically appends SKILL.md if absent.
 */
export function getRawGithubUrl(url, overridePath = null) {
    try {
        let cleanUrl = url.trim();

        if (cleanUrl.includes('raw.githubusercontent.com')) {
            if (overridePath) {
                // Replace the file portion with the override path
                const base = cleanUrl.substring(0, cleanUrl.lastIndexOf('/') + 1);
                return base + overridePath;
            }
            return cleanUrl;
        }

        if (cleanUrl.includes('github.com')) {
            // Convert domain and remove blob/tree path components
            cleanUrl = cleanUrl.replace('github.com', 'raw.githubusercontent.com');
            cleanUrl = cleanUrl.replace('/tree/', '/').replace('/blob/', '/');

            if (overridePath) {
                // Ensure base ends with slash then append the relative path
                if (!cleanUrl.endsWith('/')) cleanUrl += '/';
                return cleanUrl + overridePath;
            }

            // If the user pasted a directory instead of the exact file, append SKILL.md
            if (!cleanUrl.endsWith('SKILL.md')) {
                if (!cleanUrl.endsWith('/')) cleanUrl += '/';
                cleanUrl += 'SKILL.md';
            }
            return cleanUrl;
        }
    } catch (e) {
        console.error('URL parsing error', e);
    }
    return url;
}

/**
 * Given a raw GitHub base URL (pointing to a SKILL.md) and a relative path
 * found inside that file, return the resolved raw URL for the linked file.
 */
function resolveRelativeRawUrl(baseRawUrl, relativePath) {
    // baseRawUrl is like: https://raw.githubusercontent.com/owner/repo/branch/path/to/skills/skill-name/SKILL.md
    // Strip the last filename segment to get the directory
    const base = baseRawUrl.substring(0, baseRawUrl.lastIndexOf('/') + 1);
    // Resolve simple relative paths (strip leading ./)
    const clean = relativePath.replace(/^\.\//, '');
    return base + clean;
}

/**
 * Parses the raw text of a SKILL.md file, extracting frontmatter (name, description)
 * and the main instruction block.
 */
export function parseSkillFile(content) {
    // Regex to match YAML frontmatter block between '---' lines
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---/;
    const match = content.match(frontmatterRegex);

    let name = 'unknown-skill';
    let description = 'No description provided.';
    let instructions = content;

    if (match) {
        const frontmatter = match[1];
        // Strip the frontmatter block to leave only the markdown instructions
        instructions = content.replace(frontmatterRegex, '').trim();

        // Simple regex to extract name and description from the YAML block
        const nameMatch = frontmatter.match(/name:\s*(.+)/);
        if (nameMatch) {
            name = nameMatch[1].trim().replace(/^['"](.*)['"]$/, '$1');
        }

        const descMatch = frontmatter.match(/description:\s*(.+)/);
        if (descMatch) {
            description = descMatch[1].trim().replace(/^['"](.*)['"]$/, '$1');
        }
    } else {
        // Fallback if no frontmatter is found, use the first heading as the name
        const headingMatch = content.match(/^#\s+(.+)/m);
        if (headingMatch) {
            name = headingMatch[1].trim();
        }
    }

    // Generate a unique ID based on the name
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.random().toString(36).substr(2, 5);

    return {
        id,
        name,
        description,
        content: instructions
    };
}

/**
 * Extracts all relative markdown link paths from a SKILL.md content string.
 * Looks for patterns like [label](./path/to/file) or [label](path/to/file)
 * that do NOT start with http:// or https://.
 */
function extractRelativeLinks(content) {
    const linkRegex = /\[([^\]]*)\]\(([^)]+)\)/g;
    const paths = [];
    let match;
    while ((match = linkRegex.exec(content)) !== null) {
        const href = match[2].trim();
        // Only relative links (no protocol, no anchor-only)
        if (!href.startsWith('http') && !href.startsWith('#') && !href.startsWith('mailto')) {
            paths.push(href);
        }
    }
    return [...new Set(paths)]; // dedupe
}

/**
 * Fetches a SKILL.md from a remote URL and returns the parsed object,
 * including any linked files referenced inside the skill content.
 */
export async function fetchSkillFromUrl(url) {
    const fetchUrl = getRawGithubUrl(url);
    const response = await fetch(fetchUrl);

    if (!response.ok) {
        throw new Error(`Failed to fetch skill from ${fetchUrl} (Status: ${response.status})`);
    }

    const content = await response.text();
    const skillData = parseSkillFile(content);

    // Attach the original source URL for reference
    skillData.sourceUrl = url;
    skillData.isLocal = false;

    // --- Fetch linked files referenced in SKILL.md ---
    const relativeLinks = extractRelativeLinks(content);
    const linkedFiles = [];

    await Promise.all(
        relativeLinks.map(async (relativePath) => {
            try {
                const linkedUrl = resolveRelativeRawUrl(fetchUrl, relativePath);
                const linkedResponse = await fetch(linkedUrl);
                if (linkedResponse.ok) {
                    const linkedContent = await linkedResponse.text();
                    linkedFiles.push({ path: relativePath, content: linkedContent });
                }
            } catch (e) {
                // Silently skip unresolvable links
                console.warn(`Could not fetch linked file: ${relativePath}`, e);
            }
        })
    );

    if (linkedFiles.length > 0) {
        skillData.linkedFiles = linkedFiles;
        // Append linked file content to main content so it's included in prompts
        const appendedContent = linkedFiles
            .map(f => `\n\n---\n<!-- Linked file: ${f.path} -->\n${f.content}`)
            .join('');
        skillData.content = skillData.content + appendedContent;
    }

    return skillData;
}
