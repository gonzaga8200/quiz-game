import { createRankingService } from '~/utils/ranking-service'
import type { RankingService } from '~/utils/ranking-service'

let service: Promise<RankingService> | null = null

/** The ranking service, created on first use so Firebase loads only when needed. */
export function useRankingService() {
  const { load } = useFirebase()

  function get(): Promise<RankingService> {
    service ??= load().then(({ lib, services }) =>
      createRankingService(lib.createRankingStore(services.db)),
    )
    return service
  }

  return { get }
}
