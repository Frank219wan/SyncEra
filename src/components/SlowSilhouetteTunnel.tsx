import {useEffect, useRef} from 'react';
import './SlowSilhouetteTunnel.css';

type Props = {
  paused?: boolean;
  /** One complete, seamless passage through the tunnel. */
  durationSeconds?: number;
};

type Crop = {x: number; y: number; width: number; height: number; angle: number};

// Coordinates refer to the supplied 1024 × 721 line-art sheet. Keeping the
// original strokes makes every occupation recognisable at different depths.
const figures: Crop[] = [
  {x: 0, y: 0, width: 119, height: 347, angle: 3.37},
  {x: 158, y: 0, width: 192, height: 340, angle: 4.04},
  {x: 389, y: 6, width: 127, height: 341, angle: 4.76},
  {x: 528, y: 7, width: 185, height: 339, angle: 5.44},
  {x: 737, y: 13, width: 113, height: 333, angle: 6.09},
  {x: 865, y: 4, width: 159, height: 340, angle: .38},
  {x: 0, y: 377, width: 209, height: 344, angle: 1.02},
  {x: 281, y: 374, width: 272, height: 347, angle: 1.71},
  {x: 626, y: 451, width: 190, height: 261, angle: 2.32},
  {x: 866, y: 375, width: 158, height: 343, angle: 2.91},
];

const wrap = (value: number) => value - Math.floor(value);
const fade = (depth: number) => Math.sin(Math.PI * depth) ** 1.35;

function makeSprites(image: HTMLImageElement): HTMLCanvasElement[] {
  const scaleX = image.naturalWidth / 1024;
  const scaleY = image.naturalHeight / 721;
  return figures.map(({x, y, width, height}) => {
    const sprite = document.createElement('canvas');
    sprite.width = Math.round(width * scaleX);
    sprite.height = Math.round(height * scaleY);
    const ink = sprite.getContext('2d', {willReadFrequently: true});
    if (!ink) return sprite;
    ink.drawImage(image, x * scaleX, y * scaleY, width * scaleX, height * scaleY, 0, 0, sprite.width, sprite.height);
    const pixels = ink.getImageData(0, 0, sprite.width, sprite.height);
    for (let i = 0; i < pixels.data.length; i += 4) {
      const grey = pixels.data[i] * .2126 + pixels.data[i + 1] * .7152 + pixels.data[i + 2] * .0722;
      // White paper becomes transparent; anti-aliased dark strokes stay soft.
      pixels.data[i] = 35;
      pixels.data[i + 1] = 75;
      pixels.data[i + 2] = 57;
      pixels.data[i + 3] = Math.round(Math.max(0, Math.min(1, (237 - grey) / 155)) * 255);
    }
    ink.putImageData(pixels, 0, 0);
    return sprite;
  });
}

function paint(ctx: CanvasRenderingContext2D, width: number, height: number, phase: number, sprites: HTMLCanvasElement[]) {
  ctx.clearRect(0, 0, width, height);
  const cx = width * .51;
  const cy = height * .51;
  const shortSide = Math.min(width, height);

  // Receding, broken ellipses give depth without a hard sci-fi grid.
  for (let i = 0; i < 17; i++) {
    const depth = wrap(phase + i / 17);
    const radius = .045 + depth ** 1.75 * .78;
    const alpha = fade(depth) * .16;
    ctx.beginPath();
    ctx.ellipse(cx, cy, width * radius, height * radius * .76, -.08, .16 + i * .25, Math.PI * 1.34 + i * .25);
    ctx.strokeStyle = `rgba(69, 110, 83, ${alpha})`;
    ctx.lineWidth = Math.max(.6, 1.7 * depth);
    ctx.stroke();
  }

  // The ten original figures occupy different lanes and depths. Both ends of
  // every journey fade to zero, so the phase can wrap without a visible cut.
  sprites.forEach((sprite, i) => {
    const depth = wrap(phase + i / sprites.length);
    const distance = .055 + depth ** 1.6 * .72;
    const angle = figures[i].angle;
    const x = cx + Math.cos(angle) * width * distance;
    const y = cy + Math.sin(angle) * height * distance * .83;
    const targetHeight = shortSide * (.105 + .34 * depth ** 1.55);
    const targetWidth = targetHeight * sprite.width / sprite.height;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(phase * Math.PI * 2 + i) * .022);
    ctx.globalAlpha = fade(depth) * (.29 + depth * .38);
    ctx.drawImage(sprite, -targetWidth / 2, -targetHeight / 2, targetWidth, targetHeight);
    ctx.restore();
  });
}

export function SlowSilhouetteTunnel({paused = false, durationSeconds = 180}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const elapsedRef = useRef(0);
  const spritesRef = useRef<HTMLCanvasElement[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d', {alpha: true});
    if (!canvas || !ctx) return;
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const image = new Image();
    let sprites = spritesRef.current;
    let frame = 0;
    let running = false;
    let previous = 0;
    let lastPaint = 0;
    let disposed = false;
    let width = 0;
    let height = 0;

    const render = () => {
      if (sprites.length) paint(ctx, width, height, media.matches ? .24 : (elapsedRef.current / (Math.max(durationSeconds, 1) * 1000)) % 1, sprites);
    };
    const tick = (now: number) => {
      running = false;
      if (disposed) return;
      if (previous) elapsedRef.current += Math.min(now - previous, 100);
      previous = now;
      if (now - lastPaint >= 33) {
        render();
        lastPaint = now;
      }
      schedule();
    };
    const schedule = () => {
      if (!disposed && !running && !paused && !document.hidden && !media.matches) {
        running = true;
        frame = requestAnimationFrame(tick);
      }
    };
    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      width = bounds.width;
      height = bounds.height;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.max(1, Math.round(height * ratio));
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      render();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    if (!sprites.length) {
      image.onload = () => { if (!disposed) { sprites = makeSprites(image); spritesRef.current = sprites; render(); } };
      image.src = '/images/profession-silhouettes.png';
    }
    const onStateChange = () => { previous = 0; render(); schedule(); };
    media.addEventListener('change', onStateChange);
    document.addEventListener('visibilitychange', onStateChange);
    resize();
    schedule();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      media.removeEventListener('change', onStateChange);
      document.removeEventListener('visibilitychange', onStateChange);
      image.onload = null;
    };
  }, [durationSeconds, paused]);

  return <canvas ref={canvasRef} className="slow-silhouette-tunnel" aria-hidden="true"/>;
}
