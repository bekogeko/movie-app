import { randomUUID } from "node:crypto"

import { read, write } from "@/lib/neo4j"

/*
 * Users live in the graph as (:User {userId, name}), the same shape as the
 * users in the recommendations dataset, so ratings from new accounts and
 * existing ones can be queried together:
 *
 *   (:User {userId, name})-[:RATED {rating, timestamp}]->(:Movie)
 *
 * Accounts created here also store `email`, `passwordHash` and `createdAt`.
 * Dataset users have no email, so they can't sign in.
 *
 * Never return a whole User node from a query (`RETURN u`): that would carry
 * the password hash along. Use map projections like `u { .userId, .name }`.
 */

export type User = {
  userId: string
  name: string
}

type UserWithPasswordHash = User & { passwordHash: string }

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

/*
 * Unique emails (also guards against two sign-ups racing with the same email)
 * and an index on userId for the per-request session lookup. Created on the
 * first sign-up in each server process; IF NOT EXISTS makes repeats a no-op.
 */
const SCHEMA = [
  "CREATE CONSTRAINT user_email_unique IF NOT EXISTS FOR (u:User) REQUIRE u.email IS UNIQUE",
  "CREATE INDEX user_userId IF NOT EXISTS FOR (u:User) ON (u.userId)",
]

let schemaReady: Promise<void> | undefined

function ensureUserSchema(): Promise<void> {
  schemaReady ??= (async () => {
    for (const statement of SCHEMA) {
      try {
        await write(statement)
      } catch (error) {
        // Sign-up still works without these (e.g. the dataset already has an
        // equivalent index), so log and carry on rather than block it.
        console.warn(`[users] Could not apply schema: ${statement}\n`, error)
        // Not a schema conflict (e.g. Neo4j unreachable): try again next sign-up.
        if (!errorCode(error).startsWith("Neo.ClientError.")) schemaReady = undefined
      }
    }
  })()
  return schemaReady
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/*
 * Creates the user only if no account has the email. Returns no row when the
 * email is taken. The unique constraint covers the rare race where two
 * requests both see it free; that surfaces as a constraint error below.
 */
const CREATE_USER = `
OPTIONAL MATCH (taken:User {email: $email})
WITH taken WHERE taken IS NULL
CREATE (u:User {
  userId: $userId,
  name: $name,
  email: $email,
  passwordHash: $passwordHash,
  createdAt: datetime()
})
RETURN u { .userId, .name } AS user
`

/** Returns the new user, or null if the email already has an account. */
export async function createUser(input: {
  name: string
  email: string
  passwordHash: string
}): Promise<User | null> {
  await ensureUserSchema()

  try {
    const [row] = await write<{ user: User }>(CREATE_USER, {
      ...input,
      // Dataset users have numeric ids ("1".."671"); UUIDs can never collide.
      userId: randomUUID(),
    })
    return row?.user ?? null
  } catch (error) {
    if (isConstraintError(error)) return null
    throw error
  }
}

export async function findUserById(userId: string): Promise<User | null> {
  const [row] = await read<{ user: User }>(
    "MATCH (u:User {userId: $userId}) RETURN u { .userId, .name } AS user LIMIT 1",
    { userId },
  )
  return row?.user ?? null
}

export type Account = User & {
  email: string
  /** ISO date-time the account was created. */
  createdAt: string | null
}

/** The signed-in user's own account details, for their profile page. */
export async function findAccount(userId: string): Promise<Account | null> {
  const [row] = await read<{ account: Account }>(
    `MATCH (u:User {userId: $userId})
     WHERE u.email IS NOT NULL
     RETURN u { .userId, .name, .email, .createdAt } AS account
     LIMIT 1`,
    { userId },
  )
  return row?.account ?? null
}

/** For checking a login. The hash must never leave the server. */
export async function findUserForLogin(email: string): Promise<UserWithPasswordHash | null> {
  const [row] = await read<{ user: UserWithPasswordHash }>(
    `MATCH (u:User {email: $email})
     WHERE u.passwordHash IS NOT NULL
     RETURN u { .userId, .name, .passwordHash } AS user
     LIMIT 1`,
    { email },
  )
  return row?.user ?? null
}

function isConstraintError(error: unknown): boolean {
  return errorCode(error) === "Neo.ClientError.Schema.ConstraintValidationFailed"
}

function errorCode(error: unknown): string {
  return typeof error === "object" && error !== null && "code" in error
    ? String(error.code)
    : ""
}
