import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CATEGORIES, DIFFICULTIES } from '../../core/constants'
import { QuestionFileSchema } from '../../core/schema'

const dir = join(import.meta.dirname, '../../data/questions')
const files = readdirSync(dir).filter((name) => name.endsWith('.json'))

describe('data/questions', () => {
  it('has question files', () => {
    expect(files.length).toBeGreaterThan(0)
  })

  it.each(files)('%s follows the question schema', (name) => {
    const result = QuestionFileSchema.safeParse(JSON.parse(readFileSync(join(dir, name), 'utf8')))
    expect(result.error?.issues ?? []).toEqual([])
  })

  const all = files.flatMap((name) =>
    QuestionFileSchema.parse(JSON.parse(readFileSync(join(dir, name), 'utf8'))),
  )

  it('has unique ids and unique question texts', () => {
    const normalize = (text: string) => text.toLocaleLowerCase('es').replace(/\s+/g, ' ').trim()
    expect(new Set(all.map((q) => q.id)).size).toBe(all.length)
    expect(new Set(all.map((q) => normalize(q.text))).size).toBe(all.length)
  })

  it('covers every category and difficulty so the game is playable in any mode', () => {
    for (const category of CATEGORIES) expect(all.some((q) => q.category === category)).toBe(true)
    for (const difficulty of DIFFICULTIES) {
      expect(all.some((q) => q.difficulty === difficulty)).toBe(true)
    }
  })
})
