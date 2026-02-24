# Leaf Blower Cat Chaser

A 2D top-down browser game where you scare cats away with a leaf blower.
Move your mouse to aim. Cats flee when hit by the wind cone. Score a point for every cat that runs off screen.

<img src="game.png" />

## Play

Build once, then open `index.html` in Chrome:

```bash
bun run build
open index.html
```

During development, use watch mode so the bundle rebuilds on every save:

```bash
bun run dev
```

Then refresh the browser after saving a file.

## Controls

| Input      | Action              |
| ---------- | ------------------- |
| Mouse move | Aim the leaf blower |

## Project structure

```
src/
  constants.ts   — canvas size, wind range, cat cap
  canvas.ts      — canvas/ctx setup and viewport scaling
  grass.ts       — pre-rendered offscreen grass background
  particle.ts    — wind particle emitted from the nozzle
  popup.ts       — floating "+1" text when a cat is scared off
  cat.ts         — Cat entity: wandering AI, wind response, drawing
  renderer.ts    — stateless draw functions (player, wind cone, HUD, cursor)
  main.ts        — game loop, state, input handling
dist/
  bundle.js      — compiled output (generated, not committed)
index.html       — loads dist/bundle.js, nothing else
```

## Tech

- **Language:** TypeScript
- **Bundler:** [Bun](https://bun.sh) (`bun build`)
- **Renderer:** HTML5 Canvas 2D API
- **Runtime:** browser — no server required
