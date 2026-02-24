/**
 * Seedable PRNG (mulberry32) for deterministic game simulation and replay.
 *
 * Game logic (cat spawns, wander) uses rand() so sessions are replayable
 * from a seed. Visual effects (particles, grass) keep Math.random() since
 * they don't affect game state and would otherwise pollute the RNG stream.
 */

let _rand: () => number = Math.random;

/** Seed the game-logic PRNG. Call once at session start. */
export function seedRandom(seed: number): void {
  let s = seed >>> 0;
  _rand = (): number => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Generate a seed using the system RNG. Call once at startup, before seedRandom. */
export function generateSeed(): number {
  return (Math.random() * 0x100000000) >>> 0;
}

/** Seeded random in [0, 1). Use in game-logic code instead of Math.random(). */
export function rand(): number {
  return _rand();
}
