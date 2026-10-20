import Link from "next/link"

import { MovieCard, MovieCardSkeleton } from "@/components/movie-card"
import { genreHref, getTopMoviesByGenre, type GenreTopList } from "@/lib/data/genres"
import { formatCount } from "@/lib/format"
import { MIN_RATINGS_TO_RANK } from "@/lib/rating-stats"

/*
 * Home page: the best-ranked movies in every genre, one row of posters per
 * genre, each with a link to the full list on /genres/[genre].
 */

const TOP_N = 10
const muted = "text-zinc-600 dark:text-zinc-400"

// Rows scroll sideways and bleed to the edge of the page's px-6 padding, so a
// cut-off poster at the edge shows there's more. Card: w-28 on phones, sm:w-32
// from 640px up; keep CARD_SIZES in sync.
const ROW = "-mx-6 flex gap-4 px-6 pb-2"
const SCROLL = "snap-x snap-mandatory scroll-px-6 overflow-x-auto overscroll-x-contain"
const CARD_WIDTH = "w-28 shrink-0 snap-start sm:w-32"
const CARD_SIZES = "(min-width: 640px) 128px, 112px"

export async function GenreRows() {
  const lists = await getTopMoviesByGenre(TOP_N)

  return (
    <section aria-labelledby="top-by-genre" className="flex flex-col gap-8">
      <Heading />
      {lists.length === 0 ? (
        <p className={`text-sm ${muted}`}>
          No movie has {MIN_RATINGS_TO_RANK} ratings yet, so there&rsquo;s nothing to rank.
        </p>
      ) : (
        lists.map((list) => <GenreRow key={list.genre.slug} list={list} />)
      )}
    </section>
  )
}

function Heading() {
  return (
    <div className="flex flex-col gap-1">
      <h2 id="top-by-genre" className="text-lg font-semibold tracking-tight">
        Top {TOP_N} by genre
      </h2>
      <p className={`text-sm ${muted}`}>
        Best weighted scores among movies with {MIN_RATINGS_TO_RANK}+ ratings.
      </p>
    </div>
  )
}

function GenreRow({ list: { genre, movies } }: { list: GenreTopList }) {
  const headingId = `genre-${genre.slug}`
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <h3 id={headingId} className="font-semibold tracking-tight">
          {genre.name}
        </h3>
        <Link
          href={genreHref(genre.name)}
          className="shrink-0 rounded-full border border-black/[.08] px-3 py-1 text-sm transition-colors hover:bg-black/[.03] focus-visible:bg-black/[.03] focus-visible:outline-none dark:border-white/[.145] dark:hover:bg-white/[.05] dark:focus-visible:bg-white/[.05]"
        >
          See all {formatCount(genre.movieCount)}
          <span className="sr-only"> {genre.name} movies</span>
          <span aria-hidden> →</span>
        </Link>
      </div>
      <ol className={`${ROW} ${SCROLL}`} aria-label={`Top ${movies.length} in ${genre.name}`}>
        {movies.map((movie) => (
          <li key={movie.movieId} className={CARD_WIDTH}>
            <MovieCard movie={movie} sizes={CARD_SIZES} />
          </li>
        ))}
      </ol>
    </section>
  )
}

export function GenreRowsSkeleton() {
  const bar = "animate-pulse rounded-md bg-black/[.06] dark:bg-white/[.08]"
  return (
    <section aria-busy className="flex flex-col gap-8">
      <Heading />
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4">
            <div className={`h-5 w-24 ${bar}`} />
            <div className={`h-7 w-24 rounded-full ${bar}`} />
          </div>
          <div className={`${ROW} overflow-hidden`}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className={CARD_WIDTH}>
                <MovieCardSkeleton />
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  )
}
