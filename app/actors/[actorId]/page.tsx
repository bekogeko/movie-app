import type { Metadata } from "next"
import { Suspense } from "react"

import ErrorBoundary from "@/components/error-boundary"
import { PersonDetails, personMetadata, PersonSkeleton } from "@/components/person-details"

export async function generateMetadata({
  params,
}: PageProps<"/actors/[actorId]">): Promise<Metadata> {
  const { actorId } = await params
  return personMetadata("actor", actorId)
}

export default function ActorPage({ params }: PageProps<"/actors/[actorId]">) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-16">
      <ErrorBoundary title="Couldn't load this actor">
        {/* params are only known at request time, so they're read inside Suspense. */}
        <Suspense fallback={<PersonSkeleton kind="actor" />}>
          {params.then(({ actorId }) => (
            <PersonDetails kind="actor" tmdbId={actorId} />
          ))}
        </Suspense>
      </ErrorBoundary>
    </main>
  )
}
