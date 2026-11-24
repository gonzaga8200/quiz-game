/**
 * Checks that the Firestore security rules Firebase is serving are the ones in
 * firestore.rules. Read only: it never changes anything.
 *
 * Rules are deployed on their own (the web deploy does not touch them), so the site can ship
 * a feature that the published rules still reject. That is how ranking saves failed after the
 * category selector. Run this after a deploy, or whenever saving to the ranking fails:
 *
 *   npm run rules:check -- --project contrarreloj-quiz
 *
 * Exit code 0: in sync. 1: the published rules differ (or could not be read). 2: bad usage.
 * To fix a difference: npx firebase deploy --only firestore:rules --project <id>
 *
 * Credentials come from the environment (Application Default Credentials), like the import:
 *   gcloud auth application-default login
 * or GOOGLE_APPLICATION_CREDENTIALS pointing at a key stored OUTSIDE this repository.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { applicationDefault, initializeApp } from 'firebase-admin/app'
import { getSecurityRules } from 'firebase-admin/security-rules'
import { credentialsInsideRepo } from './lib/import'
import { compareRules } from './lib/rules-drift'

const { values } = parseArgs({
  options: {
    project: { type: 'string' },
    file: { type: 'string', default: 'firestore.rules' },
  },
})

function fail(message: string, code = 1): never {
  console.error(`✖ ${message}`)
  process.exit(code)
}

const project = values.project ?? process.env.FIREBASE_PROJECT_ID
if (!project) {
  fail('No project. Pass --project <id> or set FIREBASE_PROJECT_ID (it is never guessed).', 2)
}
const leaked = credentialsInsideRepo(process.env, process.cwd())
if (leaked) {
  fail(
    `GOOGLE_APPLICATION_CREDENTIALS points inside the repository (${leaked}). Move the key out of the repo.`,
    2,
  )
}

const local = readFileSync(resolve(values.file), 'utf8')

let published: string
try {
  const app = initializeApp({ projectId: project, credential: applicationDefault() })
  const ruleset = await getSecurityRules(app).getFirestoreRuleset()
  published = ruleset.source.map((file) => file.content).join('\n')
  console.log(`Published ruleset created at ${ruleset.createTime}`)
} catch (error) {
  const message = (error as Error).message
  fail(
    /credential|default credentials|permission|UNAUTHENTICATED|PERMISSION_DENIED/i.test(message)
      ? `Could not read the published rules: ${message}\nRun "gcloud auth application-default login" with an account that can read project "${project}".`
      : message,
  )
}

const result = compareRules(published, local)
if (result.inSync) {
  console.log(`✔ The rules published in "${project}" are the ones in ${values.file}.`)
  process.exit(0)
}

console.error(
  [
    `✖ The rules published in "${project}" differ from ${values.file}, first at line ${result.line}:`,
    `  published: ${result.published || '(nothing)'}`,
    `  repository: ${result.local || '(nothing)'}`,
    `Deploy them: npx firebase deploy --only firestore:rules --project ${project}`,
  ].join('\n'),
)
process.exit(1)
