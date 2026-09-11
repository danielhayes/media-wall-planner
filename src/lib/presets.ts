import type { ItemType } from './types'

export interface Preset {
  label: string
  width: number
  height: number
  depth: number
}

/** Approximate typical dimensions (W x H x D, inches). Edit after picking. */
export const PRESETS: Record<ItemType, Preset[]> = {
  tv: [
    { label: '43" TV', width: 38.2, height: 22.3, depth: 2.5 },
    { label: '50" TV', width: 44.1, height: 25.5, depth: 2.6 },
    { label: '55" TV', width: 48.5, height: 28.0, depth: 2.6 },
    { label: '65" TV', width: 57.1, height: 32.8, depth: 2.7 },
    { label: '75" TV', width: 65.9, height: 37.9, depth: 2.8 },
    { label: '77" TV', width: 67.8, height: 39.0, depth: 2.3 },
    { label: '83" TV', width: 73.0, height: 42.1, depth: 2.4 },
    { label: '85" TV', width: 74.5, height: 42.9, depth: 2.9 },
    { label: '98" TV', width: 86.0, height: 49.5, depth: 3.5 },
  ],
  panel: [
    { label: 'Slat panel 24 × 96', width: 24, height: 96, depth: 1 },
    { label: 'Slat panel 48 × 96', width: 48, height: 96, depth: 1 },
    { label: 'Half panel 24 × 48', width: 24, height: 48, depth: 1 },
    { label: 'Full sheet 48 × 96', width: 48, height: 96, depth: 0.75 },
    { label: 'Wide accent 96 × 48', width: 96, height: 48, depth: 1 },
  ],
  console: [
    { label: '60" console', width: 60, height: 22, depth: 16 },
    { label: '70" console', width: 70, height: 24, depth: 16 },
    { label: '80" console', width: 80, height: 26, depth: 18 },
    { label: '96" low console', width: 96, height: 20, depth: 16 },
    { label: 'BDI Elements 4-door', width: 82.5, height: 24, depth: 20 },
  ],
  base: [
    { label: '60" base', width: 60, height: 4.75, depth: 20 },
    { label: '48" base', width: 48, height: 4.75, depth: 20 },
    { label: '72" base', width: 72, height: 4.75, depth: 20 },
    { label: '60" tall base', width: 60, height: 8, depth: 20 },
  ],
  rack: [
    { label: '12U rack', width: 21.5, height: 24, depth: 22 },
    { label: '20U rack', width: 21.5, height: 38, depth: 22 },
    { label: '30U rack', width: 21.5, height: 56, depth: 24 },
    { label: '42U rack', width: 23.6, height: 78.7, depth: 39.4 },
  ],
  speaker: [
    { label: 'Small bookshelf', width: 7, height: 12, depth: 10 },
    { label: 'Large bookshelf', width: 8.5, height: 15, depth: 12 },
    { label: 'Slim tower', width: 8, height: 40, depth: 12 },
    { label: 'Large tower', width: 11, height: 45, depth: 16 },
    { label: 'Heritage floorstander', width: 25.3, height: 38.1, depth: 15.5 },
    { label: 'Center channel', width: 24, height: 8, depth: 12 },
    { label: 'Soundbar', width: 45, height: 2.5, depth: 4.5 },
  ],
  subwoofer: [
    { label: '10" sub', width: 14, height: 15, depth: 15 },
    { label: '12" sub', width: 16, height: 17, depth: 17 },
    { label: '15" sub', width: 20, height: 22, depth: 22 },
    { label: '18" sub', width: 24, height: 26, depth: 26 },
  ],
}
