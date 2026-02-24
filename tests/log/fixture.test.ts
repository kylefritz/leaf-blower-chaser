/**
 * Fixture-based tests for game-log.jsonl.
 * No game modules imported — no canvas, no DOM mock needed.
 * Reads the snapshot at tests/fixtures/game-log.jsonl.
 */
import { describe, test, expect, beforeAll } from 'bun:test';
import { readFileSync } from 'fs';
import { join } from 'path';

interface GameEvent {
  session: string;
  type: string;
  t: number;
  frame: number;
  [key: string]: unknown;
}

const FIXTURE = join(import.meta.dir, '../fixtures/game-log.jsonl');

let events: GameEvent[];
let sessions: Map<string, GameEvent[]>;

beforeAll(() => {
  const raw = readFileSync(FIXTURE, 'utf8');
  events = raw.trim().split('\n').map(line => JSON.parse(line) as GameEvent);

  sessions = new Map();
  for (const e of events) {
    if (!sessions.has(e.session)) sessions.set(e.session, []);
    sessions.get(e.session)!.push(e);
  }
});

// ─── Schema ───────────────────────────────────────────────────────────────────

describe('schema', () => {
  test('every event has session, type, t, frame', () => {
    for (const e of events) {
      expect(typeof e.session).toBe('string');
      expect(typeof e.type).toBe('string');
      expect(typeof e.t).toBe('number');
      expect(Number.isInteger(e.frame)).toBe(true);
    }
  });

  test('session is a valid UUID v4', () => {
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
    for (const e of events) {
      expect(e.session).toMatch(uuidRe);
    }
  });

  test('only known event types appear', () => {
    const known = new Set(['session_start', 'mouse_move', 'cat_scared', 'cat_fled', 'score_change']);
    for (const e of events) {
      expect(known.has(e.type)).toBe(true);
    }
  });
});

// ─── Per-session ordering ─────────────────────────────────────────────────────

describe('per-session ordering', () => {
  test('each session starts with session_start at frame 0', () => {
    for (const evts of sessions.values()) {
      expect(evts[0].type).toBe('session_start');
      expect(evts[0].frame).toBe(0);
    }
  });

  test('frames are non-decreasing within each session', () => {
    for (const evts of sessions.values()) {
      for (let i = 1; i < evts.length; i++) {
        expect(evts[i].frame).toBeGreaterThanOrEqual(evts[i - 1].frame);
      }
    }
  });

  test('timestamps are non-decreasing within each session', () => {
    for (const evts of sessions.values()) {
      for (let i = 1; i < evts.length; i++) {
        expect(evts[i].t).toBeGreaterThanOrEqual(evts[i - 1].t);
      }
    }
  });
});

// ─── mouse_move ───────────────────────────────────────────────────────────────

describe('mouse_move', () => {
  test('all frames are multiples of 10', () => {
    for (const e of events.filter(e => e.type === 'mouse_move')) {
      expect(e.frame % 10).toBe(0);
    }
  });

  test('x and y are integers', () => {
    for (const e of events.filter(e => e.type === 'mouse_move')) {
      expect(Number.isInteger(e.x)).toBe(true);
      expect(Number.isInteger(e.y)).toBe(true);
    }
  });

  test('angle is in [-π, π]', () => {
    for (const e of events.filter(e => e.type === 'mouse_move')) {
      expect(e.angle as number).toBeGreaterThanOrEqual(-Math.PI);
      expect(e.angle as number).toBeLessThanOrEqual(Math.PI);
    }
  });
});

// ─── cat_scared ───────────────────────────────────────────────────────────────

describe('cat_scared', () => {
  // force is stored as Math.round(f*1000)/1000, so a cat at the very edge of
  // WIND_RANGE can log 0 even though the actual force was positive. Allow >= 0.
  test('force is in [0, 1]', () => {
    for (const e of events.filter(e => e.type === 'cat_scared')) {
      expect(e.force as number).toBeGreaterThanOrEqual(0);
      expect(e.force as number).toBeLessThanOrEqual(1);
    }
  });

  test('cx and cy are integers', () => {
    for (const e of events.filter(e => e.type === 'cat_scared')) {
      expect(Number.isInteger(e.cx)).toBe(true);
      expect(Number.isInteger(e.cy)).toBe(true);
    }
  });
});

// ─── cat_fled + score_change ──────────────────────────────────────────────────

describe('cat_fled + score_change', () => {
  test('cat_fled count equals score_change count per session', () => {
    for (const evts of sessions.values()) {
      const fled    = evts.filter(e => e.type === 'cat_fled').length;
      const changes = evts.filter(e => e.type === 'score_change').length;
      expect(fled).toBe(changes);
    }
  });

  test('every score_change delta is positive', () => {
    for (const e of events.filter(e => e.type === 'score_change')) {
      expect(e.delta as number).toBeGreaterThan(0);
    }
  });

  test('score accumulates correctly within each session', () => {
    for (const evts of sessions.values()) {
      let running = 0;
      for (const e of evts.filter(e => e.type === 'score_change')) {
        running += e.delta as number;
        expect(e.score).toBe(running);
      }
    }
  });

  test('every cat_fled is preceded by at least one cat_scared in the same session', () => {
    for (const evts of sessions.values()) {
      for (const f of evts.filter(e => e.type === 'cat_fled')) {
        const hasScared = evts.some(e => e.type === 'cat_scared' && e.frame <= f.frame);
        expect(hasScared).toBe(true);
      }
    }
  });

  test('cat_fled cx and cy are integers', () => {
    for (const e of events.filter(e => e.type === 'cat_fled')) {
      expect(Number.isInteger(e.cx)).toBe(true);
      expect(Number.isInteger(e.cy)).toBe(true);
    }
  });
});
