import { Suspense } from "react"

import ErrorBoundary from "@/components/error-boundary"
import { ExploreStats, ExploreStatsSkeleton } from "@/components/explore-stats"
import { SearchResults } from "@/components/search-results"
import { normalizeSearchQuery } from "@/lib/data/movies"

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-6 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Movie App</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Movie recommendations from a Neo4j graph.
        </p>
      </header>

      {/* No fallback: most visits have no query, and a skeleton here would
          flash on every load. Keyed by query so an error clears on a new search. */}
      <Suspense fallback={null}>
        {searchParams.then(({ q }) => {
          const query = normalizeSearchQuery(q)
          if (!query) return null
          return (
            <ErrorBoundary key={query} title="Search failed">
              <SearchResults query={query} />
            </ErrorBoundary>
          )
        })}
      </Suspense>

      <ErrorBoundary title="Couldn't reach Neo4j">
        <Suspense fallback={<ExploreStatsSkeleton />}>
          <ExploreStats />
        </Suspense>
      </ErrorBoundary>
    </main>
  )
}
