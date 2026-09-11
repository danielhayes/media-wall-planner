import { useEffect, useMemo } from 'react'
import { Edges } from '@react-three/drei'
import type { Item } from '../lib/types'
import { panelDesign, woodEntry } from '../lib/types'
import { buildSlatGeometry } from '../lib/panel'
import { WOOD_TILE, tiled, woodTexture } from '../lib/textures'
import { useStore } from '../lib/store'

/**
 * A wall panel: background slab, optional edge banding frame, and optional slats.
 * Slats and banding are painted colors or veneered in a wood from the registry.
 * Local origin is the bottom center of the panel with the front facing +z.
 */
export function PanelMesh({ item, selected }: { item: Item; selected: boolean }) {
  const d = useMemo(() => panelDesign(item), [item])
  const { width: w, height: h, depth } = item
  const edge = Math.min(Math.max(0, d.edgeWidth), w / 2 - 0.01, h / 2 - 0.01)
  const iw = w - 2 * edge
  const ih = h - 2 * edge
  const slatted = d.pattern !== 'solid'
  const relief = slatted ? Math.min(Math.max(0, d.slatRelief), Math.max(0.05, depth - 0.125)) : 0
  // The background always sits a little behind the banding so the frame stands proud and
  // the two faces never share the same plane (which shimmered on solid panels).
  const frameRecess = edge > 0 ? Math.min(0.06, depth / 4) : 0
  const bgDepth = depth - Math.max(relief, frameRecess)
  const woody = slatted && d.finish === 'wood'
  const entry = woodEntry(d.wood)
  const bandWoody = edge > 0 && d.edgeFinish === 'wood'
  const bandEntry = woodEntry(d.edgeWood)
  const tv = useStore((s) => s.textureVersion)

  const slats = useMemo(
    () => (slatted && relief > 0 ? buildSlatGeometry(iw, ih, d, relief) : null),
    [slatted, relief, iw, ih, d],
  )
  useEffect(() => () => slats?.dispose(), [slats])

  // Slat veneer: the extruded slats carry inch-based UVs, so one map turned to follow
  // the slat direction serves every slat.
  const slatMap = useMemo(() => {
    void tv // wood textures are rebuilt when a swatch loads
    if (!woody) return null
    const t = tiled(woodTexture(entry.color, entry.grain), 1, 1, WOOD_TILE.w, WOOD_TILE.h)
    t.rotation =
      d.pattern === 'horizontal' ? Math.PI / 2 : d.pattern === 'vertical' ? 0 : d.slatDirection === 'up-right' ? -Math.PI / 4 : Math.PI / 4
    return t
  }, [woody, entry, d.pattern, d.slatDirection, tv])
  useEffect(() => () => slatMap?.dispose(), [slatMap])

  // Banding veneer: maps sized to each frame piece and to the panel edges.
  const maps = useMemo(() => {
    void tv
    if (!bandWoody) return null
    const base = woodTexture(bandEntry.color, bandEntry.grain)
    const across = tiled(base, w, Math.max(edge, 0.1), WOOD_TILE.w, WOOD_TILE.h)
    across.rotation = Math.PI / 2
    across.center.set(0.5, 0.5)
    const along = tiled(base, Math.max(edge, 0.1), ih, WOOD_TILE.w, WOOD_TILE.h)
    const side = tiled(base, depth, h, WOOD_TILE.w, WOOD_TILE.h)
    return { across, along, side }
  }, [bandWoody, bandEntry, w, ih, h, edge, depth, tv])
  useEffect(
    () => () => {
      if (maps) Object.values(maps).forEach((t) => t.dispose())
    },
    [maps],
  )

  const sideColor = edge > 0 ? d.edgeColor : item.color
  const sideMat = (i: number) =>
    maps ? (
      <meshStandardMaterial key={`v${i}`} attach={`material-${i}`} map={maps.side} color="#ffffff" roughness={0.55} />
    ) : (
      <meshStandardMaterial key={`c${i}`} attach={`material-${i}`} color={sideColor} roughness={0.8} />
    )
  const bandMat = (map: 'across' | 'along') =>
    maps ? (
      <meshStandardMaterial key={`band-${bandEntry.wood}`} map={maps[map]} color="#ffffff" roughness={0.55} />
    ) : (
      <meshStandardMaterial key="band-color" color={d.edgeColor} roughness={0.7} />
    )

  return (
    <group position={[0, h / 2, 0]}>
      {/* Background slab (front recessed behind the slats). Sides show the edge banding. */}
      <mesh position={[0, 0, -depth / 2 + bgDepth / 2]} castShadow receiveShadow>
        <boxGeometry args={[w, h, bgDepth]} />
        {sideMat(0)}
        {sideMat(1)}
        {sideMat(2)}
        {sideMat(3)}
        <meshStandardMaterial attach="material-4" color={item.color} roughness={0.85} />
        {sideMat(5)}
        {selected && <Edges color="#ffffff" lineWidth={1.5} />}
      </mesh>
      {/* Edge banding frame, full depth so it sits flush with the slat faces */}
      {edge > 0 && (
        <group>
          <mesh position={[0, h / 2 - edge / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[w, edge, depth]} />
            {bandMat('across')}
          </mesh>
          <mesh position={[0, -h / 2 + edge / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[w, edge, depth]} />
            {bandMat('across')}
          </mesh>
          <mesh position={[-w / 2 + edge / 2, 0, 0]} castShadow receiveShadow>
            <boxGeometry args={[edge, ih, depth]} />
            {bandMat('along')}
          </mesh>
          <mesh position={[w / 2 - edge / 2, 0, 0]} castShadow receiveShadow>
            <boxGeometry args={[edge, ih, depth]} />
            {bandMat('along')}
          </mesh>
        </group>
      )}
      {/* Slats, extruded from the background face out to the front */}
      {slats && (
        <mesh geometry={slats} position={[0, 0, depth / 2 - relief]} castShadow receiveShadow>
          {slatMap ? (
            <meshStandardMaterial key={`slat-${entry.wood}`} map={slatMap} color="#ffffff" roughness={0.6} />
          ) : (
            <meshStandardMaterial key="slat-color" color={d.slatColor} roughness={0.7} />
          )}
        </mesh>
      )}
    </group>
  )
}
