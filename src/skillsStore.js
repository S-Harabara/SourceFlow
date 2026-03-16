import { writable } from 'svelte/store';

// Helper to get from local storage securely
const getLocalStorage = (key, defaultValue) => {
    try {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : defaultValue;
    } catch (e) {
        console.error(`Error reading ${key} from localStorage:`, e);
        return defaultValue;
    }
};

// All skills saved in the user's library
// Format: [{ id, name, description, content, sourceUrl, isLocal }]
export const savedSkills = writable(getLocalStorage('sourceflow_saved_skills', []));

// IDs of favorited skills
export const favoriteSkillIds = writable(getLocalStorage('sourceflow_favorite_skills', []));

// Skills currently selected to be included in the next prompt generation
export const selectedSkillsForPrompt = writable(getLocalStorage('sourceflow_selected_skills', []));

// Subscribe to changes and save to localStorage
savedSkills.subscribe(value => {
    try {
        localStorage.setItem('sourceflow_saved_skills', JSON.stringify(value));
    } catch(e) { console.error(e); }
});

favoriteSkillIds.subscribe(value => {
    try {
        localStorage.setItem('sourceflow_favorite_skills', JSON.stringify(value));
    } catch(e) { console.error(e); }
});

selectedSkillsForPrompt.subscribe(value => {
    try {
        localStorage.setItem('sourceflow_selected_skills', JSON.stringify(value));
    } catch(e) { console.error(e); }
});

// Helper actions
export const addSkill = (skill) => {
    savedSkills.update(skills => {
        // Prevent duplicates based on ID or Name
        if (!skills.find(s => s.id === skill.id)) {
            return [...skills, skill];
        }
        return skills;
    });
};

export const removeSkill = (id) => {
    savedSkills.update(skills => skills.filter(s => s.id !== id));
    favoriteSkillIds.update(favs => favs.filter(favId => favId !== id));
    selectedSkillsForPrompt.update(selected => selected.filter(selId => selId !== id));
};

export const toggleFavorite = (id) => {
    favoriteSkillIds.update(favs => {
        if (favs.includes(id)) {
            return favs.filter(favId => favId !== id);
        }
        return [...favs, id];
    });
};

export const togglePromptSelection = (id) => {
    selectedSkillsForPrompt.update(selected => {
        if (selected.includes(id)) {
            return selected.filter(selId => selId !== id);
        }
        return [...selected, id];
    });
};
