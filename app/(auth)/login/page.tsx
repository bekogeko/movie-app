import type { Metadata } from "next"

import { LoginForm } from "@/components/auth-forms"
import { NextField, SwitchAuthLink } from "@/components/auth-next"
import { safeRedirectPath } from "@/lib/auth/validation"

export const metadata: Metadata = {
  title: "Sign in · Movie App",
}

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  const next = searchParams.then(({ next }) => safeRedirectPath(next, ""))

  return (
    <>
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Sign in</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Rate movies and get recommendations based on your taste.
        </p>
      </header>

      <LoginForm>
        <NextField next={next} />
      </LoginForm>

      <SwitchAuthLink next={next} href="/register" prompt="New here?" label="Create an account" />
    </>
  )
}
