import type { SubmitResult } from '~/utils/ranking-service'

/** Progress of saving a finished competitive game to the ranking. */
export type SubmissionState =
  | { readonly status: 'idle' }
  | { readonly status: 'saving' }
  | { readonly status: 'done'; readonly result: SubmitResult }
  | { readonly status: 'error' }
