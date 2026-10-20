"use client"

import Image from "next/image"
import { useState } from "react"

const shapes = {
  /** Small round headshot for cast lists. */
  avatar: "aspect-square rounded-full",
  /** 2:3 portrait for the person page header. */
  portrait: "aspect-[2/3] rounded-xl",
}

const frame =
  "relative overflow-hidden border border-black/[.08] bg-black/[.04] dark:border-white/[.145] dark:bg-white/[.06]"

/**
 * A person's TMDB photo. Falls back to their initials when there is no photo
 * or it fails to load (some TMDB URLs in the dataset no longer exist).
 */
export function PersonPhoto({
  src,
  name,
  sizes,
  shape = "avatar",
  className = "",
  loading = "lazy",
}: {
  src: string | null
  name: string
  sizes: string
  shape?: keyof typeof shapes
  className?: string
  loading?: "eager" | "lazy"
}) {
  // Remember which URL failed rather than a boolean, so a new src gets a fresh try.
  const [failedSrc, setFailedSrc] = useState<string | null>(null)

  return (
    <div className={`${frame} ${shapes[shape]} ${className}`}>
      {src && failedSrc !== src ? (
        <Image
          src={src}
          alt={name}
          fill
          sizes={sizes}
          loading={loading}
          className="object-cover"
          onError={() => setFailedSrc(src)}
        />
      ) : (
        <div
          aria-hidden
          className={`flex h-full items-center justify-center font-medium text-zinc-500 ${
            shape === "portrait" ? "text-3xl" : "text-sm"
          }`}
        >
          {initials(name)}
        </div>
      )}
    </div>
  )
}

/** Same frame as PersonPhoto, for loading states. */
export function PersonPhotoSkeleton({
  shape = "avatar",
  className = "",
}: {
  shape?: keyof typeof shapes
  className?: string
}) {
  return <div className={`${frame} ${shapes[shape]} animate-pulse ${className}`} />
}

function initials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean)
  const first = words[0]?.[0] ?? ""
  const last = words.length > 1 ? words[words.length - 1][0] : ""
  return (first + last).toUpperCase()
}
