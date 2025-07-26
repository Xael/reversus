

import * as config from './config.js';
import * as dom from './dom.js';
import * as state from './state.js';
import * as sound from './sound.js';
import * as story from './story.js';

let fieldEffectTargetResolver = null;
let pathChoiceResolver = null;
let fieldEffectContinueResolver = null;

// --- UTILITY FUNCTIONS ---
const shuffle = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};

const createDeck = (deckConfig, cardType) => {
    let idCounter = 0;
    return deckConfig.flatMap(item => Array.from({ length: item.count }, () => {
        const cardData = 'value' in item ? { name: item.value, value: item.value } : { name: item.name };
        return { id: Date.now() + Math.random() + idCounter++, type: cardType, ...cardData };
    }));
};

export const getCardImageUrl = (card, isHidden) => {
    if (isHidden) {
        return card.type === 'value' ? 'verso_valor.png' : 'verso_efeito.png';
    }
    if (card.name === 'NECRO X') {
        return 'cartanecroverso.png';
    }
    const cardNameSanitized = card.name.toString().toLowerCase().replace(/\s/g, '');
    return `frente_${cardNameSanitized}.png`;
};

// --- LOGGING ---
export const updateLog = (message) => {
    console.log(message);
    if (!state.gameState || !state.gameState.log) return;
    state.gameState.log.unshift(message);
    dom.logEl.innerHTML = state.gameState.log.slice(0, 50).map(m => `<div>${m}</div>`).join('');
    dom.logEl.scrollTop = 0;
};


// --- ANIMATION FUNCTIONS ---
const animateNecroX = () => {
    const overlay = document.getElementById('necro-x-animation-overlay');
    if (overlay) {
        overlay.classList.remove('hidden');
        setTimeout(() => overlay.classList.add('hidden'), 2500);
    }
};

const initializeFloatingItemsAnimation = (containerEl) => {
    containerEl.innerHTML = '';
    const effectNames = config.EFFECT_DECK_CONFIG.map(c => c.name);

    for (let i = 0; i < 30; i++) {
        const isCard = Math.random() > 0.3;
        const item = document.createElement('div');
        item.classList.add('animated-item');

        if (isCard) {
            item.classList.add('card-shape');
            const imageUrl = config.SPLASH_SCREEN_CARD_IMAGES[Math.floor(Math.random() * config.SPLASH_SCREEN_CARD_IMAGES.length)];
            item.style.backgroundImage = `url('${imageUrl}')`;
        } else {
            item.classList.add('text-shape');
            const effectName = effectNames[Math.floor(Math.random() * effectNames.length)];
            item.textContent = effectName;

            if (['Mais', 'Sobe', 'Troca Justa'].includes(effectName)) item.classList.add('positive');
            else if (['Menos', 'Desce', 'Troca Injusta'].includes(effectName)) item.classList.add('negative');
            else if (effectName === 'Pula') item.classList.add('pula');
            else if (effectName === 'Reversus') item.classList.add('reversus');
            else if (effectName === 'Reversus Total') item.classList.add('reversus-total');

            item.style.fontSize = `${Math.random() * 1.5 + 1.2}rem`;
        }

        item.style.left = `${Math.random() * 100}vw`;
        const duration = Math.random() * 20 + 30; // 30-50 seconds
        item.style.animationDuration = `${duration}s`;
        item.style.animationDelay = `-${Math.random() * duration}s`;

        containerEl.appendChild(item);
    }
};

const toggleReversusTotalBackground = (isActive) => {
    if (isActive) {
        initializeFloatingItemsAnimation(dom.reversusTotalBgAnimationEl);
        dom.reversusTotalBgAnimationEl.classList.remove('hidden');
    } else {
        dom.reversusTotalBgAnimationEl.classList.add('hidden');
        dom.reversusTotalBgAnimationEl.innerHTML = '';
    }
};

const animateCardPlay = (card, fromPlayerId, toPlayerId) => {
    return new Promise(resolve => {
        const fromEl = document.getElementById(`hand-${fromPlayerId}`);
        const toEl = document.getElementById(`play-zone-${toPlayerId}`);
        if (!fromEl || !toEl) {
            resolve();
            return;
        }

        const fromRect = fromEl.getBoundingClientRect();
        const toRect = toEl.getBoundingClientRect();

        const clone = document.createElement('div');
        clone.innerHTML = renderCard(card, 'play-zone', toPlayerId);
        const cardClone = clone.firstElementChild;
        cardClone.classList.add('card-animation-clone');
        cardClone.style.left = `${fromRect.left + fromRect.width / 2 - 40}px`;
        cardClone.style.top = `${fromRect.top + fromRect.height / 2 - 55}px`;

        document.body.appendChild(cardClone);

        requestAnimationFrame(() => {
            cardClone.style.left = `${toRect.left + (toRect.width / 10)}px`; // Adjust for play zone slot
            cardClone.style.top = `${toRect.top + (toRect.height / 2) - 55}px`;
            cardClone.style.transform = 'scale(1)';
        });

        setTimeout(() => {
            cardClone.remove();
            renderAll();
            resolve();
        }, 600);
    });
};

export const announceEffect = (text, type = 'default', duration = 1500) => {
    if (type === 'default' && ['Mais', 'Sobe', 'Menos', 'Desce', 'Reversus', 'Reversus Total', 'Pula'].includes(text)) {
        const cardName = text;
        sound.playSoundEffect(cardName);
        let animationDuration = 1500;

        switch (cardName) {
            case 'Mais': case 'Sobe': type = 'positive'; break;
            case 'Menos': case 'Desce': type = 'negative'; break;
            case 'Reversus': type = 'reversus'; animationDuration = 1800; break;
            case 'Reversus Total':
                toggleReversusTotalBackground(true);
                type = 'reversus-total';
                animationDuration = 2000;
                break;
            case 'Pula': type = 'default'; break;
        }
        duration = animationDuration;
    }

    dom.effectAnnouncerEl.textContent = text;
    dom.effectAnnouncerEl.className = 'effect-announcer-overlay';
    dom.effectAnnouncerEl.classList.add(type);

    dom.effectAnnouncerEl.classList.remove('hidden');
    dom.effectAnnouncerEl.classList.add('is-announcing');

    setTimeout(() => {
        dom.effectAnnouncerEl.classList.add('hidden');
        dom.effectAnnouncerEl.classList.remove('is-announcing');
    }, duration);
};

// --- RENDER FUNCTIONS ---
const renderCard = (card, context, playerId) => {
    const isHumanPlayer = playerId === 'player-1';
    const classList = ['card', card.type];
    const isHidden = context === 'ai-hand' && !state.gameState.revealedHands.includes(playerId);

    let isCardDisabled = false;
    if (playerId && context === 'player-hand') {
        const player = state.gameState.players[playerId];
        if (player.isHuman) {
            if (card.type === 'value') {
                const valueCardsInHandCount = player.hand.filter(c => c.type === 'value').length;
                if (valueCardsInHandCount <= 1 || player.playedValueCardThisTurn) {
                    isCardDisabled = true;
                }
            }
            if (card.type === 'effect' && state.gameState.tutorial?.isActive) {
                if (state.gameState.turn < 3) {
                    isCardDisabled = true;
                }
            }
        }
    }

    if (isHumanPlayer && context === 'player-hand' && state.gameState.selectedCard?.id === card.id) classList.push('selected');
    if (isCardDisabled) classList.push('disabled');
    if (context === 'modal') classList.push('modal-card');

    if (card.name === 'Reversus Total') {
        classList.push('reversus-total-card');
        if (playerId === 'player-1') {
            classList.push('reversus-total-glow');
        }
    }

    if (context === 'play-zone' && card.casterId) {
        const caster = state.gameState.players[card.casterId];
        if (caster && caster.aiType === 'necroverso') {
            classList.push('necro-glow');
        }
    }

    let cardStyle;
    if (isHumanPlayer && context === 'player-hand' && state.gameState.player1CardsObscured) {
        cardStyle = `style="background-image: url('cartacontravox.png');"`;
    } else {
        cardStyle = `style="background-image: url('${getCardImageUrl(card, isHidden)}');"`;
    }

    const maximizeButtonHTML = !isHidden ? '<div class="card-maximize-button" title="Ver carta"></div>' : '';

    return `<div class="${classList.join(' ')}" data-card-id="${card.id}" ${isCardDisabled ? 'aria-disabled="true"' : ''} ${cardStyle}>
                ${maximizeButtonHTML}
            </div>`;
};


const renderPlayerArea = (player) => {
    const playerEl = document.getElementById(`player-area-${player.id}`);
    if (!playerEl) return;
    
    playerEl.classList.toggle('eliminated', !!player.isEliminated);
    
    if (player.isEliminated) {
        playerEl.innerHTML = '';
        return;
    }

    playerEl.style.backgroundColor = '';
    playerEl.style.borderColor = '';
    playerEl.style.color = '';

    if (player.aiType === 'necroverso' || player.aiType === 'necroverso-final') {
        playerEl.style.backgroundColor = '#424242';
        playerEl.style.borderColor = '#616161';
        playerEl.style.color = '#f1f1f1';
    }

    const isRevealed = state.gameState.revealedHands.includes(player.id);
    const effectsList = [player.effects.score, player.effects.movement].filter(Boolean);
    const activeFieldEffects = state.gameState.activeFieldEffects.filter(fe => fe.appliesTo === player.id);
    let fieldEffectIndicatorHTML = '';
    let heartsHTML = '';

    if (player.aiType === 'necroverso-final') {
        const hearts = state.gameState.necroHearts;
        heartsHTML = `<div class="necro-hearts-container" title="Corações do Necroverso">${'❤️'.repeat(hearts)}</div>`;
    }

    if (activeFieldEffects.length > 0) {
        const effect = activeFieldEffects[0];
        const effectColor = effect.type === 'positive' ? 'var(--accent-blue)' : 'var(--accent-red)';
        fieldEffectIndicatorHTML = `
            <div class="field-effect-indicator" data-player-id="${player.id}" title="Ver Efeito de Campo">
                <span style="font-weight: 700; color: ${effectColor}; font-size: 0.85rem;">Efeito de Campo</span>
                <div class="field-effect-square" style="background-color: ${effectColor};"></div>
            </div>
        `;
    }

    let headerHTML;
    const nameClasses = ['player-name', player.id];
    if (player.aiType === 'necroverso-final') {
        nameClasses.push('glowing');
    }
    const nameStyle = player.aiType === 'necroverso' ? 'style="color: #000;"' : '';

    if (player.isHuman) {
        const effectsHTML = effectsList.length > 0 ? effectsList.map(e => `<span class="effect-tag">${e}</span>`).join(' ') : 'Nenhum';
        const scoreDisplay = (player.id === 'player-1' && state.gameState.player1CardsObscured) ? '?' : player.liveScore;
        const positionDisplay = state.gameState.isInvertedLogic && player.position === 10 ? 'Centro' : player.position;
        headerHTML = `
            <div class="player-header human-player-header">
                <div class="human-header-top">
                    <div class="player-name-container">
                        <span class="${nameClasses.join(' ')}">${player.name}</span>
                         ${isRevealed ? '<div class="revealed-icon" title="Mão revelada"></div>' : ''}
                         ${fieldEffectIndicatorHTML}
                    </div>
                    <div class="winning-badge ${player.isWinning ? '' : 'hidden'}">Ganhando</div>
                </div>
                <div class="human-stats">
                    <span>Pontos: <strong>${scoreDisplay}</strong></span>
                    <span>Casa: <strong>${positionDisplay}</strong></span>
                    <span>Resto: <strong>${player.resto ? player.resto.name : 'N/A'}</strong></span>
                    <span>Efeito: <strong>${effectsHTML}</strong></span>
                </div>
            </div>
        `;
    } else {
        const effectsCompactHTML = effectsList.length > 0 ? effectsList.map(e => e).join(', ') : 'Nenhum';
        const positionDisplay = state.gameState.isInvertedLogic && player.position === 10 ? 'C' : player.position;
        headerHTML = `
            <div class="player-header opponent-header">
                <div class="opponent-header-top">
                    <div class="player-name-container">
                        <span class="${nameClasses.join(' ')}" ${nameStyle}>${player.name}</span>
                        ${isRevealed ? '<div class="revealed-icon" title="Mão revelada"></div>' : ''}
                        ${fieldEffectIndicatorHTML}
                    </div>
                    ${heartsHTML}
                    <div class="winning-badge ${player.isWinning ? '' : 'hidden'}">Ganhando</div>
                </div>
                <div class="opponent-stats">
                    <span title="Pontuação">P: <strong>${player.liveScore}</strong></span>
                    <span title="Caminho/Casa">${player.pathId !== null ? player.pathId + 1 : 'N/A'}/${positionDisplay}</span>
                    <span title="Resto">R: <strong>${player.resto ? player.resto.name : 'N/A'}</strong></span>
                    <span title="Efeitos" class="opponent-effects">E: <strong>${effectsCompactHTML}</strong></span>
                </div>
            </div>
        `;
    }

    const handContext = player.isHuman || isRevealed ? 'player-hand' : 'ai-hand';
    const sortedHand = [...player.hand].sort((a, b) => {
        if (a.type === b.type) return 0;
        return a.type === 'value' ? -1 : 1;
    });
    const handHTML = sortedHand.map(card => renderCard(card, handContext, player.id)).join('');

    const renderSlot = (card, label) => {
        const cardHTML = card ? renderCard(card, 'play-zone', player.id) : '';
        return `<div class="play-zone-slot" data-label="${label}">${cardHTML}</div>`;
    };

    const valueCard1 = player.playedCards.value[0];
    const valueCard2 = player.playedCards.value[1];
    const scoreEffectCard = player.playedCards.effect.find(c => ['Mais', 'Menos', 'NECRO X', 'NECRO X Invertido'].includes(c.name) || (c.name === 'Reversus' && c.reversedEffectType === 'score'));
    const moveEffectCard = player.playedCards.effect.find(c => ['Sobe', 'Desce', 'Pula'].includes(c.name) || (c.name === 'Reversus' && c.reversedEffectType === 'movement'));
    const reversusTotalCard = player.playedCards.effect.find(c => c.name === 'Reversus Total');

    const playZoneHTML = `
        <div class="play-zone" id="play-zone-${player.id}">
            ${renderSlot(valueCard1, 'Valor 1')}
            ${renderSlot(valueCard2, 'Valor 2')}
            ${renderSlot(scoreEffectCard, 'Pontuação')}
            ${renderSlot(moveEffectCard, 'Movimento')}
            ${renderSlot(reversusTotalCard, 'Reversus Total')}
        </div>
    `;

    const areaContent = `
        ${headerHTML}
        ${playZoneHTML}
        <div class="player-hand" id="hand-${player.id}">${handHTML}</div>
    `;

    playerEl.innerHTML = areaContent;
};


const renderAllPlayerAreas = () => {
    if (!state.gameState || !state.gameState.players) return;
    Object.values(state.gameState.players).forEach(renderPlayerArea);
};

const renderBoard = () => {
    dom.boardEl.innerHTML = '';
    const boardCenterPawnsEl = document.getElementById('board-center-pawns');
    boardCenterPawnsEl.innerHTML = '';
    
    dom.boardEl.appendChild(boardCenterPawnsEl);

    state.gameState.boardPaths.forEach(path => {
        const pathEl = document.createElement('div');
        pathEl.className = 'player-path';
        pathEl.style.transform = `translateX(-50%) rotate(${path.id * (360 / config.NUM_PATHS)}deg)`;

        path.spaces.forEach(space => {
            const spaceEl = document.createElement('div');
            const classList = ['board-space', `space-${space.color}`];
            if (space.isUsed) classList.push('used');
            spaceEl.className = classList.join(' ');
            if (space.color !== 'black') {
                const spaceNumber = state.gameState.isInvertedLogic ? (config.BOARD_SIZE - space.id + 1) : space.id;
                spaceEl.textContent = spaceNumber.toString();
            }

            const pawnContainer = document.createElement('div');
            pawnContainer.className = 'pawn-container';
            spaceEl.appendChild(pawnContainer);
            pathEl.appendChild(spaceEl);
        });
        dom.boardEl.appendChild(pathEl);
    });

    // Pawns on paths
    state.gameState.playerIdsInGame.forEach(playerId => {
        const player = state.gameState.players[playerId];
        if (player.isEliminated || player.position >= 10 || player.pathId === null) return;
        
        const pathEl = Array.from(dom.boardEl.querySelectorAll('.player-path'))[player.pathId];
        if (pathEl) {
            const spaceIndex = state.gameState.isInvertedLogic ? (config.BOARD_SIZE - player.position) : (player.position - 1);
            if (spaceIndex >= 0 && spaceIndex < pathEl.children.length) {
                const spaceEl = pathEl.children[spaceIndex];
                if (spaceEl) {
                    const pawnContainer = spaceEl.querySelector('.pawn-container');
                    if (pawnContainer) {
                        const pawn = document.createElement('div');
                        pawn.className = `pawn player-${player.id.split('-')[1]}`;
                        if (player.aiType === 'necroverso' || player.aiType === 'necroverso-final') {
                             pawn.style.backgroundColor = '#000000';
                             pawn.style.boxShadow = '0 0 8px 1px #888, inset 0 0 4px rgba(255, 255, 255, 0.3)';
                        }
                        pawnContainer.appendChild(pawn);
                    }
                }
            }
        }
    });

    // Pawns in center (position 10)
    const playersInCenter = state.gameState.playerIdsInGame
        .map(id => state.gameState.players[id])
        .filter(p => !p.isEliminated && p.position === 10);
    
    playersInCenter.forEach(player => {
        const pawn = document.createElement('div');
        pawn.className = `pawn player-${player.id.split('-')[1]}`;
        if (player.aiType === 'necroverso-final') {
             pawn.style.backgroundColor = '#000000';
             pawn.style.boxShadow = '0 0 8px 1px #888, inset 0 0 4px rgba(255, 255, 255, 0.3)';
        }
        boardCenterPawnsEl.appendChild(pawn);
    });
};

const updateTurnIndicator = () => {
    let text = '';
    if (!state.gameState) return;
    const currentPlayer = state.gameState.players[state.gameState.currentPlayer];
    switch (state.gameState.gamePhase) {
        case 'playing':
            text = currentPlayer.isHuman ? `Sua Vez (Rodada ${state.gameState.turn})` : `Vez do ${currentPlayer.name}`;
            if (state.gameState.tutorial?.isActive) {
                text = `Tutorial: ${text}`;
            }
            break;
        case 'resolution': text = 'Calculando resultados...'; break;
        case 'round_summary': text = `Resumo da Rodada ${state.gameState.turn}`; break;
        case 'game-over': text = 'Fim de Jogo!'; break;
        case 'story': text = 'Modo História'; break;
        case 'targeting': text = 'Escolha um jogador alvo...'; break;
        case 'reversus_targeting': text = 'Escolha qual efeito reverter...'; break;
        case 'pula_casting': text = `Escolha um caminho para ${state.gameState.pulaTarget?.targetPlayerId ? state.gameState.players[state.gameState.pulaTarget.targetPlayerId].name : '...'} pular`; break;
        case 'choose_path': text = 'Escolha seu caminho inicial'; break;
        case 'field_effect': text = 'Efeito de campo ativado!'; break;
        case 'field_effect_targeting': text = 'Escolha um alvo para o efeito de campo...'; break;
        default: text = 'Aguarde...';
    }
    dom.turnIndicatorEl.textContent = text;
};

export const renderAll = () => {
    if (!state.gameState || state.gameState.gamePhase === 'splash') return;
    updateLiveScoresAndWinningStatus();
    renderBoard();
    updateTurnIndicator();
    renderAllPlayerAreas();

    const isPlayerTurn = state.gameState.gamePhase === 'playing' && state.gameState.currentPlayer === 'player-1';
    dom.playButton.disabled = !isPlayerTurn || !state.gameState.selectedCard;
    dom.endTurnButton.disabled = !isPlayerTurn;
};

// --- GAME LOGIC ---
export const updateGameTimer = () => {
    if (state.gameState && state.gameState.isNecroFinalBattle) {
        if (state.gameState.countdown > 0) {
            state.gameState.countdown--;
        } else {
            endGameCheck(); // Time's up
        }
        const minutes = Math.floor(state.gameState.countdown / 60).toString().padStart(2, '0');
        const seconds = (state.gameState.countdown % 60).toString().padStart(2, '0');
        dom.gameTimerContainerEl.textContent = `${minutes}:${seconds}`;
        dom.gameTimerContainerEl.classList.add('countdown');
    } else {
        if (!state.gameStartTime) return;
        const elapsed = Math.floor((Date.now() - state.gameStartTime) / 1000) + (state.gameState.elapsedSecondsAtRoundStart || 0);
        const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
        const seconds = (elapsed % 60).toString().padStart(2, '0');
        dom.gameTimerContainerEl.textContent = `${minutes}:${seconds}`;
        dom.gameTimerContainerEl.classList.remove('countdown');
    }
};


export const showSplashScreen = () => {
    state.setGameTimerInterval(null);
    state.setGameStartTime(null);

    initializeFloatingItemsAnimation(dom.splashAnimationContainerEl);
    dom.splashScreenEl.classList.remove('hidden');
    dom.appContainerEl.classList.add('hidden');
    dom.pvpRoomListModal.classList.add('hidden');
    dom.pvpLobbyModal.classList.add('hidden');
    dom.gameSetupModal.classList.add('hidden');
    dom.storyModeModalEl.classList.add('hidden');
    dom.debugButton.classList.add('hidden');

    state.checkInitialLoadState();
    sound.stopStoryMusic();
    dom.musicPlayer.src = 'tela.ogg';
    sound.updateMusic();
};

export const setupGame = () => {
    dom.gameSetupModal.classList.remove('hidden');
    dom.appContainerEl.classList.add('blurred');
};

const generateBoardPaths = (storyBattle = null, necroFinal = false) => {
    const paths = [];
    
    for (let i = 0; i < config.NUM_PATHS; i++) {
        const spaces = Array.from({ length: config.BOARD_SIZE }, (_, j) => ({
            id: j + 1, color: 'white', effectName: null, isUsed: false
        }));

        let availableSpaceIds = Array.from({ length: config.BOARD_SIZE - 2 }, (_, j) => j + 2); // Exclude 1 and 9 initially

        if (storyBattle === 'versatrix') {
             const yellowSpaceIds = shuffle(availableSpaceIds).slice(0, 2);
             yellowSpaceIds.forEach(id => spaces[id-1].color = 'yellow');
             availableSpaceIds = availableSpaceIds.filter(id => !yellowSpaceIds.includes(id));
        }

        if (necroFinal) {
             const blackSpacesToPlace = shuffle([1, 2])[0];
             const blackSpaceIds = shuffle(availableSpaceIds.filter(id => id > 2)).slice(0, blackSpacesToPlace);
             blackSpaceIds.forEach(id => spaces[id-1].color = 'black');
             availableSpaceIds = availableSpaceIds.filter(id => !blackSpaceIds.includes(id));
        }
        
        const allPositiveEffects = Object.keys(config.POSITIVE_EFFECTS);
        const allNegativeEffects = Object.keys(config.NEGATIVE_EFFECTS);

        const coloredSpaceIds = shuffle(availableSpaceIds).slice(0, config.COLORED_SPACES_PER_PATH);
        coloredSpaceIds.forEach(spaceId => {
            const space = spaces.find(s => s.id === spaceId);
            if (!space) return;

            const isReversumBattle = storyBattle === 'reversum';
            const isPositive = isReversumBattle ? false : (Math.random() > 0.5);

            if (isPositive) {
                space.color = 'blue';
                space.effectName = shuffle([...allPositiveEffects])[0];
            } else {
                space.color = 'red';
                space.effectName = shuffle([...allNegativeEffects])[0];
            }
        });

        const playerId = i < config.MASTER_PLAYER_IDS.length ? config.MASTER_PLAYER_IDS[i] : null;
        paths.push({ id: i, playerId, spaces });
    }
    return paths;
};

export const initializeGame = (mode, options) => {
    state.setGameState(null); // Clear previous game state
    
    const baseConfig = structuredClone(config.originalPlayerConfig);
    let currentConfig = {};
    config.MASTER_PLAYER_IDS.forEach(id => {
        currentConfig[id] = structuredClone(baseConfig[id]);
    });

    if (options.overrides) {
        for (const id in options.overrides) {
            if (currentConfig[id]) {
                Object.assign(currentConfig[id], options.overrides[id]);
            }
        }
    }

    let playerIdsInGame;
    let numPlayers;
    let modeText;
    let isStoryMode = false;
    let storyBattle = null;
    let storyBattleType = null;
    let tutorial = null;
    let isNecroFinalBattle = false;
    let isInvertedLogic = false;

    if (options.story) {
        isStoryMode = true;
        storyBattle = options.story.battle;

        if (storyBattle === 'tutorial') {
            playerIdsInGame = ['player-1', 'player-2'];
            options.story.overrides = { 'player-2': { ...baseConfig['necroverso']} };
            tutorial = { isActive: true, step: 'intro', turnCount: 0, noAbility: true };
        } else {
            playerIdsInGame = options.story.playerIds;
        }

        numPlayers = playerIdsInGame.length;
        storyBattleType = options.story.type || null;
        isNecroFinalBattle = storyBattle === 'necroverso_final_2v2';
        isInvertedLogic = isNecroFinalBattle;

        if (options.story.overrides) {
            for (const id in options.story.overrides) {
                 currentConfig[id] = { ...currentConfig[id], ...baseConfig[options.story.overrides[id].aiType], ...options.story.overrides[id] };
            }
        }
        modeText = `Modo História: ${storyBattle}`;

        switch (storyBattle) {
            case 'contravox': sound.playStoryMusic('contravox.ogg'); break;
            case 'versatrix': sound.playStoryMusic('versatrix.ogg'); break;
            case 'reversum': sound.playStoryMusic('reversum.ogg'); break;
            case 'necroverso_final_1v3': sound.playStoryMusic('necroverso.ogg'); break;
            case 'necroverso_final_2v2': sound.playStoryMusic('necroversofinal.ogg'); break;
            default: sound.stopStoryMusic();
        }

    } else {
        if (options.necroFinalMode) {
            isNecroFinalBattle = true;
            isInvertedLogic = true;
            mode = 'duo';
            playerIdsInGame = ['player-1', 'player-2', 'player-3', 'player-4'];
            numPlayers = 4;
            currentConfig['player-2'] = { ...baseConfig['necroverso-final'] };
            currentConfig['player-3'] = { ...baseConfig['necroverso-final'] };
            currentConfig['player-4'] = { ...baseConfig['versatrix'] };
            modeText = 'Desafio: Necroverso Final';
            sound.playStoryMusic('necroversofinal.ogg');

        } else {
             numPlayers = options.numPlayers;
             playerIdsInGame = config.MASTER_PLAYER_IDS.slice(0, numPlayers);
             modeText = mode === 'solo' ? `Solo (${numPlayers}p)` : 'Duplas';
             sound.stopStoryMusic();
             if (options.aiOpponents) {
                options.aiOpponents.forEach(p => {
                    if (currentConfig[p.id]) {
                         currentConfig[p.id] = { ...currentConfig[p.id], ...baseConfig[p.type] };
                    }
                });
             }
        }
    }

    dom.gameSetupModal.classList.add('hidden');
    dom.pvpLobbyModal.classList.add('hidden');
    story.endStory();
    dom.appContainerEl.classList.remove('blurred', 'hidden');
    dom.reversusTotalIndicatorEl.classList.add('hidden');
    dom.debugButton.classList.remove('hidden');

    if (!isStoryMode && !isNecroFinalBattle) {
        sound.stopStoryMusic();
        dom.musicPlayer.src = config.MUSIC_TRACKS[0];
        sound.updateMusic();
    }
    
    state.setGameTimerInterval(null);
    state.setGameStartTime(Date.now());
    dom.gameTimerContainerEl.textContent = '00:00';
    state.setGameTimerInterval(setInterval(updateGameTimer, 1000));
    
    const valueDeck = shuffle(createDeck(config.VALUE_DECK_CONFIG, 'value'));
    const effectDeck = shuffle(createDeck(config.EFFECT_DECK_CONFIG, 'effect'));

    const players = Object.fromEntries(
        playerIdsInGame.map((id, index) => [id, {
            ...currentConfig[id],
            id,
            pathId: isInvertedLogic ? null : index,
            position: isInvertedLogic ? 10 : 1,
            hand: [],
            resto: null,
            nextResto: null,
            effects: { score: null, movement: null },
            playedCards: { value: [], effect: [] },
            playedValueCardThisTurn: false,
            targetPathForPula: null,
            liveScore: 0,
            isWinning: false,
            isEliminated: false,
        }])
    );

    const boardPaths = generateBoardPaths(storyBattle, isNecroFinalBattle);
    if (!isInvertedLogic) {
        playerIdsInGame.forEach((id, index) => {
            if (boardPaths[index]) boardPaths[index].playerId = id;
        });
    }


    state.setGameState({
        players,
        playerIdsInGame,
        decks: { value: valueDeck, effect: effectDeck },
        boardPaths,
        gamePhase: 'setup',
        gameMode: mode,
        isStoryMode,
        isNecroFinalBattle,
        isInvertedLogic,
        countdown: 20 * 60,
        necroHearts: 2,
        currentStoryBattle: storyBattle,
        storyBattleType: storyBattleType,
        tutorial,
        contravoxAbilityUses: 3,
        player1CardsObscured: false,
        versatrixSwapActive: false,
        reversumAbilityUsedThisRound: false,
        necroXUsedThisRound: false,
        elapsedSecondsAtRoundStart: 0,
        currentPlayer: 'player-1',
        reversusTotalActive: false,
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
    });

    const player1Container = document.getElementById('player-1-area-container');
    const opponentsContainer = document.getElementById('opponent-zones-container');

    const createPlayerAreaHTML = (id) => `<div class="player-area" id="player-area-${id}"></div>`;

    player1Container.innerHTML = createPlayerAreaHTML('player-1');
    opponentsContainer.innerHTML = playerIdsInGame.filter(id => id !== 'player-1').map(id => createPlayerAreaHTML(id)).join('');

    updateLog(`Bem-vindo ao Reversus! Modo: ${modeText}.`);
    if (mode === 'duo' && !isStoryMode && !isNecroFinalBattle) updateLog("Equipe Azul/Verde (Você & Jogador 3) vs. Equipe Vermelho/Amarelo (Jogador 2 & Jogador 4)");

    renderAll();

    if (state.gameState.tutorial?.isActive) {
        story.handleTutorialProgression();
    } else if (state.gameState.isInvertedLogic) {
        chooseInitialPath().then(() => setTimeout(() => initiateGameStartSequence(), 500));
    } else {
        setTimeout(initiateGameStartSequence, 500);
    }
};

export const initiateGameStartSequence = (isTutorial = false) => {
    dom.drawStartTitle.textContent = "Sorteio Inicial";
    dom.drawStartResultMessage.textContent = "Sorteando cartas para ver quem começa...";

    dom.drawStartCardsContainerEl.innerHTML = state.gameState.playerIdsInGame.map(id => {
        const player = state.gameState.players[id];
        return `
            <div class="draw-start-player-slot">
                <span class="player-name player-${id.split('-')[1]}">${player.name}</span>
                <div class="card modal-card" style="background-image: url('verso_valor.png');" id="draw-card-${id}"></div>
            </div>
        `;
    }).join('');

    dom.drawStartModal.classList.remove('hidden');
    setTimeout(() => drawToStart(isTutorial), 1500);
};

const drawToStart = async (isTutorial = false) => {
    if (state.gameState.decks.value.length < state.gameState.playerIdsInGame.length) {
        updateLog("Reabastecendo o baralho de valor.");
        state.gameState.decks.value.push(...shuffle(createDeck(config.VALUE_DECK_CONFIG, 'value')));
    }

    const drawnCards = {};
    const cardPromises = [];

    state.gameState.playerIdsInGame.forEach((id, index) => {
        const card = state.gameState.decks.value.pop();
        drawnCards[id] = card;
        const cardEl = document.getElementById(`draw-card-${id}`);

        const promise = new Promise(res => {
            setTimeout(() => {
                if (cardEl) cardEl.outerHTML = renderCard(card, 'modal');
                res();
            }, 500 * index);
        });
        cardPromises.push(promise);
    });

    await Promise.all(cardPromises);

    setTimeout(async () => {
        const sortedPlayers = state.gameState.playerIdsInGame.sort((a, b) => drawnCards[b].value - drawnCards[a].value);
        const logParts = state.gameState.playerIdsInGame.map(id => `${state.gameState.players[id].name} sacou ${drawnCards[id].name}`);
        updateLog(`Sorteio: ${logParts.join(', ')}.`);

        if (sortedPlayers.length < 2 || drawnCards[sortedPlayers[0]].value > drawnCards[sortedPlayers[1]].value) {
            const winner = state.gameState.players[sortedPlayers[0]];
            state.gameState.currentPlayer = winner.id;
            state.gameState.initialDrawCards = drawnCards;
            dom.drawStartResultMessage.textContent = `${winner.name} tirou a carta mais alta e começa!`;
            setTimeout(async () => {
                dom.drawStartModal.classList.add('hidden');
                if (isTutorial) {
                    story.handleTutorialProgression();
                } else {
                    finalizeGameStart();
                }
            }, 2000);
        } else {
            dom.drawStartResultMessage.textContent = "Empate! Sorteando novamente...";
            updateLog("Empate! Sacando novas cartas...");
            Object.values(drawnCards).forEach(card => state.gameState.decks.value.push(card));
            state.gameState.decks.value = shuffle(state.gameState.decks.value);
            setTimeout(() => isTutorial ? story.startTutorialDraw() : initiateGameStartSequence(), 2000);
        }
    }, 1500);
};

export const finalizeGameStart = () => {
    state.gameState.playerIdsInGame.forEach(id => {
        if(state.gameState.initialDrawCards && state.gameState.initialDrawCards[id]){
             state.gameState.players[id].resto = state.gameState.initialDrawCards[id];
             updateLog(`Resto inicial de ${state.gameState.players[id].name} é ${state.gameState.initialDrawCards[id].name}.`);
        }
    });

    startNewRound(true);
};

export const showTurnIndicator = () => {
    dom.turnAnnounceModal.classList.remove('hidden');
    dom.turnAnnounceModal.style.animation = 'none';
    requestAnimationFrame(() => {
        setTimeout(() => {
             dom.turnAnnounceModal.style.animation = 'fade-in-out 1.5s ease-in-out forwards';
        }, 0);
    });
};

const handleCardClick = (cardElement) => {
    const cardId = parseFloat(cardElement.dataset.cardId);
    if (state.gameState.currentPlayer !== 'player-1' || state.gameState.gamePhase !== 'playing') {
        return;
    }
    if (isNaN(cardId) || cardElement.classList.contains('disabled')) {
        return;
    }

    const player = state.gameState.players['player-1'];
    const card = player.hand.find(c => c.id === cardId);

    if (card) {
        if (state.gameState.selectedCard?.id === cardId) {
            state.gameState.selectedCard = null;
        } else {
            state.gameState.selectedCard = card;
        }
        renderAll();
    }
};

const applyEffect = (card, targetId, casterName, effectTypeToReverse) => {
    const target = state.gameState.players[targetId];
    let effectName = card.name;

    if (state.gameState.activeFieldEffects.some(fe => fe.name === 'Imunidade' && fe.appliesTo === targetId) && (effectName === 'Menos' || effectName === 'Desce')) {
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

    if (state.gameState.reversusTotalActive && effectName !== 'Reversus Total') {
        const inverted = getInverseEffect(effectName);
        if (inverted) {
            updateLog(`Reversus Total inverteu ${card.name} para ${inverted}!`);
            effectName = inverted;
        }
    }

    announceEffect(effectName);

    switch (effectName) {
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
        case 'Reversus Total':
            state.gameState.reversusTotalActive = !state.gameState.reversusTotalActive;
            dom.appContainerEl.classList.toggle('reversus-total-active', state.gameState.reversusTotalActive);
            dom.reversusTotalIndicatorEl.classList.toggle('hidden', !state.gameState.reversusTotalActive);
            Object.values(state.gameState.players).forEach(p => {
                p.effects.score = getInverseEffect(p.effects.score);
                p.effects.movement = getInverseEffect(p.effects.movement);
            });
            updateLog(`${casterName} usou REVERSUS TOTAL! Todos os efeitos foram invertidos!`);
            return;
    }
    updateLog(`${casterName} usou ${effectName} em ${target.name}.`);
};

const playCard = async (caster, card, effectTargetId, effectTypeToReverse) => {
    caster.hand = caster.hand.filter(c => c.id !== card.id);
    state.gameState.playedAnyCardThisTurn = true;

    if (caster.isHuman) {
        dom.endTurnButton.disabled = false;
    }

    const targetPlayer = card.type === 'value' ? caster : state.gameState.players[effectTargetId];
    if (!targetPlayer) {
        console.error("Invalid target player in playCard");
        return;
    }

    const isEffectCard = card.type === 'effect';

    if (card.type === 'value') {
        if (targetPlayer.playedCards.value.length < 2) {
            targetPlayer.playedCards.value.push(card);
        }
        caster.nextResto = card;
        caster.playedValueCardThisTurn = true;
        updateLog(`${caster.name} jogou a carta de valor ${card.name}.`);
    } else if (card.type === 'effect' && effectTargetId) {
        card.casterId = caster.id;

        const getEffectCategory = (cardName, reverseType) => {
            if (['Mais', 'Menos', 'NECRO X', 'NECRO X Invertido'].includes(cardName)) return 'score';
            if (['Sobe', 'Desce', 'Pula'].includes(cardName)) return 'movement';
            if (cardName === 'Reversus') return reverseType;
            if (cardName === 'Reversus Total') return 'total';
            return null;
        };

        const newCardCategory = getEffectCategory(card.name, effectTypeToReverse);

        if (card.name === 'Reversus') card.reversedEffectType = effectTypeToReverse;

        if (newCardCategory && newCardCategory !== 'total') {
            const cardsToKeep = [];
            targetPlayer.playedCards.effect.forEach(existingCard => {
                if (getEffectCategory(existingCard.name, existingCard.reversedEffectType) === newCardCategory) {
                    state.gameState.decks.effect.push(existingCard);
                } else {
                    cardsToKeep.push(existingCard);
                }
            });
            targetPlayer.playedCards.effect = cardsToKeep;
        }
        targetPlayer.playedCards.effect.push(card);

        applyEffect(card, effectTargetId, caster.name, effectTypeToReverse);
    }

    if (isEffectCard) {
        await animateCardPlay(card, caster.id, targetPlayer.id);
    } else {
        renderAll();
    }

    if (caster.isHuman) {
        state.gameState.selectedCard = null;
        state.gameState.reversusTarget = null;
        state.gameState.pulaTarget = null;
    }
};

const getAiTurnDecision = (aiPlayer) => {
    const actions = [];
    const playerIds = state.gameState.playerIdsInGame;

    let myTeamIds, opponentIds;

    if (state.gameState.storyBattleType === '1v3_necro') {
        myTeamIds = ['player-2', 'player-3', 'player-4'].filter(id => playerIds.includes(id));
        opponentIds = ['player-1'];
    } else if (state.gameState.storyBattleType === '2v2_necro_versatrix' || state.gameState.isNecroFinalBattle) {
        if (['player-2', 'player-3'].includes(aiPlayer.id)) { // Necro's team
            myTeamIds = ['player-2', 'player-3'].filter(id => playerIds.includes(id) && !state.gameState.players[id].isEliminated);
            opponentIds = ['player-1', 'player-4'].filter(id => playerIds.includes(id) && !state.gameState.players[id].isEliminated);
        } else { // Player's team (Versatrix AI)
            myTeamIds = ['player-1', 'player-4'].filter(id => playerIds.includes(id) && !state.gameState.players[id].isEliminated);
            opponentIds = ['player-2', 'player-3'].filter(id => playerIds.includes(id) && !state.gameState.players[id].isEliminated);
        }
    } else if (state.gameState.gameMode === 'duo') {
        myTeamIds = config.TEAM_A.includes(aiPlayer.id) ? config.TEAM_A : config.TEAM_B;
        opponentIds = playerIds.filter(id => !myTeamIds.includes(id));
    } else {
        myTeamIds = [aiPlayer.id];
        opponentIds = playerIds.filter(id => id !== aiPlayer.id);
    }

    const isInverted = state.gameState.reversusTotalActive;
    let pulaPathChoice = undefined;
    let necroXActionPushed = false;
    
    // Necro Final AI: Chase logic
    if (aiPlayer.aiType === 'necroverso-final' && aiPlayer.position === (state.gameState.isInvertedLogic ? 9 : 2)) {
        const player1 = state.gameState.players['player-1'];
        if (player1 && aiPlayer.pathId !== player1.pathId) {
            const pulaCard = aiPlayer.hand.find(c => c.name === 'Pula');
            if (pulaCard) {
                 actions.push({ action: 'play', cardId: pulaCard.id, card: pulaCard, target: aiPlayer.id, effectTypeTarget: 'movement' });
                 aiPlayer.targetPathForPula = player1.pathId;
            }
        }
    }

    if (aiPlayer.aiType === 'reversum' && !state.gameState.reversusTotalActive && !state.gameState.reversumAbilityUsedThisRound) {
        let scoreChangeIfUsed = 0;
        playerIds.forEach(pId => {
            const p = state.gameState.players[pId];
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
        }
    }

    if (aiPlayer.aiType === 'necroverso' && !(state.gameState.tutorial?.isActive && state.gameState.tutorial.noAbility) && (aiPlayer.resto?.value === 10 || aiPlayer.resto?.value === 8) && !state.gameState.necroXUsedThisRound) {
        if (!aiPlayer.effects.score || aiPlayer.effects.score === (isInverted ? 'Mais' : 'Menos')) {
            actions.push({ action: 'use_necrox_ability' });
            necroXActionPushed = true;
        }
    }

    if (!aiPlayer.playedValueCardThisTurn) {
        const valueCardsInHand = aiPlayer.hand.filter(c => c.type === 'value');
        if (valueCardsInHand.length >= 2) {
            valueCardsInHand.sort((a, b) => a.value - b.value);
            const myHighestPosition = Math.max(...myTeamIds.map(id => state.gameState.players[id].position));
            const opponentHighestPosition = opponentIds.length > 0 ? Math.max(...opponentIds.map(id => state.gameState.players[id].position)) : 0;
            let cardToPlay = (opponentHighestPosition - myHighestPosition >= 3) ? valueCardsInHand[0] : valueCardsInHand[valueCardsInHand.length - 1];
            actions.push({ action: 'play', cardId: cardToPlay.id, card: cardToPlay });
        }
    }

    const availableEffectCards = aiPlayer.hand.filter(c => c.type === 'effect');
    if (availableEffectCards.length > 0) {
        if (!(state.gameState.tutorial?.isActive && state.gameState.turn < 3)) {
            const getOpponentsByPosition = () => opponentIds.map(id => state.gameState.players[id]).sort((a, b) => b.position - a.position);
            const buffScoreEffect = isInverted ? 'Menos' : 'Mais';
            const debuffScoreEffect = isInverted ? 'Mais' : 'Menos';
            const buffMoveEffect = isInverted ? 'Desce' : 'Sobe';
            const debuffMoveEffect = isInverted ? 'Sobe' : 'Desce';
            const harmTargets = getOpponentsByPosition();
            let leaderTarget = harmTargets.length > 0 ? harmTargets[0] : null;

            for (const card of availableEffectCards) {
                let targetId = undefined, effectTypeTarget = undefined;
                switch (card.name) {
                    case 'Mais': case 'Menos':
                        if (necroXActionPushed) break;
                        if (card.name === buffScoreEffect) {
                            const buffTarget = myTeamIds.map(id => state.gameState.players[id]).filter(p => p.effects.score !== buffScoreEffect).sort((a, b) => a.liveScore - b.liveScore)[0];
                            if (buffTarget) targetId = buffTarget.id;
                        } else if (card.name === debuffScoreEffect) {
                            if (leaderTarget && leaderTarget.effects.score !== debuffScoreEffect) targetId = leaderTarget.id;
                        }
                        break;
                    case 'Sobe': case 'Desce':
                        if (card.name === buffMoveEffect) {
                            const buffTarget = myTeamIds.map(id => state.gameState.players[id]).filter(p => p.effects.movement !== buffMoveEffect).sort((a, b) => a.liveScore - b.liveScore)[0];
                            if (buffTarget) targetId = buffTarget.id;
                        } else if (card.name === debuffMoveEffect) {
                            if (leaderTarget && leaderTarget.effects.movement !== debuffMoveEffect) targetId = leaderTarget.id;
                        }
                        break;
                    case 'Pula':
                        if (leaderTarget) {
                            const occupiedPathIds = state.gameState.playerIdsInGame.map(id => state.gameState.players[id].pathId);
                            const unoccupiedPaths = state.gameState.boardPaths.filter(p => !occupiedPathIds.includes(p.id));
                            if (unoccupiedPaths.length > 0) {
                                targetId = leaderTarget.id;
                                pulaPathChoice = unoccupiedPaths.sort((a, b) => b.spaces.filter(s => s.color === 'red' && !s.isUsed).length - a.spaces.filter(s => s.color === 'red' && !s.isUsed).length)[0].id;
                            }
                        }
                        break;
                    case 'Reversus':
                        const memberToHelp = myTeamIds.map(id => state.gameState.players[id]).find(p => p.effects.score === debuffScoreEffect || p.effects.movement === debuffMoveEffect);
                        if (memberToHelp) {
                            targetId = memberToHelp.id;
                            effectTypeTarget = memberToHelp.effects.score === debuffScoreEffect ? 'score' : 'movement';
                        } else {
                            const opponentToHarm = opponentIds.map(id => state.gameState.players[id]).find(p => p.effects.score === buffScoreEffect || p.effects.movement === buffMoveEffect);
                            if (opponentToHarm) {
                                targetId = opponentToHarm.id;
                                effectTypeTarget = opponentToHarm.effects.score === buffScoreEffect ? 'score' : 'movement';
                            }
                        }
                        break;
                    case 'Reversus Total':
                        let scoreChange = 0;
                        Object.values(state.gameState.players).forEach(p => {
                            let change = 0;
                            if (p.effects.score === debuffScoreEffect || p.effects.movement === debuffMoveEffect) change = 1;
                            if (p.effects.score === buffScoreEffect || p.effects.movement === buffMoveEffect) change = -1;
                            scoreChange += myTeamIds.includes(p.id) ? change : -change;
                        });
                        if (scoreChange > 0) targetId = aiPlayer.id;
                        break;
                }
                if (targetId && !actions.some(a => a.card && a.card.type === 'effect')) {
                    actions.push({ action: 'play', cardId: card.id, card, target: targetId, effectTypeTarget });
                }
            }
        }
    }
    return { actions, pulaPathChoice };
};

const triggerNecroXAbility = async (caster) => {
    state.gameState.necroXUsedThisRound = true;
    updateLog(`${caster.name}: "Conheça minha carta... com ela sou invencível"`);
    animateNecroX();
    await new Promise(res => setTimeout(res, 1000));

    const necroXCard = { id: Date.now() + Math.random(), type: 'effect', name: 'NECRO X', casterId: caster.id };
    const scoreEffectCategory = ['Mais', 'Menos', 'NECRO X', 'NECRO X Invertido'];
    const oldScoreCardIndex = caster.playedCards.effect.findIndex(c => scoreEffectCategory.includes(c.name));
    if (oldScoreCardIndex > -1) {
        const [oldCard] = caster.playedCards.effect.splice(oldScoreCardIndex, 1);
        state.gameState.decks.effect.push(oldCard);
    }

    caster.playedCards.effect.push(necroXCard);
    applyEffect(necroXCard, caster.id, caster.name);
    renderAll();
};

export const executeAiTurn = async (aiPlayer) => {
    if (aiPlayer.isEliminated) {
        advanceToNextPlayer();
        return;
    }
    updateLog(`${aiPlayer.name} está pensando...`);
    state.gameState.gamePhase = 'paused';
    renderAll();
    await new Promise(res => setTimeout(res, 1000));

    const decision = getAiTurnDecision(aiPlayer);

    const mustPlayValueCard = aiPlayer.hand.filter(c => c.type === 'value').length >= 2 && !aiPlayer.playedValueCardThisTurn;
    if (mustPlayValueCard && !decision.actions.some(a => a.card?.type === 'value')) {
        console.error(`${aiPlayer.name} failed to make a mandatory value card play. Forcing one.`);
        const valueCardToPlay = aiPlayer.hand.filter(c => c.type === 'value').sort((a, b) => a.value - b.value)[0];
        if (valueCardToPlay) {
            decision.actions.unshift({ action: 'play', cardId: valueCardToPlay.id, card: valueCardToPlay });
        } else {
            advanceToNextPlayer();
            return;
        }
    }

    if (decision.actions.length === 0) {
        advanceToNextPlayer();
        return;
    }

    for (const action of decision.actions) {
        await new Promise(res => setTimeout(res, 1200));

        if (action.action === 'use_reversum_ability') {
            updateLog("Rei Reversum usa sua habilidade: REVERSUS TOTAL!");
            state.gameState.reversumAbilityUsedThisRound = true;
            applyEffect({ name: 'Reversus Total' }, aiPlayer.id, aiPlayer.name);
        } else if (action.action === 'use_necrox_ability') {
            await triggerNecroXAbility(aiPlayer);
        } else if (action.action === 'play') {
            const cardInHand = aiPlayer.hand.find(c => c.id === action.cardId);
            if (cardInHand) {
                if (cardInHand.name === 'Pula' && decision.pulaPathChoice !== undefined) {
                    const targetPlayer = state.gameState.players[action.target];
                    targetPlayer.targetPathForPula = decision.pulaPathChoice;
                    updateLog(`${aiPlayer.name} escolheu que ${targetPlayer.name} pule para o caminho ${decision.pulaPathChoice + 1}.`);
                }
                 if (cardInHand.name === 'Pula' && aiPlayer.targetPathForPula !== null) {
                    // This logic is for AI moving itself with Pula (e.g. Necro Final chase)
                    updateLog(`${aiPlayer.name} usa Pula para se mover para o caminho ${aiPlayer.targetPathForPula + 1}.`);
                    aiPlayer.targetPathForPula = null; // consume it
                }
                await playCard(aiPlayer, cardInHand, action.target, action.effectTypeTarget);
            } else {
                updateLog(`(AI tentou jogar uma carta que não está na mão: ${action.card?.name})`);
            }
        }
    }

    await new Promise(res => setTimeout(res, 1000));
    advanceToNextPlayer();
};


const calculateScore = (player) => {
    let score = player.playedCards.value.reduce((sum, card) => sum + (card.value || 0), 0);
    const cardEffect = player.effects.score;
    const fieldEffects = state.gameState.activeFieldEffects.filter(fe => fe.appliesTo === player.id);

    let restoValue = player.resto?.value || 0;
    if (fieldEffects.some(fe => fe.name === 'Resto Maior')) {
        restoValue = 10;
        if (state.gameState.gamePhase === 'resolution') updateLog(`Efeito 'Resto Maior' ativado para ${player.name}.`);
    }
    if (fieldEffects.some(fe => fe.name === 'Resto Menor')) {
        restoValue = 2;
        if (state.gameState.gamePhase === 'resolution') updateLog(`Efeito 'Resto Menor' ativado para ${player.name}. Resto é 2.`);
    }

    if (cardEffect === 'Mais') score += restoValue;
    if (cardEffect === 'Menos') score -= restoValue;

    if (cardEffect === 'Menos' && fieldEffects.some(fe => fe.name === 'Super Exposto')) {
        score -= restoValue;
        if (state.gameState.gamePhase === 'resolution') updateLog(`Efeito 'Super Exposto' dobra o 'Menos' para ${player.name}.`);
    }

    const isNecroXInvertedByTotal = state.gameState.reversusTotalActive;
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

const updateLiveScoresAndWinningStatus = () => {
    const playerIds = state.gameState.playerIdsInGame;
    playerIds.forEach(id => {
        const player = state.gameState.players[id];
        if (player.isEliminated) {
            player.liveScore = 0;
            player.isWinning = false;
            return;
        }
        player.liveScore = calculateScore(player);
        player.isWinning = false;
    });

    const teamScoresEl = document.getElementById('team-scores-container');
    if (!teamScoresEl) return;
    teamScoresEl.classList.add('hidden');

    if (state.gameState.storyBattleType === '1v3_necro') {
        const p1Score = state.gameState.players['player-1'].liveScore;
        const necroScore = state.gameState.players['player-2'].liveScore + state.gameState.players['player-3'].liveScore + state.gameState.players['player-4'].liveScore;
        if (p1Score > necroScore) state.gameState.players['player-1'].isWinning = true;
        else if (necroScore > p1Score) {
            state.gameState.players['player-2'].isWinning = true;
            state.gameState.players['player-3'].isWinning = true;
            state.gameState.players['player-4'].isWinning = true;
        }
        teamScoresEl.innerHTML = `
            <div class="team-score team-a"><span>Você: <strong>${p1Score}</strong></span></div>
            <div class="team-score team-b"><span>Necroverso: <strong>${necroScore}</strong></span></div>`;
        teamScoresEl.classList.remove('hidden');
        return;
    } else if (state.gameState.storyBattleType === '2v2_necro_versatrix' || state.gameState.isNecroFinalBattle) {
        const teamPlayerScore = (state.gameState.players['player-1']?.liveScore || 0) + (state.gameState.players['player-4']?.liveScore || 0);
        const teamNecroScore = (state.gameState.players['player-2']?.liveScore || 0) + (state.gameState.players['player-3']?.liveScore || 0);
        
        if (teamPlayerScore > teamNecroScore) {
            if(state.gameState.players['player-1']) state.gameState.players['player-1'].isWinning = true;
            if(state.gameState.players['player-4']) state.gameState.players['player-4'].isWinning = true;
        } else if (teamNecroScore > teamPlayerScore) {
            if(state.gameState.players['player-2']) state.gameState.players['player-2'].isWinning = true;
            if(state.gameState.players['player-3']) state.gameState.players['player-3'].isWinning = true;
        }

        const teamPlayerName = "Você & Versatrix";
        const teamNecroName = "Necroverso Final";
        
        teamScoresEl.innerHTML = `
            <div class="team-score team-a"><span>${teamPlayerName}: <strong>${teamPlayerScore}</strong></span></div>
            <div class="team-score team-b"><span>${teamNecroName}: <strong>${teamNecroScore}</strong></span></div>`;
        teamScoresEl.classList.remove('hidden');
        return;
    }

    if (state.gameState.gameMode === 'solo') {
        const scores = playerIds.map(id => state.gameState.players[id].liveScore);
        const maxScore = Math.max(...scores);
        if (scores.every(s => s === maxScore) || scores.filter(s => s === maxScore).length > 1) {
            playerIds.forEach(id => state.gameState.players[id].isWinning = false);
        } else {
            playerIds.forEach(id => { if (state.gameState.players[id].liveScore === maxScore) state.gameState.players[id].isWinning = true; });
        }
    } else { // Duo
        const teamAIds = config.TEAM_A.filter(id => state.gameState.playerIdsInGame.includes(id));
        const teamBIds = config.TEAM_B.filter(id => state.gameState.playerIdsInGame.includes(id));
        const teamAScore = teamAIds.reduce((sum, id) => sum + (state.gameState.players[id]?.liveScore || 0), 0);
        const teamBScore = teamBIds.reduce((sum, id) => sum + (state.gameState.players[id]?.liveScore || 0), 0);

        if (teamAScore > teamBScore) teamAIds.forEach(id => { if (state.gameState.players[id]) state.gameState.players[id].isWinning = true; });
        else if (teamBScore > teamAScore) teamBIds.forEach(id => { if (state.gameState.players[id]) state.gameState.players[id].isWinning = true; });

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

const showRoundSummaryModal = (winners, scores) => {
    return new Promise(resolve => {
        state.gameState.gamePhase = 'round_summary';
        updateTurnIndicator();
        const playerIds = state.gameState.playerIdsInGame;

        dom.roundSummaryTitle.textContent = `Fim da Rodada ${state.gameState.turn}`;

        if (winners.length === 0 || winners.length === playerIds.length) {
            dom.roundSummaryWinnerText.textContent = 'A rodada terminou em empate!';
        } else {
            const winnerNames = winners.map(id => state.gameState.players[id].name).join(' e ');
            dom.roundSummaryWinnerText.textContent = `Vencedor(es): ${winnerNames}`;
        }

        let finalScores = { ...scores };
        const versatrix = Object.values(state.gameState.players).find(p => p.aiType === 'versatrix');
        if (state.gameState.versatrixSwapActive && versatrix) {
            dom.roundSummaryWinnerText.textContent += " (Resultados Trocados!)";
            [finalScores['player-1'], finalScores[versatrix.id]] = [finalScores[versatrix.id], finalScores['player-1']];
        }

        dom.roundSummaryScoresEl.innerHTML = playerIds.map(id => {
            const player = state.gameState.players[id];
            if (player.isEliminated) return '';
            const isWinner = winners.includes(id);
            const playerColor = player.isHuman ? 'var(--player-1-color)' : (player.aiType === 'necroverso' || player.aiType === 'necroverso-final' ? '#eee' : player.color);
            return `
                <div class="summary-player-score ${isWinner ? 'is-winner' : ''}">
                    <div class="summary-player-name" style="color: ${playerColor};">${player.name}</div>
                    <div class="summary-player-final-score">${finalScores[id]}</div>
                </div>
            `;
        }).join('');
        dom.roundSummaryScoresEl.style.gridTemplateColumns = playerIds.length > 2 ? '1fr 1fr' : '1fr';

        dom.roundSummaryModal.classList.remove('hidden');

        dom.nextRoundButton.onclick = () => {
            dom.roundSummaryModal.classList.add('hidden');
            resolve();
        };
    });
};

const applyFieldEffectLogic = async (effect, player) => {
    if (effect.name === 'Jogo Aberto') {
         const playersToAffect = state.gameState.gameMode === 'duo'
            ? (config.TEAM_A.includes(player.id) ? config.TEAM_A : config.TEAM_B)
            : [player.id];
            
        if (effect.type === 'positive') { // Opponents revealed
            const opponentTeam = state.gameState.gameMode === 'duo' 
                ? (config.TEAM_A.includes(player.id) ? config.TEAM_B : config.TEAM_A)
                : state.gameState.playerIdsInGame.filter(id => id !== player.id);
            state.gameState.revealedHands.push(...opponentTeam);
        } else { // Self/Team revealed
            state.gameState.revealedHands.push(...playersToAffect);
        }
    } else if (effect.name === 'Reversus Total') {
        applyEffect({ name: 'Reversus Total' }, player.id, 'Campo');
    } else if (effect.name === 'Carta Menor' || effect.name === 'Carta Maior') {
        const isMinor = effect.name === 'Carta Menor';
        const playersToAffect = state.gameState.gameMode === 'duo'
            ? (config.TEAM_A.includes(player.id) ? config.TEAM_A : config.TEAM_B)
            : [player.id];
        
        playersToAffect.forEach(pId => {
            const p = state.gameState.players[pId];
            if (!p) return;
            const valueCards = p.hand.filter(c => c.type === 'value').sort((a,b) => a.value - b.value);
            if (valueCards.length > 0) {
                const cardToDiscard = isMinor ? valueCards[0] : valueCards[valueCards.length - 1];
                p.hand = p.hand.filter(c => c.id !== cardToDiscard.id);
                state.gameState.decks.value.push(cardToDiscard);
                if (state.gameState.decks.value.length > 0) {
                     p.hand.push(state.gameState.decks.value.pop());
                }
                updateLog(`${p.name} descartou ${cardToDiscard.name} e sacou uma nova carta.`);
            }
        });
    } else if (effect.name === 'Troca Justa' || effect.name === 'Troca Injusta') {
        state.gameState.gamePhase = 'field_effect_targeting';
        updateTurnIndicator();
        dom.targetModalCardName.textContent = effect.name;
        dom.targetPlayerButtonsEl.innerHTML = state.gameState.playerIdsInGame
            .filter(id => id !== player.id)
            .map(id => `<button class="control-button target-${id.split('-')[1]}" data-target-id="${id}">${state.gameState.players[id].name}</button>`).join('');
        dom.targetModal.classList.remove('hidden');
        
        const targetId = await new Promise(resolve => {
            fieldEffectTargetResolver = resolve;
        });
        
        dom.targetModal.classList.add('hidden');
        
        const p1 = player;
        const p2 = state.gameState.players[targetId];
        const p1ValueCards = p1.hand.filter(c => c.type === 'value').sort((a, b) => a.value - b.value);
        const p2ValueCards = p2.hand.filter(c => c.type === 'value').sort((a, b) => a.value - b.value);
        
        if (p1ValueCards.length > 0 && p2ValueCards.length > 0) {
            const cardFromP1 = effect.name === 'Troca Justa' ? p1ValueCards[0] : p1ValueCards[p1ValueCards.length - 1];
            const cardFromP2 = effect.name === 'Troca Justa' ? p2ValueCards[p2ValueCards.length - 1] : p2ValueCards[0];
            
            p1.hand = p1.hand.filter(c => c.id !== cardFromP1.id);
            p2.hand = p2.hand.filter(c => c.id !== cardFromP2.id);
            p1.hand.push(cardFromP2);
            p2.hand.push(cardFromP1);
            
            updateLog(`${p1.name} trocou ${cardFromP1.name} por ${cardFromP2.name} de ${p2.name}.`);
        }
    } else if (effect.name === 'Total Revesus Nada!') {
        const playersToAffect = state.gameState.gameMode === 'duo' 
            ? (config.TEAM_A.includes(player.id) ? config.TEAM_A : config.TEAM_B)
            : [player.id];
            
        if (playersToAffect.length === 1) { // Solo mode
            const p = state.gameState.players[playersToAffect[0]];
            const effectCards = p.hand.filter(c => c.type === 'effect');
            p.hand = p.hand.filter(c => c.type !== 'effect');
            state.gameState.decks.effect.push(...effectCards);
            updateLog(`${p.name} descartou todas as ${effectCards.length} cartas de efeito.`);
        } else { // Duo mode
            const [p1, p2] = playersToAffect.map(id => state.gameState.players[id]);
            // Player who landed on space
            let p1EffectCards = p1.hand.filter(c => c.type === 'effect');
            if(p1EffectCards.length > 0) {
                const cardToDiscard = shuffle(p1EffectCards)[0];
                p1.hand = p1.hand.filter(c => c.id !== cardToDiscard.id);
                state.gameState.decks.effect.push(cardToDiscard);
                updateLog(`${p1.name} descartou 1 carta de efeito aleatória.`);
            }
            // Partner
             let p2EffectCards = p2.hand.filter(c => c.type === 'effect');
             if(p2EffectCards.length > 1) {
                const cardsToDiscard = shuffle(p2EffectCards).slice(0, p2EffectCards.length - 1);
                p2.hand = p2.hand.filter(c => !cardsToDiscard.find(dc => dc.id === c.id));
                state.gameState.decks.effect.push(...cardsToDiscard);
                updateLog(`${p2.name} descartou ${cardsToDiscard.length} cartas para ficar com 1.`);
             }
        }
    }
}

const resolveFieldEffectsAfterMovement = async (playerIds) => {
    for (const id of playerIds) {
        const player = state.gameState.players[id];
        if (!player || player.isEliminated || player.position >= 10 || player.pathId === null) continue;

        const space = state.gameState.boardPaths[player.pathId].spaces.find(s => s.id === player.position);

        if (space && !space.isUsed && (space.color === 'blue' || space.color === 'red')) {
            space.isUsed = true;
            state.gameState.gamePhase = 'field_effect';
            updateTurnIndicator();

            const isPositive = space.color === 'blue';
            const effectName = space.effectName;
            const effectDescription = isPositive ? config.POSITIVE_EFFECTS[effectName] : config.NEGATIVE_EFFECTS[effectName];
            const effect = { name: effectName, description: effectDescription, type: isPositive ? 'positive' : 'negative', appliesTo: player.id };
            state.gameState.activeFieldEffects.push(effect);
            
            updateLog(`${player.name} caiu na casa ${space.color} e ativou: ${effectName}!`);
            
            dom.fieldEffectTitle.textContent = `Efeito de Campo: ${player.name}`;
            dom.fieldEffectCardEl.className = `field-effect-card ${effect.type}`;
            dom.fieldEffectNameEl.textContent = effectName;
            dom.fieldEffectDescriptionEl.textContent = effectDescription;
            dom.fieldEffectModal.classList.remove('hidden');
            
            await new Promise(resolve => { fieldEffectContinueResolver = resolve; });
            
            dom.fieldEffectModal.classList.add('hidden');
            
            await applyFieldEffectLogic(effect, player);

            renderAll();
        }
    }
};

const resolveRound = async () => {
    state.gameState.gamePhase = 'resolution';
    updateTurnIndicator();
    const playerIds = state.gameState.playerIdsInGame;
    const activePlayerIds = playerIds.filter(id => !state.gameState.players[id].isEliminated);

    // --- 1. CALCULATE RESULTS ---
    state.gameState.versatrixSwapActive = false;
    const versatrix = Object.values(state.gameState.players).find(p => p.aiType === 'versatrix');
    const player1 = state.gameState.players['player-1'];
    if (versatrix && player1 && state.gameState.turn >= 2) {
        const versatrixScore = calculateScore(versatrix);
        const playerScore = calculateScore(player1);
        if (versatrixScore < playerScore && [6, 7, 8, 9].includes(player1.position)) {
            state.gameState.versatrixSwapActive = true;
            updateLog("Versatrix usa sua habilidade: CAMPO VERSÁTIL!");
            announceEffect('CAMPO VERSÁTIL!', 'reversus', 2500);
            await new Promise(res => setTimeout(res, 2500));
        }
    }

    const scores = {};
    playerIds.forEach(id => scores[id] = calculateScore(state.gameState.players[id]));
    updateLog(`Fim da Rodada: Pontuações - ${playerIds.map(id => `${state.gameState.players[id].name}: ${scores[id]}`).join(', ')}.`);

    if (state.gameState.versatrixSwapActive && versatrix) {
        [scores['player-1'], scores[versatrix.id]] = [scores[versatrix.id], scores['player-1']];
        updateLog(`CAMPO VERSÁTIL trocou as pontuações entre Você e ${versatrix.name}!`);
    }

    const movements = Object.fromEntries(playerIds.map(id => [id, 0]));
    const winners = [];
    const losers = [];

    if (state.gameState.storyBattleType === '1v3_necro') {
        const p1Score = scores['player-1'];
        const necroScore = scores['player-2'] + scores['player-3'] + scores['player-4'];
        updateLog(`Pontuação da Rodada - Você: ${p1Score}, Necroverso (Total): ${necroScore}.`);
        if (p1Score > necroScore) { winners.push('player-1'); losers.push('player-2', 'player-3', 'player-4'); } 
        else if (necroScore > p1Score) { winners.push('player-2', 'player-3', 'player-4'); losers.push('player-1'); }
    } else if (state.gameState.storyBattleType === '2v2_necro_versatrix' || state.gameState.isNecroFinalBattle) {
        const teamPlayerScore = (scores['player-1'] || 0) + (scores['player-4'] || 0);
        const teamNecroScore = (scores['player-2'] || 0) + (scores['player-3'] || 0);
        updateLog(`Pontuação da Rodada - Sua Equipe: ${teamPlayerScore}, Equipe Necroverso: ${teamNecroScore}.`);
        if (teamPlayerScore > teamNecroScore) {
            winners.push(...['player-1', 'player-4'].filter(id => activePlayerIds.includes(id)));
            losers.push(...['player-2', 'player-3'].filter(id => activePlayerIds.includes(id)));
        } else if (teamNecroScore > teamPlayerScore) {
            winners.push(...['player-2', 'player-3'].filter(id => activePlayerIds.includes(id)));
            losers.push(...['player-1', 'player-4'].filter(id => activePlayerIds.includes(id)));
        }
    } else if (state.gameState.gameMode === 'solo') {
        const maxScore = Math.max(...activePlayerIds.map(id => scores[id]));
        const soloWinners = activePlayerIds.filter(id => scores[id] === maxScore);
        if (soloWinners.length < activePlayerIds.length) winners.push(...soloWinners);
        activePlayerIds.forEach(id => { if (!winners.includes(id)) losers.push(id); });
    } else { // Duo
        const teamAIds = config.TEAM_A.filter(id => activePlayerIds.includes(id));
        const teamBIds = config.TEAM_B.filter(id => activePlayerIds.includes(id));
        const teamAScore = teamAIds.reduce((sum, id) => sum + (scores[id] || 0), 0);
        const teamBScore = teamBIds.reduce((sum, id) => sum + (scores[id] || 0), 0);
        updateLog(`Pontuação Equipes - Azul/Verde: ${teamAScore}, Vermelho/Amarelo: ${teamBScore}.`);
        if (teamAScore > teamBScore) { winners.push(...teamAIds); losers.push(...teamBIds); }
        else if (teamBScore > teamAScore) { winners.push(...teamBIds); losers.push(...teamAIds); }
    }
    
    winners.forEach(id => {
        const fieldEffects = state.gameState.activeFieldEffects.filter(fe => fe.appliesTo === id);
        if (fieldEffects.some(fe => fe.name === 'Parada')) updateLog(`${state.gameState.players[id].name} venceu, mas o efeito 'Parada' impede o avanço.`);
        else if (fieldEffects.some(fe => fe.name === 'Desafio')) {
            const playedPositiveEffect = state.gameState.players[id].playedCards.effect.some(c => ['Mais', 'Sobe'].includes(c.name));
            if (!playedPositiveEffect) { movements[id] += 3; updateLog(`${state.gameState.players[id].name} completou o 'Desafio' e avança 3 casas!`); } 
            else { movements[id] += 1; updateLog(`${state.gameState.players[id].name} venceu mas falhou no 'Desafio', avança 1 casa.`); }
        } else movements[id] += 1;
    });
    if (winners.length > 0) updateLog(`Vencedor(es) da rodada: ${winners.map(id => state.gameState.players[id].name).join(', ')}.`);
    else updateLog("Empate na rodada! Ninguém ganha bônus.");

    losers.forEach(id => {
        const fieldEffects = state.gameState.activeFieldEffects.filter(fe => fe.appliesTo === id);
        if (fieldEffects.some(fe => fe.name === 'Impulso')) { movements[id] += 1; updateLog(`${state.gameState.players[id].name} perdeu, mas o 'Impulso' o avança 1 casa.`); } 
        else if (fieldEffects.some(fe => fe.name === 'Castigo')) { movements[id] -= 3; updateLog(`${state.gameState.players[id].name} perdeu e sofre o 'Castigo', voltando 3 casas.`); }
    });

    activePlayerIds.forEach(id => {
        const player = state.gameState.players[id];
        if (player.effects.movement === 'Sobe' || player.effects.movement === 'Desce') {
            let moveChange = player.effects.movement === 'Sobe' ? 1 : -1;
            if (player.effects.movement === 'Desce' && state.gameState.activeFieldEffects.some(fe => fe.name === 'Super Exposto' && fe.appliesTo === id)) {
                moveChange *= 2; updateLog(`Efeito 'Super Exposto' dobra o 'Desce' para ${player.name}.`);
            }
            updateLog(`${player.name} aplica o efeito '${player.effects.movement}' (${moveChange > 0 ? '+' : ''}${moveChange} movimento).`);
            movements[id] += moveChange;
        }
    });

    if (state.gameState.versatrixSwapActive && versatrix) {
        [movements['player-1'], movements[versatrix.id]] = [movements[versatrix.id], movements['player-1']];
        updateLog(`CAMPO VERSÁTIL trocou os movimentos entre Você e ${versatrix.name}!`);
    }

    // --- 2. SHOW SUMMARY ---
    await showRoundSummaryModal(winners, scores);

    // --- 3. START NEW ROUND (DEAL CARDS) ---
    const nextPlayerId = startNewRound(false, winners);

    // --- 4. APPLY MOVEMENT AND FIELD EFFECTS ---
    activePlayerIds.forEach(id => {
        const player = state.gameState.players[id];
        if (player.effects.movement === 'Pula' && player.targetPathForPula !== null && player.targetPathForPula !== undefined) {
            const oldPath = state.gameState.boardPaths.find(p => p.playerId === id);
            if (oldPath) oldPath.playerId = null;
            player.pathId = player.targetPathForPula;
            state.gameState.boardPaths[player.pathId].playerId = id;
            updateLog(`${player.name} pulou para o caminho ${player.pathId + 1}.`);
        }
        
        const oldPos = player.position;
        const moveDirection = state.gameState.isInvertedLogic ? -1 : 1;
        player.position += (movements[id] * moveDirection);
        player.position = Math.max(1, Math.min(10, player.position));
        if (player.position !== oldPos) updateLog(`${player.name} moveu de ${oldPos} para ${player.position}.`);
    });

    renderBoard();
    await new Promise(res => setTimeout(res, 500));
    
    await resolveFieldEffectsAfterMovement(activePlayerIds);

    for (const id of activePlayerIds) {
        const player = state.gameState.players[id];
        if (player.isEliminated || player.position >= 10 || player.pathId === null) continue;
        const spaceLandedOn = state.gameState.boardPaths[player.pathId].spaces.find(s => s.id === player.position);

        if (state.gameState.currentStoryBattle === 'versatrix' && spaceLandedOn?.color === 'yellow' && !spaceLandedOn.isUsed) {
            state.gameState.gamePhase = 'field_effect';
            updateTurnIndicator();
            dom.fieldEffectTitle.textContent = "Casa Amarela!";
            dom.fieldEffectCardEl.className = 'field-effect-card yellow';
            dom.fieldEffectNameEl.textContent = 'Casa de Versatrix';
            dom.fieldEffectDescriptionEl.textContent = 'Se cair aqui volte uma casa imediatamente, se for a Versatrix avance uma casa imediatamente.';
            dom.fieldEffectModal.classList.remove('hidden');
            await new Promise(resolve => { fieldEffectContinueResolver = resolve; });
            dom.fieldEffectModal.classList.add('hidden');
            
            if (player.id === 'player-1') {
                player.position = Math.max(1, player.position - 1);
                updateLog('Você caiu em uma casa amarela e recuou 1 casa!');
            } else if (player.aiType === 'versatrix') {
                player.position = Math.min(config.WINNING_POSITION, player.position + 1);
                updateLog('Versatrix caiu em uma casa amarela e avançou 1 casa!');
            }
            spaceLandedOn.isUsed = true;
        }
        
        if (state.gameState.isNecroFinalBattle && spaceLandedOn?.color === 'black' && !spaceLandedOn.isUsed) {
            spaceLandedOn.isUsed = true;
            if (player.id === 'player-1') { showStoryGameOver("Você caiu em uma casa preta... O Inversus te consumiu.", "Game Over"); return; } 
            else if (player.aiType === 'versatrix') {
                player.isEliminated = true;
                updateLog("Versatrix caiu em uma casa preta e foi eliminada do jogo!");
                dom.versatrixEliminatedDialogue.classList.remove('hidden');
            } else if (player.aiType === 'necroverso-final') {
                state.gameState.necroHearts--;
                updateLog("Necroverso Final caiu em uma casa preta e perdeu um coração!");
                sound.playCustomSound('error.ogg');
                if (state.gameState.necroHearts <= 0) { endGameCheck(); return; }
            }
        }
    }
    
    if (state.gameState.isNecroFinalBattle) {
        const p1 = state.gameState.players['player-1'], v = state.gameState.players['player-4'];
        const n1 = state.gameState.players['player-2'], n2 = state.gameState.players['player-3'];
        if (p1 && !p1.isEliminated && p1.position !== 10 && ((n1 && !n1.isEliminated && p1.pathId === n1.pathId && p1.position === n1.position) || (n2 && !n2.isEliminated && p1.pathId === n2.pathId && p1.position === n2.position))) {
            showStoryGameOver("Necroverso Final te alcançou... Fim de jogo.", "Game Over"); return;
        }
        if (v && !v.isEliminated && v.position !== 10 && ((n1 && !n1.isEliminated && v.pathId === n1.pathId && v.position === n1.position) || (n2 && !n2.isEliminated && v.pathId === n2.pathId && v.position === n2.position))) {
            v.isEliminated = true;
            updateLog("Necroverso Final eliminou Versatrix do jogo!");
            sound.playCustomSound('error.ogg');
            dom.versatrixEliminatedDialogue.classList.remove('hidden');
        }
        if (n1 && !n1.isEliminated && n2 && !n2.isEliminated && n1.pathId === n2.pathId && n1.position === n2.position && n1.position !== 10) {
            if (state.gameState.necroHearts > 0) {
                state.gameState.necroHearts--;
                updateLog("Os Necroversos colidiram e perderam um coração!");
                sound.playCustomSound('error.ogg');
                if (state.gameState.necroHearts <= 0) { endGameCheck(); return; }
            }
        }
    }

    // --- 5. CHECK FOR GAME OVER ---
    if (endGameCheck()) return;

    // --- 6. START NEXT TURN ---
    state.gameState.currentPlayer = nextPlayerId;
    const nextPlayer = state.gameState.players[nextPlayerId];
    state.gameState.gamePhase = 'playing';
    updateLog(`--- Começando Rodada ${state.gameState.turn} (Vez de ${nextPlayer.name}) ---`);
    state.setRoundStartSnapshot(structuredClone(state.gameState));
    renderAll();
    if (nextPlayer.isHuman) showTurnIndicator();
    else executeAiTurn(nextPlayer);
};


const advanceToNextPlayer = () => {
    const player = state.gameState.players[state.gameState.currentPlayer];
    player.playedValueCardThisTurn = false;
    const playerIds = state.gameState.playerIdsInGame;
    const activePlayerIds = playerIds.filter(id => !state.gameState.players[id].isEliminated);

    if (!state.gameState.playedAnyCardThisTurn) {
        state.gameState.consecutivePasses++;
        updateLog(`${player.name} passou o turno.`);
    } else {
        state.gameState.consecutivePasses = 0;
    }

    if (state.gameState.consecutivePasses >= activePlayerIds.length) {
        updateLog("Todos os jogadores passaram consecutivamente. Fim da rodada.");
        resolveRound();
        return;
    }

    const currentIndex = activePlayerIds.indexOf(state.gameState.currentPlayer);
    let nextIndex = (currentIndex + 1) % activePlayerIds.length;
    state.gameState.currentPlayer = activePlayerIds[nextIndex];

    const nextPlayer = state.gameState.players[state.gameState.currentPlayer];
    state.gameState.selectedCard = null;
    state.gameState.playedAnyCardThisTurn = false;

    updateLog(`--- Vez de ${nextPlayer.name} ---`);
    state.gameState.gamePhase = 'playing';

    if (nextPlayer.isHuman) {
        showTurnIndicator();
        renderAll();
    } else {
        executeAiTurn(nextPlayer);
    }
};

const startNewRound = (isFirstRound = false, roundWinners = []) => {
    if (!isFirstRound) state.gameState.turn++;
    const playerIds = state.gameState.playerIdsInGame;

    state.gameState.reversusTotalActive = false;
    dom.appContainerEl.classList.remove('reversus-total-active');
    dom.reversusTotalIndicatorEl.classList.add('hidden');
    toggleReversusTotalBackground(false);
    state.gameState.activeFieldEffects = [];
    state.gameState.revealedHands = [];
    state.gameState.consecutivePasses = 0;
    state.gameState.player1CardsObscured = false;
    state.gameState.reversumAbilityUsedThisRound = false;
    state.gameState.necroXUsedThisRound = false;
    state.gameState.elapsedSecondsAtRoundStart = state.gameStartTime ? Math.floor((Date.now() - state.gameStartTime) / 1000) : (state.gameState.elapsedSecondsAtRoundStart || 0);

    const cardsToReturnToDecks = { value: [], effect: [] };

    playerIds.forEach(id => {
        const p = state.gameState.players[id];
        if (p.isEliminated) return;

        if (p.resto && !isFirstRound) {
            cardsToReturnToDecks.value.push(p.resto);
        }
        if (p.nextResto) {
            p.resto = p.nextResto;
        }
        p.nextResto = null;

        cardsToReturnToDecks.value.push(...p.playedCards.value);
        cardsToReturnToDecks.effect.push(...p.playedCards.effect);
        p.playedCards = { value: [], effect: [] };

        p.effects = { score: null, movement: null };
        p.playedValueCardThisTurn = false;
        p.targetPathForPula = null;
    });
    
    state.gameState.decks.value.push(...cardsToReturnToDecks.value);
    state.gameState.decks.effect.push(...cardsToReturnToDecks.effect);

    state.gameState.decks.value = shuffle(state.gameState.decks.value);
    state.gameState.decks.effect = shuffle(state.gameState.decks.effect);

    playerIds.forEach(id => {
        const p = state.gameState.players[id];
        if (p.isEliminated) return;
        const valueCardsNeeded = config.MAX_VALUE_CARDS_IN_HAND - p.hand.filter(c => c.type === 'value').length;
        const effectCardsNeeded = config.MAX_EFFECT_CARDS_IN_HAND - p.hand.filter(c => c.type === 'effect').length;
        for (let i = 0; i < valueCardsNeeded; i++) if (state.gameState.decks.value.length > 0) p.hand.push(state.gameState.decks.value.pop());
        for (let i = 0; i < effectCardsNeeded; i++) if (state.gameState.decks.effect.length > 0) p.hand.push(state.gameState.decks.effect.pop());
    });

    if (isFirstRound) {
        const player = state.gameState.players[state.gameState.currentPlayer];
        state.gameState.gamePhase = 'playing';
        state.gameState.playedAnyCardThisTurn = false;
        updateLog(`--- Começando Rodada ${state.gameState.turn} (Vez de ${player.name}) ---`);

        state.setRoundStartSnapshot(structuredClone(state.gameState));

        renderAll();
        if (player.isHuman) showTurnIndicator();
        else executeAiTurn(player);
    } else {
        let nextPlayerId = state.gameState.currentPlayer;
        if (roundWinners.length > 0) {
            if (roundWinners.length === 1) {
                nextPlayerId = roundWinners[0];
            } else {
                const tiedPlayerRestos = roundWinners.map(id => ({ id, restoValue: state.gameState.players[id].resto?.value || 0 }));
                const maxResto = Math.max(...tiedPlayerRestos.map(p => p.restoValue));
                const winnersByResto = tiedPlayerRestos.filter(p => p.restoValue === maxResto);
                nextPlayerId = shuffle(winnersByResto.map(p => p.id))[0];
            }
        }
        updateLog(`Próximo a jogar: ${state.gameState.players[nextPlayerId].name}.`);
        return nextPlayerId;
    }
};

const showStoryGameOver = (message, title = "Fim de Jogo!") => {
    state.deleteSavedGame();
    state.gameState.gamePhase = 'game-over';
    state.unlockAchievement('first_loss');
    dom.gameOverTitle.textContent = title;
    dom.gameOverMessage.textContent = message;
    dom.restartButton.textContent = 'Voltar ao Menu';
    dom.restartButton.onclick = showSplashScreen;
    dom.gameOverModal.classList.remove('hidden');
    dom.playButton.disabled = true;
    dom.endTurnButton.disabled = true;
    state.setGameTimerInterval(null);
    updateTurnIndicator();
    story.endStory();
};

export const endGameCheck = () => {
    const elapsedSeconds = state.gameStartTime ? Math.floor((Date.now() - state.gameStartTime) / 1000) : Infinity;

    // Necro Final Battle Specific Win/Loss conditions
    if (state.gameState.isNecroFinalBattle) {
        if (state.gameState.necroHearts <= 0) {
            state.unlockAchievement('final_final');
            showStoryGameOver("Você derrotou o Necroverso Final e libertou o Inversus!", "VITÓRIA FINAL!");
            return true;
        }
        if (state.gameState.countdown <= 0) {
            showStoryGameOver("O tempo acabou. O Inversus te consumiu.", "Game Over");
            return true;
        }
        return false;
    }


    if (state.gameState.isStoryMode && !state.gameState.tutorial?.isActive) {
        if (state.gameState.tutorial?.isActive) { // Tutorial end condition
             const p1Won = state.gameState.players['player-1'].position >= config.WINNING_POSITION;
             const p2Won = state.gameState.players['player-2'].position >= config.WINNING_POSITION;
             if (!p1Won && !p2Won) return false;

            state.gameState.gamePhase = 'story';
            updateTurnIndicator();
            state.setGameTimerInterval(null);
            dom.appContainerEl.classList.add('hidden');
            dom.storyModeModalEl.classList.remove('hidden');
            dom.storySceneDialogueEl.classList.remove('hidden');
            state.unlockAchievement(p1Won ? 'first_win' : 'first_loss');
            story.renderStoryNode('tutorial_6_end_match');
            return true;
        }

        const getStoryWinner = () => {
            if (state.gameState.storyBattleType === '1v3_necro') {
                const playerReachedEnd = state.gameState.players['player-1'].position >= config.WINNING_POSITION;
                const necroReachedEnd = state.gameState.players['player-2'].position >= config.WINNING_POSITION || state.gameState.players['player-3'].position >= config.WINNING_POSITION || state.gameState.players['player-4'].position >= config.WINNING_POSITION;
                if (playerReachedEnd) return 'player';
                if (necroReachedEnd) return 'opponent';
                return null;
            } else {
                const p1Pos = state.gameState.players['player-1'].position;
                const opponentIds = state.gameState.playerIdsInGame.filter(id => id !== 'player-1');
                const opponentWon = opponentIds.some(id => state.gameState.players[id].position >= config.WINNING_POSITION);
                if (p1Pos >= config.WINNING_POSITION) return 'player';
                if (opponentWon) return 'opponent';
                return null;
            }
        };

        const winner = getStoryWinner();

        if (!winner) return false;

        const playerWon = winner === 'player';
        if(playerWon && elapsedSeconds < 300) state.unlockAchievement('speed_run');
        
        state.unlockAchievement(playerWon ? 'first_win' : 'first_loss');

        state.gameState.gamePhase = 'story';
        updateTurnIndicator();
        story.endStory();
        dom.storyModeModalEl.classList.remove('hidden');
        dom.storySceneDialogueEl.classList.remove('hidden');

        switch (state.gameState.currentStoryBattle) {
            case 'contravox':
                if (playerWon) { state.unlockAchievement('defeated_contravox'); story.renderStoryNode('post_contravox_victory'); }
                else showStoryGameOver('Contravox venceu. O Inversus te consumiu...');
                break;
            case 'versatrix':
                if (playerWon) { story.renderStoryNode('post_versatrix_victory'); } 
                else { story.storyState.lostToVersatrix = true; state.unlockAchievement('shes_into_you'); story.renderStoryNode('post_versatrix_defeat'); }
                break;
            case 'reversum':
                if (playerWon) { state.unlockAchievement('defeated_reversum'); story.renderStoryNode('post_reversum_victory');}
                else showStoryGameOver('Rei Reversum venceu. O Inversus te consumiu...');
                break;
             case 'necroverso_final_1v3':
                 if (playerWon) { state.unlockAchievement('not_true_ending'); showStoryGameOver("Você derrotou o Necroverso... mas este não é o fim verdadeiro.", "VITÓRIA?"); } 
                 else { showStoryGameOver('Necroverso venceu. O Inversus te consumiu...'); }
                 break;
        }
        return true;
    }

    // Standard game over check
    const winnerId = state.gameState.playerIdsInGame.find(id => {
        const player = state.gameState.players[id];
        const goal = state.gameState.isInvertedLogic ? 1 : config.WINNING_POSITION;
        return state.gameState.isInvertedLogic ? player.position <= goal : player.position >= goal;
    });

    if (winnerId) {
        state.deleteSavedGame();
        state.unlockAchievement('first_win');
        if(elapsedSeconds < 300) state.unlockAchievement('speed_run');

        const winnerPlayer = state.gameState.players[winnerId];
        dom.gameOverTitle.textContent = "Fim de Jogo!";
        dom.gameOverMessage.textContent = `O vencedor é ${winnerPlayer.name}!`;
        dom.restartButton.textContent = 'Jogar Novamente';
        dom.restartButton.onclick = () => initializeGame(state.gameState.gameMode, { numPlayers: state.gameState.playerIdsInGame.length });
        dom.gameOverModal.classList.remove('hidden');
        dom.playButton.disabled = true;
        dom.endTurnButton.disabled = true;
        state.setGameTimerInterval(null);
        state.gameState.gamePhase = 'game-over';
        updateTurnIndicator();
        return true;
    }
    return false;
};

// --- UI EVENT HANDLERS ---
export const handleAppContainerClick = (e) => {
    const cardEl = e.target.closest('.card');
    const fieldEffectIndicator = e.target.closest('.field-effect-indicator');
    const cardMaximizeButton = e.target.closest('.card-maximize-button');
    
    if (cardMaximizeButton) {
        e.stopPropagation();
        const cardContainer = cardMaximizeButton.closest('.card');
        if (cardContainer) {
            const cardId = parseFloat(cardContainer.dataset.cardId);
            const allCards = Object.values(state.gameState.players).flatMap(p => [...p.hand, ...Object.values(p.playedCards).flat()]);
            const card = allCards.find(c => c && c.id === cardId);
            if (card) {
                dom.cardViewerImageEl.src = getCardImageUrl(card, false);
                dom.cardViewerModalEl.classList.remove('hidden');
            }
        }
        return;
    }


    if (cardEl && cardEl.closest('.player-hand')) {
        handleCardClick(cardEl);
        return;
    }

    if (fieldEffectIndicator) {
        const playerId = fieldEffectIndicator.dataset.playerId;
        const effectInfo = state.gameState.activeFieldEffects.find(fe => fe.appliesTo === playerId);
        if (effectInfo) {
            dom.fieldEffectInfoName.textContent = effectInfo.name;
            dom.fieldEffectInfoDescription.textContent = effectInfo.description;
            dom.fieldEffectInfoModal.classList.remove('hidden');
        }
    }
};

export const handlePlayButton = async () => {
    const player = state.gameState.players['player-1'];
    const card = state.gameState.selectedCard;
    if (!player || !card) return;

    if (card.type === 'value') {
        const valueCardsInHandCount = player.hand.filter(c => c.type === 'value').length;
        if (valueCardsInHandCount <= 1 || player.playedValueCardThisTurn) return;
        await playCard(player, card, player.id);
    } else { // effect
        state.gameState.gamePhase = 'targeting';
        updateTurnIndicator();
        dom.targetModalCardName.textContent = card.name;
        switch (card.name) {
            case 'Pula':
                state.gameState.pulaTarget = { card };
                dom.targetPlayerButtonsEl.innerHTML = state.gameState.playerIdsInGame
                    .map(id => `<button class="control-button target-${id.split('-')[1]}" data-target-id="${id}">${state.gameState.players[id].name}</button>`).join('');
                dom.targetModal.classList.remove('hidden');
                break;
            case 'Reversus':
                state.gameState.reversusTarget = { card };
                dom.targetPlayerButtonsEl.innerHTML = state.gameState.playerIdsInGame
                    .map(id => `<button class="control-button target-${id.split('-')[1]}" data-target-id="${id}">${state.gameState.players[id].name}</button>`).join('');
                dom.targetModal.classList.remove('hidden');
                break;
            case 'Reversus Total':
                await playCard(player, card, player.id, null);
                break;
            default: // Mais, Menos, Sobe, Desce
                dom.targetPlayerButtonsEl.innerHTML = state.gameState.playerIdsInGame
                    .map(id => `<button class="control-button target-${id.split('-')[1]}" data-target-id="${id}">${state.gameState.players[id].name}</button>`).join('');
                dom.targetModal.classList.remove('hidden');
        }
    }
    renderAll();
};

export const handleEndTurnButton = () => {
    if (state.gameState.currentPlayer !== 'player-1' || state.gameState.gamePhase !== 'playing') return;
    const player = state.gameState.players['player-1'];
    const valueCardsInHandCount = player.hand.filter(c => c.type === 'value').length;

    // Check if the player MUST play a value card but hasn't
    if (valueCardsInHandCount >= 2 && !player.playedValueCardThisTurn) {
        updateLog("Você deve jogar uma carta de valor antes de passar o turno.");
        return;
    }
    advanceToNextPlayer();
};


export const handlePlayerTargetSelection = async (targetId) => {
    // This is for regular effect cards
    if (state.gameState.gamePhase === 'targeting') {
        const player = state.gameState.players['player-1'];
        const card = state.gameState.selectedCard;
        if (!card) return;

        if (state.gameState.reversusTarget) { // Reversus card targeting
            state.gameState.reversusTarget.targetId = targetId;
            dom.targetModal.classList.add('hidden');
            dom.reversusTargetModal.classList.remove('hidden');
            state.gameState.gamePhase = 'reversus_targeting';
            updateTurnIndicator();
        } else if (state.gameState.pulaTarget) { // Pula card targeting
            state.gameState.pulaTarget.targetPlayerId = targetId;
            dom.targetModal.classList.add('hidden');
            
            const targetPlayer = state.gameState.players[targetId];
            const occupiedPathIds = state.gameState.playerIdsInGame.map(id => state.gameState.players[id].pathId);
            
            dom.pulaModalTitle.textContent = `Jogar 'Pula' em ${targetPlayer.name}`;
            dom.pulaModalText.textContent = 'Escolha um caminho vazio para o jogador pular:';
            dom.pulaPathButtonsEl.innerHTML = state.gameState.boardPaths.map(path => 
                `<button class="control-button" data-path-id="${path.id}" ${occupiedPathIds.includes(path.id) ? 'disabled' : ''}>
                    Caminho ${path.id + 1} ${occupiedPathIds.includes(path.id) ? '(Ocupado)' : ''}
                </button>`
            ).join('');
            dom.pulaModal.classList.remove('hidden');
            state.gameState.gamePhase = 'pula_casting';
            updateTurnIndicator();
        } else { // Generic target (Mais, Menos, Sobe, Desce)
            dom.targetModal.classList.add('hidden');
            await playCard(player, card, targetId);
        }
    } 
    // This is for field effects
    else if (state.gameState.gamePhase === 'field_effect_targeting') {
        if (fieldEffectTargetResolver) {
            fieldEffectTargetResolver(targetId);
            fieldEffectTargetResolver = null;
        }
    }
};

export const handleTargetCancel = () => {
    dom.targetModal.classList.add('hidden');
    state.gameState.gamePhase = 'playing';
    state.gameState.selectedCard = null;
    state.gameState.reversusTarget = null;
    state.gameState.pulaTarget = null;
    renderAll();
};

export const handleReversusTypeSelection = async (type) => {
    dom.reversusTargetModal.classList.add('hidden');
    const player = state.gameState.players['player-1'];
    const { card, targetId } = state.gameState.reversusTarget;
    await playCard(player, card, targetId, type);
};

export const handleReversusCancel = () => {
    dom.reversusTargetModal.classList.add('hidden');
    state.gameState.gamePhase = 'playing';
    state.gameState.selectedCard = null;
    state.gameState.reversusTarget = null;
    renderAll();
};

export const handlePulaPathSelection = async (pathId) => {
    dom.pulaModal.classList.add('hidden');
    const player = state.gameState.players['player-1'];
    const { card, targetPlayerId } = state.gameState.pulaTarget;
    
    const targetPlayer = state.gameState.players[targetPlayerId];
    targetPlayer.targetPathForPula = pathId;

    await playCard(player, card, targetPlayerId);
};

export const handlePulaCancel = () => {
    dom.pulaModal.classList.add('hidden');
    state.gameState.gamePhase = 'playing';
    state.gameState.selectedCard = null;
    state.gameState.pulaTarget = null;
    renderAll();
};

export const handlePathChoice = (chosenPathId) => {
    if (!pathChoiceResolver) return;

    dom.choosePathModal.classList.add('hidden');
    const player = state.gameState.players['player-1'];
    player.pathId = chosenPathId;
    state.gameState.boardPaths[chosenPathId].playerId = 'player-1';

    const remainingPathIds = state.gameState.boardPaths
        .map(p => p.id)
        .filter(id => id !== chosenPathId);
    shuffle(remainingPathIds);

    const aiPlayers = state.gameState.playerIdsInGame.filter(id => id !== 'player-1');
    aiPlayers.forEach(aiId => {
        const aiPlayer = state.gameState.players[aiId];
        if (remainingPathIds.length > 0) {
            const assignedPathId = remainingPathIds.pop();
            aiPlayer.pathId = assignedPathId;
            state.gameState.boardPaths[assignedPathId].playerId = aiId;
        }
    });
    
    updateLog(`Você escolheu o Caminho ${chosenPathId + 1}.`);
    renderAll();

    pathChoiceResolver();
    pathChoiceResolver = null;
};

const chooseInitialPath = () => {
    return new Promise(resolve => {
        pathChoiceResolver = resolve;
        state.gameState.gamePhase = 'choose_path';
        updateTurnIndicator();
        dom.choosePathButtonsEl.innerHTML = state.gameState.boardPaths
            .map(path => `<button class="control-button" data-path-id="${path.id}">Caminho ${path.id + 1}</button>`)
            .join('');
        dom.choosePathModal.classList.remove('hidden');
    });
};

// --- Achievements ---
export const renderAchievements = () => {
    dom.achievementsGridEl.innerHTML = '';
    Object.entries(config.ACHIEVEMENTS_CONFIG).forEach(([id, achievementConfig]) => {
        const isUnlocked = state.achievements[id];
        const item = document.createElement('div');
        item.className = `achievement-item ${isUnlocked ? 'unlocked' : 'locked'}`;
        item.innerHTML = `
            <div class="achievement-checkbox">${isUnlocked ? '✓' : ''}</div>
            <div class="achievement-details">
                <h3>${achievementConfig.title}</h3>
                <p>${isUnlocked ? achievementConfig.description : '???'}</p>
            </div>
        `;
        dom.achievementsGridEl.appendChild(item);
    });
};

// --- PvP Logic ---
export const setupPvpRooms = () => {
    const rooms = [];
    for (let i = 1; i <= 12; i++) {
        rooms.push({
            id: i,
            name: `Sala ${i}`,
            isPrivate: i === 12,
            players: 0,
            maxPlayers: 4,
            status: 'Aguardando',
            color: (i % 4) + 1
        });
    }
    state.setPvpRooms(rooms);
};

export const renderPvpRooms = () => {
    dom.pvpRoomGridEl.innerHTML = state.pvpRooms.map(room => {
        return `
            <div class="room-card ${room.isPrivate ? 'special-room' : `color-${room.color}`}">
                <h3>${room.name} ${room.isPrivate ? '🔒' : ''}</h3>
                <p>Jogadores: ${room.players} / ${room.maxPlayers}</p>
                <p>Status: ${room.status}</p>
                <button class="control-button pvp-enter-room-button" data-room-id="${room.id}">Entrar</button>
            </div>
        `;
    }).join('');
};

export const handleEnterRoomClick = (roomId) => {
    state.setCurrentEnteringRoomId(roomId);
    const room = state.pvpRooms.find(r => r.id === roomId);
    if (room.isPrivate) {
        dom.pvpPasswordModal.classList.remove('hidden');
    } else {
        showPvpLobby(room);
    }
};

export const handlePvpPasswordSubmit = () => {
    const password = dom.pvpPasswordInput.value;
    if (password.toLowerCase() === 'final' && state.currentEnteringRoomId === 12) {
        dom.pvpPasswordModal.classList.add('hidden');
        dom.pvpPasswordInput.value = '';
        const room = state.pvpRooms.find(r => r.id === 12);
        showPvpLobby(room);
    } else {
        alert('Senha incorreta!');
    }
};

const showPvpLobby = (room) => {
    dom.pvpRoomListModal.classList.add('hidden');
    dom.lobbyTitleEl.textContent = `Lobby da ${room.name}`;
    updateLobbyUi(room.id);
    dom.pvpLobbyModal.classList.remove('hidden');
};

export const updateLobbyUi = (roomId) => {
    const isSpecialRoom = roomId === 12;
    const mode = dom.lobbyGameModeEl.value;
    const aiConfigEl = dom.lobbyAiConfigEl;
    aiConfigEl.classList.remove('hidden');
    
    const necroOption = dom.lobbyGameModeEl.querySelector('option[value="necro-final"]');
    if (necroOption) {
        necroOption.style.display = isSpecialRoom ? 'block' : 'none';
        if (!isSpecialRoom && dom.lobbyGameModeEl.value === 'necro-final') {
            dom.lobbyGameModeEl.value = 'solo-4p';
        }
    }
    
    if (mode === 'necro-final' && isSpecialRoom) {
        aiConfigEl.classList.add('hidden');
        return;
    }

    const numPlayers = mode === 'duo' ? 4 : parseInt(mode.split('-')[1].charAt(0));

    ['p2', 'p3', 'p4'].forEach(pNum => {
        const container = document.getElementById(`lobby-ai-${pNum}-container`);
        const select = document.getElementById(`lobby-ai-${pNum}`);
        const label = document.getElementById(`lobby-ai-${pNum}-label`);
        
        if (container) {
            const playerIndex = parseInt(pNum.charAt(1));
            container.style.display = (playerIndex <= numPlayers) ? 'flex' : 'none';
        }
        
        if (select) {
            const currentSelection = select.value;
            select.innerHTML = '';
            
            const options = [ { value: 'default', text: 'I.A. Padrão' } ];
            if (isSpecialRoom) {
                options.push(
                    { value: 'contravox', text: 'Contravox' },
                    { value: 'versatrix', text: 'Versatrix' },
                    { value: 'reversum', text: 'Rei Reversum' },
                    { value: 'necroverso', text: 'Necroverso' }
                );
            }
            
            options.forEach(opt => {
                const optionEl = document.createElement('option');
                optionEl.value = opt.value;
                optionEl.textContent = opt.text;
                select.appendChild(optionEl);
            });
            
            if (options.some(o => o.value === currentSelection)) {
                select.value = currentSelection;
            } else {
                select.value = 'default';
            }
        }
        
        if (label && mode === 'duo') {
             label.textContent = pNum === 'p3' ? 'Parceiro (I.A.):' : `Oponente ${pNum === 'p2' ? 1 : 2} (I.A.):`;
        } else if (label) {
             label.textContent = `Oponente ${parseInt(pNum.charAt(1)) - 1} (I.A.):`;
        }
    });
};

export const handleLobbyChatSend = () => {
    const input = dom.lobbyChatInput;
    if (input.value.trim() !== '') {
        const msgEl = document.createElement('div');
        msgEl.textContent = `Você: ${input.value.trim()}`;
        dom.lobbyChatHistoryEl.appendChild(msgEl);
        input.value = '';
        dom.lobbyChatHistoryEl.scrollTop = dom.lobbyChatHistoryEl.scrollHeight;
    }
};

export const handleLobbyStartGame = () => {
    const mode = dom.lobbyGameModeEl.value;
    
    if (mode === 'necro-final') {
        initializeGame('duo', { necroFinalMode: true });
        return;
    }

    const gameMode = mode.startsWith('solo') ? 'solo' : 'duo';
    const numPlayers = mode === 'duo' ? 4 : parseInt(mode.split('-')[1].charAt(0));

    const aiOpponents = [];
    for (let i = 2; i <= numPlayers; i++) {
        const select = document.getElementById(`lobby-ai-p${i}`);
        if (select) {
            aiOpponents.push({
                id: `player-${i}`,
                type: select.value
            });
        }
    }

    initializeGame(gameMode, { numPlayers, aiOpponents });
};

export const handleFieldEffectContinue = () => {
    if (fieldEffectContinueResolver) {
        fieldEffectContinueResolver();
        fieldEffectContinueResolver = null;
    }
};

export const handleRestartRound = () => {
    if (!state.roundStartStateSnapshot) {
        updateLog("Nenhum estado de backup da rodada encontrado para reiniciar.");
        dom.restartRoundConfirmModal.classList.add('hidden');
        return;
    }
    dom.restartRoundConfirmModal.classList.add('hidden');
    state.setGameState(structuredClone(state.roundStartStateSnapshot));
    
    updateLog("Rodada reiniciada a partir do último backup.");
    
    // Re-render everything based on the restored state
    renderAll();
    
    const currentPlayer = state.gameState.players[state.gameState.currentPlayer];
    if (currentPlayer.isHuman) {
        showTurnIndicator();
    } else {
        executeAiTurn(currentPlayer);
    }
};

export const handleRestartFromGameOver = () => {
    // This function is bound to the game over modal button
    // It should behave differently depending on the context
    if (state.gameState && state.gameState.isStoryMode) {
        showSplashScreen();
    } else {
        // For non-story modes, restart the same configuration
        initializeGame(state.gameState.gameMode, { numPlayers: state.gameState.playerIdsInGame.length });
    }
};
export const handleNextRoundButton = () => {
    // This button is now just a placeholder in the DOM, 
    // the logic is handled by the promise resolution in showRoundSummaryModal
}