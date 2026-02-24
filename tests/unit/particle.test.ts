import { describe, test, expect } from 'bun:test';
import { Particle } from '../../src/particle';

describe('Particle', () => {
  describe('constructor', () => {
    test('starts at the given position', () => {
      const p = new Particle(123, 456, 0);
      expect(p.x).toBe(123);
      expect(p.y).toBe(456);
    });

    test('starts at full life', () => {
      const p = new Particle(0, 0, 0);
      expect(p.life).toBe(1.0);
    });

    test('not dead on creation', () => {
      const p = new Particle(0, 0, 0);
      expect(p.dead).toBe(false);
    });

    test('velocity points roughly in baseAngle direction (angle = 0)', () => {
      // With angle = 0 (right), vx should always be positive
      for (let i = 0; i < 20; i++) {
        const p = new Particle(0, 0, 0);
        expect(p.vx).toBeGreaterThan(0);
      }
    });

    test('velocity points roughly in baseAngle direction (angle = π)', () => {
      for (let i = 0; i < 20; i++) {
        const p = new Particle(0, 0, Math.PI);
        expect(p.vx).toBeLessThan(0);
      }
    });

    test('hue is in the blue-cyan range', () => {
      for (let i = 0; i < 20; i++) {
        const p = new Particle(0, 0, 0);
        expect(p.hue).toBeGreaterThanOrEqual(185);
        expect(p.hue).toBeLessThan(221);
      }
    });
  });

  describe('update', () => {
    test('moves position by velocity', () => {
      const p  = new Particle(100, 200, 0);
      const vx = p.vx;
      const vy = p.vy;
      p.update();
      expect(p.x).toBeCloseTo(100 + vx, 5);
      expect(p.y).toBeCloseTo(200 + vy, 5);
    });

    test('life decreases each frame', () => {
      const p = new Particle(0, 0, 0);
      p.update();
      expect(p.life).toBeLessThan(1.0);
    });

    test('velocity decays due to friction', () => {
      const p   = new Particle(0, 0, 0);
      const vx0 = p.vx;
      p.update();
      expect(Math.abs(p.vx)).toBeLessThan(Math.abs(vx0));
    });

    test('becomes dead after sustained updates', () => {
      const p = new Particle(0, 0, 0);
      for (let i = 0; i < 200; i++) p.update();
      expect(p.dead).toBe(true);
    });
  });

  describe('dead getter', () => {
    test('false while life > 0', () => {
      const p = new Particle(0, 0, 0);
      p.life = 0.01;
      expect(p.dead).toBe(false);
    });

    test('true when life reaches 0', () => {
      const p = new Particle(0, 0, 0);
      p.life = 0;
      expect(p.dead).toBe(true);
    });

    test('true when life goes negative', () => {
      const p = new Particle(0, 0, 0);
      p.life = -1;
      expect(p.dead).toBe(true);
    });
  });
});
