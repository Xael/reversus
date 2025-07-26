// This object holds the single source of truth for the application's state.
const appState = {
    // Core game state object, holds all data about the current match.
    gameState: null,
    // A snapshot of the game state at the beginning of a round, for the "Restart Round" feature.
    roundStartStateSnapshot: null,
    // Holds the user's sound preferences.
    soundState: { muted: false, volume: 0.5 },
    // Flag to ensure music is only initialized once.
    isMusicInitialized: false,
    // Index of the current background music track.
    currentTrackIndex: 0,
    // Interval timer for the in-game clock.
    gameTimerInterval: null,
    // Timestamp for when the game started, used by the timer.
    gameStartTime: null,
    // A promise resolver for when the game is waiting for a player to target a field effect.
    fieldEffectTargetingInfo: null,
    // A promise resolver for the final battle path selection.
    pathSelectionResolver: null,
    // Array to hold information about available PvP rooms.
    pvpRooms: [],
    // ID of the PvP room the user is currently trying to enter.
    currentEnteringRoomId: null,
    // ID of the current node in the story dialogue tree.
    currentStoryNodeId: null,
    // Timeout for the typewriter effect in story mode.
    typewriterTimeout: null,
    // State specific to story mode progression.
    storyState: {
        lostToVersatrix: false,
    },
    // Holds the unlocked achievement IDs.
    achievements: new Set(),
};

/**
 * Returns the global application state object.
 * @returns {object} The appState object.
 */
export function getState() {
    return appState;
}

/**
 * Updates a specific key in the global application state.
 * @param {string} key - The key in the appState object to update.
 * @param {*} value - The new value for the key.
 */
export function updateState(key, value) {
    if (Object.prototype.hasOwnProperty.call(appState, key)) {
        appState[key] = value;
    } else {
        console.error(`Attempting to update a non-existent state key: ${key}`);
    }
}