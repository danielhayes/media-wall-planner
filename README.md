# Media Wall Planner

A browser-only 3D planner for a residential media wall: a wall-mounted TV, a media
console or equipment rack, floor-standing speakers, and subwoofers. Its purpose is to
check whether everything fits and whether the layout reads symmetrically.

## Run it

```bash
npm install
npm run dev
```

Then open the URL Vite prints (normally http://localhost:5173). `npm run build`
produces a static site in `dist/`.

## How it works

- **Projects** live in the browser's local storage. Use Export / Import JSON to move
  a project between machines or keep a backup.
- **Wall** settings: width, height, color, floor depth, and optional baseboard and
  crown moulding with their sizes. Trim depth keeps floor items from sitting inside it.
- **Objects**: TV, media console, equipment rack, speaker, subwoofer. Pick a size
  preset, then edit width, height, depth, and color per object.
- **Units** are inches. Inputs accept `65`, `65.5`, `65 1/2`, or `5' 4 1/2"`.
- **Placement**: drag objects in the scene. Floor items move along the floor and
  automatically rest on the floor or on the object beneath them, so a speaker dropped
  onto the console sits on top of it. The TV moves on the wall plane and has a
  free mount height and a mount gap.
- **Snapping**: adjustable grid, wall centerline, center-to-center with other objects,
  and edge-to-edge alignment. Guide lines appear while a snap is active. Live gap
  readouts show distance to the wall edges and to neighbouring objects.
- **Views**: Top, Front, and 3D presets, plus an orthographic toggle for
  floor-plan style views. Right-drag orbits, scroll zooms, middle-drag pans.
- **Symmetry helpers**: Center places an object on the wall centerline. Mirror
  duplicates an object across the centerline. Toe-in rotates every speaker toward
  the wall center by the given number of degrees.
- **Keyboard**: arrow keys nudge the selected object by one grid step (Shift for four),
  Delete removes it, Escape deselects.

## Stack

Vite, React, TypeScript, three.js via @react-three/fiber and @react-three/drei, and
zustand for state with local-storage persistence. There is no backend.

## Layout of the code

- `src/lib/types.ts` data model
- `src/lib/units.ts` inch parsing and fraction formatting
- `src/lib/geometry.ts` footprints, stacking, wall constraints, snapping, measurements
- `src/lib/store.ts` project state, actions, persistence
- `src/lib/presets.ts` common sizes
- `src/components/Scene.tsx` canvas, wall, floor, cameras, guides
- `src/components/ObjectMesh.tsx` a draggable object with labels and gap readouts
- `src/components/Sidebar.tsx`, `Inspector.tsx`, `Toolbar.tsx` the panels
