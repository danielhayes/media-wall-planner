import { useState } from 'react'
import { formatInches, parseInches } from '../lib/units'

interface DimInputProps {
  value: number
  onChange: (v: number) => void
  min?: number
  disabled?: boolean
  title?: string
}

/** Text input that accepts inches with fractions (65 1/2, 65.5, 5' 4") and shows a formatted value. */
export function DimInput({ value, onChange, min, disabled, title }: DimInputProps) {
  // While focused the user's raw text is shown; otherwise the formatted store value.
  const [draft, setDraft] = useState<string | null>(null)
  const text = draft ?? formatInches(value, 16, '')

  const commit = () => {
    const parsed = draft === null ? null : parseInches(draft)
    setDraft(null)
    if (parsed === null) return
    const v = min !== undefined ? Math.max(min, parsed) : parsed
    if (v !== value) onChange(v)
  }

  return (
    <span className="dim">
      <input
        type="text"
        value={text}
        disabled={disabled}
        title={title}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={(e) => {
          setDraft(formatInches(value, 16, ''))
          e.target.select()
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
          if (e.key === 'Escape') {
            setDraft(null)
            ;(e.target as HTMLInputElement).blur()
          }
        }}
      />
      <span className="unit">in</span>
    </span>
  )
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="field" title={hint}>
      <span className="field-label">{label}</span>
      {children}
    </label>
  )
}

export function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  )
}
