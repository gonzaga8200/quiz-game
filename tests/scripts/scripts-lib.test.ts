import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  BATCH_SIZE,
  chunk,
  credentialsInsideRepo,
  resolveTarget,
  toFirestoreDoc,
} from '../../scripts/lib/import'
import {
  FILE_NAME_PATTERN,
  fileNameProblems,
  listQuestionFiles,
  loadQuestionFiles,
  summarize,
  validateQuestionFiles,
} from '../../scripts/lib/question-files'
import { makeBank, makeQuestion } from '../core/helpers'

const root = join(import.meta.dirname, '../..')

function tempDir(files: Record<string, unknown>): string {
  const dir = mkdtempSync(join(tmpdir(), 'qfiles-'))
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(join(dir, name), typeof content === 'string' ? content : JSON.stringify(content))
  }
  return dir
}

describe('listQuestionFiles', () => {
  it('returns only .json files, sorted', () => {
    const dir = tempDir({ 'b.json': [], 'a.json': [], 'notes.txt': 'x' })
    mkdirSync(join(dir, 'sub'))
    expect(listQuestionFiles(dir).map((p) => p.split('/').at(-1))).toEqual(['a.json', 'b.json'])
  })
})

describe('loadQuestionFiles', () => {
  it('loads valid questions with their file name', () => {
    const dir = tempDir({ '2026-01-01-uno.json': [makeQuestion()] })
    const { entries, problems } = loadQuestionFiles(listQuestionFiles(dir))
    expect(problems).toEqual([])
    expect(entries).toHaveLength(1)
    expect(entries[0]?.file).toBe('2026-01-01-uno.json')
  })

  it('reports broken JSON, non-arrays and empty arrays without stopping', () => {
    const dir = tempDir({
      'a.json': '{no json',
      'b.json': { not: 'an array' },
      'c.json': [],
      'd.json': [makeQuestion()],
    })
    const { entries, problems } = loadQuestionFiles(listQuestionFiles(dir))
    expect(entries).toHaveLength(1) // the good file still loads
    expect(problems.map((p) => p.file)).toEqual(['a.json', 'b.json', 'c.json'])
    expect(problems[0]?.message).toContain('cannot read as JSON')
    expect(problems[1]?.message).toContain('non-empty JSON array')
  })

  it('points at the exact field that breaks the schema', () => {
    const dir = tempDir({
      'a.json': [makeQuestion(), makeQuestion({ id: 'otra-pregunta', correctIndex: 9 })],
    })
    const { problems } = loadQuestionFiles(listQuestionFiles(dir))
    expect(problems.some((p) => p.message.startsWith('1.correctIndex'))).toBe(true)
  })

  it('labels file-level schema problems as "(file)"', () => {
    const dir = tempDir({ 'a.json': [makeQuestion(), 'not a question'] })
    expect(loadQuestionFiles(listQuestionFiles(dir)).problems.length).toBeGreaterThan(0)
  })
})

describe('validateQuestionFiles', () => {
  it('is ok for a clean bank', () => {
    const dir = tempDir({ '2026-01-01-a.json': makeBank('medio', 3) })
    expect(validateQuestionFiles(listQuestionFiles(dir), { checkNames: true }).ok).toBe(true)
  })

  it('fails on duplicates across files', () => {
    const dir = tempDir({
      '2026-01-01-a.json': [makeQuestion({ id: 'repetida' })],
      '2026-01-02-b.json': [makeQuestion({ id: 'repetida', text: 'Otro texto muy distinto aquí' })],
    })
    const report = validateQuestionFiles(listQuestionFiles(dir))
    expect(report.ok).toBe(false)
    expect(report.issues[0]?.message).toContain('duplicate id')
  })

  it('fails on schema problems', () => {
    const dir = tempDir({ '2026-01-01-a.json': [{ id: 'x' }] })
    expect(validateQuestionFiles(listQuestionFiles(dir)).ok).toBe(false)
  })

  it('checks file names only when asked', () => {
    const dir = tempDir({ 'preguntas.json': makeBank('medio', 1) })
    const paths = listQuestionFiles(dir)
    expect(validateQuestionFiles(paths).ok).toBe(true)
    expect(validateQuestionFiles(paths, { checkNames: true }).ok).toBe(false)
    expect(fileNameProblems(paths)[0]?.message).toContain('YYYY-MM-DD')
  })

  it('recognises the naming convention', () => {
    expect(FILE_NAME_PATTERN.test('2026-11-16-ciencias.json')).toBe(true)
    expect(FILE_NAME_PATTERN.test('2026-11-16-arte-y-literatura.json')).toBe(true)
    expect(FILE_NAME_PATTERN.test('ciencias.json')).toBe(false)
    expect(FILE_NAME_PATTERN.test('2026-11-16-Ciencias.json')).toBe(false)
  })
})

describe('summarize', () => {
  it('counts questions per category and difficulty', () => {
    const table = summarize([
      ...makeBank('medio', 2),
      makeQuestion({ id: 'ciencia-1', category: 'Ciencias', difficulty: 'difícil' }),
    ])
    expect(table).toContain('Historia y Geografía')
    expect(table.split('\n').find((line) => line.startsWith('Ciencias'))).toMatch(/1\s+0\s+1$/)
    expect(table.split('\n').at(-1)).toMatch(/3$/)
  })
})

describe('import helpers', () => {
  it('splits work into batches that fit Firestore limits', () => {
    expect(BATCH_SIZE).toBeLessThanOrEqual(500)
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
    expect(chunk([], 3)).toEqual([])
  })

  it('turns createdAt into a Date and keeps every other field', () => {
    const question = makeQuestion({ source: 'https://example.org' })
    const doc = toFirestoreDoc(question)
    expect(doc.createdAt).toEqual(new Date('2026-01-01T00:00:00Z'))
    expect(doc).toMatchObject({ id: question.id, status: 'active', source: 'https://example.org' })
  })

  it('never guesses the project', () => {
    expect(resolveTarget({ project: undefined }, {})).toMatchObject({
      error: expect.stringContaining('No target project'),
    })
    expect(resolveTarget({ project: undefined }, { FIREBASE_PROJECT_ID: '' })).toHaveProperty(
      'error',
    )
  })

  it('takes the project from the flag first, then the environment', () => {
    expect(
      resolveTarget({ project: 'flag-project' }, { FIREBASE_PROJECT_ID: 'env-project' }),
    ).toEqual({
      kind: 'project',
      project: 'flag-project',
    })
    expect(resolveTarget({ project: undefined }, { FIREBASE_PROJECT_ID: 'env-project' })).toEqual({
      kind: 'project',
      project: 'env-project',
    })
  })

  it('writes to the emulator when one is configured', () => {
    expect(
      resolveTarget({ project: 'demo-x' }, { FIRESTORE_EMULATOR_HOST: '127.0.0.1:8180' }),
    ).toEqual({ kind: 'emulator', host: '127.0.0.1:8180', project: 'demo-x' })
  })

  it('refuses credentials stored inside the repository', () => {
    const repo = '/work/quiz-game'
    expect(
      credentialsInsideRepo({ GOOGLE_APPLICATION_CREDENTIALS: '/work/quiz-game/key.json' }, repo),
    ).toBe('/work/quiz-game/key.json')
    expect(
      credentialsInsideRepo(
        { GOOGLE_APPLICATION_CREDENTIALS: '/work/quiz-game/keys/a/b.json' },
        repo,
      ),
    ).not.toBeNull()
    expect(
      credentialsInsideRepo({ GOOGLE_APPLICATION_CREDENTIALS: '/home/me/key.json' }, repo),
    ).toBeNull()
    expect(
      credentialsInsideRepo(
        { GOOGLE_APPLICATION_CREDENTIALS: '/work/quiz-game-other/key.json' },
        repo,
      ),
    ).toBeNull()
    expect(credentialsInsideRepo({}, repo)).toBeNull()
  })
})

// Each test starts a tsx process that loads the whole bank. That takes ~3 s locally and more on
// a shared CI runner, and it grows with the bank, so the default 5 s is not enough.
describe('questions:validate command', { timeout: 30_000 }, () => {
  const run = (...args: string[]) => {
    try {
      const stdout = execFileSync('npx', ['tsx', 'scripts/validate-questions.ts', ...args], {
        cwd: root,
        encoding: 'utf8',
        stdio: 'pipe',
      })
      return { code: 0, out: stdout }
    } catch (error) {
      const { status, stdout, stderr } = error as { status: number; stdout: string; stderr: string }
      return { code: status, out: `${stdout}${stderr}` }
    }
  }

  it('passes on the real question bank', () => {
    const { code, out } = run()
    expect(code).toBe(0)
    expect(out).toContain('are valid')
  })

  it('prints the balance table with --summary', () => {
    expect(run('--summary').out).toContain('muy difícil')
  })

  it('fails with exit code 1 and explains duplicates', () => {
    const dir = tempDir({
      '2026-01-01-a.json': [makeQuestion({ id: 'repetida' })],
      '2026-01-02-b.json': [makeQuestion({ id: 'repetida', text: 'Otro texto muy distinto aquí' })],
    })
    const { code, out } = run('--dir', dir)
    expect(code).toBe(1)
    expect(out).toContain('duplicate id')
  })

  it('checks a candidate file against the bank and catches a repeated question', () => {
    const existing = makeQuestion({
      id: 'candidata-repetida',
      text: '¿Quién escribió «Don Quijote de la Mancha»?',
      options: [
        'Lope de Vega',
        'Miguel de Cervantes',
        'Francisco de Quevedo',
        'Pedro Calderón de la Barca',
      ],
      correctIndex: 1,
    })
    const dir = tempDir({ 'candidata.json': [existing] })
    const { code, out } = run('--candidate', join(dir, 'candidata.json'))
    expect(code).toBe(1)
    expect(out).toContain('same question text')
  })

  it('rejects bank files whose names break the convention', () => {
    const dir = tempDir({ 'sin-fecha.json': makeBank('medio', 1) })
    const { code, out } = run('--dir', dir)
    expect(code).toBe(1)
    expect(out).toContain('YYYY-MM-DD')
  })
})
