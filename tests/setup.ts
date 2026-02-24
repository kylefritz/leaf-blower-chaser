/**
 * Preload: runs before every test file (configured in bunfig.toml).
 *
 * canvas.ts calls document.getElementById and getContext at import time,
 * which breaks in a non-browser environment. We replace it entirely with
 * a no-op mock so logic-only tests never touch the DOM.
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

mock.module('./src/canvas.ts', () => ({
  canvas: {
    width: 800,
    height: 600,
    addEventListener: noop,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
    style: new Proxy({}, { set() { return true; } }),
  } as unknown as HTMLCanvasElement,
  ctx: noopCtx,
}));
