"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { MovieCard, MovieCardSkeleton } from "@/components/movie-card"
import { loadGenreMovies } from "@/lib/actions/genres"
import { uniqueBy } from "@/lib/collections"
import type { GenreMovie, GenreMoviesPage } from "@/lib/data/genres"
import { formatCount, plural } from "@/lib/format"
import { MIN_RATINGS_TO_RANK } from "@/lib/rating-stats"

/*
 * Every movie in a genre, loaded a page at a time as the end of the list
 * scrolls near. The server renders the first page; later pages come from the
 * loadGenreMovies Server Action. Ranked movies come first (see
 * lib/data/genres.ts), so the list splits into two sections.
 */

// 3 columns on phones, 4 from 640px up, inside max-w-3xl (same as the person page).
const GRID = "grid grid-cols-3 gap-x-4 gap-y-6 sm:grid-cols-4"
const POSTER_SIZES = "(min-width: 640px) 168px, 30vw"
const muted = "text-zinc-600 dark:text-zinc-400"

/** Start loading the next page when the end of the list is this close to the viewport. */
const PRELOAD_MARGIN = "800px"

type Status = "idle" | "loading" | "error"

export function GenreMovieGrid({
  slug,
  genreName,
  movieCount,
  initial,
}: {
  slug: string
  genreName: string
  movieCount: number
  initial: GenreMoviesPage
}) {
  const [movies, setMovies] = useState(initial.movies)
  const [nextOffset, setNextOffset] = useState(initial.nextOffset)
  const [status, setStatus] = useState<Status>("idle")
  const end = useRef<HTMLDivElement>(null)
  const inFlight = useRef(false)

  const loadMore = useCallback(async () => {
    if (inFlight.current || nextOffset === null) return
    inFlight.current = true
    setStatus("loading")
    try {
      const page = await loadGenreMovies(slug, nextOffset)
      // The lists can shift between pages when the cached rankings refresh,
      // so drop any movie that's already shown.
      setMovies((current) => uniqueBy([...current, ...page.movies], (m) => m.movieId))
      setNextOffset(page.movies.length > 0 ? page.nextOffset : null)
      setStatus("idle")
    } catch {
      setStatus("error")
    } finally {
      inFlight.current = false
    }
  }, [slug, nextOffset])

  // A new observer starts after every page, and an observer reports its
  // target as soon as it starts, so if a page didn't fill the screen the next
  // one loads straight away.
  useEffect(() => {
    const target = end.current
    if (!target || nextOffset === null || status !== "idle") return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void loadMore()
      },
      { rootMargin: `0px 0px ${PRELOAD_MARGIN} 0px` },
    )
    observer.observe(target)
    return () => observer.disconnect()
  }, [loadMore, nextOffset, status])

  const ranked = movies.filter((movie) => movie.rank !== null)
  const unranked = movies.filter((movie) => movie.rank === null)

  return (
    <div className="flex flex-col gap-10">
      {ranked.length > 0 && (
        <MovieSection
          id="ranked"
          title="Ranked"
          count={initial.rankedCount}
          detail={`By weighted score, among ${genreName} movies with ${MIN_RATINGS_TO_RANK}+ ratings. The same ranking as “How it ranks” on each movie’s page.`}
          movies={ranked}
          ordered
        />
      )}

      {unranked.length > 0 && (
        <MovieSection
          id="unranked"
          title="Not ranked yet"
          count={Math.max(0, movieCount - initial.rankedCount)}
          detail={`Fewer than ${MIN_RATINGS_TO_RANK} ratings so far. Most-voted on IMDb first.`}
          movies={unranked}
        />
      )}

      <div ref={end} className="flex flex-col gap-4">
        <p aria-live="polite" className="sr-only">
          {status === "loading" ? "Loading more movies" : ""}
        </p>

        {status === "loading" && (
          <div className={GRID} aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={i === 3 ? "hidden sm:block" : undefined}>
                <MovieCardSkeleton />
              </div>
            ))}
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-5 text-sm dark:border-red-900/60 dark:bg-red-950/30">
            <p className="text-red-800 dark:text-red-300">Couldn&rsquo;t load more movies.</p>
            <button
              onClick={() => void loadMore()}
              className="rounded-md border border-red-300 px-3 py-1 text-red-800 transition-colors hover:bg-red-100 dark:border-red-800 dark:text-red-200 dark:hover:bg-red-900/40"
            >
              Try again
            </button>
          </div>
        )}

        {nextOffset === null && movies.length > 0 && (
          <p className={`text-center text-sm ${muted}`}>
            That&rsquo;s all {plural(movies.length, `${genreName} movie`)}.
          </p>
        )}
      </div>
    </div>
  )
}

function MovieSection({
  id,
  title,
  count,
  detail,
  movies,
  ordered = false,
}: {
  id: string
  title: string
  count: number
  detail: string
  movies: GenreMovie[]
  /** Ranked lists are ordered lists. */
  ordered?: boolean
}) {
  const List = ordered ? "ol" : "ul"
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id={id} className="text-lg font-semibold tracking-tight">
          {title} <span className="font-normal text-zinc-500">({formatCount(count)})</span>
        </h2>
        <p className={`text-sm ${muted}`}>{detail}</p>
      </div>
      <List className={GRID}>
        {movies.map((movie) => (
          <li key={movie.movieId}>
            <MovieCard movie={movie} sizes={POSTER_SIZES} />
          </li>
        ))}
      </List>
    </section>
  )
}

/** The grid's loading state, for the page's Suspense fallback. */
export function GenreMovieGridSkeleton() {
  return (
    <div className={GRID} aria-busy>
      {Array.from({ length: 8 }, (_, i) => (
        <MovieCardSkeleton key={i} />
      ))}
    </div>
  )
}
