/**
 * Uses the close-call fixture to drive player-death tests.
 * The fixture records a cat that reached 54px from the player before being
 * blown away — close enough that without wind it would have caused a hit.
 */
import { describe, test, expect, beforeAll } from 'bun:test';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Cat } from '../../src/cat';
import { PX, PY, PLAYER_RADIUS } from '../../src/constants';

interface FixtureEvent {
  type: string; frame: number;
  cx?: number; cy?: number;
  [key: string]: unknown;
}

const FIXTURE = join(import.meta.dir, '../fixtures/close-call.jsonl');

function collidesWithPlayer(cat: Cat): boolean {
  return Math.hypot(cat.x - PX, cat.y - PY) < PLAYER_RADIUS + cat.sz;
}

function catAt(x: number, y: number): Cat {
  const c = new Cat();
  c.x = x; c.y = y; c.vx = 0; c.vy = 0; c.scared = false;
  return c;
}

let nearMiss: FixtureEvent;

beforeAll(() => {
  const events = readFileSync(FIXTURE, 'utf8')
    .trim().split('\n').map(l => JSON.parse(l) as FixtureEvent);
  nearMiss = events.find(e => e.type === 'cat_scared' && e.frame === 2604)!;
});

describe('player death — collision detection', () => {
  test('cat squarely on the player is a hit', () => {
    expect(collidesWithPlayer(catAt(PX, PY))).toBe(true);
  });

  test('cat just inside collision range is a hit', () => {
    const cat = catAt(PX + PLAYER_RADIUS, PY); // right at the player edge
    expect(collidesWithPlayer(cat)).toBe(true);
  });

  test('cat well outside collision range is not a hit', () => {
    // PLAYER_RADIUS(28) + max cat sz(21) + 20 margin = 69px away
    expect(collidesWithPlayer(catAt(PX + 69, PY))).toBe(false);
  });

  test('close-call cat was not yet colliding when it was scared', () => {
    // dist=54 at the logged moment — outside the threshold
    const cat = catAt(nearMiss.cx!, nearMiss.cy!);
    expect(collidesWithPlayer(cat)).toBe(false);
  });

  test('close-call cat would have hit the player if wind had not intervened', () => {
    const cat = catAt(nearMiss.cx!, nearMiss.cy!);
    // Give it the velocity it had while wandering toward the player (unscared)
    const dx = PX - cat.x;
    const dy = PY - cat.y;
    const d  = Math.hypot(dx, dy);
    cat.vx = (dx / d) * 1.6; // wandering top speed from cat.ts
    cat.vy = (dy / d) * 1.6;

    let hit = false;
    for (let i = 0; i < 40; i++) {
      cat.update();
      if (collidesWithPlayer(cat)) { hit = true; break; }
    }
    expect(hit).toBe(true);
  });
});
