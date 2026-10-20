import Link from "next/link"

import { MoviePoster, MoviePosterSkeleton } from "@/components/movie-poster"
import type { GenreMovie } from "@/lib/data/genres"
import { displayTitle, formatScore } from "@/lib/format"

/*
 * A poster card linking to the movie: the home page's genre rows and the
 * /genres/[genre] grid. Ranked movies get their rank on the poster and their
 * weighted score; unranked ones show their IMDb rating instead.
 *
 * Used from both Server and Client Components, so it stays free of server-only
 * imports (the GenreMovie import is type-only).
 */
export function MovieCard({ movie, sizes }: { movie: GenreMovie; sizes: string }) {
  const title = displayTitle(movie.title)
  const rating =
    movie.score !== null
      ? `★ ${formatScore(movie.score)}`
      : movie.imdbRating !== null && movie.imdbRating > 0
        ? `IMDb ${movie.imdbRating.toFixed(1)}`
        : null
  const details = [movie.year, rating].filter((value) => value !== null)

  return (
    <Link
      href={`/movies/${encodeURIComponent(movie.movieId)}`}
      className="group/movie flex flex-col gap-2 focus-visible:outline-none"
    >
      <div className="relative">
        <MoviePoster
          src={movie.poster}
          alt={`Poster for ${title}`}
          sizes={sizes}
          loading="lazy"
          className="transition-opacity group-hover/movie:opacity-80 group-focus-visible/movie:ring-2 group-focus-visible/movie:ring-current"
        />
        {movie.rank !== null && (
          <span className="absolute top-1.5 left-1.5 rounded-md bg-black/70 px-1.5 py-0.5 font-mono text-xs font-medium tabular-nums text-white">
            <span className="sr-only">Rank </span>#{movie.rank}
          </span>
        )}
      </div>
      <span className="flex flex-col">
        <span className="line-clamp-2 text-sm font-medium group-hover/movie:underline">
          {title}
        </span>
        <span className="text-xs tabular-nums text-zinc-500">{details.join(" · ") || "—"}</span>
      </span>
    </Link>
  )
}

/** Same shape as MovieCard, for loading states. */
export function MovieCardSkeleton() {
  const bar = "animate-pulse rounded-md bg-black/[.06] dark:bg-white/[.08]"
  return (
    <div className="flex flex-col gap-2" aria-hidden>
      <MoviePosterSkeleton />
      <div className={`h-4 w-3/4 ${bar}`} />
      <div className={`h-3 w-1/2 ${bar}`} />
    </div>
  )
}
