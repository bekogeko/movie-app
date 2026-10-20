import "server-only"

import { io } from "next/cache"
import neo4j, {
  type Driver,
  isDate,
  isDateTime,
  isDuration,
  isInt,
  isLocalDateTime,
  isLocalTime,
  isNode,
  isPath,
  isPoint,
  isRelationship,
  isTime,
  isUnboundRelationship,
  isUUID,
  isVector,
} from "neo4j-driver"

/*
 * Low-level Neo4j access. Only the data layer (lib/data/*) should import this.
 *
 *   read()  / write()  -> run one Cypher statement, get back plain JS rows
 *   getDriver()        -> escape hatch for multi-statement transactions
 *
 * Rows are converted to plain, JSON-safe objects (no Integer / Node / DateTime
 * class instances), so whatever the data layer returns can be passed to Client
 * Components, returned from Server Actions, cached with "use cache", or sent
 * from a Route Handler to React Query without extra mapping.
 */

// ---------------------------------------------------------------------------
// Connection
// ---------------------------------------------------------------------------

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing environment variable ${name}. Add it to .env`)
  }
  return value
}

// Keep one driver per process. Stored on globalThis so dev hot reloads reuse
// it instead of opening a new connection pool on every edit.
const globalForNeo4j = globalThis as unknown as {
  neo4j?: { driver: Driver; config: string }
}

export function getDriver(): Driver {
  // Read on each call so a missing env var fails the query, not the import.
  const uri = requireEnv("NEO4J_URI")
  const username = requireEnv("NEO4J_USERNAME")
  const password = requireEnv("NEO4J_PASSWORD")

  // Reuse the driver unless the connection settings changed (e.g. .env edited
  // while `next dev` is running), in which case replace it.
  const config = [uri, username, password].join("\n")
  const cached = globalForNeo4j.neo4j
  if (cached?.config === config) return cached.driver

  void cached?.driver.close()
  const driver = neo4j.driver(uri, neo4j.auth.basic(username, password))
  globalForNeo4j.neo4j = { driver, config }
  return driver
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export type Params = Record<string, unknown>

/**
 * Run a read-only Cypher statement and return its rows as plain objects.
 *
 * Note: JS numbers are sent to Neo4j as floats. Where Cypher needs an integer
 * (LIMIT, SKIP, range()), pass `neo4j.int(n)` or use `toInteger($n)`.
 */
export async function read<T = Record<string, unknown>>(
  cypher: string,
  params: Params = {},
): Promise<T[]> {
  // Cache Components: keep uncached reads out of the prerendered shell so the
  // build never queries the database. A no-op at request time, inside
  // "use cache", and in Server Actions / Route Handlers.
  await io()
  return run<T>(cypher, params, neo4j.routing.READ)
}

/** Run a Cypher statement that changes data and return its rows (if any). */
export async function write<T = Record<string, unknown>>(
  cypher: string,
  params: Params = {},
): Promise<T[]> {
  return run<T>(cypher, params, neo4j.routing.WRITE)
}

async function run<T>(
  cypher: string,
  params: Params,
  routing: "READ" | "WRITE",
): Promise<T[]> {
  // executeQuery manages sessions, retries transient errors and keeps
  // read-your-own-writes consistency between calls.
  const { records } = await getDriver().executeQuery(cypher, params, {
    // Optional: without it the driver uses the user's home database.
    database: process.env.NEO4J_DATABASE || undefined,
    routing,
  })
  return records.map((record) => toPlain(record.toObject()) as T)
}

// ---------------------------------------------------------------------------
// Serialization
// ---------------------------------------------------------------------------

/**
 * Recursively turn Neo4j driver types into plain JSON-safe values:
 * - Integer               -> number
 * - Node / Relationship   -> its properties
 * - Path                  -> { nodes, relationships }
 * - Date / Time / Duration -> ISO string
 * - Point                 -> { srid, x, y, z? }
 *
 * Nodes lose their labels and ids here. To control the shape, return a map
 * projection instead, e.g. `RETURN m { .title, .year } AS movie`. That also
 * keeps large properties (like embeddings) out of the response.
 */
export function toPlain(value: unknown): unknown {
  if (value === null || value === undefined) return value
  if (typeof value !== "object") return value

  if (isInt(value)) return value.toNumber()
  if (Array.isArray(value)) return value.map(toPlain)

  if (isNode(value) || isRelationship(value) || isUnboundRelationship(value)) {
    return toPlain(value.properties)
  }
  if (isPath(value)) {
    return {
      nodes: [value.start, ...value.segments.map((s) => s.end)].map(toPlain),
      relationships: value.segments.map((s) => toPlain(s.relationship)),
    }
  }
  if (
    isDate(value) ||
    isDateTime(value) ||
    isLocalDateTime(value) ||
    isLocalTime(value) ||
    isTime(value) ||
    isDuration(value) ||
    isUUID(value)
  ) {
    return value.toString()
  }
  if (isPoint(value)) {
    const { srid, x, y, z } = value
    return z === undefined
      ? { srid: toPlain(srid), x, y }
      : { srid: toPlain(srid), x, y, z }
  }
  if (isVector(value)) return Array.from(value.asTypedArray(), Number)

  return Object.fromEntries(
    Object.entries(value).map(([key, v]) => [key, toPlain(v)]),
  )
}
