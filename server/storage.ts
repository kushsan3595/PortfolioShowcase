import { users, games, gameHistory, type User, type InsertUser, type Game, type InsertGame, type GameHistory, type InsertGameHistory } from "@shared/schema";

// Storage interface with CRUD methods
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserStats(userId: number, won: boolean): Promise<User>;
  
  // Game methods
  getGames(): Promise<Game[]>;
  getGame(id: number): Promise<Game | undefined>;
  createGame(game: InsertGame): Promise<Game>;
  
  // Game history methods
  getGameHistory(userId: number): Promise<GameHistory[]>;
  createGameHistory(history: InsertGameHistory): Promise<GameHistory>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private games: Map<number, Game>;
  private gameHistories: Map<number, GameHistory>;
  private userId: number;
  private gameId: number;
  private historyId: number;

  constructor() {
    this.users = new Map();
    this.games = new Map();
    this.gameHistories = new Map();
    this.userId = 1;
    this.gameId = 1;
    this.historyId = 1;
    
    // Initialize with some default games
    this.initDefaultGames();
  }

  private initDefaultGames() {
    const defaultGames: InsertGame[] = [
      {
        name: "Pong",
        description: "Classic table tennis game",
        maxPlayers: 2,
        imageUrl: "pong.svg"
      },
      {
        name: "Tic-Tac-Toe",
        description: "Classic X and O game",
        maxPlayers: 2,
        imageUrl: "tic-tac-toe.svg"
      },
      {
        name: "Snake",
        description: "Classic snake game with multiplayer mode",
        maxPlayers: 2,
        imageUrl: "snake.svg"
      }
    ];
    
    for (const game of defaultGames) {
      this.createGame(game);
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    const user: User = { 
      ...insertUser, 
      id, 
      gamesPlayed: 0, 
      gamesWon: 0 
    };
    this.users.set(id, user);
    return user;
  }

  async updateUserStats(userId: number, won: boolean): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error(`User with id ${userId} not found`);
    }
    
    user.gamesPlayed += 1;
    if (won) {
      user.gamesWon += 1;
    }
    
    this.users.set(userId, user);
    return user;
  }

  async getGames(): Promise<Game[]> {
    return Array.from(this.games.values());
  }

  async getGame(id: number): Promise<Game | undefined> {
    return this.games.get(id);
  }

  async createGame(insertGame: InsertGame): Promise<Game> {
    const id = this.gameId++;
    const game: Game = { ...insertGame, id };
    this.games.set(id, game);
    return game;
  }

  async getGameHistory(userId: number): Promise<GameHistory[]> {
    return Array.from(this.gameHistories.values()).filter(
      (history) => history.playerIds.includes(userId.toString())
    );
  }

  async createGameHistory(insertHistory: InsertGameHistory): Promise<GameHistory> {
    const id = this.historyId++;
    const playedAt = new Date();
    const history: GameHistory = { ...insertHistory, id, playedAt };
    this.gameHistories.set(id, history);
    return history;
  }
}

export const storage = new MemStorage();
