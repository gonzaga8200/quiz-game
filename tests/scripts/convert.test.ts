import { describe, expect, it } from 'vitest'
import { baseId, convertQuestions, fold } from '../../scripts/lib/convert'

const context = {
  source: 'preguntas.json',
  createdAt: '2026-11-21T10:00:00Z',
  takenIds: new Set<string>(),
}

const item = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  categoria: 'Ciencia',
  dificultad: 'muy_facil',
  nivel: 1,
  pregunta: '¿Con qué órgano vemos?',
  opciones: ['Los ojos', 'Las orejas', 'La nariz', 'Las manos'],
  respuesta_correcta: 0,
  respuesta_texto: 'Los ojos',
  explicacion: 'Los ojos captan la luz y la envían al cerebro.',
  ...overrides,
})

describe('convertQuestions', () => {
  it('maps every field as it comes, without recalculating anything', () => {
    const { byCategory, problems } = convertQuestions([item()], context)
    expect(problems).toEqual([])
    expect(byCategory.get('Ciencias')).toEqual([
      {
        id: 'cien-organo-vemos',
        text: '¿Con qué órgano vemos?',
        options: ['Los ojos', 'Las orejas', 'La nariz', 'Las manos'],
        correctIndex: 0,
        category: 'Ciencias',
        difficulty: 'muy fácil',
        explanation: 'Los ojos captan la luz y la envían al cerebro.',
        source: 'preguntas.json',
        createdAt: '2026-11-21T10:00:00Z',
        status: 'active',
      },
    ])
  })

  it('files each question under its own category and accepts the five difficulty spellings', () => {
    const { byCategory, problems } = convertQuestions(
      [
        item({ dificultad: 'facil', nivel: 2 }),
        item({
          categoria: 'Deportes',
          dificultad: 'dificil',
          nivel: 4,
          pregunta: '¿Cuántos jugadores tiene un equipo de fútbol?',
        }),
        item({
          categoria: 'cine y television',
          dificultad: 'muy_dificil',
          nivel: 5,
          pregunta: '¿Quién dirigió «Vértigo»?',
        }),
        item({
          categoria: 'Lengua e Idiomas',
          dificultad: 'medio',
          nivel: 3,
          pregunta: '¿Qué es una palabra esdrújula?',
        }),
      ],
      context,
    )
    expect(problems).toEqual([])
    expect([...byCategory.keys()].sort()).toEqual([
      'Ciencias',
      'Cine y televisión',
      'Deportes',
      'Lengua e Idiomas',
    ])
    expect(byCategory.get('Ciencias')?.[0]?.difficulty).toBe('fácil')
    expect(byCategory.get('Deportes')?.[0]?.difficulty).toBe('difícil')
    expect(byCategory.get('Cine y televisión')?.[0]?.difficulty).toBe('muy difícil')
  })

  it('makes ids unique within the batch and against the bank', () => {
    const taken = new Set(['cien-organo-vemos'])
    const { byCategory } = convertQuestions([item(), item()], { ...context, takenIds: taken })
    expect(byCategory.get('Ciencias')?.map((q) => q.id)).toEqual([
      'cien-organo-vemos-2',
      'cien-organo-vemos-3',
    ])
  })

  it('reports what cannot be converted instead of guessing', () => {
    const { byCategory, problems } = convertQuestions(
      [
        item({ categoria: 'Astrología' }),
        item({ dificultad: 'imposible' }),
        item({ nivel: 4 }),
        item({ respuesta_correcta: 1 }),
        item({ opciones: ['a', 'b', 'c'] }),
        item({ explicacion: 'corta' }),
      ],
      context,
    )
    expect(byCategory.size).toBe(0)
    expect(problems).toHaveLength(6)
    expect(problems[0]).toContain('unknown category "Astrología"')
    expect(problems[1]).toContain('unknown difficulty "imposible"')
    expect(problems[2]).toContain('"nivel" 4 does not match')
    expect(problems[3]).toContain('respuesta_correcta does not point to respuesta_texto')
  })

  it('rejects a file that is not a list of questions', () => {
    expect(convertQuestions({}, context).problems).toHaveLength(1)
    expect(convertQuestions([], context).problems).toHaveLength(1)
  })
})

describe('helpers', () => {
  it('folds accents, case and underscores', () => {
    expect(fold('Muy_Difícil')).toBe('muy dificil')
  })

  it('builds short ids from the question keywords', () => {
    expect(baseId('Ciencias', '¿Cuántos huesos tiene un adulto?')).toBe('cien-huesos-adulto')
    expect(baseId('Deportes', '¿?')).toBe('dep-pregunta')
  })
})
