export enum GameStatus {
  MENU = 'MENU',
  LOADING = 'LOADING',
  PLAYING = 'PLAYING',
  PUZZLE = 'PUZZLE',
  GAME_OVER = 'GAME_OVER',
}

export type GraphicStyle = 'pixel' | 'vector' | '3d';

export interface GameAssets {
  playerSprite: string; // base64
  enemySprite: string; // base64
  bossSprite: string; // base64
  theme: string;
}

export interface GameOptions {
  playerCount: 1 | 2;
  startingLevel: number;
  quality: 'high' | 'low';
}