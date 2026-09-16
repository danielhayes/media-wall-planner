import { formatInches } from './units'

type P = [number, number, number]

export function distance(a: P, b: P) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
}

/** Distance label with an axis breakdown when the line is not axis-aligned. */
export function measureLabel(a: P, b: P) {
  const d = distance(a, b)
  const parts = [Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), Math.abs(b[2] - a[2])]
  const nonZero = parts.filter((v) => v > 1 / 32).length
  const breakdown =
    nonZero > 1
      ? [parts[0] > 1 / 32 ? `W ${formatInches(parts[0])}` : null, parts[1] > 1 / 32 ? `H ${formatInches(parts[1])}` : null, parts[2] > 1 / 32 ? `D ${formatInches(parts[2])}` : null]
          .filter(Boolean)
          .join(' · ')
      : null
  return { main: formatInches(d), breakdown }
}

