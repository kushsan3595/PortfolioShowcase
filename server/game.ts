import { db } from './db';
import * as schema from '../shared/schema';
import { eq, sql } from 'drizzle-orm';

// Game state types
export type GameState = 'waiting' | 'playing' | 'finished';
export type GameResult = 'win' | 'loss' | 'draw' | null;

// Game schema
export const gameSchema = schema.z.object({
  id: schema.z.string(),
  player1_id: schema.z.string(),
  player2_id: schema.z.string().nullable(),
  state: schema.z.enum(['waiting', 'playing', 'finished']),
  current_turn: schema.z.string().nullable(),
  result: schema.z.enum(['win', 'loss', 'draw']).nullable(),
  created_at: schema.z.date(),
  updated_at: schema.z.date(),
});

export type Game = schema.z.infer<typeof gameSchema>;

// Create a new game
export async function createGame(name: string, description: string, maxPlayers: number, imageUrl?: string): Promise<schema.Game> {
  const [game] = await db.insert(schema.games).values({
    name,
    description,
    maxPlayers,
    imageUrl: imageUrl || null
  }).returning();
  return game;
}

// Join an existing game
export async function joinGame(gameId: string, player2Id: string): Promise<Game> {
  const game = await db.game.update({
    where: { id: gameId },
    data: {
      player2_id: player2Id,
      state: 'playing',
    },
  });
  return game;
}

// Get game by ID
export async function getGameById(gameId: number): Promise<schema.Game | null> {
  const [game] = await db.select().from(schema.games).where(eq(schema.games.id, gameId));
  return game || null;
}

// Get all games
export async function getAllGames(): Promise<schema.Game[]> {
  return await db.select().from(schema.games);
}

// Get all waiting games
export async function getWaitingGames(): Promise<Game[]> {
  return await db.game.findMany({
    where: { state: 'waiting' },
  });
}

// Update game state
export async function updateGameState(
  gameId: string,
  state: GameState,
  result?: GameResult
): Promise<Game> {
  return await db.game.update({
    where: { id: gameId },
    data: {
      state,
      result: result || undefined,
      updated_at: new Date(),
    },
  });
}

// Get user's active games
export async function getUserActiveGames(userId: string): Promise<Game[]> {
  return await db.game.findMany({
    where: {
      OR: [
        { player1_id: userId },
        { player2_id: userId },
      ],
      state: { in: ['waiting', 'playing'] },
    },
  });
}

// Record game history
export async function recordGameHistory(
  gameId: number,
  winnerId: number | null,
  playerIds: number[],
  score?: string
): Promise<schema.GameHistory> {
  const [history] = await db.insert(schema.gameHistory).values({
    gameId,
    winnerId,
    playerIds: playerIds.map(id => id.toString()),
    score
  }).returning();
  return history;
}

// Get game history for a user
export async function getUserGameHistory(userId: number): Promise<schema.GameHistory[]> {
  return await db.select()
    .from(schema.gameHistory)
    .where(sql`${userId}::text = ANY(${schema.gameHistory.playerIds})`)
    .orderBy(schema.gameHistory.playedAt);
}

// Update user stats after game completion
export async function updateUserStats(userId: number, isWinner: boolean): Promise<void> {
  await db.update(schema.users)
    .set({
      gamesPlayed: sql`${schema.users.gamesPlayed} + 1`,
      gamesWon: isWinner ? sql`${schema.users.gamesWon} + 1` : schema.users.gamesWon
    })
    .where(eq(schema.users.id, userId));
} 