import * as dom from './dom.js';
import { getState, updateState } from './state.js';
import { playStoryMusic, stopStoryMusic, initializeMusic } from './sound.js';
import { shatterImage } from './animations.js';

const storyDialogue = {
    'start_necroverso': {
        character: 'Necroverso', image: 'necroverso.png',
        text: 'Você está no Inversun... Eu sou o Necroverso. Se quiser voltar, deve desafiar os soberanos deste lugar: Contravox, Versatrix e Reversum.',
        options: [{ text: 'Como os desafio?', next: 'pre_tutorial_prompt' }]
    },
    'pre_tutorial_prompt': {
        character: 'Necroverso', image: 'necroverso.png',
        text: 'Eles jogam um jogo de cartas e tabuleiro. Quer que eu te ensine o básico em uma partida rápida?',
        options: [
            { text: 'Sim, por favor.', next: 'tutorial_explain_1' },
            { text: 'Não, eu me viro.', next: 'tutorial_skip' }
        ]
    },
    'tutorial_skip': {
        character: 'Necroverso', image: 'necroverso.png',
        text: 'Provavelmente você é um prodígio... Boa sorte então. Seu primeiro desafio será o Contravox.',
        isEndScene: true, nextScene: 'pre_contravox_intro'
    },
    'tutorial_explain_1': {
        character: 'Necroverso', image: 'necroverso.png',
        text: 'Ótimo. A regra principal é: tenha a maior pontuação no final da rodada para avançar no tabuleiro. Simples, certo?',
        next: 'tutorial_explain_2', isContinue: true
    },
    'tutorial_explain_2': {
        character: 'Necroverso', image: 'necroverso.png',
        text: 'Sua pontuação é a soma de duas cartas de VALOR que você joga. Se tiver 2 ou mais cartas de valor, você DEVE jogar uma. Se tiver só uma, ela vira seu "Resto" e não pode ser jogada.',
        next: 'tutorial_explain_3', isContinue: true
    },
    'tutorial_explain_3': {
        character: 'Necroverso', image: 'necroverso.png',
        text: 'As cartas de EFEITO são o tempero. "Mais" e "Menos" usam o valor do seu "Resto" para aumentar ou diminuir sua pontuação. "Sobe" e "Desce" movem seu peão.',
        next: 'tutorial_explain_4', isContinue: true
    },
    'tutorial_explain_4': {
        character: 'Necroverso', image: 'necroverso.png',
        text: 'As cartas "Pula", "Reversus" e "Reversus Total" são mais complexas e podem virar o jogo. Você aprenderá o poder delas na prática.',
        next: 'tutorial_explain_5', isContinue: true
    },
    'tutorial_explain_5': {
        character: 'Necroverso', image: 'necroverso.png',
        text: 'Chega de papo. Vamos jogar. Se vencer, a história continua. Se perder... a história também continua, mas eu vou rir de você.',
        isEndStory: true,
        startGame: { battle: 'tutorial_necroverso' }
    },
    'post_tutorial': {
        character: 'Necroverso', image: 'necroverso.png',
        text: 'E com isso finalizamos o tutorial... espero que tenha entendido tudo. Seu primeiro desafio real te aguarda.',
        options: [{ text: "Entendi!", next: 'pre_contravox_intro' }]
    },
    'pre_contravox_intro': {
        character: 'Necroverso', image: 'necroverso3.png',
        text: 'Vou te contar dois segredos sobre o Contravox para te ajudar no seu duelo...',
        options: [{ text: 'Dica é bom', next: 'pre_contravox_hint' }, { text: 'Não quero dicas', next: 'pre_contravox_hint' }]
    },
    'pre_contravox_hint': {
        character: 'Necroverso', image: 'necroverso3.png',
        text: 'Como eu sou legal vou te contar... Contravox é o mais fraco dos três... e ele tem uma habilidade especial... cuidado com ela!',
        options: [{ text: 'Isso era pra ser um segredo?', next: 'start_contravox' }, { text: 'Obrigado', next: 'start_contravox' }]
    },
    'start_contravox': {
        character: 'Contravox', image: 'contravox.png',
        text: '!recnev em áriugesnoc siamaj êcoV',
        options: [{ text: 'Zatanna?', next: 'contravox_end' }, { text: 'Não entendi nada...', next: 'contravox_end' }, { text: 'É hora do duelo!', next: 'contravox_end' }]
    },
    'contravox_end': {
        isEndStory: true,
        startGame: { battle: 'contravox' }
    },
    'post_contravox_victory': {
        character: 'Necroverso', image: 'necroverso.png',
        text: "Incrível... realmente você venceu o Contravox... faltam só mais dois agora, a próxima é Versatrix, mas cuidado... nem tudo é o que parece.",
        next: 'pre_versatrix_intro', isContinue: true
    },
    'pre_versatrix_intro': {
        character: 'Necroverso', image: 'necroverso3.png',
        text: 'A Versatrix é do signo de gêmeos... e ela é valiosa!',
        options: [{ text: 'Certo... signos...', next: 'start_versatrix_dialogue' }, { text: 'Conceito de valor?', next: 'start_versatrix_dialogue' }]
    },
    'start_versatrix_dialogue': {
        character: 'Versatrix', image: 'versatrix.png',
        text: "Sabe... o Rei Contravox era péssimo... mas era meu irmão",
        options: [{ text: "Sinto muito...", next: 'versatrix_sinto_muito' }, { text: "Você é solteira?", next: 'versatrix_solteira' }]
    },
    'versatrix_sinto_muito': {
        character: 'Versatrix', image: 'versatrix.png',
        text: "Não sinta... eu não sinto nada... quem sabe nesse duelo eu sinta ;)",
        isEndStory: true, startGame: { battle: 'versatrix' }
    },
    'versatrix_solteira': {
        character: 'Versatrix', image: 'versatrix.png',
        text: "Ah... seu interesseiro, vamos duelar logo!",
        isEndStory: true, startGame: { battle: 'versatrix' }
    },
    'post_versatrix_victory': {
        character: 'Necroverso', image: 'necroverso.png',
        text: "Agora só falta o mais difícil...",
        options: [{ text: "Quando eu venço eles... o que acontece?", next: 'post_versatrix_ask_return' }]
    },
    'post_versatrix_defeat': {
        character: 'Versatrix', image: 'versatrix.png',
        text: "Não se preocupe... eu vou te ajudar quando chegar o momento certo",
        options: [{ text: "Não entendi... eu perdi?", next: 'post_versatrix_victory' }, { text: "Eu ganhei?", next: 'post_versatrix_victory' }, { text: "Não entendi nada", next: 'post_versatrix_victory' }]
    },
    'post_versatrix_ask_return': {
        character: 'Necroverso', image: 'necroverso.png',
        text: "Você fica mais próximo de voltar ao seu mundo...\nVença o Rei Reversum e eu te darei a chance de retornar ao seu mundo",
        next: 'pre_reversum_intro', isContinue: true
    },
    'pre_reversum_intro': {
        character: 'Necroverso', image: 'necroverso3.png',
        text: 'Duas informações valiosas... ele é o mais poderoso e ele é imune ao vermelho!',
        options: [{ text: 'Isso deveria me ajudar?', next: 'start_reversum' }, { text: 'Espero que isso acabe logo', next: 'start_reversum' }]
    },
    'start_reversum': {
        character: 'Reversum', image: 'reversum.png',
        text: "Está cometendo um erro me desafiando...",
        options: [{ text: "Errar é humano...", next: 'reversum_end' }, { text: "Só quero zerar o jogo...", next: 'reversum_end' }, { text: "Seto Kaiba?", next: 'reversum_end' }]
    },
    'reversum_end': {
        isEndStory: true,
        startGame: { battle: 'reversum' }
    },
    'post_reversum_victory': {
        character: 'Necroverso', image: 'necroversorevelado.png',
        text: "Finalmente com eles derrotados o Invesun me pertence.",
        options: [{ text: "Certo... e nosso acordo?", next: 'final_confrontation_1' }]
    },
    'final_confrontation_1': {
        character: 'Necroverso', image: 'necroversorevelado.png',
        text: "Eu não menti, darei a chance que retorne... porém, se me derrotar.",
        options: [
            { text: "Estava fácil demais...", next: 'necroverso_king_battle' },
        ]
    },
    'necroverso_king_battle': {
        isEndStory: true,
        startGame: { battle: 'necroverso_king' }
    },
    'post_necroverso_king_victory': {
        character: 'Necroverso', image: 'necroverso2.png',
        text: "Você... me derrotou? Impossível! Mas você ainda não pode voltar. Falta meu teste final.",
        options: [{ text: "...", next: 'versatrix_warning_1' }]
    },
    'versatrix_warning_1': {
        character: 'Versatrix', image: 'versatrix.png',
        text: "Espere! Antes de enfrenta-lo fique sabendo, ele não pode ser vencido chegando apenas ao centro do tabuleiro primeiro... e não se deixe tocar por sua escuridão...",
        options: [{ text: "Escuridão...", next: 'versatrix_warning_2' }, { text: "Eu não sei o que fazer...", next: 'versatrix_warning_2' }]
    },
    'versatrix_warning_2': {
        character: 'Versatrix', image: 'versatrix.png',
        text: "Eu vou te ajudar... juntos venceremos!",
        options: [{ text: "Vamos!", next: 'pre_final_battle' }]
    },
    'pre_final_battle': {
        character: 'Necroverso', image: 'necroverso3.png',
        text: 'Duas dicas pra você... seu tempo acabou e não existe escapatória!',
        options: [{ text: 'Isso não me pareceu uma dica...', next: 'final_battle_final' }, { text: 'Ah saquei!', next: 'final_battle_final' }]
    },
    'final_battle_final': {
        isEndStory: true,
        startGame: { battle: 'necroverso_final' }
    }
};

const typewriter = (element, text, onComplete) => {
    let { typewriterTimeout } = getState();
    if (typewriterTimeout) clearTimeout(typewriterTimeout);
    let i = 0;
    element.innerHTML = '';
    const speed = 30;

    function type() {
        if (i < text.length) {
            let char = text.charAt(i);
            if (char === '\n') {
                element.innerHTML += '<br>';
            } else {
                element.innerHTML += char;
            }
            i++;
            typewriterTimeout = setTimeout(type, speed);
            updateState('typewriterTimeout', typewriterTimeout);
        } else {
            if (onComplete) onComplete();
        }
    }
    type();
};

const updateStoryStars = (character) => {
    if (!dom.storyStarsBackgroundEl) return;
    dom.storyStarsBackgroundEl.innerHTML = '';

    const characterColors = {
        'Necroverso': '#FFFFFF',
        'Contravox': '#52b788',
        'Versatrix': '#fca311',
        'Reversum': '#e63946',
    };

    const color = characterColors[character] || 'transparent';
    if (color === 'transparent') return;

    for(let i = 0; i < 100; i++) {
        const star = document.createElement('div');
        star.className = 'story-bg-star';
        star.style.color = color;
        const startX = `${Math.random() * 100}vw`, startY = `${Math.random() * 100}vh`;
        const endX = `${Math.random() * 100}vw`, endY = `${Math.random() * 100}vh`;
        star.style.setProperty('--start-x', startX);
        star.style.setProperty('--start-y', startY);
        star.style.setProperty('--end-x', endX);
        star.style.setProperty('--end-y', endY);
        star.style.top = startY;
        star.style.left = startX;
        star.style.animationDuration = `${Math.random() * 20 + 15}s`;
        star.style.animationDelay = `-${Math.random() * 35}s`;
        dom.storyStarsBackgroundEl.appendChild(star);
    }
};

export const renderStoryNode = (nodeId) => {
    updateState('currentStoryNodeId', nodeId);
    const node = storyDialogue[nodeId];
    if (!node) {
        console.error(`Story node not found: ${nodeId}`);
        return;
    }

    if (node.isEndStory) {
        dom.storyModeModalEl.classList.add('hidden');
        let gameOptions, mode = 'solo';
        
        switch(node.startGame.battle) {
            case 'tutorial_necroverso':
                gameOptions = { 
                    story: { 
                        battle: 'tutorial_necroverso', 
                        playerIds: ['player-1', 'player-2'], 
                        overrides: { 'player-2': { name: 'Necroverso', aiType: 'necroverso_tutorial' } }
                    } 
                };
                break;
            case 'contravox':
                gameOptions = { story: { battle: 'contravox', playerIds: ['player-1', 'player-3'], overrides: { 'player-3': { name: 'Contravox', aiType: 'contravox' } } } };
                break;
            case 'versatrix':
                gameOptions = { story: { battle: 'versatrix', playerIds: ['player-1', 'player-4'], overrides: { 'player-4': { name: 'Versatrix', aiType: 'versatrix' } } } };
                break;
            case 'reversum':
                gameOptions = { story: { battle: 'reversum', playerIds: ['player-1', 'player-2'], overrides: { 'player-2': { name: 'Rei Reversum', aiType: 'reversum' } } } };
                break;
            case 'necroverso_king':
                 gameOptions = { story: { battle: 'necroverso_king', type: '1v3_king', playerIds: ['player-1', 'player-2', 'player-3', 'player-4'], overrides: { 'player-2': { name: 'Rei Necroverso', aiType: 'reversum' }, 'player-3': { name: 'Rei Necroverso', aiType: 'contravox' }, 'player-4': { name: 'Rei Necroverso', aiType: 'versatrix' } } } };
                break;
            case 'necroverso_final':
                mode = 'duo';
                gameOptions = { story: { battle: 'necroverso_final', type: '2v2_necro_final', playerIds: ['player-1', 'player-4', 'player-2', 'player-3'], overrides: { 'player-2': { name: 'Necroverso Final', aiType: 'necroverso_final' }, 'player-3': { name: 'Necroverso Final', aiType: 'necroverso_final' }, 'player-4': { name: 'Versatrix', aiType: 'versatrix' } } } };
                break;
        }
        document.dispatchEvent(new CustomEvent('startStoryGame', { detail: { mode, options: gameOptions } }));
        return;
    }
    
    updateStoryStars(node.character);

    const previousImageName = dom.storyCharacterImageEl.dataset.imageName;
    const nextImageName = node.image || '';

    if (previousImageName !== nextImageName) {
        dom.storyCharacterImageEl.style.opacity = 0;
        setTimeout(() => {
            dom.storyCharacterImageEl.src = nextImageName;
            dom.storyCharacterImageEl.dataset.imageName = nextImageName;
            if (nextImageName) dom.storyCharacterImageEl.style.opacity = 1;
        }, 450);
    } else if (!nextImageName) {
        dom.storyCharacterImageEl.style.opacity = 0;
    }
    
    dom.storyDialogueOptionsEl.innerHTML = '';
    
    const onTypingComplete = () => {
        if (node.options) {
            node.options.forEach(option => {
                if(option.condition && !option.condition()) return;
                const button = document.createElement('button');
                button.className = 'control-button';
                button.textContent = option.text;
                button.onclick = () => renderStoryNode(option.next);
                dom.storyDialogueOptionsEl.appendChild(button);
            });
        } else if (node.isContinue) {
            const button = document.createElement('button');
            button.className = 'control-button continue-button';
            button.textContent = 'Continuar...';
            button.onclick = () => renderStoryNode(node.next);
            dom.storyDialogueOptionsEl.appendChild(button);
        } else if (node.isEndScene) {
            setTimeout(() => {
                dom.storySceneDialogueEl.style.opacity = 0;
                setTimeout(() => {
                     renderStoryNode(node.nextScene);
                     dom.storySceneDialogueEl.style.opacity = 1;
                }, 1000);
            }, 2000);
        }
    };

    typewriter(dom.storyDialogueTextEl, node.text || '', onTypingComplete);
};

const showScene1 = () => {
    dom.storyScene1El.innerHTML = '';
    dom.storyScene1El.classList.remove('hidden');
    dom.storySceneDialogueEl.classList.add('hidden');

    for (let i = 0; i < 150; i++) {
        const star = document.createElement('div');
        star.className = 'story-star';
        star.style.top = `${Math.random() * 100}%`;
        star.style.left = `${Math.random() * 100}%`;
        star.style.animationDelay = `${Math.random() * 2}s`;
        dom.storyScene1El.appendChild(star);
    }

    setTimeout(() => {
        const stars = dom.storyScene1El.querySelectorAll('.story-star');
        const centerX = window.innerWidth / 2, centerY = window.innerHeight / 2;

        stars.forEach(star => {
            const rect = star.getBoundingClientRect();
            star.style.setProperty('--tx-from', `${rect.left}px`);
            star.style.setProperty('--ty-from', `${rect.top}px`);
            star.style.setProperty('--tx-to', `${centerX}px`);
            star.style.setProperty('--ty-to', `${centerY}px`);
            star.classList.add('spiraling');
        });
        setTimeout(showScene2, 3000);
    }, 3000);
};

const showScene2 = () => {
    dom.storyScene1El.classList.add('hidden');
    dom.storyScreenFlashEl.classList.remove('hidden');
    
    setTimeout(() => {
        dom.storyScreenFlashEl.classList.add('hidden');
        dom.storySceneDialogueEl.classList.remove('hidden');
        dom.storySceneDialogueEl.style.opacity = 1;
        playStoryMusic('interludio.ogg');
        renderStoryNode('start_necroverso');
    }, 1000);
};

export const startStoryMode = () => {
    dom.musicPlayer.pause();
    dom.musicPlayer.src = '';

    initializeMusic();
    updateState('storyState', { lostToVersatrix: false });
    dom.splashScreenEl.classList.add('hidden');
    dom.storyModeModalEl.classList.remove('hidden');

    if(dom.storyStarsBackgroundEl) dom.storyStarsBackgroundEl.innerHTML = '';
    dom.storyCharacterImageEl.src = '';
    dom.storyCharacterImageEl.dataset.imageName = '';
    dom.storyCharacterImageEl.style.opacity = 0;
    
    showScene1();
};

async function showEndgameDialogue(text, delay = 1500) {
    dom.endgameDialogueText.textContent = text;
    dom.endgameDialogueOptions.innerHTML = ''; // Clear options
    await new Promise(res => setTimeout(res, delay));
}

async function showEndgameChoice(choices) {
    return new Promise(resolve => {
        dom.endgameDialogueOptions.innerHTML = '';
        choices.forEach(choice => {
            const button = document.createElement('button');
            button.textContent = choice.text;
            button.className = 'control-button';
            button.onclick = () => resolve(choice.value);
            dom.endgameDialogueOptions.appendChild(button);
        });
    });
}

export async function showCreditsRoll() {
    dom.endgameSequenceModal.classList.add('hidden');
    dom.creditsRollModal.classList.remove('hidden');
    playStoryMusic('tela.ogg', false); // Play credits music once

    dom.creditsContent.innerHTML = `
        <h2>Reversus</h2>
        <p><span class="credits-category">Beta Testers:</span><br>Ricardo, Rodrigo, Vinicius, Nathan, Augusto</p>
        <p><span class="credits-category">Roteiro:</span><br>Alex</p>
        <p><span class="credits-category">Sons:</span><br>Alex</p>
        <p><span class="credits-category">Arte/Game Designer:</span><br>Alex</p>
        <p><span class="credits-category">Músicas:</span><br>Suno</p>
        <p><span class="credits-category">Programação:</span><br>Alex e Google AI Studio</p>
        <p><span class="credits-category">Ilustração:</span><br>Gemini/GPT</p>
        <div class="credits-thanks">
            <p>Agradecimentos especiais a Karol minha Versatrix Geminiana... e meus amigos que foram fundamentais na execução da origem do Jogo Reversus, obrigado: Ricardo, Juliana, Augusto, Bruna, Alessandra, Franklin, Nathan, Larissa... desculpe se de esqueci alguém.</p>
            <p>Agradeço a meus pais Francisca e Roberto que também apoiaram de alguma forma e a minha sogra que bancou o desenvolvimento do jogo de tabuleiro, Obrigado Vilma Sogra do S2.</p>
            <p>Obrigado principalmente a você que jogou até aqui! ;)</p>
        </div>
    `;

    // After credits finish, show splash screen
    setTimeout(() => {
        dom.creditsRollModal.classList.add('hidden');
        document.dispatchEvent(new Event('showSplashScreen'));
    }, 45000);
}

export async function playEndgameSequence() {
    dom.appContainerEl.classList.add('hidden');
    dom.debugButton.classList.add('hidden');
    dom.endgameSequenceModal.classList.remove('hidden');

    // --- Scene 1: Necroverso's Defeat ---
    const necroImg = document.createElement('img');
    necroImg.src = 'necroversorevelado.png';
    necroImg.className = 'endgame-character';
    dom.endgameCharacterContainer.appendChild(necroImg);
    dom.endgameDialogueBox.classList.remove('hidden');

    await showEndgameDialogue("Eu...");
    await showEndgameDialogue("não...");
    await showEndgameDialogue("acredito...");

    await shatterImage(necroImg);
    dom.endgameCharacterContainer.innerHTML = '';
    dom.endgameDialogueBox.classList.add('hidden');
    await new Promise(res => setTimeout(res, 1000));

    // --- Scene 2: The Kings Thank You ---
    const kings = [
        { src: 'contravox.png', class: 'endgame-character' },
        { src: 'versatrix.png', class: 'endgame-character' },
        { src: 'reversum.png', class: 'endgame-character' }
    ];

    kings.forEach(kingData => {
        const img = document.createElement('img');
        img.src = kingData.src;
        img.className = kingData.class;
        img.style.opacity = '0';
        dom.endgameCharacterContainer.appendChild(img);
        // fade in
        setTimeout(() => img.style.opacity = '1', 100);
    });
    
    dom.endgameDialogueBox.classList.remove('hidden');
    await showEndgameDialogue("Muito obrigado por ter vencido o verdadeiro mal deste mundo...", 3000);

    // --- Scene 3: Versatrix's Choice ---
    const kingImages = dom.endgameCharacterContainer.querySelectorAll('img');
    kingImages.forEach(img => {
        if (!img.src.includes('versatrix.png')) {
            img.style.opacity = '0';
        }
    });
    await new Promise(res => setTimeout(res, 1000));
    
    await showEndgameDialogue("Você pode voltar ao seu mundo... ou... ficar aqui...", 1000);
    
    const choice = await showEndgameChoice([
        { text: 'Ficar!', value: 'stay' },
        { text: 'Voltar!', value: 'go' }
    ]);
    
    console.log(`Player chose to: ${choice}`);
    
    // --- Final Scene: Credits ---
    dom.endgameDialogueBox.classList.add('hidden');
    await new Promise(res => setTimeout(res, 500));
    
    showCreditsRoll();
}