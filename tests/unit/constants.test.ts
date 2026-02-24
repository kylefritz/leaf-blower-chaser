import { describe, test, expect } from 'bun:test';
import { W, H, PX, PY, WIND_RANGE, WIND_HALF_ANGLE, MAX_CATS } from '../../src/constants';

describe('constants', () => {
  test('canvas is 800×600', () => {
    expect(W).toBe(800);
    expect(H).toBe(600);
  });

  test('player origin is centred', () => {
    expect(PX).toBe(W / 2);
    expect(PY).toBe(H / 2);
  });

  test('WIND_RANGE is positive and fits inside the canvas', () => {
    expect(WIND_RANGE).toBeGreaterThan(0);
    expect(WIND_RANGE).toBeLessThan(Math.min(W, H));
  });

  test('WIND_HALF_ANGLE is a positive radian value narrower than π/4', () => {
    expect(WIND_HALF_ANGLE).toBeGreaterThan(0);
    expect(WIND_HALF_ANGLE).toBeLessThan(Math.PI / 4);
  });

  test('MAX_CATS is a positive integer', () => {
    expect(MAX_CATS).toBeGreaterThan(0);
    expect(Number.isInteger(MAX_CATS)).toBe(true);
  });
});
