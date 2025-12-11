import React, { useState } from 'react';
import { GameType, Difficulty, GameConfig } from '../../types';
import { Button } from '../ui/Button';

interface GameSetupProps {
  gameType: GameType;
  onStart: (config: GameConfig) => void;
  onBack: () => void;
}

const GAME_INFO: Record<GameType, { title: string; instructions: string }> = {
  [GameType.NONE]: { title: '', instructions: '' },
  [GameType.TIC_TAC_TOE]: { 
    title: 'TIC TAC TOE', 
    instructions: 'Place your symbol (X or O) on the grid. The first player to align 3 symbols horizontally, vertically, or diagonally wins.' 
  },
  [GameType.CHESS]: { 
    title: 'CHESS', 
    instructions: 'Capture the opponent\'s King. Select a piece to see valid moves. Standard Chess rules apply. Stalemate leads to a draw.' 
  },
  [GameType.LUDO]: { 
    title: 'LUDO', 
    instructions: 'Standard 4-Player Board. Roll dice to leave base (Roll 6). Capture opponents to send them back. Move all 4 tokens to the center to win.' 
  },
  [GameType.CARROM]: {
    title: 'CARROM',
    instructions: 'Strike to pocket coins of your color (White or Black). Red Queen must be covered. 1-4 Players supported. Drag to aim and shoot.'
  }
};

const GameVisualPreview = ({ type }: { type: GameType }) => {
  switch (type) {
    case GameType.TIC_TAC_TOE:
        return (
            <div className="w-full h-40 flex items-center justify-center bg-slate-900/80 rounded-xl border border-slate-700 mb-6 shadow-inner">
                <div className="relative grid grid-cols-3 gap-2 bg-slate-700 p-2 rounded">
                    {['X', 'O', '', 'O', 'X', '', '', '', 'X'].map((c, i) => (
                         <div key={i} className="w-8 h-8 bg-slate-800 flex items-center justify-center text-lg font-bold rounded">
                            <span className={c === 'X' ? 'text-blue-500 drop-shadow-[0_0_5px_blue]' : 'text-red-500 drop-shadow-[0_0_5px_red]'}>{c}</span>
                         </div>
                    ))}
                    <div className="absolute w-[140px] h-1 bg-yellow-400 rotate-45 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 shadow-[0_0_8px_yellow]"></div>
                </div>
            </div>
        );

    case GameType.CHESS:
        return (
             <div className="w-full h-40 flex items-center justify-center bg-[#1e1e24] rounded-xl border border-slate-700 mb-6 shadow-2xl relative overflow-hidden">
                 <div className="absolute inset-0 bg-gradient-to-b from-[#2a2a35] to-[#111115]"></div>
                 <div className="relative grid grid-cols-4 border-4 border-[#333] shadow-lg transform rotate-x-12 scale-90">
                     {[0,1,0,1, 1,0,1,0, 0,1,0,1, 1,0,1,0].map((b, i) => (
                         <div key={i} className={`w-8 h-8 ${b ? 'bg-[#706860]' : 'bg-[#d8c4ad]'} flex items-center justify-center text-xl`}>
                             {i === 5 && <span className="text-black drop-shadow-sm">♟️</span>}
                             {i === 9 && <span className="text-[#f0d9b5] drop-shadow-sm">♘</span>}
                         </div>
                     ))}
                 </div>
             </div>
        );

    case GameType.LUDO:
         return (
             <div className="w-full h-40 flex items-center justify-center bg-slate-900/80 rounded-xl border border-slate-700 mb-6 relative shadow-inner">
                 <div className="w-32 h-32 bg-slate-800 border-4 border-slate-700 relative grid grid-cols-3 grid-rows-3 gap-0.5">
                     <div className="bg-red-600 rounded-sm"></div>
                     <div className="bg-slate-700 grid grid-cols-3 gap-px p-px">
                         <div className="bg-slate-600"></div><div className="bg-slate-600"></div><div className="bg-slate-600"></div>
                     </div>
                     <div className="bg-green-600 rounded-sm"></div>
                     
                     <div className="bg-slate-700 grid grid-rows-3 gap-px p-px"></div>
                     <div className="bg-slate-900 flex items-center justify-center">
                         <div className="w-2 h-2 bg-white/20 rounded-full"></div>
                     </div>
                     <div className="bg-slate-700"></div>
                     
                     <div className="bg-blue-600 rounded-sm"></div>
                     <div className="bg-slate-700"></div>
                     <div className="bg-yellow-500 rounded-sm"></div>
                 </div>
             </div>
         );

    case GameType.CARROM:
        return (
            <div className="w-full h-40 flex items-center justify-center bg-[#3e2723] rounded-xl border-4 border-[#5d4037] mb-6 relative shadow-2xl">
                 <div className="w-32 h-32 bg-[#eecfa1] relative">
                     {/* Pockets */}
                     <div className="absolute top-1 left-1 w-4 h-4 bg-black rounded-full"></div>
                     <div className="absolute top-1 right-1 w-4 h-4 bg-black rounded-full"></div>
                     <div className="absolute bottom-1 left-1 w-4 h-4 bg-black rounded-full"></div>
                     <div className="absolute bottom-1 right-1 w-4 h-4 bg-black rounded-full"></div>
                     {/* Center */}
                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 border border-red-800 rounded-full flex items-center justify-center">
                         <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                     </div>
                     {/* Striker */}
                     <div className="absolute bottom-6 left-1/2 w-4 h-4 bg-[#fef3c7] rounded-full border border-black transform -translate-x-1/2"></div>
                 </div>
            </div>
        );

    default:
        return null;
  }
}

export const GameSetup: React.FC<GameSetupProps> = ({ gameType, onStart, onBack }) => {
  const [mode, setMode] = useState<'pve' | 'pvp'>('pvp');
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.MEDIUM);
  const [playerCount, setPlayerCount] = useState(2);
  
  const info = GAME_INFO[gameType];
  const supportsFourPlayer = gameType === GameType.LUDO || gameType === GameType.CARROM;

  const handleStart = () => {
      onStart({
          mode,
          difficulty,
          playerCount: supportsFourPlayer ? playerCount : 2
      });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full bg-slate-900 p-4 md:p-6 relative overflow-y-auto">
      <div className="max-w-2xl w-full bg-slate-800 rounded-2xl shadow-2xl p-6 md:p-8 border border-slate-700 animate-fade-in my-auto">
        <h2 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400 mb-6 text-center arcade-font">
          {info.title}
        </h2>
        
        <GameVisualPreview type={gameType} />

        <div className="mb-8 bg-slate-900/50 p-4 md:p-6 rounded-xl border border-slate-700">
            <h3 className="text-sm md:text-base font-bold text-yellow-400 mb-2 uppercase tracking-wide">How to Play</h3>
            <p className="text-slate-300 text-sm md:text-base leading-relaxed">{info.instructions}</p>
        </div>

        <div className="space-y-6">
            
            {/* Mode Selection */}
            <div>
                <label className="block text-xs md:text-sm font-bold text-slate-400 mb-3 uppercase tracking-wider">Game Mode</label>
                <div className="grid grid-cols-2 gap-4">
                    <button 
                        onClick={() => setMode('pvp')}
                        className={`p-3 md:p-4 rounded-xl font-bold transition-all border-2 flex flex-col items-center gap-2 ${mode === 'pvp' ? 'bg-blue-600 border-blue-400 text-white shadow-lg scale-105' : 'bg-slate-700 border-transparent text-slate-400 hover:bg-slate-600'}`}
                    >
                        <span className="text-2xl">👥</span>
                        <span className="text-xs md:text-sm">Local Multiplayer</span>
                    </button>
                    <button 
                        onClick={() => setMode('pve')}
                        className={`p-3 md:p-4 rounded-xl font-bold transition-all border-2 flex flex-col items-center gap-2 ${mode === 'pve' ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg scale-105' : 'bg-slate-700 border-transparent text-slate-400 hover:bg-slate-600'}`}
                    >
                        <span className="text-2xl">🤖</span>
                        <span className="text-xs md:text-sm">VS Computer</span>
                    </button>
                </div>
            </div>

            {/* Player Count (Ludo/Carrom) */}
            {supportsFourPlayer && mode === 'pvp' && (
                <div className="animate-fade-in">
                    <label className="block text-xs md:text-sm font-bold text-slate-400 mb-3 uppercase tracking-wider">Players</label>
                    <div className="grid grid-cols-3 gap-2">
                        {[2, 4].map((cnt) => (
                            <button
                                key={cnt}
                                onClick={() => setPlayerCount(cnt)}
                                className={`
                                    p-3 rounded-lg font-bold text-sm transition-all border
                                    ${playerCount === cnt
                                        ? 'bg-blue-500/20 border-blue-500 text-blue-400 shadow-md' 
                                        : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-500'
                                    }
                                `}
                            >
                                {cnt} Players
                            </button>
                        ))}
                         {/* Ludo supports 3, Carrom typically 2/4. Simple: 2/4 for uniformity or allow 3 for Ludo? */}
                         {/* Code above only shows 2, 4. Standardizing 4p games. */}
                    </div>
                </div>
            )}
            
            {/* Ludo specific 3 player fix if needed, but 2/4 covers Carrom well */}
            {gameType === GameType.LUDO && mode === 'pvp' && (
                 <div className="mt-2 flex justify-center">
                    <button 
                        onClick={() => setPlayerCount(3)} 
                        className={`text-xs text-slate-500 underline ${playerCount===3?'text-blue-400':''}`}>
                        Enable 3 Players (Ludo Only)
                    </button>
                 </div>
            )}


            {/* AI Difficulty */}
            {mode === 'pve' && (
                <div className="animate-fade-in">
                    <label className="block text-xs md:text-sm font-bold text-slate-400 mb-3 uppercase tracking-wider">AI Difficulty</label>
                    <div className="grid grid-cols-3 gap-2">
                        {[Difficulty.EASY, Difficulty.MEDIUM, Difficulty.HARD].map((diff) => (
                            <button
                                key={diff}
                                onClick={() => setDifficulty(diff)}
                                className={`
                                    p-2 md:p-3 rounded-lg font-bold text-xs md:text-sm transition-all border
                                    ${difficulty === diff 
                                        ? diff === Difficulty.EASY ? 'bg-green-500/20 border-green-500 text-green-400' 
                                        : diff === Difficulty.MEDIUM ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400'
                                        : 'bg-red-500/20 border-red-500 text-red-400'
                                        : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-500'
                                    }
                                `}
                            >
                                {diff}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="pt-4 flex gap-4">
                <Button variant="ghost" onClick={onBack} className="flex-1">BACK</Button>
                <Button 
                    onClick={handleStart} 
                    fullWidth 
                    className="flex-[2] text-lg py-3 md:py-4"
                >
                    START GAME
                </Button>
            </div>
        </div>
      </div>
    </div>
  );
};