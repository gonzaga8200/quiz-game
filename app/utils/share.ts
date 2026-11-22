import { categoryUrlSlug } from '~~/core'
import type { Category, DifficultyFilter, Duration } from '~~/core'
import { absoluteUrl } from '~/utils/seo'

export interface ShareInput {
  readonly points: number
  readonly duration: Duration
  readonly filter: DifficultyFilter
  /** Set when the game was limited to one category (arcade). */
  readonly category?: Category
  /** First emoji of the result's celebration. */
  readonly emoji: string
}

/**
 * The message a player shares. Only the result: points, time and what was played. No name and
 * no link (the link travels separately, see `shareUrl`).
 */
export function shareText(input: ShareInput): string {
  const context = [`${input.duration} s`]
  if (input.category) context.push(input.category)
  else if (input.filter !== 'Aleatorio') context.push(`dificultad ${input.filter.toLowerCase()}`)

  const points = `${input.points} ${input.points === 1 ? 'punto' : 'puntos'}`
  return `${input.emoji} He conseguido ${points} en Contrarreloj, el juego de preguntas contra el reloj (${context.join(', ')}). ¿Me superas?`
}

/**
 * Where the shared link lands: the page of the category that was played, which is indexable
 * and about exactly that, or the home page for a mixed game.
 */
export function shareUrl(siteUrl: string, category?: Category): string {
  return absoluteUrl(siteUrl, category ? `/preguntas/${categoryUrlSlug(category)}` : '/')
}

export interface ShareMessage {
  readonly text: string
  readonly url: string
}

/** What the browser can do. Anything missing is simply not offered. */
export interface ShareDeps {
  share?: (data: ShareMessage) => Promise<void>
  copy?: (text: string) => Promise<void>
}

/**
 * - `shared`: the native share sheet took it
 * - `copied`: text and link are on the clipboard (no share sheet, or it failed)
 * - `cancelled`: the player closed the share sheet; nothing else to do
 * - `failed`: neither worked
 */
export type ShareOutcome = 'shared' | 'copied' | 'cancelled' | 'failed'

export async function shareResult(deps: ShareDeps, message: ShareMessage): Promise<ShareOutcome> {
  if (deps.share) {
    try {
      await deps.share({ text: message.text, url: message.url })
      return 'shared'
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled'
      // Not allowed or not supported for this content: fall back to copying.
    }
  }

  if (!deps.copy) return 'failed'
  try {
    await deps.copy(`${message.text}\n${message.url}`)
    return 'copied'
  } catch {
    return 'failed'
  }
}

/** Binds the share sheet and the clipboard of a browser, leaving out what it does not have. */
export function browserShareDeps(nav: Navigator): ShareDeps {
  const deps: ShareDeps = {}
  if (typeof nav.share === 'function') deps.share = (data) => nav.share(data)
  if (typeof nav.clipboard?.writeText === 'function') {
    deps.copy = (text) => nav.clipboard.writeText(text)
  }
  return deps
}
