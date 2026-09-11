import * as THREE from 'three'
import type { GrainStyle } from './types'

/** Small deterministic PRNG so a given color always produces the same grain. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const woodCache = new Map<string, THREE.CanvasTexture>()
const grillCache = new Map<string, THREE.CanvasTexture>()
/** Photographic veneer swatches keyed by wood color, loaded from /woods/<id>.jpg when present */
const swatches = new Map<string, HTMLImageElement>()
let version = 0

/** Nominal size (inches) covered by one wood grain tile. */
export const WOOD_TILE = { w: 24, h: 60 }
/** Nominal size (inches) covered by one grill weave tile. */
export const GRILL_TILE = 1.5
/** Real-world width (inches) a square swatch photo is assumed to cover */
const SWATCH_INCHES = 24

const DEFAULT_STYLE: GrainStyle = { contrast: 1, arches: true }

/** Increments whenever a swatch is registered; include it in cache keys derived from wood textures. */
export function woodVersion() {
  return version
}

/** Use a photo for this wood color instead of procedural grain. */
export function setWoodSwatch(color: string, image: HTMLImageElement) {
  swatches.set(color, image)
  for (const key of [...woodCache.keys()]) if (key.startsWith(`${color}|`)) woodCache.delete(key)
  version++
}

/**
 * Try to load /woods/<id>.jpg (or .png) for each wood. Files are optional; when one is
 * present it replaces the procedural grain for that wood. Calls `onLoaded` after each hit.
 */
export function loadWoodSwatches(entries: { id: string; color: string }[], onLoaded: () => void) {
  for (const { id, color } of entries) {
    const tryExt = (exts: string[]) => {
      if (!exts.length) return
      const img = new Image()
      img.onload = () => {
        setWoodSwatch(color, img)
        onLoaded()
      }
      img.onerror = () => tryExt(exts.slice(1))
      img.src = `${import.meta.env.BASE_URL}woods/${id}.${exts[0]}`
    }
    tryExt(['jpg', 'jpeg', 'png'])
  }
}

/**
 * Vertical wood grain on a base color, or the registered swatch photo tiled at real scale.
 * Procedural grain: fine streaks that wander like veneer figure, broad soft bands, and
 * optional cathedral arches.
 */
export function woodTexture(base: string, style: GrainStyle = DEFAULT_STYLE): THREE.CanvasTexture {
  const key = `${base}|${style.contrast}|${style.arches}`
  const cached = woodCache.get(key)
  if (cached) return cached
  const W = 256
  const H = 1024
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  const swatch = swatches.get(base)
  if (swatch) {
    // The swatch covers SWATCH_INCHES square; repeat it up the tile's 60 inches.
    const tileH = (SWATCH_INCHES / WOOD_TILE.h) * H
    for (let y = 0; y < H; y += tileH) ctx.drawImage(swatch, 0, y, W, tileH)
  } else {
    drawGrain(ctx, W, H, base, style)
  }

  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  woodCache.set(key, tex)
  return tex
}

function drawGrain(ctx: CanvasRenderingContext2D, W: number, H: number, base: string, style: GrainStyle) {
  const color = new THREE.Color(base)
  const hsl = { h: 0, s: 0, l: 0 }
  color.getHSL(hsl)
  const c = Math.max(0, style.contrast)
  const tone = (dl: number, ds = 0) =>
    `#${new THREE.Color().setHSL(hsl.h, Math.max(0, Math.min(1, hsl.s + ds)), Math.max(0, Math.min(1, hsl.l + dl))).getHexString()}`
  ctx.fillStyle = base
  ctx.fillRect(0, 0, W, H)
  const rand = mulberry32(color.getHex() + 7)

  // Broad soft bands of slightly different tone (the light/dark stripes of a flitch)
  for (let i = 0; i < 7; i++) {
    const x0 = rand() * W
    const width = 30 + rand() * 90
    const dark = rand() < 0.5
    const g = ctx.createLinearGradient(x0 - width / 2, 0, x0 + width / 2, 0)
    g.addColorStop(0, 'rgba(0,0,0,0)')
    g.addColorStop(0.5, tone((dark ? -0.05 : 0.04) * c, dark ? 0.03 : -0.02))
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.globalAlpha = 0.6
    ctx.fillStyle = g
    ctx.fillRect(x0 - width / 2, 0, width, H)
  }

  // Cathedral arches: nested elongated ellipses whose tops show as arches
  if (style.arches) {
    const groups = 2
    for (let gI = 0; gI < groups; gI++) {
      const cx = W * (0.25 + 0.5 * rand())
      const cy = H * (0.55 + 0.4 * rand())
      const count = 9 + Math.floor(rand() * 8)
      const spread = 10 + rand() * 12
      for (let k = 1; k <= count; k++) {
        const rx = k * spread * (0.55 + rand() * 0.1)
        const ry = k * spread * 3.2
        ctx.strokeStyle = tone(-(0.05 + rand() * 0.06) * c, 0.02)
        ctx.globalAlpha = 0.28 + rand() * 0.25
        ctx.lineWidth = 0.8 + rand() * 1.8
        ctx.beginPath()
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
        ctx.stroke()
      }
    }
  }

  // Fine streaks along the grain
  const streaks = Math.round(160 + 120 * c)
  for (let i = 0; i < streaks; i++) {
    const x0 = rand() * W
    const light = rand() < 0.42
    const amount = (light ? 1 : -1) * (0.015 + rand() * (light ? 0.05 : 0.09)) * c
    ctx.strokeStyle = tone(amount, light ? -0.03 : 0.03)
    ctx.globalAlpha = 0.2 + rand() * 0.4
    ctx.lineWidth = 0.5 + rand() * 2.2
    const wobble = 1 + rand() * 7
    const freq = 80 + rand() * 260
    const phase = rand() * Math.PI * 2
    ctx.beginPath()
    for (let y = 0; y <= H; y += 8) {
      const x = x0 + Math.sin(y / freq + phase) * wobble
      if (y === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
  // Occasional pin knots
  for (let i = 0; i < 2; i++) {
    if (rand() > 0.5) continue
    const kx = rand() * W
    const ky = rand() * H
    ctx.globalAlpha = 0.8
    ctx.fillStyle = tone(-0.18 * c, 0.05)
    ctx.beginPath()
    ctx.ellipse(kx, ky, 2 + rand() * 3, 5 + rand() * 6, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

/** Fine woven grill cloth: a dark ground with a lighter diagonal weave. */
export function grillTexture(base: string): THREE.CanvasTexture {
  const cached = grillCache.get(base)
  if (cached) return cached
  const S = 64
  const canvas = document.createElement('canvas')
  canvas.width = S
  canvas.height = S
  const ctx = canvas.getContext('2d')!
  const color = new THREE.Color(base)
  const dark = color.clone().multiplyScalar(0.45)
  const light = color.clone().lerp(new THREE.Color('#ffffff'), 0.18)
  ctx.fillStyle = `#${dark.getHexString()}`
  ctx.fillRect(0, 0, S, S)
  const cell = 4
  for (let y = 0; y < S; y += cell) {
    for (let x = 0; x < S; x += cell) {
      const odd = ((x + y) / cell) % 2 === 0
      ctx.fillStyle = odd ? `#${color.getHexString()}` : `#${light.getHexString()}`
      ctx.fillRect(x + (odd ? 0 : 1), y + (odd ? 1 : 0), cell - 1, cell - 1)
    }
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  grillCache.set(base, tex)
  return tex
}

/** A copy of `tex` tiled to cover `w` × `h` inches at the given tile size. */
export function tiled(tex: THREE.Texture, w: number, h: number, tileW: number, tileH: number) {
  const t = tex.clone()
  t.repeat.set(Math.max(0.05, w / tileW), Math.max(0.05, h / tileH))
  t.needsUpdate = true
  return t
}
