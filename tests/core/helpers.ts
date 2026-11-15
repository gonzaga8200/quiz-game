import { Game } from '../../core/game'
import type { GameConfig, Outcome } from '../../core/game'
import type { Difficulty, DifficultyFilter, Duration } from '../../core/constants'
import { mulberry32 } from '../../core/rng'
import type { Question } from '../../core/schema'
import type { PlayableQuestion } from '../../core/selection'

export function makeQuestion(overrides: Partial<Question> = {}): Question {
  return {
    id: 'pregunta-ejemplo',
    text: '¿Cuál es la capital de Francia?',
    options: ['París', 'Lyon', 'Marsella', 'Burdeos'],
    correctIndex: 0,
    category: 'Historia y Geografía',
    difficulty: 'medio',
    explanation: 'París es la capital de Francia desde hace siglos.',
    createdAt: '2026-01-01T00:00:00Z',
    status: 'active',
    ...overrides,
  }
}

/** `count` distinct questions of one difficulty. */
export function makeBank(difficulty: Difficulty, count: number): Question[] {
  return Array.from({ length: count }, (_, i) =>
    makeQuestion({
      id: `q-${difficulty.replace(/\s/g, '-')}-${i}`,
      text: `Pregunta de prueba número ${i} (${difficulty})`,
      options: [`a${i}`, `b${i}`, `c${i}`, `d${i}`],
      correctIndex: i % 4,
      difficulty,
    }),
  )
}

export interface Clock {
  now: () => number
  advance: (ms: number) => void
  set: (ms: number) => void
}

export function makeClock(start = 0): Clock {
  let time = start
  return {
    now: () => time,
    advance: (ms) => {
      time += ms
    },
    set: (ms) => {
      time = ms
    },
  }
}

export interface TestGame {
  game: Game
  clock: Clock
}

/** A started game on a fake clock with a seeded rng. */
export function startGame(
  questions: readonly Question[],
  options: { filter?: DifficultyFilter; duration?: Duration; seed?: number } = {},
): TestGame {
  const clock = makeClock()
  const config: GameConfig = {
    questions,
    filter: options.filter ?? 'Aleatorio',
    duration: options.duration ?? 60,
    rng: mulberry32(options.seed ?? 1),
    now: clock.now,
  }
  const game = new Game(config)
  game.start()
  return { game, clock }
}

export function current(game: Game): PlayableQuestion {
  const { current: question } = game.snapshot()
  if (question === null) throw new Error('expected a question in flight')
  return question
}

export function rightIndex(game: Game): number {
  return current(game).correctIndex
}

export function wrongIndex(game: Game): number {
  const question = current(game)
  return (question.correctIndex + 1) % question.options.length
}

/** Answers correctly and moves to the next question. */
export function answerRight(game: Game): Outcome {
  const outcome = game.answer(rightIndex(game))
  game.next()
  return outcome
}

/** Answers wrongly and moves to the next question. */
export function answerWrong(game: Game): Outcome {
  const outcome = game.answer(wrongIndex(game))
  game.next()
  return outcome
}

/** Skips and moves to the next question. */
export function skipOne(game: Game): Outcome {
  const outcome = game.skip()
  game.next()
  return outcome
}

/** Narrows an Outcome for assertions. */
export function asAnswered(outcome: Outcome) {
  if (outcome.kind !== 'answered') throw new Error(`expected answered, got ${outcome.kind}`)
  return outcome
}

export function asSkipped(outcome: Outcome) {
  if (outcome.kind !== 'skipped') throw new Error(`expected skipped, got ${outcome.kind}`)
  return outcome
}
