import { useEffect, useMemo, useRef, useState } from 'react'
import type React from 'react'
import { useThree } from '@react-three/fiber'
import { Html, Line } from '@react-three/drei'
import * as THREE from 'three'
import { useProject, useStore } from '../lib/store'
import type { Measurement } from '../lib/types'
import { snapPoints } from '../lib/snapPoints'
import type { SnapPoint } from '../lib/snapPoints'
import { formatInches } from '../lib/units'
import { measureLabel } from '../lib/measure'

const COLOR = '#7fd8ff'
const ACTIVE = '#ffb454'
const TICK = 1.5
const SNAP_PX = 16

type P = [number, number, number]

function dist(a: P, b: P) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
}

/** Tick direction for a segment: perpendicular within the most natural plane. */
function tickFor(a: P, b: P): P {
  const dx = Math.abs(b[0] - a[0])
  const dy = Math.abs(b[1] - a[1])
  const dz = Math.abs(b[2] - a[2])
  if (dy >= dx && dy >= dz) return [TICK, 0, 0]
  return [0, TICK, 0]
}

interface DimLineProps {
  a: P
  b: P
  color: string
  offset?: P
  selected?: boolean
  onClick?: () => void
  /** Called while the label is dragged; the offset is perpendicular to the line in the view plane */
  onOffset?: (offset: P) => void
}

const ZERO: P = [0, 0, 0]

/** Measurement lines always draw on top: no depth test, late render order. */
const ON_TOP = { depthTest: false, depthWrite: false, transparent: true, renderOrder: 1000 } as const

function add(a: P, b: P, k = 1): P {
  return [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k]
}

/**
 * One dimension line: drawn at the measured points, or offset from them with witness
 * lines like an architectural drawing. The label is the drag handle for the offset.
 */
function DimLine({ a, b, color, offset = ZERO, selected, onClick, onOffset }: DimLineProps) {
  const camera = useThree((s) => s.camera)
  const gl = useThree((s) => s.gl)
  const drag = useRef<{ moved: boolean; plane: THREE.Plane; normal: THREE.Vector3; mid: THREE.Vector3 } | null>(null)
  const A = add(a, offset)
  const B = add(b, offset)
  const tick = tickFor(A, B)
  const mid: P = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2, (A[2] + B[2]) / 2]
  const t = (p: P): P[] => [
    [p[0] - tick[0], p[1] - tick[1], p[2] - tick[2]],
    [p[0] + tick[0], p[1] + tick[1], p[2] + tick[2]],
  ]
  const label = measureLabel(a, b)
  const offLen = Math.hypot(...offset)
  const unit: P = offLen > 1e-6 ? [offset[0] / offLen, offset[1] / offLen, offset[2] / offLen] : ZERO
  const overshoot = 1.5

  const onPointerDown = (e: React.PointerEvent) => {
    if (!onOffset || e.button !== 0) return
    e.stopPropagation()
    e.preventDefault()
    // The offset lives in the plane through the line that faces the camera; within that
    // plane it is perpendicular to the line. Snap that direction to a world axis when the
    // line itself is axis-aligned so front-view dimensions stay perfectly level.
    const forward = new THREE.Vector3()
    camera.getWorldDirection(forward)
    const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize()
    let n = new THREE.Vector3().crossVectors(forward, d).normalize()
    if (n.lengthSq() < 1e-6) n = new THREE.Vector3(0, 1, 0)
    const axisAligned = [Math.abs(d.x), Math.abs(d.y), Math.abs(d.z)].some((v) => v > 0.999)
    if (axisAligned) {
      const m = [Math.abs(n.x), Math.abs(n.y), Math.abs(n.z)]
      const i = m.indexOf(Math.max(...m))
      const snapped = new THREE.Vector3()
      snapped.setComponent(i, Math.sign(n.getComponent(i)) || 1)
      n = snapped
    }
    const midV = new THREE.Vector3((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2)
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(forward.clone().negate(), midV)
    drag.current = { moved: false, plane, normal: n, mid: midV }
    const el = gl.domElement
    const raycaster = new THREE.Raycaster()
    const onMove = (ev: PointerEvent) => {
      const st = drag.current
      if (!st) return
      const r = el.getBoundingClientRect()
      const ndc = new THREE.Vector2(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1)
      raycaster.setFromCamera(ndc, camera)
      const hit = new THREE.Vector3()
      if (!raycaster.ray.intersectPlane(st.plane, hit)) return
      const along = hit.sub(st.mid).dot(st.normal)
      const snapped = Math.round(along)
      st.moved = st.moved || Math.abs(along) > 0.5
      onOffset([st.normal.x * snapped, st.normal.y * snapped, st.normal.z * snapped])
    }
    const onUp = () => {
      const moved = drag.current?.moved
      drag.current = null
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      if (!moved) onClick?.()
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  return (
    <group>
      {offLen > 1e-6 && (
        <>
          <Line points={[add(a, unit, 0.5), add(A, unit, overshoot)]} color={color} lineWidth={1} opacity={0.8} {...ON_TOP} />
          <Line points={[add(b, unit, 0.5), add(B, unit, overshoot)]} color={color} lineWidth={1} opacity={0.8} {...ON_TOP} />
        </>
      )}
      <Line points={[A, B]} color={color} lineWidth={selected ? 2.5 : 1.5} {...ON_TOP} />
      <Line points={t(A)} color={color} lineWidth={1.5} {...ON_TOP} />
      <Line points={t(B)} color={color} lineWidth={1.5} {...ON_TOP} />
      <Html position={mid} center zIndexRange={[10, 0]} style={{ pointerEvents: onClick || onOffset ? 'auto' : 'none' }}>
        <div
          className={`dim-label${selected ? ' selected' : ''}${onClick || onOffset ? ' clickable' : ''}`}
          title={onOffset ? 'Drag to offset the dimension line; click to select' : undefined}
          onPointerDown={onPointerDown}
          onClick={(e) => {
            e.stopPropagation()
            if (!onOffset) onClick?.()
          }}
        >
          <div>{label.main}</div>
          {label.breakdown && <div className="dim-breakdown">{label.breakdown}</div>}
        </div>
      </Html>
    </group>
  )
}

/** Saved tape measurements, drawn whenever Dims is on. */
export function Measurements() {
  const project = useProject()
  const showDims = useStore((s) => s.showDims)
  const selectedId = useStore((s) => s.selectedMeasurementId)
  const select = useStore((s) => s.selectMeasurement)
  const updateMeasurement = useStore((s) => s.updateMeasurement)
  if (!project || !showDims) return null
  return (
    <group>
      {(project.measurements ?? []).map((m: Measurement) => (
        <DimLine
          key={m.id}
          a={m.a}
          b={m.b}
          offset={m.offset}
          color={m.id === selectedId ? ACTIVE : COLOR}
          selected={m.id === selectedId}
          onClick={() => select(m.id)}
          onOffset={(offset) => updateMeasurement(m.id, { offset })}
        />
      ))}
    </group>
  )
}

/**
 * The tape measure: while active, a crosshair snaps to the nearest object or wall point
 * under the cursor. Press on one point and release on another (or click twice) to save
 * a measurement. Shift constrains the line to the dominant axis. Escape cancels.
 */
export function MeasureTool() {
  const project = useProject()
  const measureMode = useStore((s) => s.measureMode)
  const addMeasurement = useStore((s) => s.addMeasurement)
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const [hover, setHover] = useState<SnapPoint | null>(null)
  const [anchor, setAnchor] = useState<P | null>(null)
  const [shift, setShift] = useState(false)
  const pressed = useRef<{ p: P; x: number; y: number } | null>(null)
  const hoverRef = useRef<SnapPoint | null>(null)
  const anchorRef = useRef<P | null>(null)
  const shiftRef = useRef(false)

  const points = useMemo(() => (project && measureMode ? snapPoints(project) : []), [project, measureMode])

  // Where the line would end given the anchor, the hovered point, and the Shift constraint.
  const endFor = (a: P | null, h: SnapPoint | null, constrain: boolean): P | null => {
    if (!h) return null
    if (!a || !constrain) return h.p
    const d = [h.p[0] - a[0], h.p[1] - a[1], h.p[2] - a[2]]
    const axis = d.map(Math.abs).indexOf(Math.max(...d.map(Math.abs)))
    const out: P = [a[0], a[1], a[2]]
    out[axis] = h.p[axis]
    return out
  }

  useEffect(() => {
    if (!measureMode) return
    const el = gl.domElement
    const v = new THREE.Vector3()
    const nearest = (cx: number, cy: number): SnapPoint | null => {
      let best: SnapPoint | null = null
      let bestD = SNAP_PX
      for (const sp of points) {
        v.set(sp.p[0], sp.p[1], sp.p[2]).project(camera)
        if (v.z > 1) continue
        const sx = ((v.x + 1) / 2) * size.width
        const sy = ((1 - v.y) / 2) * size.height
        const d = Math.hypot(sx - cx, sy - cy)
        if (d < bestD) {
          bestD = d
          best = sp
        }
      }
      return best
    }
    const local = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      return { x: e.clientX - r.left, y: e.clientY - r.top }
    }
    const onMove = (e: PointerEvent) => {
      const { x, y } = local(e)
      const h = nearest(x, y)
      if (h) {
        hoverRef.current = h
        setHover(h)
      }
      shiftRef.current = e.shiftKey
      setShift(e.shiftKey)
    }
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return
      const { x, y } = local(e)
      const h = nearest(x, y)
      if (!h) return
      if (!anchorRef.current) {
        anchorRef.current = h.p
        setAnchor(h.p)
        pressed.current = { p: h.p, x, y }
      } else {
        const end = endFor(anchorRef.current, h, e.shiftKey)
        if (end && dist(end, anchorRef.current) > 1 / 32) {
          addMeasurement(anchorRef.current, end)
          anchorRef.current = null
          setAnchor(null)
        }
        pressed.current = null
      }
    }
    const onUp = (e: PointerEvent) => {
      if (e.button !== 0 || !pressed.current || !anchorRef.current) return
      const { x, y } = local(e)
      const moved = Math.hypot(x - pressed.current.x, y - pressed.current.y) > 6
      pressed.current = null
      if (!moved) return // a click: wait for the second click
      const h = nearest(x, y)
      const end = endFor(anchorRef.current, h, e.shiftKey)
      if (end && dist(end, anchorRef.current) > 1 / 32) {
        addMeasurement(anchorRef.current, end)
        anchorRef.current = null
        setAnchor(null)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        anchorRef.current = null
        setAnchor(null)
        pressed.current = null
      }
      if (e.key === 'Shift') {
        shiftRef.current = e.type === 'keydown'
        setShift(e.type === 'keydown')
      }
    }
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointerup', onUp)
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKey)
    return () => {
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointerup', onUp)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKey)
    }
  }, [measureMode, gl, camera, size, points, addMeasurement])

  if (!measureMode || !project) return null
  const end = endFor(anchor, hover, shift)
  const extent = Math.max(project.wall.width, project.wall.height) * 0.02 + 1
  return (
    <group>
      {hover && (
        <group position={hover.p}>
          <Line points={[[-extent, 0, 0], [extent, 0, 0]]} color={ACTIVE} lineWidth={1.5} {...ON_TOP} />
          <Line points={[[0, -extent, 0], [0, extent, 0]]} color={ACTIVE} lineWidth={1.5} {...ON_TOP} />
          <Line points={[[0, 0, -extent], [0, 0, extent]]} color={ACTIVE} lineWidth={1.5} {...ON_TOP} />
          <mesh renderOrder={1000}>
            <sphereGeometry args={[0.6, 12, 12]} />
            <meshBasicMaterial color={ACTIVE} depthTest={false} transparent />
          </mesh>
          <Html position={[0, extent + 1, 0]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
            <div className="snap-tip">
              {hover.label}
              <span className="muted"> · {formatInches(hover.p[0])}, {formatInches(hover.p[1])}, {formatInches(hover.p[2])}</span>
            </div>
          </Html>
        </group>
      )}
      {anchor && (
        <mesh position={anchor} renderOrder={1000}>
          <sphereGeometry args={[0.7, 12, 12]} />
          <meshBasicMaterial color={ACTIVE} depthTest={false} transparent />
        </mesh>
      )}
      {anchor && end && dist(anchor, end) > 1 / 32 && <DimLine a={anchor} b={end} color={ACTIVE} />}
    </group>
  )
}
