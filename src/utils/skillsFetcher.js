/**
 * Converts a regular GitHub URL to a raw.githubusercontent.com URL for fetching.
 * Handles both tree/blob URLs and automatically appends SKILL.md if absent.
 */
export function getRawGithubUrl(url) {
    try {
        let cleanUrl = url.trim();
        
        if (cleanUrl.includes('raw.githubusercontent.com')) {
            return cleanUrl;
        }

        if (cleanUrl.includes('github.com')) {
            // Convert domain and remove blob/tree path components
            cleanUrl = cleanUrl.replace('github.com', 'raw.githubusercontent.com');
            cleanUrl = cleanUrl.replace('/tree/', '/').replace('/blob/', '/');
            
            // If the user pasted a directory instead of the exact file, append SKILL.md
            if (!cleanUrl.endsWith('SKILL.md')) {
                if (!cleanUrl.endsWith('/')) {
                    cleanUrl += '/';
                }
                cleanUrl += 'SKILL.md';
            }
            return cleanUrl;
        }
    } catch (e) {
        console.error("URL parsing error", e);
    }
    return url;
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
            // Remove potential quotes
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
 * Fetches a SKILL.md from a remote URL and returns the parsed object.
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
    
    return skillData;
}

/**
 * Scrapes skills.sh to find skills based on query and category.
 * Categories: '' (All Time), 'trending', 'hot'
 */
export async function fetchExploreSkills(query = '', category = '') {
    try {
        let url = 'https://skills.sh';
        if (category === 'trending') url += '/trending';
        else if (category === 'hot') url += '/hot';
        
        if (query) {
            const searchUrl = new URL(url);
            searchUrl.searchParams.set('q', query);
            url = searchUrl.toString();
        }

        const proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url);
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error('Failed to load skills.sh via proxy');
        
        const html = await response.text();
        
        // Find links in the format /owner/repo/skill-name
        // We look for the patterns in the HTML which usually look like:
        // <a ... href="/owner/repo/skill-name">...</a>
        const linkRegex = /href="(\/[^"\/]+\/[^"\/]+\/[^"\/]+)"/g;
        let match;
        const seenUrls = new Set();
        const skillsFound = [];
        
        // Attempt to find install counts. They often appear near the links in the RSC payload or as text nodes.
        // In the RSC payload it looks like: "installs":12345
        // We'll try to find any "installs": NUMBER patterns.
        const installMatches = [...html.matchAll(/"installs":\s*(\d+)/g)].map(m => parseInt(m[1]));
        let installIdx = 0;

        while ((match = linkRegex.exec(html)) !== null) {
            const rawPath = match[1];
            if (rawPath.startsWith('/_next') || rawPath.startsWith('/docs') || rawPath.includes('/api/')) continue;
            
            if (!seenUrls.has(rawPath)) {
                seenUrls.add(rawPath);
                const parts = rawPath.split('/').filter(Boolean);
                if (parts.length === 3) {
                    const [owner, repo, skillSlug] = parts;
                    const githubUrl = `https://github.com/${owner}/${repo}/tree/main/skills/${skillSlug}`;
                    
                    const formattedName = skillSlug.split('-').map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' ');
                    
                    // Try to guess associated install count if we have them in order
                    const installs = installMatches[installIdx] || 0;
                    installIdx++;

                    skillsFound.push({
                        id: rawPath,
                        name: formattedName,
                        desc: `by ${owner}`,
                        url: githubUrl,
                        installs: installs,
                        rawPath: rawPath // used for detailed fetch
                    });
                }
            }
            if (skillsFound.length >= 40) break; // Fetching more for "Load More" simulation
        }
        
        return skillsFound;
    } catch (error) {
        console.error("Error scraping skills:", error);
        return [];
    }
}

/**
 * Fetches detailed info about a skill from its skills.sh page for the modal.
 */
export async function fetchSkillDetails(rawPath) {
    try {
        const url = `https://skills.sh${rawPath}`;
        const proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url);
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error('Failed to load skill details');
        
        const html = await response.text();
        
        // Simple extraction for modal. 
        // We can look for the main description and stats.
        // Description is usually in a meta tag or specific div
        const metaDesc = html.match(/<meta name="description" content="([^"]+)"/);
        const description = metaDesc ? metaDesc[1] : "No detailed description available.";
        
        return {
            description,
            rawHtml: html // we can use this to parse more if needed
        };
    } catch (error) {
        console.error("Error fetching skill details:", error);
        return { description: "Failed to load details." };
    }
}
