export type GameSound =
  | "purchase"
  | "reroll"
  | "merge2"
  | "merge3"
  | "fire"
  | "poison"
  | "shield"
  | "heal"
  | "hit"
  | "victory"
  | "defeat";

interface ToneStep {
  frequency: number;
  duration: number;
  delay?: number;
  endFrequency?: number;
  type?: OscillatorType;
  gain?: number;
}

const SOUND_STEPS: Record<GameSound, readonly ToneStep[]> = {
  purchase: [
    { frequency: 520, endFrequency: 650, duration: 0.07, type: "triangle" },
    { frequency: 760, duration: 0.08, delay: 0.065, type: "triangle" },
  ],
  reroll: [
    { frequency: 330, endFrequency: 520, duration: 0.06, type: "square", gain: 0.035 },
    { frequency: 440, endFrequency: 690, duration: 0.06, delay: 0.07, type: "square", gain: 0.035 },
    { frequency: 550, endFrequency: 820, duration: 0.06, delay: 0.14, type: "square", gain: 0.035 },
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

export function playGameSound(sound: GameSound): void {
  const context = getContext();
  if (!context) return;
  const start = context.currentTime + 0.008;

  for (const step of SOUND_STEPS[sound]) {
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
