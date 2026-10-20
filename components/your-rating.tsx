import Link from "next/link"

import { RatingInput } from "@/components/rating-input"
import { StarShape } from "@/components/stars"
import { tryGetCurrentUser } from "@/lib/auth/current-user"
import { getUserRating } from "@/lib/data/ratings"

/**
 * The signed-in user's rating of a movie, editable; or a prompt to sign in.
 * Reads the session, so render it inside <Suspense>.
 */
export async function YourRating({ movieId }: { movieId: string }) {
  const user = await tryGetCurrentUser()
  if (!user) return <SignInToRate movieId={movieId} />

  const rating = await getUserRating(user.userId, movieId)
  return <RatingInput movieId={movieId} initialRating={rating} />
}

function SignInToRate({ movieId }: { movieId: string }) {
  const next = `/movies/${encodeURIComponent(movieId)}`
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
      <span className="inline-flex">
        {[1, 2, 3, 4, 5].map((n) => (
          <StarShape key={n} fill={0} className="size-7" />
        ))}
      </span>
      <Link
        href={`/login?next=${encodeURIComponent(next)}`}
        className="font-medium underline-offset-4 hover:underline"
      >
        Sign in to rate this movie
      </Link>
    </p>
  )
}

/** Same height as the input, so the page doesn't shift when it loads. */
export function YourRatingSkeleton() {
  return (
    <div aria-hidden className="flex h-7 items-center gap-3">
      <div className="h-4 w-20 animate-pulse rounded bg-black/[.06] dark:bg-white/[.08]" />
      <div className="h-7 w-36 animate-pulse rounded-md bg-black/[.06] dark:bg-white/[.08]" />
    </div>
  )
}
