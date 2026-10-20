import { Suspense } from "react"

import ErrorBoundary from "@/components/error-boundary"
import { SearchResults } from "@/components/search-results"
import { normalizeSearchQuery } from "@/lib/data/movies"
import { getNodeCount } from "@/lib/data/stats"

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

      <section className="grid gap-4 sm:grid-cols-2">
        <ErrorBoundary title="Couldn't reach Neo4j">
          <Suspense fallback={<StatCardSkeleton label="Nodes in the graph" />}>
            <NodeCount />
          </Suspense>
        </ErrorBoundary>
      </section>
    </main>
  )
}

async function NodeCount() {
  const count = await getNodeCount()
  return <StatCard label="Nodes in the graph" value={count.toLocaleString("en-US")} />
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-black/[.08] p-5 dark:border-white/[.145]">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{label}</p>
      <p className="mt-1 font-mono text-4xl font-semibold tabular-nums">{value}</p>
    </div>
  )
}

function StatCardSkeleton({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-black/[.08] p-5 dark:border-white/[.145]">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{label}</p>
      <div className="mt-2 h-9 w-32 animate-pulse rounded-md bg-black/[.06] dark:bg-white/[.08]" />
    </div>
  )
}
