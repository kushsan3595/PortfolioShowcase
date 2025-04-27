import { Server as HttpServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { IStorage } from "./storage";
import { GameRoom, Player } from "@shared/schema";
import { v4 as uuidv4 } from 'uuid';

interface WebSocketWithMetadata extends WebSocket {
  isAlive: boolean;
  userId?: number;
  roomId?: string;
}

interface GameState {
  type: string;
  gameId: number;
  roomId: string;
  state: any;
}

export function setUpWebSocketServer(server: HttpServer, storage: IStorage) {
  console.log("Setting up WebSocket server");
  const wss = new WebSocketServer({ 
    server,
    path: "/ws"
  });
  
  // Store active rooms
  const rooms: Map<string, GameRoom> = new Map();
  // Store game states
  const gameStates: Map<string, GameState> = new Map();
  // Store player connections
  const connections: Map<number, WebSocketWithMetadata> = new Map();
  
  // Ping clients to check if they're still connected
  const interval = setInterval(() => {
    wss.clients.forEach((client) => {
      const ws = client as WebSocketWithMetadata;
      if (ws.isAlive === false) {
        // Handle disconnection
        handleDisconnect(ws);
        return ws.terminate();
      }
      
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);
  
  wss.on('close', () => {
    clearInterval(interval);
  });
  
  wss.on('connection', (ws: WebSocketWithMetadata) => {
    ws.isAlive = true;
    
    ws.on('pong', () => {
      ws.isAlive = true;
    });
    
    ws.on('message', async (message: string) => {
      try {
        const data = JSON.parse(message);
        
        switch (data.type) {
          case 'auth':
            await handleAuth(ws, data);
            break;
            
          case 'create_room':
            await handleCreateRoom(ws, data);
            break;
            
          case 'join_room':
            await handleJoinRoom(ws, data);
            break;
            
          case 'leave_room':
            handleLeaveRoom(ws);
            break;
            
          case 'toggle_ready':
            handleToggleReady(ws);
            break;
            
          case 'game_action':
            handleGameAction(ws, data);
            break;
            
          case 'game_finished':
            await handleGameFinished(ws, data);
            break;
            
          default:
            ws.send(JSON.stringify({ 
              type: 'error', 
              message: 'Unknown message type' 
            }));
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({ 
          type: 'error', 
          message: 'Invalid message format' 
        }));
      }
    });
    
    ws.on('close', () => {
      handleDisconnect(ws);
    });
  });
  
  async function handleAuth(ws: WebSocketWithMetadata, data: any) {
    const userId = data.userId;
    
    if (!userId) {
      return ws.send(JSON.stringify({ 
        type: 'auth_error', 
        message: 'User ID is required' 
      }));
    }
    
    try {
      const user = await storage.getUser(userId);
      
      if (!user) {
        return ws.send(JSON.stringify({ 
          type: 'auth_error', 
          message: 'User not found' 
        }));
      }
      
      // Store user ID and add to connections map
      ws.userId = userId;
      connections.set(userId, ws);
      
      // Send available rooms
      ws.send(JSON.stringify({
        type: 'auth_success',
        rooms: Array.from(rooms.values())
          .filter(room => room.status === 'waiting' && !room.isPrivate)
      }));
    } catch (error) {
      ws.send(JSON.stringify({ 
        type: 'auth_error', 
        message: 'Authentication failed' 
      }));
    }
  }
  
  async function handleCreateRoom(ws: WebSocketWithMetadata, data: any) {
    if (!ws.userId) {
      return ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'Not authenticated' 
      }));
    }
    
    const { gameId, roomName, isPrivate } = data;
    
    if (!gameId || !roomName) {
      return ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'Game ID and room name are required' 
      }));
    }
    
    try {
      const game = await storage.getGame(gameId);
      
      if (!game) {
        return ws.send(JSON.stringify({ 
          type: 'error', 
          message: 'Game not found' 
        }));
      }
      
      const user = await storage.getUser(ws.userId);
      
      if (!user) {
        return ws.send(JSON.stringify({ 
          type: 'error', 
          message: 'User not found' 
        }));
      }
      
      // Create new room
      const roomId = uuidv4();
      const player: Player = {
        id: user.id,
        username: user.username,
        displayName: user.displayName || user.username,
        avatarColor: user.avatarColor || '#' + Math.floor(Math.random()*16777215).toString(16),
        isReady: false
      };
      
      const room: GameRoom = {
        id: roomId,
        gameId,
        name: roomName,
        players: [player],
        maxPlayers: game.maxPlayers,
        isPrivate: isPrivate || false,
        status: 'waiting',
        createdAt: Date.now()
      };
      
      rooms.set(roomId, room);
      ws.roomId = roomId;
      
      // Send room info back to creator
      ws.send(JSON.stringify({ 
        type: 'room_created', 
        room 
      }));
      
      // Broadcast new room to all connected users if not private
      if (!room.isPrivate) {
        broadcastRoomUpdate(room);
      }
    } catch (error) {
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'Failed to create room' 
      }));
    }
  }
  
  async function handleJoinRoom(ws: WebSocketWithMetadata, data: any) {
    if (!ws.userId) {
      return ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'Not authenticated' 
      }));
    }
    
    const { roomId } = data;
    
    if (!roomId) {
      return ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'Room ID is required' 
      }));
    }
    
    try {
      const room = rooms.get(roomId);
      
      if (!room) {
        return ws.send(JSON.stringify({ 
          type: 'error', 
          message: 'Room not found' 
        }));
      }
      
      if (room.status !== 'waiting') {
        return ws.send(JSON.stringify({ 
          type: 'error', 
          message: 'Game already started' 
        }));
      }
      
      if (room.players.length >= room.maxPlayers) {
        return ws.send(JSON.stringify({ 
          type: 'error', 
          message: 'Room is full' 
        }));
      }
      
      // Check if player is already in the room
      if (room.players.some(p => p.id === ws.userId)) {
        return ws.send(JSON.stringify({ 
          type: 'error', 
          message: 'Already in the room' 
        }));
      }
      
      const user = await storage.getUser(ws.userId);
      
      if (!user) {
        return ws.send(JSON.stringify({ 
          type: 'error', 
          message: 'User not found' 
        }));
      }
      
      // Add player to the room
      const player: Player = {
        id: user.id,
        username: user.username,
        displayName: user.displayName || user.username,
        avatarColor: user.avatarColor || '#' + Math.floor(Math.random()*16777215).toString(16),
        isReady: false
      };
      
      room.players.push(player);
      rooms.set(roomId, room);
      ws.roomId = roomId;
      
      // Send room info to the player
      ws.send(JSON.stringify({ 
        type: 'room_joined', 
        room 
      }));
      
      // Broadcast updated room info to all players in the room
      broadcastToRoom(roomId, {
        type: 'player_joined',
        player,
        room
      });
    } catch (error) {
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'Failed to join room' 
      }));
    }
  }
  
  function handleLeaveRoom(ws: WebSocketWithMetadata) {
    if (!ws.userId || !ws.roomId) {
      return ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'Not in a room' 
      }));
    }
    
    const roomId = ws.roomId;
    const room = rooms.get(roomId);
    
    if (!room) {
      ws.roomId = undefined;
      return ws.send(JSON.stringify({ 
        type: 'room_left' 
      }));
    }
    
    // Remove player from the room
    const playerIndex = room.players.findIndex(p => p.id === ws.userId);
    
    if (playerIndex !== -1) {
      const player = room.players[playerIndex];
      room.players.splice(playerIndex, 1);
      
      // If room is empty, remove it
      if (room.players.length === 0) {
        rooms.delete(roomId);
        gameStates.delete(roomId);
        
        // Broadcast room removed to all players
        if (!room.isPrivate) {
          broadcastRoomRemoved(roomId);
        }
      } else {
        // Update room
        rooms.set(roomId, room);
        
        // Broadcast player left to remaining players
        broadcastToRoom(roomId, {
          type: 'player_left',
          playerId: ws.userId,
          room
        });
        
        // Broadcast room update if not private
        if (!room.isPrivate) {
          broadcastRoomUpdate(room);
        }
      }
    }
    
    ws.roomId = undefined;
    ws.send(JSON.stringify({ 
      type: 'room_left' 
    }));
  }
  
  function handleToggleReady(ws: WebSocketWithMetadata) {
    if (!ws.userId || !ws.roomId) {
      return ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'Not in a room' 
      }));
    }
    
    const roomId = ws.roomId;
    const room = rooms.get(roomId);
    
    if (!room) {
      return ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'Room not found' 
      }));
    }
    
    if (room.status !== 'waiting') {
      return ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'Game already started' 
      }));
    }
    
    // Toggle player ready status
    const player = room.players.find(p => p.id === ws.userId);
    
    if (player) {
      player.isReady = !player.isReady;
      rooms.set(roomId, room);
      
      // Broadcast updated player status
      broadcastToRoom(roomId, {
        type: 'player_ready_changed',
        playerId: ws.userId,
        isReady: player.isReady,
        room
      });
      
      // Check if all players are ready and we have enough players
      const allReady = room.players.every(p => p.isReady);
      const enoughPlayers = room.players.length >= 2;
      
      if (allReady && enoughPlayers) {
        // Start the game
        room.status = 'playing';
        rooms.set(roomId, room);
        
        // Initialize game state based on game type
        const gameState: GameState = {
          type: 'game_state',
          gameId: room.gameId,
          roomId,
          state: initializeGameState(room)
        };
        
        gameStates.set(roomId, gameState);
        
        // Broadcast game started
        broadcastToRoom(roomId, {
          type: 'game_started',
          room,
          gameState: gameState.state
        });
        
        // Update room listing for spectators if not private
        if (!room.isPrivate) {
          broadcastRoomUpdate(room);
        }
      }
    }
  }
  
  function handleGameAction(ws: WebSocketWithMetadata, data: any) {
    if (!ws.userId || !ws.roomId) {
      return ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'Not in a room' 
      }));
    }
    
    const roomId = ws.roomId;
    const room = rooms.get(roomId);
    
    if (!room || room.status !== 'playing') {
      return ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'Game not in progress' 
      }));
    }
    
    const gameState = gameStates.get(roomId);
    
    if (!gameState) {
      return ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'Game state not found' 
      }));
    }
    
    // Process game action and update state
    const { action } = data;
    const result = processGameAction(gameState, action, ws.userId);
    
    if (result.error) {
      return ws.send(JSON.stringify({ 
        type: 'error', 
        message: result.error 
      }));
    }
    
    // Update game state
    gameStates.set(roomId, gameState);
    
    // Broadcast updated game state
    broadcastToRoom(roomId, {
      type: 'game_update',
      gameState: gameState.state
    });
    
    // Check if game is over
    if (result.gameOver) {
      room.status = 'finished';
      rooms.set(roomId, room);
      
      // Broadcast game over
      broadcastToRoom(roomId, {
        type: 'game_over',
        winner: result.winner,
        gameState: gameState.state
      });
      
      // Update room listing for spectators if not private
      if (!room.isPrivate) {
        broadcastRoomUpdate(room);
      }
    }
  }
  
  async function handleGameFinished(ws: WebSocketWithMetadata, data: any) {
    if (!ws.userId || !ws.roomId) {
      return ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'Not in a room' 
      }));
    }
    
    const roomId = ws.roomId;
    const room = rooms.get(roomId);
    
    if (!room || room.status !== 'finished') {
      return ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'Game not finished' 
      }));
    }
    
    const { winnerId, score } = data;
    
    // Record game history
    try {
      await storage.createGameHistory({
        gameId: room.gameId,
        winnerId,
        playerIds: room.players.map(p => p.id.toString()),
        score: JSON.stringify(score)
      });
      
      // Reset room to waiting state
      room.status = 'waiting';
      room.players.forEach(p => p.isReady = false);
      rooms.set(roomId, room);
      
      // Broadcast room reset
      broadcastToRoom(roomId, {
        type: 'room_reset',
        room
      });
      
      // Update room listing for spectators if not private
      if (!room.isPrivate) {
        broadcastRoomUpdate(room);
      }
    } catch (error) {
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'Failed to record game history' 
      }));
    }
  }
  
  function handleDisconnect(ws: WebSocketWithMetadata) {
    if (ws.userId) {
      // Remove from connections map
      connections.delete(ws.userId);
      
      // Leave any room the player is in
      if (ws.roomId) {
        handleLeaveRoom(ws);
      }
    }
  }
  
  function broadcastToRoom(roomId: string, message: any) {
    const room = rooms.get(roomId);
    
    if (!room) return;
    
    room.players.forEach(player => {
      const connection = connections.get(player.id);
      
      if (connection && connection.readyState === WebSocket.OPEN) {
        connection.send(JSON.stringify(message));
      }
    });
  }
  
  function broadcastRoomUpdate(room: GameRoom) {
    // Send room update to all connected clients for lobby view
    const message = {
      type: 'room_updated',
      room
    };
    
    connections.forEach(conn => {
      if (conn.readyState === WebSocket.OPEN && !conn.roomId) {
        conn.send(JSON.stringify(message));
      }
    });
  }
  
  function broadcastRoomRemoved(roomId: string) {
    // Send room removal to all connected clients for lobby view
    const message = {
      type: 'room_removed',
      roomId
    };
    
    connections.forEach(conn => {
      if (conn.readyState === WebSocket.OPEN && !conn.roomId) {
        conn.send(JSON.stringify(message));
      }
    });
  }
  
  function initializeGameState(room: GameRoom): any {
    // Initialize game state based on game type
    switch (room.gameId) {
      case 1: // Pong
        return initializePongState(room);
        
      case 2: // Tic-Tac-Toe
        return initializeTicTacToeState(room);
        
      case 3: // Snake
        return initializeSnakeState(room);
        
      default:
        return {};
    }
  }
  
  function initializePongState(room: GameRoom): any {
    const width = 800;
    const height = 600;
    const paddleWidth = 15;
    const paddleHeight = 100;
    const ballSize = 15;
    
    return {
      width,
      height,
      paddles: [
        {
          x: 50,
          y: height / 2 - paddleHeight / 2,
          width: paddleWidth,
          height: paddleHeight,
          playerId: room.players[0].id
        },
        {
          x: width - 50 - paddleWidth,
          y: height / 2 - paddleHeight / 2,
          width: paddleWidth,
          height: paddleHeight,
          playerId: room.players[1]?.id || 0
        }
      ],
      ball: {
        x: width / 2 - ballSize / 2,
        y: height / 2 - ballSize / 2,
        width: ballSize,
        height: ballSize,
        speedX: 7,
        speedY: 7
      },
      scores: {
        [room.players[0].id]: 0,
        [room.players[1]?.id || 0]: 0
      }
    };
  }
  
  function initializeTicTacToeState(room: GameRoom): any {
    return {
      board: [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0]
      ],
      currentPlayer: room.players[0].id,
      players: {
        [room.players[0].id]: 1, // X
        [room.players[1]?.id || 0]: 2 // O
      }
    };
  }
  
  function initializeSnakeState(room: GameRoom): any {
    const width = 600;
    const height = 600;
    const gridSize = 20;
    
    return {
      width,
      height,
      gridSize,
      snakes: [
        {
          playerId: room.players[0].id,
          body: [
            { x: 5, y: 5 },
            { x: 4, y: 5 },
            { x: 3, y: 5 }
          ],
          direction: 'right',
          alive: true
        },
        {
          playerId: room.players[1]?.id || 0,
          body: [
            { x: 25, y: 25 },
            { x: 26, y: 25 },
            { x: 27, y: 25 }
          ],
          direction: 'left',
          alive: true
        }
      ],
      food: {
        x: 15,
        y: 15
      },
      scores: {
        [room.players[0].id]: 0,
        [room.players[1]?.id || 0]: 0
      }
    };
  }
  
  function processGameAction(gameState: GameState, action: any, playerId: number): any {
    // Process game action based on game type
    switch (gameState.gameId) {
      case 1: // Pong
        return processPongAction(gameState, action, playerId);
        
      case 2: // Tic-Tac-Toe
        return processTicTacToeAction(gameState, action, playerId);
        
      case 3: // Snake
        return processSnakeAction(gameState, action, playerId);
        
      default:
        return { error: 'Unknown game type' };
    }
  }
  
  function processPongAction(gameState: GameState, action: any, playerId: number): any {
    const state = gameState.state;
    const paddle = state.paddles.find((p: any) => p.playerId === playerId);
    
    if (!paddle) {
      return { error: 'Player not found' };
    }
    
    // Process paddle movement
    if (action.type === 'move') {
      paddle.y += action.direction === 'up' ? -10 : 10;
      
      // Enforce boundaries
      if (paddle.y < 0) paddle.y = 0;
      if (paddle.y + paddle.height > state.height) {
        paddle.y = state.height - paddle.height;
      }
    }
    
    // If host player, also update ball position
    if (playerId === state.paddles[0].playerId) {
      if (action.type === 'ball_update') {
        state.ball.x = action.x;
        state.ball.y = action.y;
        state.ball.speedX = action.speedX;
        state.ball.speedY = action.speedY;
        state.scores = action.scores;
        
        // Check for game over
        const maxScore = 5;
        const player1Score = state.scores[state.paddles[0].playerId];
        const player2Score = state.scores[state.paddles[1].playerId];
        
        if (player1Score >= maxScore || player2Score >= maxScore) {
          return {
            gameOver: true,
            winner: player1Score > player2Score ? state.paddles[0].playerId : state.paddles[1].playerId
          };
        }
      }
    }
    
    return { success: true };
  }
  
  function processTicTacToeAction(gameState: GameState, action: any, playerId: number): any {
    const state = gameState.state;
    
    // Check if it's the player's turn
    if (state.currentPlayer !== playerId) {
      return { error: 'Not your turn' };
    }
    
    // Process move
    if (action.type === 'move') {
      const { row, col } = action;
      
      // Check if cell is empty
      if (state.board[row][col] !== 0) {
        return { error: 'Cell already occupied' };
      }
      
      // Place the piece
      state.board[row][col] = state.players[playerId];
      
      // Switch players
      const playerIds = Object.keys(state.players).map(Number);
      state.currentPlayer = playerIds.find(id => id !== playerId) || 0;
      
      // Check for win or draw
      const result = checkTicTacToeResult(state.board);
      
      if (result.gameOver) {
        let winner = null;
        
        if (result.winner) {
          // Find player with the winning piece
          winner = Object.entries(state.players).find(
            ([id, piece]) => piece === result.winner
          )?.[0];
        }
        
        return {
          gameOver: true,
          winner: winner ? parseInt(winner) : null
        };
      }
    }
    
    return { success: true };
  }
  
  function checkTicTacToeResult(board: number[][]): any {
    // Check rows
    for (let i = 0; i < 3; i++) {
      if (board[i][0] !== 0 && board[i][0] === board[i][1] && board[i][1] === board[i][2]) {
        return { gameOver: true, winner: board[i][0] };
      }
    }
    
    // Check columns
    for (let i = 0; i < 3; i++) {
      if (board[0][i] !== 0 && board[0][i] === board[1][i] && board[1][i] === board[2][i]) {
        return { gameOver: true, winner: board[0][i] };
      }
    }
    
    // Check diagonals
    if (board[0][0] !== 0 && board[0][0] === board[1][1] && board[1][1] === board[2][2]) {
      return { gameOver: true, winner: board[0][0] };
    }
    
    if (board[0][2] !== 0 && board[0][2] === board[1][1] && board[1][1] === board[2][0]) {
      return { gameOver: true, winner: board[0][2] };
    }
    
    // Check for draw
    let draw = true;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (board[i][j] === 0) {
          draw = false;
          break;
        }
      }
      if (!draw) break;
    }
    
    if (draw) {
      return { gameOver: true, winner: null };
    }
    
    return { gameOver: false };
  }
  
  function processSnakeAction(gameState: GameState, action: any, playerId: number): any {
    const state = gameState.state;
    const snake = state.snakes.find((s: any) => s.playerId === playerId);
    
    if (!snake) {
      return { error: 'Player not found' };
    }
    
    if (!snake.alive) {
      return { error: 'Snake is dead' };
    }
    
    // Process direction change
    if (action.type === 'change_direction') {
      const currentDirection = snake.direction;
      const newDirection = action.direction;
      
      // Prevent 180 degree turns
      if (
        (currentDirection === 'up' && newDirection === 'down') ||
        (currentDirection === 'down' && newDirection === 'up') ||
        (currentDirection === 'left' && newDirection === 'right') ||
        (currentDirection === 'right' && newDirection === 'left')
      ) {
        return { success: true };
      }
      
      snake.direction = newDirection;
    }
    
    // If host player, also update snake positions and check collisions
    if (playerId === state.snakes[0].playerId) {
      if (action.type === 'update') {
        state.snakes = action.snakes;
        state.food = action.food;
        state.scores = action.scores;
        
        // Check for game over
        const alivePlayers = state.snakes.filter((s: any) => s.alive);
        
        if (alivePlayers.length <= 1 && state.snakes.length > 1) {
          const winnerSnake = alivePlayers[0];
          return {
            gameOver: true,
            winner: winnerSnake ? winnerSnake.playerId : null
          };
        }
        
        // Alternative win condition: first to score 10
        const maxScore = 10;
        for (const snake of state.snakes) {
          if (state.scores[snake.playerId] >= maxScore) {
            return {
              gameOver: true,
              winner: snake.playerId
            };
          }
        }
      }
    }
    
    return { success: true };
  }
}
