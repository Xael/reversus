import * as config from './config.js';
import * as dom from './dom.js';
import { getState, updateState } from './state.js';
import { renderAll, updateTurnIndicator, showTurnIndicator, showRoundSummaryModal, renderPlayerArea, renderBoard, showGameOver, renderCard } from './ui.js';
import { playStoryMusic, stopStoryMusic, announceEffect } from './sound.js';
import { triggerFieldEffects, tryToSpeak } from './story-abilities.js';
import { updateLog, shuffle, createDeck } from './utils.js';
import { grantAchievement } from './achievements.js';
import { animateNecroX } from './animations.js';

/**
 * Updates the in-game timer display, handling normal and countdown modes.
 */
export const updateGameTimer = () => {
    const { gameStartTime, gameState, gameTimerInterval } = getState();
    if (!gameStartTime || !gameState) return;

    if (gameState.isFinalBoss) {
        const totalSeconds = 20 * 60; // 20 minutes countdown
        const elapsed = Math.floor((Date.now() - gameStartTime) / 1000);
        const remaining = totalSeconds - elapsed;
        
        if (remaining <= 0) {
            dom.gameTimerContainerEl.textContent = '00:00';
            if(gameTimerInterval) clearInterval(gameTimerInterval);
            updateState('gameTimerInterval', null);
            // Dispatch event only once
            if (gameState.gamePhase !== 'game_over') {
                document.dispatchEvent(new CustomEvent('storyWinLoss', { detail: { battle: 'necroverso_final', won: false, reason: 'time' } }));
            }
            return;
        }

        // Warning class is now set at the start of the game
        const minutes = Math.floor(remaining / 60).toString().padStart(2, '0');
        const seconds = (remaining % 60).toString().padStart(2, '0');
        dom.gameTimerContainerEl.textContent = `${minutes}:${seconds}`;
    } else {
        const elapsed = Math.floor((Date.now() - gameStartTime) / 1000);
        const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
        const seconds = (elapsed % 60).toString().padStart(2, '0');
        dom.gameTimerContainerEl.textContent = `${minutes}:${seconds}`;
    }
};

/**
 * Displays a fullscreen announcement for final bosses.
 * @param {string} text - The dialogue text.
 * @param {string} imageSrc - The source URL for the character image.
 */
const showFullscreenAnnounce = async (text, imageSrc) => {
    return new Promise(resolve => {
        dom.fullscreenAnnounceModal.classList.remove('hidden');
        dom.fullscreenAnnounceModal.classList.add('psychedelic-bg');
        dom.fullscreenAnnounceImage.src = imageSrc;
        dom.fullscreenAnnounceText.textContent = text;
        
        setTimeout(() => {
            dom.fullscreenAnnounceModal.classList.add('hidden');
            dom.fullscreenAnnounceModal.classList.remove('psychedelic-bg');
            resolve();
        }, 5000); // Show for 5 seconds
    });
};


/**
 * Generates the paths and spaces for the game board, including special effect spaces.
 * @param {object} options - Options to customize the board.
 * @returns {Array<object>} An array of path objects.
 */
const generateBoardPaths = (options = {}) => {
    const paths = [];
    const allPositiveEffects = Object.keys(config.POSITIVE_EFFECTS);
    const allNegativeEffects = Object.keys(config.NEGATIVE_EFFECTS);

    for (let i = 0; i < config.NUM_PATHS; i++) {
        const spaces = Array.from({ length: config.BOARD_SIZE }, (_, j) => ({
            id: j + 1, color: 'white', effectName: null, isUsed: false
        }));
        
        // Golden Rule: Spaces 1 and 9 are never colored.
        const colorableSpaceIds = Array.from({ length: 7 }, (_, j) => j + 2); // Spaces 2 through 8
        shuffle(colorableSpaceIds);
        let currentSpaceIndex = 0;

        // Black holes for final boss
        if (options.isFinalBoss) {
            const numBlackHoles = Math.random() > 0.5 ? 2 : 1;
            for(let k = 0; k < numBlackHoles && currentSpaceIndex < colorableSpaceIds.length; k++) {
                const spaceToBlacken = spaces.find(s => s.id === colorableSpaceIds[currentSpaceIndex]);
                if (spaceToBlacken) spaceToBlacken.color = 'black';
                currentSpaceIndex++;
            }
        }

        // Blue/Red spaces
        const numBlueRed = options.isFinalBoss ? 1 : config.COLORED_SPACES_PER_PATH;
        for (let k = 0; k < numBlueRed && currentSpaceIndex < colorableSpaceIds.length; k++) {
            const spaceToColor = spaces.find(s => s.id === colorableSpaceIds[currentSpaceIndex]);
            const isReversumBattle = options.storyBattle === 'reversum';
            const isPositive = isReversumBattle ? false : (Math.random() > 0.5);
             if (spaceToColor) {
                if (isPositive) {
                    spaceToColor.color = 'blue';
                    spaceToColor.effectName = shuffle([...allPositiveEffects])[0];
                } else {
                    spaceToColor.color = 'red';
                    spaceToColor.effectName = shuffle([...allNegativeEffects])[0];
                }
            }
            currentSpaceIndex++;
        }
        
        // Yellow spaces
        const isVersatrixBattle = options.storyBattle === 'versatrix' || options.isFinalBoss;
        if (isVersatrixBattle && currentSpaceIndex < colorableSpaceIds.length) {
            const numYellow = 1;
             for (let k = 0; k < numYellow && currentSpaceIndex < colorableSpaceIds.length; k++) {
                const spaceToYellow = spaces.find(s => s.id === colorableSpaceIds[currentSpaceIndex]);
                if (spaceToYellow) spaceToYellow.color = 'yellow';
                currentSpaceIndex++;
             }
        }
        
        const playerId = i < config.MASTER_PLAYER_IDS.length ? config.MASTER_PLAYER_IDS[i] : null;
        paths.push({ id: i, playerId, spaces });
    }
    return paths;
};

/**
 * Initializes a new game with the specified mode and options.
 */
export const initializeGame = async (mode, options) => {
    Object.assign(config.PLAYER_CONFIG, structuredClone(config.originalPlayerConfig));

    // Handle overrides from either PvP lobby or Story Mode
    const overrides = options.story ? options.story.overrides : options.overrides;
    if (overrides) {
        for (const id in overrides) {
            if (config.PLAYER_CONFIG[id]) {
                Object.assign(config.PLAYER_CONFIG[id], overrides[id]);
            }
        }
    }
    
    let playerIdsInGame, numPlayers, modeText, isStoryMode = false, isFinalBoss = false, storyBattle = null, storyBattleType = null, isInversusMode = false;

    if (mode === 'inversus') {
        isInversusMode = true;
        numPlayers = 2;
        playerIdsInGame = config.MASTER_PLAYER_IDS.slice(0, numPlayers);
        modeText = 'Modo Inversus';
        dom.splashScreenEl.classList.add('hidden');
        playStoryMusic('inversus.ogg');
    } else if (options.story) {
        isStoryMode = true;
        storyBattle = options.story.battle;
        playerIdsInGame = options.story.playerIds;
        numPlayers = playerIdsInGame.length;
        storyBattleType = options.story.type || null;
        isFinalBoss = storyBattle === 'necroverso_final';
        modeText = `Modo História: ${storyBattle}`;
        
        switch(storyBattle) {
            case 'contravox': playStoryMusic('contravox.ogg'); break;
            case 'versatrix': playStoryMusic('versatrix.ogg'); break;
            case 'reversum': playStoryMusic('reversum.ogg'); break;
            case 'necroverso_king': playStoryMusic('necroverso.ogg'); break;
            case 'necroverso_final': playStoryMusic('necroversofinal.ogg'); break;
            default: stopStoryMusic();
        }
    } else {
        numPlayers = options.numPlayers;
        playerIdsInGame = config.MASTER_PLAYER_IDS.slice(0, numPlayers);
        modeText = mode === 'solo' ? `Solo (${numPlayers}p)` : 'Duplas';
        stopStoryMusic();
    }

    // Clear any leftover complex state
    updateState('pathSelectionResolver', null);
    
    // Announce final boss battles before showing the game screen
    if (storyBattle === 'necroverso_king') {
        await showFullscreenAnnounce("Será capaz de vencer este desafio contra nós três?", 'necroversorevelado.png');
    } else if (storyBattle === 'necroverso_final') {
        await showFullscreenAnnounce("Nem mesmo com ajuda da Versatrix poderá me derrotar, eu dominarei o Inversum e consumirei TUDO", 'necroversorevelado.png');
    }


    dom.gameSetupModal.classList.add('hidden');
    dom.pvpLobbyModal.classList.add('hidden');
    dom.storyModeModalEl.classList.add('hidden');
    dom.appContainerEl.classList.remove('blurred', 'hidden');
    dom.reversusTotalIndicatorEl.classList.add('hidden');
    dom.debugButton.classList.remove('hidden');
    dom.boardEl.classList.remove('inverted'); // Reset board direction
    dom.boardEl.classList.toggle('final-battle-board', isFinalBoss);
    dom.boardEl.classList.toggle('board-rotating', isInversusMode);
    
    const state = getState();
    if (!isStoryMode && !isInversusMode) {
        stopStoryMusic();
        updateState('currentTrackIndex', 0);
        dom.musicPlayer.src = config.MUSIC_TRACKS[state.currentTrackIndex];
    }
    
    dom.gameTimerContainerEl.classList.remove('countdown-warning');
    if (isFinalBoss) {
        dom.gameTimerContainerEl.classList.add('countdown-warning');
    }
    if (state.gameTimerInterval) clearInterval(state.gameTimerInterval);
    updateState('gameStartTime', Date.now());
    updateGameTimer();
    updateState('gameTimerInterval', setInterval(updateGameTimer, 1000));
    
    const valueDeck = shuffle(createDeck(config.VALUE_DECK_CONFIG, 'value'));
    const effectDeck = shuffle(createDeck(config.EFFECT_DECK_CONFIG, 'effect'));

    const players = Object.fromEntries(
        playerIdsInGame.map((id, index) => {
            const playerObject = {
                ...config.PLAYER_CONFIG[id],
                id,
                aiType: config.PLAYER_CONFIG[id].aiType || 'default',
                pathId: isInversusMode ? -1 : index,
                position: 1,
                hand: [],
                resto: null,
                nextResto: null,
                effects: { score: null, movement: null },
                playedCards: { value: [], effect: [] },
                playedValueCardThisTurn: false,
                targetPathForPula: null,
                liveScore: 0,
                status: 'neutral', // neutral, winning, losing
                isEliminated: false,
            };
            if (isInversusMode) {
                playerObject.hearts = 10;
                playerObject.maxHearts = 10;
            }
            return [id, playerObject];
        })
    );
    
    const boardPaths = generateBoardPaths({ storyBattle, isFinalBoss });
    if (!isFinalBoss && !isInversusMode) {
        playerIdsInGame.forEach((id, index) => { 
            if(boardPaths[index]) boardPaths[index].playerId = id; 
        });
    }

    const gameState = {
        players,
        playerIdsInGame,
        decks: { value: valueDeck, effect: effectDeck },
        boardPaths,
        gamePhase: 'setup',
        gameMode: mode,
        isStoryMode,
        isInversusMode,
        isFinalBoss,
        necroversoHearts: 3,
        currentStoryBattle: storyBattle,
        storyBattleType: storyBattleType,
        currentPlayer: 'player-1',
        reversusTotalActive: false,
        inversusTotalAbilityActive: false,
        turn: 1,
        selectedCard: null,
        reversusTarget: null,
        pulaTarget: null,
        fieldEffectTargetingInfo: null,
        log: [],
        activeFieldEffects: [],
        revealedHands: [],
        consecutivePasses: 0,
        playedAnyCardThisTurn: false,
        initialDrawCards: null,
        contravoxAbilityUses: 3,
        versatrixSwapActive: false,
        versatrixPowerDisabled: false,
        reversumAbilityUsedThisRound: false,
        necroXUsedThisRound: false,
        dialogueState: { spokenLines: new Set() } // Initialize dialogue state
    };
    
    if (isFinalBoss) {
        // Paths are now fixed at the start
    }

    updateState('gameState', gameState);
    
    const player1Container = document.getElementById('player-1-area-container');
    const opponentsContainer = document.getElementById('opponent-zones-container');
    const createPlayerAreaHTML = (id) => `<div class="player-area" id="player-area-${id}"></div>`;
    player1Container.innerHTML = createPlayerAreaHTML('player-1');
    opponentsContainer.innerHTML = playerIdsInGame.filter(id => id !== 'player-1').map(id => createPlayerAreaHTML(id)).join('');

    updateLog(`Bem-vindo ao Reversus! Modo: ${modeText}.`);
    if(mode === 'duo' && !isStoryMode) updateLog("Equipe Azul/Verde (Você & Jogador 3) vs. Equipe Vermelho/Amarelo (Jogador 2 & Jogador 4)");
    
    renderAll();
    
    await initiateGameStartSequence();
};

export const initiateGameStartSequence = async () => {
    const { gameState } = getState();
    if (gameState.isInversusMode) {
        await startNewRound(true);
        return;
    }
    
    // Skip initial draw for the final battle
    if (gameState.isFinalBoss) {
        // Set paths once at the start
        const chosenPaths = new Set();
        const playerIdsToAssign = gameState.playerIdsInGame;
        playerIdsToAssign.forEach(id => {
            let availablePaths = gameState.boardPaths.filter(p => !chosenPaths.has(p.id));
            if (availablePaths.length > 0) {
                let chosenPath = shuffle(availablePaths)[0];
                gameState.players[id].pathId = chosenPath.id;
                chosenPaths.add(chosenPath.id);
            }
        });
        
        await startNewRound(true);
        return;
    }

    dom.drawStartTitle.textContent = "Sorteio Inicial";
    dom.drawStartResultMessage.textContent = "Sorteando cartas para ver quem começa...";
    
    dom.drawStartCardsContainerEl.innerHTML = gameState.playerIdsInGame.map(id => {
        const player = gameState.players[id];
        return `
            <div class="draw-start-player-slot">
                <span class="player-name ${id}">${player.name}</span>
                <div class="card modal-card" style="background-image: url('verso_valor.png');" id="draw-card-${id}"></div>
            </div>
        `;
    }).join('');

    dom.drawStartModal.classList.remove('hidden');
    await new Promise(res => setTimeout(res, 1500));
    await drawToStart();
};

const drawToStart = async () => {
    const { gameState } = getState();
    if (gameState.decks.value.length < gameState.playerIdsInGame.length) {
        updateLog("Reabastecendo o baralho de valor.");
        gameState.decks.value.push(...shuffle(createDeck(config.VALUE_DECK_CONFIG, 'value')));
    }

    const drawnCards = {};
    const cardPromises = [];

    gameState.playerIdsInGame.forEach((id, index) => {
        const card = gameState.decks.value.pop();
        drawnCards[id] = card;
        const cardEl = document.getElementById(`draw-card-${id}`);
        
        const promise = new Promise(res => {
            setTimeout(() => {
                if(cardEl) cardEl.outerHTML = renderCard(card, 'modal');
                res();
            }, 500 * index);
        });
        cardPromises.push(promise);
    });

    await Promise.all(cardPromises);

    await new Promise(res => setTimeout(res, 1500));

    const sortedPlayers = gameState.playerIdsInGame.sort((a, b) => drawnCards[b].value - drawnCards[a].value);
    const logParts = gameState.playerIdsInGame.map(id => `${gameState.players[id].name} sacou ${drawnCards[id].name}`);
    updateLog(`Sorteio: ${logParts.join(', ')}.`);
    
    if (sortedPlayers.length < 2 || drawnCards[sortedPlayers[0]].value > drawnCards[sortedPlayers[1]].value) {
        const winner = gameState.players[sortedPlayers[0]];
        gameState.currentPlayer = winner.id;
        gameState.initialDrawCards = drawnCards;
        dom.drawStartResultMessage.textContent = `${winner.name} tirou a carta mais alta e começa!`;
        
        await new Promise(res => setTimeout(res, 2000));
        dom.drawStartModal.classList.add('hidden');
        
        await finalizeGameStart();
    } else {
        dom.drawStartResultMessage.textContent = "Empate! Sorteando novamente...";
        updateLog("Empate! Sacando novas cartas...");
        Object.values(drawnCards).forEach(card => gameState.decks.value.push(card));
        gameState.decks.value = shuffle(gameState.decks.value);
        await initiateGameStartSequence();
    }
};

const finalizeGameStart = async () => {
    const { gameState } = getState();
    
    if (gameState.initialDrawCards) {
        gameState.playerIdsInGame.forEach(id => {
            gameState.players[id].resto = gameState.initialDrawCards[id];
            updateLog(`Resto inicial de ${gameState.players[id].name} é ${gameState.initialDrawCards[id].name}.`);
        });
    }
    
    await startNewRound(true);
};

export const applyEffect = (card, targetId, casterName, effectTypeToReverse) => {
    const { gameState } = getState();
    const target = gameState.players[targetId];
    if (!target) return;
    
    let effectName = card.name;

    if(gameState.activeFieldEffects.some(fe => fe.name === 'Imunidade' && fe.appliesTo === targetId) && (effectName === 'Menos' || effectName === 'Desce')){
        updateLog(`${target.name} está imune a ${effectName} nesta rodada!`);
        return;
    }
    
    const getInverseEffect = (effect) => {
        if (effect === 'Mais') return 'Menos';
        if (effect === 'Menos') return 'Mais';
        if (effect === 'Sobe') return 'Desce';
        if (effect === 'Desce') return 'Sobe';
        if (effect === 'NECRO X') return 'NECRO X Invertido';
        if (effect === 'NECRO X Invertido') return 'NECRO X';
        return null;
    };
    
    if(gameState.reversusTotalActive && effectName !== 'Reversus Total') {
         const inverted = getInverseEffect(effectName);
         if (inverted) {
            updateLog(`Reversus Total inverteu ${card.name} para ${inverted}!`);
            effectName = inverted;
         }
    }

    if (card.isIndividualLock) {
         announceEffect("REVERSUS INDIVIDUAL!", 'reversus');
    } else {
        announceEffect(effectName);
    }
    
    switch(effectName) {
        case 'Mais': case 'Menos': case 'NECRO X': case 'NECRO X Invertido':
            target.effects.score = effectName;
            break;
        case 'Sobe': case 'Desce': case 'Pula':
            if (target.effects.movement === 'Pula' && effectName === 'Pula') {
                updateLog(`${target.name} já estava sob efeito de Pula. O novo efeito irá sobrescrever o anterior.`);
            }
            target.effects.movement = effectName;
            break;
        case 'Reversus':
        case 'Reversus Total': // This case now handles the individual lock as well
             if (card.isIndividualLock) {
                if (effectTypeToReverse === 'score') {
                    target.effects.score = getInverseEffect(target.effects.score);
                    updateLog(`${casterName} usou Reversus Individual em ${target.name} para travar o efeito de pontuação em ${target.effects.score || 'Nenhum'}.`);
                } else if (effectTypeToReverse === 'movement') {
                    if (target.effects.movement === 'Pula') {
                         target.effects.movement = null;
                         updateLog(`${casterName} anulou e travou o efeito 'Pula' de ${target.name}!`);
                    } else {
                        target.effects.movement = getInverseEffect(target.effects.movement);
                        updateLog(`${casterName} usou Reversus Individual em ${target.name} para travar o efeito de movimento em ${target.effects.movement || 'Nenhum'}.`);
                    }
                }
                return;
            } else if (effectName === 'Reversus Total') { // Global effect
                gameState.reversusTotalActive = true;
                dom.appContainerEl.classList.add('reversus-total-active');
                dom.reversusTotalIndicatorEl.classList.remove('hidden');
                Object.values(gameState.players).forEach(p => {
                    const scoreCard = p.playedCards.effect.find(c => ['Mais', 'Menos', 'NECRO X', 'NECRO X Invertido'].includes(c.name));
                    const moveCard = p.playedCards.effect.find(c => ['Sobe', 'Desce', 'Pula'].includes(c.name));

                    if (scoreCard && !scoreCard.isLocked) {
                        p.effects.score = getInverseEffect(p.effects.score);
                    }
                    if (moveCard && !moveCard.isLocked) {
                         if (p.effects.movement === 'Pula') {
                             // Global Reversus Total does not affect Pula
                         } else {
                            p.effects.movement = getInverseEffect(p.effects.movement);
                         }
                    }
                });
                updateLog(`${casterName} usou REVERSUS TOTAL! Todos os efeitos não travados foram invertidos!`);
                return;
            } else { // Regular Reversus
                if (effectTypeToReverse === 'score') {
                    target.effects.score = getInverseEffect(target.effects.score);
                    updateLog(`${casterName} usou ${card.name} em ${target.name} para reverter efeito de pontuação para ${target.effects.score || 'Nenhum'}.`);
                } else if (effectTypeToReverse === 'movement') {
                    if (target.effects.movement === 'Pula') {
                         target.effects.movement = null;
                         updateLog(`${casterName} anulou o efeito 'Pula' de ${target.name} com Reversus!`);
                    } else {
                        target.effects.movement = getInverseEffect(target.effects.movement);
                        updateLog(`${casterName} usou ${card.name} em ${target.name} para reverter efeito de movimento para ${target.effects.movement || 'Nenhum'}.`);
                    }
                }
                return;
            }
    }
    updateLog(`${casterName} usou ${effectName} em ${target.name}.`);
};

const animateCardPlay = (card, fromPlayerId, toPlayerId) => {
    const { gameState } = getState();
    const fromEl = document.getElementById(`hand-${fromPlayerId}`);
    const toEl = document.getElementById(`play-zone-${toPlayerId}`);
    if (!fromEl || !toEl) {
        console.warn("Animation failed: element not found.");
        renderAll();
        return;
    };

    const fromRect = fromEl.getBoundingClientRect();
    const toRect = toEl.getBoundingClientRect();

    const clone = document.createElement('div');
    clone.innerHTML = renderCard(card, 'play-zone', toPlayerId);
    const cardClone = clone.firstElementChild;
    if(!cardClone) return;

    cardClone.classList.add('card-animation-clone');
    cardClone.style.left = `${fromRect.left + fromRect.width / 2 - 40}px`;
    cardClone.style.top = `${fromRect.top + fromRect.height / 2 - 55}px`;
    
    document.body.appendChild(cardClone);

    requestAnimationFrame(() => {
        cardClone.style.left = `${toRect.left + (toRect.width / 2) - 40}px`;
        cardClone.style.top = `${toRect.top + (toRect.height / 2) - 55}px`;
        cardClone.style.transform = 'scale(1)';
    });

    setTimeout(() => {
        cardClone.remove();
        renderAll();
    }, 600);
};


export const playCard = (caster, card, effectTargetId, effectTypeToReverse, options = {}) => {
    const { gameState } = getState();
    caster.hand = caster.hand.filter(c => c.id !== card.id);
    gameState.playedAnyCardThisTurn = true;

    if (caster.isHuman) {
        dom.endTurnButton.disabled = false;
    }

    if (card.type === 'value') {
        animateCardPlay(card, caster.id, caster.id);
        if (caster.playedCards.value.length < 2) {
            caster.playedCards.value.push(card);
        }
        caster.nextResto = card;
        caster.playedValueCardThisTurn = true;
        updateLog(`${caster.name} jogou a carta de valor ${card.name}.`);
    } else if (card.type === 'effect' && effectTargetId) {
        card.casterId = caster.id;
        
        let finalTargetIds = [effectTargetId];
        const is1v3Battle = gameState.storyBattleType === '1v3_king';
        const necroIds = ['player-2', 'player-3', 'player-4'];
        
        if (is1v3Battle && card.name !== 'Pula') {
            if (caster.id === 'player-1' && necroIds.includes(effectTargetId)) {
                finalTargetIds = [...necroIds];
                updateLog(`Efeito de ${card.name} se espalha para todos os Necroversos!`);
            } else if (necroIds.includes(caster.id) && necroIds.includes(effectTargetId)) {
                finalTargetIds = [...necroIds];
                 updateLog(`Efeito de ${card.name} de Necroverso se espalha para seus aliados!`);
            }
        }
        
        const primaryTargetPlayer = gameState.players[effectTargetId];
        if (!primaryTargetPlayer) {
            console.error("Invalid primary target player in playCard");
            return;
        }
        
        animateCardPlay(card, caster.id, primaryTargetPlayer.id);

        if (options.isIndividualLock) {
            card.isLocked = true;
        }

        const getEffectCategory = (cardName, reverseType) => {
            if (['Mais', 'Menos', 'NECRO X', 'NECRO X Invertido'].includes(cardName)) return 'score';
            if (['Sobe', 'Desce', 'Pula'].includes(cardName)) return 'movement';
            if (cardName === 'Reversus' || (cardName === 'Reversus Total' && options.isIndividualLock)) return reverseType;
            if (cardName === 'Reversus Total') return 'total';
            return null;
        };

        const newCardCategory = getEffectCategory(card.name, effectTypeToReverse);
        
        if (newCardCategory && newCardCategory !== 'total') {
            const existingCard = primaryTargetPlayer.playedCards.effect.find(c => getEffectCategory(c.name, c.reversedEffectType) === newCardCategory);
            
            if (existingCard && existingCard.isLocked) {
                updateLog(`Efeito de ${primaryTargetPlayer.name} está travado por um Reversus Individual e não pode ser alterado!`);
                if (caster.isHuman) {
                    gameState.selectedCard = null;
                    gameState.reversusTarget = null;
                    updateState('reversusTotalIndividualFlow', false);
                }
                renderAll();
                return;
            }
            
            primaryTargetPlayer.playedCards.effect = primaryTargetPlayer.playedCards.effect.filter(c => getEffectCategory(c.name, c.reversedEffectType) !== newCardCategory);
            if (existingCard) {
                gameState.decks.effect.push(existingCard);
            }
        }
        
        if(card.name === 'Reversus' || (card.name === 'Reversus Total' && options.isIndividualLock)) {
            card.reversedEffectType = effectTypeToReverse;
        }
        primaryTargetPlayer.playedCards.effect.push(card);
        
        for (const targetId of finalTargetIds) {
             applyEffect(card, targetId, caster.name, effectTypeToReverse);
        }
    }
    
    if (caster.isHuman) {
        gameState.selectedCard = null;
        gameState.reversusTarget = null;
        gameState.pulaTarget = null;
        updateState('reversusTotalIndividualFlow', false);
    }
};


const getAiTurnDecision = (aiPlayer) => {
    const { gameState } = getState();
    const actions = [];
    const playerIds = gameState.playerIdsInGame;
    
    let myTeamIds, opponentIds;

    if (aiPlayer.aiType === 'inversus') {
        const player1 = gameState.players['player-1'];

        if (!gameState.inversusTotalAbilityActive && Math.random() < 0.25) {
            actions.push({ action: 'use_inversus_ability' });
            return { actions };
        }
        
        // Mirror effect cards that are on player's board but not on AI's board yet
        player1.playedCards.effect.forEach(p1Card => {
            const isAlreadyOnBoard = aiPlayer.playedCards.effect.some(aiP1Card => aiP1Card.name === p1Card.name);
            if (!isAlreadyOnBoard) {
                const aiCard = aiPlayer.hand.find(c => c.name === p1Card.name && c.type === 'effect' && !actions.some(a => a.card?.id === c.id));
                if(aiCard) {
                    // Inversus targets player 1, except for Reversus Total which is self-cast.
                    let targetId = aiCard.name === 'Reversus Total' ? aiPlayer.id : 'player-1';
                    actions.push({ action: 'play', cardId: aiCard.id, card: aiCard, target: targetId, effectTypeTarget: p1Card.reversedEffectType });
                }
            }
        });

        // Standard value card rule check
        if (!aiPlayer.playedValueCardThisTurn) {
            const valueCardsInHand = aiPlayer.hand.filter(c => c.type === 'value');
            // Check if a value card play has already been queued by mirroring logic
            const hasAlreadyQueuedValueCard = actions.some(a => a.card?.type === 'value');

            if (valueCardsInHand.length >= 2 && !hasAlreadyQueuedValueCard) {
                 // Try to mirror player's last value card play
                const lastPlayerValueCard = player1.playedCards.value[player1.playedCards.value.length - 1];
                let cardToPlay = null;
                if(lastPlayerValueCard) {
                     cardToPlay = aiPlayer.hand.find(c => c.value === lastPlayerValueCard.value && c.type === 'value');
                }

                if (!cardToPlay) {
                    cardToPlay = valueCardsInHand[0]; // Fallback to lowest card
                }
                
                actions.push({ action: 'play', cardId: cardToPlay.id, card: cardToPlay });
            }
        }
        
        return { actions };
    }


    if (gameState.storyBattleType === '1v3_king' || (gameState.isFinalBoss && aiPlayer.aiType === 'necroverso_final')) {
        myTeamIds = playerIds.filter(id => gameState.players[id]?.aiType === aiPlayer.aiType);
        opponentIds = playerIds.filter(id => !myTeamIds.includes(id));
    } else if(gameState.gameMode === 'duo') {
        const isTeamA = config.TEAM_A.includes(aiPlayer.id);
        myTeamIds = (isTeamA ? config.TEAM_A : config.TEAM_B).filter(id => playerIds.includes(id));
        opponentIds = (isTeamA ? config.TEAM_B : config.TEAM_A).filter(id => playerIds.includes(id));
    } else {
        myTeamIds = [aiPlayer.id];
        opponentIds = playerIds.filter(id => id !== aiPlayer.id);
    }
    
    const isInverted = gameState.reversusTotalActive;
    let pulaPathChoice = undefined;
    let necroXActionPushed = false;
    let reversumAbilityJustUsed = false;
    
    // Disable king abilities in 1v3 battle
    if (aiPlayer.aiType === 'reversum' && !gameState.reversusTotalActive && !gameState.reversumAbilityUsedThisRound && gameState.storyBattleType !== '1v3_king') {
        let scoreChangeIfUsed = 0;
        playerIds.forEach(pId => {
            const p = gameState.players[pId];
            const originalScoreEffect = p.effects.score;
            const originalMoveEffect = p.effects.movement;
            const invertedScoreEffect = originalScoreEffect === 'Mais' ? 'Menos' : (originalScoreEffect === 'Menos' ? 'Mais' : null);
            const invertedMoveEffect = originalMoveEffect === 'Sobe' ? 'Desce' : (originalMoveEffect === 'Desce' ? 'Sobe' : null);

            let change = 0;
            if (invertedScoreEffect) change += (invertedScoreEffect === 'Mais' ? 1 : -1) - (originalScoreEffect === 'Mais' ? 1 : -1);
            if (invertedMoveEffect) change += (invertedMoveEffect === 'Sobe' ? 1 : -1) - (originalMoveEffect === 'Sobe' ? 1 : -1);
            
            scoreChangeIfUsed += myTeamIds.includes(pId) ? change : -change;
        });

        if (scoreChangeIfUsed > 0) {
            actions.push({ action: 'use_reversum_ability' });
            reversumAbilityJustUsed = true;
        }
    }

    if (aiPlayer.aiType === 'necroverso_final' && (aiPlayer.resto?.value >= 8) && !gameState.necroXUsedThisRound && Math.random() < 0.33) {
        if (!aiPlayer.effects.score || aiPlayer.effects.score === (isInverted ? 'Mais' : 'Menos')) {
            actions.push({ action: 'use_necrox_ability' });
            necroXActionPushed = true;
        }
    }

    if (!aiPlayer.playedValueCardThisTurn) {
        const valueCardsInHand = aiPlayer.hand.filter(c => c.type === 'value');
        if (valueCardsInHand.length >= 2) {
            valueCardsInHand.sort((a, b) => a.value - b.value);
            const myHighestPosition = Math.max(...myTeamIds.map(id => gameState.players[id].position));
            const opponentHighestPosition = opponentIds.length > 0 ? Math.max(...opponentIds.map(id => gameState.players[id].position)) : 0;
            
            let cardToPlay = (opponentHighestPosition - myHighestPosition >= 3) ? valueCardsInHand[0] : valueCardsInHand[valueCardsInHand.length - 1];
            if (aiPlayer.aiType === 'necroverso_tutorial' || gameState.storyBattleType === '1v3_king') { 
                 cardToPlay = valueCardsInHand[valueCardsInHand.length - 1]; // Make them play aggressively
            }
            actions.push({ action: 'play', cardId: cardToPlay.id, card: cardToPlay });
        }
    }

    const availableEffectCards = aiPlayer.hand.filter(c => c.type === 'effect');
    if (availableEffectCards.length > 0 && !reversumAbilityJustUsed) {
        const getOpponentsByPosition = () => opponentIds.map(id => gameState.players[id]).sort((a, b) => b.position - a.position);
        
        const buffScoreEffect = isInverted ? 'Menos' : 'Mais';
        const debuffScoreEffect = isInverted ? 'Mais' : 'Menos';
        const buffMoveEffect = 'Sobe';
        const debuffMoveEffect = 'Desce';

        const harmTargets = getOpponentsByPosition();
        let leaderTarget = harmTargets.length > 0 ? harmTargets[0] : null;

        for (const card of availableEffectCards) {
            let targetId = undefined, effectTypeTarget = undefined, playOptions = {};
            switch (card.name) {
                case 'Mais': case 'Menos':
                    if (necroXActionPushed) break;
                    if (card.name === buffScoreEffect) {
                        const buffTarget = myTeamIds.map(id => gameState.players[id]).filter(p => p.effects.score !== buffScoreEffect).sort((a, b) => a.liveScore - b.liveScore)[0];
                        if (buffTarget) targetId = buffTarget.id;
                    } else if (card.name === debuffScoreEffect) {
                        if (leaderTarget && leaderTarget.effects.score !== debuffScoreEffect) targetId = leaderTarget.id;
                    }
                    break;
                case 'Sobe': case 'Desce':
                     if (card.name === buffMoveEffect) {
                        const buffTarget = myTeamIds.map(id => gameState.players[id]).filter(p => p.effects.movement !== buffMoveEffect).sort((a, b) => a.liveScore - b.liveScore)[0];
                        if (buffTarget) targetId = buffTarget.id;
                    } else if (card.name === debuffMoveEffect) {
                        if (leaderTarget && leaderTarget.effects.movement !== debuffMoveEffect) targetId = leaderTarget.id;
                    }
                    break;
                case 'Pula':
                    if (leaderTarget) {
                        let availablePaths;
                        if (aiPlayer.aiType === 'necroverso_final') {
                            // Can choose any path, including occupied ones.
                            availablePaths = [...gameState.boardPaths];
                        } else {
                            // Other AIs can only choose empty paths.
                            const occupiedPathIds = gameState.playerIdsInGame.map(id => gameState.players[id].pathId);
                            availablePaths = gameState.boardPaths.filter(p => !occupiedPathIds.includes(p.id));
                        }
        
                        if (availablePaths.length > 0) {
                            targetId = leaderTarget.id;
                            // Prefers paths with red spaces to harm the opponent.
                            pulaPathChoice = availablePaths.sort((a, b) => b.spaces.filter(s => s.color === 'red' && !s.isUsed).length - a.spaces.filter(s => s.color === 'red' && !s.isUsed).length)[0].id;
                        }
                    }
                    break;
                case 'Reversus':
                    const memberToHelp = myTeamIds.map(id => gameState.players[id]).find(p => p.effects.score === debuffScoreEffect || p.effects.movement === debuffMoveEffect);
                    if (memberToHelp) {
                        targetId = memberToHelp.id;
                        effectTypeTarget = memberToHelp.effects.score === debuffScoreEffect ? 'score' : 'movement';
                    } else {
                        const opponentToHarm = opponentIds.map(id => gameState.players[id]).find(p => p.effects.score === buffScoreEffect || p.effects.movement === buffMoveEffect);
                        if (opponentToHarm) {
                             targetId = opponentToHarm.id;
                             effectTypeTarget = opponentToHarm.effects.score === buffScoreEffect ? 'score' : 'movement';
                        }
                    }
                    break;
                case 'Reversus Total':
                    // AI logic for new Reversus Total
                    const opponentToHarmWithLock = opponentIds.map(id => gameState.players[id]).find(p => p.status === 'winning' && p.effects.score === buffScoreEffect && !p.playedCards.effect.find(c => c.name === 'Mais')?.isLocked);
                    if (opponentToHarmWithLock) {
                         targetId = opponentToHarmWithLock.id;
                         effectTypeTarget = 'score';
                         playOptions.isIndividualLock = true;
                    } else {
                        let scoreChange = 0;
                        Object.values(gameState.players).forEach(p => {
                            let change = 0;
                            if (p.effects.score === debuffScoreEffect || p.effects.movement === debuffMoveEffect) change = 1;
                            if (p.effects.score === buffScoreEffect || p.effects.movement === buffMoveEffect) change = -1;
                            scoreChange += myTeamIds.includes(p.id) ? change : -change;
                        });
                        if (scoreChange > 0) targetId = aiPlayer.id; // Self-target for global
                    }
                    break;
            }
            if (targetId && !actions.some(a => a.card && a.card.type === 'effect')) {
                actions.push({ action: 'play', cardId: card.id, card, target: targetId, effectTypeTarget, options: playOptions });
            }
        }
    }
    return { actions, pulaPathChoice };
};

export async function executeAiTurn(aiPlayer) {
    const { gameState } = getState();
    updateLog(`${aiPlayer.name} está pensando...`);
    gameState.gamePhase = 'paused';
    renderAll();
    await tryToSpeak(aiPlayer); // Attempt to speak at the start of the turn
    await new Promise(res => setTimeout(res, 1000));
    
    const decision = getAiTurnDecision(aiPlayer);
    
    const mustPlayValueCard = aiPlayer.hand.filter(c => c.type === 'value').length >= 2 && !aiPlayer.playedValueCardThisTurn;
    if (mustPlayValueCard && !decision.actions.some(a => a.card?.type === 'value')) {
        console.error(`${aiPlayer.name} failed to make a mandatory value card play. Forcing one.`);
        const valueCardToPlay = aiPlayer.hand.filter(c=>c.type === 'value').sort((a,b) => a.value - b.value)[0];
        if (valueCardToPlay) {
            decision.actions.unshift({ action: 'play', cardId: valueCardToPlay.id, card: valueCardToPlay });
        } else {
             await advanceToNextPlayer();
             return;
        }
    }

    if (decision.actions.length === 0) {
        await advanceToNextPlayer();
        return;
    }

    for (const action of decision.actions) {
        await new Promise(res => setTimeout(res, 1200));

        if (action.action === 'use_reversum_ability') {
            updateLog("Rei Reversum usa sua habilidade: REVERSUS TOTAL!");
            gameState.reversumAbilityUsedThisRound = true;
            applyEffect({ name: 'Reversus Total' }, aiPlayer.id, aiPlayer.name);
        } else if (action.action === 'use_necrox_ability') {
            const storyAbilities = await import('./story-abilities.js');
            await storyAbilities.triggerNecroX(aiPlayer);
        } else if (action.action === 'use_inversus_ability') {
            updateLog("Inversus usa sua habilidade: INVERSÃO TOTAL!");
            announceEffect("INVERSÃO TOTAL", "inversus-total", 2500);
            gameState.inversusTotalAbilityActive = true;
            dom.scalableContainer.classList.add('inversus-total-active');
        } else if (action.action === 'play') {
            const cardInHand = aiPlayer.hand.find(c => c.id === action.cardId);
            if (cardInHand) {
                if (cardInHand.name === 'Pula' && decision.pulaPathChoice !== undefined) {
                    const targetPlayer = gameState.players[action.target];
                    targetPlayer.targetPathForPula = decision.pulaPathChoice;
                    updateLog(`${aiPlayer.name} escolheu que ${targetPlayer.name} pule para o caminho ${decision.pulaPathChoice + 1}.`);
                }
                playCard(aiPlayer, cardInHand, action.target, action.effectTypeTarget, action.options);
            } else {
                updateLog(`(AI tentou jogar uma carta que não está na mão: ${action.card?.name})`);
            }
        }
    }
    
    await new Promise(res => setTimeout(res, 1000));
    await advanceToNextPlayer();
}

const calculateScore = (player) => {
    const { gameState } = getState();
    let score = player.playedCards.value.reduce((sum, card) => sum + (card.value || 0), 0);
    const cardEffect = player.effects.score;
    const fieldEffects = gameState.activeFieldEffects.filter(fe => fe.appliesTo === player.id);

    let restoValue = player.resto?.value || 0;
    if (fieldEffects.some(fe => fe.name === 'Resto Maior')) {
        restoValue = 10;
        if(gameState.gamePhase === 'resolution') updateLog(`Efeito 'Resto Maior' ativado para ${player.name}.`);
    }
    if (fieldEffects.some(fe => fe.name === 'Resto Menor')) {
        restoValue = 2;
         if(gameState.gamePhase === 'resolution') updateLog(`Efeito 'Resto Menor' ativado para ${player.name}. Resto é 2.`);
    }
    
    if (cardEffect === 'Mais') score += restoValue;
    if (cardEffect === 'Menos') score -= restoValue;

    if (cardEffect === 'Menos' && fieldEffects.some(fe => fe.name === 'Super Exposto')) {
        score -= restoValue;
        if(gameState.gamePhase === 'resolution') updateLog(`Efeito 'Super Exposto' dobra o 'Menos' para ${player.name}.`);
    }

    const isNecroXInvertedByTotal = gameState.reversusTotalActive;
    if (cardEffect === 'NECRO X') {
        if (isNecroXInvertedByTotal) {
            if (restoValue !== 0) score = Math.floor(score / restoValue);
        } else {
            score *= restoValue;
        }
    } else if (cardEffect === 'NECRO X Invertido') {
        if (isNecroXInvertedByTotal) {
            score *= restoValue;
        } else {
            if (restoValue !== 0) score = Math.floor(score / restoValue);
        }
    }
    
    return score;
};

export const updateLiveScoresAndWinningStatus = () => {
    const { gameState } = getState();
    if (!gameState) return;
    const playerIds = gameState.playerIdsInGame;
    const scores = {};
    playerIds.forEach(id => {
        const player = gameState.players[id];
        player.liveScore = calculateScore(player);
        scores[id] = player.liveScore;
        player.status = 'neutral';
    });

    const teamScoresEl = document.getElementById('team-scores-container');
    if (gameState.storyBattleType === '1v3_king') {
        const p1Score = gameState.players['player-1'].liveScore;
        const necroScore = ['player-2', 'player-3', 'player-4'].reduce((sum, id) => sum + (gameState.players[id]?.liveScore || 0), 0);
        if (p1Score > necroScore) { 
            gameState.players['player-1'].status = 'winning'; 
            ['player-2', 'player-3', 'player-4'].forEach(id => { if(gameState.players[id]) gameState.players[id].status = 'losing' });
        } else if (necroScore > p1Score) {
            gameState.players['player-1'].status = 'losing';
            ['player-2', 'player-3', 'player-4'].forEach(id => { if(gameState.players[id]) gameState.players[id].status = 'winning' });
        }
        teamScoresEl.innerHTML = `
            <div class="team-score team-a"><span>Você: <strong>${p1Score}</strong></span></div>
            <div class="team-score team-b"><span>Rei Necroverso: <strong>${necroScore}</strong></span></div>`;
        teamScoresEl.classList.remove('hidden');
        return;
    } else if (gameState.isFinalBoss) {
        const teamPlayerScore = (gameState.players['player-1']?.liveScore || 0) + (gameState.players['player-4']?.liveScore || 0);
        const teamNecroScore = (scores['player-2'] || 0) + (scores['player-3'] || 0);
        
        if (teamPlayerScore > teamNecroScore) {
            if(gameState.players['player-1']) gameState.players['player-1'].status = 'winning';
            if(gameState.players['player-4']) gameState.players['player-4'].status = 'winning';
            if(gameState.players['player-2']) gameState.players['player-2'].status = 'losing';
            if(gameState.players['player-3']) gameState.players['player-3'].status = 'losing';
        } else if (teamNecroScore > teamPlayerScore) {
            if(gameState.players['player-1']) gameState.players['player-1'].status = 'losing';
            if(gameState.players['player-4']) gameState.players['player-4'].status = 'losing';
            if(gameState.players['player-2']) gameState.players['player-2'].status = 'winning';
            if(gameState.players['player-3']) gameState.players['player-3'].status = 'winning';
        }
        const hearts = '🖤'.repeat(gameState.necroversoHearts || 0);
        teamScoresEl.innerHTML = `
            <div class="team-score team-a"><span>Você & Versatrix: <strong>${teamPlayerScore}</strong></span></div>
            <div class="team-score team-b">
                <span>Necroverso: <strong>${teamNecroScore}</strong></span>
                <span class="header-hearts" title="Corações do Necroverso">${hearts}</span>
            </div>`;
        teamScoresEl.classList.remove('hidden');
        return;
    }

    if (gameState.gameMode === 'solo' || gameState.isInversusMode) {
        const currentScores = playerIds.map(id => gameState.players[id].liveScore);
        const maxScore = Math.max(...currentScores);
        const minScore = Math.min(...currentScores);
        if (maxScore !== minScore) {
            playerIds.forEach(id => { 
                const p = gameState.players[id];
                if (p.liveScore === maxScore) p.status = 'winning';
                if (p.liveScore === minScore) p.status = 'losing';
            });
        }
        teamScoresEl.classList.add('hidden');
    } else { // duo
        const teamAScore = config.TEAM_A.reduce((sum, id) => sum + (gameState.players[id]?.liveScore || 0), 0);
        const teamBScore = config.TEAM_B.reduce((sum, id) => sum + (gameState.players[id]?.liveScore || 0), 0);
        
        if (teamAScore > teamBScore) {
            config.TEAM_A.forEach(id => { if(gameState.players[id]) gameState.players[id].status = 'winning'; });
            config.TEAM_B.forEach(id => { if(gameState.players[id]) gameState.players[id].status = 'losing'; });
        } else if (teamBScore > teamAScore) {
            config.TEAM_A.forEach(id => { if(gameState.players[id]) gameState.players[id].status = 'losing'; });
            config.TEAM_B.forEach(id => { if(gameState.players[id]) gameState.players[id].status = 'winning'; });
        }

        teamScoresEl.innerHTML = `
            <div class="team-score team-a">
                <span>Equipe Azul/Verde: <strong>${teamAScore}</strong></span>
            </div>
            <div class="team-score team-b">
                <span>Equipe Vermelho/Amarelo: <strong>${teamBScore}</strong></span>
            </div>
        `;
        teamScoresEl.classList.remove('hidden');
    }
};

const resolveRound = async () => {
    const { gameState } = getState();
    if (gameState.gamePhase === 'game_over') return;

    gameState.gamePhase = 'resolution';
    updateTurnIndicator();

    if (gameState.inversusTotalAbilityActive) {
        dom.scalableContainer.classList.remove('inversus-total-active');
        gameState.inversusTotalAbilityActive = false;
    }
    const playerIds = gameState.playerIdsInGame;

    gameState.versatrixSwapActive = false;
    const versatrix = Object.values(gameState.players).find(p => p.aiType === 'versatrix');
    const player1 = gameState.players['player-1'];

    if (versatrix && player1 && gameState.turn >= 2) {
        const versatrixScore = calculateScore(versatrix);
        const playerScore = calculateScore(player1);
        if (versatrixScore < playerScore && [6, 7, 8, 9].includes(player1.position)) {
            gameState.versatrixSwapActive = true;
            updateLog("Versatrix usa sua habilidade: CAMPO VERSÁTIL!");
            announceEffect('CAMPO VERSÁTIL!', 'reversus', 2500);
            await new Promise(res => setTimeout(res, 2500));
        }
    }

    const scores = {};
    playerIds.forEach(id => scores[id] = calculateScore(gameState.players[id]));
    updateLog(`Fim da Rodada: Pontuações - ${playerIds.map(id => `${gameState.players[id].name}: ${scores[id]}`).join(', ')}.`);
    
    if (gameState.versatrixSwapActive && versatrix) {
        [scores['player-1'], scores[versatrix.id]] = [scores[versatrix.id], scores['player-1']];
        updateLog(`CAMPO VERSÁTIL trocou as pontuações entre Você e ${versatrix.name}!`);
    }

    const movements = Object.fromEntries(playerIds.map(id => [id, 0]));
    const winners = [];
    const losers = [];

    // Correctly determine winners based on game mode
    if (gameState.storyBattleType === '1v3_king') {
        const p1Score = scores['player-1'];
        const necroScore = ['player-2', 'player-3', 'player-4'].reduce((sum, id) => sum + (scores[id] || 0), 0);
        updateLog(`Pontuação da Rodada - Você: ${p1Score}, Necroverso (Total): ${necroScore}.`);
        if (p1Score > necroScore) { winners.push('player-1'); losers.push('player-2', 'player-3', 'player-4'); } 
        else if (necroScore > p1Score) { winners.push('player-2', 'player-3', 'player-4'); losers.push('player-1'); }
        else { // TIE condition
            updateLog("Empate! Todos avançam!");
            winners.push('player-1', 'player-2', 'player-3', 'player-4');
        }
    } else if (gameState.isFinalBoss) {
        const teamPlayerScore = (scores['player-1'] || 0) + (scores['player-4'] || 0);
        const teamNecroScore = (scores['player-2'] || 0) + (scores['player-3'] || 0);
        updateLog(`Pontuação da Rodada - Você/Versatrix: ${teamPlayerScore}, Necroverso: ${teamNecroScore}.`);
        if (teamPlayerScore > teamNecroScore) { winners.push('player-1', 'player-4'); losers.push('player-2', 'player-3'); } 
        else if (teamNecroScore > teamPlayerScore) { winners.push('player-2', 'player-3'); losers.push('player-1', 'player-4'); }
    } else if (gameState.gameMode === 'duo') {
        const teamAScore = config.TEAM_A.reduce((sum, id) => sum + (scores[id] || 0), 0);
        const teamBScore = config.TEAM_B.reduce((sum, id) => sum + (scores[id] || 0), 0);
        updateLog(`Pontuação Equipes - Azul/Verde: ${teamAScore}, Vermelho/Amarelo: ${teamBScore}.`);
        if (teamAScore > teamBScore) { winners.push(...config.TEAM_A.filter(id => playerIds.includes(id))); losers.push(...config.TEAM_B.filter(id => playerIds.includes(id))); } 
        else if (teamBScore > teamAScore) { winners.push(...config.TEAM_B.filter(id => playerIds.includes(id))); losers.push(...config.TEAM_A.filter(id => playerIds.includes(id))); }
    } else { // solo or inversus mode
        const activePlayerIds = playerIds.filter(id => !gameState.players[id].isEliminated);
        if (activePlayerIds.length > 0) {
            const maxScore = Math.max(...activePlayerIds.map(id => scores[id]));
            // Correctly identify all players who achieved the maximum score as winners
            const potentialWinners = activePlayerIds.filter(id => scores[id] === maxScore);
            winners.push(...potentialWinners);
        }
    }
    
    // Determine losers for all modes based on who didn't win
    playerIds.forEach(id => { if (!winners.includes(id)) losers.push(id); });

    let nextPlayerId = null;
    if (winners.length > 0) {
        if (winners.length === 1) {
            nextPlayerId = winners[0];
        } else {
            const tiedPlayerRestos = winners.map(id => ({ id, restoValue: gameState.players[id].resto?.value || 0 }));
            const maxResto = Math.max(...tiedPlayerRestos.map(p => p.restoValue));
            const winnersByResto = tiedPlayerRestos.filter(p => p.restoValue === maxResto);
            nextPlayerId = shuffle(winnersByResto.map(p => p.id))[0];
        }
    }

    if (nextPlayerId) {
        gameState.currentPlayer = nextPlayerId;
        updateLog(`Próximo a jogar: ${gameState.players[nextPlayerId].name} (vencedor da rodada).`);
    }

    if (gameState.isInversusMode) {
        losers.forEach(id => {
            const p = gameState.players[id];
            if (p.hearts > 0) {
                p.hearts--;
                updateLog(`${p.name} perdeu um coração! Restam: ${p.hearts}`);
            }
        });
        await showRoundSummaryModal(winners, scores);
        await endGameCheck();
        return;
    }

    // This is the win bonus movement.
    winners.forEach(id => {
        const fieldEffects = gameState.activeFieldEffects.filter(fe => fe.appliesTo === id);
        if (fieldEffects.some(fe => fe.name === 'Parada')) updateLog(`${gameState.players[id].name} venceu, mas o efeito 'Parada' impede o avanço.`);
        else if (fieldEffects.some(fe => fe.name === 'Desafio')) {
             const playedPositiveEffect = gameState.players[id].playedCards.effect.some(c => ['Mais', 'Sobe'].includes(c.name));
             if (!playedPositiveEffect) {
                 movements[id] += 3;
                 updateLog(`${gameState.players[id].name} completou o 'Desafio' e avança 3 casas!`);
             } else {
                 movements[id] += 1;
                 updateLog(`${gameState.players[id].name} venceu mas falhou no 'Desafio', avança 1 casa.`);
             }
        } else movements[id] += 1;
    });
    if (winners.length > 0) updateLog(`Vencedor(es) da rodada: ${winners.map(id => gameState.players[id].name).join(', ')}.`);
    else updateLog("Empate na rodada! Ninguém ganha bônus.");

    losers.forEach(id => {
        const fieldEffects = gameState.activeFieldEffects.filter(fe => fe.appliesTo === id);
        if (fieldEffects.some(fe => fe.name === 'Impulso')) {
            movements[id] += 1;
            updateLog(`${gameState.players[id].name} perdeu, mas o 'Impulso' o avança 1 casa.`);
        } else if (fieldEffects.some(fe => fe.name === 'Castigo')) {
            movements[id] -= 3;
            updateLog(`${gameState.players[id].name} perdeu e sofre o 'Castigo', voltando 3 casas.`);
        }
    });

    // This is the card effect movement. It is added to the win bonus movement.
    playerIds.forEach(id => {
        const player = gameState.players[id];
        let moveChange = 0;
        if (player.effects.movement === 'Sobe') moveChange = 1;
        if (player.effects.movement === 'Desce') moveChange = -1;
        
        if (player.effects.movement === 'Desce' && gameState.activeFieldEffects.some(fe => fe.name === 'Super Exposto' && fe.appliesTo === id)) {
            moveChange *= 2;
            updateLog(`Efeito 'Super Exposto' dobra o 'Desce' para ${player.name}.`);
        }
        
        if (moveChange !== 0) {
            updateLog(`${player.name} aplica o efeito '${player.effects.movement}'.`);
            movements[id] += moveChange;
        }
    });
    
    playerIds.forEach(id => {
        const player = gameState.players[id];
        if (player.effects.movement === 'Pula' && player.targetPathForPula !== null) {
            const oldPath = gameState.boardPaths.find(p => p.playerId === id);
            if(oldPath) oldPath.playerId = null;
            player.pathId = player.targetPathForPula;
            gameState.boardPaths[player.pathId].playerId = id;
            updateLog(`${player.name} pulou para o caminho ${player.pathId + 1}.`);
        }
    });
    
    if (gameState.versatrixSwapActive && versatrix) {
        [movements['player-1'], movements[versatrix.id]] = [movements[versatrix.id], movements['player-1']];
        updateLog(`CAMPO VERSÁTIL trocou os movimentos entre Você e ${versatrix.name}!`);
    }
    
    playerIds.forEach(id => {
        const player = gameState.players[id];
        if (player.isEliminated) return;

        const oldPos = player.position;
        const move = movements[id] || 0;
        let newPos = oldPos + move;

        if (gameState.isFinalBoss) {
            if (newPos > config.WINNING_POSITION) {
                newPos = 1; // Loop back to start
            } else if (newPos < 1) {
                newPos = 1; // Cannot go below 1
            }
        } else {
             newPos = Math.min(config.WINNING_POSITION, Math.max(1, newPos));
        }
        
        player.position = newPos;
        if (player.position !== oldPos) {
             updateLog(`${player.name} moveu de ${oldPos} para ${player.position}.`);
        }
    });
    
    renderBoard();
    await showRoundSummaryModal(winners, scores);
    
    await endGameCheck();
};

export const advanceToNextPlayer = async () => {
    const { gameState } = getState();
    const player = gameState.players[gameState.currentPlayer];
    player.playedValueCardThisTurn = false;
    const playerIds = gameState.playerIdsInGame;

    if (!gameState.playedAnyCardThisTurn) {
        gameState.consecutivePasses++;
        updateLog(`${player.name} passou o turno.`);
    } else {
        gameState.consecutivePasses = 0;
    }
    
    const activePlayers = playerIds.filter(id => !gameState.players[id].isEliminated);
    if (gameState.consecutivePasses >= activePlayers.length) {
        updateLog("Todos os jogadores passaram consecutivamente. Fim da rodada.");
        await resolveRound();
        return;
    }

    let currentIndex = playerIds.indexOf(gameState.currentPlayer);
    let nextPlayer;
    do {
        currentIndex = (currentIndex + 1) % playerIds.length;
        nextPlayer = gameState.players[playerIds[currentIndex]];
    } while (nextPlayer.isEliminated);
    
    gameState.currentPlayer = nextPlayer.id;
    gameState.selectedCard = null;
    gameState.playedAnyCardThisTurn = false;

    updateLog(`--- Vez de ${nextPlayer.name} ---`);
    gameState.gamePhase = 'playing';

    if (nextPlayer.isHuman) {
        await showTurnIndicator();
        renderAll();
    } else {
        await executeAiTurn(nextPlayer);
    }
};

const beginPathSelectionSequence = async () => {
    // This function is no longer called, but kept for potential future use.
    console.warn("beginPathSelectionSequence called, but should be handled by startNewRound now.");
};

/**
 * Checks for collisions at the start of a round in the final battle.
 * @returns {boolean} True if the game is over due to a collision.
 */
function checkStartOfRoundCollisions() {
    const { gameState } = getState();
    const player1 = gameState.players['player-1'];
    const versatrix = Object.values(gameState.players).find(p => p.aiType === 'versatrix');
    const necros = Object.values(gameState.players).filter(p => p.aiType === 'necroverso_final' && !p.isEliminated);

    let gameOver = false;

    for (const necro of necros) {
        // Check collision with Player 1
        if (player1 && !player1.isEliminated && player1.pathId === necro.pathId && player1.position === necro.position) {
            document.dispatchEvent(new CustomEvent('storyWinLoss', { detail: { battle: 'necroverso_final', won: false, reason: 'collision' }}));
            gameOver = true;
            break; // Stop checking if game is over
        }

        // Check collision with Versatrix
        if (versatrix && !versatrix.isEliminated && versatrix.pathId === necro.pathId && versatrix.position === necro.position) {
            versatrix.isEliminated = true;
            gameState.versatrixPowerDisabled = true;
            updateLog(`Versatrix foi alcançada por um Necroverso e foi eliminada! Seus poderes se foram.`);
            // Neutralize yellow spaces
            gameState.boardPaths.forEach(path => {
                path.spaces.forEach(space => {
                    if (space.color === 'yellow') {
                        space.color = 'white';
                        space.effectName = null;
                    }
                });
            });
            renderBoard();
            renderPlayerArea(versatrix);
        }
    }
    return gameOver;
}

const startNewRound = async (isFirstRound = false) => {
    const { gameState } = getState();
    if (gameState.gamePhase === 'game_over') return;
    if (!isFirstRound) gameState.turn++;
    
    if (gameState.isFinalBoss && !isFirstRound) {
        if (checkStartOfRoundCollisions()) {
            return; // Game over was triggered
        }
    }

    gameState.reversusTotalActive = false;
    dom.appContainerEl.classList.remove('reversus-total-active');
    dom.reversusTotalIndicatorEl.classList.add('hidden');
    const { toggleReversusTotalBackground } = await import('./animations.js');
    toggleReversusTotalBackground(false);
    gameState.activeFieldEffects = [];
    gameState.revealedHands = [];
    gameState.consecutivePasses = 0;
    gameState.player1CardsObscured = false;
    gameState.reversumAbilityUsedThisRound = false;
    gameState.necroXUsedThisRound = false;

    const playerIds = gameState.playerIdsInGame;
    playerIds.forEach(id => {
        const p = gameState.players[id];
        
        // BUG FIX: Only return previous round's resto to the deck, not the initial draw.
        if (p.resto && !isFirstRound) {
            gameState.decks.value.push(p.resto);
        }
        
        if (p.nextResto) {
            p.resto = p.nextResto;
        } else if (!isFirstRound) {
            if (gameState.isFinalBoss) {
                // In final boss mode, resto must be drawn if null
                if (gameState.decks.value.length > 0) p.resto = gameState.decks.value.pop();
            } else {
                p.resto = null;
            }
        }
        p.nextResto = null;
        
        gameState.decks.value.push(...p.playedCards.value);
        gameState.decks.effect.push(...p.playedCards.effect.filter(c => !c.isLocked)); // Don't return locked cards
        p.playedCards.value = [];
        p.playedCards.effect = p.playedCards.effect.filter(c => c.isLocked); // Keep only locked cards
        
        p.effects = { score: null, movement: null };
        p.playedValueCardThisTurn = false;
        p.targetPathForPula = null;
        // BUG FIX: Correctly reference gameState.isInversusMode
        if (gameState.isInversusMode) {
            p.pathId = -1; // Reset path
        }
    });

    gameState.decks.value = shuffle(gameState.decks.value);
    gameState.decks.effect = shuffle(gameState.decks.effect);
    
    renderBoard(); // Render empty board before path selection

    // Draw cards BEFORE triggering field effects
    playerIds.forEach(id => {
        const p = gameState.players[id];
        if (p.isEliminated) return;
        const valueCardsNeeded = config.MAX_VALUE_CARDS_IN_HAND - p.hand.filter(c => c.type === 'value').length;
        const effectCardsNeeded = config.MAX_EFFECT_CARDS_IN_HAND - p.hand.filter(c => c.type === 'effect').length;
        for (let i = 0; i < valueCardsNeeded; i++) if (gameState.decks.value.length > 0) p.hand.push(gameState.decks.value.pop());
        for (let i = 0; i < effectCardsNeeded; i++) if (gameState.decks.effect.length > 0) p.hand.push(gameState.decks.effect.pop());
    });

    if (gameState.isInversusMode) {
        const player1Hand = gameState.players['player-1'].hand;
        gameState.players['player-2'].hand = JSON.parse(JSON.stringify(player1Hand));
        updateLog("A mão do Inversus espelhou a sua!");
    }
    
    // Now trigger field effects
    await triggerFieldEffects();
    
    const player = gameState.players[gameState.currentPlayer];
    gameState.gamePhase = 'playing';
    gameState.playedAnyCardThisTurn = false;
    updateLog(`--- Começando Rodada ${gameState.turn} (Vez de ${player.name}) ---`);

    // Use a robust deep copy for the round snapshot
    updateState('roundStartStateSnapshot', JSON.parse(JSON.stringify(gameState)));
    
    renderAll();
    if (player.isHuman) await showTurnIndicator();
    else await executeAiTurn(player);
};

const endGameCheck = async () => {
    const { gameState, gameStartTime } = getState();
    const elapsedMinutes = gameStartTime ? (Date.now() - gameStartTime) / 60000 : 0;
    const playerIds = gameState.playerIdsInGame;

    if (gameState.isInversusMode) {
        const player1 = gameState.players['player-1'];
        const inversus = gameState.players['player-2'];
        if (player1.hearts <= 0) {
            showGameOver('Você perdeu todos os corações. Inversus venceu!');
            grantAchievement('first_defeat');
            return;
        }
        if (inversus.hearts <= 0) {
            showGameOver('Inversus perdeu todos os corações. Você venceu!');
            grantAchievement('first_win');
            return;
        }
    }

    if (gameState.isStoryMode) {
        if (gameState.isFinalBoss) {
            if (gameState.gamePhase !== 'game_over') {
                 await startNewRound();
            }
            return;
        }
        
        const getStoryWinner = () => {
            if (gameState.storyBattleType === '1v3_king') {
                const p1Pos = gameState.players['player-1'].position;
                 const opponentReachedEnd = ['player-2', 'player-3', 'player-4']
                    .some(id => gameState.players[id] && gameState.players[id].position >= config.WINNING_POSITION);

                if (p1Pos >= config.WINNING_POSITION) return 'player';
                if (opponentReachedEnd) return 'opponent';
                return null;
            }
            
            const p1Pos = gameState.players['player-1'].position;
            const opponentId = playerIds.find(id => id !== 'player-1');
            const opponentPos = opponentId ? gameState.players[opponentId].position : -1;
            if (p1Pos >= config.WINNING_POSITION) return 'player';
            if (opponentPos >= config.WINNING_POSITION) return 'opponent';
            
            return null; // No winner by position yet
        };

        const winner = getStoryWinner();

        if (winner) {
            document.dispatchEvent(new CustomEvent('storyWinLoss', { detail: { battle: gameState.currentStoryBattle, won: (winner === 'player') } }));
            return;
        }

    } else {
        // Standard Game Over Check
        let gameOver = false;
        let winnerMsg = "";
    
        if (gameState.gameMode === 'solo') {
            const winners = playerIds.map(id => gameState.players[id]).filter(p => p.position >= config.WINNING_POSITION);
            if (winners.length > 0) {
                gameOver = true;
                winnerMsg = `Fim de Jogo! ${winners.map(w => w.name).join(' e ')} venceu!`;
            }
        } else if (gameState.gameMode === 'duo') { // Duo
            const teamA_Win = config.TEAM_A.filter(id => playerIds.includes(id)).every(id => gameState.players[id].position >= config.WINNING_POSITION);
            const teamB_Win = config.TEAM_B.filter(id => playerIds.includes(id)).every(id => gameState.players[id].position >= config.WINNING_POSITION);
    
            if (teamA_Win || teamB_Win) {
                gameOver = true;
                if (teamA_Win && teamB_Win) winnerMsg = "Empate incrível! Ambas as equipes venceram!";
                else if (teamA_Win) winnerMsg = "Equipe Azul/Verde (Você & Jogador 3) venceu!";
                else winnerMsg = "Equipe Vermelho/Amarelo (Jogador 2 & Jogador 4) venceu!";
            }
        }
    
        if (gameOver) {
            showGameOver(winnerMsg);
            if (!gameState.isInversusMode) {
                 grantAchievement('first_win');
                if (elapsedMinutes < 5) {
                    grantAchievement('speed_run');
                }
            }
            return; // Stop execution
        }
    }

    // If no one has won yet in any mode, start the next round.
    await startNewRound();
};


/**
 * Initializes the PvP room data.
 */
export const setupPvpRooms = () => {
    const { pvpRooms } = getState();
    if (pvpRooms.length > 0) return;
    
    const rooms = [];
    for (let i = 1; i <= 12; i++) {
        // Rooms 1-11 are full by default, Room 12 is available.
        const playerCount = (i < 12) ? 4 : 0;
        const room = {
            id: i,
            players: playerCount,
            password: (i === 12) ? 'Final' : null,
            mode: 'N/A'
        };
        rooms.push(room);
    }
    updateState('pvpRooms', rooms);
};
