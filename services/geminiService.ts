import { GoogleGenAI, Type } from "@google/genai";
import { Difficulty } from "../types";

// Initialize the API client
const apiKey = process.env.API_KEY || ''; 
const ai = new GoogleGenAI({ apiKey });

const modelName = 'gemini-2.5-flash';

const getDifficultyPrompt = (difficulty: Difficulty) => {
  switch (difficulty) {
    case Difficulty.EASY:
      return "You are a beginner chess player. Make occasional blunders. Do not play optimally.";
    case Difficulty.MEDIUM:
      return "You are a casual chess club player. Play decently but miss deep tactics.";
    case Difficulty.HARD:
      return "You are a Grandmaster chess engine. Play the absolute best move possible.";
    default:
      return "You are a competent player.";
  }
};

/**
 * Gets the best move for Tic Tac Toe from Gemini.
 */
export const getTicTacToeMove = async (board: string[], difficulty: Difficulty): Promise<number> => {
  if (!apiKey) return getRandomMove(board);

  // Randomness based on difficulty
  if (difficulty === Difficulty.EASY && Math.random() > 0.6) return getRandomMove(board);
  if (difficulty === Difficulty.MEDIUM && Math.random() > 0.85) return getRandomMove(board);

  try {
    const prompt = `
      Play Tic Tac Toe. Board (0-8): ${JSON.stringify(board)}.
      'X' is opponent, 'O' is you.
      Return JSON: { "move": number }.
    `;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: { move: { type: Type.INTEGER } },
        },
      },
    });

    const json = JSON.parse(response.text || '{}');
    const move = json.move;

    if (typeof move === 'number' && move >= 0 && move <= 8 && board[move] === "") {
      return move;
    }
    return getRandomMove(board);
  } catch (error) {
    return getRandomMove(board);
  }
};

/**
 * Gets the best move for Chess from Gemini with a timeout context.
 */
export const getChessMove = async (fen: string, difficulty: Difficulty): Promise<string> => {
  if (!apiKey) return ''; 

  try {
    const prompt = `
      You are a Chess Engine playing Black.
      ${getDifficultyPrompt(difficulty)}
      Current FEN: ${fen}
      Analyze the position.
      Return the best move in Standard Algebraic Notation (SAN) (e.g., "Nf3", "O-O", "e5") or UCI format.
      Return JSON: { "move": "move_string" }.
    `;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: { move: { type: Type.STRING } },
        },
      },
    });
    
    const json = JSON.parse(response.text || '{}');
    return json.move || '';
  } catch (e) {
    console.error("Chess AI Error", e);
    return '';
  }
};

/**
 * Generates a victory message.
 */
export const getVictoryMessage = async (winner: string, gameName: string): Promise<string> => {
  if (!apiKey) return `${winner} wins at ${gameName}!`;

  try {
    const prompt = `
      Write a funny 5-word victory message for ${winner} winning ${gameName}.
    `;
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
    });
    return response.text?.trim() || `${winner} Wins!`;
  } catch (e) {
    return `${winner} Wins!`;
  }
};

const getRandomMove = (board: string[]): number => {
  const emptyIndices = board.map((val, idx) => val === "" ? idx : -1).filter(idx => idx !== -1);
  if (emptyIndices.length === 0) return -1;
  return emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
};