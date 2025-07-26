
import * as dom from './dom.js';
import { getState, updateState } from './state.js';
import * as game from './game.js';
import * as ui from './ui.js';
import * as sound from './sound.js';
import * as story from './story.js';
import * as saveLoad from './save-load.js';
import * as achievements from './achievements.js';
import { updateLog } from './utils.js';

function handleCardClick(cardElement) {
    const { gameState } = getState();
    const cardId = parseFloat(cardElement.dataset.cardId);
    if (gameState.currentPlayer !== 'player-1' || gameState.gamePhase !== 'playing' || isNaN(cardId)) {
        return;
    }

    const player = gameState.players['player-1'];
    const card = player.hand.find(c => c.id === cardId);

    if (card) {
        if(gameState.tutorialEffectCardsLocked && card.type === 'effect') return;
        gameState.selectedCard = (gameState.selectedCard?.id === cardId) ? null : card;
        ui.renderAll();
    }
}

function handlePlayerTargetSelection(targetId) {
    const { gameState } = getState();
    
    if (gameState.gamePhase === 'field_effect_targeting') {
        const { fieldEffectTargetingInfo } = getState();
        if(fieldEffectTargetingInfo?.resolve) {
            fieldEffectTargetingInfo.resolve(targetId);
        }
        dom.targetModal.classList.add('hidden');
        updateState('fieldEffectTargetingInfo', null);
        gameState.gamePhase = 'playing';
        ui.renderAll();
        return;
    }

    if (!gameState.selectedCard) return;
    const card = gameState.selectedCard;
    dom.targetModal.classList.add('hidden');

    if (card.name === 'Reversus') {
        gameState.reversusTarget = { card, targetPlayerId: targetId };
        gameState.gamePhase = 'reversus_targeting';
        dom.reversusTargetModal.classList.remove('hidden');
        ui.updateTurnIndicator();
    } else if (card.name === 'Pula') {
        const availablePaths = gameState.boardPaths.filter(p => !Object.values(gameState.players).map(pl => pl.pathId).includes(p.id));
        if (availablePaths.length === 0) {
            alert("Não há caminhos vazios para pular! A jogada foi cancelada.");
            updateLog("Tentativa de jogar 'Pula' falhou: Nenhum caminho vazio disponível.");
            gameState.gamePhase = 'playing';
            gameState.selectedCard = null;
            ui.renderAll();
            return;
        }
        gameState.pulaTarget = { card, targetPlayerId: targetId };
        handlePulaCasterChoice(card, targetId);
    } else {
        gameState.gamePhase = 'playing';
        game.playCard(gameState.players['player-1'], card, targetId);
    }
}

function handlePulaCasterChoice(card, targetId) {
    const { gameState } = getState();
    gameState.gamePhase = 'pula_casting';
    const target = gameState.players[targetId];

    dom.pulaModalTitle.textContent = `Jogar 'Pula' em ${target.name}`;
    dom.pulaModalText.textContent = `Escolha um caminho vazio para ${target.name} pular:`;
    dom.pulaCancelButton.classList.remove('hidden');

    const occupiedPathIds = Object.values(gameState.players).map(p => p.pathId);
    
    dom.pulaPathButtonsEl.innerHTML = gameState.boardPaths.map(p => {
        const pathOccupant = Object.values(gameState.players).find(player => player.pathId === p.id);
        const isOccupied = !!pathOccupant;
        const isDisabled = isOccupied;
        return `<button class="control-button" data-path-id="${p.id}" ${isDisabled ? 'disabled' : ''}>Caminho ${p.id + 1} ${isOccupied ? `(Ocupado por ${pathOccupant.name})` : '(Vazio)'}</button>`
    }).join('');

    dom.pulaModal.classList.remove('hidden');
    ui.updateTurnIndicator();
}

function handlePulaPathSelection(chosenPathId) {
    const { gameState } = getState();
    if (!gameState.pulaTarget) return;
    const { card, targetPlayerId } = gameState.pulaTarget;
    const target = gameState.players[targetPlayerId];
    target.targetPathForPula = chosenPathId;
    updateLog(`${gameState.players['player-1'].name} escolheu que ${target.name} pule para o caminho ${chosenPathId + 1}.`);
    
    dom.pulaModal.classList.add('hidden');
    gameState.gamePhase = 'playing';
    game.playCard(gameState.players['player-1'], card, targetPlayerId);
}

export function initializeUiHandlers() {
    dom.quickStartButton.addEventListener('click', () => {
        sound.initializeMusic();
        dom.splashScreenEl.classList.add('hidden');
        ui.showGameSetupModal();
    });

    dom.storyModeButton.addEventListener('click', story.startStoryMode);

    dom.inversusModeButton.addEventListener('click', () => {
        sound.initializeMusic();
        game.initializeGame('inversus', {
            numPlayers: 2,
            overrides: {
                'player-2': { name: 'Inversus', aiType: 'inversus' }
            }
        });
    });

    dom.pvpModeButton.addEventListener('click', () => {
        sound.initializeMusic();
        ui.renderPvpRooms();
        dom.splashScreenEl.classList.add('hidden');
        dom.pvpRoomListModal.classList.remove('hidden');
    });

    dom.instructionsButton.addEventListener('click', () => {
        sound.initializeMusic();
        dom.rulesModal.classList.remove('hidden');
    });
    dom.closeRulesButton.addEventListener('click', () => dom.rulesModal.classList.add('hidden'));

    dom.creditsButton.addEventListener('click', () => {
        sound.initializeMusic();
        dom.creditsModal.classList.remove('hidden');
    });
    dom.closeCreditsButton.addEventListener('click', () => dom.creditsModal.classList.add('hidden'));

    dom.achievementsButton.addEventListener('click', () => {
        achievements.renderAchievementsModal();
        dom.achievementsModal.classList.remove('hidden');
    });
    dom.closeAchievementsButton.addEventListener('click', () => dom.achievementsModal.classList.add('hidden'));

    dom.closeSetupButton.addEventListener('click', () => {
        dom.gameSetupModal.classList.add('hidden');
        ui.showSplashScreen();
    });

    dom.solo2pButton.addEventListener('click', () => game.initializeGame('solo', { numPlayers: 2 }));
    dom.solo3pButton.addEventListener('click', () => game.initializeGame('solo', { numPlayers: 3 }));
    dom.solo4pButton.addEventListener('click', () => game.initializeGame('solo', { numPlayers: 4 }));
    dom.duoModeButton.addEventListener('click', () => game.initializeGame('duo', { numPlayers: 4 }));

    dom.playButton.addEventListener('click', () => {
        const { gameState } = getState();
        if (!gameState.selectedCard || gameState.currentPlayer !== 'player-1') return;
        const card = gameState.selectedCard;
        const player = gameState.players['player-1'];

        if (card.type === 'value') {
            game.playCard(player, card);
        } else if (card.type === 'effect') {
            gameState.gamePhase = 'targeting';
            ui.updateTurnIndicator();
            
            if (gameState.player1CardsObscured) {
                dom.targetModalCardName.textContent = "Efeito Confuso";
                dom.targetModal.querySelector('p').textContent = 'Selecione o alvo para o efeito desconhecido:';
            } else {
                dom.targetModal.querySelector('p').textContent = 'Selecione o alvo:';
                dom.targetModalCardName.textContent = card.name.toString();
            }
            
            dom.targetPlayerButtonsEl.innerHTML = gameState.playerIdsInGame.map(id => {
                const targetPlayer = gameState.players[id];
                let isTargetDisabled = false;
                if(card.name === 'Reversus Total' || (card.name === 'Pula' && id === player.id)) {
                    isTargetDisabled = id !== 'player-1';
                }
                const buttonText = id === 'player-1' ? 'Em Mim' : targetPlayer.name;
                const playerIdNumber = id.split('-')[1];
                return `<button class="control-button target-player-${playerIdNumber}" data-target-id="${id}" ${isTargetDisabled ? 'disabled' : ''}>${buttonText}</button>`;
            }).join('');

            dom.targetModal.classList.remove('hidden');
        }
    });
    
    dom.endTurnButton.addEventListener('click', () => {
        const { gameState } = getState();
        if (gameState.gamePhase !== 'playing' || gameState.currentPlayer !== 'player-1') return;
        const player = gameState.players['player-1'];
        const valueCardsInHandCount = player.hand.filter(c => c.type === 'value').length;
        if (valueCardsInHandCount >= 2 && !player.playedValueCardThisTurn) {
            updateLog("Regra: Você deve jogar uma carta de valor antes de encerrar o turno.");
            return;
        }
        game.advanceToNextPlayer();
    });

    dom.targetPlayerButtonsEl.addEventListener('click', (e) => {
        const button = e.target.closest('button');
        if (button && button.dataset.targetId) handlePlayerTargetSelection(button.dataset.targetId);
    });

    dom.targetCancelButton.addEventListener('click', () => {
        const { gameState } = getState();
        if (gameState.gamePhase === 'field_effect_targeting') {
             const { fieldEffectTargetingInfo } = getState();
             if(fieldEffectTargetingInfo?.resolve) {
                fieldEffectTargetingInfo.resolve(null);
            }
             updateState('fieldEffectTargetingInfo', null);
        }
        gameState.gamePhase = 'playing';
        gameState.selectedCard = null;
        dom.targetModal.classList.add('hidden');
        ui.renderAll();
    });
    
    dom.reversusTargetScoreButton.addEventListener('click', () => {
        const { gameState } = getState();
        if (!gameState.reversusTarget) return;
        const { card, targetPlayerId } = gameState.reversusTarget;
        dom.reversusTargetModal.classList.add('hidden');
        gameState.gamePhase = 'playing';
        game.playCard(gameState.players['player-1'], card, targetPlayerId, 'score');
    });
    
    dom.reversusTargetMovementButton.addEventListener('click', () => {
        const { gameState } = getState();
        if (!gameState.reversusTarget) return;
        const { card, targetPlayerId } = gameState.reversusTarget;
        dom.reversusTargetModal.classList.add('hidden');
        gameState.gamePhase = 'playing';
        game.playCard(gameState.players['player-1'], card, targetPlayerId, 'movement');
    });
    
    dom.reversusTargetCancelButton.addEventListener('click', () => {
        const { gameState } = getState();
        gameState.gamePhase = 'playing';
        gameState.selectedCard = null;
        gameState.reversusTarget = null;
        dom.reversusTargetModal.classList.add('hidden');
        ui.renderAll();
    });

    dom.pulaPathButtonsEl.addEventListener('click', e => {
        const button = e.target.closest('button');
        if (button && button.dataset.pathId && !button.disabled) handlePulaPathSelection(parseInt(button.dataset.pathId, 10));
    });

    dom.pathSelectionButtonsEl.addEventListener('click', e => {
        const { gameState, pathSelectionResolver } = getState();
        const button = e.target.closest('button');
        if (button && button.dataset.pathId && !button.disabled && gameState.gamePhase === 'path_selection' && pathSelectionResolver) {
            pathSelectionResolver(parseInt(button.dataset.pathId, 10));
        }
    });
    
    dom.pulaCancelButton.addEventListener('click', () => {
        const { gameState } = getState();
        dom.pulaModal.classList.add('hidden');
        gameState.gamePhase = 'playing';
        gameState.selectedCard = null;
        gameState.pulaTarget = null;
        ui.renderAll();
    });
    
    dom.restartButton.addEventListener('click', () => {
        dom.gameOverModal.classList.add('hidden');
        ui.showSplashScreen();
    });
    
    dom.appContainerEl.addEventListener('click', (e) => {
        const { gameState } = getState();
        if (!gameState) return;
        const cardMaximizeButton = e.target.closest('.card-maximize-button');
        const cardEl = e.target.closest('.card');
        const fieldEffectIndicator = e.target.closest('.field-effect-indicator');
        
        if (cardMaximizeButton) {
            e.stopPropagation();
            const parentCardEl = cardMaximizeButton.closest('.card');
            const cardId = parseFloat(parentCardEl.dataset.cardId);
            let foundCard = null;
            for (const player of Object.values(gameState.players)) {
                foundCard = player.hand.find(c => c.id === cardId) || 
                            player.playedCards.value.find(c => c.id === cardId) || 
                            player.playedCards.effect.find(c => c.id === cardId);
                if (foundCard) break;
            }
            if(foundCard) {
                if (gameState.player1CardsObscured) {
                    dom.cardViewerImageEl.src = 'cartacontravox.png';
                } else {
                    dom.cardViewerImageEl.src = ui.getCardImageUrl(foundCard, false);
                }
                dom.cardViewerModalEl.classList.remove('hidden');
            }
        } else if (cardEl) {
            const handEl = e.target.closest('.player-hand');
            if (handEl && handEl.id === 'hand-player-1' && !cardEl.classList.contains('disabled')) {
                handleCardClick(cardEl);
            }
        } else if (fieldEffectIndicator) {
            const playerId = fieldEffectIndicator.dataset.playerId;
            const effect = gameState.activeFieldEffects.find(fe => fe.appliesTo === playerId);
            if (effect) {
                dom.fieldEffectInfoTitle.textContent = `Efeito de ${gameState.players[playerId].name}`;
                dom.fieldEffectInfoName.textContent = effect.name;
                dom.fieldEffectInfoDescription.textContent = effect.description;
                dom.fieldEffectInfoModal.querySelector('.field-effect-card').className = `field-effect-card ${effect.type}`;
                dom.fieldEffectInfoModal.classList.remove('hidden');
            }
        }
    });

    dom.fieldEffectInfoCloseButton.addEventListener('click', () => dom.fieldEffectInfoModal.classList.add('hidden'));
    
    dom.cardViewerCloseButton.addEventListener('click', () => dom.cardViewerModalEl.classList.add('hidden'));
    dom.cardViewerModalEl.addEventListener('click', (e) => {
        if (e.target === dom.cardViewerModalEl) {
            dom.cardViewerModalEl.classList.add('hidden');
        }
    });

    dom.pvpRoomListCloseButton.addEventListener('click', ui.showSplashScreen);
    
    dom.pvpLobbyCloseButton.addEventListener('click', () => {
        dom.pvpLobbyModal.classList.add('hidden');
        dom.pvpRoomListModal.classList.remove('hidden');
    });

    dom.pvpRoomGridEl.addEventListener('click', (e) => {
        const button = e.target.closest('.pvp-enter-room-button');
        if (button) {
            const roomId = parseInt(button.dataset.roomId);
            const { pvpRooms } = getState();
            const room = pvpRooms.find(r => r.id === roomId);
            if (room) {
                 updateState('currentEnteringRoomId', roomId);
                if(room.password && room.id !== 12) { // Room 12 password is achievement based
                    dom.pvpPasswordModal.classList.remove('hidden');
                } else {
                    dom.pvpRoomListModal.classList.add('hidden');
                    ui.updateLobbyUi(roomId);
                    dom.pvpLobbyModal.classList.remove('hidden');
                }
            }
        }
    });

    dom.pvpPasswordSubmit.addEventListener('click', () => {
        const { pvpRooms, currentEnteringRoomId } = getState();
        const room = pvpRooms.find(r => r.id === currentEnteringRoomId);
        if (room && dom.pvpPasswordInput.value === room.password) {
            dom.pvpPasswordModal.classList.add('hidden');
            dom.pvpRoomListModal.classList.add('hidden');
            ui.updateLobbyUi(room.id);
            dom.pvpLobbyModal.classList.remove('hidden');
        } else {
            alert('Senha incorreta!');
        }
        dom.pvpPasswordInput.value = '';
    });
    dom.pvpPasswordCancel.addEventListener('click', () => dom.pvpPasswordModal.classList.add('hidden'));

    dom.lobbyGameModeEl.addEventListener('change', () => {
        const { currentEnteringRoomId } = getState();
        ui.updateLobbyUi(currentEnteringRoomId || 1); // Pass a default or stored room ID
    });
    const handleLobbyChatSend = () => {
        const message = dom.lobbyChatInput.value.trim();
        if(message) {
            ui.addLobbyChatMessage('Você', message);
            dom.lobbyChatInput.value = '';
        }
    };
    dom.lobbyChatSendButton.addEventListener('click', handleLobbyChatSend);
    dom.lobbyChatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleLobbyChatSend(); });

    dom.lobbyStartGameButton.addEventListener('click', () => {
        const mode = dom.lobbyGameModeEl.value;
        const p2AI = document.getElementById('lobby-ai-p2').value;
        const p3AI = document.getElementById('lobby-ai-p3').value;
        const p4AI = document.getElementById('lobby-ai-p4').value;
        
        const { currentEnteringRoomId } = getState();
        const isSpecialRoom = currentEnteringRoomId === 12;

        const getAiName = (selectValue, defaultName) => {
            if (!isSpecialRoom || selectValue === 'default') {
                return defaultName;
            }
             // For special characters, derive name from value
            return {
                contravox: 'Contravox',
                versatrix: 'Versatrix',
                reversum: 'Rei Reversum',
                necroverso: 'Necroverso',
                necroverso_final: 'Necroverso Final'
            }[selectValue] || defaultName;
        };
        
        const gameOptions = {
            overrides: {
                'player-2': { aiType: p2AI, name: getAiName(p2AI, 'Jogador 2') },
                'player-3': { aiType: p3AI, name: getAiName(p3AI, 'Jogador 3') },
                'player-4': { aiType: p4AI, name: getAiName(p4AI, 'Jogador 4') },
            }
        };

        if (mode.startsWith('solo')) game.initializeGame('solo', { ...gameOptions, numPlayers: parseInt(mode.slice(-2, -1)) });
        else if (mode === 'duo') game.initializeGame('duo', { ...gameOptions, numPlayers: 4 });
    });

    dom.musicPlayer.addEventListener('ended', sound.changeTrack);
    dom.muteButton.addEventListener('click', sound.toggleMute);
    dom.volumeSlider.addEventListener('input', (e) => sound.setVolume(parseFloat(e.target.value)));
    dom.nextTrackButton.addEventListener('click', sound.changeTrack);
    dom.fullscreenButton.addEventListener('click', () => {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(err => console.error(err));
        else document.exitFullscreen();
    });

    dom.debugButton.addEventListener('click', () => dom.gameMenuModal.classList.remove('hidden'));
    dom.gameMenuCloseButton.addEventListener('click', () => dom.gameMenuModal.classList.add('hidden'));

    dom.menuSaveGameButton.addEventListener('click', () => {
        dom.gameMenuModal.classList.add('hidden');
        dom.saveGameConfirmModal.classList.remove('hidden');
    });
    dom.saveGameYesButton.addEventListener('click', () => saveLoad.saveGameState());
    dom.saveGameNoButton.addEventListener('click', () => dom.saveGameConfirmModal.classList.add('hidden'));

    dom.menuRestartRoundButton.addEventListener('click', () => {
        dom.gameMenuModal.classList.add('hidden');
        dom.restartRoundConfirmModal.classList.remove('hidden');
    });
    dom.restartRoundYesButton.addEventListener('click', () => {
        const { roundStartStateSnapshot } = getState();
        if (roundStartStateSnapshot) {
            // Use a robust deep copy to prevent any reference issues.
            updateState('gameState', JSON.parse(JSON.stringify(roundStartStateSnapshot)));
            updateLog("Rodada reiniciada a partir do último backup.");
            const { gameState } = getState();
            const currentPlayer = gameState.players[gameState.currentPlayer];
            // Must render first, then check for AI turn
            ui.renderAll();
            if (currentPlayer && !currentPlayer.isHuman) {
                game.executeAiTurn(currentPlayer);
            }
        } else {
            updateLog("Nenhum backup de rodada disponível.");
        }
        dom.restartRoundConfirmModal.classList.add('hidden');
    });
    dom.restartRoundNoButton.addEventListener('click', () => dom.restartRoundConfirmModal.classList.add('hidden'));
    
    dom.menuExitGameButton.addEventListener('click', () => {
        dom.gameMenuModal.classList.add('hidden');
        dom.exitGameConfirmModal.classList.remove('hidden');
    });
    dom.exitGameYesButton.addEventListener('click', () => {
        dom.exitGameConfirmModal.classList.add('hidden');
        ui.showSplashScreen();
    });
    dom.exitGameNoButton.addEventListener('click', () => dom.exitGameConfirmModal.classList.add('hidden'));

    dom.continueButton.addEventListener('click', saveLoad.loadGameState);

    document.addEventListener('startStoryGame', (e) => {
        game.initializeGame(e.detail.mode, e.detail.options);
    });

    document.addEventListener('storyWinLoss', (e) => {
        const { battle, won, reason } = e.detail;
        const { storyState, gameState } = getState();
        const elapsedMinutes = (Date.now() - getState().gameStartTime) / 60000;
        
        gameState.gamePhase = 'game_over'; // Stop further game actions
        
        // This is the fix: Hide the game UI before showing the result.
        dom.appContainerEl.classList.add('hidden');
        dom.debugButton.classList.add('hidden');
        
        // This is the new fix for the black screen: make the story modal visible.
        dom.storyModeModalEl.classList.remove('hidden');

        // Grant achievements based on any outcome
        if(won) {
            achievements.grantAchievement('first_win');
            if (elapsedMinutes < 5 && battle !== 'tutorial_necroverso') {
                achievements.grantAchievement('speed_run');
            }
        } else {
            achievements.grantAchievement('first_defeat');
        }

        switch(battle) {
            case 'tutorial_necroverso':
                story.renderStoryNode('post_tutorial');
                break;
            case 'contravox':
                if (won) {
                    achievements.grantAchievement('contravox_win');
                    story.renderStoryNode('post_contravox_victory');
                } else {
                    ui.showGameOver('Contravox venceu. O Inversus te consumiu...');
                }
                break;
            case 'versatrix':
                if (won) {
                    story.renderStoryNode('post_versatrix_victory');
                } else {
                    storyState.lostToVersatrix = true;
                    achievements.grantAchievement('versatrix_loss');
                    story.renderStoryNode('post_versatrix_defeat');
                }
                break;
            case 'reversum':
                 if (won) {
                     achievements.grantAchievement('reversum_win');
                     story.renderStoryNode('post_reversum_victory');
                 } else {
                     ui.showGameOver('Rei Reversum venceu. O Inversus te consumiu...');
                 }
                break;
            case 'necroverso_king':
                 if (won) {
                    achievements.grantAchievement('true_end_beta');
                    story.renderStoryNode('post_necroverso_king_victory');
                } else {
                    ui.showGameOver("Game Over");
                }
                break;
            case 'necroverso_final':
                if (won) {
                    achievements.grantAchievement('true_end_final');
                    story.playEndgameSequence();
                } else {
                    let message = "O Necroverso Final te derrotou.";
                    if (reason === 'time') message = "O tempo acabou. Você foi consumido pelo Inversus.";
                    if (reason === 'black_hole') message = "Você foi consumido por um Buraco Negro.";
                    if (reason === 'collision') message = "O Necroverso Final te alcançou.";
                    ui.showGameOver(message);
                }
                saveLoad.deleteSavedGame();
                break;
        }
    });
}
