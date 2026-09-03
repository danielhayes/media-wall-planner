import * as THREE from 'three'
import type { PlankDirection, PlankPreset } from './types'

/** Length (inches) of one texture repeat along the planks */
export const PLANK_TILE_LENGTH = 96
/** Planks per repeat across the planks */
const ROWS = 8
const SIZE = 1024

function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shade(base: THREE.Color, dl: number, ds = 0) {
  const hsl = { h: 0, s: 0, l: 0 }
  base.getHSL(hsl)
  return new THREE.Color().setHSL(hsl.h, Math.max(0, Math.min(1, hsl.s + ds)), Math.max(0, Math.min(1, hsl.l + dl)))
}

const cache = new Map<string, THREE.CanvasTexture>()

export interface PlankTile {
  texture: THREE.CanvasTexture
  /** Inches covered by one repeat in U (world x) and V (world z) */
  tileU: number
  tileV: number
}

/**
 * Procedural plank flooring: staggered boards with per-board color, grain, seams and
 * optional knots. Drawn with the planks running along canvas X, then rotated for
 * the "across" direction so the tile stays seamless in both orientations.
 */
export function plankTexture(preset: PlankPreset, plankWidth: number, direction: PlankDirection): PlankTile {
  const key = `${preset.id}|${plankWidth}|${direction}`
  const tileAlong = PLANK_TILE_LENGTH
  const tileAcross = ROWS * plankWidth
  const cached = cache.get(key)
  if (cached) return direction === 'along' ? { texture: cached, tileU: tileAlong, tileV: tileAcross } : { texture: cached, tileU: tileAcross, tileV: tileAlong }

  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')!
  // Draw in "along" orientation into an offscreen canvas, then rotate if needed.
  const work = direction === 'along' ? canvas : document.createElement('canvas')
  work.width = SIZE
  work.height = SIZE
  const g = work.getContext('2d')!
  const sx = SIZE / tileAlong // px per inch along the planks
  const sy = SIZE / tileAcross // px per inch across
  const base = new THREE.Color(preset.color)
  const rand = mulberry32(base.getHex() * 7 + Math.round(plankWidth * 13))

  g.fillStyle = preset.color
  g.fillRect(0, 0, SIZE, SIZE)

  for (let row = 0; row < ROWS; row++) {
    const y0 = row * plankWidth * sy
    const y1 = (row + 1) * plankWidth * sy
    // Board joints along this row, with a random start so rows stagger.
    const bounds: number[] = []
    let x = rand() * 40
    while (x < tileAlong) {
      bounds.push(x)
      x += 30 + rand() * 40
    }
    const segments = bounds.map((b, i) => [b, i + 1 < bounds.length ? bounds[i + 1] : tileAlong + bounds[0]] as const)
    segments.forEach(([a, b]) => {
      const boardSeed = rand()
      const boardRand = mulberry32(Math.floor(boardSeed * 1e9))
      const dl = (boardRand() - 0.5) * 2 * preset.variation
      const boardColor = shade(base, dl, (boardRand() - 0.5) * 0.06)
      const pieces: [number, number][] = b <= tileAlong ? [[a, b]] : [[a, tileAlong], [0, b - tileAlong]]
      for (const [pa, pb] of pieces) {
        const px0 = pa * sx
        const px1 = pb * sx
        g.save()
        g.beginPath()
        g.rect(px0, y0, px1 - px0, y1 - y0)
        g.clip()
        g.fillStyle = `#${boardColor.getHexString()}`
        g.fillRect(px0, y0, px1 - px0, y1 - y0)
        // Grain streaks along the board, positioned relative to the board start so
        // a board split by the tile edge stays continuous.
        const streakRand = mulberry32(Math.floor(boardSeed * 1e9) + 1)
        const streaks = 18 + Math.floor(preset.grain * 30)
        const boardLen = b - a
        for (let i = 0; i < streaks; i++) {
          const light = streakRand() < 0.4
          const amt = (light ? 1 : -1) * (0.02 + streakRand() * 0.09) * preset.grain
          const c = shade(boardColor, amt)
          g.strokeStyle = `#${c.getHexString()}`
          g.globalAlpha = 0.25 + streakRand() * 0.45
          g.lineWidth = 0.6 + streakRand() * 2.2
          const yBase = y0 + streakRand() * (y1 - y0)
          const wobble = (1 + streakRand() * 5) * sy * 0.15
          const freq = 80 + streakRand() * 240
          const phase = streakRand() * Math.PI * 2
          g.beginPath()
          for (let t = 0; t <= boardLen; t += 1.5) {
            const wx = (a + t) * sx - (pa === 0 && a !== 0 ? tileAlong * sx : 0)
            const wy = yBase + Math.sin((t * sx) / freq + phase) * wobble
            if (t === 0) g.moveTo(wx, wy)
            else g.lineTo(wx, wy)
          }
          g.stroke()
        }
        g.globalAlpha = 1
        // Knots
        if (preset.knots && streakRand() < 0.35) {
          const kx = (a + 8 + streakRand() * Math.max(1, boardLen - 16)) * sx - (pa === 0 && a !== 0 ? tileAlong * sx : 0)
          const ky = y0 + (0.3 + streakRand() * 0.4) * (y1 - y0)
          const kr = (0.35 + streakRand() * 0.5) * sy
          const ring = shade(boardColor, -0.08)
          const core = shade(boardColor, -0.22, 0.05)
          g.fillStyle = `#${ring.getHexString()}`
          g.beginPath()
          g.ellipse(kx, ky, kr * 1.6, kr, 0, 0, Math.PI * 2)
          g.fill()
          g.fillStyle = `#${core.getHexString()}`
          g.beginPath()
          g.ellipse(kx, ky, kr * 0.9, kr * 0.55, 0, 0, Math.PI * 2)
          g.fill()
        }
        g.restore()
        // Joint line at the true board end (not where the tile edge cuts a board)
        if (pb < tileAlong) {
          g.fillStyle = 'rgba(0,0,0,0.45)'
          g.fillRect(pb * sx - 1, y0, 2, y1 - y0)
        }
      }
    })
    // Seam between rows: dark line with a lighter bevel above it
    g.fillStyle = 'rgba(0,0,0,0.5)'
    g.fillRect(0, y1 - 1.5, SIZE, 2)
    g.fillStyle = 'rgba(255,255,255,0.08)'
    g.fillRect(0, y0, SIZE, 1)
  }

  if (direction === 'across') {
    ctx.translate(SIZE / 2, SIZE / 2)
    ctx.rotate(Math.PI / 2)
    ctx.drawImage(work, -SIZE / 2, -SIZE / 2)
    ctx.setTransform(1, 0, 0, 1, 0, 0)
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  cache.set(key, texture)
  return direction === 'along' ? { texture, tileU: tileAlong, tileV: tileAcross } : { texture, tileU: tileAcross, tileV: tileAlong }
}

const imageCache = new Map<string, Promise<THREE.Texture>>()

/**
 * Load a user-supplied floor photo (data URL) as a repeating texture, optionally
 * rotated a quarter turn so its planks run the other way.
 */
export function imageTexture(dataUrl: string, rotated: boolean): Promise<THREE.Texture> {
  const key = `${rotated ? 'r|' : '|'}${dataUrl}`
  const cached = imageCache.get(key)
  if (cached) return cached
  const promise = new Promise<THREE.Texture>((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = rotated ? img.height : img.width
      canvas.height = rotated ? img.width : img.height
      const ctx = canvas.getContext('2d')!
      if (rotated) {
        ctx.translate(canvas.width / 2, canvas.height / 2)
        ctx.rotate(Math.PI / 2)
        ctx.drawImage(img, -img.width / 2, -img.height / 2)
      } else {
        ctx.drawImage(img, 0, 0)
      }
      const tex = new THREE.CanvasTexture(canvas)
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping
      tex.colorSpace = THREE.SRGBColorSpace
      tex.anisotropy = 8
      resolve(tex)
    }
    img.onerror = () => reject(new Error('Could not decode image'))
    img.src = dataUrl
  })
  imageCache.set(key, promise)
  return promise
}
