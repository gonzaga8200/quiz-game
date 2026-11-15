/** Visual state of one answer button while a question is on screen. */
export type OptionState =
  /** Not answered yet, or an option that was neither chosen nor the right one. */
  | 'idle'
  /** The player's choice, and it was right. */
  | 'correct'
  /** The player's choice, and it was wrong. */
  | 'wrong'
  /** The right answer, shown after a wrong choice. */
  | 'revealed'
