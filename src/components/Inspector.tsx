import { useProject, useSelectedItem, useStore } from '../lib/store'
import { isFloorItem, typeInfo } from '../lib/types'
import { PRESETS } from '../lib/presets'
import { edges, measure } from '../lib/geometry'
import { formatInches } from '../lib/units'
import { DimInput, Field } from './inputs'

export function Inspector() {
  const project = useProject()
  const item = useSelectedItem()
  const { updateItem, removeItem, duplicateItem, mirrorItem, centerItem } = useStore()

  if (!project || !item) {
    return (
      <aside className="inspector">
        <section>
          <h2>Selection</h2>
          <p className="muted">Click an object in the scene or list to edit it. Drag objects to move them.</p>
          <p className="muted">Keys: arrows nudge by one grid step (Shift for 4×). Delete removes. Escape deselects.</p>
        </section>
      </aside>
    )
  }

  const floor = isFloorItem(item)
  const e = edges(item)
  const m = measure(item, project)
  const set = (patch: Parameters<typeof updateItem>[1]) => updateItem(item.id, patch)

  return (
    <aside className="inspector">
      <section>
        <h2>{typeInfo(item.type).label}</h2>
        <Field label="Name"><input type="text" value={item.name} onChange={(ev) => set({ name: ev.target.value })} /></Field>
        <Field label="Preset">
          <select value="" onChange={(ev) => { const p = PRESETS[item.type][parseInt(ev.target.value, 10)]; if (p) set({ width: p.width, height: p.height, depth: p.depth }) }}>
            <option value="">Apply a size…</option>
            {PRESETS[item.type].map((p, i) => (
              <option key={p.label} value={i}>{p.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Color"><input type="color" value={item.color} onChange={(ev) => set({ color: ev.target.value })} /></Field>
      </section>

      <section>
        <h2>Size</h2>
        <Field label="Width"><DimInput value={item.width} min={0.25} onChange={(v) => set({ width: v })} /></Field>
        <Field label="Height"><DimInput value={item.height} min={0.25} onChange={(v) => set({ height: v })} /></Field>
        <Field label="Depth"><DimInput value={item.depth} min={0.25} onChange={(v) => set({ depth: v })} /></Field>
      </section>

      <section>
        <h2>Position</h2>
        <Field label="Center from left"><DimInput value={item.x} onChange={(v) => set({ x: v })} /></Field>
        <Field label="Left edge"><DimInput value={e.left} onChange={(v) => set({ x: v + (item.x - e.left) })} /></Field>
        <Field label="Right edge"><DimInput value={e.right} onChange={(v) => set({ x: v - (e.right - item.x) })} /></Field>
        {floor ? (
          <>
            <Field label="Back from wall" hint="Distance from the wall face to the back of the object"><DimInput value={e.back} min={0} onChange={(v) => set({ z: v + (item.z - e.back) })} /></Field>
            <Field label="Bottom elevation"><DimInput value={item.y} onChange={() => {}} disabled title="Floor items rest on the floor or on the object beneath them" /></Field>
          </>
        ) : (
          <>
            <Field label="Bottom elevation"><DimInput value={item.y} min={0} onChange={(v) => set({ y: v })} /></Field>
            <Field label="Center elevation"><DimInput value={item.y + item.height / 2} onChange={(v) => set({ y: v - item.height / 2 })} /></Field>
            <Field label="Mount gap" hint="Space between the wall and the back of the TV"><DimInput value={item.mountGap} min={0} onChange={(v) => set({ mountGap: v })} /></Field>
          </>
        )}
        <Field label="Rotation (°)">
          <input type="number" step={1} value={item.rotation} onChange={(ev) => set({ rotation: parseFloat(ev.target.value) || 0 })} />
        </Field>
      </section>

      <section>
        <h2>Measurements</h2>
        <dl className="measures">
          <dt>Gap to wall left</dt><dd className={m.leftGap < 0 ? 'bad' : ''}>{formatInches(m.leftGap)}</dd>
          <dt>Gap to wall right</dt><dd className={m.rightGap < 0 ? 'bad' : ''}>{formatInches(m.rightGap)}</dd>
          {m.leftNeighbor && (<><dt>Gap to {m.leftNeighbor.item.name}</dt><dd className={m.leftNeighbor.gap < 0 ? 'bad' : ''}>{formatInches(m.leftNeighbor.gap)}</dd></>)}
          {m.rightNeighbor && (<><dt>Gap to {m.rightNeighbor.item.name}</dt><dd className={m.rightNeighbor.gap < 0 ? 'bad' : ''}>{formatInches(m.rightNeighbor.gap)}</dd></>)}
          <dt>Top elevation</dt><dd>{formatInches(m.top)}</dd>
          <dt>Front from wall</dt><dd>{formatInches(m.front)}</dd>
          <dt>Offset from wall center</dt><dd>{formatInches(item.x - project.wall.width / 2)}</dd>
          {floor && <><dt>Resting on</dt><dd>{m.restingOn ? m.restingOn.name : 'Floor'}</dd></>}
        </dl>
      </section>

      <section>
        <h2>Actions</h2>
        <div className="row buttons">
          <button onClick={() => centerItem(item.id)} title="Center on the wall">Center</button>
          <button onClick={() => mirrorItem(item.id)} title="Duplicate mirrored across the wall centerline">Mirror</button>
          <button onClick={() => duplicateItem(item.id)}>Duplicate</button>
        </div>
        <div className="row buttons">
          <button className="danger" onClick={() => removeItem(item.id)}>Delete</button>
        </div>
      </section>
    </aside>
  )
}
