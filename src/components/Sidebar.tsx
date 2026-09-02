import { useRef, useState } from 'react'
import { useProject, useStore } from '../lib/store'
import { ITEM_TYPES, typeInfo } from '../lib/types'
import type { ItemType } from '../lib/types'
import { PRESETS } from '../lib/presets'
import { Check, DimInput, Field } from './inputs'
import { formatInches } from '../lib/units'

const GRID_OPTIONS = [0.125, 0.25, 0.5, 1, 2, 3, 4, 6, 12]

export function Sidebar() {
  const project = useProject()
  const projects = useStore((s) => s.projects)
  const {
    createProject, deleteProject, selectProject, renameProject, importProject,
    updateWall, updateProject, updateSnap, addItem, select,
  } = useStore()
  const selectedId = useStore((s) => s.selectedId)
  const [addType, setAddType] = useState<ItemType>('tv')
  const [addPreset, setAddPreset] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const onExport = () => {
    if (!project) return
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${project.name.replace(/[^\w-]+/g, '_')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const onImportFile = async (file: File | undefined) => {
    if (!file) return
    const err = importProject(await file.text())
    setImportError(err)
    if (fileRef.current) fileRef.current.value = ''
  }

  const list = Object.values(projects).sort((a, b) => b.updatedAt - a.updatedAt)

  return (
    <aside className="sidebar">
      <section>
        <h2>Project</h2>
        <div className="row">
          <select value={project?.id ?? ''} onChange={(e) => { selectProject(e.target.value); setConfirmDelete(false) }}>
            {list.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        {project && (
          <Field label="Name">
            <input
              type="text"
              value={project.name}
              onChange={(e) => renameProject(project.id, e.target.value)}
              onBlur={(e) => { if (!e.target.value.trim()) renameProject(project.id, 'Untitled wall') }}
            />
          </Field>
        )}
        <div className="row buttons">
          <button onClick={() => { createProject('New wall'); setConfirmDelete(false) }}>New</button>
          {confirmDelete ? (
            <>
              <button className="danger" onClick={() => { if (project) deleteProject(project.id); setConfirmDelete(false) }}>Confirm delete</button>
              <button onClick={() => setConfirmDelete(false)}>Cancel</button>
            </>
          ) : (
            <button disabled={!project} className="danger" onClick={() => setConfirmDelete(true)}>Delete</button>
          )}
        </div>
        <div className="row buttons">
          <button disabled={!project} onClick={onExport}>Export JSON</button>
          <button onClick={() => fileRef.current?.click()}>Import JSON</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => onImportFile(e.target.files?.[0])} />
        </div>
        {importError && <p className="error">{importError}</p>}
      </section>

      {project && (
        <>
          <section>
            <h2>Wall</h2>
            <Field label="Width"><DimInput value={project.wall.width} min={12} onChange={(v) => updateWall({ width: v })} /></Field>
            <Field label="Height"><DimInput value={project.wall.height} min={12} onChange={(v) => updateWall({ height: v })} /></Field>
            <Field label="Floor depth" hint="How far the floor extends out from the wall"><DimInput value={project.floorDepth} min={12} onChange={(v) => updateProject({ floorDepth: v })} /></Field>
            <Field label="Wall color"><input type="color" value={project.wall.color} onChange={(e) => updateWall({ color: e.target.value })} /></Field>
            <Field label="Trim color"><input type="color" value={project.wall.trimColor} onChange={(e) => updateWall({ trimColor: e.target.value })} /></Field>

            <h3><Check label="Baseboard" checked={project.wall.baseboard.enabled} onChange={(v) => updateWall({ baseboard: { ...project.wall.baseboard, enabled: v } })} /></h3>
            {project.wall.baseboard.enabled && (
              <div className="indent">
                <Field label="Height"><DimInput value={project.wall.baseboard.height} min={0.25} onChange={(v) => updateWall({ baseboard: { ...project.wall.baseboard, height: v } })} /></Field>
                <Field label="Thickness"><DimInput value={project.wall.baseboard.depth} min={0} onChange={(v) => updateWall({ baseboard: { ...project.wall.baseboard, depth: v } })} /></Field>
              </div>
            )}
            <h3><Check label="Crown moulding" checked={project.wall.crown.enabled} onChange={(v) => updateWall({ crown: { ...project.wall.crown, enabled: v } })} /></h3>
            {project.wall.crown.enabled && (
              <div className="indent">
                <Field label="Height"><DimInput value={project.wall.crown.height} min={0.25} onChange={(v) => updateWall({ crown: { ...project.wall.crown, height: v } })} /></Field>
                <Field label="Projection"><DimInput value={project.wall.crown.depth} min={0} onChange={(v) => updateWall({ crown: { ...project.wall.crown, depth: v } })} /></Field>
              </div>
            )}
          </section>

          <section>
            <h2>Snap</h2>
            <Check label="Snapping on" checked={project.snap.enabled} onChange={(v) => updateSnap({ enabled: v })} />
            <Field label="Grid">
              <select value={project.snap.grid} onChange={(e) => updateSnap({ grid: parseFloat(e.target.value) })}>
                {GRID_OPTIONS.map((g) => (
                  <option key={g} value={g}>{formatInches(g)}</option>
                ))}
              </select>
            </Field>
            <Check label="Wall centerline" checked={project.snap.centerline} onChange={(v) => updateSnap({ centerline: v })} />
            <Check label="Object centers" checked={project.snap.objectCenters} onChange={(v) => updateSnap({ objectCenters: v })} />
            <Check label="Edge alignment" checked={project.snap.edges} onChange={(v) => updateSnap({ edges: v })} />
            <Field label="Snap distance" hint="How close before a center or edge snaps"><DimInput value={project.snap.threshold} min={0} onChange={(v) => updateSnap({ threshold: v })} /></Field>
          </section>

          <section>
            <h2>Objects</h2>
            <div className="row">
              <select value={addType} onChange={(e) => { setAddType(e.target.value as ItemType); setAddPreset(0) }}>
                {ITEM_TYPES.map((t) => (
                  <option key={t.type} value={t.type}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="row">
              <select value={addPreset} onChange={(e) => setAddPreset(parseInt(e.target.value, 10))}>
                {PRESETS[addType].map((p, i) => (
                  <option key={p.label} value={i}>{p.label} · {formatInches(p.width)} × {formatInches(p.height)} × {formatInches(p.depth)}</option>
                ))}
              </select>
            </div>
            <div className="row buttons">
              <button className="primary" onClick={() => addItem(addType, addPreset)}>Add to wall</button>
            </div>
            <ul className="items">
              {project.items.length === 0 && <li className="muted">No objects yet.</li>}
              {project.items.map((i) => (
                <li key={i.id} className={i.id === selectedId ? 'active' : ''} onClick={() => select(i.id)}>
                  <span className="swatch" style={{ background: i.color }} />
                  <span className="name">{i.name}</span>
                  <span className="muted">{typeInfo(i.type).label}</span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </aside>
  )
}
