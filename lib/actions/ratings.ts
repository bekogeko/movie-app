"use server"

import { updateTag } from "next/cache"

import { requireUser } from "@/lib/auth/current-user"
import { removeRating, setRating, userRatingsTag } from "@/lib/data/ratings"
import { RATINGS_CACHE_TAG } from "@/lib/data/stats"
import { isValidRating } from "@/lib/ratings"

/*
 * Server Actions for the star input. Both re-check the session (a signed-out
 * caller is sent to /login and back to the movie), validate their arguments,
 * and expire the caches the change affects so the page re-renders with it.
 */

export type RatingResult = { ok: true } | { ok: false; error: string }

export async function rateMovie(movieId: unknown, rating: unknown): Promise<RatingResult> {
  if (!isMovieId(movieId)) return { ok: false, error: "Unknown movie." }
  if (!isValidRating(rating)) {
    return { ok: false, error: "Ratings go from ½ to 5 stars, in half stars." }
  }

  const user = await requireUser(`/movies/${encodeURIComponent(movieId)}`)
  try {
    const saved = await setRating(user.userId, movieId, rating)
    if (!saved) return { ok: false, error: "That movie doesn't exist." }
  } catch (error) {
    console.error("[ratings] Saving a rating failed", error)
    return { ok: false, error: "Couldn't save your rating. Please try again." }
  }

  expireRatingCaches(user.userId)
  return { ok: true }
}

export async function clearRating(movieId: unknown): Promise<RatingResult> {
  if (!isMovieId(movieId)) return { ok: false, error: "Unknown movie." }

  const user = await requireUser(`/movies/${encodeURIComponent(movieId)}`)
  try {
    await removeRating(user.userId, movieId)
  } catch (error) {
    console.error("[ratings] Removing a rating failed", error)
    return { ok: false, error: "Couldn't remove your rating. Please try again." }
  }

  expireRatingCaches(user.userId)
  return { ok: true }
}

function expireRatingCaches(userId: string) {
  // This user's ratings (movie page, profile)...
  updateTag(userRatingsTag(userId))
  // ...and the community stats, which aggregate every rating.
  updateTag(RATINGS_CACHE_TAG)
}

function isMovieId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 64
}
