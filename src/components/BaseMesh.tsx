import { Edges } from '@react-three/drei'
import type { Item } from '../lib/types'
import { baseDesign } from '../lib/types'

/**
 * A sled-style console base: front and back top rails spanning the width, with a closed
 * loop at each end (foot, two posts, top cross bar). Local origin is the bottom center.
 */
export function BaseMesh({ item, selected }: { item: Item; selected: boolean }) {
  const { width: w, height: h, depth: d, color } = item
  const design = baseDesign(item)
  const t = Math.min(design.thickness, w / 2, h / 2)
  const m = Math.min(design.memberDepth, d / 2)
  const postH = Math.max(0.01, h - 2 * t)
  const ends = [-(w / 2 - t / 2), w / 2 - t / 2]
  const faces = [-(d / 2 - m / 2), d / 2 - m / 2]
  const mat = <meshStandardMaterial color={color} roughness={0.45} metalness={0.35} />

  return (
    <group>
      {/* Invisible bounding box: catches clicks between the members and shows the selection outline */}
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[w, h, d]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        {selected && <Edges color="#ffffff" lineWidth={1.5} />}
      </mesh>
      {/* Top rails, front and back */}
      {faces.map((z) => (
        <mesh key={`rail${z}`} position={[0, h - t / 2, z]} castShadow receiveShadow>
          <boxGeometry args={[w, t, m]} />
          {mat}
        </mesh>
      ))}
      {ends.map((x) => (
        <group key={`end${x}`}>
          {/* Foot */}
          <mesh position={[x, t / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[t, t, d]} />
            {mat}
          </mesh>
          {/* Top cross bar */}
          <mesh position={[x, h - t / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[t, t, d]} />
            {mat}
          </mesh>
          {/* Posts, front and back */}
          {faces.map((z) => (
            <mesh key={`post${z}`} position={[x, t + postH / 2, z]} castShadow receiveShadow>
              <boxGeometry args={[t, postH, m]} />
              {mat}
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}
