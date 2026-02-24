import { describe, test, expect } from 'bun:test';
import { Cat } from '../../src/cat';
import { applyWindToCats } from '../../src/wind';
import { PX, PY, WIND_RANGE } from '../../src/constants';

/** Place a cat at an explicit position with zeroed velocity. */
function catAt(x: number, y: number): Cat {
  const c = new Cat();
  c.x = x; c.y = y;
  c.vx = 0; c.vy = 0;
  c.scared = false; c.scaredTimer = 0;
  return c;
}

describe('wind collision', () => {
  test('cat directly in front (angle = 0) is pushed right and scared', () => {
    const cat = catAt(PX + 100, PY);
    applyWindToCats([cat], 0, PX, PY);
    expect(cat.scared).toBe(true);
    expect(cat.vx).toBeGreaterThan(0);
  });

  test('cat directly behind player (angle = 0) is not affected', () => {
    const cat = catAt(PX - 100, PY);
    applyWindToCats([cat], 0, PX, PY);
    expect(cat.scared).toBe(false);
  });

  test('cat 90° to the side of the wind direction is not affected', () => {
    // Wind pointing right (angle 0), cat is directly below — well outside the cone
    const cat = catAt(PX, PY + 100);
    applyWindToCats([cat], 0, PX, PY);
    expect(cat.scared).toBe(false);
  });

  test('cat beyond WIND_RANGE is not affected', () => {
    const cat = catAt(PX + WIND_RANGE + 50, PY);
    applyWindToCats([cat], 0, PX, PY);
    expect(cat.scared).toBe(false);
  });

  test('cat closer than 22 px (inside player body) is not affected', () => {
    const cat = catAt(PX + 10, PY);
    applyWindToCats([cat], 0, PX, PY);
    expect(cat.scared).toBe(false);
  });

  test('closer cat receives stronger force than a farther cat', () => {
    const close = catAt(PX + 50, PY);
    const far   = catAt(PX + 180, PY);
    applyWindToCats([close], 0, PX, PY);
    applyWindToCats([far],   0, PX, PY);
    expect(close.vx).toBeGreaterThan(far.vx);
  });

  test('wind rotates with playerAngle — pointing down hits a cat below', () => {
    const cat = catAt(PX, PY + 100); // directly below
    applyWindToCats([cat], Math.PI / 2, PX, PY); // angle π/2 = pointing down
    expect(cat.scared).toBe(true);
    expect(cat.vy).toBeGreaterThan(0);
  });

  test('multiple cats in the cone are all scared', () => {
    const cats = [
      catAt(PX + 80,  PY),
      catAt(PX + 120, PY + 20),
      catAt(PX + 150, PY - 15),
    ];
    applyWindToCats(cats, 0, PX, PY);
    for (const c of cats) expect(c.scared).toBe(true);
  });

  test('cats outside the cone are not affected even when in range', () => {
    // One cat at the edge of the cone angle — should be just outside
    const HALF = 0.30; // matches WIND_HALF_ANGLE
    const perpAngle = HALF + 0.15; // clearly outside
    const cat = catAt(
      PX + Math.cos(perpAngle) * 100,
      PY + Math.sin(perpAngle) * 100,
    );
    applyWindToCats([cat], 0, PX, PY);
    expect(cat.scared).toBe(false);
  });

  test('calm cat does not move when no wind is applied', () => {
    const cat = catAt(PX + 150, PY + 200); // outside cone
    applyWindToCats([cat], 0, PX, PY);
    expect(cat.vx).toBe(0);
    expect(cat.vy).toBe(0);
  });
});
