/**
 * Preload: runs before every test file (configured in bunfig.toml).
 *
 * Mocks canvas.ts so game modules can be imported without a DOM.
 * Path is relative to this file (tests/setup.ts → ../src/canvas.ts).
 */
import { mock } from 'bun:test';

const noop = (): void => {};

const noopCtx = new Proxy({} as CanvasRenderingContext2D, {
  get(_, prop: string) {
    if (prop === 'createLinearGradient') return () => ({ addColorStop: noop });
    return noop;
  },
  set() { return true; },
});

mock.module('../src/canvas.ts', () => ({
  canvas: {
    width: 800,
    height: 600,
    addEventListener: noop,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
    style: new Proxy({}, { set() { return true; } }),
  } as unknown as HTMLCanvasElement,
  ctx: noopCtx,
}));
