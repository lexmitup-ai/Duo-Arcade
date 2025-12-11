import React, { useState, useEffect, useRef } from 'react';
import { Chess, Square, Move } from 'chess.js';
import { GameProps } from '../../types';
import { Button } from '../ui/Button';
import { getChessMove } from '../../services/geminiService';

export const ChessGame: React.FC<GameProps> = ({ onBack, onFinish, config }) => {
  const [game, setGame] = useState(new Chess());
  // Using board state to force renders
  const [board, setBoard] = useState(game.board());
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [possibleMoves, setPossibleMoves] = useState<Square[]>([]);
  const [winner, setWinner] = useState<string | null>(null);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [lastMove, setLastMove] = useState<{from: string, to: string} | null>(null);

  const isAiMode = config.mode === 'pve';

  // AI Turn Handling
  useEffect(() => {
    if (isAiMode && game.turn() === 'b' && !winner) {
      const executeAiTurn = async () => {
        setIsAiThinking(true);
        const moves = game.moves();
        
        if (moves.length === 0) {
            checkGameOver();
            setIsAiThinking(false);
            return;
        }

        // 20 Second Timeout Promise
        const timeoutPromise = new Promise<string>((resolve) => {
            setTimeout(() => resolve('TIMEOUT'), 20000);
        });

        // AI Request Promise
        const aiPromise = getChessMove(game.fen(), config.difficulty);

        try {
            // Race the AI against the clock
            const result = await Promise.race([aiPromise, timeoutPromise]);
            
            let moveAttempt = null;

            if (result === 'TIMEOUT' || !result) {
                // Fallback to random if timeout or empty
                moveAttempt = moves[Math.floor(Math.random() * moves.length)];
            } else {
                moveAttempt = result;
            }

            try {
                const moveResult = game.move(moveAttempt);
                setLastMove({ from: moveResult.from, to: moveResult.to });
            } catch (e) {
                // If AI hallucinated an invalid move, do random
                const randomMove = moves[Math.floor(Math.random() * moves.length)];
                const moveResult = game.move(randomMove);
                setLastMove({ from: moveResult.from, to: moveResult.to });
            }

        } catch (error) {
            // Fallback
            const randomMove = moves[Math.floor(Math.random() * moves.length)];
            game.move(randomMove);
        }

        setBoard(game.board());
        setGame(new Chess(game.fen())); // Force state update
        checkGameOver();
        setIsAiThinking(false);
      };

      // Small delay so UI updates before "thinking" starts
      setTimeout(executeAiTurn, 100);
    }
  }, [game.fen(), isAiMode, winner, config.difficulty]);

  const checkGameOver = () => {
    if (game.isGameOver()) {
      if (game.isCheckmate()) {
        const winner = game.turn() === 'w' ? 'Black' : 'White';
        setWinner(winner);
        if (onFinish) onFinish(winner);
      } else if (game.isDraw() || game.isStalemate() || game.isThreefoldRepetition()) {
        setWinner('Draw');
        if (onFinish) onFinish('Draw');
      }
    }
  };

  const handleSquareClick = (row: number, col: number) => {
    if (winner || isAiThinking || (isAiMode && game.turn() === 'b')) return;

    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const rank = 8 - row;
    const file = files[col];
    const square = `${file}${rank}` as Square;

    const piece = game.get(square);

    // Select piece
    if (piece && piece.color === game.turn()) {
      setSelectedSquare(square);
      const moves = game.moves({ square, verbose: true });
      setPossibleMoves(moves.map(m => m.to));
      return;
    }

    // Move piece
    if (selectedSquare) {
      try {
        const moveResult = game.move({
          from: selectedSquare,
          to: square,
          promotion: 'q' 
        });

        if (moveResult) {
          setLastMove({ from: moveResult.from, to: moveResult.to });
          setBoard(game.board());
          setGame(new Chess(game.fen()));
          setSelectedSquare(null);
          setPossibleMoves([]);
          checkGameOver();
        }
      } catch (e) {
        // Invalid move, deselect if clicking elsewhere
        setSelectedSquare(null);
        setPossibleMoves([]);
      }
    }
  };

  // Beautiful Unicode Pieces with SVG-like styling
  const getPieceStyle = (type: string, color: string) => {
    const symbols: any = {
      p: '♟', r: '♜', n: '♞', b: '♝', q: '♛', k: '♚'
    };
    return (
      <span 
        className={`
          text-4xl md:text-5xl lg:text-6xl select-none transition-transform duration-200
          ${color === 'w' 
            ? 'text-[#f0d9b5] drop-shadow-[0_2px_1px_rgba(0,0,0,0.5)]' 
            : 'text-[#1a1a1a] drop-shadow-[0_1px_1px_rgba(255,255,255,0.3)]'}
        `}
        style={{ filter: color === 'b' ? 'drop-shadow(0px 2px 2px rgba(0,0,0,0.5))' : 'drop-shadow(0px 2px 4px rgba(0,0,0,0.8))' }}
      >
        {symbols[type]}
      </span>
    );
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full bg-[#1e1e24] relative overflow-hidden">
      
      {/* Ambient Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#2a2a35] to-[#111115]"></div>

      {/* Info Bar */}
      <div className="relative z-10 w-full max-w-lg flex justify-between items-center mb-6 px-4">
        <div className={`flex items-center gap-3 px-4 py-2 rounded-lg ${game.turn() === 'b' ? 'bg-[#3a3a45] shadow-lg ring-1 ring-white/10' : 'opacity-50'}`}>
           <div className="w-3 h-3 rounded-full bg-black border border-white/20"></div>
           <span className="font-bold text-gray-200">{isAiMode ? 'Gemini AI' : 'Black'}</span>
           {isAiThinking && <div className="ml-2 w-4 h-4 border-2 border-t-transparent border-blue-400 rounded-full animate-spin"></div>}
        </div>
        <div className={`flex items-center gap-3 px-4 py-2 rounded-lg ${game.turn() === 'w' ? 'bg-[#3a3a45] shadow-lg ring-1 ring-white/10' : 'opacity-50'}`}>
           <div className="w-3 h-3 rounded-full bg-[#f0d9b5]"></div>
           <span className="font-bold text-[#f0d9b5]">White</span>
        </div>
      </div>

      {/* Thinking Indicator Overlay */}
      {isAiThinking && (
          <div className="absolute top-24 z-20 bg-black/60 backdrop-blur-sm px-6 py-2 rounded-full border border-white/10 flex items-center gap-3 animate-pulse">
              <span className="text-blue-300 font-mono text-sm">Gemini is thinking...</span>
          </div>
      )}

      {/* The Board */}
      <div className="relative z-10 p-2 bg-[#2a2a30] rounded-lg shadow-2xl border border-[#404050]">
        <div className="grid grid-cols-8 border-4 border-[#333]">
          {board.map((row, rIndex) =>
            row.map((piece, cIndex) => {
              const isDark = (rIndex + cIndex) % 2 === 1;
              const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
              const squareId = `${files[cIndex]}${8 - rIndex}` as Square;
              const isSelected = selectedSquare === squareId;
              const isPossible = possibleMoves.includes(squareId);
              const isLastMove = lastMove && (lastMove.from === squareId || lastMove.to === squareId);

              return (
                <div
                  key={`${rIndex}-${cIndex}`}
                  onClick={() => handleSquareClick(rIndex, cIndex)}
                  className={`
                    w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16 flex items-center justify-center cursor-pointer relative
                    ${isDark ? 'bg-[#706860]' : 'bg-[#d8c4ad]'}
                    ${isSelected ? '!bg-[#6d8a3e]' : ''}
                    ${isLastMove ? '!bg-[#baca44]' : ''}
                    transition-colors duration-150
                  `}
                >
                  {/* Possible Move Marker */}
                  {isPossible && (
                    <div className={`
                        absolute w-3 h-3 rounded-full 
                        ${piece ? 'border-4 border-black/20 w-full h-full rounded-none' : 'bg-black/20'}
                    `}></div>
                  )}

                  {piece && (
                    <div className={isPossible ? 'opacity-80' : ''}>
                        {getPieceStyle(piece.type, piece.color)}
                    </div>
                  )}
                  
                  {/* Rank/File Notation labels for corners */}
                  {cIndex === 0 && (
                      <span className={`absolute top-0.5 left-0.5 text-[8px] sm:text-[10px] font-bold ${isDark ? 'text-[#d8c4ad]' : 'text-[#706860]'}`}>
                          {8 - rIndex}
                      </span>
                  )}
                  {rIndex === 7 && (
                      <span className={`absolute bottom-0 right-0.5 text-[8px] sm:text-[10px] font-bold ${isDark ? 'text-[#d8c4ad]' : 'text-[#706860]'}`}>
                          {files[cIndex]}
                      </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {winner && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center z-50 animate-fade-in">
          <h2 className="text-5xl font-black text-white mb-2 arcade-font text-center drop-shadow-lg">
            GAME OVER
          </h2>
          <p className="text-2xl text-yellow-400 mb-8 font-bold">{winner === 'Draw' ? 'Draw' : `${winner} Won!`}</p>
          <div className="flex gap-4">
             <Button onClick={() => {
                 setGame(new Chess());
                 setBoard(new Chess().board());
                 setWinner(null);
                 setLastMove(null);
             }}>Play Again</Button>
             <Button variant="secondary" onClick={onBack}>Exit</Button>
          </div>
        </div>
      )}
      
      {!winner && <Button variant="ghost" className="mt-8 relative z-10" onClick={onBack}>Resign Game</Button>}
    </div>
  );
};