"use server"

import { getGenre, getGenreMovies, type GenreMoviesPage } from "@/lib/data/genres"

const NO_MORE: GenreMoviesPage = { movies: [], rankedCount: 0, nextOffset: null }

/**
 * The next page of a genre's movies, for the infinite scroll on
 * /genres/[genre]. Anyone can call a Server Action with any arguments, so
 * they're checked; the page size is fixed on the server.
 */
export async function loadGenreMovies(slug: string, offset: number): Promise<GenreMoviesPage> {
  if (typeof slug !== "string" || !Number.isSafeInteger(offset) || offset < 0) return NO_MORE

  const genre = await getGenre(slug)
  if (!genre || offset >= genre.movieCount) return NO_MORE
  return getGenreMovies(genre, offset)
}
