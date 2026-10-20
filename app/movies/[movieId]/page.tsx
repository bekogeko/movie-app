import type { Metadata } from "next"
import Link from "next/link"
import { notFound, unstable_rethrow } from "next/navigation"
import { Fragment, Suspense } from "react"

import ErrorBoundary from "@/components/error-boundary"
import { MoviePoster, MoviePosterSkeleton } from "@/components/movie-poster"
import {
  CommunityRating,
  FansAlsoLoved,
  HowItRanks,
  SectionSkeleton,
} from "@/components/movie-stats"
import { getMovie, type CreditName, type MovieDetails } from "@/lib/data/movies"
import { personHref, type PersonKind } from "@/lib/data/people"
import { displayTitle, formatDate } from "@/lib/format"

// Poster width: w-40 on phones, sm:w-48 from 640px up. Keep POSTER_SIZES in sync.
const POSTER_WIDTH = "w-40 shrink-0 sm:w-48"
const POSTER_SIZES = "(min-width: 640px) 192px, 160px"

export async function generateMetadata({
  params,
}: PageProps<"/movies/[movieId]">): Promise<Metadata> {
  const { movieId } = await params
  try {
    const movie = await getMovie(movieId)
    if (!movie) return { title: "Movie not found · Movie App" }
    const year = movie.year !== null ? ` (${movie.year})` : ""
    return {
      title: `${displayTitle(movie.title)}${year} · Movie App`,
      description: movie.plot ?? undefined,
    }
  } catch (error) {
    // A failed query here would replace the whole page with Next's error
    // screen. Fall back to the layout's title and let the page's
    // ErrorBoundary report the problem instead.
    unstable_rethrow(error)
    return {}
  }
}

export default function MoviePage({ params }: PageProps<"/movies/[movieId]">) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-16">
      <ErrorBoundary title="Couldn't load this movie">
        {/* params are only known at request time, so they're read inside Suspense. */}
        <Suspense fallback={<MovieSkeleton />}>
          {params.then(({ movieId }) => (
            <Movie movieId={movieId} />
          ))}
        </Suspense>
      </ErrorBoundary>
    </main>
  )
}

async function Movie({ movieId }: { movieId: string }) {
  const movie = await getMovie(movieId)
  if (!movie) notFound()
  const title = displayTitle(movie.title)
  const genres = movie.genres.filter((genre) => genre !== "(no genres listed)")

  return (
    <article className="flex flex-col gap-10">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
        <MoviePoster
          src={movie.poster}
          alt={`Poster for ${title}`}
          sizes={POSTER_SIZES}
          className={POSTER_WIDTH}
        />

        <div className="flex flex-col gap-6">
          <header className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <h1 className="text-3xl font-semibold tracking-tight">
                {title}
                {movie.year !== null && (
                  <span className="ml-3 font-mono text-xl font-normal tabular-nums text-zinc-500">
                    {movie.year}
                  </span>
                )}
              </h1>
              {genres.length > 0 && (
                <p className="text-sm text-zinc-500">{genres.join(" · ")}</p>
              )}
            </div>
            <Rating movie={movie} />
          </header>

          {movie.plot && (
            <p className="text-lg leading-relaxed text-zinc-700 dark:text-zinc-300">
              {movie.plot}
            </p>
          )}

          <People movie={movie} />
        </div>
      </div>

      <dl className="grid gap-4 sm:grid-cols-2">
        <Detail label="Released" value={formatDate(movie.released)} />
        <Detail
          label="Runtime"
          value={movie.runtime !== null ? `${movie.runtime} min` : null}
        />
        <Detail
          label={movie.countries.length > 1 ? "Countries" : "Country"}
          value={movie.countries.join(", ")}
        />
        <Detail
          label={movie.languages.length > 1 ? "Languages" : "Language"}
          value={movie.languages.join(", ")}
        />
      </dl>

      {/* Each section below loads and fails on its own, so one slow query doesn't hold up the rest. */}
      <ErrorBoundary title="Couldn't load the community rating">
        <Suspense fallback={<SectionSkeleton title="Community rating" height="h-72" />}>
          <CommunityRating movieId={movieId} />
        </Suspense>
      </ErrorBoundary>

      <ErrorBoundary title="Couldn't load the rankings">
        <Suspense fallback={<SectionSkeleton title="How it ranks" />}>
          <HowItRanks movieId={movieId} />
        </Suspense>
      </ErrorBoundary>

      <ErrorBoundary title="Couldn't load what fans also loved">
        <Suspense fallback={<SectionSkeleton title="Fans also loved" height="h-64" />}>
          <FansAlsoLoved movieId={movieId} title={movie.title} />
        </Suspense>
      </ErrorBoundary>
    </article>
  )
}

function People({ movie }: { movie: MovieDetails }) {
  if (movie.directors.length === 0 && movie.cast.length === 0) return null
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
      {movie.directors.length > 0 && (
        <>
          <dt className="text-zinc-500">Directed by</dt>
          <dd>
            <PersonLinks kind="director" people={movie.directors} />
          </dd>
        </>
      )}
      {movie.cast.length > 0 && (
        <>
          <dt className="text-zinc-500">Starring</dt>
          <dd>
            <PersonLinks kind="actor" people={movie.cast.slice(0, 6)} />
          </dd>
        </>
      )}
    </dl>
  )
}

/** Comma-separated names, each linking to that person's actor or director page. */
function PersonLinks({ kind, people }: { kind: PersonKind; people: CreditName[] }) {
  return people.map((person, i) => (
    <Fragment key={person.tmdbId ?? person.name}>
      {i > 0 && ", "}
      {person.tmdbId ? (
        <Link
          href={personHref(kind, person.tmdbId)}
          className="underline decoration-black/20 underline-offset-4 transition-colors hover:decoration-current dark:decoration-white/30"
        >
          {person.name}
        </Link>
      ) : (
        person.name
      )}
    </Fragment>
  ))
}

function Rating({ movie }: { movie: MovieDetails }) {
  if (movie.imdbRating === null) {
    return <p className="text-zinc-600 dark:text-zinc-400">No IMDb rating</p>
  }

  return (
    <p className="flex items-baseline gap-2">
      <span className="font-mono text-2xl font-semibold tabular-nums">
        ★ {movie.imdbRating.toFixed(1)}
      </span>
      <span className="text-zinc-600 dark:text-zinc-400">
        / 10 IMDb
        {movie.imdbVotes !== null &&
          ` · ${movie.imdbVotes.toLocaleString("en-US")} votes`}
      </span>
    </p>
  )
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-xl border border-black/[.08] p-5 dark:border-white/[.145]">
      <dt className="text-sm text-zinc-600 dark:text-zinc-400">{label}</dt>
      <dd className="mt-1 font-medium">{value || "—"}</dd>
    </div>
  )
}

function MovieSkeleton() {
  const bar = "animate-pulse rounded-md bg-black/[.06] dark:bg-white/[.08]"
  return (
    <div className="flex flex-col gap-10" aria-busy="true">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
        <MoviePosterSkeleton className={POSTER_WIDTH} />
        <div className="flex flex-1 flex-col gap-6">
          <div className="flex flex-col gap-3">
            <div className={`h-9 w-2/3 ${bar}`} />
            <div className={`h-7 w-48 ${bar}`} />
          </div>
          <div className="flex flex-col gap-2">
            <div className={`h-5 w-full ${bar}`} />
            <div className={`h-5 w-5/6 ${bar}`} />
          </div>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {["Released", "Runtime", "Country", "Language"].map((label) => (
          <div
            key={label}
            className="rounded-xl border border-black/[.08] p-5 dark:border-white/[.145]"
          >
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{label}</p>
            <div className={`mt-2 h-5 w-24 ${bar}`} />
          </div>
        ))}
      </div>
    </div>
  )
}
