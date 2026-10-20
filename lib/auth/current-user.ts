import "server-only"

import { redirect, unstable_rethrow } from "next/navigation"

import { getSessionUserId } from "@/lib/auth/session"
import { findUserById, type User } from "@/lib/data/users"

/*
 * Data Access Layer for "who is signed in". Everything that needs the current
 * user goes through these two functions, so the session check can't be
 * forgotten somewhere.
 */

/**
 * The signed-in user, or null. For rendering (e.g. the header). Reads the
 * session cookie, so render the caller inside <Suspense>.
 *
 * `use cache: private` lets the result be prefetched and reused per browser
 * (it is never stored on the server). Signing in or out changes the cookie in
 * a Server Action, which clears that client cache.
 */
export async function getCurrentUser(): Promise<User | null> {
  "use cache: private"

  const userId = await getSessionUserId()
  if (!userId) return null
  return findUserById(userId)
}

/**
 * Like `getCurrentUser`, but treats a database error as signed out. For page
 * chrome like the header, which shouldn't take the page down with it when
 * Neo4j is unreachable.
 */
export async function tryGetCurrentUser(): Promise<User | null> {
  try {
    return await getCurrentUser()
  } catch (error) {
    unstable_rethrow(error)
    console.error("[auth] Could not load the current user", error)
    return null
  }
}

/**
 * The signed-in user, or a redirect to /login. For Server Actions and pages
 * that need an account (rating a movie, say). Pass `returnTo` to come back to
 * the page after signing in.
 */
export async function requireUser(returnTo?: string): Promise<User> {
  const userId = await getSessionUserId()
  const user = userId ? await findUserById(userId) : null
  if (!user) {
    redirect(returnTo ? `/login?next=${encodeURIComponent(returnTo)}` : "/login")
  }
  return user
}
