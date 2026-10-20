import { cache } from "react"

import { toPosterUrl } from "@/lib/data/movies"
import { read } from "@/lib/neo4j"

/*
 * Actors and directors. In the recommendations dataset people are
 * (:Person:Actor)-[:ACTED_IN {role}]->(:Movie) and
 * (:Person:Director)-[:DIRECTED]->(:Movie), keyed by `tmdbId`. Someone who both
 * acts and directs carries both labels.
 */

export type PersonKind = "actor" | "director"

export function personHref(kind: PersonKind, tmdbId: string): string {
  return `/${kind === "actor" ? "actors" : "directors"}/${encodeURIComponent(tmdbId)}`
}

// ---------------------------------------------------------------------------
// Movie page: who directed it and who is in it
// ---------------------------------------------------------------------------

export type CreditedPerson = {
  tmdbId: string
  name: string
  /** Photo URL on image.tmdb.org, or null. */
  photo: string | null
  /** Character played (cast only). */
  role: string | null
}

export type MovieCredits = {
  directors: CreditedPerson[]
  cast: CreditedPerson[]
}

const MOVIE_CREDITS = `
MATCH (m:Movie {movieId: $movieId})
RETURN
  [(p:Director)-[:DIRECTED]->(m) WHERE p.tmdbId IS NOT NULL |
    p { .tmdbId, .name, photo: p.poster, role: null }] AS directors,
  [(p:Actor)-[r:ACTED_IN]->(m) WHERE p.tmdbId IS NOT NULL |
    p { .tmdbId, .name, photo: p.poster, role: r.role }] AS actors
`

/** Directors and cast of one movie. Empty lists if the movie doesn't exist. */
export const getMovieCredits = cache(
  async (movieId: string): Promise<MovieCredits> => {
    const [row] = await read<{ directors: CreditedPerson[]; actors: CreditedPerson[] }>(
      MOVIE_CREDITS,
      { movieId },
    )
    if (!row) return { directors: [], cast: [] }

    const clean = (people: CreditedPerson[]) =>
      uniqueBy(people, (p) => p.tmdbId).map((p) => ({ ...p, photo: toPosterUrl(p.photo) }))

    return { directors: clean(row.directors), cast: clean(row.actors) }
  },
)

// ---------------------------------------------------------------------------
// Person pages: one person and the movies they acted in or directed
// ---------------------------------------------------------------------------

export type Person = {
  tmdbId: string
  name: string
  photo: string | null
  bio: string | null
  /** "YYYY-MM-DD" */
  born: string | null
  /** "YYYY-MM-DD" */
  died: string | null
  bornIn: string | null
  isActor: boolean
  isDirector: boolean
}

export type PersonMovie = {
  movieId: string
  title: string
  year: number | null
  poster: string | null
  /** Character played (acting credits only). */
  role: string | null
}

export type PersonWithMovies = {
  person: Person
  /** Newest first; movies without a year last. */
  movies: PersonMovie[]
}

// Label and relationship type can't be query parameters, so they come from
// this fixed map and never from the URL.
const KINDS = {
  actor: { label: "Actor", rel: "ACTED_IN" },
  director: { label: "Director", rel: "DIRECTED" },
} as const

function personQuery(kind: PersonKind): string {
  const { label, rel } = KINDS[kind]
  return `
  MATCH (p:${label} {tmdbId: $tmdbId})
  RETURN
    p {
      .tmdbId, .name, .bio, .born, .died, .bornIn,
      photo: p.poster,
      isActor: p:Actor,
      isDirector: p:Director
    } AS person,
    [(p)-[r:${rel}]->(m:Movie) |
      m {
        .movieId, .title, .poster,
        year: coalesce(m.year, toInteger(left(toString(m.released), 4))),
        role: ${kind === "actor" ? "r.role" : "null"}
      }] AS movies
  `
}

/**
 * A person by `tmdbId` and their acting or directing credits, or null when
 * nobody with that id has that kind of credit.
 *
 * Wrapped in React `cache` so the page and its generateMetadata share one
 * query per request.
 */
export const getPerson = cache(
  async (kind: PersonKind, tmdbId: string): Promise<PersonWithMovies | null> => {
    const [row] = await read<PersonWithMovies>(personQuery(kind), { tmdbId })
    if (!row) return null

    const movies = uniqueBy(row.movies, (m) => m.movieId)
      .map((m) => ({ ...m, poster: toPosterUrl(m.poster) }))
      .sort(
        (a, b) =>
          (b.year ?? -Infinity) - (a.year ?? -Infinity) || a.title.localeCompare(b.title),
      )

    return {
      person: { ...row.person, photo: toPosterUrl(row.person.photo) },
      movies,
    }
  },
)

// ---------------------------------------------------------------------------

/** Keep the first item for each key, so a duplicate relationship can't repeat a row (or a React key). */
function uniqueBy<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    const k = key(item)
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}
