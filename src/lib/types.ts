export type ItemType = 'tv' | 'panel' | 'console' | 'base' | 'rack' | 'speaker' | 'subwoofer'

export type ConsoleFinish = 'plain' | 'slats-horizontal' | 'slats-vertical'
export type Wood = 'natural-walnut' | 'chocolate-walnut' | 'charcoal-ash'

export interface ConsoleDesign {
  /** Number of equal front doors */
  doors: number
  /** Reveal between doors and around them (inches) */
  doorGap: number
  finish: ConsoleFinish
  wood: Wood
  slatWidth: number
  slatGap: number
  /** With a slat finish, sides are either solid veneer (as on most cabinets) or slatted too */
  sides: 'veneer' | 'slats'
  /** Top surface color; null matches the body color */
  topColor: string | null
}

export const WOODS: { wood: Wood; label: string; color: string }[] = [
  { wood: 'natural-walnut', label: 'Natural Walnut', color: '#a0703f' },
  { wood: 'chocolate-walnut', label: 'Chocolate Stained Walnut', color: '#4a2c1e' },
  { wood: 'charcoal-ash', label: 'Charcoal Stained Ash', color: '#3b3735' },
]

/** Wood names from earlier versions of saved projects */
const LEGACY_WOODS: Record<string, Wood> = {
  'medium-walnut': 'natural-walnut',
  'dark-walnut': 'chocolate-walnut',
  'black-oak': 'charcoal-ash',
}

export function woodColor(wood: Wood) {
  return WOODS.find((w) => w.wood === wood)?.color ?? WOODS[0].color
}

export type SpeakerWood = 'american-auburn' | 'american-walnut' | 'black-ash'

export interface SpeakerDesign {
  finish: 'plain' | 'wood'
  wood: SpeakerWood
  grill: boolean
  grillColor: string
  /** Cabinet edge left visible around the grill (inches) */
  grillBorder: number
  /** Height of a recessed black plinth under the cabinet (inches). 0 for none. */
  plinthHeight: number
}

export const SPEAKER_WOODS: { wood: SpeakerWood; label: string; color: string }[] = [
  { wood: 'american-auburn', label: 'American Auburn', color: '#6e3b2c' },
  { wood: 'american-walnut', label: 'American Walnut', color: '#8a6238' },
  { wood: 'black-ash', label: 'Black Ash', color: '#1c1c1c' },
]

export function speakerWoodColor(wood: SpeakerWood) {
  return SPEAKER_WOODS.find((w) => w.wood === wood)?.color ?? SPEAKER_WOODS[1].color
}

export interface BaseDesign {
  /** Thickness of a frame member as seen from the front (inches) */
  thickness: number
  /** Front-to-back depth of the posts and top rails (inches) */
  memberDepth: number
}

export type PanelPattern = 'solid' | 'vertical' | 'horizontal' | 'diagonal'
/** Direction diagonal slats run, viewed from the front */
export type SlatDirection = 'up-right' | 'up-left'

export interface PanelDesign {
  pattern: PanelPattern
  slatDirection: SlatDirection
  /** Width of the edge banding strip around the front (inches). 0 for none. */
  edgeWidth: number
  edgeColor: string
  slatWidth: number
  slatGap: number
  /** How far slats stand proud of the panel background (inches) */
  slatRelief: number
  slatColor: string
}

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
  /** Gap between the wall (or a panel behind) and the back of a wall-mounted item (inches) */
  mountGap: number
  /** Present on wall panels only */
  panel?: PanelDesign
  /** Present on console bases only */
  base?: BaseDesign
  /** Present on media consoles only */
  console?: ConsoleDesign
  /** Present on speakers only */
  speaker?: SpeakerDesign
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
  { type: 'panel', label: 'Wall panel', color: '#d7c4a3', floor: false },
  { type: 'console', label: 'Media console', color: '#8b5e3c', floor: true },
  { type: 'base', label: 'Console base', color: '#1b1b1b', floor: true },
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

export const DEFAULT_PANEL: PanelDesign = {
  pattern: 'vertical',
  slatDirection: 'up-right',
  edgeWidth: 1,
  edgeColor: '#7a5a3a',
  slatWidth: 1.5,
  slatGap: 0.75,
  slatRelief: 0.5,
  slatColor: '#8b6a45',
}

export function panelDesign(item: Item): PanelDesign {
  return { ...DEFAULT_PANEL, ...item.panel }
}

export const DEFAULT_BASE: BaseDesign = { thickness: 1, memberDepth: 3 }

export function baseDesign(item: Item): BaseDesign {
  return { ...DEFAULT_BASE, ...item.base }
}

export const DEFAULT_CONSOLE: ConsoleDesign = {
  doors: 4,
  doorGap: 0.25,
  finish: 'plain',
  wood: 'natural-walnut',
  slatWidth: 1,
  slatGap: 0.5,
  sides: 'veneer',
  topColor: null,
}

export function consoleDesign(item: Item): ConsoleDesign {
  const d = { ...DEFAULT_CONSOLE, ...item.console }
  if (d.wood in LEGACY_WOODS) d.wood = LEGACY_WOODS[d.wood]
  return d
}

export const DEFAULT_SPEAKER: SpeakerDesign = {
  finish: 'plain',
  wood: 'american-walnut',
  grill: true,
  grillColor: '#5c5d58',
  grillBorder: 0.75,
  plinthHeight: 0,
}

export function speakerDesign(item: Item): SpeakerDesign {
  return { ...DEFAULT_SPEAKER, ...item.speaker }
}
