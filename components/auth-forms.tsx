"use client"

import { useActionState, type ComponentProps, type ReactNode } from "react"

import { login, register } from "@/lib/actions/auth"
import {
  NAME_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  type AuthFormState,
} from "@/lib/auth/validation"

/*
 * Sign-in and sign-up forms. They post to Server Actions, so they also work
 * before JavaScript loads. `children` goes inside the form: the pages pass the
 * hidden `next` field there (see components/auth-next.tsx).
 *
 * React resets a form after its action runs, so inputs take their
 * `defaultValue` from the returned state to keep what the user typed.
 */

export function LoginForm({ children }: { children?: ReactNode }) {
  const [state, action, pending] = useActionState(login, {})

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {children}
      <FormMessage state={state} />
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        defaultValue={state.values?.email}
        error={state.errors?.email}
        required
      />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        error={state.errors?.password}
        required
      />
      <SubmitButton pending={pending}>Sign in</SubmitButton>
    </form>
  )
}

export function RegisterForm({ children }: { children?: ReactNode }) {
  const [state, action, pending] = useActionState(register, {})

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {children}
      <FormMessage state={state} />
      <Field
        label="Name"
        name="name"
        autoComplete="name"
        maxLength={NAME_MAX_LENGTH}
        defaultValue={state.values?.name}
        error={state.errors?.name}
        required
      />
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        defaultValue={state.values?.email}
        error={state.errors?.email}
        required
      />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={PASSWORD_MIN_LENGTH}
        maxLength={PASSWORD_MAX_LENGTH}
        hint={`At least ${PASSWORD_MIN_LENGTH} characters.`}
        error={state.errors?.password}
        required
      />
      <SubmitButton pending={pending}>Create account</SubmitButton>
    </form>
  )
}

function Field({
  label,
  name,
  hint,
  error,
  ...input
}: { label: string; name: string; hint?: string; error?: string } & ComponentProps<"input">) {
  const id = `field-${name}`
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className="h-11 w-full rounded-xl border border-black/[.08] bg-transparent px-3 text-base outline-none transition-colors placeholder:text-zinc-500 focus:border-black/[.3] aria-invalid:border-red-400 dark:border-white/[.145] dark:focus:border-white/[.4] dark:aria-invalid:border-red-500/70"
        {...input}
      />
      {error ? (
        <p id={`${id}-error`} className="text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-zinc-500">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

function FormMessage({ state }: { state: AuthFormState }) {
  if (!state.message) return null
  return (
    <p
      role="alert"
      className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300"
    >
      {state.message}
    </p>
  )
}

function SubmitButton({ pending, children }: { pending: boolean; children: ReactNode }) {
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending || undefined}
      className="mt-2 flex h-11 items-center justify-center gap-2 rounded-xl bg-foreground px-4 font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-60"
    >
      {pending && (
        <span
          aria-hidden
          className="size-4 animate-spin rounded-full border-[1.5px] border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  )
}
