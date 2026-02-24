/**
 * Deterministic session replayer.
 *
 * Takes a recorded session (GameEvent[]), re-seeds the PRNG, feeds back the
 * logged mouse angles, and runs the game-logic loop to produce events.
 * The output can be diffed against the original log for V&V.
 *
 * Particles and popups are skipped — they're visual and don't affect state.
 * cat.ts uses rand() (seeded), so cat spawns and wander are deterministic.
 */
import { Cat }             from './cat';
import { applyWindToCats } from './wind';
import { seedRandom }      from './rng';
import { PX, PY, MAX_CATS, PLAYER_RADIUS } from './constants';
import type { GameEvent }  from './logger';

export interface ReplayEvent {
  type: string;
  frame: number;
  [key: string]: unknown;
}

export function replay(sessionEvents: GameEvent[]): ReplayEvent[] {
  const start = sessionEvents.find(e => e.type === 'session_start');
  if (!start || typeof start.seed !== 'number') {
    throw new Error('session_start event with numeric seed is required');
  }

  seedRandom(start.seed as number);

  // Build frame → angle lookup from logged mouse_move events
  const mouseAngles = new Map<number, number>();
  for (const e of sessionEvents) {
    if (e.type === 'mouse_move') mouseAngles.set(e.frame, e.angle as number);
  }

  const maxFrame = Math.max(...sessionEvents.map(e => e.frame));

  let cats:       Cat[]  = [];
  let score       = 0;
  let lives       = typeof start.lives === 'number' ? (start.lives as number) : 3;
  let invincible  = 0;
  let spawnTimer  = 0;
  let playerAngle = 0;

  const produced: ReplayEvent[] = [];

  for (let frame = 1; frame <= maxFrame; frame++) {
    if (mouseAngles.has(frame)) playerAngle = mouseAngles.get(frame)!;

    // Spawn cats
    spawnTimer++;
    const interval = Math.max(55, 140 - score * 4);
    if (spawnTimer >= interval && cats.length < MAX_CATS) {
      cats.push(new Cat());
      spawnTimer = 0;
    }

    // Update
    for (const c of cats) c.update();

    // Wind
    applyWindToCats(cats, playerAngle, PX, PY, (force, cx, cy) => {
      produced.push({ type: 'cat_scared', frame,
        force: Math.round(force * 1000) / 1000,
        cx: Math.round(cx), cy: Math.round(cy) });
    });

    // Player collision
    if (invincible === 0) {
      cats = cats.filter(c => {
        if (Math.hypot(c.x - PX, c.y - PY) < PLAYER_RADIUS + c.sz) {
          lives--;
          invincible = 120;
          produced.push({ type: 'player_hit', frame, lives,
            cx: Math.round(c.x), cy: Math.round(c.y) });
          return false;
        }
        return true;
      });
    }
    if (invincible > 0) invincible--;

    // Fled
    const before = cats.length;
    cats = cats.filter(c => {
      if (c.isGone()) {
        produced.push({ type: 'cat_fled', frame,
          cx: Math.round(c.x), cy: Math.round(c.y) });
        return false;
      }
      return true;
    });
    const delta = before - cats.length;
    score += delta;
    if (delta > 0) produced.push({ type: 'score_change', frame, score, delta });

    if (lives <= 0) {
      produced.push({ type: 'game_over', frame, score });
      break;
    }
  }

  return produced;
}
