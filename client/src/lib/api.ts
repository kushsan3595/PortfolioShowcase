import { games, gameHistory, type Game, type GameHistory } from '../../shared/schema';

const API_BASE_URL = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:5000/api' 
  : '/api'; // In production, use relative path

// Game API functions
export async function createGame(name: string, description: string, maxPlayers: number, imageUrl?: string): Promise<Game> {
  const response = await fetch(`${API_BASE_URL}/games`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, description, maxPlayers, imageUrl }),
    credentials: 'include',
  });
  
  if (!response.ok) {
    throw new Error('Failed to create game');
  }
  
  return response.json();
}

export async function getGameById(gameId: number): Promise<Game | null> {
  const response = await fetch(`${API_BASE_URL}/games/${gameId}`, {
    credentials: 'include',
  });
  
  if (!response.ok) {
    throw new Error('Failed to get game');
  }
  
  return response.json();
}

export async function getAllGames(): Promise<Game[]> {
  const response = await fetch(`${API_BASE_URL}/games`, {
    credentials: 'include',
  });
  
  if (!response.ok) {
    throw new Error('Failed to get games');
  }
  
  return response.json();
}

export async function recordGameHistory(
  gameId: number,
  winnerId: number | null,
  playerIds: number[],
  score?: string
): Promise<GameHistory> {
  const response = await fetch(`${API_BASE_URL}/game-history`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ gameId, winnerId, playerIds, score }),
    credentials: 'include',
  });
  
  if (!response.ok) {
    throw new Error('Failed to record game history');
  }
  
  return response.json();
}

export async function getUserGameHistory(userId: number): Promise<GameHistory[]> {
  const response = await fetch(`${API_BASE_URL}/users/${userId}/game-history`, {
    credentials: 'include',
  });
  
  if (!response.ok) {
    throw new Error('Failed to get user game history');
  }
  
  return response.json();
}

// WebSocket connection
export function createWebSocketConnection() {
  const wsUrl = process.env.NODE_ENV === 'development'
    ? 'ws://localhost:5000/ws'
    : `wss://${window.location.host}/ws`;
    
  return new WebSocket(wsUrl);
} 