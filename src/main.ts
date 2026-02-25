import { canvas }                                           from './canvas';
import { W, H, PX, PY, MAX_CATS, MAX_DOGS, DOG_POINTS, PLAYER_RADIUS } from './constants';
import { Particle }                                          from './particle';
import { Popup }                                             from './popup';
import { Cat }                                               from './cat';
import { Dog }                                               from './dog';
import { Mouse, drawBackground, drawWindCone, drawPlayer, drawHUD, drawGameOver, drawCursor } from './renderer';
import { applyWindToCats }                                   from './wind';
import { logEvent }                                          from './logger';
import { seedRandom, generateSeed }                          from './rng';

// ─── State ───────────────────────────────────────────────────────────────────
const mouse: Mouse = { x: PX + 150, y: PY };
let playerAngle    = 0;
let particles: Particle[] = [];
let cats: Cat[]            = [];
let dogs: Dog[]            = [];
let popups: Popup[]        = [];
let score        = 0;
let lives        = 3;
let invincible   = 0;
let gameOver     = false;
let spawnTimer   = 0;
let dogSpawnTimer = 0;
let frame        = 0;

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
    const cat = new Cat();
    logEvent('cat_spawn', frame, {
      x: Math.round(cat.x), y: Math.round(cat.y),
      sz: +cat.sz.toFixed(2), bodyClr: cat.bodyClr,
      vx: +cat.vx.toFixed(3), vy: +cat.vy.toFixed(3),
      wanderAngle: +cat.wanderAngle.toFixed(3),
    });
    cats.push(cat);
    spawnTimer = 0;
  }

  // Spawn dogs — difficulty ramps with score
  dogSpawnTimer++;
  const dogInterval = Math.max(90, 200 - score * 3);
  if (dogSpawnTimer >= dogInterval && dogs.length < MAX_DOGS) {
    const dog = new Dog();
    logEvent('dog_spawn', frame, {
      x: Math.round(dog.x), y: Math.round(dog.y),
      sz: +dog.sz.toFixed(2), bodyClr: dog.bodyClr,
      vx: +dog.vx.toFixed(3), vy: +dog.vy.toFixed(3),
      wanderAngle: +dog.wanderAngle.toFixed(3),
    });
    dogs.push(dog);
    dogSpawnTimer = 0;
  }

  // Update
  for (const p of particles) p.update();
  particles = particles.filter(p => !p.dead);

  for (const c of cats) c.update();
  for (const d of dogs) d.update();

  applyWindToCats(cats, playerAngle, PX, PY, (force, cx, cy) => {
    logEvent('cat_scared', frame, {
      force: Math.round(force * 1000) / 1000,
      cx: Math.round(cx), cy: Math.round(cy),
    });
  });

  applyWindToCats(dogs, playerAngle, PX, PY, (force, cx, cy) => {
    logEvent('dog_scared', frame, {
      force: Math.round(force * 1000) / 1000,
      cx: Math.round(cx), cy: Math.round(cy),
    });
  });

  // Player-cat and player-dog collision
  if (invincible === 0) {
    cats = cats.filter(c => {
      if (Math.hypot(c.x - PX, c.y - PY) < PLAYER_RADIUS + c.sz) {
        lives--;
        invincible = 120;
        logEvent('player_hit', frame, { entity: 'cat', lives, cx: Math.round(c.x), cy: Math.round(c.y) });
        return false;
      }
      return true;
    });

    if (invincible === 0) {
      dogs = dogs.filter(d => {
        if (Math.hypot(d.x - PX, d.y - PY) < PLAYER_RADIUS + d.sz) {
          lives--;
          invincible = 120;
          logEvent('player_hit', frame, { entity: 'dog', lives, cx: Math.round(d.x), cy: Math.round(d.y) });
          return false;
        }
        return true;
      });
    }
  }
  if (invincible > 0) invincible--;

  if (lives <= 0 && !gameOver) {
    gameOver = true;
    logEvent('game_over', frame, { score });
  }

  if (gameOver) {
    drawGameOver(score);
    return;
  }

  for (const p of popups) p.update();
  popups = popups.filter(p => !p.dead);

  // Remove cats that fled off-screen, spawn "+1" popups
  const catsBefore = cats.length;
  cats = cats.filter(c => {
    if (c.isGone()) {
      logEvent('cat_fled', frame, { cx: Math.round(c.x), cy: Math.round(c.y) });
      popups.push(new Popup(
        Math.max(30, Math.min(W - 30, c.x)),
        Math.max(30, Math.min(H - 30, c.y)),
        '+1 \uD83D\uDE38',
      ));
      return false;
    }
    return true;
  });
  const catDelta = catsBefore - cats.length;
  score += catDelta;
  if (catDelta > 0) logEvent('score_change', frame, { score, delta: catDelta });

  // Remove dogs that fled off-screen, spawn "+2" popups
  const dogsBefore = dogs.length;
  dogs = dogs.filter(d => {
    if (d.isGone()) {
      logEvent('dog_fled', frame, { cx: Math.round(d.x), cy: Math.round(d.y) });
      popups.push(new Popup(
        Math.max(30, Math.min(W - 30, d.x)),
        Math.max(30, Math.min(H - 30, d.y)),
        '+2 \uD83D\uDC36',
      ));
      return false;
    }
    return true;
  });
  const dogDelta = dogsBefore - dogs.length;
  score += dogDelta * DOG_POINTS;
  if (dogDelta > 0) logEvent('score_change', frame, { score, delta: dogDelta * DOG_POINTS });

  // Draw
  drawBackground();
  drawWindCone(playerAngle);
  for (const p of particles) p.draw();
  for (const c of cats)      c.draw();
  for (const d of dogs)      d.draw();
  drawPlayer(playerAngle, invincible);
  for (const p of popups)    p.draw();
  drawHUD(score, cats.length, dogs.length, frame, lives);
  drawCursor(mouse);

  requestAnimationFrame(loop);
}

// ─── Input ───────────────────────────────────────────────────────────────────
function updateMouseFromClient(clientX: number, clientY: number): void {
  const r  = canvas.getBoundingClientRect();
  const sx = canvas.width  / r.width;
  const sy = canvas.height / r.height;
  mouse.x  = (clientX - r.left) * sx;
  mouse.y  = (clientY - r.top)  * sy;
}

canvas.addEventListener('mousemove', (e: MouseEvent) => {
  updateMouseFromClient(e.clientX, e.clientY);
});

canvas.addEventListener('touchstart', (e: TouchEvent) => {
  e.preventDefault();
  updateMouseFromClient(e.touches[0].clientX, e.touches[0].clientY);
});

canvas.addEventListener('touchmove', (e: TouchEvent) => {
  e.preventDefault();
  updateMouseFromClient(e.touches[0].clientX, e.touches[0].clientY);
});

// ─── Go ──────────────────────────────────────────────────────────────────────
const seed = generateSeed();
seedRandom(seed);
logEvent('session_start', 0, { lives: 3, seed });
loop();
