import { Edges } from '@react-three/drei'
import type { Item } from '../lib/types'
import { WALL_THICKNESS, doorwayDesign } from '../lib/types'

const CASING_DEPTH = 0.75

/**
 * A doorway: the opening itself is cut out of the wall slab (see WallAndFloor). This
 * draws the optional casing around it and an invisible box in the opening for
 * selection and dragging. Local origin is the bottom center on the wall face.
 */
export function DoorwayMesh({ item, selected }: { item: Item; selected: boolean }) {
  const { width: w, height: h, color } = item
  const d = doorwayDesign(item)
  const c = d.casing ? Math.max(0.25, d.casingWidth) : 0
  // The item sits with its center inside the wall; draw relative to the wall face at local z = +thickness/2.
  const face = WALL_THICKNESS / 2
  const mat = <meshStandardMaterial color={color} roughness={0.7} />

  return (
    <group>
      {/* Hit box filling the opening, with the selection outline */}
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[w, h, WALL_THICKNESS]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        {selected && <Edges color="#ffffff" lineWidth={1.5} />}
      </mesh>
      {c > 0 && (
        <group position={[0, 0, face + CASING_DEPTH / 2]}>
          {/* Side casings run from the floor to the top of the head casing */}
          <mesh position={[-w / 2 - c / 2, (h + c) / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[c, h + c, CASING_DEPTH]} />
            {mat}
          </mesh>
          <mesh position={[w / 2 + c / 2, (h + c) / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[c, h + c, CASING_DEPTH]} />
            {mat}
          </mesh>
          {/* Head casing spans the opening between the side casings */}
          <mesh position={[0, h + c / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[w, c, CASING_DEPTH]} />
            {mat}
          </mesh>
        </group>
      )}
    </group>
  )
}
