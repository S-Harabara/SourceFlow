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
 * Scrapes skills.sh to find trending skills.
 * Returns an array of objects: { name, description, url }
 */
export async function fetchExploreSkills() {
    try {
        // Use a CORS proxy since skills.sh doesn't send Access-Control-Allow-Origin headers
        const proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://skills.sh');
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error('Failed to load skills.sh via proxy');
        
        const html = await response.text();
        
        // Find links in the format /owner/repo/skill-name
        const linkRegex = /href="(\/[^"\/]+\/[^"\/]+\/[^"\/]+)"/g;
        let match;
        const seenUrls = new Set();
        const skillsFound = [];
        
        while ((match = linkRegex.exec(html)) !== null) {
            const rawPath = match[1];
            
            // Ignore internal Next.js routes or docs
            if (rawPath.startsWith('/_next') || rawPath.startsWith('/docs')) continue;
            
            if (!seenUrls.has(rawPath)) {
                seenUrls.add(rawPath);
                
                // Construct the github URL
                // /vercel-labs/agent-skills/frontend-design -> https://github.com/vercel-labs/agent-skills/tree/main/skills/frontend-design
                // We'll just build a clean github URL. Our existing getRawGithubUrl will handle it.
                // It is safer to assume the repo name is the second path part, and the rest is the skill name.
                const parts = rawPath.split('/').filter(Boolean);
                if (parts.length === 3) {
                    const [owner, repo, skillName] = parts;
                    // Standard skills.sh convention is the skill lives in the repo's root or /skills/ folder.
                    // Generating a direct raw github link is tricky without knowing the exact branch. 
                    // However, our fetch/parse logic handles standard github.com urls by attempting 'main' branch or similar if passed a tree URL. 
                    // For simplicity and compatibility with our getRawGithubUrl regex, we pass the standard github repo url + skillName.
                    // BUT getRawGithubUrl expects a simple /tree/main/ path if it's deep.
                    
                    const githubUrl = `https://github.com/${owner}/${repo}/tree/main/skills/${skillName}`;
                    
                    // Format a nice display name from the skillName slug
                    const formattedName = skillName.split('-').map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' ');
                    
                    skillsFound.push({
                        id: rawPath, // Temp ID for the explore view
                        name: formattedName,
                        desc: `From ${owner}/${repo}`, // We don't have the real description until we fetch the actual SKILL.md
                        url: githubUrl
                    });
                }
            }
            
            // Limit to top 15 so we don't overwhelm the UI
            if (skillsFound.length >= 15) break;
        }
        
        return skillsFound;
    } catch (error) {
        console.error("Error scraping explore skills:", error);
        return [];
    }
}
