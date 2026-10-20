import { formatShare } from "@/lib/format"
import { DISLIKED_AT, LOVED_AT } from "@/lib/rating-stats"

/*
 * Disliked | in between | loved, as one diverging bar: red on the left, blue
 * on the right, gray in the middle. The labels underneath carry the numbers,
 * so the colors are never the only way to read it.
 */
export function RatingSplit({
  loved,
  disliked,
  total,
  compact = false,
}: {
  loved: number
  disliked: number
  total: number
  /** One-line label for lists. */
  compact?: boolean
}) {
  if (total === 0) return null
  const lovedShare = loved / total
  const dislikedShare = disliked / total
  const middleShare = Math.max(0, 1 - lovedShare - dislikedShare)

  const segments = [
    { key: "disliked", share: dislikedShare, className: "bg-viz-disliked" },
    { key: "middle", share: middleShare, className: "bg-viz-neutral" },
    { key: "loved", share: lovedShare, className: "bg-viz-loved" },
  ].filter((s) => s.share > 0)

  return (
    <div className="flex flex-col gap-1.5">
      <div aria-hidden className="flex h-2 w-full gap-0.5">
        {segments.map((segment, i) => (
          <span
            key={segment.key}
            className={`h-full ${segment.className} ${i === 0 ? "rounded-l-[4px]" : ""} ${i === segments.length - 1 ? "rounded-r-[4px]" : ""}`}
            style={{ flexGrow: segment.share, flexBasis: 0, minWidth: 2 }}
          />
        ))}
      </div>
      <p className="flex flex-wrap justify-between gap-x-3 text-xs text-zinc-600 dark:text-zinc-400">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="size-2 rounded-full bg-viz-disliked" />
          {formatShare(dislikedShare)} disliked it{compact ? "" : ` (${DISLIKED_AT}★ or less)`}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="size-2 rounded-full bg-viz-loved" />
          {formatShare(lovedShare)} loved it{compact ? "" : ` (${LOVED_AT}★ or more)`}
        </span>
      </p>
    </div>
  )
}
