import Link from "next/link"
import { Suspense } from "react"

/*
 * `?next=` (where to go after signing in) is request data, so it can't be in
 * the prerendered shell. Only these small pieces wait for it; the forms stay in
 * the shell, so they never get swapped out mid-typing or after a password
 * manager has filled them in.
 */

/** Hidden `next` input. Render inside the form. */
export function NextField({ next }: { next: Promise<string> }) {
  return (
    <Suspense fallback={null}>
      {next.then((value) => (value ? <input type="hidden" name="next" value={value} /> : null))}
    </Suspense>
  )
}

/** "New here? Create an account" style link to the other auth page, keeping `next`. */
export function SwitchAuthLink({
  next,
  href,
  prompt,
  label,
}: {
  next: Promise<string>
  href: "/login" | "/register"
  prompt: string
  label: string
}) {
  const className = "font-medium text-foreground underline-offset-4 hover:underline"
  return (
    <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
      {prompt}{" "}
      <Suspense
        fallback={
          <Link href={href} className={className}>
            {label}
          </Link>
        }
      >
        {next.then((value) => (
          <Link
            href={value ? `${href}?next=${encodeURIComponent(value)}` : href}
            className={className}
          >
            {label}
          </Link>
        ))}
      </Suspense>
    </p>
  )
}
