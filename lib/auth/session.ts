import "server-only"

import { jwtVerify, SignJWT } from "jose"
import { cookies } from "next/headers"

/*
 * Stateless sessions: a signed JWT in an httpOnly cookie that holds only the
 * user's `userId` (as `sub`). Who the user is (name, etc.) is always read from
 * Neo4j, so a deleted user stops being signed in on the next request.
 *
 * Setting or deleting the cookie in a Server Action also clears the client
 * router cache, so the header and any session-based UI update right away.
 */

const COOKIE_NAME = "session"
const MAX_AGE_SECONDS = 30 * 24 * 60 * 60 // 30 days

function getKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET
  if (!secret || secret.length < 32) {
    throw new Error(
      "Missing or short SESSION_SECRET (needs 32+ characters). " +
        "Generate one with `openssl rand -base64 32` and add it to .env",
    )
  }
  return new TextEncoder().encode(secret)
}

/** Sign the user in: call from a Server Action. */
export async function createSession(userId: string): Promise<void> {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(getKey())

  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    // Browsers (Safari) refuse Secure cookies on http://localhost.
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  })
}

/** Sign the user out: call from a Server Action. */
export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

/**
 * The signed-in `userId`, or null when there is no valid session. Only checks
 * the cookie; use `getCurrentUser` / `requireUser` to also confirm the user
 * still exists.
 */
export async function getSessionUserId(): Promise<string | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value
  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, getKey(), { algorithms: ["HS256"] })
    return typeof payload.sub === "string" ? payload.sub : null
  } catch {
    // Expired, tampered with, or signed with an old secret: treat as signed out.
    return null
  }
}
