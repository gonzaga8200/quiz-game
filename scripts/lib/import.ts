import { resolve, relative, isAbsolute } from 'node:path'
import type { Question } from '../../core'

export interface ImportOptions {
  readonly dir: string
  readonly files: readonly string[]
  readonly project: string | undefined
  readonly yes: boolean
  readonly dryRun: boolean
}

/** Firestore batches hold at most 500 writes; stay below it. */
export const BATCH_SIZE = 400

export function chunk<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size))
  return chunks
}

/**
 * The Firestore document for a question: the question itself, with `createdAt`
 * turned into a Date (the Admin SDK stores it as a Firestore Timestamp).
 */
export function toFirestoreDoc(
  question: Question,
): Omit<Question, 'createdAt'> & { createdAt: Date } {
  return { ...question, createdAt: new Date(question.createdAt) }
}

export type Target =
  | { readonly kind: 'emulator'; readonly host: string; readonly project: string }
  | { readonly kind: 'project'; readonly project: string }

/**
 * Where the questions will be written. The project must always be given explicitly
 * (flag or FIREBASE_PROJECT_ID) so a machine with several Google accounts or projects
 * can never import into the wrong one by accident.
 */
export function resolveTarget(
  options: Pick<ImportOptions, 'project'>,
  env: Record<string, string | undefined>,
): Target | { readonly error: string } {
  const project = options.project ?? env.FIREBASE_PROJECT_ID
  if (!project) {
    return {
      error:
        'No target project. Pass --project <id> or set FIREBASE_PROJECT_ID (it is never guessed).',
    }
  }
  const host = env.FIRESTORE_EMULATOR_HOST
  return host ? { kind: 'emulator', host, project } : { kind: 'project', project }
}

/** Credentials must live outside the repository so they can never be committed. */
export function credentialsInsideRepo(
  env: Record<string, string | undefined>,
  repoRoot: string,
): string | null {
  const path = env.GOOGLE_APPLICATION_CREDENTIALS
  if (!path) return null
  const rel = relative(resolve(repoRoot), resolve(path))
  const inside = rel !== '' && !rel.startsWith('..') && !isAbsolute(rel)
  return inside ? path : null
}
