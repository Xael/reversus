import { getState, updateState } from './state.js';
import * as config from './config.js';
import * as dom from './dom.js';
import { updateLog, shuffle } from './utils.js';
import { renderPlayerArea, renderAll, updateTurnIndicator, showGameOver, renderBoard } from './ui.js';
import { animateNecroX } from './animations.js';
import { announceEffect } from './sound.js';
import { applyEffect } from './game.js';

/**
 * Triggers Necroverso's "NECRO X" ability.
 * @param {object} caster - The Necroverso player object.
 */
export async function triggerNecroX(caster) {
    const { gameState } = getState();
    gameState.necroXUsedThisRound = true;
    updateLog(`${caster.name}: "Essa é a minha melhor carta!"`);

    document.body.classList.add('screen-shaking');
    animateNecroX();

    // Remove shake class after animation
    setTimeout(() => {
        document.body.classList.remove('screen-shaking');
    }, 400); // Match CSS animation duration

    await new Promise(res => setTimeout(res, 1000)); // Wait for drama

    const necroXCard = { id: Date.now() + Math.random(), type: 'effect', name: 'NECRO X', casterId: caster.id };
    
    const scoreEffectCategory = ['Mais', 'Menos', 'NECRO X', 'NECRO X Invertido'];
    const oldScoreCardIndex = caster.playedCards.effect.findIndex(c => scoreEffectCategory.includes(c.name));
    if (oldScoreCardIndex > -1) {
        const [oldCard] = caster.playedCards.effect.splice(oldScoreCardIndex, 1);
        gameState.decks.effect.push(oldCard);
    }
    caster.playedCards.effect.push(necroXCard);
    applyEffect(necroXCard, caster.id, caster.name);
    renderAll();
}

/**
 * Triggers Contravox's "OÃSUFNOC" ability.
 */
export async function triggerContravox() {
    const { gameState } = getState();
    updateLog("Contravox usa sua habilidade: OÃSUFNOC!");
    announceEffect("OÃSUFNOC", "reversus-total", 2000);

    dom.storyScreenFlashEl.style.backgroundColor = 'black';
    dom.storyScreenFlashEl.classList.remove('hidden');
    
    await new Promise(res => setTimeout(() => {
        dom.storyScreenFlashEl.classList.add('hidden');
        dom.storyScreenFlashEl.style.backgroundColor = 'white';
        gameState.player1CardsObscured = true;
        renderAll();
        res();
    }, 1000));
}

/**
 * Attempts to have an AI character speak a line of dialogue during their turn.
 * @param {object} aiPlayer - The AI player object.
 */
export async function tryToSpeak(aiPlayer) {
    const { gameState } = getState();
    const dialogueConfig = config.AI_DIALOGUE[aiPlayer.aiType];
    if (!dialogueConfig || Math.random() > 0.4) { // 40% chance to speak per turn
        return;
    }

    const currentState = aiPlayer.status; // 'winning' or 'losing'
    if (currentState !== 'winning' && currentState !== 'losing') {
        return;
    }
    
    const availableLines = dialogueConfig[currentState].filter(
        line => !gameState.dialogueState.spokenLines.has(line)
    );

    if (availableLines.length > 0) {
        const lineToSpeak = shuffle(availableLines)[0];
        gameState.dialogueState.spokenLines.add(lineToSpeak);
        updateLog(`${aiPlayer.name}: "${lineToSpeak}"`);
    }
}

const showPlayerTargetModalForFieldEffect = (title, prompt, targetIds) => {
    return new Promise(resolve => {
        const { gameState } = getState();
        gameState.gamePhase = 'field_effect_targeting';
        updateState('fieldEffectTargetingInfo', { resolve });
        
        dom.targetModalCardName.textContent = title;
        dom.targetModal.querySelector('p').textContent = prompt;
        
        dom.targetPlayerButtonsEl.innerHTML = targetIds.map(id => {
            const targetPlayer = gameState.players[id];
            const playerIdNumber = id.split('-')[1];
            return `<button class="control-button target-player-${playerIdNumber}" data-target-id="${id}">${targetPlayer.name}</button>`;
        }).join('');
        
        dom.targetModal.classList.remove('hidden');
        updateTurnIndicator();
        renderAll();
    });
};

const performTrade = (playerAId, playerBId, tradeType, gameState) => {
    const playerA = gameState.players[playerAId];
    const playerB = gameState.players[playerBId];

    const valueCardsA = playerA.hand.filter(c => c.type === 'value').sort((a,b) => a.value - b.value);
    const valueCardsB = playerB.hand.filter(c => c.type === 'value').sort((a,b) => a.value - b.value);

    if (valueCardsA.length === 0 || valueCardsB.length === 0) {
        updateLog(`Troca de cartas entre ${playerA.name} e ${playerB.name} falhou: um dos jogadores não tem cartas de valor.`);
        return;
    }

    const cardFromA = tradeType === 'justa' ? valueCardsA[0] : valueCardsA[valueCardsA.length - 1];
    const cardFromB = tradeType === 'justa' ? valueCardsB[valueCardsB.length - 1] : valueCardsB[0];
    
    playerA.hand = playerA.hand.filter(c => c.id !== cardFromA.id);
    playerB.hand = playerB.hand.filter(c => c.id !== cardFromB.id);

    playerA.hand.push(cardFromB);
    playerB.hand.push(cardFromA);

    updateLog(`${playerA.name} trocou a carta ${cardFromA.name} pela carta ${cardFromB.name} de ${playerB.name}.`);
};

/**
 * Triggers all active field effects at the start of a round.
 */
export async function triggerFieldEffects() {
    const { gameState } = getState();
    updateTurnIndicator();
    
    const contravoxAI = Object.values(gameState.players).find(p => p.aiType === 'contravox');
    if (contravoxAI && gameState.contravoxAbilityUses > 0) {
        const player1 = gameState.players['player-1'];
        if (player1 && [3, 6, 9].includes(player1.position)) {
            await triggerContravox();
            gameState.contravoxAbilityUses--;
        }
    }

    for (const playerId of gameState.playerIdsInGame) {
        const player = gameState.players[playerId];
        if (player.isEliminated || player.pathId === -1) continue;

        if (player.aiType === 'reversum') {
            const path = gameState.boardPaths[player.pathId];
            if (!path) continue;
            const space = path.spaces[player.position - 1];
            if (space && (space.color === 'red' || space.color === 'blue') && !space.isUsed) {
                updateLog(`${player.name} é imune a efeitos de campo e não ativa o espaço.`);
                space.isUsed = true;
                continue;
            }
        }
        
        const path = gameState.boardPaths[player.pathId];
        if (!path || player.position < 1 || player.position > config.BOARD_SIZE) continue;
        
        const spaceIndex = player.position - 1;
        const space = path.spaces[spaceIndex];
        
        if (!space || space.isUsed) continue;

        // Handle space effects
        if (space.color === 'red' || space.color === 'blue' || space.color === 'yellow' || space.color === 'black') {
            
            space.isUsed = true; // Use up the space immediately
            gameState.gamePhase = 'field_effect';
            
            // Yellow Space (Versatrix)
            if (space.color === 'yellow') {
                if (gameState.versatrixPowerDisabled) {
                    updateLog("Casa de Versatrix está inativa!");
                    continue;
                }
                dom.versatrixFieldModal.classList.remove('hidden');
                await new Promise(resolve => dom.versatrixFieldContinueButton.onclick = () => {
                    dom.versatrixFieldModal.classList.add('hidden');
                    resolve();
                });

                if (gameState.isFinalBoss) {
                    updateLog(`${player.name} ativou uma Casa de Versatrix! Efeitos são aplicados a todos.`);

                    const applyLoopingMovement = (p, move) => {
                        if (!p || p.isEliminated) return;
                        const oldPos = p.position;
                        // Using modulo for clean wrap-around logic for the 1-10 board.
                        const newPos = ((((oldPos - 1) + move) % 10) + 10) % 10 + 1;
                        p.position = newPos;
                        updateLog(`${p.name} moveu de ${oldPos} para ${p.position}.`);
                    };

                    const player1 = gameState.players['player-1'];
                    const versatrix = Object.values(gameState.players).find(p => p.aiType === 'versatrix');
                    const necros = Object.values(gameState.players).filter(p => p.aiType === 'necroverso_final');

                    applyLoopingMovement(player1, 1);
                    applyLoopingMovement(versatrix, 1);
                    necros.forEach(necro => applyLoopingMovement(necro, -1));
                } else { // Original Versatrix battle logic
                    if (player.aiType === 'versatrix') {
                        player.position = Math.min(config.WINNING_POSITION, player.position + 1);
                        updateLog(`Versatrix caiu em sua casa especial e avançou para ${player.position}.`);
                    } else {
                        player.position = Math.max(1, player.position - 1);
                        updateLog(`${player.name} caiu na casa de Versatrix e voltou para ${player.position}.`);
                    }
                }
                renderBoard();
                continue;
            }
            
            // Black Hole (Necroverso Final)
            if (space.color === 'black') {
                updateLog(`${player.name} caiu em um Buraco Negro!`);
                announceEffect("Buraco Negro!", "negative", 2500);
                await new Promise(res => setTimeout(res, 2500));
                space.color = 'white'; // Neutralize space visually
                if (player.isHuman) {
                    document.dispatchEvent(new CustomEvent('storyWinLoss', { detail: { battle: 'necroverso_final', won: false, reason: 'black_hole' }}));
                    return; // End processing
                }
                if (player.aiType === 'versatrix') {
                    player.isEliminated = true;
                    gameState.versatrixPowerDisabled = true;
                    updateLog("Versatrix foi eliminada pelo Buraco Negro! Seus poderes se foram.");
                    // Neutralize all yellow spaces on the board
                    gameState.boardPaths.forEach(path => {
                        path.spaces.forEach(space => {
                            if (space.color === 'yellow') {
                                space.color = 'white';
                                space.effectName = null;
                            }
                        });
                    });
                    renderBoard();
                }
                if (player.aiType === 'necroverso_final') {
                    gameState.necroversoHearts--;
                    updateLog(`Necroverso Final foi atingido por um Buraco Negro! Corações restantes: ${gameState.necroversoHearts}`);
                    if (gameState.necroversoHearts <= 0) {
                        document.dispatchEvent(new CustomEvent('storyWinLoss', { detail: { battle: 'necroverso_final', won: true }}));
                        return; // End processing
                    }
                }
                renderAll();
                continue;
            }

            // Red/Blue effects
            const isPositive = space.color === 'blue';
            const effectName = space.effectName;
            const effectType = isPositive ? 'positive' : 'negative';
            const description = isPositive ? config.POSITIVE_EFFECTS[effectName] : config.NEGATIVE_EFFECTS[effectName];
            
            updateLog(`${player.name} ativou o efeito de campo: ${effectName}!`);
            
            dom.fieldEffectTitle.textContent = `Efeito de Campo: ${player.name}`;
            dom.fieldEffectCardEl.className = `field-effect-card ${effectType}`;
            dom.fieldEffectNameEl.textContent = effectName;
            dom.fieldEffectDescriptionEl.textContent = description;
            dom.fieldEffectModal.classList.remove('hidden');
            
            await new Promise(resolve => dom.fieldEffectContinueButton.onclick = () => {
                dom.fieldEffectModal.classList.add('hidden');
                resolve();
            });
            
            const team = gameState.gameMode === 'duo' ? (config.TEAM_A.includes(player.id) ? config.TEAM_A : config.TEAM_B) : [player.id];
            const opponents = gameState.playerIdsInGame.filter(id => !team.includes(id));
            
            switch(effectName) {
                case 'Carta Menor':
                case 'Carta Maior':
                    team.forEach(memberId => {
                        const member = gameState.players[memberId];
                        if(!member) return;
                        const valueCards = member.hand.filter(c => c.type === 'value');
                        if (valueCards.length === 0) return;

                        valueCards.sort((a,b) => a.value - b.value);
                        const cardToDiscard = effectName === 'Carta Menor' ? valueCards[0] : valueCards[valueCards.length - 1];

                        gameState.decks.value.push(cardToDiscard);
                        member.hand = member.hand.filter(c => c.id !== cardToDiscard.id);
                        if(gameState.decks.value.length > 0) {
                            const newCard = gameState.decks.value.pop();
                            member.hand.push(newCard);
                            updateLog(`${member.name} (efeito de ${player.name}) descartou ${cardToDiscard.name} e sacou uma nova carta.`);
                        }
                    });
                    break;
                case 'Jogo Aberto':
                    (effectType === 'positive' ? opponents : team).forEach(id => {
                        if(gameState.players[id]) gameState.revealedHands.push(id);
                    });
                     updateLog(`Efeito '${effectName}' ativado. Mãos de ${effectType === 'positive' ? 'oponentes' : 'sua equipe'} estão reveladas.`);
                    break;
                case 'Troca Justa':
                case 'Troca Injusta':
                    const [playerA, playerB] = gameState.gameMode === 'duo' 
                        ? team.map(id => gameState.players[id]) 
                        : [player, null];

                    if (playerB) {
                         performTrade(playerA.id, playerB.id, 'justa', gameState);
                    } else if (opponents.length > 0) {
                        const tradeType = effectName === 'Troca Justa' ? 'justa' : 'injusta';
                        let opponentId;
                        if (player.isHuman) {
                            opponentId = await showPlayerTargetModalForFieldEffect(effectName, "Escolha um oponente para trocar cartas:", opponents);
                        } else {
                            opponentId = shuffle(opponents)[0];
                        }
                        
                        if (opponentId) {
                            performTrade(player.id, opponentId, tradeType, gameState);
                        }
                    }
                    break;
                case 'Total Revesus Nada!':
                     if (gameState.gameMode === 'duo') {
                        const p1 = gameState.players[team[0]];
                        const p2 = gameState.players[team[1]];
                        if(p1) {
                            const effectCardsP1 = p1.hand.filter(c => c.type === 'effect');
                            if(effectCardsP1.length > 0) {
                                const cardToRemove = shuffle(effectCardsP1)[0];
                                p1.hand = p1.hand.filter(c => c.id !== cardToRemove.id);
                            }
                        }
                        if(p2) {
                             let effectCardsInHand = p2.hand.filter(c => c.type === 'effect');
                            while (effectCardsInHand.length > 1) {
                                const cardToRemove = shuffle(effectCardsInHand)[0];
                                p2.hand = p2.hand.filter(c => c.id !== cardToRemove.id);
                                effectCardsInHand = p2.hand.filter(c => c.type === 'effect');
                            }
                        }
                    } else {
                        const p = gameState.players[team[0]];
                        if(p) p.hand = p.hand.filter(c => c.type === 'value');
                    }
                    updateLog(`'${effectName}' ativado para a equipe de ${player.name}, descartando cartas de efeito.`);
                    break;
                default:
                    team.forEach(memberId => {
                         if(gameState.players[memberId]) {
                             gameState.activeFieldEffects.push({ name: effectName, description, appliesTo: memberId, type: effectType });
                         }
                    });
                    break;
            }
        }
    }
}