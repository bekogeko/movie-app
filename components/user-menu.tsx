import Link from "next/link"

import { SignInLink } from "@/components/sign-in-link"
import { logout } from "@/lib/actions/auth"
import { tryGetCurrentUser } from "@/lib/auth/current-user"

/** Header account area: "Sign in", or a link to the profile and "Sign out". Render inside <Suspense>. */
export async function UserMenu() {
  const user = await tryGetCurrentUser()
  if (!user) return <SignInLink />

  return (
    <div className="flex shrink-0 items-center gap-3">
      <Link
        href="/profile"
        title="Your profile"
        className="flex items-center gap-2 rounded-lg text-sm text-zinc-600 hover:text-foreground dark:text-zinc-400"
      >
        <span
          aria-hidden
          className="flex size-8 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background"
        >
          {user.name.trim().charAt(0).toUpperCase() || "?"}
        </span>
        <span className="hidden max-w-40 truncate sm:inline">{user.name}</span>
        <span className="sr-only sm:hidden">Your profile</span>
      </Link>
      <form action={logout}>
        <button
          type="submit"
          className="h-9 rounded-lg border border-black/[.08] px-3 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.06]"
        >
          Sign out
        </button>
      </form>
    </div>
  )
}

/** Same footprint as the "Sign in" button, so the header doesn't jump. */
export function UserMenuSkeleton() {
  return (
    <div
      aria-hidden
      className="h-9 w-[4.5rem] shrink-0 animate-pulse rounded-lg bg-black/[.06] dark:bg-white/[.08]"
    />
  )
}
