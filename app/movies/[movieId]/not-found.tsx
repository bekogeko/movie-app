import Link from "next/link"

export default function MovieNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-3 px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Movie not found</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        There&rsquo;s no movie with that id. Try searching for it instead.
      </p>
      <Link href="/" className="w-fit text-sm underline underline-offset-4">
        Back to the home page
      </Link>
    </main>
  )
}
