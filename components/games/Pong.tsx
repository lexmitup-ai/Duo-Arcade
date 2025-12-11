import React, { useRef, useEffect, useState } from 'react';
import { GameProps } from '../../types';
import { Button } from '../ui/Button';

export const Pong: React.FC<GameProps> = ({ onBack, onFinish, config }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scores, setScores] = useState({ p1: 0, p2: 0 });
  const [gameOver, setGameOver] = useState(false);
  const animationRef = useRef<number | null>(null);
  
  const isAiMode = config.mode === 'pve';
  
  const paddleHeight = 100;
  const paddleWidth = 15;
  const ballSize = 10;
  
  const state = useRef({
    p1Y: 300,
    p2Y: 300,
    ballX: 400,
    ballY: 300,
    ballSpeedX: 5,
    ballSpeedY: 3,
    keys: new Set<string>(),
    width: 800,
    height: 600
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      state.current.width = canvas.width;
      state.current.height = canvas.height;
      if (state.current.ballX > canvas.width) state.current.ballX = canvas.width / 2;
      if (state.current.ballY > canvas.height) state.current.ballY = canvas.height / 2;
    };
    
    window.addEventListener('resize', resize);
    resize();

    const handleKeyDown = (e: KeyboardEvent) => state.current.keys.add(e.code);
    const handleKeyUp = (e: KeyboardEvent) => state.current.keys.delete(e.code);

    const handleTouch = (e: TouchEvent) => {
      e.preventDefault();
      for (let i = 0; i < e.touches.length; i++) {
        const touch = e.touches[i];
        if (touch.clientX < canvas.width / 2) {
          state.current.p1Y = touch.clientY - paddleHeight / 2;
        } else if (!isAiMode) {
          state.current.p2Y = touch.clientY - paddleHeight / 2;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    canvas.addEventListener('touchmove', handleTouch, { passive: false });
    canvas.addEventListener('touchstart', handleTouch, { passive: false });

    const loop = () => {
      update();
      draw();
      animationRef.current = requestAnimationFrame(loop);
    };
    
    loop();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (canvas) {
          canvas.removeEventListener('touchmove', handleTouch);
          canvas.removeEventListener('touchstart', handleTouch);
      }
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAiMode]); 

  const update = () => {
    if (gameOver) return;
    
    const s = state.current;
    const speed = 8; 

    if (s.keys.has('KeyW')) s.p1Y -= speed;
    if (s.keys.has('KeyS')) s.p1Y += speed;
    
    // P2 Control (Human or AI)
    if (isAiMode) {
        // Simple tracking AI
        const center = s.p2Y + paddleHeight/2;
        if (center < s.ballY - 10) s.p2Y += speed * 0.8; // AI slightly slower/imperfect
        if (center > s.ballY + 10) s.p2Y -= speed * 0.8;
    } else {
        if (s.keys.has('ArrowUp')) s.p2Y -= speed;
        if (s.keys.has('ArrowDown')) s.p2Y += speed;
    }

    // Clamping
    s.p1Y = Math.max(0, Math.min(s.height - paddleHeight, s.p1Y));
    s.p2Y = Math.max(0, Math.min(s.height - paddleHeight, s.p2Y));

    // Ball Movement
    s.ballX += s.ballSpeedX;
    s.ballY += s.ballSpeedY;

    if (s.ballY <= 0 || s.ballY + ballSize >= s.height) {
      s.ballSpeedY *= -1;
    }

    if (
      s.ballX <= 30 + paddleWidth &&
      s.ballY + ballSize >= s.p1Y &&
      s.ballY <= s.p1Y + paddleHeight
    ) {
      s.ballSpeedX = Math.abs(s.ballSpeedX) + 0.5;
      s.ballX = 30 + paddleWidth + 1;
    }

    if (
      s.ballX + ballSize >= s.width - 30 - paddleWidth &&
      s.ballY + ballSize >= s.p2Y &&
      s.ballY <= s.p2Y + paddleHeight
    ) {
      s.ballSpeedX = -(Math.abs(s.ballSpeedX) + 0.5);
      s.ballX = s.width - 30 - paddleWidth - ballSize - 1;
    }

    if (s.ballX < 0) {
      setScores(prev => {
        const newScores = { ...prev, p2: prev.p2 + 1 };
        checkWin(newScores);
        return newScores;
      });
      resetBall(1);
    } else if (s.ballX > s.width) {
      setScores(prev => {
        const newScores = { ...prev, p1: prev.p1 + 1 };
        checkWin(newScores);
        return newScores;
      });
      resetBall(-1);
    }
  };

  const checkWin = (currentScores: { p1: number, p2: number }) => {
    if (currentScores.p1 >= 5 || currentScores.p2 >= 5) {
      setGameOver(true);
      if (onFinish) onFinish(currentScores.p1 >= 5 ? 'p1' : 'p2');
    }
  };

  const resetBall = (direction: number) => {
    const s = state.current;
    s.ballX = s.width / 2;
    s.ballY = s.height / 2;
    s.ballSpeedX = 5 * direction;
    s.ballSpeedY = 3 * (Math.random() > 0.5 ? 1 : -1);
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const s = state.current;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, s.width, s.height);

    ctx.strokeStyle = '#1e293b';
    ctx.setLineDash([10, 15]);
    ctx.beginPath();
    ctx.moveTo(s.width / 2, 0);
    ctx.lineTo(s.width / 2, s.height);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.shadowBlur = 15;
    ctx.shadowColor = '#3b82f6';
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(30, s.p1Y, paddleWidth, paddleHeight);

    ctx.shadowColor = '#ef4444';
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(s.width - 30 - paddleWidth, s.p2Y, paddleWidth, paddleHeight);

    ctx.shadowColor = '#ffffff';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(s.ballX, s.ballY, ballSize, ballSize);
  };

  return (
    <div className="fixed inset-0 bg-slate-900">
      <canvas ref={canvasRef} className="block w-full h-full" />
      
      <div className="absolute top-4 w-full flex justify-between px-10 pointer-events-none">
        <div className="text-4xl font-bold text-blue-500 font-mono arcade-font">{scores.p1}</div>
        <div className="text-xl text-slate-500 mt-2 font-bold">First to 5</div>
        <div className="text-4xl font-bold text-red-500 font-mono arcade-font">{scores.p2}</div>
      </div>

      {!gameOver && (
          <div className="absolute bottom-8 w-full flex justify-between px-10 pointer-events-none opacity-50 text-xs text-white">
              <div>W / S (or Touch Left)</div>
              <div>{isAiMode ? 'AI OPPONENT' : 'Up / Down (or Touch Right)'}</div>
          </div>
      )}

      {gameOver && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-50">
          <h2 className="text-4xl font-black text-white mb-8 arcade-font">
            {scores.p1 > scores.p2 ? 'BLUE WINS' : 'RED WINS'}
          </h2>
          <div className="flex gap-4">
             <Button onClick={() => {
                 setScores({p1:0, p2:0});
                 setGameOver(false);
                 resetBall(1);
             }}>Rematch</Button>
             <Button variant="secondary" onClick={onBack}>Menu</Button>
          </div>
        </div>
      )}
      
      {!gameOver && (
         <button onClick={onBack} className="absolute top-4 left-4 p-2 text-slate-500 hover:text-white z-50">
           <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
         </button>
      )}
    </div>
  );
};