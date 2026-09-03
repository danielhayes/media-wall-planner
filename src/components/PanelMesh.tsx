import { useEffect, useMemo } from 'react'
import { Edges } from '@react-three/drei'
import type { Item } from '../lib/types'
import { panelDesign } from '../lib/types'
import { buildSlatGeometry } from '../lib/panel'

/**
 * A wall panel: background slab, optional edge banding frame, and optional slats.
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
  const bgDepth = depth - relief
  const sideColor = edge > 0 ? d.edgeColor : item.color

  const slats = useMemo(
    () => (slatted && relief > 0 ? buildSlatGeometry(iw, ih, d, relief) : null),
    [slatted, relief, iw, ih, d],
  )
  useEffect(() => () => slats?.dispose(), [slats])

  return (
    <group position={[0, h / 2, 0]}>
      {/* Background slab (front recessed behind the slats). Sides show the edge banding color. */}
      <mesh position={[0, 0, -depth / 2 + bgDepth / 2]} castShadow receiveShadow>
        <boxGeometry args={[w, h, bgDepth]} />
        <meshStandardMaterial attach="material-0" color={sideColor} roughness={0.8} />
        <meshStandardMaterial attach="material-1" color={sideColor} roughness={0.8} />
        <meshStandardMaterial attach="material-2" color={sideColor} roughness={0.8} />
        <meshStandardMaterial attach="material-3" color={sideColor} roughness={0.8} />
        <meshStandardMaterial attach="material-4" color={item.color} roughness={0.85} />
        <meshStandardMaterial attach="material-5" color={sideColor} roughness={0.8} />
        {selected && <Edges color="#ffffff" lineWidth={1.5} />}
      </mesh>
      {/* Edge banding frame, full depth so it sits flush with the slat faces */}
      {edge > 0 && (
        <group>
          <mesh position={[0, h / 2 - edge / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[w, edge, depth]} />
            <meshStandardMaterial color={d.edgeColor} roughness={0.7} />
          </mesh>
          <mesh position={[0, -h / 2 + edge / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[w, edge, depth]} />
            <meshStandardMaterial color={d.edgeColor} roughness={0.7} />
          </mesh>
          <mesh position={[-w / 2 + edge / 2, 0, 0]} castShadow receiveShadow>
            <boxGeometry args={[edge, ih, depth]} />
            <meshStandardMaterial color={d.edgeColor} roughness={0.7} />
          </mesh>
          <mesh position={[w / 2 - edge / 2, 0, 0]} castShadow receiveShadow>
            <boxGeometry args={[edge, ih, depth]} />
            <meshStandardMaterial color={d.edgeColor} roughness={0.7} />
          </mesh>
        </group>
      )}
      {/* Slats, extruded from the background face out to the front */}
      {slats && (
        <mesh geometry={slats} position={[0, 0, depth / 2 - relief]} castShadow receiveShadow>
          <meshStandardMaterial color={d.slatColor} roughness={0.7} />
        </mesh>
      )}
    </group>
  )
}
