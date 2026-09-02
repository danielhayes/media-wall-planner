export type ItemType = 'tv' | 'console' | 'rack' | 'speaker' | 'subwoofer'

export interface Item {
  id: string
  type: ItemType
  name: string
  /** Dimensions in inches */
  width: number
  height: number
  depth: number
  color: string
  /** Center along the wall, measured from the left edge of the wall (inches) */
  x: number
  /** Elevation of the bottom of the item (inches). Computed for floor items. */
  y: number
  /** Distance from the wall face to the center of the item (inches) */
  z: number
  /** Yaw in degrees. Positive turns the front toward +x (the right). */
  rotation: number
  /** Gap between wall face and back of a TV (inches) */
  mountGap: number
}

export interface Trim {
  enabled: boolean
  height: number
  depth: number
}

export interface Wall {
  width: number
  height: number
  color: string
  trimColor: string
  baseboard: Trim
  crown: Trim
}

export interface SnapSettings {
  enabled: boolean
  /** Grid spacing in inches */
  grid: number
  centerline: boolean
  objectCenters: boolean
  edges: boolean
  /** How close (inches) an edge or center must be before it snaps */
  threshold: number
}

export interface Project {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  wall: Wall
  /** How far the floor extends out from the wall (inches) */
  floorDepth: number
  snap: SnapSettings
  toeIn: number
  items: Item[]
}

export interface Guide {
  axis: 'x' | 'y' | 'z'
  value: number
  kind: 'centerline' | 'center' | 'edge' | 'grid'
}

export const ITEM_TYPES: { type: ItemType; label: string; color: string; floor: boolean }[] = [
  { type: 'tv', label: 'TV', color: '#1f2933', floor: false },
  { type: 'console', label: 'Media console', color: '#8b5e3c', floor: true },
  { type: 'rack', label: 'Equipment rack', color: '#3d4450', floor: true },
  { type: 'speaker', label: 'Speaker', color: '#5b6b7a', floor: true },
  { type: 'subwoofer', label: 'Subwoofer', color: '#2c2f36', floor: true },
]

export function typeInfo(type: ItemType) {
  return ITEM_TYPES.find((t) => t.type === type)!
}

export function isFloorItem(item: Pick<Item, 'type'>) {
  return typeInfo(item.type).floor
}
