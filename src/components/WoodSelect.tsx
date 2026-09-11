import { WOODS, WOOD_GROUPS } from '../lib/types'
import type { Wood } from '../lib/types'

/** Dropdown over the shared wood registry, grouped by species. */
export function WoodSelect({ value, onChange }: { value: Wood; onChange: (wood: Wood) => void }) {
  return (
    <select value={value} onChange={(ev) => onChange(ev.target.value as Wood)}>
      {WOOD_GROUPS.map((group) => (
        <optgroup key={group} label={group}>
          {WOODS.filter((w) => w.group === group).map((w) => (
            <option key={w.wood} value={w.wood}>{w.label}</option>
          ))}
        </optgroup>
      ))}
    </select>
  )
}
