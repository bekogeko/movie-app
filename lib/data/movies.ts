import { cacheLife, cacheTag, io } from "next/cache"
import neo4j from "neo4j-driver"

import { read } from "@/lib/neo4j"

export type MovieSearchResult = {
  movieId: string
  title: string
  year: number | null
  summary: string | null
  genres: string[]
  imdbRating: number | null
}

const MAX_QUERY_LENGTH = 100

/** Turn the raw `?q=` value into the string we search for ("" means no search). */
export function normalizeSearchQuery(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw
  if (!value) return ""
  return value.trim().replace(/\s+/g, " ").slice(0, MAX_QUERY_LENGTH)
}

/*
 * Case-insensitive title search. A movie matches when its title contains the
 * whole query, or contains every word of it in any order. The second rule lets
 * "the matrix" find "Matrix, The", the title style the recommendations dataset
 * uses.
 *
 * Ranking: exact title, then titles starting with the query, then titles
 * containing it, then word matches. Ties go to the more-voted movie on IMDb so
 * the well-known film comes first.
 */
const SEARCH_MOVIES = `
MATCH (m:Movie)
WITH m, toLower(m.title) AS title
WHERE title CONTAINS $q OR all(word IN $words WHERE title CONTAINS word)
WITH m, title, coalesce(m.imdbVotes, 0) AS votes,
  CASE
    WHEN title = $q THEN 0
    WHEN title STARTS WITH $q THEN 1
    WHEN title CONTAINS $q THEN 2
    ELSE 3
  END AS rank
ORDER BY rank, votes DESC, title
LIMIT $limit
RETURN m {
  .movieId,
  .title,
  year: coalesce(m.year, toInteger(left(toString(m.released), 4))),
  summary: coalesce(m.plot, m.tagline),
  genres: [(m)-[:IN_GENRE]->(g:Genre) | g.name][..3],
  imdbRating: m.imdbRating
} AS movie
// Cypher only guarantees the order on the clause ORDER BY is attached to,
// so sort the (at most $limit) rows again here.
ORDER BY rank, votes DESC, title
`

export async function searchMovies(
  query: string,
  limit = 20,
): Promise<MovieSearchResult[]> {
  const q = query.toLowerCase()
  const words = q.split(/[^\p{L}\p{N}]+/u).filter(Boolean)
  if (words.length === 0) return []

  const rows = await read<{ movie: MovieSearchResult }>(SEARCH_MOVIES, {
    q,
    words,
    limit: neo4j.int(limit),
  })
  return rows.map((row) => row.movie)
}

export type MovieDetails = {
  movieId: string
  title: string
  year: number | null
  plot: string | null
  /** "YYYY-MM-DD" */
  released: string | null
  /** Minutes */
  runtime: number | null
  imdbRating: number | null
  imdbVotes: number | null
  genres: string[]
  directors: string[]
  cast: string[]
  countries: string[]
  languages: string[]
  /** Poster image URL on image.tmdb.org, or null when there isn't a usable one. */
  poster: string | null
}

export const MOVIES_CACHE_TAG = "movies"

const POSTER_HOST = "image.tmdb.org"
const POSTER_BASE = `https://${POSTER_HOST}/t/p/w500`

/*
 * The dataset stores posters as TMDB image URLs. Only URLs on the host allowed
 * by `images.remotePatterns` in next.config.ts are returned: next/image throws
 * on any other host, which would take the whole page down. A bare TMDB path
 * ("/abc.jpg") is expanded to a full URL.
 */
function toPosterUrl(value: string | null): string | null {
  if (!value) return null
  try {
    const url = new URL(value.startsWith("/") ? `${POSTER_BASE}${value}` : value)
    url.protocol = "https:"
    const allowed = url.hostname === POSTER_HOST && url.pathname.startsWith("/t/p/")
    return allowed && !url.search ? url.toString() : null
  } catch {
    return null
  }
}

// Map projection keeps the large plotEmbedding property out of the result.
const GET_MOVIE = `
MATCH (m:Movie {movieId: $movieId})
RETURN m {
  .movieId, .title, .released, .runtime, .imdbRating, .imdbVotes, .poster,
  year: coalesce(m.year, toInteger(left(toString(m.released), 4))),
  plot: coalesce(m.plot, m.tagline),
  genres: [(m)-[:IN_GENRE]->(g:Genre) | g.name],
  directors: [(m)<-[:DIRECTED]-(d) | d.name],
  cast: [(m)<-[:ACTED_IN]-(a) | a.name],
  countries: coalesce(m.countries, []),
  languages: coalesce(m.languages, [])
} AS movie
LIMIT 1
`

async function cachedMovie(movieId: string): Promise<MovieDetails | null> {
  "use cache"
  cacheLife("days")
  cacheTag(MOVIES_CACHE_TAG)

  const [row] = await read<{ movie: MovieDetails }>(GET_MOVIE, { movieId })
  if (!row) return null
  const { movie } = row
  return {
    ...movie,
    genres: movie.genres ?? [],
    directors: movie.directors ?? [],
    cast: movie.cast ?? [],
    poster: toPosterUrl(movie.poster),
  }
}

/**
 * One movie by its `movieId`, or null if there is no such movie. Cached across
 * requests (movie details rarely change), so the page and generateMetadata
 * share one query.
 */
export async function getMovie(movieId: string): Promise<MovieDetails | null> {
  // Keep the cached query out of `next build` (see lib/data/stats.ts).
  await io()
  return cachedMovie(movieId)
}
