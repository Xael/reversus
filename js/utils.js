import { getState } from './state.js';
import * as dom from './dom.js';

/**
 * Shuffles an array in place using the Fisher-Yates algorithm.
 * @param {Array} array The array to shuffle.
 * @returns {Array} The shuffled array.
 */
export const shuffle = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};

/**
 * Creates a deck of cards based on a configuration object.
 * @param {Array<object>} config - The configuration for the deck.
 * @param {string} cardType - The type of card ('value' or 'effect').
 * @returns {Array<object>} A new array of card objects.
 */
export const createDeck = (config, cardType) => {
    let idCounter = 0;
    return config.flatMap(item => Array.from({ length: item.count }, () => {
        const cardData = 'value' in item ? { name: item.value, value: item.value } : { name: item.name };
        return { id: Date.now() + Math.random() + idCounter++, type: cardType, ...cardData };
    }));
};

/**
 * Adds a message to the in-game log and updates the UI.
 * @param {string} message - The message to log.
 */
export const updateLog = (message) => {
    const { gameState } = getState();
    if (!gameState) return;

    console.log(message);
    gameState.log.unshift(message);
    if (gameState.log.length > 50) {
        gameState.log.pop();
    }
    
    dom.logEl.innerHTML = gameState.log.map(m => `<div>${m}</div>`).join('');
    dom.logEl.scrollTop = 0;
};
