import React, { useRef, useEffect, useState } from 'react';
import { GameProps } from '../../types';
import { Button } from '../ui/Button';

export const Sumo: React.FC<GameProps> = ({ onBack, onFinish }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [winner, setWinner] = useState<'p1' | 'p2' | null>(null);
  const animationRef = useRef<number | null>(null);

  const RADIUS = 30;
  const ARENA_RADIUS = 250; // Increased arena size
  const SPEED = 6;
  
  const state = useRef({
    p1: { x: 0, y: 0, angle: 0, color: '#3b82f6' },
    p2: { x: 0, y: 0, angle: Math.PI, color: '#ef4444' },
    keys: new Set<string>(),
    p1Touching: false,
    p2Touching: false,
    width: 0,
    height: 0,
    cx: 0,
    cy: 0
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const init = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const s = state.current;
      s.width = canvas.width;
      s.height = canvas.height;
      s.cx = canvas.width / 2;
      s.cy = canvas.height / 2;

      // Start positions
      s.p1.x = s.cx - 100;
      s.p1.y = s.cy;
      s.p2.x = s.cx + 100;
      s.p2.y = s.cy;
    };
    
    init();
    window.addEventListener('resize', init);

    // Controls
    const handleKeyDown = (e: KeyboardEvent) => state.current.keys.add(e.code);
    const handleKeyUp = (e: KeyboardEvent) => state.current.keys.delete(e.code);
    
    // Touch controls - simplistic check for left/right side of screen
    const handleTouchStart = (e: TouchEvent) => {
        e.preventDefault();
        for(let i=0; i<e.touches.length; i++) {
            if(e.touches[i].clientX < state.current.width/2) state.current.p1Touching = true;
            else state.current.p2Touching = true;
        }
    };
    const handleTouchEnd = (e: TouchEvent) => {
        e.preventDefault();
        // Reset all, then re-check remaining touches (simpler than tracking IDs)
        state.current.p1Touching = false;
        state.current.p2Touching = false;
        for(let i=0; i<e.touches.length; i++) {
             if(e.touches[i].clientX < state.current.width/2) state.current.p1Touching = true;
             else state.current.p2Touching = true;
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

    const loop = () => {
      if (!winner) {
        update();
      }
      draw();
      animationRef.current = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      window.removeEventListener('resize', init);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchend', handleTouchEnd);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winner]);

  const update = () => {
    const s = state.current;

    // Spin always
    s.p1.angle += 0.1;
    s.p2.angle += 0.1;

    // Move forward on press
    let p1Move = s.keys.has('KeyW') || s.keys.has('KeyS') || s.p1Touching;
    let p2Move = s.keys.has('ArrowUp') || s.keys.has('ArrowDown') || s.p2Touching;

    if (p1Move) {
      s.p1.x += Math.cos(s.p1.angle) * SPEED;
      s.p1.y += Math.sin(s.p1.angle) * SPEED;
    }
    if (p2Move) {
      s.p2.x += Math.cos(s.p2.angle) * SPEED;
      s.p2.y += Math.sin(s.p2.angle) * SPEED;
    }

    // Player vs Player Collision (Circle-Circle)
    const dx = s.p2.x - s.p1.x;
    const dy = s.p2.y - s.p1.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    
    if (dist < RADIUS * 2) {
      // Simple elastic collision response (push apart)
      const overlap = (RADIUS * 2 - dist) / 2;
      const nx = dx / dist;
      const ny = dy / dist;
      
      s.p1.x -= nx * overlap * 1.5; // Bounce back
      s.p1.y -= ny * overlap * 1.5;
      s.p2.x += nx * overlap * 1.5;
      s.p2.y += ny * overlap * 1.5;
    }

    // Check Arena Bounds (Death)
    const distP1 = Math.sqrt((s.p1.x - s.cx)**2 + (s.p1.y - s.cy)**2);
    const distP2 = Math.sqrt((s.p2.x - s.cx)**2 + (s.p2.y - s.cy)**2);
    
    if (distP1 > ARENA_RADIUS) {
        setWinner('p2');
        if(onFinish) onFinish('p2');
    } else if (distP2 > ARENA_RADIUS) {
        setWinner('p1');
        if(onFinish) onFinish('p1');
    }
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const s = state.current;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, s.width, s.height);

    // Draw Arena
    ctx.beginPath();
    ctx.arc(s.cx, s.cy, ARENA_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = '#1e293b';
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 5;
    ctx.stroke();

    // Draw Player 1
    drawPlayer(ctx, s.p1.x, s.p1.y, s.p1.angle, '#3b82f6');
    
    // Draw Player 2
    drawPlayer(ctx, s.p2.x, s.p2.y, s.p2.angle, '#ef4444');
  };

  const drawPlayer = (ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, color: string) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    
    // Body
    ctx.beginPath();
    ctx.arc(0, 0, RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.shadowBlur = 15;
    ctx.shadowColor = color;
    ctx.fill();
    
    // Spike/Direction Indicator
    ctx.beginPath();
    ctx.moveTo(RADIUS, 0);
    ctx.lineTo(RADIUS + 15, 0);
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 4;
    ctx.stroke();
    
    ctx.restore();
  };

  const reset = () => {
      const s = state.current;
      s.p1.x = s.cx - 100;
      s.p1.y = s.cy;
      s.p2.x = s.cx + 100;
      s.p2.y = s.cy;
      setWinner(null);
  };

  return (
    <div className="fixed inset-0">
      <canvas ref={canvasRef} className="block w-full h-full" />
      
      {/* Tutorial Overlay */}
      {!winner && (
          <div className="absolute bottom-10 w-full text-center pointer-events-none opacity-50">
             <p className="text-white text-sm">Press Button to Dash</p>
          </div>
      )}

      {/* Touch Areas (Invisible buttons for mobile) */}
      <div className="absolute inset-0 flex">
          <div className="w-1/2 h-full active:bg-blue-500/10 transition-colors" />
          <div className="w-1/2 h-full active:bg-red-500/10 transition-colors" />
      </div>

      {winner && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-50">
          <h2 className="text-4xl font-black text-white mb-8 arcade-font">
            {winner === 'p1' ? 'BLUE WINS' : 'RED WINS'}
          </h2>
          <div className="flex gap-4">
             <Button onClick={reset}>Rematch</Button>
             <Button variant="secondary" onClick={onBack}>Menu</Button>
          </div>
        </div>
      )}
      
       {!winner && (
         <button onClick={onBack} className="absolute top-4 left-4 p-2 text-slate-500 hover:text-white z-50">
           <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
         </button>
      )}
    </div>
  );
};