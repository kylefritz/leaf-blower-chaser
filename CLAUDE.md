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
Event logging requires the server (`POST /log`); in dev events go to `game-log.jsonl`,
in production they go to Neon Postgres.

## Deployment

Hosted on [Fly.io](https://fly.io) at **https://leaf-blower-cat-chaser.fly.dev/**.

```bash
flyctl deploy   # build Docker image and deploy to Fly.io
```

The `Dockerfile` builds with `bun run build`, then runs `server.ts` with `NODE_ENV=production`
(skips the file watcher). Config is in `fly.toml`.

### Neon Postgres

Production event logging uses [Neon](https://neon.tech) serverless Postgres
(`@neondatabase/serverless`). The `DATABASE_URL` secret is set on Fly.io:

```bash
fly secrets set DATABASE_URL="postgresql://..." --app leaf-blower-cat-chaser
```

The `game_events` table stores events with typed columns (`session`, `type`, `t`, `frame`)
and a `data` JSONB column for event-specific fields. Indexes on `session`, `type`,
and `(session, frame)`.

To test Neon locally, use direnv (`.envrc` is gitignored):

```bash
# .envrc
export DATABASE_URL="postgresql://..."
export NODE_ENV="production"
```

Then `direnv allow && bun run server.ts`.

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
| `src/main.ts` | Game loop, state arrays, input, wind→cat collision, player death |
| `src/rng.ts` | Seeded PRNG (mulberry32) — `rand()` replaces `Math.random()` in game logic |
| `src/logger.ts` | Browser-side event queue; batches to `POST /log` every 2 s, flushes on unload |
| `src/replay.ts` | Pure replay function — seeds RNG, feeds mouse angles, simulates loop, returns events |
| `server.ts` | Bun HTTP server — serves static files, `POST /log` to JSONL (dev) or Neon Postgres (prod), spawns dev watcher |

## Tooling

- **Bun only** — no Node.js, no npm, no `node` commands. Use `bun`, `bun run`, `bun test`, `bun build`.
- Use `jq` for log inspection and fixture extraction (see Tests section below).

## Code conventions

- TypeScript strict mode — no `any`, no non-null assertions unless unavoidable.
- No browser runtime dependencies. Canvas 2D API only. Server uses `@neondatabase/serverless`.
- Draw functions in `renderer.ts` are stateless — all state lives in `main.ts`.
- `ctx` is imported from `canvas.ts`; never re-query the DOM element.
- Class properties are typed explicitly (no inferred-from-constructor shortcut).
- `server.ts` is Bun-only (never bundled). `src/logger.ts` is browser-only (no Node/Bun imports).
- **Game logic uses `rand()` from `rng.ts`, never `Math.random()` directly.** Particles and grass keep `Math.random()` — they're visual and must not pollute the game-logic RNG stream.
- `src/replay.ts` mirrors the game loop from `main.ts`. If you change game logic in `main.ts`, apply the same change to `replay.ts`.

## Tests

```
tests/
  setup.ts                    # canvas mock (path: ../src/canvas.ts) preloaded before all tests
  fixtures/
    game-log.jsonl            # snapshot of a real session — used by log/ tests
    close-call.jsonl          # 100-frame window where a cat reached 54 px from the player
  unit/                       # pure logic: constants, particle, popup, cat
  integration/                # multi-module: wind, scoring
  log/
    fixture.test.ts           # schema + ordering invariants against game-log.jsonl (no canvas)
    close-call.test.ts        # collision tests driven by the close-call position
  replay/
    session.test.ts           # determinism + loop invariants via synthetic sessions
```

**Log tests** (`tests/log/`) import no game modules and need no canvas mock. Use `jq` to extract fixtures.

**Replay tests** (`tests/replay/`) import `replay.ts` and `rng.ts`. They run the game-logic loop
in process, so they do need the canvas mock (via setup.ts preload).

### Deterministic replay

Every session logs a `seed` in `session_start` and a `cat_spawn` event for each cat.
`src/replay.ts` can reconstruct a session deterministically:

1. Seed the PRNG with the logged seed — cat spawns and wander match the original.
2. Feed `mouse_move` angles back as `playerAngle` each frame.
3. Run the game-logic loop — `cat_scared`, `cat_fled`, `score_change`, `player_hit` events are produced.
4. Diff the produced events against the log to verify the simulation is correct.

To write a fixture-based replay test for a real session:
```bash
# Extract a session from the live log
jq -c 'select(.session == "<uuid>")' game-log.jsonl > tests/fixtures/my-session.jsonl
```
Then load the fixture in a test and assert `replay(events)` matches the logged events.

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
