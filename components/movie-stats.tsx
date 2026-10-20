import Link from "next/link"

import { RatingHistogram } from "@/components/rating-histogram"
import { RatingSplit } from "@/components/rating-split"
import { getFansAlsoLoved, getMovieStats } from "@/lib/data/stats"
import {
  displayTitle,
  formatCount,
  formatScore,
  formatShare,
  plural,
} from "@/lib/format"
import {
  CONSENSUS_MAX_SD,
  DIVISIVE_SHARE,
  IMDB_GAP,
  LOVED_AT,
  MIN_FANS,
  MIN_RATINGS_TO_RANK,
  percentile,
  PRIOR_WEIGHT,
  standingLabel,
  type Agreement,
  type MovieStanding,
  type Rank,
} from "@/lib/rating-stats"

const card = "rounded-xl border border-black/[.08] p-5 dark:border-white/[.145]"
const muted = "text-zinc-600 dark:text-zinc-400"

// ---------------------------------------------------------------------------
// Community rating: weighted score, spread, histogram
// ---------------------------------------------------------------------------

export async function CommunityRating({ movieId }: { movieId: string }) {
  const stats = await getMovieStats(movieId)
  const { summary, score, baseline } = stats

  return (
    <section aria-labelledby="community-rating" className="flex flex-col gap-4">
      <SectionHeading id="community-rating" title="Community rating" />

      {summary.count === 0 ? (
        <p className={`${card} text-sm ${muted}`}>Nobody has rated this movie yet.</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
            <div className={`${card} flex flex-col gap-3`}>
              <div>
                <p className={`text-sm ${muted}`}>Weighted score</p>
                <p className="mt-1 text-4xl font-semibold tracking-tight">
                  {formatScore(score!)}
                  <span className="text-base font-normal text-zinc-500"> / 5</span>
                </p>
              </div>
              <p className={`text-sm ${muted}`}>
                Average {formatScore(summary.mean)} from {plural(summary.count, "rating")}
              </p>
              <AgreementBadge agreement={stats.agreement} />
            </div>

            <div className={card}>
              <RatingHistogram buckets={stats.buckets} />
            </div>
          </div>

          <RatingSplit loved={summary.loved} disliked={summary.disliked} total={summary.count} />

          <p className="text-xs text-zinc-500">
            The weighted score adds {PRIOR_WEIGHT} ratings at the site average (
            {formatScore(baseline.mean)}) to every movie, so a handful of enthusiastic
            ratings can&rsquo;t outrank a film thousands of people have judged.
            {summary.count < PRIOR_WEIGHT &&
              ` With only ${plural(summary.count, "rating")}, this one still leans on the site average.`}
          </p>
        </>
      )}
    </section>
  )
}

const AGREEMENT: Partial<Record<Agreement, { label: string; detail: string }>> = {
  consensus: {
    label: "Strong consensus",
    detail: `Ratings sit unusually close together (spread ≤ ${CONSENSUS_MAX_SD}★, about the tightest fifth of films).`,
  },
  divisive: {
    label: "Divisive",
    detail: `At least ${formatShare(DIVISIVE_SHARE)} loved it and at least ${formatShare(DIVISIVE_SHARE)} disliked it.`,
  },
}

function AgreementBadge({ agreement }: { agreement: Agreement }) {
  const info = AGREEMENT[agreement]
  if (!info) return null
  return (
    <div className="flex flex-col gap-1">
      <span className="w-fit rounded-full border border-black/[.12] px-2 py-0.5 text-xs font-medium dark:border-white/[.2]">
        {info.label}
      </span>
      <p className="text-xs text-zinc-500">{info.detail}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// How it ranks
// ---------------------------------------------------------------------------

export async function HowItRanks({ movieId }: { movieId: string }) {
  const { standing, summary } = await getMovieStats(movieId)

  return (
    <section aria-labelledby="how-it-ranks" className="flex flex-col gap-4">
      <SectionHeading
        id="how-it-ranks"
        title="How it ranks"
        detail={
          standing
            ? `By weighted score, among the ${formatCount(standing.overall.of)} movies with ${MIN_RATINGS_TO_RANK}+ ratings.`
            : undefined
        }
      />
      {standing ? (
        <Standing standing={standing} />
      ) : (
        <p className={`${card} text-sm ${muted}`}>
          Movies need {MIN_RATINGS_TO_RANK} ratings to be ranked; this one has{" "}
          {formatCount(summary.count)} so far.
        </p>
      )}
    </section>
  )
}

function Standing({ standing }: { standing: MovieStanding }) {
  const rows: { label: string; rank: Rank }[] = [
    { label: "All movies", rank: standing.overall },
    ...standing.genres.slice(0, 3).map(({ genre, rank }) => ({ label: genre, rank })),
    ...(standing.decade
      ? [{ label: `The ${standing.decade.decade}s`, rank: standing.decade.rank }]
      : []),
  ]

  return (
    <div className={`${card} flex flex-col gap-4`}>
      <table className="w-full text-sm tabular-nums">
        <thead className="sr-only">
          <tr>
            <th>Among</th>
            <th>Rank</th>
            <th>Percentile</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ label, rank }) => (
            <tr key={label} className="border-b border-black/[.06] last:border-0 dark:border-white/[.08]">
              <th scope="row" className="py-2 pr-4 text-left font-normal">
                {label}
              </th>
              <td className={`py-2 pr-4 text-right ${muted}`}>
                #{formatCount(rank.rank)} of {formatCount(rank.of)}
              </td>
              <td className="w-24 py-2 text-right font-medium">{standingLabel(rank)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {standing.imdb && <ImdbComparison here={standing.imdb.here} imdb={standing.imdb.imdb} />}
    </div>
  )
}

/** "top 3%", or "#3 of 7" for short lists. */
function relative(rank: Rank): string {
  return standingLabel(rank)?.toLowerCase() ?? `#${formatCount(rank.rank)} of ${formatCount(rank.of)}`
}

function ImdbComparison({ here, imdb }: { here: Rank; imdb: Rank }) {
  const gap = percentile(imdb) - percentile(here)
  const verdict =
    gap >= IMDB_GAP
      ? "This community rates it much higher than IMDb voters do."
      : gap <= -IMDB_GAP
        ? "This community rates it much lower than IMDb voters do."
        : "Roughly in line with IMDb."

  return (
    <p className={`text-sm ${muted}`}>
      <span className="font-medium text-foreground">Against IMDb:</span>{" "}
      {relative(here)} here, {relative(imdb)} by IMDb rating,
      among the same{" "}
      {formatCount(here.of)} movies. {verdict}
    </p>
  )
}

// ---------------------------------------------------------------------------
// Fans also loved
// ---------------------------------------------------------------------------

export async function FansAlsoLoved({ movieId, title }: { movieId: string; title: string }) {
  const { summary } = await getMovieStats(movieId)
  const fans = summary.loved

  return (
    <section aria-labelledby="fans-also-loved" className="flex flex-col gap-4">
      <SectionHeading
        id="fans-also-loved"
        title="Fans also loved"
        detail={
          fans >= MIN_FANS
            ? `What the ${formatCount(fans)} people who rated ${displayTitle(title)} ${LOVED_AT}★ or higher loved unusually often, compared with everyone else.`
            : undefined
        }
      />
      {fans < MIN_FANS ? (
        <p className={`${card} text-sm ${muted}`}>
          Not enough fans to find a pattern yet: this needs {MIN_FANS} people rating it{" "}
          {LOVED_AT}★ or higher, and has {formatCount(fans)}.
        </p>
      ) : (
        <FanPicks movieId={movieId} />
      )}
    </section>
  )
}

async function FanPicks({ movieId }: { movieId: string }) {
  const { fanCount, picks } = await getFansAlsoLoved(movieId)

  if (picks.length === 0) {
    return (
      <p className={`${card} text-sm ${muted}`}>
        No strong overlaps yet: no other movie was loved by enough of the same people.
      </p>
    )
  }

  return (
    <ul className="divide-y divide-black/[.08] overflow-hidden rounded-xl border border-black/[.08] dark:divide-white/[.145] dark:border-white/[.145]">
      {picks.map(({ movie, sharedFans, share, lift }) => (
        <li key={movie.movieId}>
          <Link
            href={`/movies/${encodeURIComponent(movie.movieId)}`}
            className="flex items-baseline justify-between gap-4 p-4 transition-colors hover:bg-black/[.03] focus-visible:bg-black/[.03] focus-visible:outline-none dark:hover:bg-white/[.05] dark:focus-visible:bg-white/[.05]"
          >
            <span className="min-w-0">
              <span className="font-medium">{displayTitle(movie.title)}</span>
              {movie.year != null && (
                <span className="ml-2 font-mono text-sm tabular-nums text-zinc-500">{movie.year}</span>
              )}
            </span>
            <span className="flex shrink-0 flex-col items-end text-sm tabular-nums">
              <span title={`${formatCount(sharedFans)} of ${formatCount(fanCount)} fans`}>
                {formatShare(share)} of fans
              </span>
              <span className="text-xs text-zinc-500">{lift.toFixed(1)}× the usual rate</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

function SectionHeading({ id, title, detail }: { id: string; title: string; detail?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <h2 id={id} className="text-lg font-semibold tracking-tight">
        {title}
      </h2>
      {detail && <p className={`text-sm ${muted}`}>{detail}</p>}
    </div>
  )
}

/** Placeholder with the section's real heading, so the page doesn't jump when data arrives. */
export function SectionSkeleton({ title, height = "h-40" }: { title: string; height?: string }) {
  return (
    <section className="flex flex-col gap-4" aria-busy>
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <div className={`${height} animate-pulse rounded-xl bg-black/[.04] dark:bg-white/[.06]`} />
    </section>
  )
}
