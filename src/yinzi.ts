import { ctx } from './canvas';
import { W, H, PX, PY } from './constants';
import { rand } from './rng';
import type { Blowable } from './blowable';

const PHRASES = ['Yinzi, luggages!', 'Logan', 'im a dj'] as const;

export class Yinzi implements Blowable {
  x: number;
  y: number;
  vx: number;
  vy: number;
  sz: number;
  wobble: number;
  wanderAngle: number;
  scared: boolean;
  scaredTimer: number;
  exclamTimer: number;
  phrase: string;

  constructor() {
    const side = Math.floor(rand() * 4);
    if      (side === 0) { this.x = rand() * W; this.y = -45; }
    else if (side === 1) { this.x = W + 45;     this.y = rand() * H; }
    else if (side === 2) { this.x = rand() * W; this.y = H + 45; }
    else                 { this.x = -45;        this.y = rand() * H; }

    this.sz     = 24 + rand() * 5;
    this.wobble = Math.random() * Math.PI * 2; // visual only — not replayed

    const dx = PX - this.x;
    const dy = PY - this.y;
    const d  = Math.hypot(dx, dy);
    const spd = 0.6 + rand() * 0.3;
    this.vx          = (dx / d) * spd;
    this.vy          = (dy / d) * spd;
    this.wanderAngle = Math.atan2(dy, dx);
    this.scared      = false;
    this.scaredTimer = 0;
    this.exclamTimer = 0;
    this.phrase      = '';
  }

  get facing(): number {
    return Math.atan2(this.vy, this.vx);
  }

  update(): void {
    this.wobble += 0.11;

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
      if (sp > 1.8) { this.vx = (this.vx / sp) * 1.8; this.vy = (this.vy / sp) * 1.8; }
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
    this.vx += wx * force * 3;
    this.vy += wy * force * 3;
    const sp = Math.hypot(this.vx, this.vy);
    if (sp > 8) { this.vx = (this.vx / sp) * 8; this.vy = (this.vy / sp) * 8; }
    this.scared      = true;
    this.scaredTimer = 45;
    if (!wasScared) {
      this.exclamTimer = 40;
      this.phrase = PHRASES[Math.floor(rand() * PHRASES.length)];
    }
  }

  isGone(): boolean {
    return this.x < -110 || this.x > W + 110 || this.y < -110 || this.y > H + 110;
  }

  draw(): void {
    const s = this.sz;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.facing);

    // --- long straight black hair (flows behind, animated with wobble) ---
    // Hair is drawn before the body so it sits underneath
    const hairSway = Math.sin(this.wobble) * s * 0.25;
    ctx.fillStyle = '#1a1008';
    // Left hair panel
    ctx.beginPath();
    ctx.moveTo(s * 0.3, -s * 0.55);
    ctx.quadraticCurveTo(-s * 0.6 + hairSway, s * 0.4, -s * 1.2 + hairSway * 0.6, s * 1.6);
    ctx.quadraticCurveTo(-s * 1.0 + hairSway * 0.6, s * 1.7, -s * 0.7 + hairSway * 0.4, s * 1.5);
    ctx.quadraticCurveTo(-s * 0.4 + hairSway * 0.3, s * 0.3, s * 0.1, -s * 0.3);
    ctx.closePath();
    ctx.fill();
    // Right hair panel
    ctx.beginPath();
    ctx.moveTo(s * 0.3, -s * 0.55);
    ctx.quadraticCurveTo(-s * 0.4 - hairSway, s * 0.4, -s * 0.8 - hairSway * 0.6, s * 1.6);
    ctx.quadraticCurveTo(-s * 0.6 - hairSway * 0.6, s * 1.7, -s * 0.35 - hairSway * 0.4, s * 1.5);
    ctx.quadraticCurveTo(-s * 0.1 - hairSway * 0.3, s * 0.3, s * 0.2, -s * 0.3);
    ctx.closePath();
    ctx.fill();

    // --- skirt / dress lower half ---
    ctx.fillStyle = '#e8305a';
    ctx.beginPath();
    // Skirt flares out from waist downward (triangle-ish arc shape)
    ctx.moveTo(-s * 0.38, s * 0.55);
    ctx.quadraticCurveTo(-s * 0.72, s * 1.15, -s * 0.6, s * 1.7);
    ctx.lineTo(s * 0.6, s * 1.7);
    ctx.quadraticCurveTo(s * 0.72, s * 1.15, s * 0.38, s * 0.55);
    ctx.closePath();
    ctx.fill();

    // --- dress bodice (torso) ---
    ctx.fillStyle = '#ff6fa0';
    ctx.beginPath();
    ctx.ellipse(0, s * 0.18, s * 0.42, s * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();

    // --- dress neckline accent ---
    ctx.fillStyle = '#e8305a';
    ctx.beginPath();
    ctx.ellipse(0, -s * 0.22, s * 0.28, s * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();

    // --- small arms / hands on each side ---
    ctx.fillStyle = '#f0c8a0';
    ([-1, 1] as const).forEach(side => {
      // upper arm
      ctx.beginPath();
      ctx.ellipse(side * s * 0.54, s * 0.22, s * 0.13, s * 0.32, side * 0.3, 0, Math.PI * 2);
      ctx.fill();
      // hand (small circle)
      ctx.beginPath();
      ctx.arc(side * s * 0.6, s * 0.62, s * 0.14, 0, Math.PI * 2);
      ctx.fill();
    });

    // --- head ---
    ctx.fillStyle = '#f0c8a0';
    ctx.beginPath();
    ctx.ellipse(s * 0.55, 0, s * 0.46, s * 0.52, 0, 0, Math.PI * 2);
    ctx.fill();

    // --- top hair / fringe over forehead ---
    ctx.fillStyle = '#1a1008';
    ctx.beginPath();
    ctx.ellipse(s * 0.55, -s * 0.38, s * 0.46, s * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    // Fringe dips down slightly in center
    ctx.beginPath();
    ctx.moveTo(s * 0.18, -s * 0.26);
    ctx.quadraticCurveTo(s * 0.55, -s * 0.06, s * 0.9, -s * 0.26);
    ctx.quadraticCurveTo(s * 0.92, -s * 0.40, s * 0.55, -s * 0.42);
    ctx.quadraticCurveTo(s * 0.18, -s * 0.40, s * 0.18, -s * 0.26);
    ctx.fill();

    // --- eyes ---
    if (this.scared) {
      // Wide open O eyes
      ctx.strokeStyle = '#222';
      ctx.lineWidth   = 1.6;
      ctx.fillStyle   = '#fff';
      ([-0.18, 0.18] as const).forEach(ey => {
        ctx.beginPath();
        ctx.arc(s * 0.55, s * ey, s * 0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.arc(s * 0.55, s * ey, s * 0.05, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
      });
      // Scared eyebrows (arched up)
      ctx.strokeStyle = '#3a2010';
      ctx.lineWidth   = 1.5;
      ([-0.18, 0.18] as const).forEach(ey => {
        ctx.beginPath();
        ctx.arc(s * 0.55, s * (ey - 0.17), s * 0.10, Math.PI + 0.3, -0.3);
        ctx.stroke();
      });
    } else {
      // Calm almond eyes
      ctx.fillStyle = '#2a1408';
      ([-0.18, 0.18] as const).forEach(ey => {
        ctx.beginPath();
        ctx.ellipse(s * 0.55, s * ey, s * 0.11, s * 0.07, 0, 0, Math.PI * 2);
        ctx.fill();
        // Highlight
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(s * 0.58, s * ey - s * 0.03, s * 0.03, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#2a1408';
      });
      // Gentle eyebrow strokes
      ctx.strokeStyle = '#3a2010';
      ctx.lineWidth   = 1.4;
      ([-0.18, 0.18] as const).forEach(ey => {
        ctx.beginPath();
        ctx.moveTo(s * 0.40, s * (ey - 0.12));
        ctx.quadraticCurveTo(s * 0.55, s * (ey - 0.17), s * 0.70, s * (ey - 0.12));
        ctx.stroke();
      });
    }

    // --- small smile ---
    ctx.strokeStyle = '#b06040';
    ctx.lineWidth   = 1.2;
    ctx.beginPath();
    if (this.scared) {
      // small open mouth O
      ctx.arc(s * 0.55, s * 0.18, s * 0.07, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      // gentle curved smile
      ctx.arc(s * 0.55, s * 0.10, s * 0.10, 0.2, Math.PI - 0.2);
      ctx.stroke();
    }

    // --- legs (two short rounded stubs below skirt) ---
    ctx.fillStyle = '#f0c8a0';
    ([-0.22, 0.22] as const).forEach(lx => {
      ctx.beginPath();
      ctx.ellipse(s * lx, s * 1.78, s * 0.14, s * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();
    });
    // Simple shoes
    ctx.fillStyle = '#333';
    ([-0.22, 0.22] as const).forEach(lx => {
      ctx.beginPath();
      ctx.ellipse(s * lx, s * 1.96, s * 0.17, s * 0.10, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    // --- phrase speech bubble (replaces "!" of other entities) ---
    if (this.exclamTimer > 0) {
      const alpha = Math.min(1, this.exclamTimer / 15);
      ctx.globalAlpha = alpha;
      ctx.fillStyle   = '#ffe04a';
      ctx.strokeStyle = '#000';
      ctx.lineWidth   = 2;
      ctx.font        = `bold ${Math.round(s * 0.6)}px Arial`;
      ctx.textAlign   = 'center';
      ctx.strokeText(this.phrase, 0, -s * 2.4);
      ctx.fillText(this.phrase,   0, -s * 2.4);
      ctx.textAlign   = 'left';
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }
}
