import { useState, useEffect, useRef } from "react";
import { Player } from "@shared/schema";
import PongGame from "@/games/pong";
import TicTacToeGame from "@/games/tic-tac-toe";
import SnakeGame from "@/games/snake";

interface GameBoardProps {
  gameId: number;
  roomId: string;
  gameState: any;
  players: Player[];
  currentUser: { id: number; username: string };
  status: string;
  winner: number | null;
  gameOver: boolean;
  onGameAction: (action: any) => void;
}

export default function GameBoard({
  gameId,
  roomId,
  gameState,
  players,
  currentUser,
  status,
  winner,
  gameOver,
  onGameAction
}: GameBoardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!containerRef.current) return;
    
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerSize({ width, height });
      }
    });
    
    resizeObserver.observe(containerRef.current);
    
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const renderGame = () => {
    if (status !== 'playing' && !gameState) {
      return (
        <div className="flex flex-col items-center justify-center h-64">
          <p className="text-muted-foreground">
            {status === 'waiting' 
              ? 'Waiting for all players to be ready...' 
              : 'Game finished'
            }
          </p>
        </div>
      );
    }
    
    if (!gameState) {
      return (
        <div className="flex flex-col items-center justify-center h-64">
          <p className="text-muted-foreground">Loading game...</p>
        </div>
      );
    }
    
    switch (gameId) {
      case 1:
        return (
          <PongGame 
            gameState={gameState} 
            players={players}
            currentUser={currentUser}
            onGameAction={onGameAction}
            containerSize={containerSize}
          />
        );
      case 2:
        return (
          <TicTacToeGame 
            gameState={gameState} 
            players={players}
            currentUser={currentUser}
            onGameAction={onGameAction}
            containerSize={containerSize}
          />
        );
      case 3:
        return (
          <SnakeGame 
            gameState={gameState} 
            players={players}
            currentUser={currentUser}
            onGameAction={onGameAction}
            containerSize={containerSize}
          />
        );
      default:
        return <div>Unknown game type</div>;
    }
  };

  return (
    <div 
      ref={containerRef}
      className="w-full bg-black rounded-md overflow-hidden"
      style={{ aspectRatio: gameId === 2 ? '1/1' : '4/3' }}
    >
      {renderGame()}
    </div>
  );
}
