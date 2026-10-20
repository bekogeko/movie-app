/*
 * Rating math shared by the data layer and the UI.
 *
 * Plain functions over plain numbers: no Neo4j, no React. The data layer
 * fetches counts with Cypher and everything here turns them into the numbers
 * the pages show, so the definitions live in one place and can be tested
 * against any list of ratings.
 *
 * The thresholds below were picked against the recommendations dataset
 * (100,004 MovieLens ratings, 671 users, 9,066 rated movies). Half of those
 * movies have 3 ratings or fewer, which is why nothing gets ranked until it
 * has a handful.
 */

/** A rating at or above this means the person loved the movie. */
export const LOVED_AT = 4
/** A rating at or below this means the person disliked it. */
export const DISLIKED_AT = 2

/** Movies need this many ratings before they're ranked or listed anywhere. */
export const MIN_RATINGS_TO_RANK = 10

/**
 * How many site-average ratings the weighted score adds to every movie. A
 * movie needs about this many real ratings before its own average counts as
 * much as the site average, so two 5-star ratings can't outrank a classic.
 */
export const PRIOR_WEIGHT = 10

/** Spread and split labels need at least this many ratings to mean anything. */
export const MIN_RATINGS_FOR_AGREEMENT = 20
/** "Divisive": at least this share loved it AND this share disliked it. */
export const DIVISIVE_SHARE = 0.25
/** "Consensus": standard deviation at or below this (the tightest ~20% of movies). */
export const CONSENSUS_MAX_SD = 0.8

/** Hidden gems have fewer ratings than this; "most divisive" and the IMDb list need at least this many. */
export const GEM_MAX_RATINGS = 30
export const POPULAR_MIN_RATINGS = 30

/** Fans-also-loved needs this many fans, and each pick needs this many shared fans (and this share of all fans). */
export const MIN_FANS = 10
export const MIN_SHARED_FANS = 5
export const MIN_SHARED_FAN_SHARE = 0.1

/** A percentile gap this large (20 points) counts as "higher here than on IMDb". */
export const IMDB_GAP = 0.2

/** Genres that only mark missing data in MovieLens. */
const IGNORED_GENRES = new Set(["(no genres listed)"])

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RatingSummary = {
  /** Number of ratings. */
  count: number
  /** Plain average, 0.5 to 5. */
  mean: number
  /** Sample standard deviation; null with fewer than 2 ratings. */
  sd: number | null
  /** How many ratings were LOVED_AT or higher. */
  loved: number
  /** How many ratings were DISLIKED_AT or lower. */
  disliked: number
}

/** One bar of the rating histogram. */
export type RatingBucket = { rating: number; count: number }

/** A movie with enough ratings to be ranked (one row of the leaderboard). */
export type RankedMovie = RatingSummary & {
  movieId: string
  title: string
  year: number | null
  genres: string[]
  imdbRating: number | null
  /** Weighted score, see weightedScore(). */
  score: number
}

/** 1 is best; ties share a rank. */
export type Rank = { rank: number; of: number }

export type Agreement = "consensus" | "divisive" | "typical" | "too-few"

export type MovieStanding = {
  overall: Rank
  genres: { genre: string; rank: Rank }[]
  decade: { decade: number; rank: Rank } | null
  /** Same movies ranked two ways: by this community's weighted score and by IMDb rating. */
  imdb: { here: Rank; imdb: Rank } | null
}

// ---------------------------------------------------------------------------
// Single-movie math
// ---------------------------------------------------------------------------

/**
 * Bayesian average: the movie's ratings plus PRIOR_WEIGHT imaginary ratings at
 * the site average. Few ratings stay close to the site average; many ratings
 * converge on the movie's own average.
 */
export function weightedScore(
  mean: number,
  count: number,
  siteMean: number,
): number {
  return (siteMean * PRIOR_WEIGHT + mean * count) / (PRIOR_WEIGHT + count)
}

/** The ten half-star steps a rating can take. */
export const RATING_STEPS = Array.from({ length: 10 }, (_, i) => (i + 1) / 2)

/**
 * Turn `rating -> count` rows into all ten half-star buckets (missing steps
 * are 0). Ratings off the half-star grid are rounded onto it.
 */
export function toBuckets(
  rows: { rating: number; count: number }[],
): RatingBucket[] {
  const counts = new Map(RATING_STEPS.map((step) => [step, 0]))
  for (const { rating, count } of rows) {
    if (typeof rating !== "number" || !Number.isFinite(rating)) continue
    const step = Math.min(5, Math.max(0.5, Math.round(rating * 2) / 2))
    counts.set(step, (counts.get(step) ?? 0) + count)
  }
  return RATING_STEPS.map((rating) => ({ rating, count: counts.get(rating) ?? 0 }))
}

export function summarize(buckets: RatingBucket[]): RatingSummary {
  let count = 0
  let sum = 0
  let loved = 0
  let disliked = 0
  for (const { rating, count: n } of buckets) {
    count += n
    sum += rating * n
    if (rating >= LOVED_AT) loved += n
    if (rating <= DISLIKED_AT) disliked += n
  }
  const mean = count > 0 ? sum / count : 0

  let squares = 0
  for (const { rating, count: n } of buckets) squares += n * (rating - mean) ** 2
  const sd = count > 1 ? Math.sqrt(squares / (count - 1)) : null

  return { count, mean, sd, loved, disliked }
}

/** Do people agree about this movie, or split into camps? */
export function agreement(summary: RatingSummary): Agreement {
  const { count, loved, disliked, sd } = summary
  if (count < MIN_RATINGS_FOR_AGREEMENT) return "too-few"
  if (loved / count >= DIVISIVE_SHARE && disliked / count >= DIVISIVE_SHARE) {
    return "divisive"
  }
  if (sd !== null && sd <= CONSENSUS_MAX_SD) return "consensus"
  return "typical"
}

/** The smaller of the loved and disliked shares: high only when both camps are big. */
export function splitScore({ count, loved, disliked }: RatingSummary): number {
  return count > 0 ? Math.min(loved, disliked) / count : 0
}

// ---------------------------------------------------------------------------
// Ranking
// ---------------------------------------------------------------------------

/** Rank `value` among `values` (higher is better). `value` should be in `values`. */
export function rankOf(value: number, values: number[]): Rank {
  let better = 0
  for (const v of values) if (v > value) better++
  return { rank: better + 1, of: values.length }
}

/** 0 for the best movie, approaching 1 for the worst. */
export function percentile({ rank, of }: Rank): number {
  return of > 1 ? (rank - 1) / (of - 1) : 0
}

/** "Top 3%": rank as a share of the list, rounded up, never "Top 0%". */
export function topPercent({ rank, of }: Rank): number {
  return Math.max(1, Math.ceil((rank / of) * 100))
}

/**
 * "Top 3%" in the upper half, "Bottom 4%" in the lower half (not "Top 97%").
 * Null for lists under 10 movies, where a percentage says nothing the rank
 * doesn't ("Top 50%" for #1 of 2).
 */
export function standingLabel(rank: Rank): string | null {
  if (rank.of < 10) return null
  const top = topPercent(rank)
  // Top 51% -> Bottom 50%, Top 100% -> Bottom 1%.
  return top <= 50 ? `Top ${top}%` : `Bottom ${101 - top}%`
}

export function decadeOf(year: number | null): number | null {
  return year != null && Number.isFinite(year) ? Math.floor(year / 10) * 10 : null
}

function hasImdb(movie: RankedMovie): movie is RankedMovie & { imdbRating: number } {
  return typeof movie.imdbRating === "number" && movie.imdbRating > 0
}

/**
 * Where a movie stands overall, within each of its genres, within its decade,
 * and against IMDb. Returns null when the movie isn't in `movies` (too few
 * ratings to rank).
 */
export function movieStanding(
  movieId: string,
  movies: RankedMovie[],
): MovieStanding | null {
  const movie = movies.find((m) => m.movieId === movieId)
  if (!movie) return null

  const scores = (list: RankedMovie[]) => list.map((m) => m.score)

  const genres = movie.genres
    .filter((genre) => !IGNORED_GENRES.has(genre))
    .map((genre) => ({
      genre,
      rank: rankOf(movie.score, scores(movies.filter((m) => m.genres.includes(genre)))),
    }))
    // Most impressive first.
    .sort((a, b) => percentile(a.rank) - percentile(b.rank) || b.rank.of - a.rank.of)

  const decade = decadeOf(movie.year)
  const sameDecade =
    decade === null ? [] : movies.filter((m) => decadeOf(m.year) === decade)

  let imdb: MovieStanding["imdb"] = null
  if (hasImdb(movie)) {
    const withImdb = movies.filter(hasImdb)
    imdb = {
      here: rankOf(movie.score, scores(withImdb)),
      imdb: rankOf(movie.imdbRating, withImdb.map((m) => m.imdbRating)),
    }
  }

  return {
    overall: rankOf(movie.score, scores(movies)),
    genres,
    decade: decade === null ? null : { decade, rank: rankOf(movie.score, scores(sameDecade)) },
    imdb,
  }
}

// ---------------------------------------------------------------------------
// Explore lists
// ---------------------------------------------------------------------------

/** Ties: more ratings first, then title, so lists are stable between runs. */
function byCountThenTitle(a: RankedMovie, b: RankedMovie): number {
  return b.count - a.count || a.title.localeCompare(b.title)
}

/** Best weighted scores among movies few people have rated. */
export function hiddenGems(movies: RankedMovie[], limit: number): RankedMovie[] {
  return movies
    .filter((m) => m.count < GEM_MAX_RATINGS)
    .sort((a, b) => b.score - a.score || byCountThenTitle(a, b))
    .slice(0, limit)
}

/** Movies where the "loved it" and "disliked it" camps are both big. */
export function mostDivisive(movies: RankedMovie[], limit: number): RankedMovie[] {
  return movies
    .filter((m) => m.count >= POPULAR_MIN_RATINGS)
    .sort(
      (a, b) =>
        splitScore(b) - splitScore(a) ||
        (b.sd ?? 0) - (a.sd ?? 0) ||
        byCountThenTitle(a, b),
    )
    .slice(0, limit)
}

export type ImdbComparison = { movie: RankedMovie; here: Rank; imdb: Rank }

/**
 * Movies this community ranks much higher than IMDb voters do. Ranks (not raw
 * scores) are compared, because the two scales have different averages.
 */
export function higherThanImdb(
  movies: RankedMovie[],
  limit: number,
): ImdbComparison[] {
  const pool = movies.filter(
    (m): m is RankedMovie & { imdbRating: number } =>
      m.count >= POPULAR_MIN_RATINGS && hasImdb(m),
  )
  const scores = pool.map((m) => m.score)
  const imdbRatings = pool.map((m) => m.imdbRating)

  return pool
    .map((movie) => ({
      movie,
      here: rankOf(movie.score, scores),
      imdb: rankOf(movie.imdbRating, imdbRatings),
    }))
    .filter(({ here, imdb }) => percentile(imdb) - percentile(here) >= IMDB_GAP)
    .sort(
      (a, b) =>
        percentile(b.imdb) - percentile(b.here) -
          (percentile(a.imdb) - percentile(a.here)) ||
        byCountThenTitle(a.movie, b.movie),
    )
    .slice(0, limit)
}
