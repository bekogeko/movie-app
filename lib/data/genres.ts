import { cacheLife, cacheTag, io } from "next/cache"
import neo4j from "neo4j-driver"

import { uniqueBy } from "@/lib/collections"
import { MOVIES_CACHE_TAG, toPosterUrl } from "@/lib/data/movies"
import { getRankedMovies, RATINGS_CACHE_TAG } from "@/lib/data/stats"
import { read } from "@/lib/neo4j"
import {
  genreLeaderboard,
  IGNORED_GENRES,
  MIN_RATINGS_TO_RANK,
  type RankedMovie,
} from "@/lib/rating-stats"

/*
 * Genres: (:Movie)-[:IN_GENRE]->(:Genre {name}). Pages address a genre by a
 * slug of its name ("Sci-Fi" -> /genres/sci-fi).
 *
 * A genre's movies are listed in two parts:
 *   1. Ranked movies (MIN_RATINGS_TO_RANK+ ratings), best weighted score
 *      first. This is the leaderboard "How it ranks" counts in, so #3 in Drama
 *      here is #3 in Drama on the movie page.
 *   2. The rest, which have too few ratings to rank, most-voted on IMDb first
 *      so well-known films come before obscure ones.
 */

export type Genre = {
  name: string
  slug: string
  movieCount: number
}

export type GenreMovie = {
  movieId: string
  title: string
  year: number | null
  poster: string | null
  imdbRating: number | null
  /** Place in the genre by weighted score (ties share a rank); null when the movie has too few ratings to rank. */
  rank: number | null
  /** Weighted score, 0.5 to 5; null when unranked. */
  score: number | null
}

export type GenreTopList = {
  genre: Genre
  movies: GenreMovie[]
}

export type GenreMoviesPage = {
  movies: GenreMovie[]
  /** How many of the genre's movies are ranked (the first part of the list). */
  rankedCount: number
  /** Offset to load the next page from, or null after the last page. */
  nextOffset: number | null
}

/** Movies per page on /genres/[genre]: four rows of the 3- and 4-column grid. */
export const GENRE_PAGE_SIZE = 48

/** "Sci-Fi" -> "sci-fi", "Film-Noir" -> "film-noir" */
export function genreSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
}

export function genreHref(name: string): string {
  return `/genres/${encodeURIComponent(genreSlug(name))}`
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

// Largest genres first. DISTINCT so a duplicate IN_GENRE relationship can't
// count a movie twice.
const GENRES = `
MATCH (g:Genre)<-[:IN_GENRE]-(m:Movie)
WHERE NOT g.name IN $ignored
RETURN g.name AS name, count(DISTINCT m) AS movieCount
ORDER BY movieCount DESC, name
`

// The second part of a genre list: movies with too few ratings to rank.
const UNRANKED_GENRE_MOVIES = `
MATCH (:Genre {name: $genre})<-[:IN_GENRE]-(m:Movie)
WITH DISTINCT m
WITH m, COUNT { (m)<-[:RATED]-(:User) } AS ratings
WHERE ratings < $minRatings
RETURN m {
  .movieId,
  .title,
  .poster,
  .imdbRating,
  year: coalesce(m.year, toInteger(left(toString(m.released), 4)))
} AS movie
ORDER BY coalesce(m.imdbVotes, 0) DESC, m.title, m.movieId
SKIP $skip
LIMIT $limit
`

// ---------------------------------------------------------------------------
// Cached reads (see lib/data/stats.ts for why each public function awaits io())
// ---------------------------------------------------------------------------

async function cachedGenres(): Promise<Genre[]> {
  "use cache"
  cacheLife("days")
  cacheTag(MOVIES_CACHE_TAG)

  const rows = await read<{ name: string; movieCount: number }>(GENRES, {
    ignored: [...IGNORED_GENRES],
  })
  return uniqueBy(
    rows.map(({ name, movieCount }) => ({ name, slug: genreSlug(name), movieCount })),
    (genre) => genre.slug,
  )
}

function toGenreMovie(movie: RankedMovie & { rank: number }): GenreMovie {
  return {
    movieId: movie.movieId,
    title: movie.title,
    year: movie.year,
    poster: movie.poster,
    imdbRating: movie.imdbRating,
    rank: movie.rank,
    score: movie.score,
  }
}

async function cachedTopByGenre(limit: number): Promise<GenreTopList[]> {
  "use cache"
  cacheLife("hours")
  cacheTag(RATINGS_CACHE_TAG, MOVIES_CACHE_TAG)

  const [genres, movies] = await Promise.all([cachedGenres(), getRankedMovies()])
  return genres
    .map((genre) => ({
      genre,
      movies: genreLeaderboard(movies, genre.name).slice(0, limit).map(toGenreMovie),
    }))
    .filter((list) => list.movies.length > 0)
}

async function cachedGenreLeaderboard(genre: string): Promise<GenreMovie[]> {
  "use cache"
  cacheLife("hours")
  cacheTag(RATINGS_CACHE_TAG)

  return genreLeaderboard(await getRankedMovies(), genre).map(toGenreMovie)
}

async function cachedUnrankedGenreMovies(
  genre: string,
  skip: number,
  limit: number,
): Promise<GenreMovie[]> {
  "use cache"
  cacheLife("hours")
  cacheTag(RATINGS_CACHE_TAG, MOVIES_CACHE_TAG)

  const rows = await read<{ movie: Omit<GenreMovie, "rank" | "score"> }>(
    UNRANKED_GENRE_MOVIES,
    {
      genre,
      minRatings: MIN_RATINGS_TO_RANK,
      skip: neo4j.int(skip),
      limit: neo4j.int(limit),
    },
  )
  return rows.map(({ movie }) => ({
    ...movie,
    poster: toPosterUrl(movie.poster),
    rank: null,
    score: null,
  }))
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Every genre with at least one movie, largest first. */
export async function getGenres(): Promise<Genre[]> {
  await io()
  return cachedGenres()
}

/** The genre a URL slug points at, or null if there is none. */
export async function getGenre(slug: string): Promise<Genre | null> {
  const genres = await getGenres()
  const wanted = slug.toLowerCase()
  return genres.find((genre) => genre.slug === wanted) ?? null
}

/** The `limit` best-ranked movies in each genre, for the home page. Genres with no ranked movies are left out. */
export async function getTopMoviesByGenre(limit = 10): Promise<GenreTopList[]> {
  await io()
  return cachedTopByGenre(limit)
}

/**
 * One page of a genre's movies: ranked movies first, then the rest (see the
 * top of this file). `offset` counts across both parts, so pages are simply
 * 0, GENRE_PAGE_SIZE, 2 * GENRE_PAGE_SIZE, ...
 */
export async function getGenreMovies(genre: Genre, offset = 0): Promise<GenreMoviesPage> {
  await io()
  const ranked = await cachedGenreLeaderboard(genre.name)
  const movies = ranked.slice(offset, offset + GENRE_PAGE_SIZE)

  const missing = GENRE_PAGE_SIZE - movies.length
  if (missing > 0 && offset + movies.length < genre.movieCount) {
    const skip = Math.max(0, offset - ranked.length)
    movies.push(...(await cachedUnrankedGenreMovies(genre.name, skip, missing)))
  }

  // movieCount is cached separately and can briefly disagree with the lists;
  // an empty page always ends the list, so a stale count can't loop forever.
  const end = offset + movies.length
  return {
    movies,
    rankedCount: ranked.length,
    nextOffset: movies.length > 0 && end < genre.movieCount ? end : null,
  }
}
