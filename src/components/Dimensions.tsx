import { Html, Line } from '@react-three/drei'
import type { Item, Project } from '../lib/types'
import { edges, measure } from '../lib/geometry'
import { formatInches } from '../lib/units'

const COLOR = '#7fd8ff'
const TICK = 1.5
const GAP = 4
/** Width lines sit higher so they clear the name label above the object */
const WIDTH_GAP = 8

type P = [number, number, number]

/** One dimension line with end ticks and a centered label. */
function Dim({ a, b, tick, label }: { a: P; b: P; tick: P; label: string }) {
  const mid: P = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]
  const ta: P[] = [
    [a[0] - tick[0], a[1] - tick[1], a[2] - tick[2]],
    [a[0] + tick[0], a[1] + tick[1], a[2] + tick[2]],
  ]
  const tb: P[] = [
    [b[0] - tick[0], b[1] - tick[1], b[2] - tick[2]],
    [b[0] + tick[0], b[1] + tick[1], b[2] + tick[2]],
  ]
  return (
    <group>
      <Line points={[a, b]} color={COLOR} lineWidth={1.5} />
      <Line points={ta} color={COLOR} lineWidth={1.5} />
      <Line points={tb} color={COLOR} lineWidth={1.5} />
      <Html position={mid} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
        <div className="dim-label">{label}</div>
      </Html>
    </group>
  )
}

/** Persistent dimension annotations for one item, drawn in world space. */
export function Dimensions({ item, project }: { item: Item; project: Project }) {
  const d = item.dims
  if (!d) return null
  const { wall } = project
  const e = edges(item)
  const m = measure(item, project)
  const zf = e.front + 0.5 // just in front of the object
  const cy = (e.bottom + e.top) / 2
  const cx = item.x
  const xTick: P = [0, TICK, 0] // ticks for horizontal lines
  const yTick: P = [TICK, 0, 0] // ticks for vertical lines
  const zTick: P = [TICK, 0, 0] // ticks for depth lines on the floor
  // Put side lines on whichever side has more free space before the next object or the
  // wall edge, and the width line below the object when it is tight against the top.
  const leftSpace = m.leftNeighbor ? m.leftNeighbor.gap : e.left
  const rightSpace = m.rightNeighbor ? m.rightNeighbor.gap : wall.width - e.right
  const sideX = rightSpace >= leftSpace ? e.right + GAP : e.left - GAP
  const widthY = wall.height - e.top >= WIDTH_GAP + TICK ? e.top + WIDTH_GAP : e.bottom - GAP

  return (
    <group>
      {d.width && (
        <Dim a={[e.left, widthY, zf]} b={[e.right, widthY, zf]} tick={xTick} label={formatInches(e.right - e.left)} />
      )}
      {d.height && (
        <Dim a={[sideX, e.bottom, zf]} b={[sideX, e.top, zf]} tick={yTick} label={formatInches(e.top - e.bottom)} />
      )}
      {d.depth && (
        <Dim a={[sideX, e.bottom + 0.2, e.back]} b={[sideX, e.bottom + 0.2, e.front]} tick={zTick} label={formatInches(e.front - e.back)} />
      )}
      {d.left && e.left > 0.01 && (
        <Dim a={[0, cy, zf]} b={[e.left, cy, zf]} tick={xTick} label={formatInches(e.left)} />
      )}
      {d.right && wall.width - e.right > 0.01 && (
        <Dim a={[e.right, cy, zf]} b={[wall.width, cy, zf]} tick={xTick} label={formatInches(wall.width - e.right)} />
      )}
      {d.bottom && e.bottom > 0.01 && (
        <Dim a={[cx, 0, zf]} b={[cx, e.bottom, zf]} tick={yTick} label={formatInches(e.bottom)} />
      )}
      {d.top && wall.height - e.top > 0.01 && (
        <Dim a={[cx, e.top, zf]} b={[cx, wall.height, zf]} tick={yTick} label={formatInches(wall.height - e.top)} />
      )}
    </group>
  )
}
