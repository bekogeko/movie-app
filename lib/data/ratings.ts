import { cacheLife, cacheTag, io } from "next/cache"

import { toPosterUrl } from "@/lib/data/movies"
import { read, write } from "@/lib/neo4j"

/*
 * A user's ratings, in the recommendations dataset's own format so new ratings
 * count in every stat and recommendation alongside the existing ones:
 *
 *   (:User)-[:RATED {rating: 0.5..5 (float, half steps), timestamp: Unix seconds}]->(:Movie)
 *
 * Reads are cached per user and tagged with `userRatingsTag(userId)`; the
 * Server Actions in lib/actions/ratings.ts update that tag (and the community
 * stats' RATINGS_CACHE_TAG) after every change, so the user sees it at once.
 *
 * Callers pass a userId they got from the session (requireUser /
 * getCurrentUser), never one from the request.
 */

export type RatedMovie = {
  movie: {
    movieId: string
    title: string
    year: number | null
    poster: string | null
  }
  rating: number
  /** When it was rated, in Unix seconds (the dataset's RATED.timestamp). */
  ratedAt: number | null
}

export function userRatingsTag(userId: string): string {
  return `user-ratings:${userId}`
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

/*
 * One RATED per user and movie: MERGE updates an existing rating in place.
 * timestamp() is milliseconds; integer division keeps the dataset's seconds.
 */
const SET_RATING = `
MATCH (u:User {userId: $userId})
MATCH (m:Movie {movieId: $movieId})
MERGE (u)-[r:RATED]->(m)
SET r.rating = toFloat($rating), r.timestamp = timestamp() / 1000
RETURN r.rating AS rating
`

/** Saves the rating. Returns false if the user or movie doesn't exist. */
export async function setRating(
  userId: string,
  movieId: string,
  rating: number,
): Promise<boolean> {
  const rows = await write(SET_RATING, { userId, movieId, rating })
  return rows.length > 0
}

export async function removeRating(userId: string, movieId: string): Promise<void> {
  await write(
    `MATCH (:User {userId: $userId})-[r:RATED]->(:Movie {movieId: $movieId})
     DELETE r`,
    { userId, movieId },
  )
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/* Highest rated first; ties go to the most recently rated, then by title. */
const USER_RATINGS = `
MATCH (:User {userId: $userId})-[r:RATED]->(m:Movie)
RETURN m {
  .movieId,
  .title,
  year: coalesce(m.year, toInteger(left(toString(m.released), 4))),
  .poster
} AS movie, r.rating AS rating, r.timestamp AS ratedAt
ORDER BY rating DESC, ratedAt DESC, movie.title
`

async function cachedUserRatings(userId: string): Promise<RatedMovie[]> {
  "use cache"
  cacheLife("hours")
  cacheTag(userRatingsTag(userId))

  const rows = await read<RatedMovie>(USER_RATINGS, { userId })
  return rows.map((row) => ({
    ...row,
    movie: { ...row.movie, poster: toPosterUrl(row.movie.poster) },
  }))
}

/** Everything the user has rated, highest rated first. */
export async function getUserRatings(userId: string): Promise<RatedMovie[]> {
  // Keep the cached query out of `next build` (see lib/data/stats.ts).
  await io()
  return cachedUserRatings(userId)
}

/** The user's rating for one movie, or null if they haven't rated it. */
export async function getUserRating(userId: string, movieId: string): Promise<number | null> {
  const ratings = await getUserRatings(userId)
  return ratings.find((r) => r.movie.movieId === movieId)?.rating ?? null
}
