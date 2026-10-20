"use client"

import { catchError, type ErrorInfo } from "next/error"

function ErrorFallback(props: { title: string }, { error, retry }: ErrorInfo) {
  // Production builds strip server error messages, so only show them in dev.
  const message =
    process.env.NODE_ENV === "development" && error instanceof Error
      ? error.message
      : "Something went wrong. Please try again."

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm dark:border-red-900/60 dark:bg-red-950/30">
      <p className="font-medium text-red-800 dark:text-red-300">{props.title}</p>
      <p className="mt-1 break-words text-red-700/80 dark:text-red-300/70">
        {message}
      </p>
      <button
        onClick={() => retry()}
        className="mt-3 rounded-md border border-red-300 px-3 py-1 text-red-800 transition-colors hover:bg-red-100 dark:border-red-800 dark:text-red-200 dark:hover:bg-red-900/40"
      >
        Try again
      </button>
    </div>
  )
}

export default catchError(ErrorFallback)
