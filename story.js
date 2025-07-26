import * as dom from './dom.js';
import * as sound from './sound.js';
import * as state from './state.js';
import * as game from './game.js';

export let storyState = {
    lostToVersatrix: false,
};
export let currentStoryNodeId = null;
let typewriterTimeout = null;

export function setStoryState(newState) {
    storyState = newState;
}

export const storyDialogue = {
    'start_necroverso': {
        character: 'player',
        image: null,
        text: '',
        options: [{ text: 'Onde estou?...', next: 'necroverso_1' }]
    },
    'necroverso_1': {
        character: 'Necroverso', image: 'necroverso.png',
        text: 'Você está no Inversun...',
        options: [{ text: 'Como eu vim...?', next: 'necroverso_2' }, { text: 'Quem é você...?', next: 'necroverso_2' }]
    },
    'necroverso_2': {
        character: 'Necroverso', image: 'necroverso.png',
        text: 'Eu sou o Necroverso e vamos resumir, se você quiser retornar ao seu mundo, deverá desafiar os soberanos desse lugar...',
        options: [{ text: 'Soberanos...?', next: 'necroverso_3' }, { text: 'Desafiar...?', next: 'necroverso_3' }]
    },
    'necroverso_3': {
        character: 'Necroverso', image: 'necroverso.png',
        text: 'Olha... eu sei que nada faz sentido, mas é o único jeito, eles que controlam esse mundo, são os três reis... Contravox, Versatrix e Reversum',
        next: 'necroverso_4', isContinue: true
    },
    'necroverso_4': {
        character: 'Necroverso', image: 'necroverso.png',
        text: 'Aqui as regras desse mundo são diferentes... ao se desafiar um soberano deverá jogar pelas suas regras... um carteado! Não é truco e nem poker, é um jogo que eles inventaram...',
        next: 'necroverso_5', isContinue: true
    },
    'necroverso_5': {
        character: 'Necroverso', image: 'necroverso.png',
        text: 'Mas não se preocupe... ao desafiar um soberano a única coisa que será colocada em jogo é a sua morte...',
        options: [{ text: "Morte???", next: 'necroverso_6' }]
    },
    'necroverso_6': {
        character: 'Necroverso', image: 'necroverso.png',
        text: 'É... aqui parece que tudo meio que ao contrário... afinal estamos no Inversus.\nEu vou te enviar para que tenha uma audiência real com cada um deles, se assim desejar... o que acha?',
        options: [{ text: 'Isso parece perigoso...', next: 'necroverso_final' }, { text: 'Isso não faz sentido...', next: 'necroverso_final' }, { text: 'Vamos nessa!', next: 'necroverso_final' }]
    },
    'necroverso_final': {
        character: 'Necroverso', image: 'necroverso.png',
        text: 'Eu sabia que iria concordar com os termos... boa sorte!',
        next: 'tutorial_offer', isContinue: true,
    },
    'tutorial_offer': {
        character: 'Necroverso', image: 'necroverso.png',
        text: 'Antes de levá-lo ao primeiro confronto, deseja jogar uma partida comigo para aprender como se joga?',
        options: [
            { text: 'Sim', next: 'tutorial_accept' },
            { text: 'Não', next: 'pre_contravox_tip' }
        ]
    },
     'tutorial_accept': {
        character: 'Necroverso', image: 'necroverso.png',
        text: 'É hora do duelo!',
        isEndStory: true,
        startGame: { battle: 'tutorial' }
    },
    'tutorial_1_basics_1': {
        character: 'Necroverso', image: 'necroverso.png',
        text: 'O jogo é uma mistura de cartas com tabuleiro, cada vez que se vence o jogo de cartas o seu peão irá avançar uma casa...',
        isContinue: true, next: 'tutorial_1_basics_2'
    },
    'tutorial_1_basics_2': {
        character: 'Necroverso', image: 'necroverso.png',
        text: '...porém não é tão simples... para se ganhar terá que ter o maior valor das cartas na rodada. Você jogará duas cartas, uma por vez, em cada turno e a soma delas será sua pontação, alguma dúvida?',
        options: [
            { text: "Muitas...", next: 'tutorial_2_draw_intro' },
            { text: "Não entendi nada", next: 'tutorial_2_draw_intro' },
            { text: "Parece fácil", next: 'tutorial_2_draw_intro' }
        ]
    },
    'tutorial_2_draw_intro': {
        character: 'Necroverso', image: 'necroverso.png',
        text: 'Não se preocupe, vou te mostrar... mas antes vamos decidir a ordem de quem começará a jogar, puxe uma carta e eu puxarei outra, vamos revela-las... quem tiver o maior começa.',
        action: 'startTutorialDraw', isEndStory: true
    },
    'tutorial_3_explain_hand': {
        character: 'Necroverso', image: 'necroverso.png',
        text: 'Agora você sacará 3 cartas de valor, e 2 cartas de efeito. Por enquanto vamos focar só nas de valores... faça sua jogada.',
        isContinue: true, action: 'letPlayerPlay'
    },
    'tutorial_4_after_turn_1': {
        character: 'Necroverso', image: 'necroverso.png',
        textDynamic: (winner) => `Certo, vamos ver quem está ganhando. ${winner ? 'Parabéns... você está na frente... por enquanto.' : 'Que pena... você não parece estar com sorte.'}`,
        isContinue: true, next: 'tutorial_5_explain_effects'
    },
    'tutorial_5_explain_effects': {
        character: 'Necroverso', image: 'necroverso.png',
        text: 'Porém agora que as coisas melhoram... as cartas de efeito podem mudar tudo, são 7 cartas. As cartas literalmente são o que são... Sobe, Desce, Pula são cartas de movimento do peão, para avançar ou recuar no tabuleiro ou no caso do Pula, mudar de caminho.',
        isContinue: true, next: 'tutorial_5_explain_effects_2'
    },
    'tutorial_5_explain_effects_2': {
        character: 'Necroverso', image: 'necroverso.png',
        text: 'Já as cartas "Mais/Menos" são cartas para mudar a soma de suas cartas, elas podem somar ou subtrair do seu resto. O conceito de resto é que a última carta jogada vire seu resto na próxima rodada...',
        isContinue: true, next: 'tutorial_5_explain_effects_3'
    },
    'tutorial_5_explain_effects_3': {
        character: 'Necroverso', image: 'necroverso.png',
        text: 'Já as cartas Reverso e Reverso Total são cartas que mudam os efeitos das outras cartas... enfim, chega de falar, vamos à demonstração.',
        isContinue: true, action: 'letPlayerPlay'
    },
    'tutorial_6_end_match': {
        character: 'Necroverso', image: 'necroverso.png',
        text: 'Lembre-se se o seu ou o meu peão cair nas casas coloridas coisas vão acontecer... as vermelhas... elas são ardilosas, prefira sempre as azuis',
        isContinue: true, next: 'tutorial_6_end_match_2'
    },
    'tutorial_6_end_match_2': {
        character: 'Necroverso', image: 'necroverso.png',
        text: 'e com isso finalizamos o tutorial... espero que tenha entendido tudo',
        options: [
            { text: "Eu ainda não entendi nada", next: 'tutorial_end' },
            { text: "Tutorial zuado", next: 'tutorial_end' }
        ]
    },
    'tutorial_end': {
        action: 'endTutorial', isEndScene: true, nextScene: 'pre_contravox_tip'
    },
     'pre_contravox_tip': {
        character: 'Necroverso', image: 'necroverso3.png',
        text: "Vou te contar dois segredos sobre o Contravox para te ajudar no seu duelo...",
        options: [
            { text: "Dica é bom", next: 'pre_contravox_tip_2' },
            { text: "Não quero dicas", next: 'pre_contravox_tip_2' }
        ]
    },
    'pre_contravox_tip_2': {
        character: 'Necroverso', image: 'necroverso3.png',
        text: "Como eu sou legal vou te contar... Contravox é o mais fraco dos três... e ele tem uma habilidade especial... cuidado com ela!",
        options: [
            { text: "Isso era pra ser um segredo?", next: 'start_contravox' },
            { text: "Obrigado", next: 'start_contravox' }
        ]
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
        next: 'pre_versatrix_tip', isContinue: true
    },
    'pre_versatrix_tip': {
        character: 'Necroverso', image: 'necroverso3.png',
        text: "A Versatrix é do signo de gêmeos... e ela é valiosa!",
        options: [
            { text: "Certo... signos...", next: 'start_versatrix_dialogue' },
            { text: "Conceito de valor?", next: 'start_versatrix_dialogue' }
        ]
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
        next: 'pre_reversum_tip', isContinue: true
    },
     'pre_reversum_tip': {
        character: 'Necroverso', image: 'necroverso3.png',
        text: "Duas informações valiosas... ele é o mais poderoso e ele é imune ao vermelho!",
        options: [
            { text: "Isso deveria me ajudar?", next: 'start_reversum' },
            { text: "Espero que isso acabe logo", next: 'start_reversum' }
        ]
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
        character: 'Necroverso', image: 'necroverso2.png',
        text: "Finalmente com eles derrotados o Invesun me pertence",
        options: [{ text: "Certo... e nosso acordo?", next: 'final_confrontation_1' }]
    },
    'final_confrontation_1': {
        character: 'Necroverso', image: 'necroverso2.png',
        text: "Eu não menti, darei a chance que retorne porém se me derrotar",
        options: [
            { text: "Estava fácil demais...", next: 'final_battle_1v3', condition: () => !storyState.lostToVersatrix },
            { text: "Versatrix?", next: 'pre_necro_final_tip', condition: () => storyState.lostToVersatrix }
        ]
    },
     'pre_necro_final_tip': {
        character: 'Necroverso', image: 'necroverso3.png',
        text: "Duas dicas pra você... seu tempo acabou e não existe escapatória!",
        options: [
            { text: "Isso não me pareceu uma dica...", next: 'final_battle_2v2' },
            { text: "Ah saquei!", next: 'final_battle_2v2' }
        ]
    },
    'final_battle_1v3': {
        isEndStory: true,
        startGame: { battle: 'necroverso_final_1v3' }
    },
    'final_battle_2v2': {
        isEndStory: true,
        startGame: { battle: 'necroverso_final_2v2' }
    }
};

const typewriter = (element, text, onComplete) => {
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
        } else {
            if (onComplete) onComplete();
        }
    }
    type();
};

const updateStoryStars = (character) => {
    if (!dom.storyStarsBackgroundEl) return;
    dom.storyStarsBackgroundEl.innerHTML = ''; // Clear old stars

    const characterColors = {
        'Necroverso': '#FFFFFF',
        'Contravox': '#52b788', // Green
        'Versatrix': '#fca311', // Yellow
        'Reversum': '#e63946', // Red
    };

    const color = characterColors[character] || 'transparent';
    if (color === 'transparent') return;

    const numStars = 100;
    for (let i = 0; i < numStars; i++) {
        const star = document.createElement('div');
        star.className = 'story-bg-star';
        star.style.color = color;

        const startX = `${Math.random() * 100}vw`;
        const startY = `${Math.random() * 100}vh`;
        const endX = `${Math.random() * 100}vw`;
        const endY = `${Math.random() * 100}vh`;

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

export const handleTutorialProgression = () => {
    if (!state.gameState.tutorial?.isActive) return;

    const tutorialState = state.gameState.tutorial;

    switch (tutorialState.step) {
        case 'intro':
            dom.appContainerEl.classList.add('hidden'); // Hide game, show dialogue
            dom.storyModeModalEl.classList.remove('hidden');
            dom.storySceneDialogueEl.classList.remove('hidden');
            tutorialState.step = 'basics';
            renderStoryNode('tutorial_1_basics_1');
            break;
        case 'draw':
            tutorialState.step = 'hand_explained';
            game.finalizeGameStart(); // This will deal cards
            // After dealing, show next dialogue
            setTimeout(() => renderStoryNode('tutorial_3_explain_hand'), 500);
            break;
    }
};

export const startTutorialDraw = () => {
    dom.storyModeModalEl.classList.add('hidden');
    dom.appContainerEl.classList.remove('hidden');
    state.gameState.tutorial.step = 'draw';
    game.initiateGameStartSequence(true); // Pass flag to indicate tutorial
};

export const renderStoryNode = (nodeId, dynamicParams = {}) => {
    currentStoryNodeId = nodeId;
    const node = storyDialogue[nodeId];
    if (!node) {
        console.error(`Story node not found: ${nodeId}`);
        endStory();
        return;
    }

    if (node.action) {
        switch (node.action) {
            case 'startTutorialDraw':
                startTutorialDraw();
                return;
            case 'letPlayerPlay':
                dom.storyModeModalEl.classList.add('hidden');
                dom.appContainerEl.classList.remove('hidden');
                game.endGameCheck();
                return;
            case 'endTutorial':
                state.gameState.tutorial = null;
                break;
        }
    }

    if (node.isEndStory) {
        endStory();
        let gameOptions;
        switch (node.startGame.battle) {
            case 'tutorial':
                gameOptions = { story: { battle: 'tutorial' } };
                game.initializeGame('solo', gameOptions);
                break;
            case 'contravox':
                gameOptions = { story: { battle: 'contravox', playerIds: ['player-1', 'player-3'], overrides: { 'player-3': { name: 'Contravox', aiType: 'contravox' } } } };
                game.initializeGame('solo', gameOptions);
                break;
            case 'versatrix':
                gameOptions = { story: { battle: 'versatrix', playerIds: ['player-1', 'player-4'], overrides: { 'player-4': { name: 'Versatrix', aiType: 'versatrix' } } } };
                game.initializeGame('solo', gameOptions);
                break;
            case 'reversum':
                gameOptions = { story: { battle: 'reversum', playerIds: ['player-1', 'player-2'], overrides: { 'player-2': { name: 'Rei Reversum', aiType: 'reversum' } } } };
                game.initializeGame('solo', gameOptions);
                break;
            case 'necroverso_final_1v3':
                gameOptions = { story: { battle: 'necroverso_final_1v3', type: '1v3_necro', playerIds: ['player-1', 'player-2', 'player-3', 'player-4'], overrides: { 'player-2': { name: 'Necroverso', aiType: 'necroverso' }, 'player-3': { name: 'Necroverso', aiType: 'necroverso' }, 'player-4': { name: 'Necroverso', aiType: 'necroverso' } } } };
                game.initializeGame('solo', gameOptions);
                break;
            case 'necroverso_final_2v2':
                gameOptions = { story: { battle: 'necroverso_final_2v2', type: '2v2_necro_versatrix', playerIds: ['player-1', 'player-2', 'player-3', 'player-4'], overrides: { 'player-2': { name: 'Necroverso Final', aiType: 'necroverso-final' }, 'player-3': { name: 'Necroverso Final', aiType: 'necroverso-final' }, 'player-4': { name: 'Versatrix', aiType: 'versatrix' } } } };
                game.initializeGame('duo', gameOptions);
                break;
        }
        return;
    }

    updateStoryStars(node.character);

    const previousImageName = dom.storyCharacterImageEl.dataset.imageName;
    const nextImageName = node.image || '';

    dom.storyCharacterImageEl.classList.toggle('glowing', nextImageName === 'necroverso2.png' || nextImageName === 'necroverso3.png');


    if (previousImageName !== nextImageName) {
        dom.storyCharacterImageEl.style.opacity = 0;
        setTimeout(() => {
            dom.storyCharacterImageEl.src = nextImageName;
            dom.storyCharacterImageEl.dataset.imageName = nextImageName;
            if (nextImageName) {
                dom.storyCharacterImageEl.style.opacity = 1;
            }
        }, 450);
    } else if (!nextImageName) {
        dom.storyCharacterImageEl.style.opacity = 0;
    }

    dom.storyDialogueOptionsEl.innerHTML = '';

    const onTypingComplete = () => {
        if (node.options) {
            node.options.forEach(option => {
                if (option.condition && !option.condition()) return;
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

    const text = node.textDynamic ? node.textDynamic(dynamicParams.winner) : node.text;
    typewriter(dom.storyDialogueTextEl, text || '', onTypingComplete);
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
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;

        stars.forEach(star => {
            const rect = star.getBoundingClientRect();
            star.style.setProperty('--tx-from', `${rect.left}px`);
            star.style.setProperty('--ty-from', `${rect.top}px`);
            star.style.setProperty('--tx-to', `${centerX}px`);
            star.style.setProperty('--ty-to', `${centerY}px`);
            star.classList.add('spiraling');
        });

        sound.playCustomSound('wind10.wav');

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
        sound.playStoryMusic('interludio.ogg');
        renderStoryNode('start_necroverso');
    }, 1000);
};

export const startStoryMode = () => {
    dom.musicPlayer.pause();
    dom.musicPlayer.src = '';

    sound.initializeMusic();
    setStoryState({ lostToVersatrix: false });
    dom.splashScreenEl.classList.add('hidden');
    dom.storyModeModalEl.classList.remove('hidden');

    if (dom.storyStarsBackgroundEl) dom.storyStarsBackgroundEl.innerHTML = '';
    dom.storyCharacterImageEl.src = '';
    dom.storyCharacterImageEl.dataset.imageName = '';
    dom.storyCharacterImageEl.style.opacity = 0;
    dom.storyCharacterImageEl.classList.remove('glowing');

    showScene1();
};

export function endStory() {
    dom.storyModeModalEl.classList.add('hidden');
    dom.storySceneDialogueEl.classList.add('hidden');
    dom.storyCharacterImageEl.src = '';
    dom.storyCharacterImageEl.dataset.imageName = '';
}