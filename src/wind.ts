import { PX, PY, WIND_RANGE, WIND_HALF_ANGLE } from './constants';
import type { Blowable } from './blowable';

/**
 * Apply wind force to any blowable entities inside the player's wind cone.
 * originX/originY default to the player's fixed position but are
 * exposed as parameters so tests can use arbitrary origins.
 */
export function applyWindToCats(
  entities: Blowable[],
  playerAngle: number,
  originX = PX,
  originY = PY,
  onNewlyScared?: (force: number, cx: number, cy: number) => void,
): void {
  for (const entity of entities) {
    const dx   = entity.x - originX;
    const dy   = entity.y - originY;
    const dist = Math.hypot(dx, dy);

    if (dist < WIND_RANGE && dist > 22) {
      let diff = Math.atan2(dy, dx) - playerAngle;
      while (diff >  Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;

      if (Math.abs(diff) < WIND_HALF_ANGLE) {
        const force = 1 - dist / WIND_RANGE;
        const wasScared = entity.scared;
        entity.applyWind(
          Math.cos(playerAngle),
          Math.sin(playerAngle),
          force,
        );
        if (!wasScared && entity.scared) onNewlyScared?.(force, entity.x, entity.y);
      }
    }
  }
}
