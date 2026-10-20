import Link from "next/link"

import { PersonPhoto, PersonPhotoSkeleton } from "@/components/person-photo"
import {
  getMovieCredits,
  personHref,
  type CreditedPerson,
  type PersonKind,
} from "@/lib/data/people"

const muted = "text-zinc-600 dark:text-zinc-400"
const AVATAR = "size-12 shrink-0"
const AVATAR_SIZES = "48px"

/** Director(s) and cast of a movie, each linking to their page. */
export async function MovieCredits({ movieId }: { movieId: string }) {
  const { directors, cast } = await getMovieCredits(movieId)
  if (directors.length === 0 && cast.length === 0) return null

  return (
    <div className="flex flex-col gap-10">
      {directors.length > 0 && (
        <CreditSection
          id="directors"
          title={directors.length > 1 ? "Directors" : "Director"}
          kind="director"
          people={directors}
        />
      )}
      {cast.length > 0 && (
        <CreditSection id="cast" title="Cast" kind="actor" people={cast} />
      )}
    </div>
  )
}

function CreditSection({
  id,
  title,
  kind,
  people,
}: {
  id: string
  title: string
  kind: PersonKind
  people: CreditedPerson[]
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4">
      <h2 id={id} className="text-lg font-semibold tracking-tight">
        {title}
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {people.map((person) => (
          <li key={person.tmdbId}>
            <Link
              href={personHref(kind, person.tmdbId)}
              className="flex items-center gap-4 rounded-xl border border-black/[.08] p-3 transition-colors hover:bg-black/[.03] focus-visible:bg-black/[.03] focus-visible:outline-none dark:border-white/[.145] dark:hover:bg-white/[.05] dark:focus-visible:bg-white/[.05]"
            >
              <PersonPhoto
                src={person.photo}
                name={person.name}
                sizes={AVATAR_SIZES}
                className={AVATAR}
              />
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-medium">{person.name}</span>
                {person.role && (
                  <span className={`truncate text-sm ${muted}`}>{person.role}</span>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function MovieCreditsSkeleton() {
  const bar = "animate-pulse rounded-md bg-black/[.06] dark:bg-white/[.08]"
  return (
    <section className="flex flex-col gap-4" aria-busy>
      <h2 className="text-lg font-semibold tracking-tight">Cast</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-xl border border-black/[.08] p-3 dark:border-white/[.145]"
          >
            <PersonPhotoSkeleton className={AVATAR} />
            <div className="flex flex-1 flex-col gap-2">
              <div className={`h-4 w-32 ${bar}`} />
              <div className={`h-3 w-20 ${bar}`} />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
