import { ctx } from './canvas';

export class Popup {
  x: number;
  y: number;
  text: string;
  life: number;

  constructor(x: number, y: number, text: string) {
    this.x    = x;
    this.y    = y;
    this.text = text;
    this.life = 1.0;
  }

  update(): void {
    this.y    -= 1.2;
    this.life -= 0.025;
  }

  draw(): void {
    ctx.globalAlpha = this.life;
    ctx.fillStyle   = '#fff';
    ctx.strokeStyle = '#000';
    ctx.lineWidth   = 3;
    ctx.font        = 'bold 22px Arial';
    ctx.textAlign   = 'center';
    ctx.strokeText(this.text, this.x, this.y);
    ctx.fillText(this.text,   this.x, this.y);
    ctx.textAlign   = 'left';
    ctx.globalAlpha = 1;
  }

  get dead(): boolean {
    return this.life <= 0;
  }
}
