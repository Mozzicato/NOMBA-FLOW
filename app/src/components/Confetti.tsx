import { useEffect, useRef } from 'react';
import { useFlowStore } from '../store';

const COLORS = ['#ffd21e', '#2dd4a0', '#4d9fff', '#a78bfa', '#ff9f43', '#f472b6'];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  vr: number;
  life: number;
}

export default function Confetti() {
  const burst = useFlowStore((s) => s.confettiBurst);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const raf = useRef(0);

  useEffect(() => {
    if (burst === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: Particle[] = [];
    for (let i = 0; i < 140; i++) {
      const fromLeft = Math.random() < 0.5;
      particles.push({
        x: fromLeft ? -10 : canvas.width + 10,
        y: canvas.height * (0.25 + Math.random() * 0.3),
        vx: (fromLeft ? 1 : -1) * (4 + Math.random() * 7),
        vy: -(6 + Math.random() * 7),
        size: 5 + Math.random() * 6,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        rotation: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.3,
        life: 1,
      });
    }

    const started = performance.now();
    const tick = (t: number) => {
      const elapsed = t - started;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.28;
        p.vx *= 0.985;
        p.rotation += p.vr;
        p.life = Math.max(0, 1 - elapsed / 2600);
        if (p.life > 0 && p.y < canvas.height + 20) alive = true;
        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66);
        ctx.restore();
      }
      if (alive && elapsed < 3000) {
        raf.current = requestAnimationFrame(tick);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [burst]);

  return <canvas ref={canvasRef} className="confetti-canvas" />;
}
