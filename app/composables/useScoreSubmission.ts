import { shallowRef } from 'vue'
import type { GameReport } from '~~/core'
import type { SubmissionState } from '~/types/ranking'

/** Saves a finished competitive game to the ranking and exposes the progress. */
export function useScoreSubmission() {
  const { user } = useAuth()
  const { get } = useRankingService()

  const state = shallowRef<SubmissionState>({ status: 'idle' })
  let lastReport: GameReport | null = null

  async function submit(report: GameReport): Promise<void> {
    lastReport = report
    const player = user.value
    if (!player) {
      state.value = { status: 'error' }
      return
    }
    state.value = { status: 'saving' }
    try {
      const service = await get()
      state.value = { status: 'done', result: await service.submit(player, report) }
    } catch {
      state.value = { status: 'error' }
    }
  }

  function retry(): void {
    if (lastReport) void submit(lastReport)
  }

  function reset(): void {
    lastReport = null
    state.value = { status: 'idle' }
  }

  return { state, submit, retry, reset }
}
