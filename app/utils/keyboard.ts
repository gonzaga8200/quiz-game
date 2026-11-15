export type GameKeyAction = { type: 'answer'; index: number } | { type: 'skip' } | null

const LETTERS = ['a', 'b', 'c', 'd']

/**
 * Keyboard shortcuts while playing: 1-4 or A-D choose an option, P skips.
 * Anything else (or an out-of-range option) is not a game key.
 */
export function actionForKey(key: string, optionCount: number): GameKeyAction {
  const lower = key.toLowerCase()
  if (lower === 'p') return { type: 'skip' }
  const index = /^[1-9]$/.test(lower) ? Number(lower) - 1 : LETTERS.indexOf(lower)
  return index >= 0 && index < optionCount ? { type: 'answer', index } : null
}
