import { SignInLink } from "@/components/sign-in-link"
import { logout } from "@/lib/actions/auth"
import { tryGetCurrentUser } from "@/lib/auth/current-user"

/** Header account area: "Sign in", or the user's name and "Sign out". Render inside <Suspense>. */
export async function UserMenu() {
  const user = await tryGetCurrentUser()
  if (!user) return <SignInLink />

  return (
    <div className="flex shrink-0 items-center gap-3">
      <span
        title={user.name}
        className="hidden max-w-40 truncate text-sm text-zinc-600 sm:inline dark:text-zinc-400"
      >
        {user.name}
      </span>
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
