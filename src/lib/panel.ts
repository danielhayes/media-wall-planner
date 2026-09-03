import * as THREE from 'three'
import type { PanelDesign } from './types'

type Pt = [number, number]

/** Sutherland–Hodgman clip of a convex polygon to an axis-aligned rectangle centered at the origin. */
function clipToRect(poly: Pt[], halfW: number, halfH: number): Pt[] {
  const planes: [number, number, number][] = [
    [1, 0, halfW], // x <= halfW
    [-1, 0, halfW], // -x <= halfW
    [0, 1, halfH],
    [0, -1, halfH],
  ]
  let out = poly
  for (const [nx, ny, d] of planes) {
    const input = out
    out = []
    if (input.length === 0) break
    let prev = input[input.length - 1]
    let prevIn = nx * prev[0] + ny * prev[1] <= d
    for (const cur of input) {
      const curIn = nx * cur[0] + ny * cur[1] <= d
      if (curIn !== prevIn) {
        const a = nx * prev[0] + ny * prev[1] - d
        const b = nx * cur[0] + ny * cur[1] - d
        const t = a / (a - b)
        out.push([prev[0] + (cur[0] - prev[0]) * t, prev[1] + (cur[1] - prev[1]) * t])
      }
      if (curIn) out.push(cur)
      prev = cur
      prevIn = curIn
    }
  }
  return out
}

/**
 * Slat outlines for a panel interior of `iw` × `ih` inches, centered at the origin.
 * Slats are laid out symmetrically about the center. Axis-aligned patterns only use
 * whole slats; diagonal slats are clipped to the interior so neighbouring panels can chevron.
 */
export function slatPolygons(iw: number, ih: number, design: PanelDesign): Pt[][] {
  const { pattern, slatDirection } = design
  if (pattern === 'solid' || iw <= 0 || ih <= 0) return []
  const sw = Math.max(0.125, design.slatWidth)
  const pitch = sw + Math.max(0, design.slatGap)
  const angle =
    pattern === 'vertical' ? Math.PI / 2 : pattern === 'horizontal' ? 0 : slatDirection === 'up-right' ? Math.PI / 4 : (3 * Math.PI) / 4
  const u: Pt = [Math.cos(angle), Math.sin(angle)] // along the slat
  const n: Pt = [-u[1], u[0]] // across the slats
  const halfW = iw / 2
  const halfH = ih / 2
  const reach = halfW * Math.abs(n[0]) + halfH * Math.abs(n[1]) // extent of the interior across the slats
  const length = halfW * Math.abs(u[0]) + halfH * Math.abs(u[1]) + 1 // extent along the slats
  const diagonal = pattern === 'diagonal'
  const count = Math.ceil((reach + sw / 2) / pitch)
  const polys: Pt[][] = []
  for (let k = -count; k <= count; k++) {
    const c = k * pitch
    if (Math.abs(c) - sw / 2 >= reach) continue
    if (!diagonal && Math.abs(c) + sw / 2 > reach + 1e-6) continue
    const corners: Pt[] = [
      [c * n[0] - (sw / 2) * n[0] - length * u[0], c * n[1] - (sw / 2) * n[1] - length * u[1]],
      [c * n[0] + (sw / 2) * n[0] - length * u[0], c * n[1] + (sw / 2) * n[1] - length * u[1]],
      [c * n[0] + (sw / 2) * n[0] + length * u[0], c * n[1] + (sw / 2) * n[1] + length * u[1]],
      [c * n[0] - (sw / 2) * n[0] + length * u[0], c * n[1] - (sw / 2) * n[1] + length * u[1]],
    ]
    const clipped = clipToRect(corners, halfW, halfH)
    if (clipped.length >= 3) polys.push(clipped)
  }
  return polys
}

/** Build one extruded geometry containing every slat, extruded along +z by `relief`. */
export function buildSlatGeometry(iw: number, ih: number, design: PanelDesign, relief: number): THREE.BufferGeometry | null {
  const polys = slatPolygons(iw, ih, design)
  if (polys.length === 0) return null
  const shapes = polys.map((poly) => {
    const shape = new THREE.Shape()
    poly.forEach(([x, y], i) => (i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y)))
    shape.closePath()
    return shape
  })
  return new THREE.ExtrudeGeometry(shapes, { depth: relief, bevelEnabled: false })
}
