import { formatCount, formatShare, formatStars, plural } from "@/lib/format"
import type { RatingBucket } from "@/lib/rating-stats"

/*
 * How many people gave each half-star rating. Server-rendered, no JS: each
 * column shows its exact count on hover or keyboard focus, and the same
 * numbers are in the "Show as table" view.
 */
export function RatingHistogram({ buckets }: { buckets: RatingBucket[] }) {
  const total = buckets.reduce((sum, b) => sum + b.count, 0)
  const max = Math.max(1, ...buckets.map((b) => b.count))
  const mode = buckets.reduce((best, b) => (b.count > best.count ? b : best), buckets[0])

  return (
    <figure className="flex min-w-0 flex-col gap-3">
      <figcaption className="text-sm text-zinc-600 dark:text-zinc-400">
        How people rated it
      </figcaption>

      <ol className="flex h-36 items-end gap-0.5 border-b border-viz-baseline pt-6">
        {buckets.map((bucket, i) => {
          const share = total > 0 ? bucket.count / total : 0
          const label = `${formatStars(bucket.rating)} stars: ${plural(bucket.count, "rating")} (${formatShare(share)})`
          // Keep tooltips on the edge columns inside the card.
          const align =
            i < 2 ? "left-0" : i > buckets.length - 3 ? "right-0" : "left-1/2 -translate-x-1/2"

          return (
            <li
              key={bucket.rating}
              tabIndex={0}
              aria-label={label}
              className="group/bar relative flex h-full flex-1 items-end justify-center rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-viz-series/40"
            >
              {bucket === mode && bucket.count > 0 && (
                <span
                  aria-hidden
                  className="absolute inset-x-0 text-center text-xs text-zinc-600 dark:text-zinc-400"
                  style={{ bottom: `calc(${(bucket.count / max) * 100}% + 4px)` }}
                >
                  {formatShare(share)}
                </span>
              )}
              <span
                aria-hidden
                className="w-full max-w-6 rounded-t-[4px] bg-viz-series transition-opacity group-hover/bar:opacity-80 group-focus-visible/bar:opacity-80"
                style={{ height: bucket.count > 0 ? `max(2px, ${(bucket.count / max) * 100}%)` : 0 }}
              />
              <span
                aria-hidden
                className={`pointer-events-none absolute bottom-full z-10 mb-1 hidden whitespace-nowrap rounded-md border border-black/[.08] bg-background px-2 py-1 text-xs shadow-sm group-hover/bar:block group-focus-visible/bar:block dark:border-white/[.145] ${align}`}
              >
                <span className="font-semibold">{plural(bucket.count, "rating")}</span>
                <span className="text-zinc-600 dark:text-zinc-400">
                  {" "}
                  · {formatStars(bucket.rating)}★ · {formatShare(share)}
                </span>
              </span>
            </li>
          )
        })}
      </ol>

      {/* Whole stars only; the half-star columns sit between them. */}
      <div aria-hidden className="-mt-1 flex gap-0.5 text-xs text-zinc-500">
        {buckets.map((bucket) => (
          <span key={bucket.rating} className="flex-1 text-center tabular-nums">
            {Number.isInteger(bucket.rating) ? `${bucket.rating}★` : ""}
          </span>
        ))}
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer text-zinc-600 select-none hover:text-foreground dark:text-zinc-400">
          Show as table
        </summary>
        <table className="mt-2 w-full max-w-xs text-left tabular-nums">
          <thead className="text-xs text-zinc-500">
            <tr>
              <th className="py-1 font-normal">Stars</th>
              <th className="py-1 text-right font-normal">Ratings</th>
              <th className="py-1 text-right font-normal">Share</th>
            </tr>
          </thead>
          <tbody>
            {[...buckets].reverse().map((bucket) => (
              <tr key={bucket.rating} className="border-t border-black/[.06] dark:border-white/[.08]">
                <td className="py-1">{formatStars(bucket.rating)}</td>
                <td className="py-1 text-right">{formatCount(bucket.count)}</td>
                <td className="py-1 text-right">
                  {formatShare(total > 0 ? bucket.count / total : 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  )
}
