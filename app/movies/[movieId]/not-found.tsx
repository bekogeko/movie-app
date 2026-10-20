import Link from "next/link"

export default function MovieNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-3 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Movie not found</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        No movie with that ID exists in the graph.
      </p>
      <Link href="/" className="mt-2 w-fit underline underline-offset-4">
        Back to home
      </Link>
    </main>
  )
}
