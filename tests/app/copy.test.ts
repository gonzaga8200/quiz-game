import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Words and phrases the game does not use, with what to write instead. They are the result of
 * a brand review: the same idea always gets the same word, and every action starts with a verb.
 * Legal pages are left out: they are written separately and have their own register.
 */
const BANNED: readonly { pattern: RegExp; use: string }[] = [
  { pattern: /clasificaci[oó]n(es)?/i, use: '"ranking"' },
  { pattern: />\s*Comienzo\s*</, use: '"Empezar partida" (a button is an action, not a noun)' },
  { pattern: /Tu mejor marca/, use: '"Tu mejor puntuación"' },
  { pattern: /No hemos podido/, use: '"No se ha podido…" (errors are impersonal everywhere)' },
  { pattern: /No encontramos/, use: '"No hay…" (errors are impersonal everywhere)' },
  { pattern: /He hecho \$\{/, use: '"He conseguido"' },
]

const LEGAL_PAGES = new Set(['cookies.vue', 'aviso-legal.vue'])

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    if (LEGAL_PAGES.has(name) || !/\.(vue|ts)$/.test(name)) return []
    return [path]
  })
}

describe('game copy', () => {
  const files = sourceFiles('app')

  it('reads the app sources', () => {
    expect(files.length).toBeGreaterThan(20)
  })

  it.each(BANNED)('never uses $pattern (write $use)', ({ pattern }) => {
    const offenders = files.filter((file) => pattern.test(readFileSync(file, 'utf8')))
    expect(offenders).toEqual([])
  })
})
