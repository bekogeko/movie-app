import type { Metadata } from "next"
import Link from "next/link"
import { notFound, unstable_rethrow } from "next/navigation"
import { Suspense } from "react"

import ErrorBoundary from "@/components/error-boundary"
import { GenreMovieGrid, GenreMovieGridSkeleton } from "@/components/genre-movie-grid"
import { genreHref, getGenre, getGenreMovies, getGenres, type Genre } from "@/lib/data/genres"
import { formatCount, plural } from "@/lib/format"

const muted = "text-zinc-600 dark:text-zinc-400"

export async function generateMetadata({
  params,
}: PageProps<"/genres/[genre]">): Promise<Metadata> {
  const { genre: slug } = await params
  try {
    const genre = await getGenre(slug)
    if (!genre) return { title: "Genre not found · Movie App" }
    return {
      title: `${genre.name} movies · Movie App`,
      description: `All ${plural(genre.movieCount, `${genre.name} movie`)}, best-rated first.`,
    }
  } catch (error) {
    // Same as the movie page: let the page's ErrorBoundary report a failed query.
    unstable_rethrow(error)
    return {}
  }
}

export default function GenrePage({ params }: PageProps<"/genres/[genre]">) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-16">
      <ErrorBoundary title="Couldn't load this genre">
        {/* params are only known at request time, so they're read inside Suspense. */}
        <Suspense fallback={<GenreSkeleton />}>
          {params.then(({ genre }) => (
            <GenreDetails slug={genre} />
          ))}
        </Suspense>
      </ErrorBoundary>
    </main>
  )
}

async function GenreDetails({ slug }: { slug: string }) {
  const genre = await getGenre(slug)
  if (!genre) notFound()
  const [firstPage, genres] = await Promise.all([getGenreMovies(genre), getGenres()])

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-2">
          <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">Genre</p>
          <h1 className="text-3xl font-semibold tracking-tight">{genre.name}</h1>
          <p className={muted}>
            {plural(genre.movieCount, "movie")}
            {firstPage.rankedCount > 0 &&
              ` · ${formatCount(firstPage.rankedCount)} ranked by the community`}
          </p>
        </header>
        <GenreNav genres={genres} current={genre} />
      </div>

      {/* Keyed so moving to another genre starts a fresh list instead of keeping this one's pages. */}
      <GenreMovieGrid
        key={genre.slug}
        slug={genre.slug}
        genreName={genre.name}
        movieCount={genre.movieCount}
        initial={firstPage}
      />
    </div>
  )
}

/** Every genre as a chip, to jump between them. One scrolling line on phones, wrapped from 640px up. */
function GenreNav({ genres, current }: { genres: Genre[]; current: Genre }) {
  const chip = "block whitespace-nowrap rounded-full border px-3 py-1 text-sm transition-colors"
  return (
    <nav aria-label="Genres">
      <ul className="-mx-6 flex gap-2 overflow-x-auto px-6 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
        {genres.map((genre) => {
          const active = genre.slug === current.slug
          return (
            <li key={genre.slug} className="shrink-0">
              <Link
                href={genreHref(genre.name)}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? `${chip} border-transparent bg-foreground text-background`
                    : `${chip} border-black/[.08] hover:bg-black/[.03] dark:border-white/[.145] dark:hover:bg-white/[.05]`
                }
              >
                {genre.name}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

function GenreSkeleton() {
  const bar = "animate-pulse rounded-md bg-black/[.06] dark:bg-white/[.08]"
  return (
    <div className="flex flex-col gap-10" aria-busy="true">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">Genre</p>
          <div className={`h-9 w-48 ${bar}`} />
          <div className={`h-5 w-64 ${bar}`} />
        </div>
        <div className="flex gap-2 overflow-hidden sm:flex-wrap">
          {[64, 80, 56, 72, 88, 60, 76].map((width, i) => (
            <div key={i} className={`h-7 shrink-0 rounded-full ${bar}`} style={{ width }} />
          ))}
        </div>
      </div>
      <GenreMovieGridSkeleton />
    </div>
  )
}
