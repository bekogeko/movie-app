import type { Metadata } from "next"
import { Suspense } from "react"

import ErrorBoundary from "@/components/error-boundary"
import { ExploreStats, ExploreStatsSkeleton } from "@/components/explore-stats"

export const metadata: Metadata = {
  title: "What the ratings say · Movie App",
  description:
    "Hidden gems, the most divisive movies, and where this community disagrees with IMDb.",
}

export default function StatsPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-6 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">What the ratings say</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Patterns in the community&rsquo;s ratings that a plain average or a
          &ldquo;most rated&rdquo; list would hide.
        </p>
      </header>

      <ErrorBoundary title="Couldn't reach Neo4j">
        <Suspense fallback={<ExploreStatsSkeleton />}>
          <ExploreStats />
        </Suspense>
      </ErrorBoundary>
    </main>
  )
}
