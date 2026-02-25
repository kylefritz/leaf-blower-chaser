comm# Leaf Blower Chaser

2D top-down browser game. Human scares cats and dogs with a leaf blower. Mouse-only controls.
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
GitHub repo: `kylefritz/leaf-blower-chaser`.

Pushing to `main` triggers CI (`.github/workflows/fly-deploy.yml`):
1. **Test** — installs Bun, runs `bun test`
2. **Deploy** — builds Docker image and deploys to Fly.io (only if tests pass)

To deploy manually: `flyctl deploy`

The `Dockerfile` builds with `bun run build`, then runs `server.ts` with `NODE_ENV=production`
(skips the file watcher). Config is in `fly.toml`.

### Neon Postgres

Production event logging uses [Neon](https://neon.tech) serverless Postgres
(`@neondatabase/serverless`). The `DATABASE_URL` secret is set on Fly.io:

```bash
fly secrets set DATABASE_URL="postgresql://..." --app leaf-blower-cat-chaser
```

Neon project ID: `royal-dream-25156244` (named `leaf-blower-cat-chaser`).

The `game_events` table stores events with typed columns (`session`, `type`, `t`, `frame`)
and a `data` JSONB column for event-specific fields. Indexes on `session`, `type`,
and `(session, frame)`.

**Important:** Use `sql.query(queryString, paramsArray)` — not tagged template literals —
when calling the Neon serverless driver. The tagged template form `sql\`...\`` silently
fails when called as a regular function.

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
| `src/constants.ts` | Canvas size, player position, wind range, cat/dog caps, dog points |
| `src/canvas.ts` | Canvas/ctx setup, viewport scaling on resize |
| `src/grass.ts` | Pre-rendered offscreen grass background |
| `src/particle.ts` | Wind particle emitted from the nozzle each frame |
| `src/popup.ts` | Floating score text when an animal is scared off-screen |
| `src/blowable.ts` | Shared interface for Cat and Dog entities |
| `src/cat.ts` | Cat entity — wandering AI, wind response, drawing (1 point) |
| `src/dog.ts` | Dog entity — tougher, faster, harder to blow away (2 points) |
| `src/renderer.ts` | Stateless draw functions: player, wind cone, HUD, cursor |
| `src/main.ts` | Game loop, state arrays, input, wind collision, player death, cat & dog scoring |
| `src/rng.ts` | Seeded PRNG (mulberry32) — `rand()` replaces `Math.random()` in game logic |
| `src/logger.ts` | Browser-side event queue; batches to `POST /log` every 2 s, flushes on unload |
| `src/replay.ts` | Pure replay function — seeds RNG, feeds mouse angles, simulates loop, returns events |
| `server.ts` | Bun HTTP server — serves static files, `POST /log` to JSONL (dev) or Neon Postgres (prod), spawns dev watcher |

## Tooling

- **Bun only** — no Node.js, no npm, no `node` commands. Use `bun`, `bun run`, `bun test`, `bun build`.
- **direnv** for local env vars (`.envrc` is gitignored). `direnv allow` after editing.
- Use `jq` for log inspection and fixture extraction (see Tests section below).
- **act** for testing GH Actions locally: `act -j test --container-architecture linux/amd64` (requires Docker).

## Code conventions

- TypeScript strict mode — no `any`, no non-null assertions unless unavoidable.
- No browser runtime dependencies. Canvas 2D API only. Server uses `@neondatabase/serverless`.
- Draw functions in `renderer.ts` are stateless — all state lives in `main.ts`.
- `ctx` is imported from `canvas.ts`; never re-query the DOM element.
- Class properties are typed explicitly (no inferred-from-constructor shortcut).
- `server.ts` is Bun-only (never bundled). `src/logger.ts` is browser-only (no Node/Bun imports).
- **Game logic uses `rand()` from `rng.ts`, never `Math.random()` directly.** Particles and grass keep `Math.random()` — they're visual and must not pollute the game-logic RNG stream.
- `src/replay.ts` mirrors the game loop from `main.ts`. If you change game logic in `main.ts`, apply the same change to `replay.ts`.
- New entity types should implement the `Blowable` interface from `blowable.ts` so they work with `applyWindToCats()` in `wind.ts`.
- **RNG stream ordering matters for replay**: entity spawns must happen in a fixed order in the frame loop (cats first, then dogs) to keep the PRNG stream consistent.
- When passing `drawHUD` arguments, ensure the parameter order matches: `(score, catCount, dogCount, frame, lives)`.

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

Every session logs a `seed` in `session_start` and a `cat_spawn`/`dog_spawn` event for each entity.
`src/replay.ts` can reconstruct a session deterministically:

1. Seed the PRNG with the logged seed — cat and dog spawns and wander match the original.
2. Feed `mouse_move` angles back as `playerAngle` each frame.
3. Run the game-logic loop — `cat_scared`, `dog_scared`, `cat_fled`, `dog_fled`, `score_change`, `player_hit` events are produced.
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
jq -c 'select(.type == "dog_fled")' game-log.jsonl            # dog events
jq -r '[.frame,.cx,.cy] | @tsv' ...                            # tabular output
jq -c 'select(.session == "uuid" and .frame >= 100)' ...       # filter by session + frame
```

## Agent teams

Use a team when changes span multiple independent modules at once — e.g. adding a
new entity type (needs `dog.ts` + `renderer.ts` additions + `main.ts` + `replay.ts`
wiring). Suggested split:

- **mechanic** — game logic: `cat.ts`, `dog.ts`, `main.ts`, `replay.ts`, `constants.ts`, `wind.ts`, `blowable.ts`
- **renderer** — visuals: `renderer.ts`, `particle.ts`, `popup.ts`, `grass.ts`, entity `draw()` methods
- **builder** — validate: runs `bun run build` and reports errors

For single-module edits, work directly without a team.

When using teams for a new entity type, the mechanic creates the entity class with a
placeholder `draw()`, and the renderer replaces it with proper visuals. Both run in parallel.
Run builder after both complete to verify integration.
