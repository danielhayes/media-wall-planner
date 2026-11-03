import { useEffect } from 'react'
import { Scene } from './components/Scene'
import { Sidebar } from './components/Sidebar'
import { Inspector } from './components/Inspector'
import { Toolbar } from './components/Toolbar'
import { useProject, useStore } from './lib/store'
import { isFloorItem } from './lib/types'
import { request, saveProject, saveProjectAs } from './lib/fileOps'

export default function App() {
  const project = useProject()
  const dirty = useStore((s) => s.dirty)
  const fileName = useStore((s) => s.fileName)

  // Window title and the close-tab warning follow the file state
  useEffect(() => {
    const name = fileName ? fileName.replace(/\.json$/i, '') : project?.name || 'Untitled'
    document.title = `${dirty ? '• ' : ''}${name} – Media Wall Planner`
  }, [dirty, fileName, project?.name])
  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  // Keyboard nudging and deletion for the selected object
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // File shortcuts work even while typing in a field
      if (e.metaKey || e.ctrlKey) {
        const k = e.key.toLowerCase()
        if (k === 's') {
          e.preventDefault()
          void (e.shiftKey ? saveProjectAs() : saveProject())
          return
        }
        if (k === 'o') {
          e.preventDefault()
          request({ kind: 'open' })
          return
        }
      }
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA')) return
      const s = useStore.getState()
      const p = s.project
      if (e.key === 'm' || e.key === 'M') return s.setMeasureMode(!s.measureMode)
      if (s.selectedMeasurementId && (e.key === 'Delete' || e.key === 'Backspace')) return s.removeMeasurement(s.selectedMeasurementId)
      if (e.key === 'Escape' && s.measureMode && !s.selectedId) return s.setMeasureMode(false)
      const item = p?.items.find((i) => i.id === s.selectedId)
      if (!p || !item) return
      if (e.key === 'Escape') return s.select(null)
      if (e.key === 'Delete' || e.key === 'Backspace') return s.removeItem(item.id)
      if (e.key === 'h' || e.key === 'H') return s.toggleHidden(item.id)
      const step = (p.snap.enabled && p.snap.grid > 0 ? p.snap.grid : 1) * (e.shiftKey ? 4 : 1)
      const floor = isFloorItem(item)
      switch (e.key) {
        case 'ArrowLeft': s.updateItem(item.id, { x: item.x - step }); break
        case 'ArrowRight': s.updateItem(item.id, { x: item.x + step }); break
        case 'ArrowUp': s.updateItem(item.id, floor ? { z: item.z - step } : { y: item.y + step }); break
        case 'ArrowDown': s.updateItem(item.id, floor ? { z: item.z + step } : { y: item.y - step }); break
        default: return
      }
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="app">
      <Sidebar />
      <main className="viewport">
        {project ? (
          <>
            <Toolbar />
            <Scene />
          </>
        ) : (
          <div className="empty">
            <h1>Media Wall Planner</h1>
            <p>Start a new wall or open a saved project file.</p>
            <div className="row buttons">
              <button className="primary" onClick={() => request({ kind: 'new' })}>New project</button>
              <button onClick={() => request({ kind: 'open' })}>Open…</button>
            </div>
          </div>
        )}
      </main>
      <Inspector />
    </div>
  )
}
