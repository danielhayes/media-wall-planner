export type ItemType = 'tv' | 'panel' | 'console' | 'base' | 'rack' | 'speaker' | 'subwoofer'

export type ConsoleFinish = 'plain' | 'slats-horizontal' | 'slats-vertical' | 'weave' | 'constellation' | 'tune'

/** Every wood grain the app knows about. One registry, selectable wherever a wood is offered. */
export type Wood =
  | 'american-walnut'
  | 'natural-walnut'
  | 'chocolate-walnut'
  | 'toasted-walnut'
  | 'washed-oak'
  | 'black-ash'
  | 'charcoal-ash'
  | 'american-auburn'

export const FACADE_FINISHES: ConsoleFinish[] = ['weave', 'constellation', 'tune']

export function isSlatFinish(f: ConsoleFinish) {
  return f === 'slats-horizontal' || f === 'slats-vertical'
}
export function isFacadeFinish(f: ConsoleFinish) {
  return FACADE_FINISHES.includes(f)
}

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
  /** Top surface color; null matches the body (veneer for wood finishes) */
  topColor: string | null
  /** Height of a recessed black plinth under the cabinet, included in the total height. 0 for none. */
  plinth: number
  /** Multiplier on the facade pattern size (Weave, Constellation, Tune) */
  patternScale: number
}

/** How the procedural grain is drawn for a wood */
export interface GrainStyle {
  /** 0..2, strength of the grain streaks */
  contrast: number
  /** Draw cathedral arches (crown-cut figure) */
  arches: boolean
}

export interface WoodEntry {
  wood: Wood
  label: string
  color: string
  /** Species group used to organize the wood menu */
  group: string
  grain: GrainStyle
}

/**
 * The central wood registry. Add a wood here and it becomes available on consoles,
 * speakers, and wall panels. A photo at public/woods/<wood>.jpg replaces its grain.
 */
export const WOODS: WoodEntry[] = [
  { wood: 'american-walnut', label: 'American Walnut', color: '#8a6238', group: 'Walnut', grain: { contrast: 1, arches: true } },
  { wood: 'natural-walnut', label: 'Natural Walnut', color: '#8a684a', group: 'Walnut', grain: { contrast: 1.3, arches: true } },
  { wood: 'chocolate-walnut', label: 'Chocolate Stained Walnut', color: '#4a2c1e', group: 'Walnut', grain: { contrast: 0.9, arches: true } },
  { wood: 'toasted-walnut', label: 'Toasted Oak', color: '#5a3f2f', group: 'Oak', grain: { contrast: 0.8, arches: false } },
  { wood: 'washed-oak', label: 'Washed Oak', color: '#cbbda3', group: 'Oak', grain: { contrast: 0.55, arches: true } },
  { wood: 'black-ash', label: 'Black Ash', color: '#1c1c1c', group: 'Ash', grain: { contrast: 0.5, arches: false } },
  { wood: 'charcoal-ash', label: 'Charcoal Stained Ash', color: '#3b3735', group: 'Ash', grain: { contrast: 0.7, arches: false } },
  { wood: 'american-auburn', label: 'American Auburn', color: '#6e3b2c', group: 'Other', grain: { contrast: 1, arches: true } },
]

export const WOOD_GROUPS = ['Walnut', 'Oak', 'Ash', 'Other']

export function woodEntry(wood: string): WoodEntry {
  return WOODS.find((w) => w.wood === wood) ?? WOODS[1]
}

/** Wood names from earlier versions of saved projects */
const LEGACY_WOODS: Record<string, Wood> = {
  'medium-walnut': 'natural-walnut',
  'dark-walnut': 'chocolate-walnut',
  'black-oak': 'charcoal-ash',
}

export function woodColor(wood: Wood) {
  return WOODS.find((w) => w.wood === wood)?.color ?? WOODS[0].color
}

/** Speakers pick from the shared wood registry */
export type SpeakerWood = Wood

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
  /** Slats painted a color, or veneered in a wood from the registry */
  finish: 'color' | 'wood'
  wood: Wood
  /** Edge banding painted a color, or veneered in its own wood (a wood frame) */
  edgeFinish: 'color' | 'wood'
  edgeWood: Wood
  /** Width of the edge banding strip around the front (inches). 0 for none. */
  edgeWidth: number
  edgeColor: string
  slatWidth: number
  slatGap: number
  /** How far slats stand proud of the panel background (inches) */
  slatRelief: number
  slatColor: string
}

/** Which dimension annotations to draw for an item */
export interface DimFlags {
  width?: boolean
  height?: boolean
  depth?: boolean
  left?: boolean
  right?: boolean
  bottom?: boolean
  top?: boolean
}

export const DIM_LABELS: { key: keyof DimFlags; label: string }[] = [
  { key: 'width', label: 'Width' },
  { key: 'height', label: 'Height' },
  { key: 'depth', label: 'Depth' },
  { key: 'left', label: 'Offset from left' },
  { key: 'right', label: 'Offset from right' },
  { key: 'bottom', label: 'Offset from bottom' },
  { key: 'top', label: 'Offset from top' },
]

export interface Item {
  id: string
  type: ItemType
  name: string
  /** Hidden items stay in the project but are left out of the scene, snapping, and stacking */
  hidden?: boolean
  dims?: DimFlags
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

export type FloorFinish = 'color' | 'planks' | 'image'
export type PlankDirection = 'along' | 'across'

export interface FloorDesign {
  finish: FloorFinish
  color: string
  /** Plank preset id, see PLANK_PRESETS */
  plank: string
  /** Override of the preset's plank width (inches); null uses the preset */
  plankWidth: number | null
  /** Planks run along the wall or out from it */
  direction: PlankDirection
  /** A user-supplied floor photo as a data URL */
  imageData: string | null
  /** Real-world width (inches) covered by one repeat of the image */
  imageSize: number
}

export interface PlankPreset {
  id: string
  label: string
  color: string
  plankWidth: number
  /** 0..1, how strongly the grain shows */
  grain: number
  /** 0..1, lightness spread between planks */
  variation: number
  knots: boolean
}

export const PLANK_PRESETS: PlankPreset[] = [
  { id: 'dark-oak', label: 'Dark oak', color: '#5b3b24', plankWidth: 7, grain: 0.9, variation: 0.12, knots: true },
  { id: 'walnut', label: 'Walnut', color: '#7d5136', plankWidth: 8, grain: 0.35, variation: 0.06, knots: false },
  { id: 'white-oak', label: 'White oak, natural', color: '#d9c7a5', plankWidth: 9, grain: 0.4, variation: 0.06, knots: true },
  { id: 'light-oak', label: 'Light oak', color: '#bb9469', plankWidth: 8, grain: 0.6, variation: 0.08, knots: true },
  { id: 'blonde-oak', label: 'Blonde oak', color: '#d2ba92', plankWidth: 9, grain: 0.45, variation: 0.07, knots: true },
]

export const DEFAULT_FLOOR: FloorDesign = {
  finish: 'color',
  color: '#8a8378',
  plank: 'light-oak',
  plankWidth: null,
  direction: 'along',
  imageData: null,
  imageSize: 48,
}

export function floorDesign(project: { floor?: Partial<FloorDesign> }): FloorDesign {
  return { ...DEFAULT_FLOOR, ...project.floor }
}

export interface Project {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  wall: Wall
  /** How far the floor extends out from the wall (inches) */
  floorDepth: number
  floor?: FloorDesign
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
  finish: 'color',
  wood: 'natural-walnut',
  edgeFinish: 'color',
  edgeWood: 'natural-walnut',
  edgeWidth: 1,
  edgeColor: '#7a5a3a',
  slatWidth: 1.5,
  slatGap: 0.75,
  slatRelief: 0.5,
  slatColor: '#8b6a45',
}

export function panelDesign(item: Item): PanelDesign {
  const d = { ...DEFAULT_PANEL, ...item.panel }
  // Before banding had its own finish, wood slats veneered the banding too.
  if (item.panel && item.panel.edgeFinish === undefined && item.panel.finish === 'wood') {
    d.edgeFinish = 'wood'
    d.edgeWood = item.panel.wood ?? d.wood
  }
  return d
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
  plinth: 0,
  patternScale: 1,
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
