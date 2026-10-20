import { searchMovies, type MovieSearchResult } from "@/lib/data/movies"

const LIMIT = 20

export async function SearchResults({ query }: { query: string }) {
  const movies = await searchMovies(query, LIMIT)

  return (
    // Dims while the next search loads (see `data-pending` in SearchForm).
    <section
      aria-label="Search results"
      className="flex flex-col gap-3 transition-opacity group-has-data-pending:opacity-50"
    >
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        {movies.length === 0
          ? `No movies match “${query}”.`
          : movies.length === LIMIT
            ? `Top ${LIMIT} matches for “${query}”`
            : `${movies.length} ${movies.length === 1 ? "match" : "matches"} for “${query}”`}
      </p>

      {movies.length > 0 && (
        <ul className="divide-y divide-black/[.08] rounded-xl border border-black/[.08] dark:divide-white/[.145] dark:border-white/[.145]">
          {movies.map((movie) => (
            <MovieRow key={movie.id} movie={movie} />
          ))}
        </ul>
      )}
    </section>
  )
}

function MovieRow({ movie }: { movie: MovieSearchResult }) {
  const details = [
    ...movie.genres,
    movie.imdbRating != null ? `IMDb ${movie.imdbRating.toFixed(1)}` : null,
  ].filter(Boolean)

  return (
    <li className="flex flex-col gap-1 p-4">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-medium">{displayTitle(movie.title)}</h2>
        {movie.year != null && (
          <span className="shrink-0 font-mono text-sm tabular-nums text-zinc-500">
            {movie.year}
          </span>
        )}
      </div>
      {details.length > 0 && (
        <p className="text-xs text-zinc-500">{details.join(" · ")}</p>
      )}
      {movie.summary && (
        <p className="line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
          {movie.summary}
        </p>
      )}
    </li>
  )
}

/** "Matrix, The" -> "The Matrix" (MovieLens-style titles move the article to the end). */
function displayTitle(title: string): string {
  const match = title.match(/^(.+), (The|A|An|La|Le|Les|Il|El|Die|Der|Das)$/)
  return match ? `${match[2]} ${match[1]}` : title
}
