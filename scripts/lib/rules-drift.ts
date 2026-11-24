export type RulesComparison =
  | { readonly inSync: true }
  | {
      readonly inSync: false
      /** First line (1-based) where the two files differ. */
      readonly line: number
      readonly published: string
      readonly local: string
    }

/** Line endings, trailing spaces and blank lines at the end never change what the rules do. */
function toLines(source: string): string[] {
  const lines = source.split(/\r?\n/).map((line) => line.trimEnd())
  while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop()
  return lines
}

/**
 * Compares the rules Firebase is serving with the repository file. Security rules are
 * deployed on their own, so the web can ship a feature the published rules still reject.
 */
export function compareRules(published: string, local: string): RulesComparison {
  const publishedLines = toLines(published)
  const localLines = toLines(local)
  const total = Math.max(publishedLines.length, localLines.length)
  for (let i = 0; i < total; i++) {
    const a = publishedLines[i] ?? ''
    const b = localLines[i] ?? ''
    if (a !== b) return { inSync: false, line: i + 1, published: a, local: b }
  }
  return { inSync: true }
}
