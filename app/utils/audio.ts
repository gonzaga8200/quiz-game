/**
 * Sound effects synthesised with the Web Audio API, so there are no audio files and
 * no licences to worry about. The synth talks to a minimal `AudioContext` shape so it
 * can be tested without a browser.
 */

export type SoundName = 'correct' | 'wrong' | 'skip' | 'streak' | 'end'

interface Note {
  readonly freq: number
  /** Seconds after the sound starts. */
  readonly at: number
  readonly length: number
  readonly wave: OscillatorType
  readonly volume: number
  /** Optional pitch glide target (Hz) reached at the end of the note. */
  readonly glideTo?: number
}

export const SOUNDS: Readonly<Record<SoundName, readonly Note[]>> = {
  // Two rising notes: a friendly "ding-ding".
  correct: [
    { freq: 659.25, at: 0, length: 0.14, wave: 'triangle', volume: 0.32 },
    { freq: 880, at: 0.1, length: 0.22, wave: 'triangle', volume: 0.32 },
  ],
  // Low falling buzz.
  wrong: [{ freq: 196, at: 0, length: 0.3, wave: 'sawtooth', volume: 0.2, glideTo: 110 }],
  // Short soft blip.
  skip: [{ freq: 440, at: 0, length: 0.09, wave: 'sine', volume: 0.18, glideTo: 330 }],
  // Bright, quick climb for a combo bonus.
  streak: [
    { freq: 783.99, at: 0, length: 0.1, wave: 'triangle', volume: 0.26 },
    { freq: 987.77, at: 0.07, length: 0.1, wave: 'triangle', volume: 0.26 },
    { freq: 1174.66, at: 0.14, length: 0.1, wave: 'triangle', volume: 0.26 },
    { freq: 1567.98, at: 0.21, length: 0.3, wave: 'triangle', volume: 0.28 },
  ],
  // Rising arpeggio for the final whistle.
  end: [
    { freq: 523.25, at: 0, length: 0.16, wave: 'triangle', volume: 0.3 },
    { freq: 659.25, at: 0.14, length: 0.16, wave: 'triangle', volume: 0.3 },
    { freq: 783.99, at: 0.28, length: 0.16, wave: 'triangle', volume: 0.3 },
    { freq: 1046.5, at: 0.42, length: 0.45, wave: 'triangle', volume: 0.3 },
  ],
}

/** The slice of the Web Audio API the synth needs. */
export interface AudioParamLike {
  value: number
  setValueAtTime(value: number, time: number): unknown
  linearRampToValueAtTime(value: number, time: number): unknown
  exponentialRampToValueAtTime(value: number, time: number): unknown
}

export interface OscillatorLike {
  type: OscillatorType
  frequency: AudioParamLike
  connect(destination: unknown): unknown
  start(time: number): void
  stop(time: number): void
}

export interface GainLike {
  gain: AudioParamLike
  connect(destination: unknown): unknown
}

export interface AudioContextLike {
  readonly currentTime: number
  readonly destination: unknown
  readonly state: string
  resume(): Promise<void>
  createOscillator(): OscillatorLike
  createGain(): GainLike
}

export interface Synth {
  /** Creates/resumes the audio context. Must be called from a user gesture (iOS, Safari). */
  unlock(): void
  play(name: SoundName): void
}

export function createSynth(createContext: () => AudioContextLike | null): Synth {
  let context: AudioContextLike | null = null

  function ensure(): AudioContextLike | null {
    context ??= createContext()
    if (context && context.state === 'suspended') void context.resume()
    return context
  }

  return {
    unlock() {
      ensure()
    },
    play(name) {
      const ctx = ensure()
      if (!ctx) return
      const start = ctx.currentTime
      for (const note of SOUNDS[name]) {
        const oscillator = ctx.createOscillator()
        const gain = ctx.createGain()
        const from = start + note.at
        const to = from + note.length
        oscillator.type = note.wave
        oscillator.frequency.setValueAtTime(note.freq, from)
        if (note.glideTo !== undefined) {
          oscillator.frequency.exponentialRampToValueAtTime(note.glideTo, to)
        }
        // Quick attack and exponential decay avoid clicks at both ends.
        gain.gain.setValueAtTime(0.0001, from)
        gain.gain.linearRampToValueAtTime(note.volume, from + 0.012)
        gain.gain.exponentialRampToValueAtTime(0.0001, to)
        oscillator.connect(gain)
        gain.connect(ctx.destination)
        oscillator.start(from)
        oscillator.stop(to + 0.03)
      }
    },
  }
}

/** Builds the real synth on top of the browser's AudioContext (null when unsupported). */
export function createBrowserSynth(): Synth {
  return createSynth(() => {
    const Ctor =
      globalThis.AudioContext ??
      (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    return Ctor ? (new Ctor() as unknown as AudioContextLike) : null
  })
}
