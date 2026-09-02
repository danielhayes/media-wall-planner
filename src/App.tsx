import { useEffect } from 'react'
import { Scene } from './components/Scene'
import { Sidebar } from './components/Sidebar'
import { Inspector } from './components/Inspector'
import { Toolbar } from './components/Toolbar'
import { useProject, useStore } from './lib/store'
import { isFloorItem } from './lib/types'

export default function App() {
  const project = useProject()
  const createProject = useStore((s) => s.createProject)

  // Keyboard nudging and deletion for the selected object
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA')) return
      const s = useStore.getState()
      const p = s.currentId ? s.projects[s.currentId] : null
      const item = p?.items.find((i) => i.id === s.selectedId)
      if (!p || !item) return
      if (e.key === 'Escape') return s.select(null)
      if (e.key === 'Delete' || e.key === 'Backspace') return s.removeItem(item.id)
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
            <p>Create a project to start laying out your wall.</p>
            <button className="primary" onClick={() => createProject('New wall')}>New project</button>
          </div>
        )}
      </main>
      <Inspector />
    </div>
  )
}
