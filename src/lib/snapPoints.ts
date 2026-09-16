import type { Item, Project } from './types'

export type SnapKind = 'corner' | 'midpoint' | 'center' | 'wall'

export interface SnapPoint {
  p: [number, number, number]
  kind: SnapKind
  label: string
}

/** The 8 corners of an item's box in world space, honoring its yaw. */
function corners(item: Item): [number, number, number][] {
  const r = (item.rotation * Math.PI) / 180
  const c = Math.cos(r)
  const s = Math.sin(r)
  const out: [number, number, number][] = []
  for (const sx of [-1, 1])
    for (const sy of [0, 1])
      for (const sz of [-1, 1]) {
        const lx = (sx * item.width) / 2
        const lz = (sz * item.depth) / 2
        // Yaw about the vertical axis through the item's center
        const wx = item.x + lx * c + lz * s
        const wz = item.z - lx * s + lz * c
        out.push([q(wx), q(item.y + sy * item.height), q(wz)])
      }
  return out
}

/** Round to 1/64" so labels stay clean after rotation math */
function q(v: number) {
  return Math.round(v * 64) / 64
}

function mid(a: [number, number, number], b: [number, number, number]): [number, number, number] {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]
}

/**
 * Every point the tape measure can snap to: object corners, edge midpoints, and face
 * centers, plus the wall corners, the wall centerline ends, and the floor's front edge.
 */
export function snapPoints(project: Project): SnapPoint[] {
  const pts: SnapPoint[] = []
  const { wall, floorDepth } = project
  const W = wall.width
  const H = wall.height
  pts.push(
    { p: [0, 0, 0], kind: 'wall', label: 'Wall bottom left' },
    { p: [W, 0, 0], kind: 'wall', label: 'Wall bottom right' },
    { p: [0, H, 0], kind: 'wall', label: 'Wall top left' },
    { p: [W, H, 0], kind: 'wall', label: 'Wall top right' },
    { p: [W / 2, 0, 0], kind: 'wall', label: 'Wall centerline, floor' },
    { p: [W / 2, H, 0], kind: 'wall', label: 'Wall centerline, top' },
    { p: [W / 2, H / 2, 0], kind: 'wall', label: 'Wall center' },
    { p: [0, H / 2, 0], kind: 'wall', label: 'Wall left, mid height' },
    { p: [W, H / 2, 0], kind: 'wall', label: 'Wall right, mid height' },
    { p: [0, 0, floorDepth], kind: 'wall', label: 'Floor front left' },
    { p: [W, 0, floorDepth], kind: 'wall', label: 'Floor front right' },
    { p: [W / 2, 0, floorDepth], kind: 'wall', label: 'Floor front center' },
  )
  if (wall.baseboard.enabled) {
    const bh = wall.baseboard.height
    pts.push(
      { p: [0, bh, wall.baseboard.depth], kind: 'wall', label: 'Baseboard top left' },
      { p: [W, bh, wall.baseboard.depth], kind: 'wall', label: 'Baseboard top right' },
    )
  }

  for (const item of project.items) {
    if (item.hidden) continue
    const c = corners(item)
    // corners() order: index = sx*4 + sy*2 + sz with sx in {0,1}, sy in {0,1}, sz in {0,1}
    const at = (sx: number, sy: number, sz: number) => c[sx * 4 + sy * 2 + sz]
    for (let i = 0; i < 8; i++) pts.push({ p: c[i], kind: 'corner', label: `${item.name} corner` })
    // Edge midpoints: vary one axis at a time
    for (const sy of [0, 1])
      for (const sz of [0, 1]) pts.push({ p: mid(at(0, sy, sz), at(1, sy, sz)), kind: 'midpoint', label: `${item.name} edge midpoint` })
    for (const sx of [0, 1])
      for (const sz of [0, 1]) pts.push({ p: mid(at(sx, 0, sz), at(sx, 1, sz)), kind: 'midpoint', label: `${item.name} edge midpoint` })
    for (const sx of [0, 1])
      for (const sy of [0, 1]) pts.push({ p: mid(at(sx, sy, 0), at(sx, sy, 1)), kind: 'midpoint', label: `${item.name} edge midpoint` })
    // Face centers
    for (const sx of [0, 1]) pts.push({ p: mid(mid(at(sx, 0, 0), at(sx, 1, 1)), mid(at(sx, 0, 1), at(sx, 1, 0))), kind: 'center', label: `${item.name} side center` })
    for (const sy of [0, 1]) pts.push({ p: mid(mid(at(0, sy, 0), at(1, sy, 1)), mid(at(0, sy, 1), at(1, sy, 0))), kind: 'center', label: `${item.name} ${sy ? 'top' : 'bottom'} center` })
    for (const sz of [0, 1]) pts.push({ p: mid(mid(at(0, 0, sz), at(1, 1, sz)), mid(at(0, 1, sz), at(1, 0, sz))), kind: 'center', label: `${item.name} ${sz ? 'front' : 'back'} center` })
  }
  return pts
}
