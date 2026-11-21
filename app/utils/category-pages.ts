import { CATEGORIES, countActiveByCategory, pickShowcase } from '~~/core'
import type { Category, Difficulty, Question } from '~~/core'
import { loadBundledQuestions } from '~/utils/bundled-questions'

/** Questions printed on each category page. */
export const SHOWCASE_SIZE = 20

/** A question as the category page prints it: no wrong options, no ids of the bank internals. */
export interface ShowcaseItem {
  readonly id: string
  readonly text: string
  readonly answer: string
  readonly explanation: string
  readonly difficulty: Difficulty
}

export interface CategoryPageData {
  /** Active questions in the whole category (not just the ones shown). */
  readonly total: number
  readonly items: readonly ShowcaseItem[]
}

export interface HubEntry {
  readonly category: Category
  readonly total: number
}

export function buildCategoryPage(
  questions: readonly Question[],
  category: Category,
): CategoryPageData {
  return {
    total: countActiveByCategory(questions)[category],
    items: pickShowcase(questions, category, SHOWCASE_SIZE).map((question) => ({
      id: question.id,
      text: question.text,
      answer: question.options[question.correctIndex] ?? '',
      explanation: question.explanation,
      difficulty: question.difficulty,
    })),
  }
}

export function buildHubPage(questions: readonly Question[]): HubEntry[] {
  const counts = countActiveByCategory(questions)
  return CATEGORIES.map((category) => ({ category, total: counts[category] }))
}

/**
 * These pages are static: they are rendered at build time from the questions shipped with the
 * app (`data/questions`), never from Firestore, so what a crawler reads is stable.
 */
export async function loadCategoryPage(category: Category): Promise<CategoryPageData> {
  return buildCategoryPage(await loadBundledQuestions(), category)
}

export async function loadHubPage(): Promise<HubEntry[]> {
  return buildHubPage(await loadBundledQuestions())
}
