import { W, H } from './constants';

export const canvas = document.getElementById('game') as HTMLCanvasElement;
export const ctx    = canvas.getContext('2d') as CanvasRenderingContext2D;

canvas.width  = W;
canvas.height = H;

function resize(): void {
  const s = Math.min(window.innerWidth / W, window.innerHeight / H, 1);
  canvas.style.width  = `${W * s}px`;
  canvas.style.height = `${H * s}px`;
}

resize();
window.addEventListener('resize', resize);
