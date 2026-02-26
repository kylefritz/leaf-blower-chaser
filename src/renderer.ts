import { ctx } from './canvas';
import { W, H, PX, PY, WIND_RANGE, WIND_HALF_ANGLE, MAX_CATS, MAX_DOGS } from './constants';
import grassCanvas from './grass';

export interface Mouse {
  x: number;
  y: number;
}

export function drawBackground(): void {
  ctx.drawImage(grassCanvas, 0, 0);
}

export function drawWindCone(angle: number): void {
  const ox = PX + Math.cos(angle) * 60;
  const oy = PY + Math.sin(angle) * 60;

  const grad = ctx.createLinearGradient(
    ox, oy,
    PX + Math.cos(angle) * WIND_RANGE,
    PY + Math.sin(angle) * WIND_RANGE,
  );
  grad.addColorStop(0, 'rgba(180,230,255,0.38)');
  grad.addColorStop(1, 'rgba(180,230,255,0.0)');
  ctx.fillStyle = grad;

  ctx.beginPath();
  ctx.moveTo(ox, oy);
  ctx.lineTo(
    PX + Math.cos(angle + WIND_HALF_ANGLE) * WIND_RANGE,
    PY + Math.sin(angle + WIND_HALF_ANGLE) * WIND_RANGE,
  );
  ctx.lineTo(
    PX + Math.cos(angle - WIND_HALF_ANGLE) * WIND_RANGE,
    PY + Math.sin(angle - WIND_HALF_ANGLE) * WIND_RANGE,
  );
  ctx.closePath();
  ctx.fill();
}

export function drawPlayer(angle: number, invincible = 0): void {
  if (invincible > 0 && Math.floor(invincible / 8) % 2 === 0) return;
  ctx.save();
  ctx.translate(PX, PY);
  ctx.rotate(angle);

  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.ellipse(2, 4, 26, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // legs
  ctx.fillStyle = '#3355bb';
  ctx.beginPath(); ctx.ellipse(-7, -11, 6, 13, -0.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-7,  11, 6, 13,  0.2, 0, Math.PI * 2); ctx.fill();

  // shoes
  ctx.fillStyle = '#222';
  ctx.beginPath(); ctx.ellipse(-15, -11, 7, 4, -0.15, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-15,  11, 7, 4,  0.15, 0, Math.PI * 2); ctx.fill();

  // torso
  ctx.fillStyle = '#e07030';
  ctx.beginPath(); ctx.ellipse(0, 0, 18, 14, 0, 0, Math.PI * 2); ctx.fill();

  // arms
  ctx.fillStyle = '#f0b880';
  ctx.beginPath(); ctx.ellipse(11, -13, 5, 12,  0.3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(11,  13, 5, 12, -0.3, 0, Math.PI * 2); ctx.fill();

  // leaf-blower body
  ctx.fillStyle = '#aaa';
  ctx.beginPath(); ctx.roundRect(4, -7, 40, 14, 4); ctx.fill();
  // engine bump
  ctx.fillStyle = '#888';
  ctx.beginPath(); ctx.roundRect(10, -12, 18, 6, 3); ctx.fill();
  // handle
  ctx.fillStyle = '#666';
  ctx.beginPath(); ctx.roundRect(18, 7, 14, 8, 2); ctx.fill();
  // nozzle cone
  ctx.fillStyle = '#666';
  ctx.beginPath();
  ctx.moveTo(42, -6); ctx.lineTo(58, -9); ctx.lineTo(58, 9); ctx.lineTo(42, 6);
  ctx.closePath();
  ctx.fill();
  // nozzle ring
  ctx.strokeStyle = '#444';
  ctx.lineWidth   = 2;
  ctx.beginPath(); ctx.moveTo(58, -9); ctx.lineTo(58, 9); ctx.stroke();

  // head
  ctx.fillStyle = '#f0b880';
  ctx.beginPath(); ctx.arc(20, 0, 14, 0, Math.PI * 2); ctx.fill();
  // hair
  ctx.fillStyle = '#4a2e10';
  ctx.beginPath(); ctx.ellipse(20, -6, 14, 10, 0, Math.PI, 0); ctx.fill();
  // eye
  ctx.fillStyle = '#222';
  ctx.beginPath(); ctx.arc(25, -2, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(26, -3, 1, 0, Math.PI * 2); ctx.fill();
  // smile
  ctx.strokeStyle = '#a04025';
  ctx.lineWidth   = 1.8;
  ctx.beginPath(); ctx.arc(25, 3, 4, 0.1, Math.PI - 0.1); ctx.stroke();

  ctx.restore();
}

export function drawHUD(score: number, catCount: number, dogCount: number, yinziCount: number, frame: number, lives = 3): void {
  // score panel
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath(); ctx.roundRect(12, 12, 215, 50, 8); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font      = 'bold 21px Arial';
  ctx.fillText(`Score: ${score}`, 22, 44);

  // on-screen count
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath(); ctx.roundRect(12, 68, 310, 30, 6); ctx.fill();
  ctx.fillStyle = '#ccc';
  ctx.font      = '14px Arial';
  const yinziStr = yinziCount > 0 ? `  \u{1F469} ${yinziCount}` : '';
  ctx.fillText(`On screen: \u{1F638} ${catCount}/${MAX_CATS}  \u{1F436} ${dogCount}/${MAX_DOGS}${yinziStr}`, 22, 88);

  // instructions — fade out after ~5 s
  if (frame < 320) {
    const a = Math.min(1, (320 - frame) / 80);
    ctx.globalAlpha = a;
    ctx.fillStyle   = 'rgba(0,0,0,0.55)';
    ctx.beginPath(); ctx.roundRect(W / 2 - 225, H - 72, 450, 56, 8); ctx.fill();
    ctx.fillStyle   = '#fff';
    ctx.font        = '16px Arial';
    ctx.textAlign   = 'center';
    ctx.fillText('Aim the leaf blower (mouse or touch) to scare cats & dogs off screen!', W / 2, H - 48);
    ctx.font        = '13px Arial';
    ctx.fillStyle   = '#bbb';
    ctx.fillText('Dogs are tougher but worth more. Don\u2019t let them reach you!', W / 2, H - 28);
    ctx.textAlign   = 'left';
    ctx.globalAlpha = 1;
  }

  // lives — red hearts
  ctx.font      = '22px Arial';
  ctx.textAlign = 'left';
  for (let i = 0; i < 3; i++) {
    ctx.globalAlpha = i < lives ? 1 : 0.25;
    ctx.fillText('❤️', W - 36 - i * 32, 44);
  }
  ctx.globalAlpha = 1;
}

export function drawCursor(mouse: Mouse): void {
  ctx.save();
  ctx.translate(mouse.x, mouse.y);
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth   = 1.5;
  ctx.beginPath();
  ctx.moveTo(-9, 0); ctx.lineTo(9, 0);
  ctx.moveTo(0, -9); ctx.lineTo(0, 9);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, 5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

export function drawGameOver(score: number): void {
  ctx.fillStyle = 'rgba(0,0,0,0.62)';
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'center';

  ctx.fillStyle = '#ff4444';
  ctx.font      = 'bold 64px Arial';
  ctx.fillText('GAME OVER', W / 2, H / 2 - 40);

  ctx.fillStyle = '#fff';
  ctx.font      = '28px Arial';
  ctx.fillText(`Cats scared away: ${score}`, W / 2, H / 2 + 20);

  ctx.fillStyle = '#aaa';
  ctx.font      = '18px Arial';
  ctx.fillText('Refresh to play again', W / 2, H / 2 + 60);

  ctx.textAlign = 'left';
}
