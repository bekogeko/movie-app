/* Shared star drawing for the read-only display and the rating input. */

const STAR_PATH =
  "M12 2.6l2.9 5.98 6.6.95-4.78 4.63 1.13 6.55L12 17.6l-5.85 3.1 1.13-6.55L2.5 9.53l6.6-.95z"

/** How much of star `n` (1..5) is filled for `value`: 0, 0.5 or 1. */
export function starFill(n: number, value: number | null): number {
  if (value === null) return 0
  if (value >= n) return 1
  if (value >= n - 0.5) return 0.5
  return 0
}

/** One star, empty, half or full. Size it with `className` (e.g. "size-6"). */
export function StarShape({ fill, className = "size-4" }: { fill: number; className?: string }) {
  return (
    <span aria-hidden className={`relative inline-block shrink-0 ${className}`}>
      <svg viewBox="0 0 24 24" className="absolute inset-0 size-full text-zinc-300 dark:text-zinc-700">
        <path d={STAR_PATH} fill="currentColor" />
      </svg>
      {fill > 0 && (
        <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
          <svg
            viewBox="0 0 24 24"
            className="aspect-square h-full max-w-none text-amber-500 dark:text-amber-400"
          >
            <path d={STAR_PATH} fill="currentColor" />
          </svg>
        </span>
      )}
    </span>
  )
}

/** Five read-only stars for a rating from 0.5 to 5. */
export function Stars({ value, className = "size-4" }: { value: number; className?: string }) {
  return (
    <span role="img" aria-label={`${value} out of 5 stars`} className="inline-flex">
      {[1, 2, 3, 4, 5].map((n) => (
        <StarShape key={n} fill={starFill(n, value)} className={className} />
      ))}
    </span>
  )
}
