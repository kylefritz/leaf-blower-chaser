import { describe, test, expect } from 'bun:test';
import { replay, type ReplayEvent } from '../../src/replay';
import { generateSeed } from '../../src/rng';
import type { GameEvent } from '../../src/logger';

/** Build a minimal synthetic session with a given seed and mouse angle. */
function makeSession(seed: number, frames: number, angle = 0): GameEvent[] {
  const session = crypto.randomUUID();
  const events: GameEvent[] = [
    { session, type: 'session_start', t: 0, frame: 0, seed, lives: 3 },
  ];
  for (let f = 10; f <= frames; f += 10) {
    events.push({ session, type: 'mouse_move', t: f * 16, frame: f,
      x: Math.round(PX + Math.cos(angle) * 150), y: Math.round(PY + Math.sin(angle) * 150), angle });
  }
  return events;
}

// Player origin — mirrors constants.ts (no import needed, just avoids canvas mock)
const PX = 400;
const PY = 300;

// ─── Determinism ─────────────────────────────────────────────────────────────

describe('determinism', () => {
  test('same seed + same inputs → identical event sequence', () => {
    const seed = generateSeed();
    const session = makeSession(seed, 800);
    expect(replay(session)).toEqual(replay(session));
  });

  test('different seeds → different event sequences', () => {
    expect(replay(makeSession(1,  800))).not.toEqual(
           replay(makeSession(99, 800)));
  });

  test('different mouse angles → different scared events', () => {
    const seed = generateSeed();
    const right = replay(makeSession(seed, 2000, 0));           // aim right
    const left  = replay(makeSession(seed, 2000, Math.PI));     // aim left
    const scaredRight = right.filter(e => e.type === 'cat_scared');
    const scaredLeft  = left.filter(e => e.type === 'cat_scared');
    expect(scaredRight).not.toEqual(scaredLeft);
  });
});

// ─── Invariants ──────────────────────────────────────────────────────────────

describe('replay invariants', () => {
  test('every score_change is on the same frame as a cat_fled or dog_fled', () => {
    const events = replay(makeSession(42, 2000));
    for (const sc of events.filter(e => e.type === 'score_change')) {
      const fled = events.some(
        e => (e.type === 'cat_fled' || e.type === 'dog_fled') && e.frame === sc.frame,
      );
      expect(fled).toBe(true);
    }
  });

  test('score accumulates correctly', () => {
    const events = replay(makeSession(42, 2000));
    let running = 0;
    for (const e of events.filter(e => e.type === 'score_change')) {
      running += e.delta as number;
      expect(e.score).toBe(running);
    }
  });

  test('game_over appears at most once and only when lives reach 0', () => {
    const events = replay(makeSession(42, 5000));
    const gameOvers = events.filter(e => e.type === 'game_over');
    expect(gameOvers.length).toBeLessThanOrEqual(1);
    if (gameOvers.length === 1) {
      const hits = events.filter(e => e.type === 'player_hit');
      expect(hits.length).toBeGreaterThanOrEqual(3); // 3 lives lost
    }
  });

  test('no events after game_over', () => {
    const events = replay(makeSession(42, 5000));
    const goFrame = events.find(e => e.type === 'game_over')?.frame;
    if (goFrame !== undefined) {
      expect(events.every(e => e.frame <= goFrame)).toBe(true);
    }
  });

  test('throws if session_start has no seed', () => {
    const bad: GameEvent[] = [{ session: 'x', type: 'session_start', t: 0, frame: 0, lives: 3 }];
    expect(() => replay(bad)).toThrow();
  });
});
