import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { useStore } from './lib/store'

// Handy for poking at state from the browser console during development.
if (import.meta.env.DEV) (window as unknown as { __store: typeof useStore }).__store = useStore

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
