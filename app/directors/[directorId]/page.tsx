import type { Metadata } from "next"
import { Suspense } from "react"

import ErrorBoundary from "@/components/error-boundary"
import { PersonDetails, personMetadata, PersonSkeleton } from "@/components/person-details"

export async function generateMetadata({
  params,
}: PageProps<"/directors/[directorId]">): Promise<Metadata> {
  const { directorId } = await params
  return personMetadata("director", directorId)
}

export default function DirectorPage({ params }: PageProps<"/directors/[directorId]">) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-16">
      <ErrorBoundary title="Couldn't load this director">
        {/* params are only known at request time, so they're read inside Suspense. */}
        <Suspense fallback={<PersonSkeleton kind="director" />}>
          {params.then(({ directorId }) => (
            <PersonDetails kind="director" tmdbId={directorId} />
          ))}
        </Suspense>
      </ErrorBoundary>
    </main>
  )
}
