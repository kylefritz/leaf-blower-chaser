import { ctx } from './canvas';
import { WIND_HALF_ANGLE } from './constants';

export class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  decay: number;
  r: number;
  hue: number;

  constructor(x: number, y: number, baseAngle: number) {
    this.x     = x;
    this.y     = y;
    const spread = (Math.random() - 0.5) * WIND_HALF_ANGLE * 2;
    const spd    = 7 + Math.random() * 6;
    this.vx    = Math.cos(baseAngle + spread) * spd;
    this.vy    = Math.sin(baseAngle + spread) * spd;
    this.life  = 1.0;
    this.decay = 0.022 + Math.random() * 0.022;
    this.r     = 1.5 + Math.random() * 2.5;
    this.hue   = 185 + Math.random() * 35;
  }

  update(): void {
    this.x    += this.vx;
    this.y    += this.vy;
    this.vx   *= 0.96;
    this.vy   *= 0.96;
    this.life -= this.decay;
  }

  draw(): void {
    ctx.globalAlpha = this.life * 0.75;
    ctx.fillStyle   = `hsl(${this.hue},80%,82%)`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r * this.life, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  get dead(): boolean {
    return this.life <= 0;
  }
}
