import { ctx } from './canvas';
import { W, H, PX, PY } from './constants';
import { rand } from './rng';
import type { Blowable } from './blowable';

interface DogCoat {
  body: string;
  accent: string;
}

const COATS: DogCoat[] = [
  { body: '#c8843c', accent: '#8a5520' },  // brown/golden
  { body: '#5c3318', accent: '#3a1e0a' },  // chocolate
  { body: '#9aabb8', accent: '#6a7e8e' },  // husky gray
  { body: '#f0f0f0', accent: '#222222' },  // dalmatian
  { body: '#d4a055', accent: '#9a6828' },  // tan
];

export class Dog implements Blowable {
  x: number;
  y: number;
  vx: number;
  vy: number;
  bodyClr: string;
  accentClr: string;
  sz: number;
  wobble: number;
  wanderAngle: number;
  scared: boolean;
  scaredTimer: number;
  exclamTimer: number;

  constructor() {
    const side = Math.floor(rand() * 4);
    if      (side === 0) { this.x = rand() * W; this.y = -40; }
    else if (side === 1) { this.x = W + 40;     this.y = rand() * H; }
    else if (side === 2) { this.x = rand() * W; this.y = H + 40; }
    else                 { this.x = -40;        this.y = rand() * H; }

    const coat      = COATS[Math.floor(rand() * COATS.length)];
    this.bodyClr    = coat.body;
    this.accentClr  = coat.accent;
    this.sz         = 20 + rand() * 7;
    this.wobble     = Math.random() * Math.PI * 2; // visual only — not replayed

    const dx = PX - this.x;
    const dy = PY - this.y;
    const d  = Math.hypot(dx, dy);
    const spd = 0.7 + rand() * 0.2;
    this.vx          = (dx / d) * spd;
    this.vy          = (dy / d) * spd;
    this.wanderAngle = Math.atan2(dy, dx);
    this.scared      = false;
    this.scaredTimer = 0;
    this.exclamTimer = 0;
  }

  get facing(): number {
    return Math.atan2(this.vy, this.vx);
  }

  update(): void {
    this.wobble += 0.10;

    if (this.scared) {
      this.scaredTimer--;
      this.exclamTimer--;
      if (this.scaredTimer <= 0) this.scared = false;
      this.vx *= 0.975;
      this.vy *= 0.975;
    } else {
      this.wanderAngle += (rand() - 0.5) * 0.09;
      this.vx += Math.cos(this.wanderAngle) * 0.06;
      this.vy += Math.sin(this.wanderAngle) * 0.06;
      const sp = Math.hypot(this.vx, this.vy);
      if (sp > 2.0) { this.vx = (this.vx / sp) * 2.0; this.vy = (this.vy / sp) * 2.0; }
      // Small attraction toward player — prevents edge sticking
      const tpx = PX - this.x;
      const tpy = PY - this.y;
      const td  = Math.hypot(tpx, tpy);
      if (td > 1) { this.vx += (tpx / td) * 0.02; this.vy += (tpy / td) * 0.02; }

      if (this.x < 40)     this.vx += 0.12;
      if (this.x > W - 40) this.vx -= 0.12;
      if (this.y < 40)     this.vy += 0.12;
      if (this.y > H - 40) this.vy -= 0.12;
    }

    this.x += this.vx;
    this.y += this.vy;
  }

  applyWind(wx: number, wy: number, force: number): void {
    const wasScared = this.scared;
    this.vx += wx * force * 4;
    this.vy += wy * force * 4;
    const sp = Math.hypot(this.vx, this.vy);
    if (sp > 10) { this.vx = (this.vx / sp) * 10; this.vy = (this.vy / sp) * 10; }
    this.scared      = true;
    this.scaredTimer = 60;
    if (!wasScared) this.exclamTimer = 40;
  }

  isGone(): boolean {
    return this.x < -100 || this.x > W + 100 || this.y < -100 || this.y > H + 100;
  }

  draw(): void {
    const s = this.sz;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.facing);

    // tail — short thick wagging, curves upward from rear
    ctx.save();
    ctx.strokeStyle = this.bodyClr;
    ctx.lineWidth   = s * 0.38;   // thicker than cat tail
    ctx.lineCap     = 'round';
    const tw = Math.sin(this.wobble * 1.8) * s * 0.9; // fast wag
    ctx.beginPath();
    ctx.moveTo(-s * 0.9, 0);
    ctx.quadraticCurveTo(-s * 1.4, tw * 0.5, -s * 1.8, -s * 0.5 + tw * 0.3);
    ctx.stroke();
    ctx.restore();

    // body — stockier ellipse (wider proportions than cat)
    ctx.fillStyle = this.bodyClr;
    ctx.beginPath();
    ctx.ellipse(0, 0, s, s * 0.80, 0, 0, Math.PI * 2);
    ctx.fill();

    // head — round arc (no pointed ears)
    ctx.beginPath();
    ctx.arc(s * 0.9, 0, s * 0.72, 0, Math.PI * 2);
    ctx.fill();

    // floppy ears — rounded ovals hanging down from head sides
    ctx.fillStyle = this.accentClr;
    ([-1, 1] as const).forEach(sy => {
      ctx.beginPath();
      ctx.ellipse(s * 0.78, sy * s * 0.78, s * 0.22, s * 0.48, sy * 0.35, 0, Math.PI * 2);
      ctx.fill();
    });

    // snout — slightly protruding muzzle
    ctx.fillStyle = this.accentClr;
    ctx.beginPath();
    ctx.ellipse(s * 1.42, 0, s * 0.32, s * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();

    // round nose — dark circle at snout tip
    ctx.fillStyle = '#2a1a1a';
    ctx.beginPath();
    ctx.ellipse(s * 1.62, 0, s * 0.12, s * 0.09, 0, 0, Math.PI * 2);
    ctx.fill();

    // eyes — round (not cat-slit)
    if (this.scared) {
      ctx.strokeStyle = '#f55';
      ctx.lineWidth   = 1.5;
      ([-0.28, 0.28] as const).forEach(ey => {
        ctx.beginPath();
        ctx.arc(s * 0.92, s * ey, s * 0.16, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#111';
        ctx.beginPath();
        ctx.arc(s * 0.92, s * ey, s * 0.08, 0, Math.PI * 2);
        ctx.fill();
      });
    } else {
      ([-0.28, 0.28] as const).forEach(ey => {
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.arc(s * 0.92, s * ey, s * 0.16, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(s * 0.92 + 1.2, s * ey - 1.2, s * 0.07, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // tongue out when scared — pink arc below snout
    if (this.scared) {
      ctx.strokeStyle = '#ff7aa0';
      ctx.lineWidth   = s * 0.13;
      ctx.lineCap     = 'round';
      ctx.beginPath();
      ctx.arc(s * 1.50, s * 0.10, s * 0.14, 0, Math.PI);
      ctx.stroke();
    }

    // exclamation mark on first scare
    if (this.exclamTimer > 0) {
      const alpha = Math.min(1, this.exclamTimer / 15);
      ctx.globalAlpha = alpha;
      ctx.fillStyle   = '#ffe04a';
      ctx.strokeStyle = '#000';
      ctx.lineWidth   = 2;
      ctx.font        = `bold ${Math.round(s)}px Arial`;
      ctx.textAlign   = 'center';
      ctx.strokeText('!', 0, -s * 2.2);
      ctx.fillText('!',   0, -s * 2.2);
      ctx.textAlign   = 'left';
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }
}
