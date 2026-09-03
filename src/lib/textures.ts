import * as THREE from 'three'

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

/** Nominal size (inches) covered by one wood grain tile. */
export const WOOD_TILE = { w: 24, h: 60 }
/** Nominal size (inches) covered by one grill weave tile. */
export const GRILL_TILE = 1.5

/** Vertical wood grain on a base color. Streaks wander gently like veneer figure. */
export function woodTexture(base: string): THREE.CanvasTexture {
  const cached = woodCache.get(base)
  if (cached) return cached
  const W = 256
  const H = 1024
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  const color = new THREE.Color(base)
  const hsl = { h: 0, s: 0, l: 0 }
  color.getHSL(hsl)
  ctx.fillStyle = base
  ctx.fillRect(0, 0, W, H)
  const rand = mulberry32(color.getHex() + 7)
  const streaks = 220
  for (let i = 0; i < streaks; i++) {
    const x0 = rand() * W
    const light = rand() < 0.45
    const amount = (light ? 1 : -1) * (0.02 + rand() * (light ? 0.06 : 0.1))
    const c = new THREE.Color().setHSL(hsl.h, Math.min(1, hsl.s * (light ? 0.9 : 1.1)), Math.max(0, Math.min(1, hsl.l + amount)))
    ctx.strokeStyle = `#${c.getHexString()}`
    ctx.globalAlpha = 0.25 + rand() * 0.4
    ctx.lineWidth = 0.6 + rand() * 3
    const wobble = 2 + rand() * 8
    const freq = 60 + rand() * 200
    const phase = rand() * Math.PI * 2
    ctx.beginPath()
    for (let y = 0; y <= H; y += 8) {
      const x = x0 + Math.sin(y / freq + phase) * wobble
      if (y === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
  // A few broad soft bands for cathedral figure
  for (let i = 0; i < 6; i++) {
    const x0 = rand() * W
    const c = new THREE.Color().setHSL(hsl.h, hsl.s, Math.max(0, Math.min(1, hsl.l - 0.05)))
    const g = ctx.createLinearGradient(x0 - 40, 0, x0 + 40, 0)
    g.addColorStop(0, 'rgba(0,0,0,0)')
    g.addColorStop(0.5, `#${c.getHexString()}`)
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.globalAlpha = 0.35
    ctx.fillStyle = g
    ctx.fillRect(x0 - 40, 0, 80, H)
  }
  ctx.globalAlpha = 1
  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  woodCache.set(base, tex)
  return tex
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
