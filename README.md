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
- **Floor**: a solid color, procedurally generated hardwood planks (dark oak, walnut,
  white oak, light oak, blonde oak, with adjustable plank width and direction), or a
  custom photo of your own flooring tiled at a real-world width. The floor grid can be
  toggled from the toolbar.
- **Objects**: TV, wall panel, media console, console base, equipment rack, speaker,
  subwoofer.
  Pick a size preset, then edit width, height, depth, and color per object.
- **Wall panels** mount on the wall behind the TV at any height. Each panel has a
  pattern (solid, vertical slats, horizontal slats, or diagonal slats running either
  way), edge banding width and color, slat width, spacing, relief, and color, and a
  separate background color. Mirroring a diagonal panel flips its direction, so two
  mirrored panels form a chevron. A TV that overlaps a panel automatically sits in
  front of it by its mount gap.
- **Units** are inches. Inputs accept `65`, `65.5`, `65 1/2`, or `5' 4 1/2"`.
- **Media console**: rendered as a cabinet with a separate top slab and evenly divided
  front doors (4 by default, with an adjustable reveal). Door finishes: plain, horizontal
  or vertical wood slats, or one of three Elements-style facades (Weave, Constellation,
  Tune) set into a wood frame over dark mesh. Woods: Natural Walnut, Chocolate Stained
  Walnut, Charcoal Stained Ash, Toasted Oak, and Washed Oak, usable with any finish.
  Woods render from a veneer photo in `public/woods/` when one is present, otherwise
  from procedural grain. Facades are traced from door photos in `public/facades/` when
  present (the exact pattern, rendered in whichever wood is chosen), otherwise drawn
  procedurally with an adjustable pattern scale. Wood
  finishes veneer the whole body, and the top matches unless given its own color. An
  optional recessed black plinth is counted within the console height; set it to 0 and
  add a console base for a sideboard.
- **Speakers**: cabinets with an optional wood veneer (American Auburn, American
  Walnut, or Black Ash, with procedurally generated grain), a recessed fabric grill
  with its own color and border width, and an optional recessed black plinth.
- **Console base**: a sled-style metal base (front and back top rails, a closed loop at
  each end). Width, height, depth, color, and the frame member thickness and depth are
  editable. Anything centered over a base rests on it regardless of size. Releasing a
  base under a console, or a console onto a base, centers them on each other, and the
  inspector has a Center under / Center on base button for the same thing.
- **Placement**: drag objects in the scene. Floor items move along the floor and
  automatically rest on the floor or on the object beneath them, so a speaker dropped
  onto the console sits on top of it. The TV moves on the wall plane and has a
  free mount height and a mount gap. Dragging a floor item carries anything that was
  already stacked on it when the drag began, so a base can be slid under a console.
  Hold Alt/Option while dragging to move an item by itself.
- **Snapping**: adjustable grid, wall centerline, center-to-center with other objects,
  and edge-to-edge alignment. Guide lines appear while a snap is active. Live gap
  readouts show distance to the wall edges and to neighbouring objects.
- **Views**: Top, Front, and 3D presets, plus an orthographic toggle for
  floor-plan style views. Left-drag on empty space orbits, scroll zooms toward the cursor, right-drag pans.
- **Symmetry helpers**: Center places an object on the wall centerline. Mirror
  duplicates an object across the centerline. Toe-in rotates every speaker toward
  the wall center by the given number of degrees.
- **Hide**: the eye button in the object list (or H) drops an object from the scene
  without deleting it. Hidden objects are ignored by snapping, stacking, and gap
  readouts until shown again.
- **Dimension annotations**: each object can show any of width, height, depth, and its
  offset from the left, right, bottom, or top of the wall, chosen per object in the
  inspector. The Dims toolbar button shows or hides all of them.
- **Keyboard**: arrow keys nudge the selected object by one grid step (Shift for four),
  Delete removes it, H hides or shows it, Escape deselects.

## Stack

Vite, React, TypeScript, three.js via @react-three/fiber and @react-three/drei, and
zustand for state with local-storage persistence. There is no backend.

## Layout of the code

- `src/lib/types.ts` data model
- `src/lib/units.ts` inch parsing and fraction formatting
- `src/lib/geometry.ts` footprints, stacking, wall constraints, snapping, measurements
- `src/lib/store.ts` project state, actions, persistence
- `src/lib/presets.ts` common sizes
- `src/lib/panel.ts` slat layout and clipping for wall panels
- `src/lib/textures.ts` procedural wood grain and grill cloth textures
- `src/lib/floor.ts` procedural plank flooring and custom floor image loading
- `src/lib/facades.ts` Weave, Constellation, and Tune door facade textures
- `src/components/Scene.tsx` canvas, wall, floor, cameras, guides
- `src/components/ObjectMesh.tsx` a draggable object with labels and gap readouts
- `src/components/PanelMesh.tsx` wall panel rendering: background, banding, slats
- `src/components/BaseMesh.tsx` console base rendering
- `src/components/ConsoleMesh.tsx` media console rendering: carcass, top, doors, slats
- `src/components/SpeakerMesh.tsx` speaker rendering: veneer, grill, plinth
- `src/components/Dimensions.tsx` per-object dimension lines
- `src/components/Sidebar.tsx`, `Inspector.tsx`, `Toolbar.tsx` the panels

## Bundled photos

`public/woods/` and `public/facades/` hold veneer swatches and door photos used as
textures and cutout masks. They are product photography, not covered by the MIT
license below; keep them for personal use or replace them with your own images of the
same names.

## License

MIT. See [LICENSE](LICENSE).
