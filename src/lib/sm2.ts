/**
 * SM-2 spaced repetition (Wozniak, 1987 — the algorithm behind Anki/SuperMemo).
 *
 * Pure functions, no I/O. The caller is responsible for loading/saving
 * `ReviewCard` state (see `review_state` table in the Drizzle schema).
 *
 * This app only has binary correct/wrong + whether a hint was used, not a
 * self-reported 0-5 confidence score. `qualityFromOutcome` maps that signal
 * onto SM-2's expected 0-5 quality scale:
 *   - wrong                -> 2 (below the q<3 threshold: resets the card)
 *   - correct, hint used   -> 3 (correct but with help: smallest ease gain)
 *   - correct, no hint     -> 4 (the algorithm's default "good" response)
 * There's no path to 5 ("perfect, instant") or 0/1 (this app doesn't ask the
 * user to rate their own blackout level) — that's a deliberate simplification
 * for a binary-outcome quiz app, not a misreading of the algorithm.
 */

export type ReviewCard = {
  easeFactor: number; // >= 1.3, starts at 2.5
  intervalDays: number; // days until next review (0 = never reviewed)
  repetitions: number; // consecutive correct reviews
};

export const newReviewCard = (): ReviewCard => ({
  easeFactor: 2.5,
  intervalDays: 0,
  repetitions: 0,
});

export function qualityFromOutcome(correct: boolean, hintUsed: boolean): number {
  if (!correct) return 2;
  return hintUsed ? 3 : 4;
}

/**
 * Apply one SM-2 review step. `quality` is 0-5 (see qualityFromOutcome).
 * Returns a new ReviewCard — does not mutate the input.
 */
export function sm2(card: ReviewCard, quality: number): ReviewCard {
  const q = Math.max(0, Math.min(5, quality));

  if (q < 3) {
    // Failed recall: restart the schedule, but don't punish ease below the floor.
    return {
      easeFactor: card.easeFactor,
      intervalDays: 1,
      repetitions: 0,
    };
  }

  const repetitions = card.repetitions + 1;
  const easeFactor = Math.max(1.3, card.easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));

  let intervalDays: number;
  if (repetitions === 1) intervalDays = 1;
  else if (repetitions === 2) intervalDays = 6;
  else intervalDays = Math.round(card.intervalDays * easeFactor);

  return { easeFactor, intervalDays, repetitions };
}

/** Convenience wrapper: review a card from a correct/wrong + hint outcome. */
export function reviewFromOutcome(
  card: ReviewCard,
  correct: boolean,
  hintUsed: boolean,
): ReviewCard {
  return sm2(card, qualityFromOutcome(correct, hintUsed));
}
