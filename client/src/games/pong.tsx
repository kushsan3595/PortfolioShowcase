import { useEffect, useRef, useState } from "react";
import { Player } from "@shared/schema";

interface PongGameProps {
  gameState: any;
  players: Player[];
  currentUser: { id: number; username: string };
  onGameAction: (action: any) => void;
  containerSize: { width: number; height: number };
}

export default function PongGame({ 
  gameState, 
  players, 
  currentUser, 
  onGameAction, 
  containerSize 
}: PongGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [localGameState, setLocalGameState] = useState<any>(gameState);
  const [scale, setScale] = useState(1);
  const requestRef = useRef<number>();
  
  // Create a reference to the player's paddle
  const playerPaddle = localGameState?.paddles.find((p: any) => p.playerId === currentUser.id);
  const opponentPaddle = localGameState?.paddles.find((p: any) => p.playerId !== currentUser.id);
  
  // Calculate scale factor for responsive canvas
  useEffect(() => {
    if (!gameState || !containerSize.width) return;
    
    const scaleX = containerSize.width / gameState.width;
    setScale(scaleX);
  }, [gameState, containerSize]);

  // Update local game state when received from server
  useEffect(() => {
    if (gameState) {
      setLocalGameState(gameState);
    }
  }, [gameState]);
  
  // Handle key press for paddle movement
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') {
        onGameAction({ type: 'move', direction: 'up' });
      } else if (e.key === 'ArrowDown') {
        onGameAction({ type: 'move', direction: 'down' });
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onGameAction]);

  // Main game loop
  useEffect(() => {
    if (!canvasRef.current || !localGameState) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw middle line
    ctx.strokeStyle = 'white';
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Draw paddles
    ctx.fillStyle = 'white';
    localGameState.paddles.forEach((paddle: any) => {
      ctx.fillRect(
        paddle.x * scale, 
        paddle.y * scale, 
        paddle.width * scale, 
        paddle.height * scale
      );
    });
    
    // Draw ball
    const ball = localGameState.ball;
    ctx.fillRect(
      ball.x * scale, 
      ball.y * scale, 
      ball.width * scale, 
      ball.height * scale
    );
    
    // Draw scores
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    
    // Draw player score
    const playerScore = localGameState.scores[currentUser.id] || 0;
    ctx.fillText(
      playerScore.toString(), 
      canvas.width / 4, 
      60
    );
    
    // Draw opponent score
    const opponentId = players.find(p => p.id !== currentUser.id)?.id || 0;
    const opponentScore = localGameState.scores[opponentId] || 0;
    ctx.fillText(
      opponentScore.toString(), 
      3 * canvas.width / 4, 
      60
    );
    
    // If host player, update ball position
    if (playerPaddle && localGameState.paddles[0].playerId === currentUser.id) {
      // Ball movement
      let newBallX = ball.x + ball.speedX;
      let newBallY = ball.y + ball.speedY;
      let newSpeedX = ball.speedX;
      let newSpeedY = ball.speedY;
      
      // Ball collision with top and bottom
      if (newBallY <= 0 || newBallY + ball.height >= localGameState.height) {
        newSpeedY *= -1;
      }
      
      // Ball collision with paddles
      localGameState.paddles.forEach((paddle: any) => {
        if (
          newBallX <= paddle.x + paddle.width &&
          newBallX + ball.width >= paddle.x &&
          newBallY <= paddle.y + paddle.height &&
          newBallY + ball.height >= paddle.y
        ) {
          newSpeedX *= -1;
          
          // Adjust ball position to prevent multiple collisions
          if (newSpeedX > 0) {
            newBallX = paddle.x + paddle.width;
          } else {
            newBallX = paddle.x - ball.width;
          }
        }
      });
      
      // Ball out of bounds
      const scores = { ...localGameState.scores };
      let resetBall = false;
      
      if (newBallX <= 0) {
        // Right player scores
        scores[localGameState.paddles[1].playerId] = (scores[localGameState.paddles[1].playerId] || 0) + 1;
        resetBall = true;
      } else if (newBallX + ball.width >= localGameState.width) {
        // Left player scores
        scores[localGameState.paddles[0].playerId] = (scores[localGameState.paddles[0].playerId] || 0) + 1;
        resetBall = true;
      }
      
      if (resetBall) {
        newBallX = localGameState.width / 2 - ball.width / 2;
        newBallY = localGameState.height / 2 - ball.height / 2;
        newSpeedX *= -1;
      }
      
      // Update ball position
      const updatedBall = {
        ...ball,
        x: newBallX,
        y: newBallY,
        speedX: newSpeedX,
        speedY: newSpeedY
      };
      
      // Update local game state
      setLocalGameState(prevState => ({
        ...prevState,
        ball: updatedBall,
        scores
      }));
      
      // Send ball update to server
      onGameAction({
        type: 'ball_update',
        x: newBallX,
        y: newBallY,
        speedX: newSpeedX,
        speedY: newSpeedY,
        scores
      });
    }
  }, [localGameState, players, currentUser.id, scale, onGameAction, playerPaddle]);

  // Animation loop
  useEffect(() => {
    const animate = () => {
      requestRef.current = requestAnimationFrame(animate);
    };
    
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, []);

  if (!localGameState) {
    return <div>Loading Pong game...</div>;
  }

  return (
    <canvas
      ref={canvasRef}
      width={localGameState.width * scale}
      height={localGameState.height * scale}
      className="w-full h-full"
    />
  );
}
