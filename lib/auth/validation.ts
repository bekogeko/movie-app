/*
 * Parsing and checks for the sign-in / sign-up forms. Shared by the Server
 * Actions (the real check) and the form components (types, the `next` link).
 */

export type AuthField = "name" | "email" | "password"

/** What a form action returns when it doesn't redirect. */
export type AuthFormState = {
  /** A problem with the whole form, e.g. a wrong password. */
  message?: string
  errors?: Partial<Record<AuthField, string>>
  /** Typed values to put back in the inputs (never the password). */
  values?: { name?: string; email?: string }
}

type Parsed<T> = { ok: true; data: T } | { ok: false; state: AuthFormState }

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const NAME_MAX_LENGTH = 50
export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 128

export function parseRegisterForm(
  formData: FormData,
): Parsed<{ name: string; email: string; password: string }> {
  const name = getString(formData, "name").trim().replace(/\s+/g, " ")
  const email = normalizeEmail(getString(formData, "email"))
  // Passwords are taken exactly as typed: no trimming.
  const password = getString(formData, "password")

  const errors: AuthFormState["errors"] = {}
  if (name.length < 2) errors.name = "Enter at least 2 characters."
  else if (name.length > NAME_MAX_LENGTH) errors.name = `Use at most ${NAME_MAX_LENGTH} characters.`

  if (!isEmail(email)) errors.email = "Enter a valid email address."

  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.password = `Use at least ${PASSWORD_MIN_LENGTH} characters.`
  } else if (password.length > PASSWORD_MAX_LENGTH) {
    errors.password = `Use at most ${PASSWORD_MAX_LENGTH} characters.`
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, state: { errors, values: { name, email } } }
  }
  return { ok: true, data: { name, email, password } }
}

export function parseLoginForm(formData: FormData): Parsed<{ email: string; password: string }> {
  const email = normalizeEmail(getString(formData, "email"))
  const password = getString(formData, "password")

  const errors: AuthFormState["errors"] = {}
  if (!isEmail(email)) errors.email = "Enter a valid email address."
  if (!password) errors.password = "Enter your password."
  // Too long to be a real password; skip hashing it.
  else if (password.length > PASSWORD_MAX_LENGTH) errors.password = "Incorrect password."

  if (Object.keys(errors).length > 0) {
    return { ok: false, state: { errors, values: { email } } }
  }
  return { ok: true, data: { email, password } }
}

/**
 * Where to send the user after signing in. Only same-site paths are allowed,
 * so `?next=https://evil.example` can't turn the login page into an open
 * redirect. Anything else (and the auth pages themselves) gives `fallback`.
 */
export function safeRedirectPath(value: unknown, fallback = "/"): string {
  if (typeof value !== "string" || value.length > 512 || !value.startsWith("/")) {
    return fallback
  }
  try {
    // Resolving against a dummy origin normalizes tricks like "//evil.com",
    // "/\evil.com" or embedded tabs; a different origin means it left the site.
    const base = "http://local.invalid"
    const url = new URL(value, base)
    if (url.origin !== base) return fallback
    if (url.pathname === "/login" || url.pathname === "/register") return fallback
    return url.pathname + url.search + url.hash
  } catch {
    return fallback
  }
}

function getString(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === "string" ? value : ""
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

function isEmail(value: string): boolean {
  return value.length <= 254 && EMAIL_PATTERN.test(value)
}
