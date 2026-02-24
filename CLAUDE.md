# Leaf Blower Cat Chaser

2D top-down browser game. Human scares cats with a leaf blower. Mouse-only controls.
Built with TypeScript, bundled with Bun, rendered on HTML5 Canvas.

## Build & run

```bash
bun run serve   # HTTP server on :8000 + starts dev watcher (primary workflow)
bun run build   # one-shot minified build — use to verify compilation
bun test        # run all tests
```

Use `bun run serve` to develop and play — it spawns the build watcher automatically.
Event logging requires the server (`POST /log`); events are appended to `game-log.jsonl`.

## Module map

| File | Responsibility |
|------|---------------|
| `src/constants.ts` | Canvas size, player position, wind range, cat cap |
| `src/canvas.ts` | Canvas/ctx setup, viewport scaling on resize |
| `src/grass.ts` | Pre-rendered offscreen grass background |
| `src/particle.ts` | Wind particle emitted from the nozzle each frame |
| `src/popup.ts` | Floating "+1 😸" text when a cat is scared off-screen |
| `src/cat.ts` | Cat entity — wandering AI, wind response, drawing |
| `src/renderer.ts` | Stateless draw functions: player, wind cone, HUD, cursor |
| `src/main.ts` | Game loop, state arrays, input, wind→cat collision |
| `src/logger.ts` | Browser-side event queue; batches to `POST /log` every 2 s, flushes on unload |
| `server.ts` | Bun HTTP server — serves static files, writes `POST /log` to `game-log.jsonl`, spawns dev watcher |

## Tooling

- **Bun only** — no Node.js, no npm, no `node` commands. Use `bun`, `bun run`, `bun test`, `bun build`.
- Use `jq` for log inspection and fixture extraction (see Tests section below).

## Code conventions

- TypeScript strict mode — no `any`, no non-null assertions unless unavoidable.
- No runtime dependencies. Canvas 2D API only.
- Draw functions in `renderer.ts` are stateless — all state lives in `main.ts`.
- `ctx` is imported from `canvas.ts`; never re-query the DOM element.
- Class properties are typed explicitly (no inferred-from-constructor shortcut).
- `server.ts` is Bun-only (never bundled). `src/logger.ts` is browser-only (no Node/Bun imports).

## Tests

```
tests/
  setup.ts               # canvas mock preloaded before all tests
  fixtures/
    game-log.jsonl       # snapshot fixture for log tests
  unit/                  # pure logic tests (constants, particle, popup, cat)
  integration/           # multi-module tests (wind, scoring)
  log/
    fixture.test.ts      # invariant tests against game-log.jsonl snapshot — no canvas needed
```

Log tests import no game source modules and don't need the canvas mock. They test
event schema, per-session frame/timestamp ordering, mouse_move frame cadence,
cat_scared force bounds, and per-session score accumulation.

Use `jq` to inspect and extract log data, e.g.:
```bash
jq -c 'select(.type == "cat_scared")' game-log.jsonl          # filter by type
jq -r '[.frame,.cx,.cy] | @tsv' ...                            # tabular output
jq -c 'select(.session == "uuid" and .frame >= 100)' ...       # filter by session + frame
```

## Agent teams

Use a team when changes span multiple independent modules at once — e.g. adding a
new entity type (needs `cat.ts` style changes + `renderer.ts` additions + `main.ts`
wiring). Suggested split:

- **mechanic** — game logic: `cat.ts`, `main.ts`, `constants.ts`
- **renderer** — visuals: `renderer.ts`, `particle.ts`, `popup.ts`, `grass.ts`
- **builder** — validate: runs `bun run build` and reports errors

For single-module edits, work directly without a team.
