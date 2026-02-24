export interface Blowable {
  x: number;
  y: number;
  vx: number;
  vy: number;
  sz: number;
  scared: boolean;
  scaredTimer: number;
  exclamTimer: number;
  readonly facing: number;
  update(): void;
  applyWind(wx: number, wy: number, force: number): void;
  isGone(): boolean;
  draw(): void;
}
