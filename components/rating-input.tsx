"use client"

import { useEffect, useOptimistic, useRef, useState, useTransition } from "react"

import { starFill, StarShape } from "@/components/stars"
import { clearRating, rateMovie } from "@/lib/actions/ratings"
import { formatStars } from "@/lib/format"

/*
 * Half-star rating input (½ to 5). Each star has a left half (n - 0.5) and a
 * right half (n); hovering previews, clicking saves right away.
 *
 * Under the stars are ten real radio buttons, so it works with a keyboard and
 * screen readers: arrow keys step by half a star. Keyboard changes save after
 * a short pause (or when focus leaves), so arrowing from 1 to 5 is one save,
 * not eight.
 *
 * The page re-renders with the saved value after each save; until then the
 * new value shows optimistically, and a failed save falls back to it.
 */

const KEYBOARD_SAVE_DELAY_MS = 700

export function RatingInput({
  movieId,
  initialRating,
}: {
  movieId: string
  initialRating: number | null
}) {
  const [saved, setOptimisticSaved] = useOptimistic(initialRating)
  // A keyboard change waiting to be saved (undefined: none).
  const [draft, setDraft] = useState<number | null | undefined>(undefined)
  const [hover, setHover] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [justSaved, setJustSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const pendingDraft = useRef<number | null | undefined>(undefined)
  const viaKeyboard = useRef(false)

  useEffect(() => () => clearTimeout(timer.current), [])

  const current = draft !== undefined ? draft : saved
  const shown = hover ?? current
  const previewing = hover !== null && hover !== current

  function save(next: number | null) {
    clearTimeout(timer.current)
    pendingDraft.current = undefined
    setError(null)
    setJustSaved(false)
    startTransition(async () => {
      setOptimisticSaved(next)
      setDraft(undefined)
      const result = next === null ? await clearRating(movieId) : await rateMovie(movieId, next)
      if (result.ok) setJustSaved(true)
      else setError(result.error)
    })
  }

  function select(next: number) {
    if (!viaKeyboard.current) return save(next)
    setDraft(next)
    setJustSaved(false) // the new value isn't saved yet
    pendingDraft.current = next
    clearTimeout(timer.current)
    timer.current = setTimeout(() => save(next), KEYBOARD_SAVE_DELAY_MS)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <fieldset
        className="flex flex-wrap items-center gap-x-3 gap-y-1"
        onKeyDown={() => (viaKeyboard.current = true)}
        onPointerDown={() => (viaKeyboard.current = false)}
        onBlur={(event) => {
          // Leaving the stars with an unsaved keyboard change: save it now.
          const leaving = !event.currentTarget.contains(event.relatedTarget)
          if (leaving && pendingDraft.current !== undefined) save(pendingDraft.current)
        }}
      >
        <legend className="sr-only">Your rating</legend>
        <span aria-hidden className="text-sm text-zinc-600 dark:text-zinc-400">
          Your rating
        </span>

        <div
          className={`flex rounded-md transition-opacity ${previewing ? "opacity-60" : ""} has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-amber-500`}
          onMouseLeave={() => setHover(null)}
        >
          {[1, 2, 3, 4, 5].map((star) => (
            <span key={star} className="relative">
              <StarShape fill={starFill(star, shown)} className="size-7" />
              {[star - 0.5, star].map((value) => (
                <label
                  key={value}
                  onMouseEnter={() => setHover(value)}
                  className={`absolute inset-y-0 w-1/2 cursor-pointer ${value === star ? "right-0" : "left-0"}`}
                >
                  <input
                    type="radio"
                    name={`rating-${movieId}`}
                    value={value}
                    checked={current === value}
                    onChange={() => select(value)}
                    className="sr-only"
                  />
                  <span className="sr-only">{value === 1 ? "1 star" : `${value} stars`}</span>
                </label>
              ))}
            </span>
          ))}
        </div>

        {/* While hovering, the label is muted: it's a preview, not the saved rating. */}
        <span
          className={`min-w-[3.5rem] text-sm font-medium tabular-nums ${previewing ? "text-zinc-500" : ""}`}
        >
          {shown !== null ? `${formatStars(shown)} / 5` : "Not rated"}
        </span>

        {current !== null && hover === null && (
          <button
            type="button"
            onClick={() => save(null)}
            className="text-sm text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-400"
          >
            Clear
          </button>
        )}

        <span aria-live="polite" className="text-sm text-zinc-500">
          {isPending ? "Saving…" : justSaved ? "Saved" : ""}
        </span>
      </fieldset>

      {error && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  )
}
