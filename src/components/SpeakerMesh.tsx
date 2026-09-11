import { useEffect, useMemo } from 'react'
import { Edges } from '@react-three/drei'
import * as THREE from 'three'
import type { Item } from '../lib/types'
import { speakerDesign, woodEntry } from '../lib/types'
import { useStore } from '../lib/store'
import { GRILL_TILE, WOOD_TILE, grillTexture, tiled, woodTexture } from '../lib/textures'

const PLINTH = '#0e0e0e'
const GRILL_DEPTH = 0.5
/** How far the grill sits back inside the cabinet's front edge */
const GRILL_RECESS = 0.35

/**
 * A loudspeaker cabinet with an optional wood veneer, a fabric grill on the front,
 * and an optional recessed plinth. Local origin is the bottom center, front facing +z.
 */
export function SpeakerMesh({ item, selected }: { item: Item; selected: boolean }) {
  const { width: w, height: h, depth: d, color } = item
  const design = speakerDesign(item)
  const plinth = Math.min(Math.max(0, design.plinthHeight), h * 0.5)
  const cabH = h - plinth
  const wood = design.finish === 'wood'
  const entry = woodEntry(design.wood)
  const cabColor = wood ? entry.color : color
  const tv = useStore((s) => s.textureVersion)
  const border = Math.min(Math.max(0, design.grillBorder), w / 2 - 0.1, cabH / 2 - 0.1)
  const grillW = w - 2 * border
  const grillH = cabH - 2 * border

  // Per-face wood maps so the grain stays the same scale on every face.
  // Box face order: +x, -x, +y, -y, +z, -z.
  const woodMaps = useMemo(() => {
    void tv // wood textures are rebuilt when a swatch loads
    if (!wood) return null
    const base = woodTexture(cabColor, entry.grain)
    const side = () => tiled(base, d, cabH, WOOD_TILE.w, WOOD_TILE.h)
    const top = () => {
      const t = tiled(base, w, d, WOOD_TILE.w, WOOD_TILE.h)
      t.rotation = Math.PI / 2 // grain runs front to back on the top
      t.center.set(0.5, 0.5)
      return t
    }
    const front = () => tiled(base, w, cabH, WOOD_TILE.w, WOOD_TILE.h)
    return [side(), side(), top(), top(), front(), front()]
  }, [wood, cabColor, entry.grain, w, cabH, d, tv])
  useEffect(() => () => woodMaps?.forEach((t) => t.dispose()), [woodMaps])

  const grillMap = useMemo(
    () => (design.grill ? tiled(grillTexture(design.grillColor), grillW, grillH, GRILL_TILE, GRILL_TILE) : null),
    [design.grill, design.grillColor, grillW, grillH],
  )
  useEffect(() => () => grillMap?.dispose(), [grillMap])

  // Keyed on the finish so switching between plain and veneer creates a fresh material;
  // three.js does not recompile a material when a map is added after the fact.
  const cabinetMaterial = (i: number) =>
    woodMaps ? (
      <meshStandardMaterial key={`wood${i}`} attach={`material-${i}`} map={woodMaps[i]} color="#ffffff" roughness={0.55} />
    ) : (
      <meshStandardMaterial key={`plain${i}`} attach={`material-${i}`} color={cabColor} roughness={0.6} />
    )
  const frontMaterial = woodMaps ? (
    <meshStandardMaterial key="wood" map={woodMaps[4]} color="#ffffff" roughness={0.55} />
  ) : (
    <meshStandardMaterial key="plain" color={cabColor} roughness={0.6} />
  )
  const hasGrill = design.grill && grillMap !== null && grillW > 0.2 && grillH > 0.2
  const recess = hasGrill ? GRILL_RECESS : 0

  return (
    <group>
      {/* Invisible bounding box for hit-testing and the selection outline */}
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[w, h, d]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        {selected && <Edges color="#ffffff" lineWidth={1.5} />}
      </mesh>
      {/* Cabinet, set back by the grill recess when a grill is fitted */}
      <mesh position={[0, plinth + cabH / 2, -recess / 2]} castShadow receiveShadow>
        <boxGeometry args={[w, cabH, d - recess]} />
        {[0, 1, 2, 3, 4, 5].map(cabinetMaterial)}
      </mesh>
      {/* Front frame around the recessed grill */}
      {hasGrill && border > 0 && (
        <group position={[0, plinth, d / 2 - recess / 2]}>
          <mesh position={[0, cabH - border / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[w, border, recess]} />
            {frontMaterial}
          </mesh>
          <mesh position={[0, border / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[w, border, recess]} />
            {frontMaterial}
          </mesh>
          <mesh position={[-w / 2 + border / 2, cabH / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[border, grillH, recess]} />
            {frontMaterial}
          </mesh>
          <mesh position={[w / 2 - border / 2, cabH / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[border, grillH, recess]} />
            {frontMaterial}
          </mesh>
        </group>
      )}
      {/* Plinth, recessed on all sides */}
      {plinth > 0 && (
        <mesh position={[0, plinth / 2, -0.25]} castShadow receiveShadow>
          <boxGeometry args={[Math.max(0.5, w - 1.5), plinth, Math.max(0.5, d - 1.5)]} />
          <meshStandardMaterial color={PLINTH} roughness={0.8} />
        </mesh>
      )}
      {/* Grill cloth, slightly recessed inside the cabinet's front edge */}
      {hasGrill ? (
        <mesh position={[0, plinth + border + grillH / 2, d / 2 - recess - GRILL_DEPTH / 2 + 0.1]} receiveShadow>
          <boxGeometry args={[grillW, grillH, GRILL_DEPTH]} />
          <meshStandardMaterial map={grillMap} color="#ffffff" roughness={0.95} />
        </mesh>
      ) : (
        /* Without a grill, a driver marks the front so toe-in stays readable from above */
        <mesh position={[0, plinth + cabH * 0.65, d / 2 + 0.05]}>
          <circleGeometry args={[Math.min(w, cabH) * 0.3, 24]} />
          <meshStandardMaterial color={new THREE.Color('#111')} roughness={0.9} />
        </mesh>
      )}
    </group>
  )
}
