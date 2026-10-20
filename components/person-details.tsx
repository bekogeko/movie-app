import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { MoviePoster, MoviePosterSkeleton } from "@/components/movie-poster"
import { PersonPhoto, PersonPhotoSkeleton } from "@/components/person-photo"
import { getPerson, personHref, type Person, type PersonKind } from "@/lib/data/people"
import { displayTitle, formatDate } from "@/lib/format"

/*
 * Shared by /actors/[actorId] and /directors/[directorId]: the person, then
 * the movies they acted in or directed.
 */

const muted = "text-zinc-600 dark:text-zinc-400"

const LABELS = {
  actor: { role: "Actor", credits: "Acted in", other: "director" },
  director: { role: "Director", credits: "Directed", other: "actor" },
} as const

// Photo: w-32 on phones, sm:w-40 from 640px up. Keep PHOTO_SIZES in sync.
const PHOTO_WIDTH = "w-32 shrink-0 sm:w-40"
const PHOTO_SIZES = "(min-width: 640px) 160px, 128px"

// Filmography: 3 columns on phones, 4 from 640px up, inside max-w-3xl.
const GRID = "grid grid-cols-3 gap-x-4 gap-y-6 sm:grid-cols-4"
const POSTER_SIZES = "(min-width: 640px) 168px, 30vw"

export async function personMetadata(kind: PersonKind, tmdbId: string): Promise<Metadata> {
  try {
    const data = await getPerson(kind, tmdbId)
    return { title: data ? data.person.name : `${LABELS[kind].role} not found` }
  } catch {
    // Same as the movie page: let the page's ErrorBoundary report a failed query.
    return {}
  }
}

export async function PersonDetails({ kind, tmdbId }: { kind: PersonKind; tmdbId: string }) {
  const data = await getPerson(kind, tmdbId)
  if (!data) notFound()
  const { person, movies } = data

  return (
    <article className="flex flex-col gap-10">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
        <PersonPhoto
          src={person.photo}
          name={person.name}
          shape="portrait"
          sizes={PHOTO_SIZES}
          loading="eager"
          className={PHOTO_WIDTH}
        />

        <div className="flex min-w-0 flex-col gap-4">
          <header className="flex flex-col gap-2">
            <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
              {LABELS[kind].role}
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">{person.name}</h1>
            <LifeDates person={person} />
          </header>

          {person.bio && (
            <p className="whitespace-pre-line leading-relaxed text-zinc-700 dark:text-zinc-300">
              {person.bio}
            </p>
          )}

          <OtherRole kind={kind} person={person} />
        </div>
      </div>

      <section aria-labelledby="filmography" className="flex flex-col gap-4">
        <h2 id="filmography" className="text-lg font-semibold tracking-tight">
          {LABELS[kind].credits}{" "}
          <span className="font-normal text-zinc-500">({movies.length})</span>
        </h2>

        {movies.length === 0 ? (
          <p className={`text-sm ${muted}`}>No movies found.</p>
        ) : (
          <ul className={GRID}>
            {movies.map((movie) => {
              const title = displayTitle(movie.title)
              return (
                <li key={movie.movieId}>
                  <Link
                    href={`/movies/${encodeURIComponent(movie.movieId)}`}
                    className="group/movie flex flex-col gap-2 focus-visible:outline-none"
                  >
                    <MoviePoster
                      src={movie.poster}
                      alt={`Poster for ${title}`}
                      sizes={POSTER_SIZES}
                      loading="lazy"
                      className="transition-opacity group-hover/movie:opacity-80 group-focus-visible/movie:ring-2 group-focus-visible/movie:ring-current"
                    />
                    <span className="flex flex-col">
                      <span className="line-clamp-2 text-sm font-medium group-hover/movie:underline">
                        {title}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {[movie.year, movie.role].filter((v) => v != null && v !== "").join(" · ") ||
                          "—"}
                      </span>
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </article>
  )
}

function LifeDates({ person }: { person: Person }) {
  const born = formatDate(person.born)
  const died = formatDate(person.died)
  if (!born && !person.bornIn && !died) return null

  return (
    <p className={muted}>
      {(born || person.bornIn) && (
        <>
          Born{born && ` ${born}`}
          {person.bornIn && ` in ${person.bornIn}`}
        </>
      )}
      {(born || person.bornIn) && died && " · "}
      {died && `Died ${died}`}
    </p>
  )
}

/** Link between the actor and director pages of someone who does both. */
function OtherRole({ kind, person }: { kind: PersonKind; person: Person }) {
  const other: PersonKind = kind === "actor" ? "director" : "actor"
  const hasOther = other === "actor" ? person.isActor : person.isDirector
  if (!hasOther) return null

  return (
    <Link
      href={personHref(other, person.tmdbId)}
      className="w-fit text-sm underline underline-offset-4"
    >
      Also {other === "director" ? "directed" : "acted in"} movies →
    </Link>
  )
}

export function PersonSkeleton({ kind }: { kind: PersonKind }) {
  const bar = "animate-pulse rounded-md bg-black/[.06] dark:bg-white/[.08]"
  return (
    <div className="flex flex-col gap-10" aria-busy="true">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
        <PersonPhotoSkeleton shape="portrait" className={PHOTO_WIDTH} />
        <div className="flex flex-1 flex-col gap-4">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
              {LABELS[kind].role}
            </p>
            <div className={`h-9 w-2/3 ${bar}`} />
            <div className={`h-5 w-48 ${bar}`} />
          </div>
          <div className="flex flex-col gap-2">
            <div className={`h-5 w-full ${bar}`} />
            <div className={`h-5 w-5/6 ${bar}`} />
          </div>
        </div>
      </div>
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold tracking-tight">{LABELS[kind].credits}</h2>
        <div className={GRID}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col gap-2">
              <MoviePosterSkeleton />
              <div className={`h-4 w-3/4 ${bar}`} />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

export function PersonNotFound({ kind }: { kind: PersonKind }) {
  const role = LABELS[kind].role
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-3 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">{role} not found</h1>
      <p className={muted}>No {role.toLowerCase()} with that ID exists in the graph.</p>
      <Link href="/" className="mt-2 w-fit underline underline-offset-4">
        Back to home
      </Link>
    </main>
  )
}
