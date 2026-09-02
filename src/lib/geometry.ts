import type { Guide, Item, Project, SnapSettings, Wall } from './types'
import { isFloorItem } from './types'
import { roundTo } from './units'

/** Axis-aligned half extents of an item's footprint after yaw rotation. */
export function footprint(item: Pick<Item, 'width' | 'depth' | 'rotation'>) {
  const r = (item.rotation * Math.PI) / 180
  const c = Math.abs(Math.cos(r))
  const s = Math.abs(Math.sin(r))
  return {
    halfW: (item.width * c + item.depth * s) / 2,
    halfD: (item.width * s + item.depth * c) / 2,
  }
}

export function edges(item: Item) {
  const { halfW, halfD } = footprint(item)
  return {
    left: item.x - halfW,
    right: item.x + halfW,
    back: item.z - halfD,
    front: item.z + halfD,
    bottom: item.y,
    top: item.y + item.height,
  }
}

export function footprintArea(item: Item) {
  const { halfW, halfD } = footprint(item)
  return halfW * halfD * 4
}

/** Which item (if any) a floor item is resting on. Supports must have a larger footprint. */
export function findSupport(item: Item, items: Item[]): Item | null {
  const myArea = footprintArea(item)
  let best: Item | null = null
  for (const other of items) {
    if (other.id === item.id || !isFloorItem(other)) continue
    const a = footprintArea(other)
    if (a < myArea || (a === myArea && other.id > item.id)) continue
    const e = edges(other)
    if (item.x >= e.left && item.x <= e.right && item.z >= e.back && item.z <= e.front) {
      if (!best || e.top > edges(best).top) best = other
    }
  }
  return best
}

/** Minimum z (center) so the back of an item does not pass through the wall or trim. */
export function minZ(item: Item, wall: Wall) {
  const { halfD } = footprint(item)
  let offset = 0
  if (wall.baseboard.enabled && item.y < wall.baseboard.height) offset = Math.max(offset, wall.baseboard.depth)
  if (wall.crown.enabled && item.y + item.height > wall.height - wall.crown.height)
    offset = Math.max(offset, wall.crown.depth)
  return halfD + offset
}

/**
 * Re-resolve gravity and wall constraints for every item.
 * Floor items drop onto the floor or onto the largest item under their center.
 */
export function settle(items: Item[], wall: Wall): Item[] {
  // Resolve larger footprints first so supports are settled before what rests on them.
  const order = [...items].sort((a, b) => footprintArea(b) - footprintArea(a))
  const settled = new Map<string, Item>()
  for (const raw of order) {
    let item = { ...raw }
    if (isFloorItem(item)) {
      const support = findSupport(item, [...settled.values()])
      item.y = support ? edges(support).top : 0
      item.z = Math.max(item.z, minZ(item, wall))
    } else {
      item.y = Math.min(Math.max(item.y, 0), Math.max(0, wall.height - item.height))
      item.z = item.mountGap + item.depth / 2
    }
    if (item.width <= wall.width) {
      const { halfW } = footprint(item)
      item.x = Math.min(Math.max(item.x, halfW), wall.width - halfW)
    }
    settled.set(item.id, item)
  }
  return items.map((i) => settled.get(i.id)!)
}

export interface SnapResult {
  x: number
  y: number
  z: number
  guides: Guide[]
}

interface Candidate {
  /** Snapped position (center or bottom) */
  value: number
  kind: Guide['kind']
  /** Where to draw the guide line (an edge or a center) */
  guideAt: number
}

function pick(proposed: number, candidates: Candidate[], threshold: number, grid: number | null): { value: number; guide: Candidate | null } {
  let best: Candidate | null = null
  let bestDist = Infinity
  for (const c of candidates) {
    const d = Math.abs(c.value - proposed)
    if (d <= threshold && d < bestDist) {
      best = c
      bestDist = d
    }
  }
  if (best) return { value: best.value, guide: best }
  if (grid) return { value: roundTo(proposed, grid), guide: null }
  return { value: proposed, guide: null }
}

/** Snap a proposed position for `item`. `proposed` holds the unsnapped center x, bottom y, center z. */
export function snapPosition(
  item: Item,
  proposed: { x: number; y: number; z: number },
  project: Project,
  snap: SnapSettings = project.snap,
): SnapResult {
  const { wall } = project
  const others = project.items.filter((o) => o.id !== item.id)
  const { halfW, halfD } = footprint(item)
  const guides: Guide[] = []
  if (!snap.enabled) return { ...proposed, guides }
  const grid = snap.grid > 0 ? snap.grid : null
  const th = snap.threshold

  // X: center along the wall
  const xc: Candidate[] = []
  if (snap.centerline) xc.push({ value: wall.width / 2, kind: 'centerline', guideAt: wall.width / 2 })
  if (snap.objectCenters) for (const o of others) xc.push({ value: o.x, kind: 'center', guideAt: o.x })
  if (snap.edges) {
    const edgeXs = [0, wall.width]
    for (const o of others) {
      const e = edges(o)
      edgeXs.push(e.left, e.right)
    }
    for (const ex of edgeXs) {
      xc.push({ value: ex + halfW, kind: 'edge', guideAt: ex })
      xc.push({ value: ex - halfW, kind: 'edge', guideAt: ex })
    }
  }
  const rx = pick(proposed.x, xc, th, grid)
  if (rx.guide) guides.push({ axis: 'x', value: rx.guide.guideAt, kind: rx.guide.kind })

  // Z: distance from wall (floor items only; TVs are pinned to the wall)
  let z = proposed.z
  if (isFloorItem(item)) {
    const zc: Candidate[] = []
    if (snap.edges) {
      const edgeZs = [wall.baseboard.enabled ? wall.baseboard.depth : 0]
      for (const o of others) {
        if (!isFloorItem(o)) continue
        const e = edges(o)
        edgeZs.push(e.back, e.front)
      }
      for (const ez of edgeZs) {
        zc.push({ value: ez + halfD, kind: 'edge', guideAt: ez })
        zc.push({ value: ez - halfD, kind: 'edge', guideAt: ez })
      }
    }
    if (snap.objectCenters) for (const o of others) if (isFloorItem(o)) zc.push({ value: o.z, kind: 'center', guideAt: o.z })
    const rz = pick(proposed.z, zc, th, grid)
    z = rz.value
    if (rz.guide) guides.push({ axis: 'z', value: rz.guide.guideAt, kind: rz.guide.kind })
  }

  // Y: elevation (TV only)
  let y = proposed.y
  if (!isFloorItem(item)) {
    const yc: Candidate[] = []
    if (snap.centerline) yc.push({ value: wall.height / 2 - item.height / 2, kind: 'centerline', guideAt: wall.height / 2 })
    if (snap.objectCenters) for (const o of others) yc.push({ value: o.y + o.height / 2 - item.height / 2, kind: 'center', guideAt: o.y + o.height / 2 })
    const ry = pick(proposed.y, yc, th, grid)
    y = ry.value
    if (ry.guide) guides.push({ axis: 'y', value: ry.guide.guideAt, kind: ry.guide.kind })
  }

  return { x: rx.value, y, z, guides }
}

export interface Measurements {
  leftGap: number
  rightGap: number
  leftNeighbor: { item: Item; gap: number } | null
  rightNeighbor: { item: Item; gap: number } | null
  top: number
  front: number
  restingOn: Item | null
}

export function measure(item: Item, project: Project): Measurements {
  const e = edges(item)
  const { wall, items } = project
  let leftNeighbor: Measurements['leftNeighbor'] = null
  let rightNeighbor: Measurements['rightNeighbor'] = null
  for (const o of items) {
    if (o.id === item.id) continue
    const oe = edges(o)
    // Only consider things that share some vertical range (so a TV above a console doesn't count).
    const verticalOverlap = oe.top > e.bottom && oe.bottom < e.top
    if (!verticalOverlap) continue
    if (oe.right <= e.left + 1e-6) {
      const gap = e.left - oe.right
      if (!leftNeighbor || gap < leftNeighbor.gap) leftNeighbor = { item: o, gap }
    } else if (oe.left >= e.right - 1e-6) {
      const gap = oe.left - e.right
      if (!rightNeighbor || gap < rightNeighbor.gap) rightNeighbor = { item: o, gap }
    }
  }
  return {
    leftGap: e.left,
    rightGap: wall.width - e.right,
    leftNeighbor,
    rightNeighbor,
    top: e.top,
    front: e.front,
    restingOn: isFloorItem(item) ? findSupport(item, items) : null,
  }
}
