import { describe, expect, it } from 'vitest'
import { compareRules } from '../../scripts/lib/rules-drift'

const RULES = [
  "rules_version = '2';",
  'service cloud.firestore {',
  '  match /databases/{database}/documents {',
  '    match /questions/{id} { allow write: if false; }',
  '  }',
  '}',
].join('\n')

describe('compareRules', () => {
  it('is in sync when the published rules are the repository file', () => {
    expect(compareRules(RULES, RULES)).toEqual({ inSync: true })
  })

  it('ignores line endings, trailing spaces and the final newline', () => {
    const published = RULES.replace(/\n/g, '\r\n') + '\r\n'
    const local = RULES.replace('{\n', '{   \n') + '\n\n'
    expect(compareRules(published, local)).toEqual({ inSync: true })
  })

  it('reports the first line where the published rules differ', () => {
    const published = RULES.replace('allow write: if false;', 'allow write: if true;')
    expect(compareRules(published, RULES)).toEqual({
      inSync: false,
      line: 4,
      published: '    match /questions/{id} { allow write: if true; }',
      local: '    match /questions/{id} { allow write: if false; }',
    })
  })

  it('reports rules that were never published as missing lines', () => {
    const published = RULES.split('\n').slice(0, 3).join('\n')
    expect(compareRules(published, RULES)).toEqual({
      inSync: false,
      line: 4,
      published: '',
      local: '    match /questions/{id} { allow write: if false; }',
    })
  })

  it('reports extra published lines that are no longer in the repository', () => {
    const published = RULES + '\n// old rule'
    expect(compareRules(published, RULES)).toEqual({
      inSync: false,
      line: 7,
      published: '// old rule',
      local: '',
    })
  })
})
