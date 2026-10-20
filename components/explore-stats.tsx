import Link from "next/link"
import type { ReactNode } from "react"

import { RatingSplit } from "@/components/rating-split"
import { getExploreStats } from "@/lib/data/stats"
import { displayTitle, formatCount, formatScore, plural } from "@/lib/format"
import {
  DISLIKED_AT,
  GEM_MAX_RATINGS,
  LOVED_AT,
  MIN_RATINGS_TO_RANK,
  POPULAR_MIN_RATINGS,
  standingLabel,
  type RankedMovie,
} from "@/lib/rating-stats"

const muted = "text-zinc-600 dark:text-zinc-400"

/*
 * The /stats page: lists built from the community's ratings. Each one
 * answers a question a raw "most rated" list can't: what's great but
 * overlooked, what splits people, and where this crowd disagrees with IMDb.
 */
export async function ExploreStats({ limit = 8 }: { limit?: number }) {
  const stats = await getExploreStats(limit)
  const { baseline } = stats

  return (
    <div className="flex flex-col gap-10">
      <p className={`text-sm ${muted}`}>
        {baseline.ratings > 0
          ? `From ${plural(baseline.ratings, "rating")} by ${plural(baseline.users, "user")}. Only movies with ${MIN_RATINGS_TO_RANK}+ ratings (${formatCount(stats.rankedCount)} of them) are ranked.`
          : "Nobody has rated anything yet."}
      </p>

      {stats.hiddenGems.length > 0 && (
        <ExploreList
          title="Hidden gems"
          detail={`Best weighted scores among movies with fewer than ${GEM_MAX_RATINGS} ratings.`}
        >
          {stats.hiddenGems.map((movie) => (
            <ExploreRow key={movie.movieId} movie={movie}>
              <span>{formatScore(movie.score)}</span>
              <span className="text-xs text-zinc-500">{plural(movie.count, "rating")}</span>
            </ExploreRow>
          ))}
        </ExploreList>
      )}

      {stats.mostDivisive.length > 0 && (
        <ExploreList
          title="Most divisive"
          detail={`Biggest split between people who loved it (${LOVED_AT}★+) and people who disliked it (${DISLIKED_AT}★ or less). Movies with ${POPULAR_MIN_RATINGS}+ ratings.`}
        >
          {stats.mostDivisive.map((movie) => (
            <ExploreRow key={movie.movieId} movie={movie} wide>
              <RatingSplit
                loved={movie.loved}
                disliked={movie.disliked}
                total={movie.count}
                compact
              />
            </ExploreRow>
          ))}
        </ExploreList>
      )}

      {stats.higherThanImdb.length > 0 && (
        <ExploreList
          title="Rated higher here than on IMDb"
          detail={`Same movies ranked twice: by this community's weighted score and by IMDb rating. Movies with ${POPULAR_MIN_RATINGS}+ ratings.`}
        >
          {stats.higherThanImdb.map(({ movie, here, imdb }) => (
            <ExploreRow key={movie.movieId} movie={movie}>
              <span>{standingLabel(here) ?? `#${here.rank}`} here</span>
              <span className="text-xs text-zinc-500">{standingLabel(imdb) ?? `#${imdb.rank}`} on IMDb</span>
            </ExploreRow>
          ))}
        </ExploreList>
      )}
    </div>
  )
}

function ExploreList({
  title,
  detail,
  children,
}: {
  title: string
  detail: string
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <p className={`text-sm ${muted}`}>{detail}</p>
      </div>
      <ol className="divide-y divide-black/[.08] overflow-hidden rounded-xl border border-black/[.08] dark:divide-white/[.145] dark:border-white/[.145]">
        {children}
      </ol>
    </section>
  )
}

function ExploreRow({
  movie,
  wide = false,
  children,
}: {
  movie: RankedMovie
  /** Give the right-hand stat more room (for the split bar). */
  wide?: boolean
  children: ReactNode
}) {
  return (
    <li>
      <Link
        href={`/movies/${encodeURIComponent(movie.movieId)}`}
        className="flex flex-col gap-2 p-4 transition-colors hover:bg-black/[.03] focus-visible:bg-black/[.03] focus-visible:outline-none sm:flex-row sm:items-center sm:justify-between sm:gap-6 dark:hover:bg-white/[.05] dark:focus-visible:bg-white/[.05]"
      >
        <div className="min-w-0">
          <span className="font-medium">{displayTitle(movie.title)}</span>
          {movie.year != null && (
            <span className="ml-2 font-mono text-sm tabular-nums text-zinc-500">{movie.year}</span>
          )}
        </div>
        <div
          className={
            wide
              ? "w-full shrink-0 sm:w-56"
              : "flex shrink-0 items-baseline gap-2 text-sm tabular-nums sm:flex-col sm:items-end sm:gap-0"
          }
        >
          {children}
        </div>
      </Link>
    </li>
  )
}

export function ExploreStatsSkeleton() {
  return (
    <div className="flex flex-col gap-10" aria-busy>
      <div className="h-5 w-80 max-w-full animate-pulse rounded-md bg-black/[.06] dark:bg-white/[.08]" />
      {["Hidden gems", "Most divisive"].map((title) => (
        <section key={title} className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          <div className="h-96 animate-pulse rounded-xl bg-black/[.04] dark:bg-white/[.06]" />
        </section>
      ))}
    </div>
  )
}
