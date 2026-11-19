import { describe, expect, it } from 'vitest'
import {
  MAX_OPTION_LENGTH_HINT,
  MAX_TEXT_LENGTH_HINT,
  OPTION_LENGTH_RATIO,
  SIMILAR_TEXT_THRESHOLD,
  findQuestionIssues,
  normalizeForComparison,
  wordOverlap,
} from '../../core/validation'
import type { Question } from '../../core/schema'
import { makeQuestion } from './helpers'

const entry = (question: Question, file = 'a.json') => ({ file, question })
const q = (overrides: Partial<Question>) => makeQuestion({ id: 'pregunta-a', ...overrides })

describe('normalizeForComparison', () => {
  it('ignores case, accents, punctuation and extra spaces', () => {
    expect(normalizeForComparison('  ¿Cuál  ES la CAPITAL de Francia? ')).toBe(
      'cual es la capital de francia',
    )
    expect(normalizeForComparison('«Don Quijote»: ¡Sí!')).toBe('don quijote si')
  })
})

describe('wordOverlap', () => {
  it('is 1 for the same words in any form, and 0 for nothing in common', () => {
    expect(wordOverlap('La capital de Francia', 'la CAPITAL, de francia!')).toBe(1)
    expect(wordOverlap('alfa beta', 'gamma delta')).toBe(0)
  })

  it('is the share of common words otherwise', () => {
    // {a, b, c} vs {b, c, d}: 2 shared of 4 different words
    expect(wordOverlap('a b c', 'b c d')).toBe(0.5)
  })

  it('copes with empty text', () => {
    expect(wordOverlap('', '')).toBe(1)
    expect(wordOverlap('', 'algo')).toBe(0)
  })
})

describe('findQuestionIssues: duplicates', () => {
  it('finds nothing in a clean bank', () => {
    const issues = findQuestionIssues([
      entry(q({ id: 'uno', text: '¿Cuál es la capital de Francia?' })),
      entry(
        q({
          id: 'dos',
          text: '¿Quién pintó «Las Meninas»?',
          options: ['Velázquez', 'Goya', 'Murillo', 'Ribera'],
        }),
      ),
    ])
    expect(issues).toEqual([])
  })

  it('reports a repeated id as an error, naming the first file', () => {
    const issues = findQuestionIssues([
      entry(q({ id: 'misma', text: '¿Cuál es la capital de Francia?' }), 'a.json'),
      entry(
        q({
          id: 'misma',
          text: '¿Quién pintó «Las Meninas»?',
          options: ['Velázquez', 'Goya', 'Murillo', 'Ribera'],
        }),
        'b.json',
      ),
    ])
    expect(issues).toEqual([
      {
        level: 'error',
        file: 'b.json',
        id: 'misma',
        message: 'duplicate id (already used in a.json)',
      },
    ])
  })

  it('reports the same text, ignoring accents, case and punctuation, as an error', () => {
    const issues = findQuestionIssues([
      entry(q({ id: 'uno', text: '¿Cuál es la capital de Francia?' }), 'a.json'),
      entry(q({ id: 'dos', text: 'cual es la CAPITAL de francia' }), 'b.json'),
    ])
    expect(issues).toHaveLength(1)
    expect(issues[0]).toMatchObject({ level: 'error', id: 'dos' })
    expect(issues[0]?.message).toContain('same question text as uno (a.json)')
  })

  it('reports an id clash once even if the text also matches', () => {
    const issues = findQuestionIssues([entry(q({ id: 'x' })), entry(q({ id: 'x' }))])
    expect(issues.filter((i) => i.level === 'error')).toHaveLength(1)
    expect(issues[0]?.message).toContain('duplicate id')
  })

  it('warns about very similar questions but not about merely related ones', () => {
    const similar = findQuestionIssues([
      entry(
        q({
          id: 'uno',
          text: '¿Cuál es la capital de la República Francesa en Europa moderna?',
        }),
      ),
      entry(
        q({
          id: 'dos',
          text: '¿Cuál es la capital de la República Francesa en Europa actual?',
        }),
      ),
    ])
    expect(similar).toHaveLength(1)
    expect(similar[0]).toMatchObject({ level: 'warning', id: 'dos' })
    expect(similar[0]?.message).toContain('very similar to uno')

    const related = findQuestionIssues([
      entry(q({ id: 'uno', text: '¿Cuál es la capital de Francia?' })),
      entry(q({ id: 'dos', text: '¿Cuál es la capital de España?' })),
    ])
    expect(related.filter((i) => i.message.includes('similar'))).toEqual([])
    expect(SIMILAR_TEXT_THRESHOLD).toBeGreaterThan(0.7)
  })

  it('does not compare a duplicate against the rest again', () => {
    const issues = findQuestionIssues([
      entry(q({ id: 'uno', text: '¿Cuál es la capital de Francia?' })),
      entry(q({ id: 'dos', text: '¿Cuál es la capital de Francia?' })),
      entry(q({ id: 'tres', text: '¿Cuál es la capital de Francia?' })),
    ])
    expect(issues.filter((i) => i.level === 'error')).toHaveLength(2)
    expect(issues.some((i) => i.level === 'warning')).toBe(false)
  })
})

describe('findQuestionIssues: quality warnings', () => {
  const warningsFor = (question: Question) =>
    findQuestionIssues([entry(question)]).map((issue) => issue.message)

  it('flags unbalanced question marks in both directions', () => {
    expect(warningsFor(q({ text: '¿Cuál es la capital de Francia' }))).toEqual([
      expect.stringContaining('unbalanced question marks'),
    ])
    expect(warningsFor(q({ text: 'Cuál es la capital de Francia?' }))).toEqual([
      expect.stringContaining('unbalanced question marks'),
    ])
    expect(warningsFor(q({ text: 'Completa la frase: el cielo es ___' }))).toEqual([])
  })

  it('flags options of very different length, but only when they are long enough to matter', () => {
    const long = 'x'.repeat(10 * OPTION_LENGTH_RATIO)
    expect(warningsFor(q({ options: ['París', long, 'Lyon', 'Roma'] }))).toEqual([
      expect.stringContaining('differ a lot in length'),
    ])
    expect(warningsFor(q({ options: ['A', 'abcdefghij', 'B', 'C'] }))).toEqual([]) // short
    expect(warningsFor(q({ options: ['París', 'Londres', 'Madrid', 'Berlín'] }))).toEqual([])
  })

  it('flags a correct answer that is given away in the question', () => {
    const giveaway = q({
      text: '¿Es París la capital de Francia?',
      options: ['París', 'Lyon', 'Marsella', 'Burdeos'],
      correctIndex: 0,
    })
    expect(warningsFor(giveaway)).toEqual([
      expect.stringContaining('already appears in the question'),
    ])
  })

  it('flags a question text that would take more than two lines on a phone', () => {
    const justRight = `¿${'x'.repeat(MAX_TEXT_LENGTH_HINT - 2)}?`
    expect(justRight).toHaveLength(MAX_TEXT_LENGTH_HINT)
    expect(warningsFor(q({ text: justRight }))).toEqual([])

    const tooLong = `¿${'x'.repeat(MAX_TEXT_LENGTH_HINT - 1)}?`
    expect(warningsFor(q({ text: tooLong }))).toEqual([
      expect.stringContaining(`${MAX_TEXT_LENGTH_HINT + 1} characters`),
    ])
  })

  it('flags an option that is too long to fit on one or two lines', () => {
    const others: [string, string, string] = ['a'.repeat(30), 'b'.repeat(31), 'c'.repeat(32)]
    const justRight = 'y'.repeat(MAX_OPTION_LENGTH_HINT)
    expect(warningsFor(q({ options: [justRight, ...others] }))).toEqual([])

    const tooLong = 'y'.repeat(MAX_OPTION_LENGTH_HINT + 1)
    expect(warningsFor(q({ options: [tooLong, ...others] }))).toEqual([
      expect.stringContaining(`${MAX_OPTION_LENGTH_HINT + 1} characters`),
    ])
  })

  it('ignores very short answers and partial-word matches when looking for giveaways', () => {
    expect(
      warningsFor(
        q({
          text: '¿Cuántos jugadores tiene un equipo de 11 contra 11?',
          options: ['9', '10', '11', '12'],
          correctIndex: 2,
        }),
      ),
    ).toEqual([])
    expect(
      warningsFor(
        q({
          text: '¿Qué gobierna una paristocracia?',
          options: ['París', 'Lyon', 'Roma', 'Nápoles'],
          correctIndex: 0,
        }),
      ),
    ).toEqual([])
  })
})
