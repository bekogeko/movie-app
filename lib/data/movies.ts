import neo4j from "neo4j-driver"
import { cache } from "react"

import { read } from "@/lib/neo4j"

/** "Matrix, The" -> "The Matrix" (MovieLens-style titles move the article to the end). */
export function displayTitle(title: string): string {
  const match = title.match(/^(.+), (The|A|An|La|Le|Les|Il|El|Die|Der|Das)$/)
  return match ? `${match[2]} ${match[1]}` : title
}

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
  plot: string | null
  /** "YYYY-MM-DD" */
  released: string | null
  /** Minutes */
  runtime: number | null
  imdbRating: number | null
  imdbVotes: number | null
  countries: string[]
  languages: string[]
}

/**
 * One movie by its `movieId`, or null if there is no such movie.
 *
 * Wrapped in React `cache` so the page and its generateMetadata share one
 * query per request.
 */
export const getMovie = cache(
  async (movieId: string): Promise<MovieDetails | null> => {
    // Map projection keeps the large plotEmbedding property out of the result.
    const [row] = await read<{ movie: MovieDetails }>(
      `
      MATCH (m:Movie {movieId: $movieId})
      RETURN m {
        .movieId, .title, .plot, .released, .runtime, .imdbRating, .imdbVotes,
        countries: coalesce(m.countries, []),
        languages: coalesce(m.languages, [])
      } AS movie
      `,
      { movieId },
    )
    return row?.movie ?? null
  },
)
