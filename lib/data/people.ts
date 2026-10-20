import { cache } from "react"

import { uniqueBy } from "@/lib/collections"
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
