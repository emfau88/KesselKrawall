export type GameSound =
  | "uiClick"
  | "uiSelect"
  | "purchase"
  | "sell"
  | "reroll"
  | "error"
  | "cauldronFull"
  | "merge2"
  | "merge3"
  | "fire"
  | "poison"
  | "shield"
  | "heal"
  | "hit"
  | "victory"
  | "defeat";

export type GameAudioScene = "menu" | "shop" | "battle" | "boss" | "result";
export type CombatSound = Extract<
  GameSound,
  "fire" | "poison" | "shield" | "heal" | "hit"
>;
export type CombatSoundTier = "hero" | "standard" | "ambient";

export interface CombatSoundPlaybackPolicy {
  minIntervalMs: number;
  sameSoundIntervalMs: number;
  maxVoices: number;
}

interface ToneStep {
  frequency: number;
  duration: number;
  delay?: number;
  endFrequency?: number;
  type?: OscillatorType;
  gain?: number;
}

interface AudioFile {
  path: string;
  volume: number;
}

type MusicTrack = "menu" | "battle" | "boss";

const AUDIO_ROOT = "assets/audio";
const MUSIC_VOLUME = 0.36;
const AMBIENCE_VOLUME = 0.14;
const MUSIC_FADE_MS = 650;
const AMBIENCE_FADE_MS = 450;

const SOUND_FILES: Partial<Record<GameSound, AudioFile>> = {
  uiClick: { path: "sfx/ui-click.ogg", volume: 0.72 },
  uiSelect: { path: "sfx/ui-select.ogg", volume: 0.72 },
  purchase: { path: "sfx/purchase.ogg", volume: 0.8 },
  sell: { path: "sfx/sell.ogg", volume: 0.8 },
  reroll: { path: "sfx/reroll.ogg", volume: 0.78 },
  error: { path: "sfx/error.ogg", volume: 0.82 },
  cauldronFull: { path: "sfx/cauldron-full.ogg", volume: 0.82 },
  merge2: { path: "sfx/merge-level-2.ogg", volume: 0.84 },
  merge3: { path: "sfx/merge-level-3.ogg", volume: 0.88 },
  fire: { path: "combat/fire.ogg", volume: 0.53 },
  poison: { path: "combat/poison.ogg", volume: 0.48 },
  shield: { path: "combat/shield.ogg", volume: 0.53 },
  heal: { path: "combat/heal.ogg", volume: 0.55 },
  hit: { path: "combat/hit.ogg", volume: 0.53 },
  victory: { path: "sfx/result-victory.ogg", volume: 0.9 },
  defeat: { path: "sfx/result-defeat.ogg", volume: 0.86 },
};

const MUSIC_FILES: Record<MusicTrack, string> = {
  menu: "music/menu.ogg",
  battle: "music/battle.ogg",
  boss: "music/boss.ogg",
};

const SCENE_MUSIC: Record<GameAudioScene, MusicTrack | null> = {
  menu: "menu",
  shop: "menu",
  battle: "battle",
  boss: "boss",
  result: null,
};

const SOUND_STEPS: Partial<Record<GameSound, readonly ToneStep[]>> = {
  uiClick: [
    { frequency: 460, endFrequency: 540, duration: 0.045, type: "triangle", gain: 0.025 },
  ],
  uiSelect: [
    { frequency: 480, duration: 0.055, type: "triangle", gain: 0.03 },
    { frequency: 650, duration: 0.07, delay: 0.045, type: "sine", gain: 0.025 },
  ],
  purchase: [
    { frequency: 520, endFrequency: 650, duration: 0.07, type: "triangle" },
    { frequency: 760, duration: 0.08, delay: 0.065, type: "triangle" },
  ],
  sell: [
    { frequency: 690, endFrequency: 520, duration: 0.08, type: "triangle", gain: 0.04 },
    { frequency: 460, duration: 0.09, delay: 0.065, type: "triangle", gain: 0.035 },
  ],
  reroll: [
    { frequency: 330, endFrequency: 520, duration: 0.06, type: "square", gain: 0.035 },
    { frequency: 440, endFrequency: 690, duration: 0.06, delay: 0.07, type: "square", gain: 0.035 },
    { frequency: 550, endFrequency: 820, duration: 0.06, delay: 0.14, type: "square", gain: 0.035 },
  ],
  error: [
    { frequency: 230, endFrequency: 165, duration: 0.14, type: "triangle", gain: 0.04 },
  ],
  cauldronFull: [
    { frequency: 260, duration: 0.09, type: "square", gain: 0.035 },
    { frequency: 190, duration: 0.16, delay: 0.08, type: "triangle", gain: 0.04 },
  ],
  merge2: [
    { frequency: 330, duration: 0.1, type: "triangle" },
    { frequency: 494, duration: 0.12, delay: 0.08, type: "triangle" },
    { frequency: 659, duration: 0.18, delay: 0.17, type: "sine" },
  ],
  merge3: [
    { frequency: 262, duration: 0.1, type: "triangle" },
    { frequency: 392, duration: 0.12, delay: 0.08, type: "triangle" },
    { frequency: 523, duration: 0.14, delay: 0.17, type: "triangle" },
    { frequency: 784, duration: 0.26, delay: 0.28, type: "sine", gain: 0.07 },
  ],
  fire: [
    { frequency: 220, endFrequency: 110, duration: 0.18, type: "sawtooth", gain: 0.045 },
    { frequency: 480, endFrequency: 260, duration: 0.12, type: "triangle", gain: 0.035 },
  ],
  poison: [
    { frequency: 185, endFrequency: 245, duration: 0.2, type: "sine", gain: 0.055 },
    { frequency: 280, endFrequency: 170, duration: 0.18, delay: 0.04, type: "triangle", gain: 0.03 },
  ],
  shield: [
    { frequency: 740, endFrequency: 980, duration: 0.16, type: "sine", gain: 0.045 },
    { frequency: 370, duration: 0.2, type: "triangle", gain: 0.03 },
  ],
  heal: [
    { frequency: 440, endFrequency: 660, duration: 0.18, type: "sine" },
    { frequency: 660, endFrequency: 880, duration: 0.18, delay: 0.1, type: "sine", gain: 0.04 },
  ],
  hit: [
    { frequency: 120, endFrequency: 55, duration: 0.09, type: "square", gain: 0.05 },
  ],
  victory: [
    { frequency: 392, duration: 0.16, type: "triangle" },
    { frequency: 523, duration: 0.18, delay: 0.14, type: "triangle" },
    { frequency: 659, duration: 0.22, delay: 0.29, type: "triangle" },
    { frequency: 784, duration: 0.35, delay: 0.46, type: "sine", gain: 0.065 },
  ],
  defeat: [
    { frequency: 330, endFrequency: 260, duration: 0.2, type: "triangle" },
    { frequency: 247, endFrequency: 165, duration: 0.32, delay: 0.18, type: "sawtooth", gain: 0.035 },
  ],
};

let audioContext: AudioContext | null = null;
let desiredScene: GameAudioScene = "menu";
let currentMusicTrack: MusicTrack | null = null;
let currentMusic: HTMLAudioElement | null = null;
let currentAmbience: HTMLAudioElement | null = null;
let activationListenersInstalled = false;
let combatSoundsEnabled = true;
const preloadedSounds = new Map<GameSound, HTMLAudioElement>();
const activeOneShots = new Set<HTMLAudioElement>();
const activeCombatOneShots = new Set<HTMLAudioElement>();
const lastCombatSoundAt = new Map<CombatSound, number>();
let lastAnyCombatSoundAt = Number.NEGATIVE_INFINITY;
const fadeVersions = new WeakMap<HTMLMediaElement, number>();

function assetUrl(path: string): string {
  return new URL(`${AUDIO_ROOT}/${path}`, document.baseURI).href;
}

function createMedia(path: string, loop: boolean): HTMLAudioElement {
  const media = new Audio(assetUrl(path));
  media.loop = loop;
  media.preload = loop ? "metadata" : "auto";
  return media;
}

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Context =
    window.AudioContext ??
    (
      window as typeof window & {
        webkitAudioContext?: typeof AudioContext;
      }
    ).webkitAudioContext;
  if (!Context) return null;
  audioContext ??= new Context();
  if (audioContext.state === "suspended") {
    void audioContext.resume();
  }
  return audioContext;
}

function fadeMedia(
  media: HTMLMediaElement,
  targetVolume: number,
  durationMs: number,
  onComplete?: () => void,
): void {
  const version = (fadeVersions.get(media) ?? 0) + 1;
  fadeVersions.set(media, version);
  const startVolume = media.volume;
  const startedAt = performance.now();

  const update = (now: number) => {
    if (fadeVersions.get(media) !== version) return;
    const progress = Math.max(
      0,
      Math.min(1, (now - startedAt) / durationMs),
    );
    media.volume = startVolume + (targetVolume - startVolume) * progress;
    if (progress < 1) {
      window.requestAnimationFrame(update);
      return;
    }
    onComplete?.();
  };

  window.requestAnimationFrame(update);
}

function safelyPlay(
  media: HTMLMediaElement,
  targetVolume: number,
  fadeMs: number,
): void {
  const attempt = media.play();
  if (attempt === undefined) {
    fadeMedia(media, targetVolume, fadeMs);
    return;
  }
  void attempt
    .then(() => fadeMedia(media, targetVolume, fadeMs))
    .catch(() => {
      // Browsers may reject autoplay before the first pointer or keyboard input.
      // The retained desired scene is retried by the activation listeners below.
    });
}

function transitionMusic(nextTrack: MusicTrack | null): void {
  if (nextTrack === currentMusicTrack && currentMusic) {
    if (currentMusic.paused) safelyPlay(currentMusic, MUSIC_VOLUME, MUSIC_FADE_MS);
    return;
  }

  const previous = currentMusic;
  if (previous) {
    fadeMedia(previous, 0, MUSIC_FADE_MS, () => {
      previous.pause();
      previous.currentTime = 0;
    });
  }

  currentMusicTrack = nextTrack;
  currentMusic = nextTrack ? createMedia(MUSIC_FILES[nextTrack], true) : null;
  if (!currentMusic) return;
  currentMusic.volume = 0;
  safelyPlay(currentMusic, MUSIC_VOLUME, MUSIC_FADE_MS);
}

function transitionAmbience(enabled: boolean): void {
  if (enabled && currentAmbience) {
    if (currentAmbience.paused) {
      safelyPlay(currentAmbience, AMBIENCE_VOLUME, AMBIENCE_FADE_MS);
    }
    return;
  }
  if (enabled) {
    currentAmbience = createMedia("ambience/cauldron-bubbles.ogg", true);
    currentAmbience.volume = 0;
    safelyPlay(currentAmbience, AMBIENCE_VOLUME, AMBIENCE_FADE_MS);
    return;
  }
  if (!currentAmbience) return;
  const previous = currentAmbience;
  currentAmbience = null;
  fadeMedia(previous, 0, AMBIENCE_FADE_MS, () => {
    previous.pause();
    previous.currentTime = 0;
  });
}

function applyDesiredScene(): void {
  transitionMusic(SCENE_MUSIC[desiredScene]);
  transitionAmbience(desiredScene === "menu" || desiredScene === "shop");
}

function removeActivationListeners(): void {
  if (!activationListenersInstalled) return;
  document.removeEventListener("pointerdown", handleUserActivation);
  document.removeEventListener("keydown", handleUserActivation);
  activationListenersInstalled = false;
}

function handleUserActivation(): void {
  removeActivationListeners();
  getContext();
  applyDesiredScene();
}

function installActivationListeners(): void {
  if (activationListenersInstalled || typeof document === "undefined") return;
  document.addEventListener("pointerdown", handleUserActivation);
  document.addEventListener("keydown", handleUserActivation);
  activationListenersInstalled = true;
}

function playTone(sound: GameSound): void {
  const steps = SOUND_STEPS[sound];
  if (!steps) return;
  const context = getContext();
  if (!context) return;
  const start = context.currentTime + 0.008;

  for (const step of steps) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const stepStart = start + (step.delay ?? 0);
    const stepEnd = stepStart + step.duration;
    oscillator.type = step.type ?? "sine";
    oscillator.frequency.setValueAtTime(step.frequency, stepStart);
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(20, step.endFrequency ?? step.frequency),
      stepEnd,
    );
    gain.gain.setValueAtTime(0.0001, stepStart);
    gain.gain.exponentialRampToValueAtTime(
      step.gain ?? 0.05,
      stepStart + 0.015,
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, stepEnd);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(stepStart);
    oscillator.stop(stepEnd + 0.02);
  }
}

export function preloadGameAudio(): void {
  if (typeof window === "undefined") return;
  for (const [sound, file] of Object.entries(SOUND_FILES) as Array<
    [GameSound, AudioFile]
  >) {
    if (preloadedSounds.has(sound)) continue;
    const media = createMedia(file.path, false);
    preloadedSounds.set(sound, media);
    media.load();
  }
}

export function setGameAudioScene(scene: GameAudioScene): void {
  desiredScene = scene;
  if (typeof window === "undefined") return;
  installActivationListeners();
  applyDesiredScene();
}

export function activateGameAudio(): void {
  if (typeof window === "undefined") return;
  handleUserActivation();
}

export function setCombatSoundsEnabled(enabled: boolean): void {
  combatSoundsEnabled = enabled;
  lastCombatSoundAt.clear();
  lastAnyCombatSoundAt = Number.NEGATIVE_INFINITY;
  if (enabled) return;
  for (const sound of activeCombatOneShots) {
    sound.pause();
    sound.currentTime = 0;
    activeOneShots.delete(sound);
  }
  activeCombatOneShots.clear();
}

export function getCombatSoundsEnabled(): boolean {
  return combatSoundsEnabled;
}

export function stopGameAudio(): void {
  removeActivationListeners();
  if (currentMusic) {
    currentMusic.pause();
    currentMusic.currentTime = 0;
  }
  if (currentAmbience) {
    currentAmbience.pause();
    currentAmbience.currentTime = 0;
  }
  for (const sound of activeOneShots) {
    sound.pause();
  }
  activeOneShots.clear();
  activeCombatOneShots.clear();
  lastCombatSoundAt.clear();
  lastAnyCombatSoundAt = Number.NEGATIVE_INFINITY;
  currentMusic = null;
  currentMusicTrack = null;
  currentAmbience = null;
}

function playFileSound(
  sound: GameSound,
  file: AudioFile,
  combat = false,
): void {
  if (!file) {
    playTone(sound);
    return;
  }

  const template = preloadedSounds.get(sound);
  const media = template
    ? (template.cloneNode(true) as HTMLAudioElement)
    : createMedia(file.path, false);
  media.volume = file.volume;
  activeOneShots.add(media);
  if (combat) activeCombatOneShots.add(media);
  const cleanup = () => {
    activeOneShots.delete(media);
    activeCombatOneShots.delete(media);
  };
  media.addEventListener("ended", cleanup, { once: true });
  media.addEventListener("error", cleanup, { once: true });

  const attempt = media.play();
  if (attempt === undefined) return;
  void attempt.catch(() => {
    cleanup();
    playTone(sound);
  });
}

export function getCombatSoundPlaybackPolicy(
  speed: number,
  tier: CombatSoundTier,
): CombatSoundPlaybackPolicy {
  if (tier === "hero") {
    return {
      minIntervalMs: 120,
      sameSoundIntervalMs: 260,
      maxVoices: 2,
    };
  }
  if (speed >= 4) {
    return {
      minIntervalMs: 320,
      sameSoundIntervalMs: 760,
      maxVoices: 1,
    };
  }
  if (speed >= 2) {
    return {
      minIntervalMs: 240,
      sameSoundIntervalMs: 600,
      maxVoices: 2,
    };
  }
  return {
    minIntervalMs: 180,
    sameSoundIntervalMs: 450,
    maxVoices: 2,
  };
}

export function playCombatSound(
  sound: CombatSound,
  speed: number,
  tier: CombatSoundTier,
): void {
  if (typeof window === "undefined" || !combatSoundsEnabled) return;
  const file = SOUND_FILES[sound];
  if (!file) {
    playTone(sound);
    return;
  }

  const now = performance.now();
  const policy = getCombatSoundPlaybackPolicy(speed, tier);
  const lastSameSoundAt =
    lastCombatSoundAt.get(sound) ?? Number.NEGATIVE_INFINITY;

  if (
    tier !== "hero" &&
    (now - lastAnyCombatSoundAt < policy.minIntervalMs ||
      now - lastSameSoundAt < policy.sameSoundIntervalMs ||
      activeCombatOneShots.size >= policy.maxVoices)
  ) {
    return;
  }

  if (tier === "hero" && activeCombatOneShots.size >= policy.maxVoices) {
    const oldest = activeCombatOneShots.values().next().value;
    if (oldest) {
      oldest.pause();
      oldest.currentTime = 0;
      activeCombatOneShots.delete(oldest);
      activeOneShots.delete(oldest);
    }
  }

  lastAnyCombatSoundAt = now;
  lastCombatSoundAt.set(sound, now);
  playFileSound(sound, file, true);
}

export function playGameSound(sound: GameSound): void {
  if (typeof window === "undefined") return;
  const file = SOUND_FILES[sound];
  if (!file) {
    playTone(sound);
    return;
  }
  playFileSound(sound, file);
}
