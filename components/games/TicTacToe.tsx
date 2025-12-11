import React, { useState, useEffect } from 'react';
import { GameProps } from '../../types';
import { getTicTacToeMove } from '../../services/geminiService';
import { Button } from '../ui/Button';

const WINNING_COMBOS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
  [0, 4, 8], [2, 4, 6]             // Diagonals
];

export const TicTacToe: React.FC<GameProps> = ({ onBack, onFinish, config }) => {
  const [board, setBoard] = useState<string[]>(Array(9).fill(""));
  const [isXNext, setIsXNext] = useState(true); // X is P1, O is P2 (or AI)
  const [winner, setWinner] = useState<string | null>(null);
  const [isAiThinking, setIsAiThinking] = useState(false);
  
  const isAiMode = config.mode === 'pve';

  useEffect(() => {
    checkWinner(board);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board]);

  useEffect(() => {
    if (isAiMode && !isXNext && !winner && !isBoardFull(board)) {
      // AI Turn
      const makeAiMove = async () => {
        setIsAiThinking(true);
        const move = await getTicTacToeMove(board, config.difficulty);
        setIsAiThinking(false);
        handleClick(move, true);
      };
      makeAiMove();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isXNext, winner, isAiMode, board]);

  const checkWinner = (currentBoard: string[]) => {
    for (let i = 0; i < WINNING_COMBOS.length; i++) {
      const [a, b, c] = WINNING_COMBOS[i];
      if (currentBoard[a] && currentBoard[a] === currentBoard[b] && currentBoard[a] === currentBoard[c]) {
        const winSym = currentBoard[a];
        setWinner(winSym);
        if (onFinish) onFinish(winSym === 'X' ? 'p1' : 'p2');
        return;
      }
    }
    if (isBoardFull(currentBoard)) {
      setWinner('Draw');
      if (onFinish) onFinish('draw');
    }
  };

  const isBoardFull = (currentBoard: string[]) => {
    return currentBoard.every(cell => cell !== "");
  };

  const handleClick = (index: number, isAiTriggered = false) => {
    if (board[index] || winner || isAiThinking) return;
    if (isAiMode && !isXNext && !isAiTriggered) return; 

    const newBoard = [...board];
    newBoard[index] = isXNext ? 'X' : 'O';
    setBoard(newBoard);
    setIsXNext(!isXNext);
  };

  const resetGame = () => {
    setBoard(Array(9).fill(""));
    setWinner(null);
    setIsXNext(true);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-slate-900 relative">
       {/* Turn Indicator */}
       <div className="absolute top-4 flex gap-4 text-xl font-bold">
        <div className={`px-4 py-2 rounded-lg transition-all ${isXNext ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/50 scale-110' : 'text-slate-500'}`}>
          P1 (X)
        </div>
        <div className={`px-4 py-2 rounded-lg transition-all ${!isXNext ? 'bg-red-600 text-white shadow-lg shadow-red-500/50 scale-110' : 'text-slate-500'}`}>
          {isAiMode ? 'AI (O)' : 'P2 (O)'}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 p-4 bg-slate-800 rounded-xl shadow-2xl">
        {board.map((cell, index) => (
          <button
            key={index}
            onClick={() => handleClick(index)}
            disabled={!!cell || !!winner || (isAiMode && !isXNext)}
            className={`w-20 h-20 md:w-24 md:h-24 text-4xl font-black rounded-lg transition-all duration-200 flex items-center justify-center
              ${cell === 'X' ? 'text-blue-500' : 'text-red-500'}
              ${!cell && !winner ? 'hover:bg-slate-700' : ''}
              bg-slate-900 border-2 border-slate-700
            `}
          >
            {cell}
          </button>
        ))}
      </div>

      {isAiThinking && (
         <div className="mt-4 text-emerald-400 font-mono animate-pulse">Gemini ({config.difficulty}) thinking...</div>
      )}

      {winner && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-50 animate-fade-in">
          <h2 className="text-5xl font-black text-white mb-8 drop-shadow-lg text-center">
            {winner === 'Draw' ? 'DRAW!' : `${winner === 'X' ? 'P1' : (isAiMode ? 'AI' : 'P2')} WINS!`}
          </h2>
          <div className="flex gap-4">
            <Button onClick={resetGame}>Rematch</Button>
            <Button variant="secondary" onClick={onBack}>Menu</Button>
          </div>
        </div>
      )}
      
      {!winner && (
        <Button variant="ghost" className="mt-8" onClick={onBack}>Quit Match</Button>
      )}
    </div>
  );
};