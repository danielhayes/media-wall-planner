import { useRef, useState } from 'react'
import { useProject, useStore } from '../lib/store'
import { ITEM_TYPES, PLANK_PRESETS, floorDesign, typeInfo } from '../lib/types'
import type { FloorDesign, ItemType } from '../lib/types'
import { PRESETS } from '../lib/presets'
import { Check, DimInput, Field } from './inputs'
import { formatInches } from '../lib/units'

const GRID_OPTIONS = [0.125, 0.25, 0.5, 1, 2, 3, 4, 6, 12]

export function Sidebar() {
  const project = useProject()
  const projects = useStore((s) => s.projects)
  const {
    createProject, deleteProject, selectProject, renameProject, importProject,
    updateWall, updateProject, updateSnap, updateFloor, addItem, select, toggleHidden,
  } = useStore()
  const floorFileRef = useRef<HTMLInputElement>(null)
  const [floorError, setFloorError] = useState<string | null>(null)
  const floor = project ? floorDesign(project) : null

  const onFloorImage = (file: File | undefined) => {
    if (!file) return
    if (file.size > 3 * 1024 * 1024) {
      setFloorError('Please use an image under 3 MB; it is stored with the project.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      updateFloor({ imageData: String(reader.result), finish: 'image' })
      setFloorError(null)
    }
    reader.onerror = () => setFloorError('Could not read that image.')
    reader.readAsDataURL(file)
    if (floorFileRef.current) floorFileRef.current.value = ''
  }
  const selectedId = useStore((s) => s.selectedId)
  const [addType, setAddType] = useState<ItemType>('tv')
  const [addPreset, setAddPreset] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const onExport = async () => {
    if (!project) return
    const json = JSON.stringify(project, null, 2)
    const suggestedName = `${project.name.replace(/[^\w-]+/g, '_')}.json`
    // Chrome and Edge: a real save dialog via the File System Access API.
    // Other browsers, and users who cancel, fall through to a plain download.
    const picker = (window as unknown as { showSaveFilePicker?: (o: unknown) => Promise<FileSystemFileHandle> }).showSaveFilePicker
    if (picker) {
      try {
        const handle = await picker.call(window, {
          suggestedName,
          types: [{ description: 'Media wall project', accept: { 'application/json': ['.json'] } }],
        })
        const writable = await handle.createWritable()
        await writable.write(json)
        await writable.close()
        return
      } catch (err) {
        if ((err as DOMException).name === 'AbortError') return
        // Picker unavailable in this context; use the download fallback.
      }
    }
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = suggestedName
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

          {floor && (
            <section>
              <h2>Floor</h2>
              <Field label="Finish">
                <select value={floor.finish} onChange={(e) => updateFloor({ finish: e.target.value as FloorDesign['finish'] })}>
                  <option value="color">Solid color</option>
                  <option value="planks">Hardwood planks</option>
                  <option value="image">Custom image</option>
                </select>
              </Field>
              {floor.finish === 'color' && (
                <Field label="Color"><input type="color" value={floor.color} onChange={(e) => updateFloor({ color: e.target.value })} /></Field>
              )}
              {floor.finish === 'planks' && (
                <>
                  <Field label="Wood">
                    <select value={floor.plank} onChange={(e) => updateFloor({ plank: e.target.value, plankWidth: null })}>
                      {PLANK_PRESETS.map((p) => (
                        <option key={p.id} value={p.id}>{p.label}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Plank width">
                    <DimInput
                      value={floor.plankWidth ?? (PLANK_PRESETS.find((p) => p.id === floor.plank)?.plankWidth ?? 7)}
                      min={2}
                      onChange={(v) => updateFloor({ plankWidth: v })}
                    />
                  </Field>
                </>
              )}
              {floor.finish === 'image' && (
                <>
                  <div className="row buttons">
                    <button onClick={() => floorFileRef.current?.click()}>{floor.imageData ? 'Replace image' : 'Choose image…'}</button>
                    {floor.imageData && <button onClick={() => updateFloor({ imageData: null })}>Clear</button>}
                    <input ref={floorFileRef} type="file" accept="image/*" hidden onChange={(e) => onFloorImage(e.target.files?.[0])} />
                  </div>
                  <Field label="Image covers" hint="Real-world width of one repeat of the image"><DimInput value={floor.imageSize} min={6} onChange={(v) => updateFloor({ imageSize: v })} /></Field>
                  {!floor.imageData && <p className="muted">Pick a seamless floor photo. It is tiled across the floor at the width above.</p>}
                  {floorError && <p className="error">{floorError}</p>}
                </>
              )}
              {floor.finish !== 'color' && (
                <Field label="Direction">
                  <select value={floor.direction} onChange={(e) => updateFloor({ direction: e.target.value as FloorDesign['direction'] })}>
                    <option value="along">Along the wall</option>
                    <option value="across">Out from the wall</option>
                  </select>
                </Field>
              )}
            </section>
          )}

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
                <li key={i.id} className={`${i.id === selectedId ? 'active' : ''}${i.hidden ? ' hidden-item' : ''}`} onClick={() => select(i.id)}>
                  <span className="swatch" style={{ background: i.color }} />
                  <span className="name">{i.name}</span>
                  <span className="muted">{typeInfo(i.type).label}</span>
                  <button
                    className={`eye${i.hidden ? ' off' : ''}`}
                    title={i.hidden ? 'Show in scene' : 'Hide from scene (keeps the object)'}
                    onClick={(e) => { e.stopPropagation(); toggleHidden(i.id) }}
                  >
                    {i.hidden ? '◌' : '◉'}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </aside>
  )
}
