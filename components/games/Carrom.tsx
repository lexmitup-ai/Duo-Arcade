import React, { useRef, useEffect, useState } from 'react';
import { GameProps, Difficulty } from '../../types';
import { Button } from '../ui/Button';

// Physics Constants
const BOARD_SIZE = 800; // Internal resolution
const POCKET_RADIUS = 35;
const STRIKER_RADIUS = 22;
const COIN_RADIUS = 15;
const FRICTION = 0.985;
const WALL_DAMPING = 0.6;
const STRIKER_MASS = 2;
const COIN_MASS = 1;

// Colors
const COLOR_BOARD = '#eecfa1'; // Wood
const COLOR_BORDER = '#5d4037';
const COLOR_POCKET = '#1a1a1a';
const COLOR_WHITE = '#f5f5f5';
const COLOR_BLACK = '#262626';
const COLOR_RED = '#ef4444';
const COLOR_STRIKER = '#fef3c7';

type PieceType = 'white' | 'black' | 'red' | 'striker';

interface Piece {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: PieceType;
  radius: number;
  mass: number;
  pocketed: boolean;
}

export const Carrom: React.FC<GameProps> = ({ onBack, onFinish, config }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [turn, setTurn] = useState(0); // 0=Bottom, 1=Left, 2=Top, 3=Right (Standard 4p)
  // For 2P: 0=Bottom, 1=Top (Mapped visually)
  const [gameState, setGameState] = useState<'aiming' | 'shooting' | 'moving' | 'ended'>('aiming');
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [strikerPos, setStrikerPos] = useState(0.5); // 0 to 1 along the baseline
  const [scores, setScores] = useState({ white: 0, black: 0 });
  const [queenPocketed, setQueenPocketed] = useState(false);
  const [coverPending, setCoverPending] = useState(false); // If queen pocketed, next must be own color
  const [winner, setWinner] = useState<string | null>(null);
  
  // Input state
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const aimVector = useRef({ x: 0, y: 0 });

  // Players setup
  // 2 Player Mode: P1 (White) vs P2 (Black). P1 Bottom, P2 Top.
  // 4 Player Mode: Team 1 (White) vs Team 2 (Black). P1(B), P2(L), P3(T), P4(R).
  const isFourPlayer = config.playerCount === 4;
  const isAiMode = config.mode === 'pve';

  // Determine current active player info
  const activePlayerIndex = turn;
  const isAiTurn = isAiMode && activePlayerIndex !== 0; // Assuming P1 is always human at index 0

  useEffect(() => {
    initBoard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Game Loop
  useEffect(() => {
    let animationId: number;
    const loop = () => {
      updatePhysics();
      draw();
      animationId = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(animationId);
  });

  // AI Logic
  useEffect(() => {
    if (isAiTurn && gameState === 'aiming') {
      const timer = setTimeout(() => {
        performAiShot();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isAiTurn, gameState]);

  const initBoard = () => {
    const newPieces: Piece[] = [];
    const center = BOARD_SIZE / 2;
    
    // Pattern: Queen center, surrounded by 6, then 12
    // Inner Circle (6 coins): Alternating
    // Outer Circle (12 coins): Alternating
    
    // Queen
    newPieces.push(createPiece(0, center, center, 'red'));

    // Inner Circle (Radius ~ 32)
    for (let i = 0; i < 6; i++) {
        const angle = (i * 60) * (Math.PI / 180);
        const dist = COIN_RADIUS * 2.1;
        newPieces.push(createPiece(newPieces.length, center + Math.cos(angle) * dist, center + Math.sin(angle) * dist, i % 2 === 0 ? 'white' : 'black'));
    }

    // Outer Circle (Radius ~ 64)
    for (let i = 0; i < 12; i++) {
        const angle = (i * 30) * (Math.PI / 180);
        const dist = COIN_RADIUS * 4.1;
        // Logic to alternate colors nicely usually requires specific pattern but simple alt works
        // Pattern: W,W,B,W,W,B... standard carrom is specific but let's do simple
        const type = (i % 3 === 0 || i % 3 === 1) ? 'white' : 'black'; // Roughly mixed
        // Better standard: W, B, W, B...
        const stdType = i % 2 === 0 ? 'white' : 'black';
        newPieces.push(createPiece(newPieces.length, center + Math.cos(angle) * dist, center + Math.sin(angle) * dist, stdType));
    }

    // Striker (Initially hidden/reset)
    setPieces(newPieces);
    resetStriker(newPieces);
  };

  const createPiece = (id: number, x: number, y: number, type: PieceType): Piece => ({
    id, x, y, vx: 0, vy: 0,
    type,
    radius: type === 'striker' ? STRIKER_RADIUS : COIN_RADIUS,
    mass: type === 'striker' ? STRIKER_MASS : COIN_MASS,
    pocketed: false
  });

  const resetStriker = (currentPieces: Piece[]) => {
    // Remove existing striker if any
    const filtered = currentPieces.filter(p => p.type !== 'striker');
    
    // Determine baseline based on turn
    // 2P: 0=Bottom, 1=Top
    // 4P: 0=Bottom, 1=Left, 2=Top, 3=Right
    
    let bx = BOARD_SIZE / 2;
    let by = BOARD_SIZE - 100; // Default Bottom
    
    if (!isFourPlayer) {
        if (turn === 1) by = 100; // Top
    } else {
        if (turn === 1) { bx = 100; by = BOARD_SIZE/2; } // Left
        if (turn === 2) { bx = BOARD_SIZE/2; by = 100; } // Top
        if (turn === 3) { bx = BOARD_SIZE-100; by = BOARD_SIZE/2; } // Right
    }

    const striker = createPiece(-1, bx, by, 'striker');
    setPieces([...filtered, striker]);
    setStrikerPos(0.5);
    setGameState('aiming');
  };

  const performAiShot = () => {
    const s = pieces.find(p => p.type === 'striker');
    if (!s) return;

    // Simple AI: Find closest target coin of own color
    // If queen is available and needs cover, target own color.
    // If queen available and not pocketed, target queen?
    
    // Determine own color
    let targetColor: PieceType = 'white';
    if (isFourPlayer) {
         // T1 (0,2) = White, T2 (1,3) = Black
         targetColor = (turn === 0 || turn === 2) ? 'white' : 'black';
    } else {
         // P1 = White, P2 = Black
         targetColor = turn === 0 ? 'white' : 'black';
    }

    const targets = pieces.filter(p => !p.pocketed && (p.type === targetColor || p.type === 'red'));
    
    // Pick random target or queen
    const target = targets.find(p => p.type === 'red') || targets[Math.floor(Math.random() * targets.length)];

    if (target) {
        const dx = target.x - s.x;
        const dy = target.y - s.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        // Randomize power based on difficulty
        let power = 20;
        if (config.difficulty === Difficulty.HARD) power = 25 + Math.random() * 5;
        if (config.difficulty === Difficulty.EASY) power = 15 + Math.random() * 10;
        
        // Shoot vector
        s.vx = (dx / dist) * power;
        s.vy = (dy / dist) * power;
        setGameState('moving');
    } else {
        // Just shoot randomly towards center
        const dx = (BOARD_SIZE/2) - s.x;
        const dy = (BOARD_SIZE/2) - s.y;
        s.vx = dx * 0.05;
        s.vy = dy * 0.05;
        setGameState('moving');
    }
  };

  const updatePhysics = () => {
    if (gameState !== 'moving') return;

    let moving = false;
    const newPieces = pieces.map(p => ({ ...p }));
    let piecePocketedThisFrame: PieceType | null = null;

    // 1. Move & Bounce Walls
    newPieces.forEach(p => {
        if (p.pocketed) return;

        p.x += p.vx;
        p.y += p.vy;

        // Friction
        p.vx *= FRICTION;
        p.vy *= FRICTION;

        if (Math.abs(p.vx) > 0.1 || Math.abs(p.vy) > 0.1) moving = true;
        else { p.vx = 0; p.vy = 0; }

        // Walls
        if (p.x < p.radius) { p.x = p.radius; p.vx *= -WALL_DAMPING; }
        if (p.x > BOARD_SIZE - p.radius) { p.x = BOARD_SIZE - p.radius; p.vx *= -WALL_DAMPING; }
        if (p.y < p.radius) { p.y = p.radius; p.vy *= -WALL_DAMPING; }
        if (p.y > BOARD_SIZE - p.radius) { p.y = BOARD_SIZE - p.radius; p.vy *= -WALL_DAMPING; }

        // Pockets
        // TL, TR, BL, BR
        const pockets = [
            {x:0, y:0}, {x:BOARD_SIZE, y:0}, 
            {x:0, y:BOARD_SIZE}, {x:BOARD_SIZE, y:BOARD_SIZE}
        ];

        for (const pkt of pockets) {
            const dx = p.x - pkt.x;
            const dy = p.y - pkt.y;
            // Simple dist check, actual pockets are inset slightly but corner works for simple physics
            if (Math.sqrt(dx*dx + dy*dy) < POCKET_RADIUS) {
                p.pocketed = true;
                p.vx = 0; p.vy = 0;
                piecePocketedThisFrame = p.type;
            }
        }
    });

    // 2. Collisions (Circle-Circle)
    for (let i = 0; i < newPieces.length; i++) {
        for (let j = i + 1; j < newPieces.length; j++) {
            const p1 = newPieces[i];
            const p2 = newPieces[j];
            if (p1.pocketed || p2.pocketed) continue;

            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            const minDist = p1.radius + p2.radius;

            if (dist < minDist) {
                // Resolve Overlap
                const overlap = (minDist - dist) / 2;
                const nx = dx / dist;
                const ny = dy / dist;
                
                p1.x -= nx * overlap;
                p1.y -= ny * overlap;
                p2.x += nx * overlap;
                p2.y += ny * overlap;

                // Elastic Collision
                const dvx = p2.vx - p1.vx;
                const dvy = p2.vy - p1.vy;
                const velAlongNormal = dvx * nx + dvy * ny;

                if (velAlongNormal > 0) continue;

                const restitution = 0.8; // Bounciness
                const jVal = -(1 + restitution) * velAlongNormal;
                const invMass1 = 1 / p1.mass;
                const invMass2 = 1 / p2.mass;
                const impulse = jVal / (invMass1 + invMass2);

                p1.vx -= impulse * invMass1 * nx;
                p1.vy -= impulse * invMass1 * ny;
                p2.vx += impulse * invMass2 * nx;
                p2.vy += impulse * invMass2 * ny;
                
                moving = true; // Still active
            }
        }
    }

    setPieces(newPieces);

    if (!moving) {
        handleTurnEnd(newPieces);
    }
  };

  const handleTurnEnd = (finalPieces: Piece[]) => {
      // Analyze what happened in the turn
      // Note: We need to know what was pocketed. 
      // This function runs repeatedly when stopped? No, only once transition state.
      // But we call updatePhysics every frame. We need a 'stopped' trigger.
      // Simple fix: Check if we were moving last frame? 
      // Actually updatePhysics logic sets `moving`.
      
      // Let's implement "turn processing"
      // We need to compare `pieces` (start of turn) vs `finalPieces`.
      // But `pieces` updates every frame. 
      // So we must track `pocketedItems` during the move phase.
      
      // Easier: Check changes in pocketed status.
      // BUT, since we update state every frame, we lost "start of turn" snapshot.
      // We should rely on a state transition.
      
      setGameState('ended'); // Temporary state to process logic
      
      // Calculate changes
      let foul = false;
      let ownCoinPocketed = false;
      let opponentCoinPocketed = false;
      let queenHit = false;

      const striker = finalPieces.find(p => p.type === 'striker');
      if (striker && striker.pocketed) {
          foul = true;
          striker.pocketed = false; // Respawn logic handles position
      }

      // Identify current player color
      let myColor: PieceType = 'white';
      if (isFourPlayer) {
          myColor = (turn === 0 || turn === 2) ? 'white' : 'black';
      } else {
          myColor = turn === 0 ? 'white' : 'black';
      }

      // Check newly pocketed coins (implied by just iterating pocketed ones that weren't before? 
      // Logic is tricky without history. 
      // Workaround: We can't know *when* it was pocketed easily without a list.
      // Let's assume we proceed to next turn unless we see a reason not to.
      
      // Actually, standard Carrom rules:
      // If own coin pocketed -> continue turn.
      // If Queen pocketed -> must cover next.
      // If Striker pocketed -> foul (lose turn + return coin).
      
      // For this Arcade version:
      // Simple Turn-based. 
      // If you pocket ANY coin, you go again? Or only own?
      // Let's do: Pocket ANY coin = continue turn (Arcade style).
      // Except Striker = Foul.
      
      // We need to know if *anything* was pocketed this shot. 
      // We can track `pieces` count? No, they are just marked pocketed.
      // We need a ref to track pocket count at start of shot.
      
      // Let's add `turnStartPocketCount` ref.
  };

  // Improved Turn Logic Wrapper
  const [turnStartCounts, setTurnStartCounts] = useState({ white: 0, black: 0, red: 0 });
  
  const startShot = () => {
      // Record current pocket counts
      const w = pieces.filter(p => p.type === 'white' && p.pocketed).length;
      const b = pieces.filter(p => p.type === 'black' && p.pocketed).length;
      const r = pieces.filter(p => p.type === 'red' && p.pocketed).length;
      setTurnStartCounts({ white: w, black: b, red: r });
      setGameState('moving');
  };

  useEffect(() => {
      if (gameState === 'ended') {
          processTurnResult();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState]);

  const processTurnResult = () => {
      const w = pieces.filter(p => p.type === 'white' && p.pocketed).length;
      const b = pieces.filter(p => p.type === 'black' && p.pocketed).length;
      const r = pieces.filter(p => p.type === 'red' && p.pocketed).length;
      
      const striker = pieces.find(p => p.type === 'striker');
      const foul = striker?.pocketed;
      
      let continueTurn = false;

      // Determine active color
      let myColor = (turn === 0 || turn === 2) ? 'white' : 'black';
      if (!isFourPlayer) myColor = turn === 0 ? 'white' : 'black';

      // Check differences
      const wDiff = w - turnStartCounts.white;
      const bDiff = b - turnStartCounts.black;
      const rDiff = r - turnStartCounts.red;

      if (foul) {
          // Penalty: Return one own coin if available (Arcade simplified: just lose turn)
          continueTurn = false;
      } else {
          // If pocketed own color
          if (myColor === 'white' && wDiff > 0) continueTurn = true;
          if (myColor === 'black' && bDiff > 0) continueTurn = true;
          if (rDiff > 0) {
              setQueenPocketed(true);
              setCoverPending(true);
              continueTurn = true;
          }
          
          // Cover Logic
          if (coverPending) {
              if ((myColor === 'white' && wDiff > 0) || (myColor === 'black' && bDiff > 0)) {
                  // Covered!
                  setCoverPending(false); // Queen secured
              } else if (!continueTurn) {
                  // Failed to cover
                  // Respawn Queen (Arcade: simple respawn center)
                  const queen = pieces.find(p => p.type === 'red');
                  if (queen) {
                      queen.pocketed = false;
                      queen.x = BOARD_SIZE/2;
                      queen.y = BOARD_SIZE/2;
                      queen.vx = 0; queen.vy = 0;
                  }
                  setQueenPocketed(false);
                  setCoverPending(false);
              }
          }
      }

      // Update Scores
      setScores({ white: w, black: b });

      // Check Win
      // Win if all own coins pocketed AND Queen pocketed (by anyone? Standard is complicated. 
      // Arcade: First to pocket all own wins. Queen gives points or must be cleared first).
      // Let's go simple: Win if all 9 of your color are gone.
      if (w === 9) {
          setWinner(isFourPlayer ? 'Team White' : 'White');
          if (onFinish) onFinish(isFourPlayer ? 'Team White' : 'White');
          return;
      }
      if (b === 9) {
          setWinner(isFourPlayer ? 'Team Black' : 'Black');
          if (onFinish) onFinish(isFourPlayer ? 'Team Black' : 'Black');
          return;
      }

      if (continueTurn) {
          resetStriker(pieces);
      } else {
          // Next Turn
          let next = turn + 1;
          if (isFourPlayer) next = next % 4;
          else next = next % 2;
          setTurn(next);
          // Striker reset happens in effect via dependency or manual call?
          // We need to re-render with new turn logic.
          // Wait, resetStriker depends on `turn`. We must update turn first, then reset.
          // State updates are async.
      }
  };

  // Separate effect to handle turn change and striker reset
  useEffect(() => {
     if (gameState === 'ended' && !winner) {
         resetStriker(pieces);
     }
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turn, gameState]);


  // Input Handlers
  const handleStartInput = (clientX: number, clientY: number) => {
      if (isAiTurn || gameState !== 'aiming') return;
      
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      // Logic: 
      // 1. If clicking near Striker -> Drag to Aim
      // 2. If clicking on Baseline -> Move Striker (Set Position)
      
      const x = (clientX - rect.left) * (BOARD_SIZE / rect.width);
      const y = (clientY - rect.top) * (BOARD_SIZE / rect.height);
      
      const striker = pieces.find(p => p.type === 'striker');
      if (!striker) return;

      const dist = Math.sqrt((x - striker.x)**2 + (y - striker.y)**2);
      
      if (dist < STRIKER_RADIUS * 2) {
          isDragging.current = true;
          dragStart.current = { x, y };
      } else {
          // Move striker along baseline logic?
          // Simplification: Use a slider or separate touch area for positioning?
          // Let's assume clicking elsewhere sets position if aiming hasn't started
      }
  };

  const handleMoveInput = (clientX: number, clientY: number) => {
      if (!isDragging.current || gameState !== 'aiming') return;
      
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = (clientX - rect.left) * (BOARD_SIZE / rect.width);
      const y = (clientY - rect.top) * (BOARD_SIZE / rect.height);
      
      // Calculate aim vector (inverse drag)
      aimVector.current = {
          x: dragStart.current.x - x,
          y: dragStart.current.y - y
      };
      // Force Aim Vector update for visual render? React state vs Ref?
      // We usually need state for render. 
      // But physics loop draws every frame. We can read Ref in Draw.
  };

  const handleEndInput = () => {
      if (isDragging.current && gameState === 'aiming') {
          isDragging.current = false;
          // Shoot
          const striker = pieces.find(p => p.type === 'striker');
          if (striker) {
              const mag = Math.sqrt(aimVector.current.x**2 + aimVector.current.y**2);
              const maxPower = 30; // Max velocity
              const scale = Math.min(mag, 150) / 150; // Cap drag distance
              
              if (mag > 10) {
                  const power = scale * maxPower;
                  striker.vx = (aimVector.current.x / mag) * power;
                  striker.vy = (aimVector.current.y / mag) * power;
                  startShot();
              }
          }
          aimVector.current = { x: 0, y: 0 };
      }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (gameState !== 'aiming') return;
      const val = parseFloat(e.target.value);
      setStrikerPos(val);
      
      // Update striker physics position immediately
      const striker = pieces.find(p => p.type === 'striker');
      if (striker) {
          // Calculate coords based on baseline
          // Baseline logic repeated from resetStriker
          // We need baseline start/end coords
          let sx = 0, sy = 0, ex = 0, ey = 0;
          const offset = 100;
          
          if (!isFourPlayer) {
             if (turn === 0) { sx = offset; sy = BOARD_SIZE-offset; ex = BOARD_SIZE-offset; ey = BOARD_SIZE-offset; }
             else { sx = offset; sy = offset; ex = BOARD_SIZE-offset; ey = offset; }
          } else {
             if (turn === 0) { sx = offset; sy = BOARD_SIZE-offset; ex = BOARD_SIZE-offset; ey = BOARD_SIZE-offset; }
             if (turn === 1) { sx = offset; sy = BOARD_SIZE-offset; ex = offset; ey = offset; } // Left (Bottom to Top)
             if (turn === 2) { sx = BOARD_SIZE-offset; sy = offset; ex = offset; ey = offset; } // Top (Right to Left)
             if (turn === 3) { sx = BOARD_SIZE-offset; sy = offset; ex = BOARD_SIZE-offset; ey = BOARD_SIZE-offset; } // Right (Top to Bottom)
          }
          
          striker.x = sx + (ex - sx) * val;
          striker.y = sy + (ey - sy) * val;
      }
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Scale to fit
    const scale = canvas.width / BOARD_SIZE;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);

    // Board
    ctx.fillStyle = COLOR_BOARD;
    ctx.fillRect(0, 0, BOARD_SIZE, BOARD_SIZE);
    
    // Border
    ctx.strokeStyle = COLOR_BORDER;
    ctx.lineWidth = 10;
    ctx.strokeRect(0, 0, BOARD_SIZE, BOARD_SIZE);

    // Pockets
    ctx.fillStyle = COLOR_POCKET;
    [0, BOARD_SIZE].forEach(x => [0, BOARD_SIZE].forEach(y => {
        ctx.beginPath();
        // Inset pockets slightly so they are "corners"
        const cx = x === 0 ? 10 : BOARD_SIZE - 10;
        const cy = y === 0 ? 10 : BOARD_SIZE - 10;
        ctx.arc(cx, cy, POCKET_RADIUS, 0, Math.PI*2);
        ctx.fill();
    }));

    // Baselines (Visuals)
    ctx.strokeStyle = '#8d6e63';
    ctx.lineWidth = 2;
    const offset = 100;
    // Bottom
    ctx.beginPath(); ctx.moveTo(offset, BOARD_SIZE-offset); ctx.lineTo(BOARD_SIZE-offset, BOARD_SIZE-offset); ctx.stroke();
    // Top
    ctx.beginPath(); ctx.moveTo(offset, offset); ctx.lineTo(BOARD_SIZE-offset, offset); ctx.stroke();
    // Left
    ctx.beginPath(); ctx.moveTo(offset, offset); ctx.lineTo(offset, BOARD_SIZE-offset); ctx.stroke();
    // Right
    ctx.beginPath(); ctx.moveTo(BOARD_SIZE-offset, offset); ctx.lineTo(BOARD_SIZE-offset, BOARD_SIZE-offset); ctx.stroke();
    // Decor Circles at baseline ends
    ctx.fillStyle = '#ef4444';
    [offset, BOARD_SIZE-offset].forEach(x => [offset, BOARD_SIZE-offset].forEach(y => {
        ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI*2); ctx.fill();
    }));

    // Center Design
    ctx.beginPath(); ctx.arc(BOARD_SIZE/2, BOARD_SIZE/2, COIN_RADIUS*4.2, 0, Math.PI*2); ctx.stroke();

    // Pieces
    pieces.forEach(p => {
        if (p.pocketed) return;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI*2);
        
        if (p.type === 'white') ctx.fillStyle = COLOR_WHITE;
        else if (p.type === 'black') ctx.fillStyle = COLOR_BLACK;
        else if (p.type === 'red') ctx.fillStyle = COLOR_RED;
        else ctx.fillStyle = COLOR_STRIKER;
        
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Inner detail for coins
        if (p.type !== 'striker') {
            ctx.beginPath(); ctx.arc(p.x, p.y, p.radius * 0.7, 0, Math.PI*2); ctx.stroke();
        }
    });

    // Aim Line
    if (gameState === 'aiming' && isDragging.current) {
        const striker = pieces.find(p => p.type === 'striker');
        if (striker) {
            ctx.beginPath();
            ctx.moveTo(striker.x, striker.y);
            // Invert logic for visual aim vs drag? standard is drag back to shoot fwd
            // So visual line goes opposite to drag
            ctx.lineTo(striker.x + aimVector.current.x, striker.y + aimVector.current.y);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 3;
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }
  };

  // Helper to get player name
  const getPlayerName = () => {
      if (isFourPlayer) {
          const names = ['P1 (White)', 'P2 (Black)', 'P3 (White)', 'P4 (Black)'];
          return names[turn];
      }
      return turn === 0 ? 'White' : 'Black';
  };

  return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-[#3e2723] overflow-hidden relative touch-none">
      
      {/* Top HUD */}
      <div className="absolute top-4 w-full px-4 flex justify-between text-white font-bold z-10 pointer-events-none">
          <div className="flex flex-col">
              <span className="text-gray-300 text-xs">WHITE</span>
              <span className="text-2xl">{scores.white}/9</span>
          </div>
          <div className="flex flex-col items-end">
              <span className="text-gray-300 text-xs">BLACK</span>
              <span className="text-2xl">{scores.black}/9</span>
          </div>
      </div>

      <div className={`absolute top-16 px-4 py-1 rounded bg-black/50 text-white font-mono z-10 ${isAiTurn ? 'animate-pulse' : ''}`}>
          {winner ? 'GAME OVER' : `${getPlayerName()}'s Turn`}
          {coverPending && <span className="text-red-400 ml-2">(Cover Queen!)</span>}
      </div>

      <canvas 
        ref={canvasRef}
        width={window.innerWidth} 
        height={window.innerWidth} // Square aspect ratio usually, handled by style
        className="max-w-[100vw] max-h-[80vh] aspect-square shadow-2xl rounded-lg cursor-crosshair touch-none"
        onMouseDown={e => handleStartInput(e.clientX, e.clientY)}
        onMouseMove={e => handleMoveInput(e.clientX, e.clientY)}
        onMouseUp={handleEndInput}
        onTouchStart={e => handleStartInput(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchMove={e => handleMoveInput(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchEnd={handleEndInput}
      />

      {/* Controls */}
      <div className="absolute bottom-6 w-full px-8 flex flex-col gap-4 max-w-md">
          {!winner && !isAiTurn && gameState === 'aiming' && (
              <div className="flex items-center gap-4 bg-black/40 p-2 rounded-xl backdrop-blur-sm">
                  <span className="text-white text-xs font-bold">POS</span>
                  <input 
                    type="range" 
                    min="0" max="1" step="0.01" 
                    value={strikerPos} 
                    onChange={handleSliderChange}
                    className="w-full accent-yellow-400 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
              </div>
          )}
          
          <Button variant="secondary" onClick={onBack} className="w-full py-2 text-sm opacity-80 hover:opacity-100">
             EXIT MATCH
          </Button>
      </div>

      {winner && (
        <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-50 animate-fade-in">
          <h2 className="text-5xl font-black text-yellow-400 mb-4 arcade-font text-center">
             {winner} WINS!
          </h2>
          <div className="flex gap-4 mt-8">
             <Button onClick={() => {
                 setScores({white:0, black:0});
                 setWinner(null);
                 setTurn(0);
                 initBoard();
             }}>Rematch</Button>
             <Button variant="secondary" onClick={onBack}>Menu</Button>
          </div>
        </div>
      )}
    </div>
  );
};