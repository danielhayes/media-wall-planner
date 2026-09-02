/** Parse a string like `65`, `65.5`, `65 1/2`, `65-1/2`, `5' 4 1/2"` into inches. */
export function parseInches(input: string): number | null {
  let rest = input.trim().replace(/["″]/g, '').replace(/\s*in(ches)?$/i, '')
  if (!rest) return null
  let sign = 1
  if (rest.startsWith('-')) {
    sign = -1
    rest = rest.slice(1).trim()
  }
  let total = 0
  const ft = rest.match(/^(\d+(?:\.\d+)?)\s*(?:'|′|ft)\s*/)
  if (ft) {
    total += parseFloat(ft[1]) * 12
    rest = rest.slice(ft[0].length).trim()
    if (!rest) return sign * total
  }
  const mixed = rest.match(/^(?:(\d+)(?:\s+|-))?(\d+)\s*\/\s*(\d+)$/)
  if (mixed) {
    const whole = mixed[1] ? parseInt(mixed[1], 10) : 0
    const den = parseInt(mixed[3], 10)
    if (den === 0) return null
    return sign * (total + whole + parseInt(mixed[2], 10) / den)
  }
  const dec = rest.match(/^\d*\.?\d+$/)
  if (dec) return sign * (total + parseFloat(rest))
  return null
}

/** Format inches as a mixed fraction to the nearest 1/16, e.g. `65 1/2"`. */
export function formatInches(value: number, denom = 16, unit = '"'): string {
  if (!Number.isFinite(value)) return ''
  const sign = value < 0 ? '-' : ''
  const abs = Math.abs(value)
  let whole = Math.floor(abs)
  let num = Math.round((abs - whole) * denom)
  let den = denom
  if (num === denom) {
    whole += 1
    num = 0
  }
  while (num > 0 && num % 2 === 0 && den % 2 === 0) {
    num /= 2
    den /= 2
  }
  if (num === 0) return `${sign}${whole}${unit}`
  if (whole === 0) return `${sign}${num}/${den}${unit}`
  return `${sign}${whole} ${num}/${den}${unit}`
}

export function roundTo(value: number, step: number) {
  if (step <= 0) return value
  return Math.round(value / step) * step
}
