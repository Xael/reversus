import * as dom from './dom.js';
import * as config from './config.js';
import { getState, updateState } from './state.js';
import { playSoundEffect } from './sound.js';
import { showAchievementNotification } from './ui.js';

const ACHIEVEMENTS_KEY = 'reversus-achievements';

/**
 * Checks for special features to unlock based on achievements.
 */
function checkAndShowSpecialFeatures() {
    const { achievements } = getState();
    if (achievements.has('all_achievements')) {
        dom.inversusModeButton.classList.remove('hidden');
    }
}


/**
 * Loads unlocked achievements from localStorage into the application state.
 * This is a critical path and includes robust error handling to prevent game crashes.
 */
export function loadAchievements() {
    try {
        const saved = localStorage.getItem(ACHIEVEMENTS_KEY);
        if (saved) {
            const unlockedData = JSON.parse(saved);
            // Ensure the parsed data is an array before creating a Set.
            // This prevents crashes if local storage data is corrupted.
            if (!Array.isArray(unlockedData)) {
                throw new Error('Saved achievements data is not an array.');
            }
            
            const unlockedIds = new Set(unlockedData);
            updateState('achievements', unlockedIds);

            if (unlockedIds.size > 0) {
                 dom.achievementsButton.classList.remove('hidden');
            }
            checkAndShowSpecialFeatures();
        } else {
            // If no data, initialize with an empty set. This is the normal case for a new player.
            updateState('achievements', new Set());
        }
    } catch (e) {
        console.error("Failed to load or parse achievements, resetting them to prevent a crash.", e);
        // If there's any error during loading or parsing, clear the corrupted
        // data from local storage and start fresh. This makes the app self-healing.
        localStorage.removeItem(ACHIEVEMENTS_KEY);
        updateState('achievements', new Set());
        // Ensure the button is hidden if achievements are reset
        dom.achievementsButton.classList.add('hidden');
    }
}

/**
 * Saves the current set of unlocked achievements to localStorage.
 */
function saveAchievements() {
    const { achievements } = getState();
    try {
        localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(Array.from(achievements)));
    } catch (e) {
        console.error("Failed to save achievements", e);
    }
}

/**
 * Checks if all achievements have been unlocked.
 * @returns {boolean} True if all achievements are unlocked.
 */
function checkAllAchievementsUnlocked() {
    const { achievements } = getState();
    // Subtract 1 because 'all_achievements' doesn't count towards its own completion.
    return achievements.size >= Object.keys(config.ACHIEVEMENTS).length - 1;
}

/**
 * Grants an achievement to the player.
 * @param {string} id - The ID of the achievement to grant.
 */
export function grantAchievement(id) {
    const { achievements, gameState } = getState();

    // Prevent 'Speed Run' achievement during the tutorial match.
    if (id === 'speed_run' && gameState?.currentStoryBattle === 'tutorial_necroverso') {
        return;
    }

    if (!achievements.has(id)) {
        // Show achievements button on first unlock
        if (achievements.size === 0) {
            dom.achievementsButton.classList.remove('hidden');
        }
        
        achievements.add(id);
        const achievementData = config.ACHIEVEMENTS[id];
        console.log(`Achievement Unlocked: ${achievementData.name}`);
        
        playSoundEffect('conquista');
        showAchievementNotification(achievementData);
        
        // Check for 100% completion
        if (id !== 'all_achievements' && checkAllAchievementsUnlocked()) {
            achievements.add('all_achievements');
            console.log("All achievements unlocked!");
            const allAchievementsData = config.ACHIEVEMENTS['all_achievements'];
            playSoundEffect('conquista');
            showAchievementNotification(allAchievementsData);
            checkAndShowSpecialFeatures();
        }

        saveAchievements();
    }
}

/**
 * Renders the content of the achievements modal.
 */
export function renderAchievementsModal() {
    const { achievements } = getState();
    const allAchievements = config.ACHIEVEMENTS;

    dom.achievementsGrid.innerHTML = Object.keys(allAchievements).map(id => {
        const achievement = allAchievements[id];
        const isUnlocked = achievements.has(id);
        
        const name = isUnlocked ? achievement.name : '???';
        let description = isUnlocked ? achievement.description : 'Desbloqueie esta conquista para ver os detalhes.';
        
        if (id === 'all_achievements' && isUnlocked) {
            description += ' - Senha da Sala 12: Final';
        }

        return `
            <div class="achievement-card ${isUnlocked ? 'unlocked' : ''}">
                <div class="achievement-icon">🏆</div>
                <h3 class="achievement-name">${name}</h3>
                <p class="achievement-description">${description}</p>
            </div>
        `;
    }).join('');
}