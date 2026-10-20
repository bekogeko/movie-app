import type { Metadata } from "next"

import { RegisterForm } from "@/components/auth-forms"
import { NextField, SwitchAuthLink } from "@/components/auth-next"
import { safeRedirectPath } from "@/lib/auth/validation"

export const metadata: Metadata = {
  title: "Create an account · Movie App",
}

export default function RegisterPage({ searchParams }: PageProps<"/register">) {
  const next = searchParams.then(({ next }) => safeRedirectPath(next, ""))

  return (
    <>
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Create an account</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Rate movies and get recommendations based on your taste.
        </p>
      </header>

      <RegisterForm>
        <NextField next={next} />
      </RegisterForm>

      <SwitchAuthLink
        next={next}
        href="/login"
        prompt="Already have an account?"
        label="Sign in"
      />
    </>
  )
}
