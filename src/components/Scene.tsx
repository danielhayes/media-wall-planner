import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { Grid, Line, OrbitControls, OrthographicCamera, PerspectiveCamera } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import * as THREE from 'three'
import { useProject, useStore } from '../lib/store'
import type { Project } from '../lib/types'
import { PLANK_PRESETS, floorDesign } from '../lib/types'
import { imageTexture, plankTexture } from '../lib/floor'
import { ObjectMesh } from './ObjectMesh'
import { Dimensions } from './Dimensions'

export function Scene() {
  const project = useProject()
  const dragging = useStore((s) => s.dragging)
  const projection = useStore((s) => s.projection)
  const showGrid = useStore((s) => s.showGrid)
  const showDims = useStore((s) => s.showDims)
  const select = useStore((s) => s.select)
  const view = useStore((s) => s.viewRequest.view)
  const showShadows = useStore((s) => s.showShadows)
  // Plan views (top, front) read cleaner without cast shadows.
  const shadows = showShadows && view === 'iso'
  if (!project) return null
  const { wall, floorDepth } = project
  const cx = wall.width / 2
  const cy = wall.height / 2
  const far = Math.max(wall.width, wall.height, floorDepth) * 20

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      onPointerMissed={() => select(null)}
      style={{ background: 'linear-gradient(#1a1d24, #0f1115)' }}
    >
      {projection === 'perspective' ? (
        <PerspectiveCamera key="persp" makeDefault fov={40} near={1} far={far} position={[cx, cy, 300]} />
      ) : (
        <OrthographicCamera key="ortho" makeDefault near={-far} far={far} position={[cx, cy, 300]} zoom={4} />
      )}
      <OrbitControls makeDefault enabled={!dragging} enableDamping={false} zoomToCursor target={[cx, cy, floorDepth / 2]} />
      <CameraRig project={project} />

      <hemisphereLight intensity={0.55} color="#ffffff" groundColor="#3b3f48" />
      <directionalLight
        position={[cx - 80, wall.height + 120, floorDepth + 120]}
        intensity={1.4}
        castShadow={shadows}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-wall.width}
        shadow-camera-right={wall.width}
        shadow-camera-top={wall.height * 1.5}
        shadow-camera-bottom={-wall.height}
        shadow-camera-near={1}
        shadow-camera-far={far}
        shadow-bias={-0.0005}
      />
      <directionalLight position={[cx + 100, wall.height, floorDepth * 2]} intensity={0.4} />

      <WallAndFloor project={project} showGrid={showGrid} />
      {project.items.filter((item) => !item.hidden).map((item) => (
        <ObjectMesh key={item.id} item={item} />
      ))}
      {showDims &&
        project.items
          .filter((item) => !item.hidden && item.dims)
          .map((item) => <Dimensions key={`dim-${item.id}`} item={item} project={project} />)}
      <Guides project={project} />
    </Canvas>
  )
}

function WallAndFloor({ project, showGrid }: { project: Project; showGrid: boolean }) {
  const { wall, floorDepth, snap } = project
  const thickness = 4.5
  const margin = 24
  const gridCell = snap.grid >= 1 ? snap.grid : 1

  return (
    <group>
      {/* Wall slab */}
      <mesh position={[wall.width / 2, wall.height / 2, -thickness / 2]} receiveShadow>
        <boxGeometry args={[wall.width, wall.height, thickness]} />
        <meshStandardMaterial color={wall.color} roughness={0.95} />
      </mesh>
      {/* Baseboard */}
      {wall.baseboard.enabled && (
        <mesh position={[wall.width / 2, wall.baseboard.height / 2, wall.baseboard.depth / 2]} castShadow receiveShadow>
          <boxGeometry args={[wall.width, wall.baseboard.height, wall.baseboard.depth]} />
          <meshStandardMaterial color={wall.trimColor} roughness={0.7} />
        </mesh>
      )}
      {/* Crown moulding */}
      {wall.crown.enabled && (
        <mesh position={[wall.width / 2, wall.height - wall.crown.height / 2, wall.crown.depth / 2]} castShadow receiveShadow>
          <boxGeometry args={[wall.width, wall.crown.height, wall.crown.depth]} />
          <meshStandardMaterial color={wall.trimColor} roughness={0.7} />
        </mesh>
      )}
      <Floor project={project} width={wall.width + margin * 2} />
      {showGrid && <Grid
        position={[wall.width / 2, 0.02, floorDepth / 2]}
        args={[wall.width + margin * 2, floorDepth]}
        cellSize={gridCell}
        cellThickness={0.6}
        cellColor="#6b665d"
        sectionSize={12}
        sectionThickness={1.2}
        sectionColor="#4a463f"
        fadeDistance={far(project)}
        fadeStrength={0}
        infiniteGrid={false}
      />}
      {/* Wall centerline */}
      {snap.centerline && (
        <Line
          points={[
            [wall.width / 2, 0, 0.1],
            [wall.width / 2, wall.height, 0.1],
          ]}
          color="#ffb454"
          lineWidth={1}
          dashed
          dashSize={2}
          gapSize={2}
          opacity={0.5}
          transparent
        />
      )}
      {/* Wall outline */}
      <Line
        points={[
          [0, 0, 0.05],
          [wall.width, 0, 0.05],
          [wall.width, wall.height, 0.05],
          [0, wall.height, 0.05],
          [0, 0, 0.05],
        ]}
        color="#ffffff"
        lineWidth={1}
        opacity={0.35}
        transparent
      />
    </group>
  )
}

/** The floor slab: a solid color, procedural planks, or a user photo tiled at real scale. */
function Floor({ project, width }: { project: Project; width: number }) {
  const { wall, floorDepth } = project
  const design = floorDesign(project)
  const [image, setImage] = useState<THREE.Texture | null>(null)
  const rotated = design.direction === 'across'

  useEffect(() => {
    let live = true
    if (design.finish === 'image' && design.imageData) {
      imageTexture(design.imageData, rotated)
        .then((t) => live && setImage(t))
        .catch(() => live && setImage(null))
    }
    return () => {
      live = false
    }
  }, [design.finish, design.imageData, rotated])

  const preset = PLANK_PRESETS.find((p) => p.id === design.plank) ?? PLANK_PRESETS[0]
  const plankWidth = design.plankWidth ?? preset.plankWidth
  const { map, key } = useMemo(() => {
    if (design.finish === 'planks') {
      const tile = plankTexture(preset, plankWidth, design.direction)
      const m = tile.texture.clone()
      m.repeat.set(width / tile.tileU, floorDepth / tile.tileV)
      m.needsUpdate = true
      return { map: m, key: `planks-${preset.id}-${design.direction}` }
    }
    if (design.finish === 'image' && design.imageData && image) {
      const img = image.image as { width?: number; height?: number }
      const aspect = img && img.width && img.height ? img.height / img.width : 1
      const m = image.clone()
      m.repeat.set(width / design.imageSize, floorDepth / (design.imageSize * aspect))
      m.needsUpdate = true
      return { map: m, key: 'image' }
    }
    return { map: null as THREE.Texture | null, key: 'color' }
  }, [design.finish, design.direction, design.imageSize, design.imageData, preset, plankWidth, image, width, floorDepth])
  useEffect(() => () => map?.dispose(), [map])

  return (
    <mesh position={[wall.width / 2, -0.05, floorDepth / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[width, floorDepth]} />
      {map ? (
        <meshStandardMaterial key={key} map={map} color="#ffffff" roughness={0.75} />
      ) : (
        <meshStandardMaterial key="color" color={design.color} roughness={1} />
      )}
    </mesh>
  )
}

function far(project: Project) {
  return Math.max(project.wall.width, project.wall.height, project.floorDepth) * 20
}

function Guides({ project }: { project: Project }) {
  const guides = useStore((s) => s.guides)
  const { wall, floorDepth } = project
  const color = (kind: string) => (kind === 'centerline' ? '#ffb454' : kind === 'center' ? '#6cc3ff' : '#8dff8d')
  return (
    <group>
      {guides.map((g, i) => {
        if (g.axis === 'x')
          return (
            <group key={i}>
              <Line points={[[g.value, 0, 0.2], [g.value, wall.height, 0.2]]} color={color(g.kind)} lineWidth={1.5} />
              <Line points={[[g.value, 0.1, 0], [g.value, 0.1, floorDepth]]} color={color(g.kind)} lineWidth={1.5} />
            </group>
          )
        if (g.axis === 'z')
          return <Line key={i} points={[[-24, 0.1, g.value], [wall.width + 24, 0.1, g.value]]} color={color(g.kind)} lineWidth={1.5} />
        return <Line key={i} points={[[0, g.value, 0.2], [wall.width, g.value, 0.2]]} color={color(g.kind)} lineWidth={1.5} />
      })}
    </group>
  )
}

function CameraRig({ project }: { project: Project }) {
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const req = useStore((s) => s.viewRequest)
  const applied = useRef(-1)

  useEffect(() => {
    if (!controls) return
    if (applied.current === req.n && controls.object === camera) return
    applied.current = req.n
    const { wall, floorDepth } = project
    const cx = wall.width / 2
    const cy = wall.height / 2
    const cz = floorDepth / 2
    const extent = Math.max(wall.width, wall.height, floorDepth)
    const dist = extent * 1.5
    const target = new THREE.Vector3(cx, cy, cz)
    const pos = new THREE.Vector3()
    if (req.view === 'top') {
      target.set(cx, 0, cz)
      pos.set(cx, dist, cz + 0.01)
    } else if (req.view === 'front') {
      target.set(cx, cy, 0)
      pos.set(cx, cy, dist)
    } else {
      pos.set(cx + dist * 0.55, cy + dist * 0.55, cz + dist * 0.9)
    }
    camera.position.copy(pos)
    camera.up.set(0, 1, 0)
    controls.target.copy(target)
    if (camera instanceof THREE.OrthographicCamera) {
      const pad = 1.08
      const fitW = req.view === 'top' ? wall.width + 48 : req.view === 'front' ? wall.width + 24 : extent * 1.6
      const fitH = req.view === 'top' ? floorDepth + 12 : req.view === 'front' ? wall.height + 24 : extent * 1.2
      camera.zoom = Math.min(size.width / (fitW * pad), size.height / (fitH * pad))
      camera.updateProjectionMatrix()
    }
    controls.update()
  }, [req, controls, camera, project, size])

  return null
}
