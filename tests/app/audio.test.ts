import { describe, expect, it, vi } from 'vitest'
import { SOUNDS, createSynth } from '../../app/utils/audio'
import type { AudioContextLike, AudioParamLike, OscillatorLike } from '../../app/utils/audio'

function fakeParam(): AudioParamLike {
  return {
    value: 0,
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  }
}

function fakeContext(state = 'running') {
  const oscillators: OscillatorLike[] = []
  const context: AudioContextLike = {
    currentTime: 10,
    destination: {},
    state,
    resume: vi.fn(() => Promise.resolve()),
    createOscillator: () => {
      const oscillator: OscillatorLike = {
        type: 'sine',
        frequency: fakeParam(),
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      }
      oscillators.push(oscillator)
      return oscillator
    },
    createGain: () => ({ gain: fakeParam(), connect: vi.fn() }),
  }
  return { context, oscillators }
}

describe('synth', () => {
  it('plays one oscillator per note, scheduled from the current time', () => {
    const { context, oscillators } = fakeContext()
    const synth = createSynth(() => context)

    synth.play('correct')

    expect(oscillators).toHaveLength(SOUNDS.correct.length)
    const [first, second] = oscillators
    expect(first?.start).toHaveBeenCalledWith(10)
    expect(second?.start).toHaveBeenCalledWith(10 + SOUNDS.correct[1]!.at)
    expect(first?.type).toBe('triangle')
  })

  it.each(['correct', 'wrong', 'skip', 'streak', 'end'] as const)(
    'knows how to play "%s"',
    (name) => {
      const { context, oscillators } = fakeContext()
      createSynth(() => context).play(name)
      expect(oscillators).toHaveLength(SOUNDS[name].length)
      for (const oscillator of oscillators) {
        expect(oscillator.stop).toHaveBeenCalledOnce()
      }
    },
  )

  it('glides the pitch down for the error buzz', () => {
    const { context, oscillators } = fakeContext()
    createSynth(() => context).play('wrong')
    expect(oscillators[0]?.frequency.exponentialRampToValueAtTime).toHaveBeenCalledWith(
      110,
      expect.any(Number),
    )
  })

  it('does not glide notes that have no target pitch', () => {
    const { context, oscillators } = fakeContext()
    createSynth(() => context).play('correct')
    expect(oscillators[0]?.frequency.exponentialRampToValueAtTime).not.toHaveBeenCalled()
  })

  it('creates the audio context once and reuses it', () => {
    const { context } = fakeContext()
    const factory = vi.fn(() => context)
    const synth = createSynth(factory)

    synth.unlock()
    synth.play('skip')
    synth.play('skip')

    expect(factory).toHaveBeenCalledOnce()
  })

  it('resumes a suspended context (autoplay policies) but leaves a running one alone', () => {
    const suspended = fakeContext('suspended')
    createSynth(() => suspended.context).unlock()
    expect(suspended.context.resume).toHaveBeenCalled()

    const running = fakeContext('running')
    createSynth(() => running.context).unlock()
    expect(running.context.resume).not.toHaveBeenCalled()
  })

  it('does nothing, and does not throw, when Web Audio is unavailable', () => {
    const synth = createSynth(() => null)
    expect(() => synth.unlock()).not.toThrow()
    expect(() => synth.play('correct')).not.toThrow()
  })
})
