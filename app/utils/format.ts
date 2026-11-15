/** Countdown text such as "1:05". Rounds up so "0:00" only shows when time is truly out. */
export function formatClock(ms: number): string {
  const totalSeconds = Math.ceil(Math.max(0, ms) / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

/** Duration spent on a question in Spanish notation, e.g. "4,2 s". */
export function formatSeconds(ms: number): string {
  const value = (Math.max(0, ms) / 1000).toLocaleString('es-ES', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
  return `${value} s`
}

/** "+7" / "−2" / "0", using a real minus sign so it reads well and is not mistaken for a dash. */
export function formatSigned(value: number): string {
  if (value > 0) return `+${value}`
  if (value < 0) return `−${Math.abs(value)}`
  return '0'
}
