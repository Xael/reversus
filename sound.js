import * as dom from './dom.js';
import * as config from './config.js';
import * as game from './game.js';

let soundState = { muted: false, volume: 0.5 };
let isMusicInitialized = false;
let currentTrackIndex = 0;


export const initializeMusic = () => {
    if (isMusicInitialized) return;
    isMusicInitialized = true;
    updateMusic();
};

export const playCustomSound = (fileName) => {
    if (soundState.muted) return;
    const sfx = new Audio(fileName);
    sfx.volume = soundState.volume;
    sfx.play().catch(e => console.error(`Failed to play sound effect: ${fileName}`, e));
};

export const playSoundEffect = (cardName) => {
    if (soundState.muted) return;
    const sfxName = cardName.toLowerCase().replace(/\s/g, '') + '.ogg';
    const sfx = new Audio(sfxName);

    let volume = soundState.volume;
    const loudEffects = ['mais', 'sobe', 'desce', 'menos', 'reversus', 'reversustotal'];
    if (loudEffects.includes(cardName.toLowerCase().replace(/\s/g, ''))) {
        volume = Math.min(1.0, soundState.volume * 1.5); // Boost volume for specific effects
    }
    sfx.volume = volume;
    sfx.play().catch(e => console.error(`Failed to play sound effect: ${sfxName}`, e));
};

export const playStoryMusic = (track, loop = true) => {
    // Check if the source is already set to avoid restarting the track
    const fullPath = new URL(track, window.location.href).href;
    if (dom.musicPlayer.src === fullPath) return;

    dom.musicPlayer.src = track;
    dom.musicPlayer.loop = loop;
    dom.nextTrackButton.disabled = true;
    updateMusic();
};

export const stopStoryMusic = () => {
    dom.nextTrackButton.disabled = false;
    dom.musicPlayer.src = config.MUSIC_TRACKS[currentTrackIndex];
    updateMusic();
};

export const updateMusic = () => {
    if (soundState.muted) {
        dom.musicPlayer.pause();
    } else {
        if (isMusicInitialized && dom.musicPlayer.src) {
            dom.musicPlayer.play().catch(e => console.error("Music play failed:", e));
        }
    }
    dom.musicPlayer.volume = soundState.volume;
};

export const changeTrack = () => {
    if (config.MUSIC_TRACKS.length <= 1) return;

    let newIndex;
    do {
        newIndex = Math.floor(Math.random() * config.MUSIC_TRACKS.length);
    } while (newIndex === currentTrackIndex);

    currentTrackIndex = newIndex;
    dom.musicPlayer.src = config.MUSIC_TRACKS[currentTrackIndex];
    updateMusic();
};

export const toggleMute = () => {
    soundState.muted = !soundState.muted;
    dom.muteButton.classList.toggle('muted', soundState.muted);
    dom.muteButton.textContent = soundState.muted ? '▶' : '||';
    updateMusic();
};

export const setVolume = (value) => {
    soundState.volume = value;
    dom.volumeSlider.value = String(value);
    updateMusic();
};