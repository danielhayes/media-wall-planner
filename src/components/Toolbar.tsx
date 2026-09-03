import { useState } from 'react'
import { useProject, useStore } from '../lib/store'

export function Toolbar() {
  const project = useProject()
  const { requestView, setProjection, applyToeIn, toggleMeasurements, toggleLabels, toggleShadows } = useStore()
  const projection = useStore((s) => s.projection)
  const showMeasurements = useStore((s) => s.showMeasurements)
  const showLabels = useStore((s) => s.showLabels)
  const showShadows = useStore((s) => s.showShadows)
  const view = useStore((s) => s.viewRequest.view)
  const [toeDraft, setToeDraft] = useState<string | null>(null)
  const toe = toeDraft ?? String(project?.toeIn ?? 0)
  const setToe = setToeDraft
  const apply = () => {
    applyToeIn(parseFloat(toe) || 0)
    setToeDraft(null)
  }
  const speakers = project?.items.filter((i) => i.type === 'speaker').length ?? 0

  return (
    <div className="toolbar">
      <div className="group">
        <span className="group-label">View</span>
        <button className={view === 'top' ? 'active' : ''} onClick={() => requestView('top')}>Top</button>
        <button className={view === 'front' ? 'active' : ''} onClick={() => requestView('front')}>Front</button>
        <button className={view === 'iso' ? 'active' : ''} onClick={() => requestView('iso')}>3D</button>
      </div>
      <div className="group">
        <button
          className={projection === 'orthographic' ? 'active' : ''}
          onClick={() => setProjection(projection === 'orthographic' ? 'perspective' : 'orthographic')}
          title="Orthographic removes perspective so alignments read true, like a floor plan"
        >
          Ortho
        </button>
        <button className={showLabels ? 'active' : ''} onClick={toggleLabels}>Labels</button>
        <button className={showMeasurements ? 'active' : ''} onClick={toggleMeasurements}>Gaps</button>
        <button
          className={showShadows ? 'active' : ''}
          onClick={toggleShadows}
          disabled={view !== 'iso'}
          title={view === 'iso' ? 'Cast shadows' : 'Shadows are only drawn in the 3D view'}
        >
          Shadows
        </button>
      </div>
      <form className="group" onSubmit={(e) => { e.preventDefault(); apply() }}>
        <span className="group-label" title="Angle the left and right speakers toward the wall center">Toe-in</span>
        <input
          type="number"
          step={1}
          min={-45}
          max={45}
          value={toe}
          onChange={(e) => setToe(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); apply() } }}
          style={{ width: 56 }}
        />
        <span className="muted">°</span>
        <button type="submit" disabled={!speakers} title={speakers ? `Rotate ${speakers} speaker(s)` : 'Add speakers first'}>
          Apply
        </button>
      </form>
      <div className="group hint muted">Drag objects to move · drag empty space to orbit · right-drag to pan · scroll to zoom</div>
    </div>
  )
}
