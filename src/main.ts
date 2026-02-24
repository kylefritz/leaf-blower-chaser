import { canvas }                                           from './canvas';
import { W, H, PX, PY, WIND_RANGE, WIND_HALF_ANGLE, MAX_CATS } from './constants';
import { Particle }                                          from './particle';
import { Popup }                                             from './popup';
import { Cat }                                               from './cat';
import { Mouse, drawBackground, drawWindCone, drawPlayer, drawHUD, drawCursor } from './renderer';

// ─── State ───────────────────────────────────────────────────────────────────
const mouse: Mouse = { x: PX + 150, y: PY };
let playerAngle    = 0;
let particles: Particle[] = [];
let cats: Cat[]            = [];
let popups: Popup[]        = [];
let score      = 0;
let spawnTimer = 0;
let frame      = 0;

// ─── Wind physics ────────────────────────────────────────────────────────────
function applyWind(): void {
  for (const cat of cats) {
    const dx   = cat.x - PX;
    const dy   = cat.y - PY;
    const dist = Math.hypot(dx, dy);

    if (dist < WIND_RANGE && dist > 22) {
      let diff = Math.atan2(dy, dx) - playerAngle;
      while (diff >  Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;

      if (Math.abs(diff) < WIND_HALF_ANGLE) {
        cat.applyWind(
          Math.cos(playerAngle),
          Math.sin(playerAngle),
          1 - dist / WIND_RANGE,
        );
      }
    }
  }
}

// ─── Game loop ───────────────────────────────────────────────────────────────
function loop(): void {
  frame++;
  playerAngle = Math.atan2(mouse.y - PY, mouse.x - PX);

  // Emit particles from nozzle tip
  const nozzleX = PX + Math.cos(playerAngle) * 60;
  const nozzleY = PY + Math.sin(playerAngle) * 60;
  for (let i = 0; i < 4; i++)
    particles.push(new Particle(nozzleX, nozzleY, playerAngle));

  // Spawn cats — difficulty ramps with score
  spawnTimer++;
  const interval = Math.max(55, 140 - score * 4);
  if (spawnTimer >= interval && cats.length < MAX_CATS) {
    cats.push(new Cat());
    spawnTimer = 0;
  }

  // Update
  for (const p of particles) p.update();
  particles = particles.filter(p => !p.dead);

  for (const c of cats) c.update();
  applyWind();

  for (const p of popups) p.update();
  popups = popups.filter(p => !p.dead);

  // Remove cats that fled off-screen, spawn "+1" popups
  const before = cats.length;
  cats = cats.filter(c => {
    if (c.isGone()) {
      popups.push(new Popup(
        Math.max(30, Math.min(W - 30, c.x)),
        Math.max(30, Math.min(H - 30, c.y)),
        '+1 😸',
      ));
      return false;
    }
    return true;
  });
  score += before - cats.length;

  // Draw
  drawBackground();
  drawWindCone(playerAngle);
  for (const p of particles) p.draw();
  for (const c of cats)      c.draw();
  drawPlayer(playerAngle);
  for (const p of popups)    p.draw();
  drawHUD(score, cats.length, frame);
  drawCursor(mouse);

  requestAnimationFrame(loop);
}

// ─── Input ───────────────────────────────────────────────────────────────────
canvas.addEventListener('mousemove', (e: MouseEvent) => {
  const r  = canvas.getBoundingClientRect();
  const sx = canvas.width  / r.width;
  const sy = canvas.height / r.height;
  mouse.x  = (e.clientX - r.left) * sx;
  mouse.y  = (e.clientY - r.top)  * sy;
});

// ─── Go ──────────────────────────────────────────────────────────────────────
loop();
