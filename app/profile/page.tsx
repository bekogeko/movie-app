import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"

import ErrorBoundary from "@/components/error-boundary"
import { MoviePoster } from "@/components/movie-poster"
import { Stars } from "@/components/stars"
import { requireUser } from "@/lib/auth/current-user"
import { getUserRatings, type RatedMovie } from "@/lib/data/ratings"
import { findAccount } from "@/lib/data/users"
import { displayTitle, formatDate, formatStars, plural } from "@/lib/format"

export const metadata: Metadata = {
  title: "Your profile · Movie App",
}

/*
 * The signed-in user's own profile: account details and every movie they've
 * rated, best first. Signed-out visitors are sent to /login and back.
 * The password hash is never read here.
 */
export default function ProfilePage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-16">
      <ErrorBoundary title="Couldn't load your profile">
        <Suspense fallback={<ProfileSkeleton />}>
          <Profile />
        </Suspense>
      </ErrorBoundary>
    </main>
  )
}

async function Profile() {
  const user = await requireUser("/profile")
  const [account, ratings] = await Promise.all([
    findAccount(user.userId),
    getUserRatings(user.userId),
  ])

  const average = ratings.length
    ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
    : null

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <Initial name={user.name} />
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="truncate text-3xl font-semibold tracking-tight">{user.name}</h1>
            {account && (
              <p className="truncate text-sm text-zinc-600 dark:text-zinc-400">
                {account.email}
                {account.createdAt && <> · Member since {formatDate(account.createdAt)}</>}
              </p>
            )}
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-4">
          <Stat label="Movies rated" value={ratings.length.toLocaleString("en-US")} />
          <Stat
            label="Average rating"
            value={average !== null ? `${average.toFixed(1)} / 5` : "—"}
          />
        </dl>
      </header>

      <section aria-labelledby="your-ratings" className="flex flex-col gap-4">
        <h2 id="your-ratings" className="text-lg font-semibold tracking-tight">
          Your ratings
        </h2>
        {ratings.length === 0 ? (
          <p className="rounded-xl border border-dashed border-black/[.12] p-6 text-sm text-zinc-600 dark:border-white/[.2] dark:text-zinc-400">
            You haven&apos;t rated any movies yet. Search for a movie and pick a star rating on its
            page.
          </p>
        ) : (
          <>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {plural(ratings.length, "movie")}, highest rated first.
            </p>
            <RatingsList ratings={ratings} />
          </>
        )}
      </section>
    </div>
  )
}

function RatingsList({ ratings }: { ratings: RatedMovie[] }) {
  const ranks = competitionRanks(ratings.map((r) => r.rating))

  return (
    <ol className="divide-y divide-black/[.08] overflow-hidden rounded-xl border border-black/[.08] dark:divide-white/[.145] dark:border-white/[.145]">
      {ratings.map(({ movie, rating, ratedAt }, i) => {
        const title = displayTitle(movie.title)
        const tied = ranks[i] === ranks[i - 1] || ranks[i] === ranks[i + 1]
        return (
          <li key={movie.movieId}>
            <Link
              href={`/movies/${encodeURIComponent(movie.movieId)}`}
              className="flex items-center gap-4 p-3 transition-colors hover:bg-black/[.03] focus-visible:bg-black/[.03] focus-visible:outline-none sm:px-4 dark:hover:bg-white/[.05] dark:focus-visible:bg-white/[.05]"
            >
              <span
                title={tied ? `Tied for #${ranks[i]}` : undefined}
                className="w-7 shrink-0 text-right font-mono text-sm tabular-nums text-zinc-500"
              >
                {ranks[i]}
              </span>
              <MoviePoster
                src={movie.poster}
                alt=""
                sizes="40px"
                className="w-10 shrink-0 rounded-md"
                loading={i < 8 ? "eager" : "lazy"}
              />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate font-medium">
                  {title}
                  {movie.year !== null && (
                    <span className="ml-2 font-mono text-sm font-normal tabular-nums text-zinc-500">
                      {movie.year}
                    </span>
                  )}
                </span>
                {ratedAt !== null && (
                  <span className="text-xs text-zinc-500">
                    Rated {formatDate(new Date(ratedAt * 1000).toISOString())}
                  </span>
                )}
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <Stars value={rating} className="size-4" />
                <span className="hidden w-7 text-sm font-medium tabular-nums sm:inline">
                  {formatStars(rating)}
                </span>
              </span>
            </Link>
          </li>
        )
      })}
    </ol>
  )
}

/** 5, 5, 4.5, 4 -> 1, 1, 3, 4 (equal ratings share a rank). Expects sorted input. */
function competitionRanks(values: number[]): number[] {
  return values.map((value) => values.indexOf(value) + 1)
}

function Initial({ name }: { name: string }) {
  return (
    <span
      aria-hidden
      className="flex size-14 shrink-0 items-center justify-center rounded-full bg-foreground text-xl font-semibold text-background"
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-black/[.08] p-5 dark:border-white/[.145]">
      <dt className="text-sm text-zinc-600 dark:text-zinc-400">{label}</dt>
      <dd className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">{value}</dd>
    </div>
  )
}

function ProfileSkeleton() {
  const bar = "animate-pulse rounded-md bg-black/[.06] dark:bg-white/[.08]"
  return (
    <div aria-busy className="flex flex-col gap-10">
      <div className="flex items-center gap-4">
        <div className="size-14 animate-pulse rounded-full bg-black/[.06] dark:bg-white/[.08]" />
        <div className="flex flex-1 flex-col gap-2">
          <div className={`h-8 w-48 ${bar}`} />
          <div className={`h-4 w-64 ${bar}`} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className={`h-24 ${bar}`} />
        <div className={`h-24 ${bar}`} />
      </div>
      <div className={`h-64 ${bar}`} />
    </div>
  )
}
