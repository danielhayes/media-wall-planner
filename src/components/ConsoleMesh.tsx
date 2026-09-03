import { useEffect, useMemo } from 'react'
import { Edges } from '@react-three/drei'
import type { Item } from '../lib/types'
import { consoleDesign, woodColor } from '../lib/types'
import { buildSlatGeometry } from '../lib/panel'
import type { PanelDesign } from '../lib/types'
import { WOOD_TILE, tiled, woodTexture } from '../lib/textures'

const INTERIOR = '#151312'
const HANDLE = '#0b0b0b'
const TOP_THICKNESS = 0.75
const DOOR_THICKNESS = 0.75
const RELIEF = 0.25

/**
 * A media console: carcass, separate top slab, evenly divided front doors, and an
 * optional wood slat finish. With a wood finish the sides are veneered (or slatted).
 * Local origin is the bottom center with the front facing +z.
 */
export function ConsoleMesh({ item, selected }: { item: Item; selected: boolean }) {
  const { width: w, height: h, depth: d, color } = item
  const design = consoleDesign(item)
  const slatted = design.finish !== 'plain'
  const slatSides = slatted && design.sides === 'slats'
  const wood = woodColor(design.wood)
  const topT = Math.min(TOP_THICKNESS, h * 0.15)
  const bodyH = h - topT
  const gap = Math.max(0, design.doorGap)
  const doors = Math.max(0, Math.round(design.doors))
  const doorH = Math.max(0.5, bodyH - 2 * gap)
  const doorW = doors > 0 ? (w - (doors + 1) * gap) / doors : 0
  const sideInset = slatSides ? RELIEF : 0
  const carcassW = w - 2 * sideInset
  const carcassD = d - (doors > 0 ? DOOR_THICKNESS : 0)
  const topColor = design.topColor ?? color
  const horizontal = design.finish !== 'slats-vertical'

  const slatDesign = useMemo<PanelDesign>(
    () => ({
      pattern: horizontal ? 'horizontal' : 'vertical',
      slatDirection: 'up-right',
      edgeWidth: 0,
      edgeColor: wood,
      slatWidth: design.slatWidth,
      slatGap: design.slatGap,
      slatRelief: RELIEF,
      slatColor: wood,
    }),
    [horizontal, design.slatWidth, design.slatGap, wood],
  )
  const doorSlats = useMemo(
    () => (slatted && doorW > 0.5 ? buildSlatGeometry(doorW, doorH, slatDesign, RELIEF) : null),
    [slatted, doorW, doorH, slatDesign],
  )
  const sideSlats = useMemo(
    () => (slatSides ? buildSlatGeometry(carcassD, doorH, slatDesign, RELIEF) : null),
    [slatSides, carcassD, doorH, slatDesign],
  )
  useEffect(() => () => doorSlats?.dispose(), [doorSlats])
  useEffect(() => () => sideSlats?.dispose(), [sideSlats])

  // Extruded slats carry UVs in inches, so one tile of grain spans WOOD_TILE inches.
  // Grain runs along the slats: rotate it for horizontal slats.
  const slatMap = useMemo(() => {
    if (!slatted) return null
    const t = tiled(woodTexture(wood), 1, 1, WOOD_TILE.w, WOOD_TILE.h)
    if (horizontal) t.rotation = Math.PI / 2
    return t
  }, [slatted, wood, horizontal])
  useEffect(() => () => slatMap?.dispose(), [slatMap])

  // Veneered sides: per-face maps sized to the side panel so the grain scale matches.
  const sideMap = useMemo(
    () => (slatted && !slatSides ? tiled(woodTexture(wood), carcassD, bodyH, WOOD_TILE.w, WOOD_TILE.h) : null),
    [slatted, slatSides, wood, carcassD, bodyH],
  )
  useEffect(() => () => sideMap?.dispose(), [sideMap])

  const doorFace = slatted ? INTERIOR : color
  const sideMaterial = (i: number) =>
    sideMap ? (
      <meshStandardMaterial key={`veneer${i}`} attach={`material-${i}`} map={sideMap} color="#ffffff" roughness={0.55} />
    ) : (
      <meshStandardMaterial key={`plain${i}`} attach={`material-${i}`} color={slatSides ? INTERIOR : color} roughness={0.7} />
    )
  const slatMaterial = <meshStandardMaterial key={`slat-${wood}`} map={slatMap} color="#ffffff" roughness={0.6} />

  return (
    <group>
      {/* Invisible bounding box for hit-testing and the selection outline */}
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[w, h, d]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        {selected && <Edges color="#ffffff" lineWidth={1.5} />}
      </mesh>
      {/* Carcass */}
      <mesh position={[0, bodyH / 2, -(d - carcassD) / 2]} castShadow receiveShadow>
        <boxGeometry args={[carcassW, bodyH, carcassD]} />
        {sideMaterial(0)}
        {sideMaterial(1)}
        <meshStandardMaterial attach="material-2" color={color} roughness={0.7} />
        <meshStandardMaterial attach="material-3" color={color} roughness={0.7} />
        <meshStandardMaterial attach="material-4" color={INTERIOR} roughness={0.9} />
        <meshStandardMaterial attach="material-5" color={color} roughness={0.7} />
      </mesh>
      {/* Top slab */}
      <mesh position={[0, h - topT / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, topT, d]} />
        <meshStandardMaterial color={topColor} roughness={design.topColor ? 0.25 : 0.6} metalness={design.topColor ? 0.1 : 0} />
      </mesh>
      {/* Doors */}
      {doors > 0 &&
        doorW > 0.5 &&
        Array.from({ length: doors }, (_, i) => {
          const x = -w / 2 + gap + doorW / 2 + i * (doorW + gap)
          const y = gap + doorH / 2
          return (
            <group key={i} position={[x, y, 0]}>
              <mesh position={[0, 0, d / 2 - DOOR_THICKNESS / 2 - (slatted ? RELIEF / 2 : 0)]} castShadow receiveShadow>
                <boxGeometry args={[doorW, doorH, DOOR_THICKNESS - (slatted ? RELIEF : 0)]} />
                <meshStandardMaterial color={doorFace} roughness={slatted ? 0.9 : 0.65} />
              </mesh>
              {doorSlats && (
                <mesh geometry={doorSlats} position={[0, 0, d / 2 - RELIEF]} castShadow receiveShadow>
                  {slatMaterial}
                </mesh>
              )}
              {/* Handle strip near the top of each door */}
              <mesh position={[0, doorH / 2 - 0.9, d / 2 + 0.06]}>
                <boxGeometry args={[Math.min(doorW * 0.35, 8), 0.35, 0.12]} />
                <meshStandardMaterial color={HANDLE} roughness={0.4} metalness={0.4} />
              </mesh>
            </group>
          )
        })}
      {/* Slatted sides, extruded outward to the full width */}
      {sideSlats && (
        <>
          <mesh
            geometry={sideSlats}
            position={[w / 2 - RELIEF, gap + doorH / 2, -(d - carcassD) / 2]}
            rotation={[0, Math.PI / 2, 0]}
            castShadow
            receiveShadow
          >
            {slatMaterial}
          </mesh>
          <mesh
            geometry={sideSlats}
            position={[-w / 2 + RELIEF, gap + doorH / 2, -(d - carcassD) / 2]}
            rotation={[0, -Math.PI / 2, 0]}
            castShadow
            receiveShadow
          >
            {slatMaterial}
          </mesh>
        </>
      )}
    </group>
  )
}
