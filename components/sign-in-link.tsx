"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"

/** "Sign in" that brings the user back to the page they were on. */
export function SignInLink() {
  const pathname = usePathname()
  const search = useSearchParams().toString()

  const here = search ? `${pathname}?${search}` : pathname
  const onAuthPage = pathname === "/login" || pathname === "/register"
  const href = onAuthPage || here === "/" ? "/login" : `/login?next=${encodeURIComponent(here)}`

  return (
    <Link
      href={href}
      className="flex h-9 shrink-0 items-center rounded-lg bg-foreground px-3 text-sm font-medium text-background transition-opacity hover:opacity-90"
    >
      Sign in
    </Link>
  )
}
