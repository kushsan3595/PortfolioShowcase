export const games = [
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
    svgIcon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="3" x2="21" y2="21" /><line x1="21" y1="3" x2="3" y2="21" /><rect x="3" y="3" width="18" height="18" rx="2" stroke="none" /></svg>`
  },
  {
    id: 3,
    name: 'Snake',
    description: 'Classic snake game with multiplayer mode. Use arrow keys to move.',
    maxPlayers: 2,
    svgIcon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 16.5c0-1 8-4 8-4s-8-3-8-4 8-4 8-4-8-3-8-4 8-4 8-4" /><path d="M2.5 8.5c0 1 4 1.5 6 2.5s4.5 2 6.5 2c3.3 0 1 -7 1 -7" /><circle cx="5" cy="9" r="1" /></svg>`
  }
];

export function getGameById(id: number) {
  return games.find(game => game.id === id);
}

export function getGameIcon(id: number) {
  const game = getGameById(id);
  return game?.svgIcon || '';
}

// Convert hex color to RGB for calculations
export function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

// Generate a random color for user avatar
export function generateRandomColor() {
  return '#' + Math.floor(Math.random()*16777215).toString(16);
}

// Calculate win rate percentage
export function calculateWinRate(gamesWon: number, gamesPlayed: number) {
  if (gamesPlayed === 0) return 0;
  return Math.round((gamesWon / gamesPlayed) * 100);
}

// Format game score for display
export function formatGameScore(score: string | undefined) {
  if (!score) return '';
  
  try {
    const scoreObj = JSON.parse(score);
    return Object.entries(scoreObj)
      .map(([playerId, score]) => `${playerId}: ${score}`)
      .join(' - ');
  } catch (error) {
    return score;
  }
}
