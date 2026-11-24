/**
 * Contact by email. The site never sends anything: it only builds `mailto:` links, so the
 * visitor's own mail app opens with the address and, where useful, the subject and the text
 * already filled in. The visitor writes the rest and decides whether to send it.
 */

export const CONTACT_REASONS = [
  { key: 'suggestion', label: 'Una sugerencia', subject: 'Sugerencia · Contrarreloj' },
  {
    key: 'wrong-answer',
    label: 'Una pregunta con una respuesta incorrecta',
    subject: 'Pregunta con respuesta incorrecta · Contrarreloj',
  },
  { key: 'other', label: 'Otra consulta', subject: 'Consulta · Contrarreloj' },
] as const

/** `mailto:` link for an address, with an optional subject and body. */
export function mailtoHref(email: string, subject = '', body = ''): string {
  const params: string[] = []
  if (subject) params.push(`subject=${encodeURIComponent(subject)}`)
  if (body) params.push(`body=${encodeURIComponent(body)}`)
  return `mailto:${email}${params.length > 0 ? `?${params.join('&')}` : ''}`
}

const QUESTION_ID = /^[A-Za-z0-9_-]{1,64}$/
const QUESTION_TEXT_MAX = 300

/**
 * A report about a question in the game. The subject and the question are filled in; the body
 * ends after a blank line, where the visitor writes what they see.
 */
export function questionReportHref(email: string, question: { id: string; text: string }): string {
  const id = QUESTION_ID.test(question.id) ? question.id : ''
  const text = question.text.trim().slice(0, QUESTION_TEXT_MAX)
  const subject = id
    ? `Pregunta con respuesta incorrecta (pregunta ${id})`
    : 'Pregunta con respuesta incorrecta'
  const lines = [text && `Pregunta: ${text}`, id && `Identificador: ${id}`].filter(Boolean)
  const body = lines.length > 0 ? `${lines.join('\n')}\n\n` : ''
  return mailtoHref(email, subject, body)
}
