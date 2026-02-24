import { describe, test, expect } from 'bun:test';
import { Popup } from '../../src/popup';

describe('Popup', () => {
  describe('constructor', () => {
    test('stores position and text', () => {
      const p = new Popup(100, 200, '+1 😸');
      expect(p.x).toBe(100);
      expect(p.y).toBe(200);
      expect(p.text).toBe('+1 😸');
    });

    test('starts at full opacity', () => {
      const p = new Popup(0, 0, '');
      expect(p.life).toBe(1.0);
    });

    test('not dead on creation', () => {
      const p = new Popup(0, 0, '');
      expect(p.dead).toBe(false);
    });
  });

  describe('update', () => {
    test('floats upward each frame', () => {
      const p = new Popup(100, 200, '');
      p.update();
      expect(p.y).toBeLessThan(200);
    });

    test('fades each frame', () => {
      const p = new Popup(0, 0, '');
      p.update();
      expect(p.life).toBeLessThan(1.0);
    });

    test('x position does not change', () => {
      const p = new Popup(100, 200, '');
      p.update();
      expect(p.x).toBe(100);
    });

    test('becomes dead after enough frames', () => {
      const p = new Popup(0, 0, '');
      for (let i = 0; i < 100; i++) p.update();
      expect(p.dead).toBe(true);
    });
  });

  describe('dead getter', () => {
    test('false while life > 0', () => {
      const p = new Popup(0, 0, '');
      p.life = 0.01;
      expect(p.dead).toBe(false);
    });

    test('true when life is 0', () => {
      const p = new Popup(0, 0, '');
      p.life = 0;
      expect(p.dead).toBe(true);
    });
  });
});
