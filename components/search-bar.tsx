"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useRef, useTransition } from "react"

const DEBOUNCE_MS = 300

/** Search box prefilled from `?q=`. Render inside <Suspense> (it reads the URL). */
export function SearchBar() {
  const query = useSearchParams().get("q") ?? ""
  return <SearchForm defaultQuery={query} />
}

/*
 * Searching is a navigation to `/?q=...`: the home page reads the query on the
 * server and renders the results, so a search URL can be shared or reloaded.
 * Results update as you type (debounced). Without JavaScript, the form still
 * works as a plain GET form.
 *
 * While the next results load, the form carries `data-pending`, which other
 * parts of the page can style with `group-has-data-pending:`.
 */
export function SearchForm({ defaultQuery = "" }: { defaultQuery?: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  function search(value: string) {
    clearTimeout(timer.current)
    const query = value.trim()
    const href = query ? `/?q=${encodeURIComponent(query)}` : "/"

    startTransition(() => {
      // On the home page, replace the history entry so Back doesn't step
      // through every keystroke. From any other page, searching is a new visit.
      // The path is read here, not with usePathname(): this form is the
      // layout's Suspense fallback, and on dynamic routes like /movies/[movieId]
      // usePathname() would suspend during prerendering and fail the build.
      if (window.location.pathname === "/") router.replace(href, { scroll: false })
      else router.push(href)
    })
  }

  return (
    <form
      action="/"
      role="search"
      data-pending={isPending ? "" : undefined}
      onSubmit={(event) => {
        event.preventDefault()
        search(String(new FormData(event.currentTarget).get("q") ?? ""))
      }}
      className="relative"
    >
      <label htmlFor="movie-search" className="sr-only">
        Search movies
      </label>
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-zinc-500">
        {isPending ? <Spinner /> : <SearchIcon />}
      </span>
      <input
        id="movie-search"
        type="search"
        name="q"
        defaultValue={defaultQuery}
        placeholder="Search movies by title"
        maxLength={100}
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="search"
        onChange={(event) => {
          const value = event.currentTarget.value
          clearTimeout(timer.current)
          timer.current = setTimeout(() => search(value), DEBOUNCE_MS)
        }}
        className="h-11 w-full rounded-xl border border-black/[.08] bg-transparent pr-3 pl-10 text-base outline-none transition-colors placeholder:text-zinc-500 focus:border-black/[.3] dark:border-white/[.145] dark:focus:border-white/[.4]"
      />
    </form>
  )
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden className="size-4">
      <circle cx="8.5" cy="8.5" r="5.75" stroke="currentColor" strokeWidth="1.5" />
      <path d="m13 13 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function Spinner() {
  return (
    <span
      aria-hidden
      className="size-4 animate-spin rounded-full border-[1.5px] border-current border-t-transparent"
    />
  )
}
