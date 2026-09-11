import { useEffect, useMemo } from 'react'
import { Edges } from '@react-three/drei'
import * as THREE from 'three'
import type { Item } from '../lib/types'
import { consoleDesign, isFacadeFinish, isSlatFinish, woodEntry } from '../lib/types'
import { useStore } from '../lib/store'
import { buildSlatGeometry } from '../lib/panel'
import type { PanelDesign } from '../lib/types'
import { WOOD_TILE, tiled, woodTexture } from '../lib/textures'
import { facadeTexture } from '../lib/facades'

const INTERIOR = '#151312'
const HANDLE = '#0b0b0b'
const PLINTH = '#0e0e0e'
const TOP_THICKNESS = 0.75
const DOOR_THICKNESS = 0.75
const RELIEF = 0.25
/** Wood frame left around an Elements facade panel */
const FACADE_BORDER = 0.6

/**
 * A media console: carcass, separate top slab, evenly divided front doors, an optional
 * black plinth, and a door finish: plain, wood slats, or an Elements facade (Weave,
 * Constellation, Tune) set into a wood frame. Wood finishes veneer the whole body.
 * Local origin is the bottom center with the front facing +z.
 */
export function ConsoleMesh({ item, selected }: { item: Item; selected: boolean }) {
  const { width: w, height: h, depth: d, color } = item
  const design = consoleDesign(item)
  const slatted = isSlatFinish(design.finish)
  const facade = isFacadeFinish(design.finish)
  const woody = slatted || facade
  const slatSides = slatted && design.sides === 'slats'
  const entry = woodEntry(design.wood)
  const wood = entry.color
  const grain = entry.grain
  const tv = useStore((s) => s.textureVersion)
  const plinth = Math.min(Math.max(0, design.plinth), h * 0.5)
  const topT = Math.min(TOP_THICKNESS, h * 0.15)
  const bodyH = h - topT - plinth
  const gap = Math.max(0, design.doorGap)
  const doors = Math.max(0, Math.round(design.doors))
  const doorH = Math.max(0.5, bodyH - 2 * gap)
  const doorW = doors > 0 ? (w - (doors + 1) * gap) / doors : 0
  const sideInset = slatSides ? RELIEF : 0
  const carcassW = w - 2 * sideInset
  const carcassD = d - (doors > 0 ? DOOR_THICKNESS : 0)
  const horizontal = design.finish !== 'slats-vertical'

  // ---- slats (Corridor-style) ----
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
  const slatMap = useMemo(() => {
    void tv // wood textures are rebuilt when a swatch loads
    if (!slatted) return null
    const t = tiled(woodTexture(wood, grain), 1, 1, WOOD_TILE.w, WOOD_TILE.h)
    if (horizontal) t.rotation = Math.PI / 2
    return t
  }, [slatted, wood, grain, horizontal, tv])
  useEffect(() => () => slatMap?.dispose(), [slatMap])

  // ---- veneer maps for the body (sides, back, top) ----
  const veneer = useMemo(() => {
    void tv // wood textures are rebuilt when a swatch loads
    if (!woody) return null
    const base = woodTexture(wood, grain)
    const side = tiled(base, carcassD, bodyH, WOOD_TILE.w, WOOD_TILE.h)
    const back = tiled(base, carcassW, bodyH, WOOD_TILE.w, WOOD_TILE.h)
    const top = tiled(base, w, d, WOOD_TILE.w, WOOD_TILE.h)
    top.rotation = Math.PI / 2 // grain runs along the length of the top
    top.center.set(0.5, 0.5)
    const door = tiled(base, doorW, doorH, WOOD_TILE.w, WOOD_TILE.h)
    return { side, back, top, door }
  }, [woody, wood, grain, carcassD, bodyH, carcassW, w, d, doorW, doorH, tv])
  useEffect(
    () => () => {
      if (veneer) Object.values(veneer).forEach((t) => t.dispose())
    },
    [veneer],
  )

  // ---- Elements facade panel ----
  const facadeW = Math.max(0.5, doorW - 2 * FACADE_BORDER)
  const facadeH = Math.max(0.5, doorH - 2 * FACADE_BORDER)
  const facadeMap = useMemo(() => {
    void tv // facade masks and wood textures are rebuilt when photos load
    if (!facade) return null
    const tile = facadeTexture(design.finish, wood, grain, design.patternScale, facadeH)
    if (!tile) return null
    const t = tile.texture.clone()
    t.repeat.set(facadeW / tile.tileW, facadeH / tile.tileH)
    t.needsUpdate = true
    return t
  }, [facade, design.finish, wood, grain, design.patternScale, facadeW, facadeH, tv])
  useEffect(() => () => facadeMap?.dispose(), [facadeMap])

  const topColor = design.topColor ?? color
  const topIsVeneer = design.topColor === null && veneer !== null
  const sideMaterial = (i: number) =>
    veneer && !slatSides ? (
      <meshStandardMaterial key={`veneer${i}`} attach={`material-${i}`} map={veneer.side} color="#ffffff" roughness={0.55} />
    ) : (
      <meshStandardMaterial key={`plain${i}`} attach={`material-${i}`} color={slatSides ? INTERIOR : color} roughness={0.7} />
    )
  const bodyMaterial = (i: number, map: THREE.Texture | null) =>
    map ? (
      <meshStandardMaterial key={`veneer${i}`} attach={`material-${i}`} map={map} color="#ffffff" roughness={0.55} />
    ) : (
      <meshStandardMaterial key={`plain${i}`} attach={`material-${i}`} color={color} roughness={0.7} />
    )
  const slatMaterial = <meshStandardMaterial key={`slat-${wood}`} map={slatMap} color="#ffffff" roughness={0.6} />
  const doorFace = slatted ? INTERIOR : color

  return (
    <group>
      {/* Invisible bounding box for hit-testing and the selection outline */}
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[w, h, d]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        {selected && <Edges color="#ffffff" lineWidth={1.5} />}
      </mesh>
      {/* Plinth, recessed on all sides */}
      {plinth > 0 && (
        <mesh position={[0, plinth / 2, -0.5]} castShadow receiveShadow>
          <boxGeometry args={[Math.max(0.5, w - 2), plinth, Math.max(0.5, d - 2)]} />
          <meshStandardMaterial color={PLINTH} roughness={0.8} />
        </mesh>
      )}
      {/* Carcass */}
      <mesh position={[0, plinth + bodyH / 2, -(d - carcassD) / 2]} castShadow receiveShadow>
        <boxGeometry args={[carcassW, bodyH, carcassD]} />
        {sideMaterial(0)}
        {sideMaterial(1)}
        {bodyMaterial(2, veneer?.top ?? null)}
        {bodyMaterial(3, veneer?.top ?? null)}
        <meshStandardMaterial attach="material-4" color={INTERIOR} roughness={0.9} />
        {bodyMaterial(5, veneer?.back ?? null)}
      </mesh>
      {/* Top slab */}
      <mesh position={[0, h - topT / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, topT, d]} />
        {topIsVeneer ? (
          <meshStandardMaterial key="top-veneer" map={veneer!.top} color="#ffffff" roughness={0.5} />
        ) : (
          <meshStandardMaterial key="top-color" color={topColor} roughness={design.topColor ? 0.25 : 0.6} metalness={design.topColor ? 0.1 : 0} />
        )}
      </mesh>
      {/* Doors */}
      {doors > 0 &&
        doorW > 0.5 &&
        Array.from({ length: doors }, (_, i) => {
          const x = -w / 2 + gap + doorW / 2 + i * (doorW + gap)
          const y = plinth + gap + doorH / 2
          return (
            <group key={i} position={[x, y, 0]}>
              {facade && veneer ? (
                <>
                  {/* Wood door with the facade panel set slightly into its face */}
                  <mesh position={[0, 0, d / 2 - DOOR_THICKNESS / 2]} castShadow receiveShadow>
                    <boxGeometry args={[doorW, doorH, DOOR_THICKNESS]} />
                    {[0, 1, 2, 3, 4, 5].map((f) => (
                      <meshStandardMaterial key={`door${f}-${wood}`} attach={`material-${f}`} map={veneer.door} color="#ffffff" roughness={0.55} />
                    ))}
                  </mesh>
                  {facadeMap && (
                    <mesh position={[0, 0, d / 2 + 0.01]}>
                      <planeGeometry args={[facadeW, facadeH]} />
                      <meshStandardMaterial key={`facade-${design.finish}-${wood}`} map={facadeMap} color="#ffffff" roughness={0.6} />
                    </mesh>
                  )}
                </>
              ) : (
                <mesh position={[0, 0, d / 2 - DOOR_THICKNESS / 2 - (slatted ? RELIEF / 2 : 0)]} castShadow receiveShadow>
                  <boxGeometry args={[doorW, doorH, DOOR_THICKNESS - (slatted ? RELIEF : 0)]} />
                  <meshStandardMaterial color={doorFace} roughness={slatted ? 0.9 : 0.65} />
                </mesh>
              )}
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
            position={[w / 2 - RELIEF, plinth + gap + doorH / 2, -(d - carcassD) / 2]}
            rotation={[0, Math.PI / 2, 0]}
            castShadow
            receiveShadow
          >
            {slatMaterial}
          </mesh>
          <mesh
            geometry={sideSlats}
            position={[-w / 2 + RELIEF, plinth + gap + doorH / 2, -(d - carcassD) / 2]}
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
