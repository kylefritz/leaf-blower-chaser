import { describe, test, expect } from 'bun:test';
import { Cat } from '../../src/cat';
import { W, H, PX, PY } from '../../src/constants';

/** Place a cat at an explicit position with zero velocity. */
function catAt(x: number, y: number): Cat {
  const c = new Cat();
  c.x = x; c.y = y;
  c.vx = 0; c.vy = 0;
  c.scared = false;
  c.scaredTimer = 0;
  c.exclamTimer = 0;
  return c;
}

describe('Cat', () => {
  describe('constructor', () => {
    test('spawns at a canvas edge', () => {
      for (let i = 0; i < 30; i++) {
        const c = new Cat();
        const atEdge =
          c.x <= -20 || c.x >= W + 20 ||
          c.y <= -20 || c.y >= H + 20;
        expect(atEdge).toBe(true);
      }
    });

    test('initial velocity is toward the centre (majority of spawns)', () => {
      let toward = 0;
      for (let i = 0; i < 60; i++) {
        const c  = new Cat();
        const dot = c.vx * (PX - c.x) + c.vy * (PY - c.y);
        if (dot > 0) toward++;
      }
      expect(toward).toBeGreaterThan(50);
    });

    test('starts calm', () => {
      const c = new Cat();
      expect(c.scared).toBe(false);
      expect(c.scaredTimer).toBe(0);
      expect(c.exclamTimer).toBe(0);
    });

    test('size is within expected range', () => {
      for (let i = 0; i < 20; i++) {
        const c = new Cat();
        expect(c.sz).toBeGreaterThanOrEqual(16);
        expect(c.sz).toBeLessThan(21);
      }
    });
  });

  describe('facing getter', () => {
    test('returns atan2(vy, vx)', () => {
      const c = catAt(PX, PY);
      c.vx = 1; c.vy = 0;
      expect(c.facing).toBeCloseTo(0);
    });

    test('updates when velocity direction changes', () => {
      const c = catAt(PX, PY);
      c.vx = 0; c.vy = 1;
      expect(c.facing).toBeCloseTo(Math.PI / 2);
    });
  });

  describe('update', () => {
    test('moves position by velocity', () => {
      const c = catAt(PX, PY);
      c.vx = 3; c.vy = -2;
      c.scared = true; c.scaredTimer = 10; // keep scared so wander doesn't interfere
      c.update();
      expect(c.x).toBeCloseTo(PX + 3 * 0.975, 1);
      expect(c.y).toBeCloseTo(PY - 2 * 0.975, 1);
    });

    test('decrements scaredTimer when scared', () => {
      const c = catAt(PX, PY);
      c.scared = true; c.scaredTimer = 50;
      c.update();
      expect(c.scaredTimer).toBe(49);
    });

    test('clears scared flag when scaredTimer reaches 0', () => {
      const c = catAt(PX, PY);
      c.scared = true; c.scaredTimer = 1;
      c.update();
      expect(c.scared).toBe(false);
    });

    test('wobble increases each frame', () => {
      const c = catAt(PX, PY);
      const w0 = c.wobble;
      c.update();
      expect(c.wobble).toBeGreaterThan(w0);
    });
  });

  describe('applyWind', () => {
    test('marks cat as scared', () => {
      const c = catAt(PX, PY);
      c.applyWind(1, 0, 0.5);
      expect(c.scared).toBe(true);
    });

    test('pushes cat in the wind direction', () => {
      const c = catAt(PX, PY);
      c.applyWind(1, 0, 1.0); // full-force wind pointing right
      expect(c.vx).toBeGreaterThan(0);
    });

    test('sets scaredTimer to 100', () => {
      const c = catAt(PX, PY);
      c.applyWind(1, 0, 0.5);
      expect(c.scaredTimer).toBe(100);
    });

    test('sets exclamTimer on first scare', () => {
      const c = catAt(PX, PY);
      c.applyWind(1, 0, 0.5);
      expect(c.exclamTimer).toBeGreaterThan(0);
    });

    test('does not reset exclamTimer if cat is already scared', () => {
      const c = catAt(PX, PY);
      c.scared = true; c.scaredTimer = 50; c.exclamTimer = 3;
      c.applyWind(1, 0, 0.5);
      expect(c.exclamTimer).toBe(3);
    });

    test('caps speed at 13', () => {
      const c = catAt(PX, PY);
      c.applyWind(1, 0, 999); // absurd force
      expect(Math.hypot(c.vx, c.vy)).toBeLessThanOrEqual(13);
    });

    test('stronger force results in faster cat', () => {
      const slow = catAt(PX, PY);
      const fast = catAt(PX, PY);
      slow.applyWind(1, 0, 0.1);
      fast.applyWind(1, 0, 0.9);
      expect(fast.vx).toBeGreaterThan(slow.vx);
    });
  });

  describe('isGone', () => {
    test('false when cat is on-screen', () => {
      expect(catAt(PX, PY).isGone()).toBe(false);
    });

    test('false near (but not past) the edge buffer', () => {
      expect(catAt(-80, PY).isGone()).toBe(false); // -89 is still alive
    });

    test('true past left edge buffer', () => {
      expect(catAt(-100, PY).isGone()).toBe(true);
    });

    test('true past right edge buffer', () => {
      expect(catAt(W + 100, PY).isGone()).toBe(true);
    });

    test('true past top edge buffer', () => {
      expect(catAt(PX, -100).isGone()).toBe(true);
    });

    test('true past bottom edge buffer', () => {
      expect(catAt(PX, H + 100).isGone()).toBe(true);
    });
  });
});
