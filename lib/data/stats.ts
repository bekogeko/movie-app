import { read } from "@/lib/neo4j"

/*
 * Data layer: one plain async function per query, returning plain data.
 * Server Components call these directly; later, Server Actions and the
 * Route Handlers / queryFns behind React Query can call the same functions.
 */

export async function getNodeCount(): Promise<number> {
  const [row] = await read<{ count: number }>(
    "MATCH (n) RETURN count(n) AS count",
  )
  return row?.count ?? 0
}
