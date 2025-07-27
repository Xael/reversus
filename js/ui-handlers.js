


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
    
    if (getState().reversusTotalIndividualFlow) {
        dom.targetModal.classList.add('hidden');
        
        gameState.reversusTarget = { card: gameState.selectedCard, targetPlayerId: targetId };
        
        const targetPlayer = gameState.players[targetId];
        const canReverseScore = targetPlayer.playedCards.effect.some(c => ['Mais', 'Menos'].includes(c.name));
        const canReverseMove = targetPlayer.playedCards.effect.some(c => ['Sobe', 'Desce', 'Pula'].includes(c.name));

        if (!canReverseScore && !canReverseMove) {
            updateLog(`Reversus Individual falhou: ${targetPlayer.name} não tem efeitos de Pontuação ou Movimento para reverter.`);
            gameState.gamePhase = 'playing';
            gameState.selectedCard = null;
            updateState('reversusTotalIndividualFlow', false);
            ui.renderAll();
            return;
        }

        gameState.gamePhase = 'reversus_targeting';
        dom.reversusTargetScoreButton.disabled = !canReverseScore;
        dom.reversusTargetMovementButton.disabled = !canReverseMove;
        dom.reversusTargetModal.classList.remove('hidden');
        ui.updateTurnIndicator();
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
        } else if (card.name === 'Reversus Total') {
            dom.reversusTotalChoiceModal.classList.remove('hidden');
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
        updateState('reversusTotalIndividualFlow', false);
        dom.targetModal.classList.add('hidden');
        ui.renderAll();
    });
    
    dom.reversusTargetScoreButton.addEventListener('click', () => {
        const { gameState } = getState();
        if (!gameState.reversusTarget) return;
        const { card, targetPlayerId } = gameState.reversusTarget;
        dom.reversusTargetModal.classList.add('hidden');
        gameState.gamePhase = 'playing';
        const isIndividualLock = getState().reversusTotalIndividualFlow;
        game.playCard(gameState.players['player-1'], card, targetPlayerId, 'score', { isIndividualLock });
    });
    
    dom.reversusTargetMovementButton.addEventListener('click', () => {
        const { gameState } = getState();
        if (!gameState.reversusTarget) return;
        const { card, targetPlayerId } = gameState.reversusTarget;
        dom.reversusTargetModal.classList.add('hidden');
        gameState.gamePhase = 'playing';
        const isIndividualLock = getState().reversusTotalIndividualFlow;
        game.playCard(gameState.players['player-1'], card, targetPlayerId, 'movement', { isIndividualLock });
    });
    
    dom.reversusTargetCancelButton.addEventListener('click', () => {
        const { gameState } = getState();
        gameState.gamePhase = 'playing';
        gameState.selectedCard = null;
        gameState.reversusTarget = null;
        updateState('reversusTotalIndividualFlow', false);
        dom.reversusTargetModal.classList.add('hidden');
        ui.renderAll();
    });

    dom.reversusTotalGlobalButton.addEventListener('click', () => {
        const { gameState } = getState();
        if (!gameState.selectedCard || gameState.selectedCard.name !== 'Reversus Total') return;
        dom.reversusTotalChoiceModal.classList.add('hidden');
        game.playCard(gameState.players['player-1'], gameState.selectedCard, 'player-1');
    });

    dom.reversusTotalIndividualButton.addEventListener('click', () => {
        const { gameState } = getState();
        if (!gameState.selectedCard || gameState.selectedCard.name !== 'Reversus Total') return;
        dom.reversusTotalChoiceModal.classList.add('hidden');
        
        updateState('reversusTotalIndividualFlow', true);

        gameState.gamePhase = 'targeting';
        ui.updateTurnIndicator();
        dom.targetModalCardName.textContent = 'Reversus Individual';
        dom.targetModal.querySelector('p').textContent = 'Selecione o alvo para travar um efeito:';
        
        dom.targetPlayerButtonsEl.innerHTML = gameState.playerIdsInGame.map(id => {
            const targetPlayer = gameState.players[id];
            const buttonText = id === 'player-1' ? 'Em Mim' : targetPlayer.name;
            const playerIdNumber = id.split('-')[1];
            return `<button class="control-button target-player-${playerIdNumber}" data-target-id="${id}">${buttonText}</button>`;
        }).join('');

        dom.targetModal.classList.remove('hidden');
    });

    dom.reversusTotalChoiceCancel.addEventListener('click', () => {
        dom.reversusTotalChoiceModal.classList.add('hidden');
        const { gameState } = getState();
        gameState.selectedCard = null;
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
        } else if(fieldEffectIndicator) {
            const playerId = fieldEffectIndicator.dataset.playerId;
            const effect = gameState.activeFieldEffects.find(fe => fe.appliesTo === playerId);
            if (effect) {
                 dom.fieldEffectInfoTitle.textContent = `Efeito Ativo: ${gameState.players[playerId].name}`;
                 dom.fieldEffectInfoName.textContent = effect.name;
                 dom.fieldEffectInfoDescription.textContent = effect.description;
                 dom.fieldEffectInfoModal.querySelector('.field-effect-card').className = `field-effect-card ${effect.type}`;
                 dom.fieldEffectInfoModal.classList.remove('hidden');
            }
        }
    });
    dom.fieldEffectInfoCloseButton.addEventListener('click', () => dom.fieldEffectInfoModal.classList.add('hidden'));

    dom.cardViewerCloseButton.addEventListener('click', () => dom.cardViewerModalEl.classList.add('hidden'));

    dom.pvpRoomListCloseButton.addEventListener('click', () => {
        dom.pvpRoomListModal.classList.add('hidden');
        ui.showSplashScreen();
    });

    dom.pvpRoomGridEl.addEventListener('click', e => {
        const button = e.target.closest('.pvp-enter-room-button');
        if (button && !button.disabled) {
            const roomId = parseInt(button.dataset.roomId, 10);
            const room = getState().pvpRooms.find(r => r.id === roomId);
            if (room.password) {
                updateState('currentEnteringRoomId', roomId);
                dom.pvpPasswordInput.value = '';
                dom.pvpPasswordModal.classList.remove('hidden');
            } else {
                // Join public room logic (TODO)
                console.log(`Joining public room ${roomId}`);
            }
        }
    });

    dom.pvpPasswordSubmit.addEventListener('click', () => {
        const { currentEnteringRoomId, pvpRooms } = getState();
        const room = pvpRooms.find(r => r.id === currentEnteringRoomId);
        if (room && dom.pvpPasswordInput.value === room.password) {
            dom.pvpPasswordModal.classList.add('hidden');
            dom.pvpRoomListModal.classList.add('hidden');
            dom.pvpLobbyModal.classList.remove('hidden');
            ui.updateLobbyUi(currentEnteringRoomId);
            ui.addLobbyChatMessage('Sistema', 'Você entrou na sala.');
        } else {
            alert('Senha incorreta!');
        }
    });
    dom.pvpPasswordCancel.addEventListener('click', () => dom.pvpPasswordModal.classList.add('hidden'));
    
    dom.pvpLobbyCloseButton.addEventListener('click', () => {
        dom.pvpLobbyModal.classList.add('hidden');
        dom.pvpRoomListModal.classList.remove('hidden');
        ui.renderPvpRooms(); // Refresh room list
    });

    dom.lobbyGameModeEl.addEventListener('change', () => {
        const { currentEnteringRoomId } = getState();
        ui.updateLobbyUi(currentEnteringRoomId);
    });

    dom.lobbyStartGameButton.addEventListener('click', () => {
        const { currentEnteringRoomId } = getState();
        const room = getState().pvpRooms.find(r => r.id === currentEnteringRoomId);
        if (!room) return;
        
        const mode = dom.lobbyGameModeEl.value;
        let numPlayers, gameModeType = 'solo', overrides = {};

        switch (mode) {
            case 'solo-2p': 
                numPlayers = 2;
                overrides['player-2'] = { aiType: document.getElementById('lobby-ai-p2').value };
                break;
            case 'solo-3p':
                numPlayers = 3;
                overrides['player-2'] = { aiType: document.getElementById('lobby-ai-p2').value };
                overrides['player-3'] = { aiType: document.getElementById('lobby-ai-p3').value };
                break;
            case 'solo-4p':
                numPlayers = 4;
                 overrides['player-2'] = { aiType: document.getElementById('lobby-ai-p2').value };
                 overrides['player-3'] = { aiType: document.getElementById('lobby-ai-p3').value };
                 overrides['player-4'] = { aiType: document.getElementById('lobby-ai-p4').value };
                break;
            case 'duo':
                numPlayers = 4;
                gameModeType = 'duo';
                overrides['player-2'] = { aiType: document.getElementById('lobby-ai-p2').value };
                overrides['player-3'] = { aiType: document.getElementById('lobby-ai-p3').value }; // Ally
                overrides['player-4'] = { aiType: document.getElementById('lobby-ai-p4').value }; // Opponent
                break;
        }

        game.initializeGame(gameModeType, { numPlayers, overrides });
    });

    dom.lobbyChatSendButton.addEventListener('click', () => {
        const message = dom.lobbyChatInput.value.trim();
        if (message) {
            ui.addLobbyChatMessage('Você', message);
            dom.lobbyChatInput.value = '';
        }
    });
    dom.lobbyChatInput.addEventListener('keypress', e => {
        if (e.key === 'Enter') {
            dom.lobbyChatSendButton.click();
        }
    });

    dom.continueButton.addEventListener('click', () => {
        sound.initializeMusic();
        saveLoad.loadGameState();
    });

    dom.muteButton.addEventListener('click', sound.toggleMute);
    dom.nextTrackButton.addEventListener('click', sound.changeTrack);
    dom.volumeSlider.addEventListener('input', (e) => sound.setVolume(parseFloat(e.target.value)));
    dom.fullscreenButton.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    });

    // --- In-Game Menu Handlers ---
    dom.debugButton.addEventListener('click', () => dom.gameMenuModal.classList.remove('hidden'));
    dom.gameMenuCloseButton.addEventListener('click', () => dom.gameMenuModal.classList.add('hidden'));

    dom.menuSaveGameButton.addEventListener('click', () => dom.saveGameConfirmModal.classList.remove('hidden'));
    dom.saveGameYesButton.addEventListener('click', () => {
        saveLoad.saveGameState();
        dom.saveGameConfirmModal.classList.add('hidden');
    });
    dom.saveGameNoButton.addEventListener('click', () => dom.saveGameConfirmModal.classList.add('hidden'));

    dom.menuRestartRoundButton.addEventListener('click', () => dom.restartRoundConfirmModal.classList.remove('hidden'));
    dom.restartRoundYesButton.addEventListener('click', () => {
        const { roundStartStateSnapshot } = getState();
        if (roundStartStateSnapshot) {
            updateState('gameState', JSON.parse(JSON.stringify(roundStartStateSnapshot)));
            updateLog("Rodada reiniciada a partir do último backup.");
            ui.renderAll();
        } else {
            updateLog("Nenhum backup de rodada encontrado.");
        }
        dom.restartRoundConfirmModal.classList.add('hidden');
    });
    dom.restartRoundNoButton.addEventListener('click', () => dom.restartRoundConfirmModal.classList.add('hidden'));

    dom.menuExitGameButton.addEventListener('click', () => dom.exitGameConfirmModal.classList.remove('hidden'));
    dom.exitGameYesButton.addEventListener('click', () => {
        dom.exitGameConfirmModal.classList.add('hidden');
        dom.gameMenuModal.classList.add('hidden');
        ui.showSplashScreen();
    });
    dom.exitGameNoButton.addEventListener('click', () => dom.exitGameConfirmModal.classList.add('hidden'));
    
    // --- Custom Event Listener for Story ---
    document.addEventListener('storyWinLoss', (e) => {
        const { battle, won, reason } = e.detail;
        const state = getState();
        state.gameState.gamePhase = 'game_over'; // Stop further game logic
        
        let nextNode = null;
        let achievementId = null;

        switch (battle) {
            case 'tutorial_necroverso':
                nextNode = 'post_tutorial';
                achievementId = won ? 'first_win' : 'first_defeat';
                break;
            case 'contravox':
                if (won) {
                    nextNode = 'post_contravox_victory';
                    achievementId = 'contravox_win';
                } else {
                    ui.showGameOver("Contravox te derrotou!", '!romaD otreC zaf otreC');
                    achievementId = 'first_defeat';
                }
                break;
            case 'versatrix':
                if (won) {
                    nextNode = 'post_versatrix_victory';
                } else {
                    updateState('storyState', { ...state.storyState, lostToVersatrix: true });
                    nextNode = 'post_versatrix_defeat';
                    achievementId = 'versatrix_loss';
                }
                break;
            case 'reversum':
                if (won) {
                    nextNode = 'post_reversum_victory';
                    achievementId = 'reversum_win';
                } else {
                    ui.showGameOver("O Rei Reversum provou seu poder.", "DERROTADO");
                    achievementId = 'first_defeat';
                }
                break;
            case 'necroverso_king':
                if (won) {
                    nextNode = 'post_necroverso_king_victory';
                     achievementId = 'true_end_beta';
                } else {
                    ui.showGameOver("Você foi derrotado pelas 3 faces do Rei Necroverso.", "FIM DE JOGO");
                }
                break;
            case 'necroverso_final':
                if (won) {
                    achievementId = 'true_end_final';
                    story.playEndgameSequence();
                } else {
                    let title = "FIM DE JOGO";
                    let message = "A escuridão do Necroverso consumiu tudo...";
                    if (reason === 'time') {
                        title = "O TEMPO ACABOU";
                        message = "O Inversum foi consumido pela escuridão...";
                    } else if (reason === 'collision') {
                        title = "FIM DA LINHA";
                        message = "Você foi tocado pela escuridão do Necroverso e se tornou parte dela.";
                    } else if (reason === 'black_hole') {
                        title = "CONSUMIDO";
                        message = "Você foi puxado para o vazio de um Buraco Negro.";
                    }
                    ui.showGameOver(message, title);
                }
                break;
        }

        if (achievementId) {
            achievements.grantAchievement(achievementId);
        }

        if (nextNode) {
            document.body.dataset.storyContinuation = 'true';
            setTimeout(() => {
                dom.appContainerEl.classList.add('hidden');
                dom.debugButton.classList.add('hidden');
                dom.storyModeModalEl.classList.remove('hidden');
                story.renderStoryNode(nextNode);
                document.body.dataset.storyContinuation = 'false';
            }, 2000);
        }
    });

    document.addEventListener('showSplashScreen', () => {
        ui.showSplashScreen();
    });
}
