import { useProject, useSelectedItem, useStore } from '../lib/store'
import { WOODS, baseDesign, consoleDesign, isFloorItem, panelDesign, typeInfo } from '../lib/types'
import type { BaseDesign, ConsoleDesign, ConsoleFinish, PanelDesign, PanelPattern, SlatDirection, Wood } from '../lib/types'
import { PRESETS } from '../lib/presets'
import { edges, findSupport, measure } from '../lib/geometry'
import { formatInches } from '../lib/units'
import { DimInput, Field } from './inputs'

export function Inspector() {
  const project = useProject()
  const item = useSelectedItem()
  const { updateItem, removeItem, duplicateItem, mirrorItem, centerItem, alignWithBase } = useStore()

  if (!project || !item) {
    return (
      <aside className="inspector">
        <section>
          <h2>Selection</h2>
          <p className="muted">Click an object in the scene or list to edit it. Drag objects to move them.</p>
          <p className="muted">Keys: arrows nudge by one grid step (Shift for 4×). Delete removes. Escape deselects.</p>
          <p className="muted">Dragging a floor item carries whatever is stacked on it. Hold Alt/Option to drag it alone.</p>
        </section>
      </aside>
    )
  }

  const floor = isFloorItem(item)
  const e = edges(item)
  const m = measure(item, project)
  const hasRiders = item.type === 'base' && project.items.some((o) => findSupport(o, project.items)?.id === item.id)
  const onBase = m.restingOn?.type === 'base'
  const set = (patch: Parameters<typeof updateItem>[1]) => updateItem(item.id, patch)
  const isPanel = item.type === 'panel'
  const design = panelDesign(item)
  const setDesign = (patch: Partial<PanelDesign>) => set({ panel: { ...design, ...patch } })
  const isConsole = item.type === 'console'
  const cons = consoleDesign(item)
  const setCons = (patch: Partial<ConsoleDesign>) => set({ console: { ...cons, ...patch } })
  const isBase = item.type === 'base'
  const base = baseDesign(item)
  const setBase = (patch: Partial<BaseDesign>) => set({ base: { ...base, ...patch } })

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
        <Field label={isPanel ? 'Background color' : isConsole ? 'Body color' : 'Color'}><input type="color" value={item.color} onChange={(ev) => set({ color: ev.target.value })} /></Field>
      </section>

      {isConsole && (
        <section>
          <h2>Console design</h2>
          <Field label="Doors">
            <input type="number" min={0} max={12} step={1} value={cons.doors} onChange={(ev) => setCons({ doors: Math.max(0, Math.min(12, parseInt(ev.target.value, 10) || 0)) })} />
          </Field>
          <Field label="Door reveal" hint="Gap between and around the doors"><DimInput value={cons.doorGap} min={0} onChange={(v) => setCons({ doorGap: v })} /></Field>
          <Field label="Finish">
            <select value={cons.finish} onChange={(ev) => setCons({ finish: ev.target.value as ConsoleFinish })}>
              <option value="plain">Plain doors</option>
              <option value="slats-horizontal">Horizontal wood slats</option>
              <option value="slats-vertical">Vertical wood slats</option>
            </select>
          </Field>
          {cons.finish !== 'plain' && (
            <>
              <Field label="Wood">
                <select value={cons.wood} onChange={(ev) => setCons({ wood: ev.target.value as Wood })}>
                  {WOODS.map((w) => (
                    <option key={w.wood} value={w.wood}>{w.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Slat width"><DimInput value={cons.slatWidth} min={0.125} onChange={(v) => setCons({ slatWidth: v })} /></Field>
              <Field label="Slat spacing"><DimInput value={cons.slatGap} min={0} onChange={(v) => setCons({ slatGap: v })} /></Field>
              <p className="muted">Slats cover the doors and both sides of the console.</p>
            </>
          )}
          <Field label="Top color">
            <span className="top-color">
              <input type="color" value={cons.topColor ?? item.color} disabled={cons.topColor === null} onChange={(ev) => setCons({ topColor: ev.target.value })} />
              <label className="check" title="Use the body color for the top">
                <input type="checkbox" checked={cons.topColor === null} onChange={(ev) => setCons({ topColor: ev.target.checked ? null : item.color })} />
                <span>Match</span>
              </label>
            </span>
          </Field>
        </section>
      )}

      {isBase && (
        <section>
          <h2>Base frame</h2>
          <Field label="Member thickness" hint="Width of a frame member as seen from the front"><DimInput value={base.thickness} min={0.25} onChange={(v) => setBase({ thickness: v })} /></Field>
          <Field label="Member depth" hint="Front-to-back depth of the posts and top rails"><DimInput value={base.memberDepth} min={0.25} onChange={(v) => setBase({ memberDepth: v })} /></Field>
          <p className="muted">Drop a console over the base and it rests on top. Releasing either one centers them. Moving the base carries the console; hold Alt/Option while dragging to move it alone.</p>
        </section>
      )}

      {isPanel && (
        <section>
          <h2>Panel design</h2>
          <Field label="Pattern">
            <select value={design.pattern} onChange={(ev) => setDesign({ pattern: ev.target.value as PanelPattern })}>
              <option value="solid">Solid</option>
              <option value="vertical">Slats · vertical</option>
              <option value="horizontal">Slats · horizontal</option>
              <option value="diagonal">Slats · diagonal</option>
            </select>
          </Field>
          {design.pattern === 'diagonal' && (
            <Field label="Direction" hint="Mirror a panel to flip this and form a chevron">
              <select value={design.slatDirection} onChange={(ev) => setDesign({ slatDirection: ev.target.value as SlatDirection })}>
                <option value="up-right">Up to the right ⟋</option>
                <option value="up-left">Up to the left ⟍</option>
              </select>
            </Field>
          )}
          <Field label="Edge banding" hint="Width of the border strip around the front. 0 for none."><DimInput value={design.edgeWidth} min={0} onChange={(v) => setDesign({ edgeWidth: v })} /></Field>
          <Field label="Edge color"><input type="color" value={design.edgeColor} onChange={(ev) => setDesign({ edgeColor: ev.target.value })} /></Field>
          {design.pattern !== 'solid' && (
            <>
              <Field label="Slat width"><DimInput value={design.slatWidth} min={0.125} onChange={(v) => setDesign({ slatWidth: v })} /></Field>
              <Field label="Slat spacing"><DimInput value={design.slatGap} min={0} onChange={(v) => setDesign({ slatGap: v })} /></Field>
              <Field label="Slat relief" hint="How far the slats stand out from the background"><DimInput value={design.slatRelief} min={0} onChange={(v) => setDesign({ slatRelief: v })} /></Field>
              <Field label="Slat color"><input type="color" value={design.slatColor} onChange={(ev) => setDesign({ slatColor: ev.target.value })} /></Field>
            </>
          )}
        </section>
      )}

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
            <Field label="Mount gap" hint={isPanel ? 'Space between the wall and the back of the panel' : 'Space between the back of the item and the wall, or a panel behind it'}><DimInput value={item.mountGap} min={0} onChange={(v) => set({ mountGap: v })} /></Field>
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
          {hasRiders && <button onClick={() => alignWithBase(item.id)} title="Center this base under what is resting on it">Center under</button>}
          {onBase && <button onClick={() => alignWithBase(item.id)} title="Center this on the base it rests on">Center on base</button>}
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
