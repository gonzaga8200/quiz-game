import { describe, expect, it } from 'vitest'
import { CATEGORIES, DIFFICULTIES, DIFFICULTY_FILTERS } from '../../core/constants'
import {
  QuestionFileSchema,
  QuestionIdSchema,
  QuestionSchema,
  RankingEntrySchema,
  ScoreSubmissionSchema,
} from '../../core/schema'
import { makeQuestion } from './helpers'

const validScore = {
  uid: 'uid-123',
  displayName: 'Ana García',
  photoURL: 'https://lh3.googleusercontent.com/a/foto',
  points: 120,
  correct: 20,
  wrong: 3,
  skipped: 2,
  duration: 60,
  difficultyFilter: 'Medio',
}

/** Returns the dotted paths of every issue zod reports. */
function issuePaths(result: { success: boolean; error?: { issues: { path: PropertyKey[] }[] } }) {
  return result.error?.issues.map((issue) => issue.path.join('.')) ?? []
}

describe('QuestionSchema', () => {
  it('accepts a valid question', () => {
    expect(QuestionSchema.safeParse(makeQuestion()).success).toBe(true)
  })

  it.each(CATEGORIES)('accepts the category "%s"', (category) => {
    expect(QuestionSchema.safeParse(makeQuestion({ category })).success).toBe(true)
  })

  it.each(DIFFICULTIES)('accepts the difficulty "%s"', (difficulty) => {
    expect(QuestionSchema.safeParse(makeQuestion({ difficulty })).success).toBe(true)
  })

  it('makes `source` optional and accepts a URL or a citation', () => {
    expect(
      QuestionSchema.safeParse(makeQuestion({ source: 'https://es.wikipedia.org/wiki/Par%C3%ADs' }))
        .success,
    ).toBe(true)
    expect(QuestionSchema.safeParse(makeQuestion({ source: 'Atlas Mundial, 2020' })).success).toBe(
      true,
    )
  })

  it('trims whitespace in text fields', () => {
    const parsed = QuestionSchema.parse(
      makeQuestion({ text: '   ¿Cuál es la capital de Francia?  ' }),
    )
    expect(parsed.text).toBe('¿Cuál es la capital de Francia?')
  })

  const invalid: readonly [string, Record<string, unknown>, string][] = [
    ['3 options', { options: ['a', 'b', 'c'] }, 'options'],
    ['5 options', { options: ['a', 'b', 'c', 'd', 'e'] }, 'options'],
    ['an empty option', { options: ['París', 'Lyon', ' ', 'Burdeos'] }, 'options.2'],
    [
      'an overly long option',
      { options: ['París', 'Lyon', 'x'.repeat(121), 'Burdeos'] },
      'options.2',
    ],
    ['correctIndex 4', { correctIndex: 4 }, 'correctIndex'],
    ['correctIndex -1', { correctIndex: -1 }, 'correctIndex'],
    ['a fractional correctIndex', { correctIndex: 1.5 }, 'correctIndex'],
    ['an unknown category', { category: 'Astrología' }, 'category'],
    ['an unknown difficulty', { difficulty: 'imposible' }, 'difficulty'],
    ['a difficulty without its accent', { difficulty: 'dificil' }, 'difficulty'],
    ['a too-short text', { text: '¿Qué?' }, 'text'],
    ['a missing explanation', { explanation: '' }, 'explanation'],
    ['an invalid status', { status: 'draft' }, 'status'],
    ['a non-ISO createdAt', { createdAt: '16/11/2026' }, 'createdAt'],
    ['an uppercase id', { id: 'Pregunta-1' }, 'id'],
    ['an id with spaces', { id: 'una pregunta' }, 'id'],
    ['a too-short id', { id: 'ab' }, 'id'],
    ['an empty source', { source: '  ' }, 'source'],
  ]

  it.each(invalid)('rejects %s', (_label, overrides, path) => {
    const result = QuestionSchema.safeParse(makeQuestion(overrides as never))
    expect(result.success).toBe(false)
    expect(issuePaths(result)).toContain(path)
  })

  it('rejects options that repeat (case-insensitively)', () => {
    const result = QuestionSchema.safeParse(
      makeQuestion({ options: ['París', 'Lyon', 'parís', 'Burdeos'] }),
    )
    expect(result.success).toBe(false)
    expect(issuePaths(result)).toContain('options.2')
  })

  it('rejects unknown fields so typos in generated JSON do not slip through', () => {
    const result = QuestionSchema.safeParse({ ...makeQuestion(), dificultad: 'fácil' })
    expect(result.success).toBe(false)
  })

  it('rejects missing required fields', () => {
    const { explanation: _omit, ...rest } = makeQuestion()
    expect(QuestionSchema.safeParse(rest).success).toBe(false)
  })
})

describe('QuestionIdSchema', () => {
  it.each(['pregunta-1', 'ciencias-0007', 'a1b'])('accepts "%s"', (id) => {
    expect(QuestionIdSchema.safeParse(id).success).toBe(true)
  })
})

describe('QuestionFileSchema', () => {
  it('accepts a non-empty array of questions', () => {
    expect(QuestionFileSchema.safeParse([makeQuestion()]).success).toBe(true)
  })

  it('rejects an empty array and non-arrays', () => {
    expect(QuestionFileSchema.safeParse([]).success).toBe(false)
    expect(QuestionFileSchema.safeParse(makeQuestion()).success).toBe(false)
  })

  it('points at the failing item', () => {
    const result = QuestionFileSchema.safeParse([makeQuestion(), makeQuestion({ correctIndex: 9 })])
    expect(issuePaths(result)).toContain('1.correctIndex')
  })
})

describe('ScoreSubmissionSchema', () => {
  it('accepts a valid score', () => {
    expect(ScoreSubmissionSchema.safeParse(validScore).success).toBe(true)
  })

  it.each(DIFFICULTY_FILTERS)('accepts the filter "%s"', (difficultyFilter) => {
    expect(ScoreSubmissionSchema.safeParse({ ...validScore, difficultyFilter }).success).toBe(true)
  })

  it('accepts a known category and leaves it out when the game mixed them all', () => {
    expect(ScoreSubmissionSchema.safeParse({ ...validScore, category: 'Ciencias' }).success).toBe(
      true,
    )
    expect('category' in ScoreSubmissionSchema.parse(validScore)).toBe(false)
    expect(ScoreSubmissionSchema.safeParse({ ...validScore, category: 'Trivial' }).success).toBe(
      false,
    )
  })

  it('accepts 120 s games and a missing photo (null)', () => {
    expect(
      ScoreSubmissionSchema.safeParse({ ...validScore, duration: 120, photoURL: null }).success,
    ).toBe(true)
  })

  const invalid: readonly [string, Record<string, unknown>, string][] = [
    ['a 90 s duration', { duration: 90 }, 'duration'],
    ['an unknown filter', { difficultyFilter: 'Imposible' }, 'difficultyFilter'],
    ['negative points', { points: -1 }, 'points'],
    ['fractional points', { points: 10.5 }, 'points'],
    ['negative counters', { wrong: -1 }, 'wrong'],
    ['an empty display name', { displayName: ' ' }, 'displayName'],
    ['a 61-char display name', { displayName: 'x'.repeat(61) }, 'displayName'],
    ['an http photo URL', { photoURL: 'http://example.org/a.png' }, 'photoURL'],
    ['an empty uid', { uid: '' }, 'uid'],
    ['more points than the correct answers allow', { points: 20 * 17 + 1 }, 'points'],
    [
      'more answered questions than seconds',
      { correct: 50, wrong: 10, skipped: 1, points: 100 },
      'correct',
    ],
  ]

  it.each(invalid)('rejects %s', (_label, overrides, path) => {
    const result = ScoreSubmissionSchema.safeParse({ ...validScore, ...overrides })
    expect(result.success).toBe(false)
    expect(issuePaths(result)).toContain(path)
  })

  it('rejects unknown fields', () => {
    expect(ScoreSubmissionSchema.safeParse({ ...validScore, admin: true }).success).toBe(false)
  })

  it('accepts exactly the maximum points the correct answers allow', () => {
    expect(ScoreSubmissionSchema.safeParse({ ...validScore, points: 20 * 17 }).success).toBe(true)
  })
})

describe('RankingEntrySchema', () => {
  it('requires a timestamp on top of the submission fields', () => {
    expect(RankingEntrySchema.safeParse(validScore).success).toBe(false)
    expect(
      RankingEntrySchema.safeParse({ ...validScore, createdAt: '2026-11-16T10:00:00Z' }).success,
    ).toBe(true)
  })

  it('applies the same range checks', () => {
    const result = RankingEntrySchema.safeParse({
      ...validScore,
      points: 9999,
      createdAt: '2026-11-16T10:00:00Z',
    })
    expect(issuePaths(result)).toContain('points')
  })
})
