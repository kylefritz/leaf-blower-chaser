import { W, H } from './constants';

const grassCanvas = document.createElement('canvas');
grassCanvas.width  = W;
grassCanvas.height = H;

const gc = grassCanvas.getContext('2d') as CanvasRenderingContext2D;

gc.fillStyle = '#4a8c5c';
gc.fillRect(0, 0, W, H);

for (let x = 0; x < W; x += 50)
  for (let y = 0; y < H; y += 50)
    if ((Math.floor(x / 50) + Math.floor(y / 50)) % 2 === 0) {
      gc.fillStyle = '#428054';
      gc.fillRect(x, y, 50, 50);
    }

gc.strokeStyle = '#3a6e48';
gc.lineWidth   = 1.5;
for (let i = 0; i < 350; i++) {
  const tx = Math.random() * W;
  const ty = Math.random() * H;
  gc.save();
  gc.translate(tx, ty);
  for (let b = 0; b < 3; b++) {
    gc.save();
    gc.rotate((b - 1) * 0.35);
    gc.beginPath();
    gc.moveTo(0, 0);
    gc.lineTo(0, -7);
    gc.stroke();
    gc.restore();
  }
  gc.restore();
}

export default grassCanvas;
