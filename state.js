import * as dom from './dom.js';
import * as config from './config.js';
import * as sound from './sound.js';
import * as game from './game.js';
import * as story from './story.js';

export let gameState;
export let roundStartStateSnapshot;
export let gameTimerInterval;
export let gameStartTime;
export let pvpRooms = [];
export let currentEnteringRoomId = null;
export let achievements = {};

// --- GAME STATE MANAGEMENT ---
export function setGameState(newState) {
    gameState = newState;
}

export function setRoundStartSnapshot(snapshot) {
    roundStartStateSnapshot = snapshot;
}

export function setGameTimerInterval(interval) {
    if (gameTimerInterval) clearInterval(gameTimerInterval);
    gameTimerInterval = interval;
}

export function setGameStartTime(time) {
    gameStartTime = time;
}

export function setPvpRooms(rooms) {
    pvpRooms = rooms;
}

export function setCurrentEnteringRoomId(id) {
    currentEnteringRoomId = id;
}

// --- ACHIEVEMENT MANAGEMENT ---
export const loadAchievements = () => {
    try {
        const saved = localStorage.getItem(config.ACHIEVEMENTS_SAVE_KEY);
        if (saved) {
            achievements = JSON.parse(saved);
        } else {
            // Initialize empty state
            Object.keys(config.ACHIEVEMENTS_CONFIG).forEach(id => {
                achievements[id] = false;
            });
        }
    } catch (e) {
        console.error("Could not load achievements", e);
        Object.keys(config.ACHIEVEMENTS_CONFIG).forEach(id => {
            achievements[id] = false;
        });
    }
};

export const saveAchievements = () => {
    try {
        localStorage.setItem(config.ACHIEVEMENTS_SAVE_KEY, JSON.stringify(achievements));
    } catch (e) {
        console.error("Could not save achievements", e);
    }
};

export const unlockAchievement = (id) => {
    if (id && achievements[id] === false) {
        achievements[id] = true;

        // Check for 'all_achievements'
        const allExceptLast = Object.keys(config.ACHIEVEMENTS_CONFIG).filter(key => key !== 'all_achievements');
        const allUnlocked = allExceptLast.every(key => achievements[key]);

        if (allUnlocked && !achievements['all_achievements']) {
            achievements['all_achievements'] = true;
             game.updateLog(`🏆 Conquista Desbloqueada: ${config.ACHIEVEMENTS_CONFIG['all_achievements'].title}`);
        }

        saveAchievements();
        game.updateLog(`🏆 Conquista Desbloqueada: ${config.ACHIEVEMENTS_CONFIG[id].title}`);
        
        if (dom.achievementsButton.classList.contains('hidden')) {
            dom.achievementsButton.classList.remove('hidden');
        }
    }
};


// --- SAVE/LOAD GAME STATE ---
export const saveGameState = () => {
    if (!gameState || !gameState.isStoryMode) {
        game.updateLog("Apenas o progresso do Modo História pode ser salvo.");
         dom.saveGameConfirmModal.classList.add('hidden');
        return;
    }

    let elapsedSeconds = gameStartTime ? Math.floor((Date.now() - gameStartTime) / 1000) : (gameState.elapsedSecondsAtRoundStart || 0);
    if (gameState.isNecroFinalBattle) {
       elapsedSeconds = gameState.countdown; // Save remaining time
    }

    const dataToSave = {
        gameState: gameState,
        storyState: story.storyState,
        elapsedSeconds: elapsedSeconds,
    };

    try {
        localStorage.setItem(config.SAVE_KEY, JSON.stringify(dataToSave));
        game.updateLog("Jogo salvo com sucesso!");
        dom.saveGameConfirmModal.classList.add('hidden');
        checkInitialLoadState(); // Re-check to ensure continue button is enabled
    } catch (error) {
        console.error("Erro ao salvar o jogo:", error);
        game.updateLog("Falha ao salvar o jogo. O armazenamento pode estar cheio.");
    }
};

export const loadGameState = () => {
    const savedData = localStorage.getItem(config.SAVE_KEY);
    if (!savedData) {
        game.updateLog("Nenhum jogo salvo encontrado.");
        return;
    }

    let data;
    try {
        data = JSON.parse(savedData);
    } catch (error) {
        console.error("Erro ao carregar o jogo salvo:", error);
        game.updateLog("O arquivo salvo está corrompido e não pôde ser carregado.");
        localStorage.removeItem(config.SAVE_KEY); // Remove corrupted data
        checkInitialLoadState();
        return;
    }

    setGameState(data.gameState);
    story.setStoryState(data.storyState);
    const savedElapsedSeconds = data.elapsedSeconds || 0;

    // --- UI setup ---
    dom.splashScreenEl.classList.add('hidden');
    dom.appContainerEl.classList.remove('blurred', 'hidden');

    // Music
    sound.initializeMusic();
    switch (gameState.currentStoryBattle) {
        case 'contravox': sound.playStoryMusic('contravox.ogg'); break;
        case 'versatrix': sound.playStoryMusic('versatrix.ogg'); break;
        case 'reversum': sound.playStoryMusic('reversum.ogg'); break;
        case 'necroverso_final_1v3':
            sound.playStoryMusic('necroverso.ogg');
            break;
        case 'necroverso_final_2v2':
            sound.playStoryMusic('necroverso_final.ogg');
            break;
        default: sound.stopStoryMusic();
    }

    // Timer
    if (gameState.isNecroFinalBattle) {
        gameState.countdown = savedElapsedSeconds;
        game.updateGameTimer();
        setGameTimerInterval(setInterval(game.updateGameTimer, 1000));
    } else {
        setGameStartTime(Date.now() - (savedElapsedSeconds * 1000));
        game.updateGameTimer(); // Update once immediately
        setGameTimerInterval(setInterval(game.updateGameTimer, 1000));
    }

    // Re-create player area containers
    const player1Container = document.getElementById('player-1-area-container');
    const opponentsContainer = document.getElementById('opponent-zones-container');
    const createPlayerAreaHTML = (id) => `<div class="player-area" id="player-area-${id}"></div>`;
    player1Container.innerHTML = createPlayerAreaHTML('player-1');
    opponentsContainer.innerHTML = gameState.playerIdsInGame.filter(id => id !== 'player-1').map(id => createPlayerAreaHTML(id)).join('');

    // Show menu button
    dom.debugButton.classList.remove('hidden');

    // Re-render everything
    game.renderAll();

    // Handle current turn
    const currentPlayer = gameState.players[gameState.currentPlayer];
    if (gameState.gamePhase !== 'playing') {
        gameState.gamePhase = 'playing';
        gameState.selectedCard = null;
        dom.targetModal.classList.add('hidden');
        dom.reversusTargetModal.classList.add('hidden');
        dom.pulaModal.classList.add('hidden');
    }

    if (currentPlayer.isHuman) {
        game.showTurnIndicator();
    } else {
        game.executeAiTurn(currentPlayer);
    }

    game.updateLog('Jogo carregado com sucesso!');
};

export const checkInitialLoadState = () => {
    const savedData = localStorage.getItem(config.SAVE_KEY);
    if (dom.continueButton) {
        dom.continueButton.disabled = !savedData;
    }
    loadAchievements();
    const hasAnyAchievement = Object.values(achievements).some(unlocked => unlocked);
    if (hasAnyAchievement) {
        dom.achievementsButton.classList.remove('hidden');
    }
};

export const deleteSavedGame = () => {
    localStorage.removeItem(config.SAVE_KEY);
    checkInitialLoadState();
    game.updateLog("Jogo salvo anterior foi removido.");
};