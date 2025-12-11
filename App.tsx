import React, { useState, useEffect } from 'react';
import { GameType, GameConfig, Difficulty } from './types';
import { TicTacToe } from './components/games/TicTacToe';
import { ChessGame } from './components/games/ChessGame';
import { Ludo } from './components/games/Ludo';
import { Carrom } from './components/games/Carrom';
import { GameSetup } from './components/screens/GameSetup';
import { getVictoryMessage } from './services/geminiService';

const App = () => {
  const [selectedGame, setSelectedGame] = useState<GameType>(GameType.NONE);
  const [activeGame, setActiveGame] = useState<GameType>(GameType.NONE);
  const [gameConfig, setGameConfig] = useState<GameConfig>({ 
      mode: 'pvp', 
      difficulty: Difficulty.MEDIUM,
      playerCount: 2 
  });
  
  const [lastWinnerMessage, setLastWinnerMessage] = useState<string | null>(null);
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    installPrompt.userChoice.then((choice: any) => {
      if (choice.outcome === 'accepted') {
        setInstallPrompt(null);
      }
    });
  };

  const handleGameSelect = (game: GameType) => {
      setSelectedGame(game);
  };

  const handleGameStart = (config: GameConfig) => {
      setGameConfig(config);
      setActiveGame(selectedGame);
  };

  const handleBackToMenu = () => {
      setActiveGame(GameType.NONE);
      setSelectedGame(GameType.NONE);
      setLastWinnerMessage(null);
  };

  const handleGameFinish = async (winner: string) => {
      const gameName = activeGame.toString();
      getVictoryMessage(winner, gameName).then(msg => setLastWinnerMessage(msg));
  };

  const renderGame = () => {
    const commonProps = {
        onBack: handleBackToMenu,
        onFinish: handleGameFinish,
        config: gameConfig
    };

    switch (activeGame) {
      case GameType.TIC_TAC_TOE:
        return <TicTacToe {...commonProps} />;
      case GameType.CHESS:
        return <ChessGame {...commonProps} />;
      case GameType.LUDO:
        return <Ludo {...commonProps} />;
      case GameType.CARROM:
        return <Carrom {...commonProps} />;
      default:
        return null;
    }
  };

  // 1. Show Game
  if (activeGame !== GameType.NONE) {
    return (
        <div className="h-screen w-screen bg-slate-900 overflow-hidden">
            {renderGame()}
        </div>
    );
  }

  // 2. Show Setup
  if (selectedGame !== GameType.NONE) {
      return (
          <GameSetup 
            gameType={selectedGame}
            onStart={handleGameStart}
            onBack={() => setSelectedGame(GameType.NONE)}
          />
      );
  }

  // 3. Show Menu
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      
      {/* Decorative Background */}
      <div className="absolute top-[-20%] left-[-20%] w-[50%] h-[50%] bg-blue-500/20 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[50%] h-[50%] bg-amber-500/20 blur-[100px] rounded-full pointer-events-none" />

      <header className="mb-8 text-center z-10">
        <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400 drop-shadow-lg arcade-font mb-4">
          DUO<br/><span className="text-white text-2xl md:text-4xl">ARCADE</span>
        </h1>
        <p className="text-slate-400 font-mono text-xs md:text-sm">Select a game to start</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 w-full max-w-6xl z-10 px-4">
        <GameCard 
          title="TIC TAC TOE" 
          color="from-purple-600 to-pink-400"
          icon={<div className="text-4xl">❌</div>}
          onClick={() => handleGameSelect(GameType.TIC_TAC_TOE)}
        />
        <GameCard 
          title="CHESS" 
          color="from-indigo-600 to-violet-400"
          icon={<div className="text-4xl">♟️</div>}
          onClick={() => handleGameSelect(GameType.CHESS)}
        />
        <GameCard 
          title="LUDO" 
          color="from-green-600 to-emerald-400"
          icon={<div className="text-4xl">🎲</div>}
          onClick={() => handleGameSelect(GameType.LUDO)}
        />
        <GameCard 
          title="CARROM" 
          color="from-amber-700 to-orange-500"
          icon={<div className="text-4xl">🎯</div>}
          onClick={() => handleGameSelect(GameType.CARROM)}
        />
      </div>

      <footer className="mt-12 text-slate-600 text-[10px] text-center font-mono z-10 flex flex-col items-center gap-2">
        <p>NO ADS. NO IAP. FREE FOREVER.</p>
        <p>POWERED BY GEMINI 2.5 FLASH</p>
        
        {installPrompt && (
          <button 
            onClick={handleInstall}
            className="mt-4 px-6 py-2 bg-slate-800 border border-blue-500/50 rounded-full text-blue-400 font-bold text-xs uppercase tracking-widest hover:bg-blue-500/10 transition-colors animate-pulse flex items-center gap-2"
          >
            <span>📲</span> INSTALL APP
          </button>
        )}
      </footer>

      {lastWinnerMessage && (
          <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 bg-slate-800 border border-slate-700 p-4 rounded-xl shadow-2xl z-50 animate-bounce">
              <p className="text-yellow-400 font-bold text-center">🏆 {lastWinnerMessage}</p>
          </div>
      )}
    </div>
  );
};

const GameCard = ({ title, color, icon, onClick }: any) => {
  return (
    <div className="relative group">
        <div 
            onClick={onClick}
            className={`
                h-40 rounded-2xl bg-gradient-to-br ${color} p-4 
                cursor-pointer transform transition-all duration-300 
                hover:scale-105 hover:shadow-2xl hover:shadow-${color.split('-')[1]}-500/40
                flex flex-col items-center justify-center gap-2 border border-white/10
            `}
        >
            <div className="text-white opacity-90 group-hover:scale-110 transition-transform duration-300">
                {icon}
            </div>
            <h3 className="text-xl font-black text-white tracking-widest text-center">{title}</h3>
        </div>
    </div>
  );
};

export default App;