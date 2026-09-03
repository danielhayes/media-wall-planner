import { useMemo, useRef } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { Edges, Html } from '@react-three/drei'
import * as THREE from 'three'
import { useProject, useStore } from '../lib/store'
import type { Item } from '../lib/types'
import { isFloorItem } from '../lib/types'
import { measure, restingOn, snapPosition } from '../lib/geometry'
import type { Measurements } from '../lib/geometry'
import { formatInches } from '../lib/units'
import { PanelMesh } from './PanelMesh'
import { BaseMesh } from './BaseMesh'
import { ConsoleMesh } from './ConsoleMesh'

interface DragState {
  /** Floor plane for floor items, wall plane for wall-mounted items */
  plane: THREE.Plane
  offset: THREE.Vector3
  /** A plane at right angles to the primary one, used when the camera views the primary edge-on */
  altPlane: THREE.Plane
  altOffset: THREE.Vector3 | null
  /** Items that were stacked on this one when the drag began; they move with it */
  carry: Set<string>
  moved: boolean
}

/** True when the ray meets the plane at such a shallow angle that intersections are unreliable. */
function grazing(ray: THREE.Ray, plane: THREE.Plane) {
  return Math.abs(ray.direction.dot(plane.normal)) < 0.2
}

function shade(hex: string, amount: number) {
  const c = new THREE.Color(hex)
  c.offsetHSL(0, 0, amount)
  return `#${c.getHexString()}`
}

export function ObjectMesh({ item }: { item: Item }) {
  const project = useProject()!
  const selectedId = useStore((s) => s.selectedId)
  const select = useStore((s) => s.select)
  const updateItem = useStore((s) => s.updateItem)
  const alignWithBase = useStore((s) => s.alignWithBase)
  const setDragging = useStore((s) => s.setDragging)
  const setGuides = useStore((s) => s.setGuides)
  const showLabels = useStore((s) => s.showLabels)
  const showMeasurements = useStore((s) => s.showMeasurements)
  const selected = selectedId === item.id
  const drag = useRef<DragState | null>(null)
  const floor = isFloorItem(item)

  const colors = useMemo(() => {
    const front = item.type === 'tv' ? '#05070a' : shade(item.color, -0.08)
    return { body: item.color, front, top: shade(item.color, 0.04) }
  }, [item.color, item.type])

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (e.button !== 0) return
    e.stopPropagation()
    select(item.id)
    const plane = floor
      ? new THREE.Plane(new THREE.Vector3(0, 1, 0), -item.y)
      : new THREE.Plane(new THREE.Vector3(0, 0, 1), -item.z)
    const altPlane = floor
      ? new THREE.Plane(new THREE.Vector3(0, 0, 1), -item.z)
      : new THREE.Plane(new THREE.Vector3(0, 1, 0), -(item.y + item.height / 2))
    const hit = new THREE.Vector3()
    const altHit = new THREE.Vector3()
    const hasHit = !grazing(e.ray, plane) && !!e.ray.intersectPlane(plane, hit)
    const hasAlt = !grazing(e.ray, altPlane) && !!e.ray.intersectPlane(altPlane, altHit)
    if (!hasHit && !hasAlt) return
    drag.current = {
      plane,
      offset: hasHit ? new THREE.Vector3(item.x - hit.x, item.y - hit.y, item.z - hit.z) : new THREE.Vector3(),
      altPlane,
      altOffset: hasAlt ? new THREE.Vector3(item.x - altHit.x, item.y - altHit.y, item.z - altHit.z) : null,
      // Alt/Option drags the item by itself. Otherwise only what was already on it comes along,
      // so a base can be slid underneath a console without dragging the console with it.
      carry: e.altKey || !floor ? new Set() : restingOn(item.id, project.items),
      moved: false,
    }
    ;(e.target as Element).setPointerCapture(e.pointerId)
    setDragging(true)
  }

  const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
    const d = drag.current
    if (!d) return
    e.stopPropagation()
    const hit = new THREE.Vector3()
    let proposed: { x: number; y: number; z: number }
    if (!grazing(e.ray, d.plane) && e.ray.intersectPlane(d.plane, hit)) {
      proposed = {
        x: hit.x + d.offset.x,
        y: floor ? item.y : hit.y + d.offset.y,
        z: floor ? hit.z + d.offset.z : item.z,
      }
    } else if (d.altOffset && e.ray.intersectPlane(d.altPlane, hit)) {
      // Camera is looking along the primary plane (e.g. the Front view for a floor item): move sideways only.
      proposed = { x: hit.x + d.altOffset.x, y: item.y, z: item.z }
    } else {
      return
    }
    const result = snapPosition(item, proposed, project)
    updateItem(item.id, floor ? { x: result.x, z: result.z } : { x: result.x, y: result.y }, d.carry)
    d.moved = true
    setGuides(result.guides)
  }

  const endDrag = (e: ThreeEvent<PointerEvent>) => {
    if (!drag.current) return
    const moved = drag.current.moved
    drag.current = null
    // Releasing a base under a console (or a console onto a base) centers them on each other.
    if (moved && floor) alignWithBase(item.id)
    ;(e.target as Element).releasePointerCapture(e.pointerId)
    setDragging(false)
    setGuides([])
  }

  const m = showMeasurements && selected ? measure(item, project) : null
  const rot = (item.rotation * Math.PI) / 180

  return (
    <group
      position={[item.x, item.y, item.z]}
      rotation={[0, rot, 0]}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerOver={() => (document.body.style.cursor = 'grab')}
      onPointerOut={() => (document.body.style.cursor = 'auto')}
    >
      {item.type === 'panel' ? (
        <PanelMesh item={item} selected={selected} />
      ) : item.type === 'base' ? (
        <BaseMesh item={item} selected={selected} />
      ) : item.type === 'console' ? (
        <ConsoleMesh item={item} selected={selected} />
      ) : (
        <mesh position={[0, item.height / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[item.width, item.height, item.depth]} />
          <meshStandardMaterial attach="material-0" color={colors.body} roughness={0.6} />
          <meshStandardMaterial attach="material-1" color={colors.body} roughness={0.6} />
          <meshStandardMaterial attach="material-2" color={colors.top} roughness={0.6} />
          <meshStandardMaterial attach="material-3" color={colors.body} roughness={0.6} />
          <meshStandardMaterial
            attach="material-4"
            color={colors.front}
            roughness={item.type === 'tv' ? 0.15 : 0.6}
            metalness={item.type === 'tv' ? 0.3 : 0}
          />
          <meshStandardMaterial attach="material-5" color={colors.body} roughness={0.6} />
          {selected && <Edges color="#ffffff" lineWidth={1.5} />}
        </mesh>
      )}
      {/* Front-direction marker so toe-in is visible from above */}
      {item.type === 'speaker' && (
        <mesh position={[0, item.height * 0.7, item.depth / 2 + 0.05]}>
          <circleGeometry args={[Math.min(item.width, item.height) * 0.3, 24]} />
          <meshStandardMaterial color="#111" roughness={0.9} />
        </mesh>
      )}
      {showLabels && (
        <Html position={[0, item.height + 3, 0]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
          <div className={`label${selected ? ' selected' : ''}`}>{item.name}</div>
        </Html>
      )}
      {m && (
        <group rotation={[0, -rot, 0]}>
          <Measure
            at={[-edgeHalfW(item) - leftGap(m) / 2, item.height / 2, 0]}
            text={formatInches(leftGap(m))}
            bad={leftGap(m) < 0}
          />
          <Measure
            at={[edgeHalfW(item) + rightGap(m) / 2, item.height / 2, 0]}
            text={formatInches(rightGap(m))}
            bad={rightGap(m) < 0}
          />
        </group>
      )}
    </group>
  )
}

function leftGap(m: Measurements) {
  return m.leftNeighbor ? m.leftNeighbor.gap : m.leftGap
}

function rightGap(m: Measurements) {
  return m.rightNeighbor ? m.rightNeighbor.gap : m.rightGap
}

function edgeHalfW(item: Item) {
  const r = (item.rotation * Math.PI) / 180
  return (item.width * Math.abs(Math.cos(r)) + item.depth * Math.abs(Math.sin(r))) / 2
}

function Measure({ at, text, bad }: { at: [number, number, number]; text: string; bad: boolean }) {
  return (
    <Html position={at} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
      <div className={`measure${bad ? ' bad' : ''}`}>{text}</div>
    </Html>
  )
}
