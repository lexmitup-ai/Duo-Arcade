export enum GameType {
  NONE = 'NONE',
  TIC_TAC_TOE = 'TIC_TAC_TOE',
  CHESS = 'CHESS',
  LUDO = 'LUDO',
  CARROM = 'CARROM'
}

export enum Difficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD'
}

export interface PlayerScore {
  p1: number;
  p2: number;
}

export interface GameConfig {
  mode: 'pve' | 'pvp';
  difficulty: Difficulty;
  playerCount: number; // For Ludo/Carrom
}

export interface GameProps {
  onBack: () => void;
  onFinish?: (winner: string) => void;
  config: GameConfig;
}

export type Player = 'p1' | 'p2';