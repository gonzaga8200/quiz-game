/**
 * Loads the approved question files into Firestore. Idempotent: every question is
 * written to the document named after its id, so running it again updates in place
 * and never creates duplicates. To retire a question, set its "status" to "disabled"
 * in the file and import again.
 *
 *   FIREBASE_PROJECT_ID=contrarreloj-quiz npm run questions:import
 *   npm run questions:import -- --dry-run          show what would be written
 *   npm run questions:import -- --yes              skip the confirmation prompt
 *   npm run questions:import -- data/questions/2026-11-16-ciencias.json
 *
 * Credentials come from the environment (Application Default Credentials):
 *   gcloud auth application-default login          (use the account that owns the project)
 * or GOOGLE_APPLICATION_CREDENTIALS pointing at a key stored OUTSIDE this repository.
 * With FIRESTORE_EMULATOR_HOST set it writes to the local emulator and needs no credentials.
 */
import { createInterface } from 'node:readline/promises'
import { resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { applicationDefault, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import type { Firestore } from 'firebase-admin/firestore'
import {
  BATCH_SIZE,
  chunk,
  credentialsInsideRepo,
  resolveTarget,
  toFirestoreDoc,
} from './lib/import'
import { listQuestionFiles, validateQuestionFiles } from './lib/question-files'

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    dir: { type: 'string', default: 'data/questions' },
    project: { type: 'string' },
    yes: { type: 'boolean', default: false },
    'dry-run': { type: 'boolean', default: false },
  },
})

function fail(message: string, code = 1): never {
  console.error(`✖ ${message}`)
  process.exit(code)
}

// 1. Only valid files are ever imported.
const paths =
  positionals.length > 0
    ? positionals.map((p) => resolve(p))
    : listQuestionFiles(resolve(values.dir))
if (paths.length === 0) fail('No question files found.')
const report = validateQuestionFiles(paths)
if (!report.ok) {
  for (const problem of report.problems) console.error(`error ${problem.file}: ${problem.message}`)
  for (const issue of report.issues.filter((i) => i.level === 'error')) {
    console.error(`error ${issue.file} [${issue.id}]: ${issue.message}`)
  }
  fail('Fix the validation errors first (npm run questions:validate).')
}

// 2. Never import into a project by accident, and never use a key kept in the repo.
const target = resolveTarget({ project: values.project }, process.env)
if ('error' in target) fail(target.error, 2)
const leaked = credentialsInsideRepo(process.env, process.cwd())
if (leaked)
  fail(
    `GOOGLE_APPLICATION_CREDENTIALS points inside the repository (${leaked}). Move the key out of the repo.`,
    2,
  )

const where =
  target.kind === 'emulator'
    ? `the local Firestore emulator (${target.host}), project ${target.project}`
    : `the REAL Firebase project "${target.project}"`
console.log(`${report.entries.length} question(s) from ${paths.length} file(s) -> ${where}`)

if (values['dry-run']) {
  for (const { question } of report.entries)
    console.log(`  ${question.id}  [${question.category}, ${question.difficulty}]`)
  console.log('Dry run: nothing was written.')
  process.exit(0)
}

// 3. Ask before writing to a real project.
if (target.kind === 'project' && !values.yes) {
  if (!process.stdin.isTTY)
    fail('Not an interactive terminal: pass --yes to confirm the import.', 2)
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const answer = await rl.question(
    'Write these questions now? Existing ids will be overwritten. (y/N) ',
  )
  rl.close()
  if (answer.trim().toLowerCase() !== 'y') fail('Cancelled. Nothing was written.', 0)
}

// 4. Write, in batches, to documents named after the question ids.
const app = initializeApp(
  target.kind === 'emulator'
    ? { projectId: target.project }
    : { projectId: target.project, credential: applicationDefault() },
)
const db: Firestore = getFirestore(app)

try {
  for (const group of chunk(report.entries, BATCH_SIZE)) {
    const batch = db.batch()
    for (const { question } of group) {
      batch.set(db.collection('questions').doc(question.id), toFirestoreDoc(question))
    }
    await batch.commit()
  }
} catch (error) {
  const message = (error as Error).message
  fail(
    /credential|default credentials|permission|UNAUTHENTICATED|PERMISSION_DENIED/i.test(message)
      ? `Could not authenticate or write: ${message}\nRun "gcloud auth application-default login" with the account that owns the project.`
      : message,
  )
}

console.log(
  `✔ Wrote ${report.entries.length} question(s) to "${target.project}". Re-running is safe: ids are overwritten, not duplicated.`,
)
process.exit(0)
