import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { useStore } from './lib/store'
import { WOODS } from './lib/types'
import { loadWoodSwatches } from './lib/textures'
import { loadFacadeMasks } from './lib/facades'

// Handy for poking at state from the browser console during development.
if (import.meta.env.DEV) (window as unknown as { __store: typeof useStore }).__store = useStore

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Optional photographic veneer: drop public/woods/<wood id>.jpg files and they replace the
// procedural grain, e.g. public/woods/natural-walnut.jpg.
loadWoodSwatches(
  WOODS.map((w) => ({ id: w.wood, color: w.color })),
  () => useStore.getState().bumpTextures(),
)

// Optional door photos: public/facades/{weave,constellation,tune}.jpg are traced into cutout
// masks so the exact patterns render in any wood.
loadFacadeMasks(() => useStore.getState().bumpTextures())
