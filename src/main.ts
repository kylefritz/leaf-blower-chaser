import { canvas }                                           from './canvas';
import { W, H, PX, PY, MAX_CATS }                          from './constants';
import { Particle }                                          from './particle';
import { Popup }                                             from './popup';
import { Cat }                                               from './cat';
import { Mouse, drawBackground, drawWindCone, drawPlayer, drawHUD, drawCursor } from './renderer';
import { applyWindToCats }                                   from './wind';
import { logEvent }                                           from './logger';

// ─── State ───────────────────────────────────────────────────────────────────
const mouse: Mouse = { x: PX + 150, y: PY };
let playerAngle    = 0;
let particles: Particle[] = [];
let cats: Cat[]            = [];
let popups: Popup[]        = [];
let score      = 0;
let spawnTimer = 0;
let frame      = 0;

// ─── Game loop ───────────────────────────────────────────────────────────────
function loop(): void {
  frame++;
  playerAngle = Math.atan2(mouse.y - PY, mouse.x - PX);
  if (frame % 10 === 0) {
    logEvent('mouse_move', frame, { x: Math.round(mouse.x), y: Math.round(mouse.y),
      angle: Math.round(playerAngle * 1000) / 1000 });
  }

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
  applyWindToCats(cats, playerAngle, PX, PY, (force, cx, cy) => {
    logEvent('cat_scared', frame, {
      force: Math.round(force * 1000) / 1000,
      cx: Math.round(cx), cy: Math.round(cy),
    });
  });

  for (const p of popups) p.update();
  popups = popups.filter(p => !p.dead);

  // Remove cats that fled off-screen, spawn "+1" popups
  const before = cats.length;
  cats = cats.filter(c => {
    if (c.isGone()) {
      logEvent('cat_fled', frame, { cx: Math.round(c.x), cy: Math.round(c.y) });
      popups.push(new Popup(
        Math.max(30, Math.min(W - 30, c.x)),
        Math.max(30, Math.min(H - 30, c.y)),
        '+1 😸',
      ));
      return false;
    }
    return true;
  });
  const delta = before - cats.length;
  score += delta;
  if (delta > 0) logEvent('score_change', frame, { score, delta });

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
logEvent('session_start', 0);
loop();
