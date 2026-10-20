"use client"

import Image from "next/image"
import { useState } from "react"

const frame =
  "relative aspect-[2/3] overflow-hidden rounded-xl border border-black/[.08] bg-black/[.04] dark:border-white/[.145] dark:bg-white/[.06]"

/**
 * A 2:3 movie poster. Shows a placeholder when there is no poster or the image
 * fails to load (some TMDB URLs in the dataset no longer exist).
 *
 * `sizes` must describe the rendered width so the browser picks the right
 * image from the srcset.
 */
export function MoviePoster({
  src,
  alt,
  sizes,
  className = "",
  loading = "eager",
}: {
  src: string | null
  alt: string
  sizes: string
  className?: string
  /** "lazy" for posters in long lists below the fold. */
  loading?: "eager" | "lazy"
}) {
  // Remember which URL failed rather than a boolean, so a new src gets a fresh try.
  const [failedSrc, setFailedSrc] = useState<string | null>(null)

  return (
    <div className={`${frame} ${className}`}>
      {src && failedSrc !== src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          // Eager by default: above the fold on the movie page.
          loading={loading}
          className="object-cover"
          onError={() => setFailedSrc(src)}
        />
      ) : (
        <div className="flex h-full items-center justify-center text-zinc-400 dark:text-zinc-600">
          <FilmIcon />
          <span className="sr-only">No poster available</span>
        </div>
      )}
    </div>
  )
}

/** Same frame as MoviePoster, for loading states. */
export function MoviePosterSkeleton({ className = "" }: { className?: string }) {
  return <div className={`${frame} animate-pulse ${className}`} />
}

function FilmIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className="size-8">
      <rect x="3.75" y="3.75" width="16.5" height="16.5" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M7.75 3.75v16.5M16.25 3.75v16.5M3.75 8h4M3.75 12h4M3.75 16h4M16.25 8h4M16.25 12h4M16.25 16h4"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  )
}
