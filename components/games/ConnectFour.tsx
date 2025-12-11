import React, { useState, useEffect } from 'react';
import { GameProps, Difficulty } from '../../types';
import { Button } from '../ui/Button';

const ROWS = 6;
const COLS = 7;

export const ConnectFour: React.FC<GameProps> = ({ onBack, onFinish, config }) => {
  const [board, setBoard] = useState<string[][]>(
    Array(ROWS).fill(null).map(() => Array(COLS).fill(null))
  );
  const [currentPlayer, setCurrentPlayer] = useState<'p1' | 'p2'>('p1');
  const [winner, setWinner] = useState<string | null>(null);
  const [isAiThinking, setIsAiThinking] = useState(false);

  const isAiMode = config.mode === 'pve';

  useEffect(() => {
    if (isAiMode && currentPlayer === 'p2' && !winner) {
      const timer = setTimeout(() => {
        setIsAiThinking(true);
        makeAiMove();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentPlayer, winner, isAiMode]);

  const makeAiMove = () => {
    const validCols = [];
    for (let c = 0; c < COLS; c++) {
      if (!board[0][c]) validCols.push(c);
    }
    
    if (validCols.length === 0) return;

    let col = validCols[Math.floor(Math.random() * validCols.length)];
    
    // Higher difficulty AI logic placeholder
    // Medium/Hard prefers center
    if (config.difficulty !== Difficulty.EASY) {
         const center = Math.floor(COLS / 2);
         if (validCols.includes(center) && Math.random() > 0.4) {
             col = center;
         }
         // Hard could check for wins (simplified block)
         if (config.difficulty === Difficulty.HARD) {
             // Basic 1-step lookahead logic could go here
         }
    }

    dropPiece(col);
    setIsAiThinking(false);
  };

  const dropPiece = (colIndex: number) => {
    if (winner || isAiThinking) return;
    
    // Find lowest empty spot
    let rowIndex = -1;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (!board[r][colIndex]) {
        rowIndex = r;
        break;
      }
    }

    if (rowIndex === -1) return; // Column full

    const newBoard = board.map(row => [...row]);
    newBoard[rowIndex][colIndex] = currentPlayer;
    setBoard(newBoard);

    if (checkWin(newBoard, rowIndex, colIndex, currentPlayer)) {
      setWinner(currentPlayer);
      if (onFinish) onFinish(currentPlayer);
    } else if (newBoard.every(row => row.every(cell => cell !== null))) {
      setWinner('draw');
      if (onFinish) onFinish('draw');
    } else {
      setCurrentPlayer(currentPlayer === 'p1' ? 'p2' : 'p1');
    }
  };

  const checkWin = (board: string[][], r: number, c: number, player: string) => {
    // Directions: [dRow, dCol]
    const directions = [
      [0, 1], // Horizontal
      [1, 0], // Vertical
      [1, 1], // Diag Down-Right
      [1, -1] // Diag Down-Left
    ];

    for (let [dr, dc] of directions) {
      let count = 1;
      // Check forward
      for (let i = 1; i < 4; i++) {
        const nr = r + dr * i;
        const nc = c + dc * i;
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && board[nr][nc] === player) count++;
        else break;
      }
      // Check backward
      for (let i = 1; i < 4; i++) {
        const nr = r - dr * i;
        const nc = c - dc * i;
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && board[nr][nc] === player) count++;
        else break;
      }
      if (count >= 4) return true;
    }
    return false;
  };

  return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-slate-900">
      <div className="mb-4 flex gap-8 text-xl font-bold">
         <div className={`px-4 py-2 rounded-lg ${currentPlayer === 'p1' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/50' : 'text-slate-600'}`}>
            PLAYER 1
         </div>
         <div className={`px-4 py-2 rounded-lg ${currentPlayer === 'p2' ? 'bg-red-600 text-white shadow-lg shadow-red-500/50' : 'text-slate-600'}`}>
            {isAiMode ? `AI (${config.difficulty})` : 'PLAYER 2'}
         </div>
      </div>

      <div className="p-4 bg-blue-800 rounded-xl shadow-2xl border-4 border-blue-900 inline-block relative">
         <div className="grid grid-cols-7 gap-2 md:gap-3">
            {board.map((row, rIndex) => (
                row.map((cell, cIndex) => (
                    <div 
                        key={`${rIndex}-${cIndex}`}
                        onClick={() => dropPiece(cIndex)}
                        className={`
                            w-10 h-10 md:w-16 md:h-16 rounded-full cursor-pointer transition-all duration-300
                            ${cell === 'p1' ? 'bg-blue-400 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]' : 
                              cell === 'p2' ? 'bg-red-500 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]' : 
                              'bg-slate-900 hover:bg-slate-800'}
                        `}
                    />
                ))
            ))}
         </div>
         
         {/* Click columns hint overlay (invisible but functional columns) */}
         <div className="absolute inset-0 flex">
            {Array(COLS).fill(0).map((_, i) => (
                 <div key={i} onClick={() => dropPiece(i)} className="flex-1 h-full cursor-pointer hover:bg-white/5 transition-colors" />
            ))}
         </div>
      </div>

      {winner && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-50">
           <h2 className="text-5xl font-black text-white mb-8 arcade-font text-center">
            {winner === 'draw' ? 'DRAW' : winner === 'p1' ? 'BLUE WINS' : 'RED WINS'}
           </h2>
           <div className="flex gap-4">
              <Button onClick={() => {
                  setBoard(Array(ROWS).fill(null).map(() => Array(COLS).fill(null)));
                  setWinner(null);
                  setCurrentPlayer('p1');
              }}>Rematch</Button>
              <Button variant="secondary" onClick={onBack}>Menu</Button>
           </div>
        </div>
      )}
      
      {!winner && <Button variant="ghost" className="mt-8" onClick={onBack}>Quit</Button>}
    </div>
  );
};