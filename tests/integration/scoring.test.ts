import { describe, test, expect } from 'bun:test';
import { Cat } from '../../src/cat';
import { applyWindToCats } from '../../src/wind';
import { W, H, PX, PY } from '../../src/constants';

function catAt(x: number, y: number): Cat {
  const c = new Cat();
  c.x = x; c.y = y;
  c.vx = 0; c.vy = 0;
  c.scared = false; c.scaredTimer = 0;
  return c;
}

describe('scoring / cat removal', () => {
  describe('isGone boundary', () => {
    test('cat at screen centre is not gone', () => {
      expect(catAt(PX, PY).isGone()).toBe(false);
    });

    test('cat well past each edge is gone', () => {
      expect(catAt(-200, PY).isGone()).toBe(true);
      expect(catAt(W + 200, PY).isGone()).toBe(true);
      expect(catAt(PX, -200).isGone()).toBe(true);
      expect(catAt(PX, H + 200).isGone()).toBe(true);
    });
  });

  describe('wind + update lifecycle', () => {
    // Wind is applied every frame in the game loop, not just once.
    // These tests mirror that by calling applyWindToCats each iteration.

    test('cat exits the canvas when wind is sustained', () => {
      const cat = catAt(PX + 100, PY);

      let escaped = false;
      for (let i = 0; i < 200; i++) {
        applyWindToCats([cat], 0, PX, PY); // wind re-applied each frame
        cat.update();
        if (cat.isGone()) { escaped = true; break; }
      }
      expect(escaped).toBe(true);
    });

    test('blown cat exits far sooner than a calm drifting cat', () => {
      const blown = catAt(PX + 100, PY);

      // Calm cat drifts right at a brisk wander-speed equivalent
      const calm = catAt(PX + 100, PY);
      calm.vx = 1.5;

      let blownFrame = -1;
      let calmFrame  = -1;

      for (let i = 0; i < 600; i++) {
        applyWindToCats([blown], 0, PX, PY);
        blown.update();
        calm.update();
        if (blownFrame === -1 && blown.isGone()) blownFrame = i;
        if (calmFrame  === -1 && calm.isGone())  calmFrame  = i;
      }

      expect(blownFrame).toBeGreaterThan(-1); // blown cat must escape
      expect(blownFrame).toBeLessThan(calmFrame === -1 ? 600 : calmFrame);
    });
  });

  describe('array filtering (simulates game-loop scoring)', () => {
    test('cats that isGone() are removed from the array', () => {
      const cats: Cat[] = [
        catAt(PX, PY),       // on screen
        catAt(-200, PY),     // gone left
        catAt(W + 200, PY),  // gone right
      ];

      const before    = cats.length;
      const remaining = cats.filter(c => !c.isGone());
      const scored    = before - remaining.length;

      expect(remaining.length).toBe(1);
      expect(scored).toBe(2);
    });

    test('filtering on-screen cats scores nothing', () => {
      const cats = [catAt(PX, PY), catAt(100, 100), catAt(700, 500)];
      const scored = cats.length - cats.filter(c => !c.isGone()).length;
      expect(scored).toBe(0);
    });

    test('score accumulates correctly over multiple filter passes', () => {
      let score = 0;
      let cats: Cat[] = [
        catAt(-200, PY),
        catAt(PX, PY),
        catAt(W + 200, PY),
      ];

      // First pass — two gone
      const before1 = cats.length;
      cats = cats.filter(c => !c.isGone());
      score += before1 - cats.length;
      expect(score).toBe(2);

      // Manually move the remaining cat off-screen
      cats[0].x = -300;

      // Second pass — one more gone
      const before2 = cats.length;
      cats = cats.filter(c => !c.isGone());
      score += before2 - cats.length;
      expect(score).toBe(3);
    });
  });

  describe('spawn interval scaling', () => {
    test('interval shrinks as score grows (harder game)', () => {
      const intervalAt = (score: number) => Math.max(55, 140 - score * 4);
      expect(intervalAt(0)).toBe(140);
      expect(intervalAt(10)).toBe(100);
      expect(intervalAt(21)).toBe(56);
      expect(intervalAt(22)).toBe(55); // floor
      expect(intervalAt(100)).toBe(55); // stays at floor
    });
  });
});
