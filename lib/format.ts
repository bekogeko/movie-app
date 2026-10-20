/**
 * MovieLens-style titles move the article to the end, sometimes before the
 * original-language title:
 *   "Matrix, The"                     -> "The Matrix"
 *   "White Balloon, The (Badkonake sefid)" -> "The White Balloon (Badkonake sefid)"
 */
export function displayTitle(title: string): string {
  const match = title.match(/^(.+?), (The|A|An|La|Le|Les|Il|El|Die|Der|Das)( \(.+\))?$/)
  return match ? `${match[2]} ${match[1]}${match[3] ?? ""}` : title
}

/** "1995-11-22" -> "November 22, 1995". Shows the raw value if it isn't a date. */
export function formatDate(value: string | null): string | null {
  if (!value) return null
  const date = new Date(`${value.slice(0, 10)}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  })
}

const integer = new Intl.NumberFormat("en-US")

/** 100004 -> "100,004" */
export function formatCount(value: number): string {
  return integer.format(value)
}

/** "1 rating", "311 ratings" */
export function plural(count: number, one: string, many = `${one}s`): string {
  return `${formatCount(count)} ${count === 1 ? one : many}`
}

/** A 0.5–5 star score with two decimals: 4.4612 -> "4.46" */
export function formatScore(value: number): string {
  return value.toFixed(2)
}

/** 0.384 -> "38%" */
export function formatShare(value: number): string {
  return `${Math.round(value * 100)}%`
}

/** 0.5 -> "½", 3.5 -> "3½", 4 -> "4" */
export function formatStars(rating: number): string {
  const whole = Math.floor(rating)
  const half = rating - whole >= 0.5
  if (!half) return String(whole)
  return whole === 0 ? "½" : `${whole}½`
}
