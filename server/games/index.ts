import { WebSocket } from 'ws';

// Game type definitions
export interface GameConfig {
  id: number;
  name: string;
  description: string;
  maxPlayers: number;
  svgIcon: string;
}

// Game catalog
export const games: GameConfig[] = [
  {
    id: 1,
    name: 'Pong',
    description: 'Classic table tennis game. Use arrow keys to move paddle.',
    maxPlayers: 2,
    svgIcon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="4" height="12" rx="1" /><rect x="18" y="6" width="4" height="12" rx="1" /><circle cx="12" cy="12" r="2" /></svg>`
  },
  {
    id: 2,
    name: 'Tic-Tac-Toe',
    description: 'Classic X and O game. Click on a cell to place your mark.',
    maxPlayers: 2,
    svgIcon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="3" x2="21" y2="21" /><line x1="21" y1="3" x2="3" y2="21" /><rect x="3" y="3" width="18" height="18" rx="2" /></svg>`
  },
  {
    id: 3,
    name: 'Snake',
    description: 'Classic snake game with multiplayer mode. Use arrow keys to move.',
    maxPlayers: 2,
    svgIcon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.5 2.5h3c1.65 0 3 1.34 3 3v3c0 1.65-1.34 3-3 3h-3c-1.65 0-3-1.34-3-3v-3c0-1.65 1.34-3 3-3z" /><path d="M3.5 10.5h3c1.65 0 3 1.34 3 3v3c0 1.65-1.34 3-3 3h-3c-1.65 0-3-1.34-3-3v-3c0-1.65 1.34-3 3-3z" /><path d="M17.5 10.5h3c1.65 0 3 1.34 3 3v3c0 1.65-1.34 3-3 3h-3c-1.65 0-3-1.34-3-3v-3c0-1.65 1.34-3 3-3z" /><path d="M10.5 13.5V10" /><path d="M13.5 17.5H17" /></svg>`
  }
];
