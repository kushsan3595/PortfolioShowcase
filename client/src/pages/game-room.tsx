import { useCallback, useEffect, useState } from "react";
import { User, GameRoom as GameRoomType, Player } from "@shared/schema";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Gamepad, Users, X, Play, Clock } from "lucide-react";
import GameBoard from "@/components/game-board";
import { games } from "@/lib/game-utils";
import useGameConnection from "@/hooks/use-game-connection";

interface GameRoomProps {
  user: User;
  roomId: string;
  onLogout: () => Promise<void>;
}

export default function GameRoomPage({ user, roomId, onLogout }: GameRoomProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const {
    socket,
    room,
    gameState,
    gameOver,
    winner,
    isReconnecting,
    sendGameAction,
    toggleReady,
    leaveRoom
  } = useGameConnection({ user, roomId });

  const handleLeaveRoom = useCallback(() => {
    leaveRoom();
    setLocation('/lobby');
  }, [leaveRoom, setLocation]);

  // Handle keyboard events for games
  useEffect(() => {
    if (!room || room.status !== 'playing') return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!gameState) return;
      
      // Different handling based on game type
      switch (room.gameId) {
        case 1: // Pong
          if (e.key === 'ArrowUp') {
            sendGameAction({ type: 'move', direction: 'up' });
          } else if (e.key === 'ArrowDown') {
            sendGameAction({ type: 'move', direction: 'down' });
          }
          break;
          
        case 3: // Snake
          if (e.key === 'ArrowUp') {
            sendGameAction({ type: 'change_direction', direction: 'up' });
          } else if (e.key === 'ArrowDown') {
            sendGameAction({ type: 'change_direction', direction: 'down' });
          } else if (e.key === 'ArrowLeft') {
            sendGameAction({ type: 'change_direction', direction: 'left' });
          } else if (e.key === 'ArrowRight') {
            sendGameAction({ type: 'change_direction', direction: 'right' });
          }
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [room, gameState, sendGameAction]);

  const renderPlayerStatus = (player: Player) => {
    const isCurrentUser = player.id === user.id;
    
    return (
      <div key={player.id} className={`flex items-center justify-between p-3 rounded-md ${isCurrentUser ? 'bg-primary/10' : 'bg-secondary/20'}`}>
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
            style={{ backgroundColor: player.avatarColor || '#4f46e5', color: 'white' }}
          >
            {(player.displayName || player.username).charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-medium">{player.displayName || player.username}</p>
            <p className="text-xs text-muted-foreground">
              {isCurrentUser ? 'You' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {room?.status === 'waiting' ? (
            player.isReady ? (
              <span className="px-2 py-1 bg-green-500/20 text-green-500 text-xs font-medium rounded-full">Ready</span>
            ) : (
              <span className="px-2 py-1 bg-amber-500/20 text-amber-500 text-xs font-medium rounded-full">Not Ready</span>
            )
          ) : room?.status === 'playing' ? (
            <span className="px-2 py-1 bg-blue-500/20 text-blue-500 text-xs font-medium rounded-full">Playing</span>
          ) : (
            <span className="px-2 py-1 bg-purple-500/20 text-purple-500 text-xs font-medium rounded-full">Finished</span>
          )}
        </div>
      </div>
    );
  };

  const renderRoomInfo = () => {
    if (!room) {
      return <div>Loading room information...</div>;
    }
    
    const game = games.find(g => g.id === room.gameId);
    
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">{room.name}</h2>
          {game && (
            <div className="flex items-center gap-2 px-3 py-1 bg-secondary/20 rounded-md">
              <div className="text-primary w-5 h-5" dangerouslySetInnerHTML={{ __html: game.svgIcon }} />
              <span className="text-sm font-medium">{game.name}</span>
            </div>
          )}
        </div>
        
        <div className="p-4 border border-border rounded-md mb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-muted-foreground" />
              <span className="font-medium">Players ({room.players.length}/{room.maxPlayers})</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {new Date(room.createdAt).toLocaleTimeString()}
              </span>
            </div>
          </div>
          
          <div className="space-y-2">
            {room.players.map(player => renderPlayerStatus(player))}
          </div>
        </div>
        
        {room.status === 'waiting' && (
          <div className="flex flex-col gap-3">
            <Button 
              onClick={toggleReady}
              variant={isPlayerReady() ? "outline" : "default"}
              className={isPlayerReady() ? "border-green-500 text-green-500" : ""}
            >
              {isPlayerReady() ? "Cancel Ready" : "Ready to Play"}
            </Button>
            <Button variant="outline" onClick={handleLeaveRoom} className="border-red-500 text-red-500">
              <X className="w-4 h-4 mr-2" />
              Leave Room
            </Button>
          </div>
        )}
        
        {room.status === 'playing' && (
          <div className="p-4 border border-border rounded-md mb-4 bg-secondary/10">
            <p className="text-center text-sm text-muted-foreground">
              Game in progress
            </p>
          </div>
        )}
        
        {room.status === 'finished' && (
          <div className="flex flex-col gap-3">
            <Button variant="outline" onClick={toggleReady}>
              <Play className="w-4 h-4 mr-2" />
              Play Again
            </Button>
            <Button variant="outline" onClick={handleLeaveRoom} className="border-red-500 text-red-500">
              <X className="w-4 h-4 mr-2" />
              Leave Room
            </Button>
          </div>
        )}
      </div>
    );
  };

  const isPlayerReady = () => {
    if (!room) return false;
    const player = room.players.find(p => p.id === user.id);
    return player?.isReady || false;
  };

  const getGameInstructions = () => {
    if (!room) return "";
    
    switch (room.gameId) {
      case 1: // Pong
        return "Use up and down arrow keys to move your paddle";
      case 2: // Tic-Tac-Toe
        return "Click on a cell to place your mark";
      case 3: // Snake
        return "Use arrow keys to control your snake. Eat food to grow. Avoid collisions.";
      default:
        return "";
    }
  };

  return (
    <div className="bg-background min-h-screen">
      <header className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Gamepad className="w-8 h-8 text-primary" />
              <span className="text-xl font-bold">Gaming Hub</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/lobby">
                <Button variant="outline">Game Lobby</Button>
              </Link>
              <Button variant="ghost" onClick={onLogout}>Logout</Button>
            </div>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="ghost" onClick={handleLeaveRoom} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Lobby</span>
          </Button>
        </div>

        {isReconnecting ? (
          <div className="flex flex-col items-center justify-center h-64">
            <Gamepad className="w-12 h-12 text-muted-foreground mb-4 animate-pulse" />
            <p>Reconnecting to game room...</p>
          </div>
        ) : !room ? (
          <div className="flex flex-col items-center justify-center h-64">
            <Gamepad className="w-12 h-12 text-muted-foreground mb-4" />
            <p>Loading game room...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Game</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-3 p-2 bg-secondary/10 rounded-md text-sm text-center text-muted-foreground">
                    {getGameInstructions()}
                  </div>
                  
                  <GameBoard 
                    gameId={room.gameId}
                    roomId={room.id}
                    gameState={gameState}
                    players={room.players}
                    currentUser={user}
                    status={room.status}
                    winner={winner}
                    gameOver={gameOver}
                    onGameAction={sendGameAction}
                  />
                  
                  {gameOver && (
                    <div className="mt-4 p-4 rounded-md bg-secondary/10 text-center">
                      <h3 className="text-xl font-bold mb-2">
                        {winner === user.id ? "You Won! 🎉" : winner ? "You Lost!" : "It's a Draw!"}
                      </h3>
                      <p className="text-muted-foreground">
                        {winner === user.id 
                          ? "Congratulations on your victory!" 
                          : winner 
                            ? "Better luck next time!" 
                            : "No winner this time!"}
                      </p>
                      <Button className="mt-4" onClick={toggleReady}>
                        Play Again
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Room Info</CardTitle>
                </CardHeader>
                <CardContent>
                  {renderRoomInfo()}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
