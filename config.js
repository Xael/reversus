export const MASTER_PLAYER_IDS = ['player-1', 'player-2', 'player-3', 'player-4'];

export let PLAYER_CONFIG = {
    'player-1': { name: 'Você', color: 'var(--player-1-color)', isHuman: true },
    'player-2': { name: 'Jogador 2', color: 'var(--player-2-color)', isHuman: false, aiType: 'default' },
    'player-3': { name: 'Jogador 3', color: 'var(--player-3-color)', isHuman: false, aiType: 'default' },
    'player-4': { name: 'Jogador 4', color: 'var(--player-4-color)', isHuman: false, aiType: 'default' },
};

export const originalPlayerConfig = {
    'player-1': { name: 'Você', color: 'var(--player-1-color)', isHuman: true },
    'player-2': { name: 'Jogador 2', color: 'var(--player-2-color)', isHuman: false, aiType: 'default' },
    'player-3': { name: 'Jogador 3', color: 'var(--player-3-color)', isHuman: false, aiType: 'default' },
    'player-4': { name: 'Jogador 4', color: 'var(--player-4-color)', isHuman: false, aiType: 'default' },
    'contravox': { name: 'Contravox', aiType: 'contravox', isHuman: false },
    'versatrix': { name: 'Versatrix', aiType: 'versatrix', isHuman: false },
    'reversum': { name: 'Rei Reversum', aiType: 'reversum', isHuman: false },
    'necroverso': { name: 'Necroverso', aiType: 'necroverso', isHuman: false },
    'necroverso-final': { name: 'Necroverso Final', aiType: 'necroverso-final', isHuman: false }
};

export const TEAM_A = ['player-1', 'player-3'];
export const TEAM_B = ['player-2', 'player-4'];

export const VALUE_DECK_CONFIG = [{ value: 2, count: 12 }, { value: 4, count: 10 }, { value: 6, count: 8 }, { value: 8, count: 6 }, { value: 10, count: 4 }];
export const EFFECT_DECK_CONFIG = [{ name: 'Mais', count: 4 }, { name: 'Menos', count: 4 }, { name: 'Sobe', count: 4 }, { name: 'Desce', count: 4 }, { name: 'Pula', count: 4 }, { name: 'Reversus', count: 4 }, { name: 'Reversus Total', count: 1 }];

export const MUSIC_TRACKS = ['jogo.ogg', 'jogo2.ogg', 'jogo3.ogg'];

export const ALL_CARD_IMAGES = [
    'verso_valor.png', 'verso_efeito.png', 'frente_2.png', 'frente_4.png',
    'frente_6.png', 'frente_8.png', 'frente_10.png', 'frente_mais.png',
    'frente_menos.png', 'frente_sobe.png', 'frente_desce.png', 'frente_pula.png',
    'frente_reversus.png', 'frente_reversustotal.png', 'cartacontravox.png', 'cartanecroverso.png'
];

export const SPLASH_SCREEN_CARD_IMAGES = [
    'verso_valor.png', 'verso_efeito.png', 'frente_2.png', 'frente_4.png',
    'frente_6.png', 'frente_8.png', 'frente_10.png', 'frente_mais.png',
    'frente_menos.png', 'frente_sobe.png', 'frente_desce.png', 'frente_pula.png',
    'frente_reversus.png', 'frente_reversustotal.png'
];

export const POSITIVE_EFFECTS = {
    'Resto Maior': 'Seu resto nesta rodada é 10. Se estiver em dupla o resto da dupla é 10.',
    'Carta Menor': 'Descarte a menor carta de valor e compre uma nova. Se estiver em dupla, a dupla também o faz.',
    'Jogo Aberto': 'Seus oponentes jogam com as cartas da mão reveladas nesta rodada.',
    'Imunidade': 'Você está imune a cartas "Menos" e "Desce" nesta rodada. Se em dupla, sua dupla também.',
    'Desafio': 'Se vencer a rodada sem usar "Mais" ou "Sobe", avance 3 casas. Se em dupla, o desafio vale para a dupla.',
    'Impulso': 'Se perder a rodada, você ainda avança 1 casa. Se em dupla, sua dupla também.',
    'Troca Justa': 'Você escolhe um oponente: você dá sua carta de valor mais baixa e recebe a mais alta dele. Em dupla, o mesmo ocorre entre os parceiros.',
    'Reversus Total': 'A rodada começa com o efeito da carta "Reversus Total" ativado para todos.'
};

export const NEGATIVE_EFFECTS = {
    'Resto Menor': 'Seu resto nesta rodada é 2. Se estiver em dupla o resto da dupla é 2.',
    'Carta Maior': 'Descarte a maior carta de valor e compre uma nova. Se estiver em dupla, sua dupla descarta uma carta maior da mão e compra uma nova.',
    'Super Exposto': 'Efeitos de "Menos" e "Desce" são dobrados contra você. Se em dupla, sua dupla também sofre.',
    'Castigo': 'Se perder a rodada, você voltará 3 casas. Se em dupla, a dupla também volta.',
    'Parada': 'Se vencer a rodada, você não ganha o bônus de avanço. Se em dupla, a dupla não avança.',
    'Jogo Aberto': 'Você joga com as cartas da mão reveladas nesta rodada. Se em dupla, sua dupla também.',
    'Troca Injusta': 'Um oponente aleatório é escolhido: você é forçado a dar sua carta de valor mais alta e receber a mais baixa dele. Em dupla, o mesmo ocorre entre os parceiros.',
    'Total Revesus Nada!': 'Em modo solo, descarte todas as suas cartas de efeito. Em dupla, você descarta 1 carta de efeito aleatória e seu parceiro descarta até ficar com apenas 1.'
};

export const ACHIEVEMENTS_CONFIG = {
    'first_win': { title: '1° Vitória', description: 'Parabéns você venceu sua primeira partida' },
    'first_loss': { title: '1° Derrota', description: 'A vida é feita de derrotas... não desanima senão o jogo termina' },
    'shes_into_you': { title: 'Ela está tão na sua', description: 'Será que a Versatrix realmente queria vencer?' },
    'speed_run': { title: 'Speed Run', description: 'Ou você teve sorte... ou teve muita sorte!' },
    'defeated_contravox': { title: '!odatorreD!', description: 'elen etnasseretni ed adan met oãn euq rop otxet esse odnel opmet acrep oãN' },
    'defeated_reversum': { title: 'Novo Rei!', description: 'Ele se achava o mais poderoso, mas existe outro Rei agora' },
    'not_true_ending': { title: 'Não é o final verdadeiro', description: 'Você venceu... mas ainda tem um desafio maior' },
    'final_final': { title: 'Final Final', description: 'Parabéns, depois me diz como conseguiu vencer' },
    'all_achievements': { title: 'Todas as Conquistas', description: 'Ual! 100% do jogo lol - Pegue a senha da Sala 12: final' }
};


export const BOARD_SIZE = 9;
export const NUM_PATHS = 6;
export const WINNING_POSITION = 10;
export const MAX_VALUE_CARDS_IN_HAND = 3;
export const MAX_EFFECT_CARDS_IN_HAND = 2;
export const NUM_PLAYERS = 4;
export const COLORED_SPACES_PER_PATH = 3;

export const SAVE_KEY = 'reversus-story-save';
export const ACHIEVEMENTS_SAVE_KEY = 'reversus-achievements-save';