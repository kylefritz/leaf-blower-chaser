import { ctx } from './canvas';
import { W, H, PX, PY } from './constants';
import { rand } from './rng';
import type { Blowable } from './blowable';

interface Coat {
  body: string;
  ear: string;
}

const COATS: Coat[] = [
  { body: '#c8883c', ear: '#a0622c' },  // orange tabby
  { body: '#888',    ear: '#666'    },  // gray
  { body: '#e8d8b0', ear: '#c0b080' },  // cream
  { body: '#2a2a2a', ear: '#111'    },  // black
  { body: '#c0784a', ear: '#9a5832' },  // ginger
];

export class Cat implements Blowable {
  x: number;
  y: number;
  vx: number;
  vy: number;
  bodyClr: string;
  earClr: string;
  sz: number;
  wobble: number;
  wanderAngle: number;
  scared: boolean;
  scaredTimer: number;
  exclamTimer: number;

  constructor() {
    const side = Math.floor(rand() * 4);
    if      (side === 0) { this.x = rand() * W; this.y = -35; }
    else if (side === 1) { this.x = W + 35;     this.y = rand() * H; }
    else if (side === 2) { this.x = rand() * W; this.y = H + 35; }
    else                 { this.x = -35;        this.y = rand() * H; }

    const coat   = COATS[Math.floor(rand() * COATS.length)];
    this.bodyClr = coat.body;
    this.earClr  = coat.ear;
    this.sz      = 16 + rand() * 5;
    this.wobble  = Math.random() * Math.PI * 2; // visual only — not replayed

    const dx = PX - this.x;
    const dy = PY - this.y;
    const d  = Math.hypot(dx, dy);
    const spd = 0.55 + rand() * 0.4;
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
    this.wobble += 0.12;

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
      if (sp > 1.6) { this.vx = (this.vx / sp) * 1.6; this.vy = (this.vy / sp) * 1.6; }
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
    this.vx += wx * force * 7;
    this.vy += wy * force * 7;
    const sp = Math.hypot(this.vx, this.vy);
    if (sp > 13) { this.vx = (this.vx / sp) * 13; this.vy = (this.vy / sp) * 13; }
    this.scared      = true;
    this.scaredTimer = 100;
    if (!wasScared) this.exclamTimer = 40;
  }

  isGone(): boolean {
    return this.x < -90 || this.x > W + 90 || this.y < -90 || this.y > H + 90;
  }

  draw(): void {
    const s = this.sz;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.facing);

    // tail
    ctx.save();
    ctx.strokeStyle = this.bodyClr;
    ctx.lineWidth   = s * 0.28;
    ctx.lineCap     = 'round';
    const tw = Math.sin(this.wobble) * s * 0.8;
    ctx.beginPath();
    ctx.moveTo(-s * 0.85, 0);
    ctx.quadraticCurveTo(-s * 1.6, tw, -s * 2.1, tw * 0.4);
    ctx.stroke();
    ctx.restore();

    // body
    ctx.fillStyle = this.bodyClr;
    ctx.beginPath();
    ctx.ellipse(0, 0, s, s * 0.72, 0, 0, Math.PI * 2);
    ctx.fill();

    // head
    ctx.beginPath();
    ctx.arc(s * 0.85, 0, s * 0.65, 0, Math.PI * 2);
    ctx.fill();

    // ears
    ctx.fillStyle = this.earClr;
    ([-1, 1] as const).forEach(sy => {
      ctx.beginPath();
      ctx.moveTo(s * 0.52, sy * s * 0.38);
      ctx.lineTo(s * 0.78, sy * s * 0.92);
      ctx.lineTo(s * 1.08, sy * s * 0.42);
      ctx.closePath();
      ctx.fill();
    });

    // inner ear
    ctx.fillStyle = 'rgba(255,150,150,0.4)';
    ([-1, 1] as const).forEach(sy => {
      ctx.beginPath();
      ctx.moveTo(s * 0.58, sy * s * 0.40);
      ctx.lineTo(s * 0.78, sy * s * 0.78);
      ctx.lineTo(s * 1.02, sy * s * 0.46);
      ctx.closePath();
      ctx.fill();
    });

    // eyes
    if (this.scared) {
      ctx.strokeStyle = '#f55';
      ctx.lineWidth   = 1.5;
      ([-0.22, 0.22] as const).forEach(ey => {
        ctx.beginPath();
        ctx.arc(s * 0.85, s * ey, 4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#111';
        ctx.beginPath();
        ctx.arc(s * 0.85, s * ey, 1.8, 0, Math.PI * 2);
        ctx.fill();
      });
    } else {
      ctx.fillStyle = '#222';
      ([-0.22, 0.22] as const).forEach(ey => {
        ctx.beginPath();
        ctx.ellipse(s * 0.85, s * ey, 2, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(s * 0.85 + 1, s * ey - 1.2, 1, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // whiskers
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth   = 0.8;
    ([-1, 1] as const).forEach(sy => {
      ctx.beginPath();
      ctx.moveTo(s * 0.72, sy * s * 0.05);
      ctx.lineTo(s * 1.38, sy * s * 0.20);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(s * 0.72, 0);
      ctx.lineTo(s * 1.42, 0);
      ctx.stroke();
    });

    // exclamation mark on first scare
    if (this.exclamTimer > 0) {
      const alpha = Math.min(1, this.exclamTimer / 15);
      ctx.globalAlpha = alpha;
      ctx.fillStyle   = '#ffe04a';
      ctx.strokeStyle = '#000';
      ctx.lineWidth   = 2;
      ctx.font        = `bold ${Math.round(s)}px Arial`;
      ctx.textAlign   = 'center';
      ctx.strokeText('!', 0, -s * 2);
      ctx.fillText('!',   0, -s * 2);
      ctx.textAlign   = 'left';
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }
}
