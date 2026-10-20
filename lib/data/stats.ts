import { cacheLife, cacheTag, io } from "next/cache"
import neo4j from "neo4j-driver"

import { read } from "@/lib/neo4j"
import {
  agreement,
  DISLIKED_AT,
  hiddenGems,
  higherThanImdb,
  LOVED_AT,
  MIN_FANS,
  MIN_RATINGS_TO_RANK,
  MIN_SHARED_FAN_SHARE,
  MIN_SHARED_FANS,
  mostDivisive,
  movieStanding,
  summarize,
  toBuckets,
  weightedScore,
  type Agreement,
  type ImdbComparison,
  type MovieStanding,
  type RankedMovie,
  type RatingBucket,
  type RatingSummary,
} from "@/lib/rating-stats"

/*
 * Data layer for the rating stats. Every function here aggregates over RATED
 * relationships, so results are cached with "use cache" and tagged
 * RATINGS_CACHE_TAG. When saving ratings lands, call
 * `updateTag(RATINGS_CACHE_TAG)` in that Server Action so the stats include
 * the new rating on the next request.
 *
 * Each exported function awaits io() before entering its cache scope. Inside
 * "use cache", read()'s own io() is a no-op, so without this the cached query
 * would run during `next build` and the build would need Neo4j.
 */

export const RATINGS_CACHE_TAG = "ratings"

/** Who the "community" in community stats is. */
export type CommunityBaseline = {
  ratings: number
  users: number
  /** Average of every rating; the prior for weighted scores. */
  mean: number
}

export type ExploreStats = {
  baseline: CommunityBaseline
  /** How many movies have enough ratings to be ranked. */
  rankedCount: number
  hiddenGems: RankedMovie[]
  mostDivisive: RankedMovie[]
  higherThanImdb: ImdbComparison[]
}

export type MovieStats = {
  baseline: CommunityBaseline
  buckets: RatingBucket[]
  summary: RatingSummary
  /** Weighted score; null when nobody has rated the movie. */
  score: number | null
  agreement: Agreement
  /** Null when the movie has fewer than MIN_RATINGS_TO_RANK ratings. */
  standing: MovieStanding | null
}

export type FanPick = {
  movie: { movieId: string; title: string; year: number | null }
  /** Fans of this movie who also loved the pick. */
  sharedFans: number
  /** Everyone who loved the pick. */
  pickFans: number
  /** sharedFans / fanCount: the share of this movie's fans who loved the pick. */
  share: number
  /** How many times likelier a fan is to love the pick than an average user. */
  lift: number
}

export type FansAlsoLoved = { fanCount: number; picks: FanPick[] }

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

const YEAR = (m: string) =>
  `coalesce(${m}.year, toInteger(left(toString(${m}.released), 4)))`

const COMMUNITY_BASELINE = `
MATCH (u:User)-[r:RATED]->(:Movie)
RETURN count(r) AS ratings, count(DISTINCT u) AS users, avg(r.rating) AS mean
`

/*
 * One row per movie with enough ratings to rank: the leaderboard every
 * ranking and explore list is computed from. ~2,200 rows on the
 * recommendations dataset.
 */
const RANKABLE_MOVIES = `
MATCH (m:Movie)<-[r:RATED]-(:User)
WITH m,
  count(r) AS ratings,
  avg(r.rating) AS mean,
  stDev(r.rating) AS sd,
  count(CASE WHEN r.rating >= $lovedAt THEN 1 END) AS loved,
  count(CASE WHEN r.rating <= $dislikedAt THEN 1 END) AS disliked
WHERE ratings >= $minRatings
RETURN m {
  .movieId,
  .title,
  year: ${YEAR("m")},
  .imdbRating,
  genres: [(m)-[:IN_GENRE]->(g:Genre) | g.name]
} AS movie, ratings, mean, sd, loved, disliked
`

const RATING_DISTRIBUTION = `
MATCH (:Movie {movieId: $movieId})<-[r:RATED]-(:User)
RETURN r.rating AS rating, count(*) AS count
`

/*
 * "Fans also loved", ranked by lift rather than raw overlap. Raw overlap
 * always surfaces the same blockbusters, because everyone loves them. Lift
 * asks how much likelier this movie's fans are to love a pick than users in
 * general:
 *
 *   lift = (sharedFans / fanCount) / (pickFans / userCount)
 *
 * Small overlaps give noisy lifts, so a pick needs at least $minSharedFans
 * shared fans and at least $minSharedShare of all fans.
 */
const FANS_ALSO_LOVED = `
MATCH (m:Movie {movieId: $movieId})<-[r:RATED]-(fan:User)
WHERE r.rating >= $lovedAt
WITH m, collect(DISTINCT fan) AS fans
WITH m, fans, size(fans) AS fanCount
WHERE fanCount >= $minFans
UNWIND fans AS fan
MATCH (fan)-[liked:RATED]->(pick:Movie)
WHERE liked.rating >= $lovedAt AND pick <> m
WITH pick, fanCount, count(DISTINCT fan) AS sharedFans
WHERE sharedFans >= $minSharedFans AND sharedFans >= fanCount * $minSharedShare
WITH pick, fanCount, sharedFans,
  COUNT { (pick)<-[x:RATED]-(:User) WHERE x.rating >= $lovedAt } AS pickFans
RETURN pick {
  .movieId,
  .title,
  year: ${YEAR("pick")}
} AS movie,
  fanCount,
  sharedFans,
  pickFans,
  (toFloat(sharedFans) / fanCount) / (toFloat(pickFans) / $userCount) AS lift
ORDER BY lift DESC, sharedFans DESC, movie.title
LIMIT $limit
`

// ---------------------------------------------------------------------------
// Cached reads
// ---------------------------------------------------------------------------

async function cachedCommunityBaseline(): Promise<CommunityBaseline> {
  "use cache"
  cacheLife("hours")
  cacheTag(RATINGS_CACHE_TAG)

  const [row] = await read<{ ratings: number; users: number; mean: number | null }>(
    COMMUNITY_BASELINE,
  )
  return {
    ratings: row?.ratings ?? 0,
    users: row?.users ?? 0,
    mean: row?.mean ?? 0,
  }
}

async function cachedRankableMovies(): Promise<RankedMovie[]> {
  "use cache"
  cacheLife("hours")
  cacheTag(RATINGS_CACHE_TAG)

  const [baseline, rows] = await Promise.all([
    cachedCommunityBaseline(),
    read<{
      movie: Pick<RankedMovie, "movieId" | "title" | "year" | "imdbRating" | "genres">
      ratings: number
      mean: number
      sd: number | null
      loved: number
      disliked: number
    }>(RANKABLE_MOVIES, {
      lovedAt: LOVED_AT,
      dislikedAt: DISLIKED_AT,
      minRatings: MIN_RATINGS_TO_RANK,
    }),
  ])

  return rows.map(({ movie, ratings, mean, sd, loved, disliked }) => ({
    ...movie,
    genres: movie.genres ?? [],
    count: ratings,
    mean,
    sd,
    loved,
    disliked,
    score: weightedScore(mean, ratings, baseline.mean),
  }))
}

async function cachedExploreStats(limit: number): Promise<ExploreStats> {
  "use cache"
  cacheLife("hours")
  cacheTag(RATINGS_CACHE_TAG)

  const [baseline, movies] = await Promise.all([
    cachedCommunityBaseline(),
    cachedRankableMovies(),
  ])
  return {
    baseline,
    rankedCount: movies.length,
    hiddenGems: hiddenGems(movies, limit),
    mostDivisive: mostDivisive(movies, limit),
    higherThanImdb: higherThanImdb(movies, limit),
  }
}

async function cachedMovieStats(movieId: string): Promise<MovieStats> {
  "use cache"
  cacheLife("hours")
  cacheTag(RATINGS_CACHE_TAG)

  const [baseline, movies, rows] = await Promise.all([
    cachedCommunityBaseline(),
    cachedRankableMovies(),
    read<{ rating: number; count: number }>(RATING_DISTRIBUTION, { movieId }),
  ])

  const buckets = toBuckets(rows)
  const summary = summarize(buckets)
  return {
    baseline,
    buckets,
    summary,
    score:
      summary.count > 0
        ? weightedScore(summary.mean, summary.count, baseline.mean)
        : null,
    agreement: agreement(summary),
    standing: movieStanding(movieId, movies),
  }
}

async function cachedFansAlsoLoved(
  movieId: string,
  limit: number,
): Promise<FansAlsoLoved> {
  "use cache"
  cacheLife("hours")
  cacheTag(RATINGS_CACHE_TAG)

  const baseline = await cachedCommunityBaseline()
  const rows = await read<{
    movie: FanPick["movie"]
    fanCount: number
    sharedFans: number
    pickFans: number
    lift: number
  }>(FANS_ALSO_LOVED, {
    movieId,
    lovedAt: LOVED_AT,
    minFans: MIN_FANS,
    minSharedFans: MIN_SHARED_FANS,
    minSharedShare: MIN_SHARED_FAN_SHARE,
    userCount: Math.max(baseline.users, 1),
    limit: neo4j.int(limit),
  })

  return {
    fanCount: rows[0]?.fanCount ?? 0,
    picks: rows.map(({ movie, fanCount, sharedFans, pickFans, lift }) => ({
      movie,
      sharedFans,
      pickFans,
      share: sharedFans / fanCount,
      lift,
    })),
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Lists for the home page: hidden gems, most divisive, higher than on IMDb. */
export async function getExploreStats(limit = 5): Promise<ExploreStats> {
  await io()
  return cachedExploreStats(limit)
}

/** Distribution, weighted score, agreement and rankings for one movie. */
export async function getMovieStats(movieId: string): Promise<MovieStats> {
  await io()
  return cachedMovieStats(movieId)
}

/**
 * Movies this movie's fans loved unusually often. Only call it when the
 * movie has at least MIN_FANS fans (summary.loved); with fewer, the query
 * returns nothing.
 */
export async function getFansAlsoLoved(
  movieId: string,
  limit = 6,
): Promise<FansAlsoLoved> {
  await io()
  return cachedFansAlsoLoved(movieId, limit)
}

export async function getMovieNodeCount(): Promise<number> {
  const [row] = await read<{ count: number }>(
      "Match (n:Movie) return count(n) as count"
  )

  return row?.count ?? 0;
}