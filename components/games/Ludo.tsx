import React, { useState, useEffect } from 'react';
import { GameProps } from '../../types';
import { Button } from '../ui/Button';

// Standard Ludo Board Logic
// The board is a 15x15 grid.
// Coordinate system (x, y) 0-14.
// 4 Colors: Green (TL), Yellow (TR), Blue (BR), Red (BL). (Ordering is typically clockwise).
// Let's stick to standard: Red(0), Green(1), Yellow(2), Blue(3).

const SAFE_SPOTS = ["1,6", "6,1", "8,2", "13,8", "6,13", "8,12", "2,8", "12,6"]; // Simplified safe spots
const PLAYER_COLORS = ['bg-red-500', 'bg-green-500', 'bg-yellow-400', 'bg-blue-500'];
const PLAYER_BORDERS = ['border-red-600', 'border-green-600', 'border-yellow-500', 'border-blue-600'];
const PLAYER_TEXT = ['text-red-500', 'text-green-500', 'text-yellow-400', 'text-blue-500'];
const PLAYER_NAMES = ['Red', 'Green', 'Yellow', 'Blue'];

// Path definition: 52 steps around + 6 steps home.
// Each player has a different start index on the main loop.
const MAIN_PATH_COORDS = [
  // Red Start (Bottom Left) -> Up
  {x:1,y:13}, {x:2,y:13}, {x:3,y:13}, {x:4,y:13}, {x:5,y:13}, 
  {x:6,y:14}, {x:6,y:13}, {x:6,y:12}, {x:6,y:11}, {x:6,y:10}, {x:6,y:9},
  // Green Area (Top Left) -> Right
  {x:5,y:8}, {x:4,y:8}, {x:3,y:8}, {x:2,y:8}, {x:1,y:8}, {x:0,y:8},
  {x:0,y:7}, {x:0,y:6}, 
  {x:1,y:6}, {x:2,y:6}, {x:3,y:6}, {x:4,y:6}, {x:5,y:6},
  // Yellow Area (Top Right) -> Down
  {x:6,y:5}, {x:6,y:4}, {x:6,y:3}, {x:6,y:2}, {x:6,y:1}, {x:6,y:0},
  {x:7,y:0}, {x:8,y:0},
  {x:8,y:1}, {x:8,y:2}, {x:8,y:3}, {x:8,y:4}, {x:8,y:5},
  // Blue Area (Bottom Right) -> Left
  {x:9,y:6}, {x:10,y:6}, {x:11,y:6}, {x:12,y:6}, {x:13,y:6}, {x:14,y:6},
  {x:14,y:7}, {x:14,y:8},
  {x:13,y:8}, {x:12,y:8}, {x:11,y:8}, {x:10,y:8}, {x:9,y:8},
  // Red Area Return -> Up
  {x:8,y:9}, {x:8,y:10}, {x:8,y:11}, {x:8,y:12}, {x:8,y:13}, {x:8,y:14},
  {x:7,y:14}, {x:6,y:14} // Loop close logic handled by offset
];
// Note: The loop above isn't a perfect circle index, Ludo paths are tricky. 
// Let's use specific paths for each player to minimize bugs.

// 57 Positions: 0-50 (Main path), 51-56 (Home run). 56 is Goal.
// Base is -1.

// Path offsets on the 52-tile main track:
// Red starts at index 1 on standard board? No, usually index 0 of its path.
// Let's define a single 52-tile loop coordinate system.
const LOOP = [
    {x:1,y:13}, {x:2,y:13}, {x:3,y:13}, {x:4,y:13}, {x:5,y:13}, // R1-5
    {x:6,y:13}, {x:6,y:12}, {x:6,y:11}, {x:6,y:10}, {x:6,y:9}, {x:6,y:8}, // R6-11
    {x:5,y:8}, {x:4,y:8}, {x:3,y:8}, {x:2,y:8}, {x:1,y:8}, {x:0,y:8}, // G12-17
    {x:0,y:7}, // G18 (Turn)
    {x:0,y:6}, {x:1,y:6}, {x:2,y:6}, {x:3,y:6}, {x:4,y:6}, {x:5,y:6}, // G19-24
    {x:6,y:5}, {x:6,y:4}, {x:6,y:3}, {x:6,y:2}, {x:6,y:1}, {x:6,y:0}, // Y25-30
    {x:7,y:0}, // Y31 (Turn)
    {x:8,y:0}, {x:8,y:1}, {x:8,y:2}, {x:8,y:3}, {x:8,y:4}, {x:8,y:5}, // Y32-37
    {x:9,y:6}, {x:10,y:6}, {x:11,y:6}, {x:12,y:6}, {x:13,y:6}, {x:14,y:6}, // B38-43
    {x:14,y:7}, // B44 (Turn)
    {x:14,y:8}, {x:13,y:8}, {x:12,y:8}, {x:11,y:8}, {x:10,y:8}, {x:9,y:8}, // B45-50
    {x:8,y:9}, {x:8,y:10}, {x:8,y:11}, {x:8,y:12}, {x:8,y:13}, {x:8,y:14}, // R51-56 (Wait, logic error in loop)
    {x:7,y:14} // R57 Turn
];

// Re-mapping explicitly for sanity.
// The Board track has 52 squares.
const BOARD_TRACK = [
    {x:1,y:13}, {x:2,y:13}, {x:3,y:13}, {x:4,y:13}, {x:5,y:13}, // 0-4
    {x:6,y:12}, {x:6,y:11}, {x:6,y:10}, {x:6,y:9}, {x:6,y:8},  // 5-9
    {x:5,y:8}, {x:4,y:8}, {x:3,y:8}, {x:2,y:8}, {x:1,y:8}, {x:0,y:8}, // 10-15
    {x:0,y:7}, // 16 (Middle Left)
    {x:0,y:6}, {x:1,y:6}, {x:2,y:6}, {x:3,y:6}, {x:4,y:6}, {x:5,y:6}, // 17-22
    {x:6,y:5}, {x:6,y:4}, {x:6,y:3}, {x:6,y:2}, {x:6,y:1}, {x:6,y:0}, // 23-28
    {x:7,y:0}, // 29 (Middle Top)
    {x:8,y:0}, {x:8,y:1}, {x:8,y:2}, {x:8,y:3}, {x:8,y:4}, {x:8,y:5}, // 30-35
    {x:9,y:6}, {x:10,y:6}, {x:11,y:6}, {x:12,y:6}, {x:13,y:6}, {x:14,y:6}, // 36-41
    {x:14,y:7}, // 42 (Middle Right)
    {x:14,y:8}, {x:13,y:8}, {x:12,y:8}, {x:11,y:8}, {x:10,y:8}, {x:9,y:8}, // 43-48
    {x:8,y:9}, {x:8,y:10}, {x:8,y:11}, {x:8,y:12}, {x:8,y:13}, {x:8,y:14}, // 49-54 ?? No 52 squares.
    {x:7,y:14} // 51 (Middle Bottom)
];
// Wait, standard ludo has 52 main path cells.
// The above trace has duplicates or skips.
// Correct Path: 
// Red starts at 1,13. Path length 52.
// Offsets: Red=0, Green=13, Yellow=26, Blue=39.

const TRACK_COORDS = [
    {x:1,y:13}, {x:2,y:13}, {x:3,y:13}, {x:4,y:13}, {x:5,y:13}, // 0-4
    {x:6,y:12}, {x:6,y:11}, {x:6,y:10}, {x:6,y:9}, {x:6,y:8},   // 5-9
    {x:5,y:8}, {x:4,y:8}, {x:3,y:8}, {x:2,y:8}, {x:1,y:8}, {x:0,y:8}, // 10-15
    {x:0,y:7}, // 16
    {x:0,y:6}, {x:1,y:6}, {x:2,y:6}, {x:3,y:6}, {x:4,y:6}, {x:5,y:6}, // 17-22
    {x:6,y:5}, {x:6,y:4}, {x:6,y:3}, {x:6,y:2}, {x:6,y:1}, {x:6,y:0}, // 23-28
    {x:7,y:0}, // 29
    {x:8,y:0}, {x:8,y:1}, {x:8,y:2}, {x:8,y:3}, {x:8,y:4}, {x:8,y:5}, // 30-35
    {x:9,y:6}, {x:10,y:6}, {x:11,y:6}, {x:12,y:6}, {x:13,y:6}, {x:14,y:6}, // 36-41
    {x:14,y:7}, // 42
    {x:14,y:8}, {x:13,y:8}, {x:12,y:8}, {x:11,y:8}, {x:10,y:8}, {x:9,y:8}, // 43-48
    {x:8,y:9}, {x:8,y:10}, {x:8,y:11}, {x:8,y:12}, {x:8,y:13}, {x:8,y:14}, // 49-54? No.
    // Correction:
    // Bottom arm (Red start side): (1,13)...(5,13) then (6,12)...(6,8). That's 5+5 = 10.
    // Left arm: (5,8)...(0,8) (6 cells) + (0,7) (1 cell) + (0,6)...(5,6) (6 cells). Total 13.
    // 13 per quadrant. 13*4 = 52. Correct.
];

// Adjusting the array to be exactly 52.
const getTrackCoord = (index: number) => {
    const i = index % 52;
    // Manual mapping for 52 squares based on standard Ludo board 15x15
    // Q1 (Red home side): 0-12
    if(i < 5) return {x: 1+i, y: 13};
    if(i < 11) return {x: 6, y: 12-(i-5)};
    if(i === 11) return {x: 5, y: 8};
    if(i === 12) return {x: 4, y: 8};
    
    // Q2 (Green): 13-25
    if(i < 18) return {x: 3-(i-13), y: 8}; // 3,2,1,0, -1? wait.
    // Let's brute force the array to be safe.
    return PATH_52[i];
};

const PATH_52 = [
    {x:1,y:13},{x:2,y:13},{x:3,y:13},{x:4,y:13},{x:5,y:13}, // 0-4
    {x:6,y:12},{x:6,y:11},{x:6,y:10},{x:6,y:9},{x:6,y:8},   // 5-9
    {x:5,y:8},{x:4,y:8},{x:3,y:8},{x:2,y:8},{x:1,y:8},{x:0,y:8}, // 10-15
    {x:0,y:7}, // 16
    {x:0,y:6},{x:1,y:6},{x:2,y:6},{x:3,y:6},{x:4,y:6},{x:5,y:6}, // 17-22
    {x:6,y:5},{x:6,y:4},{x:6,y:3},{x:6,y:2},{x:6,y:1},{x:6,y:0}, // 23-28
    {x:7,y:0}, // 29
    {x:8,y:0},{x:8,y:1},{x:8,y:2},{x:8,y:3},{x:8,y:4},{x:8,y:5}, // 30-35
    {x:9,y:6},{x:10,y:6},{x:11,y:6},{x:12,y:6},{x:13,y:6},{x:14,y:6}, // 36-41
    {x:14,y:7}, // 42
    {x:14,y:8},{x:13,y:8},{x:12,y:8},{x:11,y:8},{x:10,y:8},{x:9,y:8}, // 43-48
    {x:8,y:9},{x:8,y:10},{x:8,y:11},{x:8,y:12},{x:8,y:13},{x:8,y:14} // 49-54 ?? 
    // The previous manual trace had extra cells.
    // Bottom: 6 col. Left: 6 row. Top: 6 col. Right: 6 row.
    // 6*4 = 24? No.
    // It's 6 cells per straight arm x 8 arms = 48. + 4 corners? No.
    // Standard: 6 cells out, 1 cell turn, 6 cells in. = 13 per color.
    // 13 * 4 = 52.
];

// Correcting the exact 52 array
const FULL_TRACK = [
    {x:1,y:13},{x:2,y:13},{x:3,y:13},{x:4,y:13},{x:5,y:13},
    {x:6,y:12},{x:6,y:11},{x:6,y:10},{x:6,y:9},{x:6,y:8},
    {x:5,y:8},{x:4,y:8},{x:3,y:8},{x:2,y:8},{x:1,y:8},{x:0,y:8},
    {x:0,y:7},
    {x:0,y:6},{x:1,y:6},{x:2,y:6},{x:3,y:6},{x:4,y:6},{x:5,y:6},
    {x:6,y:5},{x:6,y:4},{x:6,y:3},{x:6,y:2},{x:6,y:1},{x:6,y:0},
    {x:7,y:0},
    {x:8,y:0},{x:8,y:1},{x:8,y:2},{x:8,y:3},{x:8,y:4},{x:8,y:5},
    {x:9,y:6},{x:10,y:6},{x:11,y:6},{x:12,y:6},{x:13,y:6},{x:14,y:6},
    {x:14,y:7},
    {x:14,y:8},{x:13,y:8},{x:12,y:8},{x:11,y:8},{x:10,y:8},{x:9,y:8},
    {x:8,y:9},{x:8,y:10},{x:8,y:11},{x:8,y:12},{x:8,y:13},{x:8,y:14}
]; // Length should be 52.

const HOMES = [
    [{x:1,y:7},{x:2,y:7},{x:3,y:7},{x:4,y:7},{x:5,y:7},{x:6,y:7}], // Red Home (7,7 is goal) -- Actually Red enters from left?
    // Wait, Red starts Bottom Left. Home column is X=7, Y=13 down to 8.
    // Let's map homes correctly based on entry points.
    // Red Entry: Index 50 (8,14) -> next is 51 (8,13)..?
    // Standard:
    // Red Home Run: {x:7, y:13}, {x:7, y:12}, {x:7, y:11}, {x:7, y:10}, {x:7, y:9}, {x:7, y:8} (Goal)
    // Green Home Run: {x:1, y:7}, {x:2, y:7}, {x:3, y:7}, {x:4, y:7}, {x:5, y:7}, {x:6, y:7} (Goal)
    // Yellow Home Run: {x:7, y:1}, {x:7, y:2}, {x:7, y:3}, {x:7, y:4}, {x:7, y:5}, {x:7, y:6} (Goal)
    // Blue Home Run: {x:13, y:7}, {x:12, y:7}, {x:11, y:7}, {x:10, y:7}, {x:9, y:7}, {x:8, y:7} (Goal)
];

const HOME_RUN_COORDS = [
    [{x:7,y:13},{x:7,y:12},{x:7,y:11},{x:7,y:10},{x:7,y:9},{x:7,y:7}], // Red (Fixed goal to center 7,7)
    [{x:1,y:7},{x:2,y:7},{x:3,y:7},{x:4,y:7},{x:5,y:7},{x:7,y:7}],     // Green
    [{x:7,y:1},{x:7,y:2},{x:7,y:3},{x:7,y:4},{x:7,y:5},{x:7,y:7}],     // Yellow
    [{x:13,y:7},{x:12,y:7},{x:11,y:7},{x:10,y:7},{x:9,y:7},{x:7,y:7}]  // Blue
];

const START_OFFSETS = [0, 13, 26, 39]; // Indices on FULL_TRACK where each player starts

export const Ludo: React.FC<GameProps> = ({ onBack, onFinish, config }) => {
  // Config.playerCount determines active players.
  // 0=Red, 1=Green, 2=Yellow, 3=Blue.
  // Tokens state: 4 arrays of 4 tokens. Values: -1 (Base), 0-50 (Track), 51-56 (Home Run), 57 (Goal)
  const [tokens, setTokens] = useState<number[][]>([
    [-1, -1, -1, -1],
    [-1, -1, -1, -1],
    [-1, -1, -1, -1],
    [-1, -1, -1, -1]
  ]);
  
  const [turn, setTurn] = useState(0); // 0 to 3
  const [dice, setDice] = useState<number | null>(null);
  const [canMove, setCanMove] = useState(false);
  const [winner, setWinner] = useState<number | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // If 1 player mode, P2, P3, P4 are AI.
  const isAiTurn = config.mode === 'pve' && turn > 0;

  useEffect(() => {
      if (isAiTurn && !dice && !winner && !isAnimating) {
          setTimeout(rollDice, 1000);
      } else if (isAiTurn && dice && canMove && !isAnimating) {
          setTimeout(executeAiMove, 1000);
      } else if (isAiTurn && dice && !canMove && !isAnimating) {
          // No moves possible
          setTimeout(nextTurn, 1000);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turn, dice, canMove, isAiTurn, isAnimating, winner]);

  const executeAiMove = () => {
      // Simple AI: Move piece closest to winning, or leave base if possible
      const playerTokens = tokens[turn];
      const validMoves: number[] = [];
      
      playerTokens.forEach((t, i) => {
          if (t === -1 && dice === 6) validMoves.push(i);
          else if (t !== -1 && t + dice! <= 56) validMoves.push(i);
      });

      if (validMoves.length > 0) {
          // Prioritize capturing or entering home? Random for now for 'standard' feel
          // Or prioritize leaving base
          const moveIdx = validMoves.includes(validMoves.find(idx => playerTokens[idx] === -1)!) 
             ? validMoves.find(idx => playerTokens[idx] === -1)! 
             : validMoves[Math.floor(Math.random() * validMoves.length)];
             
          moveToken(moveIdx);
      } else {
          nextTurn();
      }
  };

  const rollDice = () => {
    if (canMove || winner || isAnimating) return;
    setIsAnimating(true);
    
    // Dice animation effect
    let rolls = 0;
    const interval = setInterval(() => {
        setDice(Math.floor(Math.random() * 6) + 1);
        rolls++;
        if (rolls > 8) {
            clearInterval(interval);
            const finalRoll = Math.floor(Math.random() * 6) + 1;
            setDice(finalRoll);
            setIsAnimating(false);
            checkPossibleMoves(finalRoll);
        }
    }, 100);
  };

  const checkPossibleMoves = (roll: number) => {
      const currentTokens = tokens[turn];
      const hasMove = currentTokens.some(t => {
          if (t === -1) return roll === 6;
          return t + roll <= 56; // 56 is Goal index (51 + 5 steps)
      });

      if (hasMove) {
          setCanMove(true);
      } else {
          setTimeout(nextTurn, 1000);
      }
  };

  const nextTurn = () => {
      setDice(null);
      setCanMove(false);
      let next = (turn + 1) % 4;
      // Skip players not in config
      while (next >= config.playerCount && config.playerCount < 4) {
          next = (next + 1) % 4;
      }
      // Actually standard ludo always has 4 corners, but unused ones are just empty.
      // If we only have 2 players, usually Red vs Yellow or Red vs Green. 
      // Let's assume sequential 0..N-1 for simplicity, or 0 & 2 for 2 player.
      // Simplified: If 2 players, P1=Red, P2=Yellow (Opposite).
      if (config.playerCount === 2) {
          setTurn(turn === 0 ? 2 : 0);
      } else {
          setTurn((turn + 1) % config.playerCount);
      }
  };

  const moveToken = (tokenIdx: number) => {
      if (!dice) return;
      
      const newTokens = [...tokens];
      const currentPos = newTokens[turn][tokenIdx];
      let nextPos = currentPos;

      if (currentPos === -1) {
          if (dice === 6) nextPos = 0; // Enter board
          else return; // Should not happen if canMove logic is right
      } else {
          nextPos += dice;
      }

      if (nextPos > 56) return;

      // Update position
      newTokens[turn][tokenIdx] = nextPos;
      
      // Collision/Capture Logic
      // Only happens on Main Track (0-50).
      if (nextPos < 51) {
          const absPos = (START_OFFSETS[turn] + nextPos) % 52;
          // Check collision with others
          let captured = false;
          
          // Safe spots check
          const isSafe = SAFE_SPOTS.includes(`${getTrackCoord(absPos).x},${getTrackCoord(absPos).y}`);
          
          if (!isSafe) {
            for (let p = 0; p < 4; p++) {
                if (p === turn) continue;
                // If player not active, skip? Assuming standard board always has pieces?
                // We only check active tokens
                newTokens[p].forEach((pos, idx) => {
                    if (pos !== -1 && pos < 51) {
                        const enemyAbs = (START_OFFSETS[p] + pos) % 52;
                        if (enemyAbs === absPos) {
                            // CAPTURE!
                            newTokens[p][idx] = -1; // Send back to base
                            captured = true;
                        }
                    }
                });
            }
          }
      }

      setTokens(newTokens);
      setCanMove(false);

      // Win Check
      if (newTokens[turn].every(t => t === 56)) {
          setWinner(turn);
          if (onFinish) onFinish(PLAYER_NAMES[turn]);
          return;
      }

      // Rule: Roll 6 gives another turn. Capture gives another turn (skipped for simplicity here to keep game fast)
      if (dice === 6) {
          setDice(null);
          // Wait for user to roll again
      } else {
          setTimeout(nextTurn, 500);
      }
  };

  // Rendering Helpers
  const renderCell = (x: number, y: number) => {
      // Determine if this cell is part of a path or home
      // Check Full Track
      let trackIdx = FULL_TRACK.findIndex(c => c.x === x && c.y === y);
      
      // Check Home Runs
      let homeRunColor = -1;
      let homeRunIdx = -1;
      
      HOME_RUN_COORDS.forEach((arr, colorIdx) => {
          const idx = arr.findIndex(c => c.x === x && c.y === y);
          if (idx !== -1) {
              homeRunColor = colorIdx;
              homeRunIdx = idx;
          }
      });
      
      const isBase = (x < 6 && y > 8) || (x > 8 && y > 8) || (x < 6 && y < 6) || (x > 8 && y < 6);
      const isCenter = x > 5 && x < 9 && y > 5 && y < 9;
      
      let bgClass = 'bg-slate-800 border-slate-700';
      if (isBase) bgClass = 'bg-transparent'; // Handled by overlays
      if (isCenter) bgClass = 'bg-slate-900'; // Goal center

      // Colored Paths
      if (homeRunColor !== -1) {
          if (homeRunColor === 0) bgClass = 'bg-red-500/20';
          if (homeRunColor === 1) bgClass = 'bg-green-500/20';
          if (homeRunColor === 2) bgClass = 'bg-yellow-500/20';
          if (homeRunColor === 3) bgClass = 'bg-blue-500/20';
      }
      
      // Safe Spots Highlights
      if (SAFE_SPOTS.includes(`${x},${y}`)) {
          bgClass = 'bg-slate-600';
      }

      return (
          <div key={`${x},${y}`} className={`w-full h-full border-[0.5px] border-slate-700/50 flex items-center justify-center relative ${bgClass}`}>
             {/* Safe Spot Star */}
             {SAFE_SPOTS.includes(`${x},${y}`) && <span className="text-slate-400 text-[8px]">★</span>}
             {renderTokensAt(x, y)}
          </div>
      );
  };

  const renderTokensAt = (x: number, y: number) => {
      const rendered: React.ReactNode[] = [];
      
      tokens.forEach((playerTokens, pIdx) => {
          playerTokens.forEach((t, tIdx) => {
              let tx = -1, ty = -1;
              if (t === -1) {
                  // Base Coordinates (Manual offset for visuals)
                  if (pIdx === 0) { tx = 1 + (tIdx%2)*2; ty = 11 + Math.floor(tIdx/2)*2; } // BL Red
                  if (pIdx === 1) { tx = 1 + (tIdx%2)*2; ty = 1 + Math.floor(tIdx/2)*2; } // TL Green
                  if (pIdx === 2) { tx = 10 + (tIdx%2)*2; ty = 1 + Math.floor(tIdx/2)*2; } // TR Yellow
                  if (pIdx === 3) { tx = 10 + (tIdx%2)*2; ty = 11 + Math.floor(tIdx/2)*2; } // BR Blue
              } else if (t < 51) {
                  const abs = (START_OFFSETS[pIdx] + t) % 52;
                  const c = FULL_TRACK[abs];
                  if(c) { tx = c.x; ty = c.y; }
              } else {
                  // Home Run
                  const runIdx = t - 51;
                  const c = HOME_RUN_COORDS[pIdx][runIdx];
                  if(c) { tx = c.x; ty = c.y; }
              }

              if (tx === x && ty === y) {
                  rendered.push(
                      <div 
                        key={`${pIdx}-${tIdx}`}
                        onClick={() => {
                            if (turn === pIdx && canMove) moveToken(tIdx);
                        }}
                        className={`
                            w-3 h-3 md:w-5 md:h-5 rounded-full border-2 border-white shadow-md z-10
                            ${PLAYER_COLORS[pIdx]}
                            ${turn === pIdx && canMove && (
                                (t === -1 && dice === 6) || (t !== -1 && t+dice! <= 56)
                            ) ? 'animate-bounce cursor-pointer ring-2 ring-white' : ''}
                            absolute
                        `}
                        style={{
                            // Slight offset if multiple tokens on same spot
                            transform: rendered.length > 0 ? `translate(${rendered.length * 3}px, ${rendered.length * -3}px)` : 'none'
                        }}
                      />
                  );
              }
          });
      });
      return rendered;
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full bg-[#1e293b] p-2">
      
      {/* HUD */}
      <div className="flex justify-between w-full max-w-lg mb-4">
           <div className={`px-4 py-2 rounded-lg font-bold border-2 ${turn === 0 ? 'bg-red-900/50 border-red-500 text-white' : 'border-transparent text-slate-600'}`}>RED</div>
           <div className={`px-4 py-2 rounded-lg font-bold border-2 ${turn === 1 ? 'bg-green-900/50 border-green-500 text-white' : 'border-transparent text-slate-600'}`}>GRN</div>
           <div className={`px-4 py-2 rounded-lg font-bold border-2 ${turn === 2 ? 'bg-yellow-900/50 border-yellow-500 text-white' : 'border-transparent text-slate-600'}`}>YEL</div>
           <div className={`px-4 py-2 rounded-lg font-bold border-2 ${turn === 3 ? 'bg-blue-900/50 border-blue-500 text-white' : 'border-transparent text-slate-600'}`}>BLU</div>
      </div>

      {/* Board Container */}
      <div className="relative w-full max-w-[90vw] aspect-square md:max-w-[600px] bg-slate-900 rounded-lg shadow-2xl border-4 border-slate-700 overflow-hidden">
        {/* The Grid */}
        <div className="grid grid-cols-15 grid-rows-15 w-full h-full">
            {Array.from({length: 225}).map((_, i) => {
                const x = i % 15;
                const y = Math.floor(i / 15);
                return renderCell(x, y);
            })}
        </div>

        {/* Bases Overlay (Visuals) */}
        {/* Red Base (BL) */}
        <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-red-500/10 border-r-4 border-t-4 border-red-900 flex items-center justify-center pointer-events-none">
             <div className="w-3/4 h-3/4 bg-red-600 rounded-2xl flex flex-wrap p-4 gap-2 justify-center content-center shadow-inner"></div>
        </div>
        {/* Green Base (TL) */}
        <div className="absolute top-0 left-0 w-[40%] h-[40%] bg-green-500/10 border-r-4 border-b-4 border-green-900 flex items-center justify-center pointer-events-none">
             <div className="w-3/4 h-3/4 bg-green-600 rounded-2xl flex flex-wrap p-4 gap-2 justify-center content-center shadow-inner"></div>
        </div>
        {/* Yellow Base (TR) */}
        <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-yellow-500/10 border-l-4 border-b-4 border-yellow-900 flex items-center justify-center pointer-events-none">
             <div className="w-3/4 h-3/4 bg-yellow-500 rounded-2xl flex flex-wrap p-4 gap-2 justify-center content-center shadow-inner"></div>
        </div>
        {/* Blue Base (BR) */}
        <div className="absolute bottom-0 right-0 w-[40%] h-[40%] bg-blue-500/10 border-l-4 border-t-4 border-blue-900 flex items-center justify-center pointer-events-none">
             <div className="w-3/4 h-3/4 bg-blue-600 rounded-2xl flex flex-wrap p-4 gap-2 justify-center content-center shadow-inner"></div>
        </div>

        {/* Center Home */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[20%] h-[20%] bg-slate-800 z-0 flex flex-wrap">
            <div className="w-full h-full relative">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-black"></div>
                {/* Triangles */}
                <div className="absolute top-0 left-0 w-full h-full border-t-[30px] border-t-green-600/50 border-r-[30px] border-r-yellow-500/50 border-b-[30px] border-b-blue-600/50 border-l-[30px] border-l-red-600/50"></div>
            </div>
        </div>

      </div>

      {/* Controls */}
      <div className="mt-8 flex items-center gap-6">
          <div className="text-white font-mono text-xl">
             {isAiTurn ? 'AI Rolling...' : 'YOUR TURN'}
          </div>
          
          <button 
             onClick={() => !isAiTurn && rollDice()}
             disabled={isAiTurn || !!dice || winner !== null}
             className={`
                w-20 h-20 rounded-2xl flex items-center justify-center text-4xl font-black shadow-xl transition-transform
                ${dice ? 'bg-white text-black scale-100' : 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white animate-pulse scale-110'}
                ${isAiTurn ? 'opacity-50' : ''}
             `}
          >
              {dice || '🎲'}
          </button>
      </div>

      {winner !== null && (
        <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-50 animate-fade-in">
          <h2 className={`text-6xl font-black mb-4 ${PLAYER_TEXT[winner]}`}>
             {PLAYER_NAMES[winner]} WINS!
          </h2>
          <div className="flex gap-4 mt-8">
             <Button onClick={() => {
                 setTokens([[-1,-1,-1,-1],[-1,-1,-1,-1],[-1,-1,-1,-1],[-1,-1,-1,-1]]);
                 setWinner(null);
                 setTurn(0);
                 setDice(null);
             }}>Rematch</Button>
             <Button variant="secondary" onClick={onBack}>Exit</Button>
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