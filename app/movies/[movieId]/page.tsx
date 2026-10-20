import type { Metadata } from "next"
import { notFound, unstable_rethrow } from "next/navigation"
import { Suspense } from "react"

import ErrorBoundary from "@/components/error-boundary"
import {
  CommunityRating,
  FansAlsoLoved,
  HowItRanks,
  SectionSkeleton,
} from "@/components/movie-stats"
import { getMovie, type MovieDetails } from "@/lib/data/movies"
import { displayTitle, formatCount } from "@/lib/format"

export async function generateMetadata({
  params,
}: PageProps<"/movies/[movieId]">): Promise<Metadata> {
  const { movieId } = await params
  try {
    const movie = await getMovie(movieId)
    if (!movie) return { title: "Movie not found · Movie App" }
    const year = movie.year != null ? ` (${movie.year})` : ""
    return {
      title: `${displayTitle(movie.title)}${year} · Movie App`,
      description: movie.plot ?? undefined,
    }
  } catch (error) {
    // Let Next.js's own control-flow errors through; for a database error,
    // the page renders its own error state, so fall back to a plain title.
    unstable_rethrow(error)
    return { title: "Movie App" }
  }
}

export default function MoviePage({ params }: PageProps<"/movies/[movieId]">) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-12 px-6 py-16">
      <ErrorBoundary title="Couldn't load this movie">
        <Suspense fallback={<MoviePageSkeleton />}>
          {params.then(({ movieId }) => (
            <MovieContent movieId={movieId} />
          ))}
        </Suspense>
      </ErrorBoundary>
    </main>
  )
}

async function MovieContent({ movieId }: { movieId: string }) {
  const movie = await getMovie(movieId)
  if (!movie) notFound()

  return (
    <>
      <MovieHeader movie={movie} />

      {/* Each section loads and fails on its own, so one slow query doesn't hold up the rest. */}
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
    </>
  )
}

function MovieHeader({ movie }: { movie: MovieDetails }) {
  const facts = [
    ...movie.genres.filter((genre) => genre !== "(no genres listed)"),
    movie.runtime ? `${movie.runtime} min` : null,
    movie.imdbRating != null
      ? `IMDb ${movie.imdbRating.toFixed(1)}${movie.imdbVotes ? ` (${formatCount(movie.imdbVotes)} votes)` : ""}`
      : null,
  ].filter(Boolean)

  return (
    <header className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-4">
          <h1 className="text-3xl font-semibold tracking-tight">{displayTitle(movie.title)}</h1>
          {movie.year != null && (
            <span className="shrink-0 font-mono tabular-nums text-zinc-500">{movie.year}</span>
          )}
        </div>
        {facts.length > 0 && <p className="text-sm text-zinc-500">{facts.join(" · ")}</p>}
      </div>

      {movie.plot && <p className="text-zinc-700 dark:text-zinc-300">{movie.plot}</p>}

      {(movie.directors.length > 0 || movie.cast.length > 0) && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          {movie.directors.length > 0 && (
            <>
              <dt className="text-zinc-500">Directed by</dt>
              <dd>{movie.directors.join(", ")}</dd>
            </>
          )}
          {movie.cast.length > 0 && (
            <>
              <dt className="text-zinc-500">Starring</dt>
              <dd>{movie.cast.slice(0, 6).join(", ")}</dd>
            </>
          )}
        </dl>
      )}
    </header>
  )
}

function MoviePageSkeleton() {
  return (
    <div className="flex flex-col gap-12" aria-busy>
      <div className="flex flex-col gap-3">
        <div className="h-9 w-2/3 animate-pulse rounded-md bg-black/[.06] dark:bg-white/[.08]" />
        <div className="h-4 w-1/2 animate-pulse rounded-md bg-black/[.06] dark:bg-white/[.08]" />
        <div className="h-16 w-full animate-pulse rounded-md bg-black/[.04] dark:bg-white/[.06]" />
      </div>
      <SectionSkeleton title="Community rating" height="h-72" />
    </div>
  )
}
