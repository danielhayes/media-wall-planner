import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Guide, Item, ItemType, Project, SnapSettings, Wall } from './types'
import { typeInfo } from './types'
import { settle } from './geometry'
import { PRESETS } from './presets'

export type ViewName = 'top' | 'front' | 'iso'
export type Projection = 'perspective' | 'orthographic'

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

export const DEFAULT_SNAP: SnapSettings = {
  enabled: true,
  grid: 1,
  centerline: true,
  objectCenters: true,
  edges: true,
  threshold: 1.5,
}

export function defaultWall(): Wall {
  return {
    width: 144,
    height: 96,
    color: '#d9d4c7',
    trimColor: '#f4f2ec',
    baseboard: { enabled: true, height: 5.25, depth: 0.75 },
    crown: { enabled: false, height: 4.5, depth: 3 },
  }
}

export function newItem(type: ItemType, overrides: Partial<Item> = {}): Item {
  const preset = PRESETS[type][0]
  return {
    id: uid(),
    type,
    name: typeInfo(type).label,
    width: preset.width,
    height: preset.height,
    depth: preset.depth,
    color: typeInfo(type).color,
    x: 72,
    y: 0,
    z: 20,
    rotation: 0,
    mountGap: 2,
    ...overrides,
  }
}

function sampleProject(): Project {
  const wall = defaultWall()
  const tv = PRESETS.tv[3]
  const console = PRESETS.console[1]
  const spk = PRESETS.speaker[0]
  const sub = PRESETS.subwoofer[1]
  const items: Item[] = [
    newItem('console', { name: 'Media console', ...console, x: 72, z: 0.75 + console.depth / 2 }),
    newItem('tv', { name: '65" TV', ...tv, x: 72, y: 30 }),
    newItem('speaker', { name: 'Left speaker', ...spk, x: 72 - console.width / 2 + spk.width / 2 + 2, z: 0.75 + spk.depth / 2 + 2 }),
    newItem('speaker', { name: 'Right speaker', ...spk, x: 72 + console.width / 2 - spk.width / 2 - 2, z: 0.75 + spk.depth / 2 + 2 }),
    newItem('subwoofer', { name: 'Subwoofer', ...sub, x: 72 - console.width / 2 - sub.width / 2 - 6, z: 0.75 + sub.depth / 2 }),
  ]
  const now = Date.now()
  return {
    id: uid(),
    name: 'Living room',
    createdAt: now,
    updatedAt: now,
    wall,
    floorDepth: 72,
    snap: { ...DEFAULT_SNAP },
    toeIn: 0,
    items: settle(items, wall),
  }
}

interface State {
  projects: Record<string, Project>
  currentId: string | null
  selectedId: string | null
  dragging: boolean
  guides: Guide[]
  projection: Projection
  viewRequest: { view: ViewName; n: number }
  showMeasurements: boolean
  showLabels: boolean
  showShadows: boolean

  createProject: (name: string) => void
  deleteProject: (id: string) => void
  selectProject: (id: string) => void
  renameProject: (id: string, name: string) => void
  importProject: (json: string) => string | null
  updateProject: (patch: Partial<Pick<Project, 'floorDepth' | 'snap' | 'toeIn'>>) => void
  updateWall: (patch: Partial<Wall>) => void
  updateSnap: (patch: Partial<SnapSettings>) => void

  addItem: (type: ItemType, presetIndex?: number) => void
  updateItem: (id: string, patch: Partial<Item>) => void
  removeItem: (id: string) => void
  duplicateItem: (id: string) => void
  mirrorItem: (id: string) => void
  centerItem: (id: string) => void
  applyToeIn: (degrees: number) => void

  select: (id: string | null) => void
  setDragging: (dragging: boolean) => void
  setGuides: (guides: Guide[]) => void
  requestView: (view: ViewName) => void
  setProjection: (p: Projection) => void
  toggleMeasurements: () => void
  toggleLabels: () => void
  toggleShadows: () => void
}

export const useStore = create<State>()(
  persist(
    (set, get) => {
      const sample = sampleProject()

      const mutate = (fn: (p: Project) => Partial<Project> | void) =>
        set((s) => {
          if (!s.currentId) return {}
          const p = s.projects[s.currentId]
          const patch = fn(p) ?? {}
          const next: Project = { ...p, ...patch, updatedAt: Date.now() }
          next.items = settle(next.items, next.wall)
          return { projects: { ...s.projects, [p.id]: next } }
        })

      return {
        projects: { [sample.id]: sample },
        currentId: sample.id,
        selectedId: null,
        dragging: false,
        guides: [],
        projection: 'perspective',
        viewRequest: { view: 'iso', n: 0 },
        showMeasurements: true,
        showLabels: true,
        showShadows: true,

        createProject: (name) => {
          const now = Date.now()
          const p: Project = {
            id: uid(),
            name: name || 'Untitled wall',
            createdAt: now,
            updatedAt: now,
            wall: defaultWall(),
            floorDepth: 72,
            snap: { ...DEFAULT_SNAP },
            toeIn: 0,
            items: [],
          }
          set((s) => ({ projects: { ...s.projects, [p.id]: p }, currentId: p.id, selectedId: null }))
        },
        deleteProject: (id) =>
          set((s) => {
            const projects = { ...s.projects }
            delete projects[id]
            const currentId = s.currentId === id ? (Object.keys(projects)[0] ?? null) : s.currentId
            return { projects, currentId, selectedId: null }
          }),
        selectProject: (id) => set({ currentId: id, selectedId: null }),
        renameProject: (id, name) =>
          set((s) => ({ projects: { ...s.projects, [id]: { ...s.projects[id], name, updatedAt: Date.now() } } })),
        importProject: (json) => {
          try {
            const raw = JSON.parse(json) as Project
            if (!raw.wall || !Array.isArray(raw.items)) return 'That file does not look like a media wall project.'
            const p: Project = { ...raw, id: uid(), updatedAt: Date.now(), snap: { ...DEFAULT_SNAP, ...raw.snap } }
            p.items = settle(p.items, p.wall)
            set((s) => ({ projects: { ...s.projects, [p.id]: p }, currentId: p.id, selectedId: null }))
            return null
          } catch {
            return 'Could not parse that file as JSON.'
          }
        },
        updateProject: (patch) => mutate(() => patch),
        updateWall: (patch) => mutate((p) => ({ wall: { ...p.wall, ...patch } })),
        updateSnap: (patch) => mutate((p) => ({ snap: { ...p.snap, ...patch } })),

        addItem: (type, presetIndex = 0) => {
          const preset = PRESETS[type][presetIndex] ?? PRESETS[type][0]
          const p = get().currentId ? get().projects[get().currentId!] : null
          if (!p) return
          const count = p.items.filter((i) => i.type === type).length
          const item = newItem(type, {
            ...preset,
            name: count ? `${typeInfo(type).label} ${count + 1}` : typeInfo(type).label,
            x: p.wall.width / 2,
            y: type === 'tv' ? Math.max(0, p.wall.height / 2 - preset.height / 2) : 0,
            z: (p.wall.baseboard.enabled ? p.wall.baseboard.depth : 0) + preset.depth / 2,
          })
          mutate((pr) => ({ items: [...pr.items, item] }))
          set({ selectedId: item.id })
        },
        updateItem: (id, patch) =>
          mutate((p) => ({ items: p.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) })),
        removeItem: (id) => {
          mutate((p) => ({ items: p.items.filter((i) => i.id !== id) }))
          set((s) => (s.selectedId === id ? { selectedId: null } : {}))
        },
        duplicateItem: (id) => {
          let copyId: string | null = null
          mutate((p) => {
            const src = p.items.find((i) => i.id === id)
            if (!src) return
            const copy: Item = { ...src, id: uid(), name: `${src.name} copy`, x: src.x + src.width + 2 }
            copyId = copy.id
            return { items: [...p.items, copy] }
          })
          if (copyId) set({ selectedId: copyId })
        },
        mirrorItem: (id) => {
          let copyId: string | null = null
          mutate((p) => {
            const src = p.items.find((i) => i.id === id)
            if (!src) return
            const name = /left/i.test(src.name)
              ? src.name.replace(/left/i, (m) => (m[0] === 'L' ? 'Right' : 'right'))
              : /right/i.test(src.name)
                ? src.name.replace(/right/i, (m) => (m[0] === 'R' ? 'Left' : 'left'))
                : `${src.name} (mirrored)`
            const copy: Item = { ...src, id: uid(), name, x: p.wall.width - src.x, rotation: -src.rotation }
            copyId = copy.id
            return { items: [...p.items, copy] }
          })
          if (copyId) set({ selectedId: copyId })
        },
        centerItem: (id) => mutate((p) => ({ items: p.items.map((i) => (i.id === id ? { ...i, x: p.wall.width / 2 } : i)) })),
        applyToeIn: (degrees) =>
          mutate((p) => ({
            toeIn: degrees,
            items: p.items.map((i) => {
              if (i.type !== 'speaker') return i
              const mid = p.wall.width / 2
              const rotation = i.x < mid - 1e-6 ? degrees : i.x > mid + 1e-6 ? -degrees : 0
              return { ...i, rotation }
            }),
          })),

        select: (id) => set({ selectedId: id }),
        setDragging: (dragging) => set({ dragging }),
        setGuides: (guides) => set({ guides }),
        requestView: (view) => set((s) => ({ viewRequest: { view, n: s.viewRequest.n + 1 } })),
        setProjection: (projection) =>
          set((s) => ({ projection, viewRequest: { view: s.viewRequest.view, n: s.viewRequest.n + 1 } })),
        toggleMeasurements: () => set((s) => ({ showMeasurements: !s.showMeasurements })),
        toggleLabels: () => set((s) => ({ showLabels: !s.showLabels })),
        toggleShadows: () => set((s) => ({ showShadows: !s.showShadows })),
      }
    },
    {
      name: 'media-wall-planner',
      partialize: (s) => ({
        projects: s.projects,
        currentId: s.currentId,
        projection: s.projection,
        showMeasurements: s.showMeasurements,
        showLabels: s.showLabels,
        showShadows: s.showShadows,
      }),
    },
  ),
)

export function useProject(): Project | null {
  return useStore((s) => (s.currentId ? (s.projects[s.currentId] ?? null) : null))
}

export function useSelectedItem(): Item | null {
  return useStore((s) => {
    const p = s.currentId ? s.projects[s.currentId] : null
    return p?.items.find((i) => i.id === s.selectedId) ?? null
  })
}
