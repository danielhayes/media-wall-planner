import * as THREE from 'three'
import type { ConsoleFinish, GrainStyle } from './types'
import { woodTexture, woodVersion, WOOD_TILE } from './textures'

/** Dark perforated mesh seen through the facade cutouts */
const MESH_DARK = '#171614'
const MESH_LIGHT = '#2a2825'

const cache = new Map<string, FacadeTile>()

/** Cutout masks traced from door photos in /facades/<finish>.jpg: alpha 255 where the mesh shows */
const masks = new Map<ConsoleFinish, HTMLCanvasElement>()
let maskVersion = 0
/** Fraction of each photo edge that is white margin plus wood frame, cropped away */
const PHOTO_INSET: Record<string, [number, number, number, number]> = {
  // left, right, top, bottom
  weave: [0.044, 0.036, 0.04, 0.036],
  constellation: [0.039, 0.036, 0.04, 0.036],
  tune: [0.037, 0.037, 0.039, 0.037],
}

/**
 * Load the facade door photos if present and trace their cutouts: neutral dark pixels are
 * the mesh, anything brown is wood. Missing photos leave the procedural patterns in use.
 */
export function loadFacadeMasks(onLoaded: () => void) {
  for (const finish of ['weave', 'constellation', 'tune'] as ConsoleFinish[]) {
    const img = new Image()
    img.onload = () => {
      const [l, r, t, b] = PHOTO_INSET[finish]
      const sx = Math.round(img.width * l)
      const sy = Math.round(img.height * t)
      const sw = Math.round(img.width * (1 - l - r))
      const sh = Math.round(img.height * (1 - t - b))
      const size = 1024
      const src = document.createElement('canvas')
      src.width = src.height = size
      const g = src.getContext('2d')!
      g.drawImage(img, sx, sy, sw, sh, 0, 0, size, size)
      const data = g.getImageData(0, 0, size, size)
      const d = data.data
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i]
        const gr = d[i + 1]
        const bl = d[i + 2]
        const lum = 0.299 * r + 0.587 * gr + 0.114 * bl
        const chroma = Math.max(r, gr, bl) - Math.min(r, gr, bl)
        const mesh = lum < 62 && chroma < 34
        d[i] = d[i + 1] = d[i + 2] = 0
        d[i + 3] = mesh ? 255 : 0
      }
      g.putImageData(data, 0, 0)
      masks.set(finish, src)
      maskVersion++
      cache.clear()
      onLoaded()
    }
    img.onerror = () => undefined
    img.src = `${import.meta.env.BASE_URL}facades/${finish}.jpg`
  }
}

/**
 * Composite a traced mask over wood at real scale. The photo covers one door, so the tile
 * is a square the height of the facade; wider facades repeat it horizontally.
 */
function fromMask(mask: HTMLCanvasElement, wood: string, style: GrainStyle, facadeH: number): FacadeTile {
  const size = mask.width
  const inches = Math.max(4, facadeH)
  const ppi = size / inches
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = woodFill(ctx, wood, style, ppi)
  ctx.fillRect(0, 0, size, size)
  // Mesh where the mask is opaque
  const layer = document.createElement('canvas')
  layer.width = layer.height = size
  const lg = layer.getContext('2d')!
  lg.fillStyle = meshFill(lg, ppi)
  lg.fillRect(0, 0, size, size)
  lg.globalCompositeOperation = 'destination-in'
  lg.drawImage(mask, 0, 0)
  ctx.drawImage(layer, 0, 0)
  // Soft shadow just inside the cutout edges so the wood reads as raised
  const shadow = document.createElement('canvas')
  shadow.width = shadow.height = size
  const sg = shadow.getContext('2d')!
  sg.filter = `blur(${Math.max(1, 0.05 * ppi)}px)`
  sg.drawImage(mask, 0, 0)
  sg.filter = 'none'
  sg.globalCompositeOperation = 'destination-in'
  sg.drawImage(mask, 0, 0)
  ctx.globalAlpha = 0.55
  ctx.globalCompositeOperation = 'multiply'
  ctx.drawImage(shadow, 0, 0)
  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = 1
  return { texture: toTexture(canvas), tileW: inches, tileH: inches }
}

export interface FacadeTile {
  texture: THREE.CanvasTexture
  /** Inches covered by one repeat horizontally and vertically */
  tileW: number
  tileH: number
}

/** Fill style that paints the wood grain at real scale (`ppi` canvas pixels per inch). */
function woodFill(ctx: CanvasRenderingContext2D, wood: string, style: GrainStyle, ppi: number) {
  const canvas = woodTexture(wood, style).image as HTMLCanvasElement
  const pattern = ctx.createPattern(canvas, 'repeat')!
  pattern.setTransform(new DOMMatrix().scale((ppi * WOOD_TILE.w) / canvas.width, (ppi * WOOD_TILE.h) / canvas.height))
  return pattern
}

/** Fine dark weave for the mesh behind the cutouts. */
function meshFill(ctx: CanvasRenderingContext2D, ppi: number) {
  const c = document.createElement('canvas')
  c.width = c.height = 8
  const g = c.getContext('2d')!
  g.fillStyle = MESH_DARK
  g.fillRect(0, 0, 8, 8)
  g.fillStyle = MESH_LIGHT
  g.fillRect(0, 0, 3, 3)
  g.fillRect(4, 4, 3, 3)
  const pattern = ctx.createPattern(c, 'repeat')!
  const px = Math.max(1, ppi * 0.08) / 8 // one weave cell is about 0.08"
  pattern.setTransform(new DOMMatrix().scale(px, px))
  return pattern
}

/**
 * Constellation: cells in 2 × 2 blocks. Each cell's corner that faces the block center is
 * heavily rounded while the other corners stay tight, so the wood bars form a four-point
 * star at every other intersection. One tile is one 2 × 2 block.
 */
function constellation(wood: string, style: GrainStyle, scale: number): FacadeTile {
  const pitch = 2.7 * scale
  const bar = 0.3 * scale
  const size = 512
  const tile = pitch * 2
  const ppi = size / tile
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = woodFill(ctx, wood, style, ppi)
  ctx.fillRect(0, 0, size, size)
  const mesh = meshFill(ctx, ppi)
  const big = 0.62 * pitch * ppi
  const small = 0.12 * pitch * ppi
  const half = (bar / 2) * ppi
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 2; col++) {
      const x = col * pitch * ppi + half
      const y = row * pitch * ppi + half
      const w = pitch * ppi - bar * ppi
      // Corner radii clockwise from top-left; the one pointing at the block center is large
      const tl = row === 1 && col === 1 ? big : small
      const tr = row === 1 && col === 0 ? big : small
      const br = row === 0 && col === 0 ? big : small
      const bl = row === 0 && col === 1 ? big : small
      const path = () => {
        ctx.beginPath()
        ctx.moveTo(x + tl, y)
        ctx.arcTo(x + w, y, x + w, y + w, tr)
        ctx.arcTo(x + w, y + w, x, y + w, br)
        ctx.arcTo(x, y + w, x, y, bl)
        ctx.arcTo(x, y, x + w, y, tl)
        ctx.closePath()
      }
      path()
      ctx.fillStyle = mesh
      ctx.fill()
      ctx.save()
      path()
      ctx.clip()
      ctx.lineWidth = 0.12 * ppi
      ctx.strokeStyle = 'rgba(0,0,0,0.6)'
      path()
      ctx.stroke()
      ctx.restore()
    }
  }
  return { texture: toTexture(canvas), tileW: tile, tileH: tile }
}

/**
 * Tune: vertical slats with straight slots between them in the upper part. Below the
 * midline each slat splits into two thin tines that spread apart like a tuning fork, so
 * the slots taper to points at the bottom while dark triangles open inside the forks.
 * Repeats horizontally by one slat pitch; spans the door height.
 */
function tune(wood: string, style: GrainStyle, scale: number, doorH: number): FacadeTile {
  const pitch = 1.6 * scale
  const slot = 0.55 * scale // width of the straight slot
  const tine = 0.22 * scale // width of each fork tine
  const tileW = pitch
  const tileH = Math.max(4, doorH)
  const ppi = 96 / tileW
  const canvas = document.createElement('canvas')
  canvas.width = 96
  canvas.height = Math.min(2048, Math.max(64, Math.round(tileH * ppi)))
  const ctx = canvas.getContext('2d')!
  const sy = canvas.height / tileH
  ctx.fillStyle = woodFill(ctx, wood, style, ppi)
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  const mesh = meshFill(ctx, ppi)
  const margin = 0.3 * scale
  const split = tileH * 0.46 // where the forks begin
  const px = (v: number) => v * ppi
  const py = (v: number) => v * sy
  const dark = (draw: () => void) => {
    ctx.fillStyle = mesh
    draw()
    ctx.fill()
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'
    ctx.lineWidth = Math.max(1, 0.03 * ppi)
    draw()
    ctx.stroke()
  }
  // Slot centered in the tile: straight, then tapering to a point at the bottom
  const cx = pitch / 2
  dark(() => {
    ctx.beginPath()
    ctx.moveTo(px(cx - slot / 2), py(margin + slot / 2))
    ctx.arc(px(cx), py(margin + slot / 2), px(slot / 2), Math.PI, 0)
    ctx.lineTo(px(cx + slot / 2), py(split))
    ctx.lineTo(px(cx), py(tileH - margin))
    ctx.lineTo(px(cx - slot / 2), py(split))
    ctx.closePath()
  })
  // Fork triangles inside the slats at both tile edges (the slat straddles the edge)
  const slatHalf = (pitch - slot) / 2
  for (const sx of [0, pitch]) {
    dark(() => {
      ctx.beginPath()
      ctx.moveTo(px(sx), py(split + 0.4 * scale))
      ctx.lineTo(px(sx + slatHalf - tine), py(tileH - margin))
      ctx.lineTo(px(sx - slatHalf + tine), py(tileH - margin))
      ctx.closePath()
    })
  }
  return { texture: toTexture(canvas), tileW, tileH }
}

/**
 * Weave: vertical bands of thin parallel wood ridges that zigzag up the door. Neighbouring
 * bands are half a period out of phase, so the chevrons interlock like a woven strap.
 */
function weave(wood: string, style: GrainStyle, scale: number): FacadeTile {
  const bandW = 4.4 * scale // width of one zigzag band
  const blockH = 5.6 * scale // rise of one leg of the zigzag
  const pitch = 1.0 * scale // ridge spacing across the band
  const ridge = 0.42 * scale // ridge width
  const seam = 0.35 * scale // dark gap between bands
  const tileW = bandW * 2
  const tileH = blockH * 2
  const size = 512
  const ppiX = size / tileW
  const ppiY = size / tileH
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = meshFill(ctx, ppiX)
  ctx.fillRect(0, 0, size, size)
  const woodPattern = woodFill(ctx, wood, style, ppiX)
  // Horizontal sweep of a ridge over one leg, chosen so legs run at roughly 60 degrees
  const sweep = blockH / Math.tan(Math.PI / 3)
  for (let band = 0; band < 2; band++) {
    const left = band * bandW
    const phase = band % 2 === 1 ? blockH : 0
    ctx.save()
    ctx.beginPath()
    ctx.rect((left + seam / 2) * ppiX, 0, (bandW - seam) * ppiX, size)
    ctx.clip()
    ctx.strokeStyle = woodPattern
    ctx.lineWidth = ridge * ppiX
    ctx.lineJoin = 'round'
    // Enough ridges to cover the band through the full sweep
    for (let x0 = left - sweep; x0 <= left + bandW + pitch; x0 += pitch) {
      ctx.beginPath()
      // Triangle wave: rises `sweep` over blockH, then falls back; period 2 * blockH
      for (let y = -tileH; y <= tileH * 2; y += blockH) {
        const t = ((y + phase) / blockH) % 2
        const up = ((Math.floor((y + phase) / blockH) % 2) + 2) % 2 === 0
        const x = x0 + (up ? 0 : sweep)
        const nx = x0 + (up ? sweep : 0)
        void t
        if (y === -tileH) ctx.moveTo(x * ppiX, y * ppiY)
        ctx.lineTo(nx * ppiX, (y + blockH) * ppiY)
      }
      ctx.stroke()
    }
    // Soft shadow at the band edges so the bands read as separate strips
    ctx.fillStyle = 'rgba(0,0,0,0.45)'
    ctx.fillRect(left * ppiX, 0, Math.max(1, seam * ppiX), size)
    ctx.restore()
  }
  return { texture: toTexture(canvas), tileW, tileH }
}

function toTexture(canvas: HTMLCanvasElement) {
  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return tex
}

/** A repeating facade tile for the given pattern, wood color, scale, and door height (Tune only). */
export function facadeTexture(finish: ConsoleFinish, wood: string, style: GrainStyle, scale: number, doorH: number): FacadeTile | null {
  const mask = masks.get(finish)
  const hKey = finish === 'tune' || mask ? Math.round(doorH * 4) / 4 : 0
  const key = `${finish}|${wood}|${style.contrast}|${style.arches}|${scale}|${hKey}|v${woodVersion()}|m${maskVersion}`
  const cached = cache.get(key)
  if (cached) return cached
  let tile: FacadeTile | null = null
  if (mask) tile = fromMask(mask, wood, style, hKey)
  else if (finish === 'constellation') tile = constellation(wood, style, scale)
  else if (finish === 'tune') tile = tune(wood, style, scale, hKey)
  else if (finish === 'weave') tile = weave(wood, style, scale)
  if (tile) cache.set(key, tile)
  return tile
}
