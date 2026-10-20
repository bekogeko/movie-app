import "server-only"

import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto"

/*
 * Password hashing with Node's built-in scrypt (no native modules to build).
 *
 * Stored format: scrypt$<N>$<r>$<p>$<salt base64>$<hash base64>
 * The cost parameters live in the string, so they can be raised later and old
 * hashes still verify. Current values follow OWASP's scrypt guidance
 * (N=2^14, r=8, p=5: about 16 MiB of memory per hash).
 */

const PARAMS = { N: 2 ** 14, r: 8, p: 5 }
const KEY_LENGTH = 64
const SALT_LENGTH = 16

function derive(password: string, salt: Buffer, options: ScryptOptions): Promise<Buffer> {
  const maxmem = 256 * options.N! * options.r! // scrypt needs ~128 * N * r bytes
  return new Promise((resolve, reject) => {
    scrypt(password.normalize("NFKC"), salt, KEY_LENGTH, { ...options, maxmem }, (err, key) =>
      err ? reject(err) : resolve(key),
    )
  })
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH)
  const key = await derive(password, salt, PARAMS)
  const { N, r, p } = PARAMS
  return ["scrypt", N, r, p, salt.toString("base64"), key.toString("base64")].join("$")
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, N, r, p, salt, hash] = stored.split("$")
  if (scheme !== "scrypt" || !salt || !hash) return false

  const expected = Buffer.from(hash, "base64")
  const key = await derive(password, Buffer.from(salt, "base64"), {
    N: Number(N),
    r: Number(r),
    p: Number(p),
  })
  return key.length === expected.length && timingSafeEqual(key, expected)
}

/*
 * Verifying against this when the email is unknown makes a failed login take
 * as long as a wrong password, so response times don't reveal which emails
 * have accounts.
 */
let dummyHash: Promise<string> | undefined
export function getDummyHash(): Promise<string> {
  dummyHash ??= hashPassword(randomBytes(16).toString("hex"))
  return dummyHash
}
