import { writable, get } from 'svelte/store';

const { ipcRenderer } = window.require('electron');

// All skills saved in the user's library
// Format: [{ id, name, description, content, author, created_at, updated_at, usage_count, is_local, is_custom, sourceUrl, is_favorite, linkedFiles? }]
export const savedSkills = writable([]);

// IDs of favorited skills (now stored in DB too, but we keep the store for reactive UI)
export const favoriteSkillIds = writable([]);

// Skills currently selected to be included in the next prompt generation
export const selectedSkillsForPrompt = writable([]);

// Sorting state
export const skillSortConfig = writable({
    field: 'created_at',
    order: 'DESC'
});

// Load skills from DB
export const loadSkills = async () => {
    const config = get(skillSortConfig);
    const skills = await ipcRenderer.invoke('db:get-skills', { 
        sortField: config.field, 
        sortOrder: config.order 
    });
    
    // Migration logic: If DB is empty, check localStorage
    if (skills.length === 0) {
        const localData = localStorage.getItem('sourceflow_saved_skills');
        if (localData) {
            try {
                const parsed = JSON.parse(localData);
                if (parsed && parsed.length > 0) {
                    console.log('Migrating skills from localStorage to SQLite...');
                    const favorites = JSON.parse(localStorage.getItem('sourceflow_favorite_skills') || '[]');
                    
                    const skillsToMigrate = parsed.map((/** @type {any} */ s) => ({
                        ...s,
                        is_favorite: favorites.includes(s.id) ? 1 : 0,
                        author: s.author || 'Me',
                        usage_count: 0
                    }));
                    
                    await ipcRenderer.invoke('db:bulk-add-skills', skillsToMigrate);
                    // Re-fetch after migration
                    const migratedSkills = await ipcRenderer.invoke('db:get-skills', { 
                        sortField: config.field, 
                        sortOrder: config.order 
                    });
                    savedSkills.set(migratedSkills);
                    favoriteSkillIds.set(migratedSkills.filter(s => s.is_favorite).map(s => s.id));
                    
                    // Clear localStorage after successful migration? 
                    // Maybe keep it for safety for now, but mark it as migrated.
                    localStorage.setItem('sourceflow_migrated_to_sqlite', 'true');
                    return;
                }
            } catch (e) {
                console.error('Migration failed:', e);
            }
        }
    }

    savedSkills.set(skills);
    favoriteSkillIds.set(skills.filter(s => s.is_favorite).map(s => s.id));
};

// Initial load
loadSkills();

// Selection still uses localStorage for convenience as it's session-like / UX state
/**
 * @param {string} key
 * @param {any} defaultValue
 */
const getLocalStorage = (key, defaultValue) => {
    try {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : defaultValue;
    } catch (e) {
        return defaultValue;
    }
};

selectedSkillsForPrompt.set(getLocalStorage('sourceflow_selected_skills', []));
selectedSkillsForPrompt.subscribe(value => {
    localStorage.setItem('sourceflow_selected_skills', JSON.stringify(value));
});

/**
 * @param {any} skill
 */
export const addSkill = async (skill) => {
    await ipcRenderer.invoke('db:add-skill', skill);
    await loadSkills();
};

/**
 * @param {string} id
 */
export const removeSkill = async (id) => {
    await ipcRenderer.invoke('db:delete-skill', id);
    selectedSkillsForPrompt.update(selected => selected.filter(selId => selId !== id));
    await loadSkills();
};

/**
 * @param {string} id
 * @param {any} patch
 */
export const updateSkill = async (id, patch) => {
    await ipcRenderer.invoke('db:update-skill', { id, patch });
    await loadSkills();
};

/**
 * @param {string} id
 */
export const toggleFavorite = async (id) => {
    /** @type {any[]} */
    const skills = get(savedSkills);
    const skill = skills.find((/** @type {any} */ s) => s.id === id);
    if (skill) {
        const newFavoriteStatus = !skill.is_favorite;
        await ipcRenderer.invoke('db:update-skill', { 
            id, 
            patch: { is_favorite: newFavoriteStatus } 
        });
        await loadSkills();
    }
};

/**
 * @param {string} id
 */
export const togglePromptSelection = (id) => {
    selectedSkillsForPrompt.update((/** @type {any} */ selected) => {
        if (selected.includes(id)) {
            return selected.filter((/** @type {any} */ selId) => selId !== id);
        }
        return [...selected, id];
    });
};

/**
 * @param {string} id
 */
export const incrementSkillUsage = async (id) => {
    await ipcRenderer.invoke('db:increment-usage', id);
    await loadSkills();
};

/**
 * @param {string} field
 * @param {string} order
 */
export const setSortConfig = (field, order) => {
    skillSortConfig.set({ field, order });
    loadSkills();
};
