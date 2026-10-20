import Link from "next/link"
import { Suspense, type ReactNode } from "react"

import { tryGetCurrentUser } from "@/lib/auth/current-user"

/* Shared frame for /login and /register. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-6 px-6 py-16">
      <Suspense fallback={null}>
        <AlreadySignedIn />
      </Suspense>
      {children}
    </main>
  )
}

/* Visiting these pages while signed in still works (to switch accounts), but say so. */
async function AlreadySignedIn() {
  const user = await tryGetCurrentUser()
  if (!user) return null
  return (
    <p className="rounded-xl border border-black/[.08] px-4 py-3 text-sm text-zinc-600 dark:border-white/[.145] dark:text-zinc-400">
      You&apos;re signed in as <span className="font-medium text-foreground">{user.name}</span>.{" "}
      <Link href="/" className="font-medium text-foreground underline-offset-4 hover:underline">
        Back to movies
      </Link>
    </p>
  )
}
