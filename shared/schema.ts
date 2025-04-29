import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Database Tables
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name"),
  avatarColor: text("avatar_color"),
  gamesPlayed: integer("games_played").default(0),
  gamesWon: integer("games_won").default(0)
});

export const games = pgTable("games", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  maxPlayers: integer("max_players").notNull(),
  imageUrl: text("image_url")
});

export const gameHistory = pgTable("game_history", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id").notNull(),
  winnerId: integer("winner_id"),
  playerIds: text("player_ids").array().notNull(),
  score: text("score"),
  playedAt: timestamp("played_at").defaultNow()
});

// Insert Schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  displayName: true,
  avatarColor: true
});

export const insertGameSchema = createInsertSchema(games);

export const insertGameHistorySchema = createInsertSchema(gameHistory).pick({
  gameId: true,
  winnerId: true,
  playerIds: true,
  score: true
});

// Select Schemas
export const selectUserSchema = createSelectSchema(users);
export const selectGameSchema = createSelectSchema(games);
export const selectGameHistorySchema = createSelectSchema(gameHistory);

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = z.infer<typeof selectUserSchema>;

export type InsertGame = z.infer<typeof insertGameSchema>;
export type Game = z.infer<typeof selectGameSchema>;

export type InsertGameHistory = z.infer<typeof insertGameHistorySchema>;
export type GameHistory = z.infer<typeof selectGameHistorySchema>;

// Lobby and Room Schemas
export const playerSchema = z.object({
  id: z.number(),
  username: z.string(),
  displayName: z.string().optional(),
  avatarColor: z.string().optional(),
  isReady: z.boolean().default(false)
});

export const gameRoomSchema = z.object({
  id: z.string(),
  gameId: z.number(),
  name: z.string(),
  players: z.array(playerSchema),
  maxPlayers: z.number(),
  isPrivate: z.boolean().default(false),
  status: z.enum(["waiting", "playing", "finished"]).default("waiting"),
  createdAt: z.number()
});

// Lobby and Room Types
export type Player = z.infer<typeof playerSchema>;
export type GameRoom = z.infer<typeof gameRoomSchema>;

// Validation Schemas
export const createRoomSchema = z.object({
  gameId: z.number(),
  name: z.string().min(1).max(50),
  maxPlayers: z.number().min(2).max(10),
  isPrivate: z.boolean().optional()
});

export const joinRoomSchema = z.object({
  roomId: z.string(),
  player: playerSchema
});

export type CreateRoom = z.infer<typeof createRoomSchema>;
export type JoinRoom = z.infer<typeof joinRoomSchema>;

// Export zod instance for type inference
export { z };
