/**
 * Deterministic session replayer.
 *
 * Takes a recorded session (GameEvent[]), re-seeds the PRNG, feeds back the
 * logged mouse angles, and runs the game-logic loop to produce events.
 * The output can be diffed against the original log for V&V.
 *
 * Particles and popups are skipped — they're visual and don't affect state.
 * cat.ts and dog.ts use rand() (seeded), so spawns and wander are deterministic.
 */
import { Cat }             from './cat';
import { Dog }             from './dog';
import { Yinzi }           from './yinzi';
import { applyWindToCats } from './wind';
import { seedRandom }      from './rng';
import { PX, PY, MAX_CATS, MAX_DOGS, DOG_POINTS, YINZI_POINTS, YINZI_SCORE_REQ, PLAYER_RADIUS } from './constants';
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

  let cats:         Cat[]   = [];
  let dogs:         Dog[]   = [];
  let yinzis:       Yinzi[] = [];
  let score         = 0;
  let lives         = typeof start.lives === 'number' ? (start.lives as number) : 3;
  let invincible    = 0;
  let spawnTimer    = 0;
  let dogSpawnTimer = 0;
  let yinziSpawnTimer = 0;
  let yinziMaxCount   = 1;
  let playerAngle   = 0;

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

    // Spawn dogs — after cats to keep RNG stream consistent
    dogSpawnTimer++;
    const dogInterval = Math.max(90, 200 - score * 3);
    if (dogSpawnTimer >= dogInterval && dogs.length < MAX_DOGS) {
      dogs.push(new Dog());
      dogSpawnTimer = 0;
    }

    // Spawn yinzis — after dogs to keep RNG stream consistent
    if (score > YINZI_SCORE_REQ) {
      yinziSpawnTimer++;
      const yinziInterval = Math.max(120, 250 - score * 2);
      if (yinziSpawnTimer >= yinziInterval && yinzis.length === 0) {
        for (let i = 0; i < yinziMaxCount; i++) {
          yinzis.push(new Yinzi());
        }
        yinziMaxCount *= 2;
        yinziSpawnTimer = 0;
      }
    }

    // Update
    for (const c of cats) c.update();
    for (const d of dogs) d.update();
    for (const z of yinzis) z.update();

    // Wind — cats
    applyWindToCats(cats, playerAngle, PX, PY, (force, cx, cy) => {
      produced.push({ type: 'cat_scared', frame,
        force: Math.round(force * 1000) / 1000,
        cx: Math.round(cx), cy: Math.round(cy) });
    });

    // Wind — dogs
    applyWindToCats(dogs, playerAngle, PX, PY, (force, cx, cy) => {
      produced.push({ type: 'dog_scared', frame,
        force: Math.round(force * 1000) / 1000,
        cx: Math.round(cx), cy: Math.round(cy) });
    });

    // Wind — yinzis
    applyWindToCats(yinzis, playerAngle, PX, PY, (force, cx, cy) => {
      produced.push({ type: 'yinzi_scared', frame,
        force: Math.round(force * 1000) / 1000,
        cx: Math.round(cx), cy: Math.round(cy) });
    });

    // Player collision — cats
    if (invincible === 0) {
      cats = cats.filter(c => {
        if (Math.hypot(c.x - PX, c.y - PY) < PLAYER_RADIUS + c.sz) {
          lives--;
          invincible = 120;
          produced.push({ type: 'player_hit', frame, entity: 'cat', lives,
            cx: Math.round(c.x), cy: Math.round(c.y) });
          return false;
        }
        return true;
      });

      // Player collision — dogs (only if not already hit by a cat)
      if (invincible === 0) {
        dogs = dogs.filter(d => {
          if (Math.hypot(d.x - PX, d.y - PY) < PLAYER_RADIUS + d.sz) {
            lives--;
            invincible = 120;
            produced.push({ type: 'player_hit', frame, entity: 'dog', lives,
              cx: Math.round(d.x), cy: Math.round(d.y) });
            return false;
          }
          return true;
        });
      }

      // Player collision — yinzis
      if (invincible === 0) {
        yinzis = yinzis.filter(z => {
          if (Math.hypot(z.x - PX, z.y - PY) < PLAYER_RADIUS + z.sz) {
            lives--;
            invincible = 120;
            produced.push({ type: 'player_hit', frame, entity: 'yinzi', lives,
              cx: Math.round(z.x), cy: Math.round(z.y) });
            return false;
          }
          return true;
        });
      }
    }
    if (invincible > 0) invincible--;

    // Cats fled
    const catsBefore = cats.length;
    cats = cats.filter(c => {
      if (c.isGone()) {
        produced.push({ type: 'cat_fled', frame,
          cx: Math.round(c.x), cy: Math.round(c.y) });
        return false;
      }
      return true;
    });
    const catDelta = catsBefore - cats.length;
    score += catDelta;
    if (catDelta > 0) produced.push({ type: 'score_change', frame, score, delta: catDelta });

    // Dogs fled
    const dogsBefore = dogs.length;
    dogs = dogs.filter(d => {
      if (d.isGone()) {
        produced.push({ type: 'dog_fled', frame,
          cx: Math.round(d.x), cy: Math.round(d.y) });
        return false;
      }
      return true;
    });
    const dogDelta = dogsBefore - dogs.length;
    score += dogDelta * DOG_POINTS;
    if (dogDelta > 0) produced.push({ type: 'score_change', frame, score, delta: dogDelta * DOG_POINTS });

    // Yinzis fled
    const yinzisBefore = yinzis.length;
    yinzis = yinzis.filter(z => {
      if (z.isGone()) {
        produced.push({ type: 'yinzi_fled', frame,
          cx: Math.round(z.x), cy: Math.round(z.y) });
        return false;
      }
      return true;
    });
    const yinziDelta = yinzisBefore - yinzis.length;
    score += yinziDelta * YINZI_POINTS;
    if (yinziDelta > 0) produced.push({ type: 'score_change', frame, score, delta: yinziDelta * YINZI_POINTS });

    if (lives <= 0) {
      produced.push({ type: 'game_over', frame, score });
      break;
    }
  }

  return produced;
}
