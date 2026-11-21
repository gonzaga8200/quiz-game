/**
 * The import script against the local emulator: it writes the whole question bank,
 * is idempotent, and what it writes is readable through the real security rules.
 *   npm run test:rules
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { initializeTestEnvironment } from '@firebase/rules-unit-testing'
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { QuestionFileSchema } from '../../core'
import { toQuestion } from '../../app/utils/firestore-mappers'

const PROJECT_ID = 'demo-contrarreloj'
const root = join(import.meta.dirname, '../..')
const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8180'

const bank = readdirSync(join(root, 'data/questions'))
  .filter((name) => name.endsWith('.json'))
  .flatMap((name) =>
    QuestionFileSchema.parse(JSON.parse(readFileSync(join(root, 'data/questions', name), 'utf8'))),
  )

// Retired questions stay in the files with status "disabled": they are stored too, but the
// app only reads the active ones.
const activeBank = bank.filter((question) => question.status === 'active')

function runImport(args: string[] = []): string {
  return execFileSync(
    'npx',
    ['tsx', 'scripts/import-questions.ts', '--project', PROJECT_ID, '--yes', ...args],
    {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, FIRESTORE_EMULATOR_HOST: emulatorHost },
    },
  )
}

let env: RulesTestEnvironment

beforeAll(async () => {
  const [host = '127.0.0.1', port = '8180'] = emulatorHost.split(':')
  env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(join(root, 'firestore.rules'), 'utf8'),
      host,
      port: Number(port),
    },
  })
  await env.clearFirestore()
})

afterAll(async () => {
  await env.clearFirestore()
  await env.cleanup()
})

async function storedQuestionIds(): Promise<string[]> {
  let ids: string[] = []
  await env.withSecurityRulesDisabled(async (context) => {
    const snapshot = await getDocs(collection(context.firestore(), 'questions'))
    ids = snapshot.docs.map((d) => d.id).sort()
  })
  return ids
}

describe('questions:import against the emulator', () => {
  it('writes every question to a document named after its id', async () => {
    const output = runImport()
    expect(output).toContain(`Wrote ${bank.length} question(s)`)
    expect(await storedQuestionIds()).toEqual(bank.map((q) => q.id).sort())
  })

  it('is idempotent: importing again creates no duplicates', async () => {
    runImport()
    runImport()
    expect(await storedQuestionIds()).toHaveLength(bank.length)
  })

  it('stores documents the app can read back, with a real Timestamp for createdAt', async () => {
    runImport()
    const anonymous = env.unauthenticatedContext().firestore()
    const snapshot = await getDocs(
      query(collection(anonymous, 'questions'), where('status', '==', 'active')),
    )
    expect(snapshot.size).toBe(activeBank.length)
    for (const document of snapshot.docs) {
      expect(typeof document.data().createdAt.toDate).toBe('function')
      expect(toQuestion(document.id, document.data())).not.toBeNull()
    }
  })

  it('updates a question in place when its file changes', async () => {
    runImport()
    // Disable one question in a temporary copy of the bank and import that file only.
    const { mkdtempSync, writeFileSync } = await import('node:fs')
    const { tmpdir } = await import('node:os')
    const dir = mkdtempSync(join(tmpdir(), 'questions-'))
    const first = activeBank[0]!
    const file = join(dir, '2026-11-16-cambio.json')
    writeFileSync(file, JSON.stringify([{ ...first, status: 'disabled' }]))

    runImport([file])

    expect(await storedQuestionIds()).toHaveLength(bank.length) // updated, not added
    const anonymous = env.unauthenticatedContext().firestore()
    const active = await getDocs(
      query(collection(anonymous, 'questions'), where('status', '==', 'active')),
    )
    expect(active.size).toBe(activeBank.length - 1) // the disabled one is no longer public
  })

  it('refuses to run without an explicit project', () => {
    expect(() =>
      execFileSync('npx', ['tsx', 'scripts/import-questions.ts', '--yes'], {
        cwd: root,
        encoding: 'utf8',
        stdio: 'pipe',
        env: { ...process.env, FIRESTORE_EMULATOR_HOST: emulatorHost, FIREBASE_PROJECT_ID: '' },
      }),
    ).toThrow(/No target project/)
  })
})
