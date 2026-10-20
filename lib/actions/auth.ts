"use server"

import { redirect } from "next/navigation"

import { getDummyHash, hashPassword, verifyPassword } from "@/lib/auth/password"
import { createSession, deleteSession } from "@/lib/auth/session"
import {
  parseLoginForm,
  parseRegisterForm,
  safeRedirectPath,
  type AuthFormState,
} from "@/lib/auth/validation"
import { createUser, findUserForLogin, type User } from "@/lib/data/users"

/*
 * Server Actions for the auth forms (used with useActionState). Each one
 * either returns form errors or signs the user in and redirects to the
 * form's `next` path.
 *
 * `redirect()` works by throwing, so it stays outside the try/catch blocks.
 */

export async function register(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = parseRegisterForm(formData)
  if (!parsed.ok) return parsed.state

  const { name, email, password } = parsed.data
  let user: User | null
  try {
    user = await createUser({ name, email, passwordHash: await hashPassword(password) })
  } catch (error) {
    console.error("[auth] Sign-up failed", error)
    return {
      message: "We couldn't create your account. Please try again.",
      values: { name, email },
    }
  }

  if (!user) {
    return {
      errors: { email: "An account with this email already exists. Try signing in." },
      values: { name, email },
    }
  }

  await createSession(user.userId)
  redirect(safeRedirectPath(formData.get("next")))
}

export async function login(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = parseLoginForm(formData)
  if (!parsed.ok) return parsed.state

  const { email, password } = parsed.data
  let user: User | null
  try {
    user = await checkCredentials(email, password)
  } catch (error) {
    console.error("[auth] Sign-in failed", error)
    return { message: "We couldn't sign you in. Please try again.", values: { email } }
  }

  if (!user) {
    // Same message either way, so the form doesn't reveal which emails exist.
    return { message: "Incorrect email or password.", values: { email } }
  }

  await createSession(user.userId)
  redirect(safeRedirectPath(formData.get("next")))
}

export async function logout(): Promise<void> {
  // Deleting the cookie re-renders the current page signed out.
  await deleteSession()
}

async function checkCredentials(email: string, password: string): Promise<User | null> {
  const account = await findUserForLogin(email)
  // Hash something even for an unknown email, so both cases take as long.
  const matches = await verifyPassword(password, account?.passwordHash ?? (await getDummyHash()))
  if (!account || !matches) return null
  return { userId: account.userId, name: account.name }
}
