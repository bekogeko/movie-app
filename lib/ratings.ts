/*
 * The rating scale, shared by the data layer, the Server Actions and the star
 * input. Same scale as the recommendations dataset: 0.5 to 5 in half stars.
 */

export const MIN_RATING = 0.5
export const MAX_RATING = 5
export const RATING_STEP = 0.5

/** Every allowed value, low to high: 0.5, 1, 1.5, ... 5. */
export const RATING_VALUES = Array.from(
  { length: (MAX_RATING - MIN_RATING) / RATING_STEP + 1 },
  (_, i) => MIN_RATING + i * RATING_STEP,
)

export function isValidRating(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= MIN_RATING &&
    value <= MAX_RATING &&
    Number.isInteger(value / RATING_STEP)
  )
}
