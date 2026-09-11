# Wood swatches

Drop a square, seamless photo of a veneer here and it replaces the procedural grain
for that wood everywhere it is used (consoles, facades, speakers). Name the file after
the wood id, as `.jpg`, `.jpeg`, or `.png`:

- natural-walnut
- chocolate-walnut
- charcoal-ash
- toasted-walnut
- washed-oak
- american-auburn
- american-walnut
- black-ash

Each swatch is assumed to cover about 24 inches square. Files are optional; missing
ones fall back to the generated grain.

Door facade photos live in `../facades/` as `weave.jpg`, `constellation.jpg`, and
`tune.jpg`. Each is a square close-up of one door; the app crops the frame away, traces
the dark mesh as a cutout mask, and renders the pattern in the chosen wood.
