import React, { useRef, useEffect, useState } from 'react';
import { GameProps } from '../../types';
import { Button } from '../ui/Button';

export const Tron: React.FC<GameProps> = ({ onBack, onFinish }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [winner, setWinner] = useState<'p1' | 'p2' | 'draw' | null>(null);
  const animationRef = useRef<number | null>(null);

  const CELL_SIZE = 5; // Smaller cells for more grid
  
  const state = useRef({
    p1: { x: 10, y: 50, dx: 1, dy: 0, dead: false, color: '#3b82f6' },
    p2: { x: 90, y: 50, dx: -1, dy: 0, dead: false, color: '#ef4444' },
    grid: new Set<string>(), // Store occupied coordinates "x,y"
    width: 0,
    height: 0,
    cols: 0,
    rows: 0,
    startPending: true
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const init = () => {
      // Force consistent grid size ratio roughly matching screen
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      const s = state.current;
      s.width = canvas.width;
      s.height = canvas.height;
      s.cols = Math.floor(s.width / CELL_SIZE);
      s.rows = Math.floor(s.height / CELL_SIZE);
      s.grid.clear();
      
      // Reset Players
      s.p1 = { x: 10, y: Math.floor(s.rows/2), dx: 1, dy: 0, dead: false, color: '#3b82f6' };
      s.p2 = { x: s.cols - 10, y: Math.floor(s.rows/2), dx: -1, dy: 0, dead: false, color: '#ef4444' };
      s.startPending = true;
      
      // Draw border to grid
      for(let x=0; x<s.cols; x++) {
          s.grid.add(`${x},0`);
          s.grid.add(`${x},${s.rows-1}`);
      }
      for(let y=0; y<s.rows; y++) {
          s.grid.add(`0,${y}`);
          s.grid.add(`${s.cols-1},${y}`);
      }
    };
    
    init();

    const handleKeyDown = (e: KeyboardEvent) => {
      if(state.current.startPending) state.current.startPending = false;
      const s = state.current;
      
      // P1 Controls (WASD) - Prevent 180 turns
      if (e.code === 'KeyW' && s.p1.dy === 0) { s.p1.dx = 0; s.p1.dy = -1; }
      if (e.code === 'KeyS' && s.p1.dy === 0) { s.p1.dx = 0; s.p1.dy = 1; }
      if (e.code === 'KeyA' && s.p1.dx === 0) { s.p1.dx = -1; s.p1.dy = 0; }
      if (e.code === 'KeyD' && s.p1.dx === 0) { s.p1.dx = 1; s.p1.dy = 0; }

      // P2 Controls (Arrows)
      if (e.code === 'ArrowUp' && s.p2.dy === 0) { s.p2.dx = 0; s.p2.dy = -1; }
      if (e.code === 'ArrowDown' && s.p2.dy === 0) { s.p2.dx = 0; s.p2.dy = 1; }
      if (e.code === 'ArrowLeft' && s.p2.dx === 0) { s.p2.dx = -1; s.p2.dy = 0; }
      if (e.code === 'ArrowRight' && s.p2.dx === 0) { s.p2.dx = 1; s.p2.dy = 0; }
    };

    // Mobile touch controls (Split screen tap zones)
    const handleTouch = (e: TouchEvent) => {
       e.preventDefault();
       if(state.current.startPending) state.current.startPending = false;
       
       const s = state.current;
       const w = window.innerWidth;
       const h = window.innerHeight;

       for(let i=0; i<e.touches.length; i++) {
           const t = e.touches[i];
           // P1 (Left Side)
           if (t.clientX < w/2) {
               // Top half = Up, Bottom half = Down, Left Edge = Left, Center = Right? 
               // Simplified: Relative to current Pos? No.
               // Simple 4-way tap zones on left side
               const lx = t.clientX;
               const ly = t.clientY;
               if (ly < h/3 && s.p1.dy === 0) { s.p1.dx = 0; s.p1.dy = -1; } // Up
               else if (ly > (2*h)/3 && s.p1.dy === 0) { s.p1.dx = 0; s.p1.dy = 1; } // Down
               else if (lx < w/4 && s.p1.dx === 0) { s.p1.dx = -1; s.p1.dy = 0; } // Left
               else if (s.p1.dx === 0) { s.p1.dx = 1; s.p1.dy = 0; } // Right
           } 
           // P2 (Right Side)
           else {
               const rx = t.clientX;
               const ry = t.clientY;
               if (ry < h/3 && s.p2.dy === 0) { s.p2.dx = 0; s.p2.dy = -1; }
               else if (ry > (2*h)/3 && s.p2.dy === 0) { s.p2.dx = 0; s.p2.dy = 1; }
               else if (rx > (3*w)/4 && s.p2.dx === 0) { s.p2.dx = 1; s.p2.dy = 0; }
               else if (s.p2.dx === 0) { s.p2.dx = -1; s.p2.dy = 0; }
           }
       }
    };

    window.addEventListener('keydown', handleKeyDown);
    canvas.addEventListener('touchstart', handleTouch, { passive: false });

    let lastTime = 0;
    const loop = (time: number) => {
      if (time - lastTime > 30) { // Throttle speed ~30fps equivalent
          if (!winner && !state.current.startPending) {
            update();
          }
          lastTime = time;
      }
      draw();
      animationRef.current = requestAnimationFrame(loop);
    };
    
    animationRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      canvas.removeEventListener('touchstart', handleTouch);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winner]);

  const update = () => {
    const s = state.current;

    // Move
    s.p1.x += s.p1.dx;
    s.p1.y += s.p1.dy;
    s.p2.x += s.p2.dx;
    s.p2.y += s.p2.dy;

    const p1Key = `${s.p1.x},${s.p1.y}`;
    const p2Key = `${s.p2.x},${s.p2.y}`;

    // Collision Check
    const p1Hit = s.grid.has(p1Key);
    const p2Hit = s.grid.has(p2Key);
    const headOn = s.p1.x === s.p2.x && s.p1.y === s.p2.y;

    if (p1Hit && p2Hit) { setWinner('draw'); if(onFinish) onFinish('draw'); return; }
    if (headOn) { setWinner('draw'); if(onFinish) onFinish('draw'); return; }
    if (p1Hit) { setWinner('p2'); if(onFinish) onFinish('p2'); return; }
    if (p2Hit) { setWinner('p1'); if(onFinish) onFinish('p1'); return; }

    // Add trails
    s.grid.add(p1Key);
    s.grid.add(p2Key);
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const s = state.current;

    if (s.startPending) {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, s.width, s.height);
        ctx.fillStyle = 'white';
        ctx.font = '20px monospace';
        ctx.textAlign = 'center';
        ctx.fillText("PRESS KEY / TAP TO START", s.width/2, s.height/2);
        return;
    }

    // Only clear if just started? No, Tron leaves trails.
    // Actually we need to redraw grid or just keep drawing on top?
    // Canvas persistence is better for Tron.
    // But we need to handle window resize clearing it.
    
    // For this simple implementation, we redraw everything from grid set every frame? 
    // Optimization: Draw only new heads. But react re-renders might wipe canvas?
    // Let's redraw background and then all active grid points.
    
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, s.width, s.height);

    // Draw Grid
    // Iterating Set is slow if huge.
    // Optimization: Draw trails as Rects.
    // For 'Arcade' feel, let's just iterate. 
    
    ctx.fillStyle = '#1e293b'; // Walls/Trails color
    
    // Draw Border
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, 0, s.width, CELL_SIZE);
    ctx.fillRect(0, s.height-CELL_SIZE, s.width, CELL_SIZE);
    ctx.fillRect(0, 0, CELL_SIZE, s.height);
    ctx.fillRect(s.width-CELL_SIZE, 0, CELL_SIZE, s.height);

    // Draw Trails - We can't easily distinguish P1/P2 trails in the Set unless we store value.
    // Let's modify grid to store color? Map<string, string>.
    // For speed, let's just draw all white for now or skip optimization.
    // Actually, let's just not clear the canvas! 
    // But then we can't handle the "Menu" overlay or resize cleanly.
    // Let's use the Grid Set.
    
    // To make it look cool, we just draw the heads bright and the rest dimmed.
    // Since we don't have history in Set, we just draw gray blocks for all obstacles.
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    s.grid.forEach(key => {
        const [x, y] = key.split(',').map(Number);
        ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    });

    // Draw Heads
    ctx.shadowBlur = 10;
    ctx.shadowColor = s.p1.color;
    ctx.fillStyle = s.p1.color;
    ctx.fillRect(s.p1.x * CELL_SIZE, s.p1.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    
    ctx.shadowColor = s.p2.color;
    ctx.fillStyle = s.p2.color;
    ctx.fillRect(s.p2.x * CELL_SIZE, s.p2.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    
    ctx.shadowBlur = 0;
  };

  const reset = () => {
      const s = state.current;
      s.grid.clear();
      s.startPending = true;
      setWinner(null);
      // Re-init borders
      for(let x=0; x<s.cols; x++) { s.grid.add(`${x},0`); s.grid.add(`${x},${s.rows-1}`); }
      for(let y=0; y<s.rows; y++) { s.grid.add(`0,${y}`); s.grid.add(`${s.cols-1},${y}`); }
      s.p1 = { x: 10, y: Math.floor(s.rows/2), dx: 1, dy: 0, dead: false, color: '#3b82f6' };
      s.p2 = { x: s.cols - 10, y: Math.floor(s.rows/2), dx: -1, dy: 0, dead: false, color: '#ef4444' };
  };

  return (
    <div className="fixed inset-0 bg-slate-900">
      <canvas ref={canvasRef} className="block w-full h-full" />
      
      {/* UI Overlay */}
      <div className="absolute top-4 w-full flex justify-between px-10 pointer-events-none z-10">
        <div className="text-xl font-bold text-blue-500 font-mono">P1</div>
        <div className="text-xl font-bold text-red-500 font-mono">P2</div>
      </div>

      {winner && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-50">
          <h2 className="text-4xl font-black text-white mb-8 arcade-font">
            {winner === 'draw' ? 'CRASH!' : winner === 'p1' ? 'BLUE SURVIVED' : 'RED SURVIVED'}
          </h2>
          <div className="flex gap-4">
             <Button onClick={reset}>Reboot</Button>
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