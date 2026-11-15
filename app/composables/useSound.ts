import { createBrowserSynth } from '~/utils/audio'
import type { SoundName, Synth } from '~/utils/audio'

/** Remembered mute preference. A functional UI setting; it never leaves the device. */
const STORAGE_KEY = 'contrarreloj.muted'

let synth: Synth | null = null

function readStoredMute(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false // storage blocked (private mode, strict settings): just don't remember
  }
}

function storeMute(value: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, value ? '1' : '0')
  } catch {
    // ignore: the preference simply won't persist
  }
}

export function useSound() {
  const muted = useState<boolean>('sound-muted', () => false)
  const restored = useState<boolean>('sound-muted-restored', () => false)

  // Read the stored value after hydration so server and client markup match.
  onMounted(() => {
    if (restored.value) return
    muted.value = readStoredMute()
    restored.value = true
  })

  /** Call from a click/tap handler: browsers only allow audio after a user gesture. */
  function unlock(): void {
    synth ??= createBrowserSynth()
    synth.unlock()
  }

  function play(name: SoundName): void {
    if (muted.value) return
    synth ??= createBrowserSynth()
    synth.play(name)
  }

  function toggle(): void {
    muted.value = !muted.value
    storeMute(muted.value)
    if (!muted.value) unlock()
  }

  return { muted: readonly(muted), play, unlock, toggle }
}
