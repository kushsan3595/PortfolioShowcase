import { useEffect, useRef, useState } from "react";
import { Player } from "@shared/schema";

interface SnakeGameProps {
  gameState: any;
  players: Player[];
  currentUser: { id: number; username: string };
  onGameAction: (action: any) => void;
  containerSize: { width: number; height: number };
}

interface Point {
  x: number;
  y: number;
}

export default function SnakeGame({
  gameState,
  players,
  currentUser,
  onGameAction,
  containerSize
}: SnakeGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [localGameState, setLocalGameState] = useState<any>(gameState);
  const [scale, setScale] = useState(1);
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(0);
  const requestRef = useRef<number>();
  
  // Get player's snake
  const playerSnake = localGameState?.snakes.find((s: any) => s.playerId === currentUser.id);
  
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
  
  // Handle key press for snake direction
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      let direction;
      
      switch (e.key) {
        case 'ArrowUp':
          direction = 'up';
          break;
        case 'ArrowDown':
          direction = 'down';
          break;
        case 'ArrowLeft':
          direction = 'left';
          break;
        case 'ArrowRight':
          direction = 'right';
          break;
        default:
          return;
      }
      
      onGameAction({ type: 'change_direction', direction });
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
    
    const gridSize = localGameState.gridSize * scale;
    
    // Draw grid lines (optional)
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    
    // Vertical lines
    for (let x = 0; x <= localGameState.width; x += localGameState.gridSize) {
      ctx.beginPath();
      ctx.moveTo(x * scale, 0);
      ctx.lineTo(x * scale, canvas.height);
      ctx.stroke();
    }
    
    // Horizontal lines
    for (let y = 0; y <= localGameState.height; y += localGameState.gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y * scale);
      ctx.lineTo(canvas.width, y * scale);
      ctx.stroke();
    }
    
    // Draw food
    const food = localGameState.food;
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(
      food.x * scale, 
      food.y * scale, 
      gridSize, 
      gridSize
    );
    
    // Draw snakes
    localGameState.snakes.forEach((snake: any, index: number) => {
      // Different color for each snake
      ctx.fillStyle = index === 0 ? '#00FF00' : '#0000FF';
      
      if (!snake.alive) {
        ctx.fillStyle = '#999999'; // Gray color for dead snakes
      }
      
      // Draw each segment of the snake
      snake.body.forEach((segment: Point) => {
        ctx.fillRect(
          segment.x * scale, 
          segment.y * scale, 
          gridSize, 
          gridSize
        );
      });
      
      // Draw eyes (optional, for fun)
      if (snake.body.length > 0) {
        const head = snake.body[0];
        const eyeSize = gridSize / 4;
        ctx.fillStyle = 'white';
        
        // Different eye positions based on direction
        if (snake.direction === 'right') {
          ctx.fillRect((head.x + 0.7) * scale, (head.y + 0.2) * scale, eyeSize, eyeSize);
          ctx.fillRect((head.x + 0.7) * scale, (head.y + 0.6) * scale, eyeSize, eyeSize);
        } else if (snake.direction === 'left') {
          ctx.fillRect((head.x + 0.1) * scale, (head.y + 0.2) * scale, eyeSize, eyeSize);
          ctx.fillRect((head.x + 0.1) * scale, (head.y + 0.6) * scale, eyeSize, eyeSize);
        } else if (snake.direction === 'up') {
          ctx.fillRect((head.x + 0.2) * scale, (head.y + 0.1) * scale, eyeSize, eyeSize);
          ctx.fillRect((head.x + 0.6) * scale, (head.y + 0.1) * scale, eyeSize, eyeSize);
        } else if (snake.direction === 'down') {
          ctx.fillRect((head.x + 0.2) * scale, (head.y + 0.7) * scale, eyeSize, eyeSize);
          ctx.fillRect((head.x + 0.6) * scale, (head.y + 0.7) * scale, eyeSize, eyeSize);
        }
      }
    });
    
    // Draw scores
    ctx.font = '16px Arial';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'left';
    
    players.forEach((player, index) => {
      const score = localGameState.scores[player.id] || 0;
      ctx.fillText(
        `${player.id === currentUser.id ? 'You' : player.displayName}: ${score}`,
        10,
        20 + (index * 20)
      );
    });
    
    // If host player, update snake positions
    if (playerSnake && localGameState.snakes[0].playerId === currentUser.id) {
      const now = Date.now();
      
      // Only update game state every 150ms (snake speed)
      if (now - lastUpdateTime > 150) {
        setLastUpdateTime(now);
        
        // Deep copy snakes to avoid direct mutation
        const updatedSnakes = JSON.parse(JSON.stringify(localGameState.snakes));
        let updatedFood = { ...localGameState.food };
        const scores = { ...localGameState.scores };
        
        // Update each snake
        updatedSnakes.forEach((snake: any) => {
          if (!snake.alive) return;
          
          // Get head position
          const head = { ...snake.body[0] };
          
          // Calculate new head position based on direction
          let newHead;
          switch (snake.direction) {
            case 'up':
              newHead = { x: head.x, y: head.y - 1 };
              break;
            case 'down':
              newHead = { x: head.x, y: head.y + 1 };
              break;
            case 'left':
              newHead = { x: head.x - 1, y: head.y };
              break;
            case 'right':
              newHead = { x: head.x + 1, y: head.y };
              break;
            default:
              newHead = { ...head };
          }
          
          // Check if snake eats food
          const eatsFood = newHead.x === updatedFood.x && newHead.y === updatedFood.y;
          
          // Check for wall collision
          if (
            newHead.x < 0 || 
            newHead.x >= localGameState.width / localGameState.gridSize ||
            newHead.y < 0 || 
            newHead.y >= localGameState.height / localGameState.gridSize
          ) {
            snake.alive = false;
            return;
          }
          
          // Check for self collision
          if (snake.body.some((segment: Point) => segment.x === newHead.x && segment.y === newHead.y)) {
            snake.alive = false;
            return;
          }
          
          // Check for collision with other snakes
          for (const otherSnake of updatedSnakes) {
            if (otherSnake === snake) continue;
            
            if (otherSnake.body.some((segment: Point) => segment.x === newHead.x && segment.y === newHead.y)) {
              snake.alive = false;
              return;
            }
          }
          
          // Move snake: add new head
          snake.body.unshift(newHead);
          
          // If snake eats food, generate new food and increase score
          if (eatsFood) {
            scores[snake.playerId] = (scores[snake.playerId] || 0) + 1;
            
            // Generate new food position
            let foodX, foodY;
            let validPosition = false;
            
            while (!validPosition) {
              foodX = Math.floor(Math.random() * (localGameState.width / localGameState.gridSize));
              foodY = Math.floor(Math.random() * (localGameState.height / localGameState.gridSize));
              
              // Check if new food position doesn't overlap with any snake
              validPosition = true;
              for (const s of updatedSnakes) {
                if (s.body.some((segment: Point) => segment.x === foodX && segment.y === foodY)) {
                  validPosition = false;
                  break;
                }
              }
            }
            
            updatedFood = { x: foodX, y: foodY };
          } else {
            // Remove tail only if food wasn't eaten
            snake.body.pop();
          }
        });
        
        // Update local game state
        setLocalGameState(prevState => ({
          ...prevState,
          snakes: updatedSnakes,
          food: updatedFood,
          scores
        }));
        
        // Send update to server
        onGameAction({
          type: 'update',
          snakes: updatedSnakes,
          food: updatedFood,
          scores
        });
      }
    }
  }, [localGameState, players, currentUser.id, scale, onGameAction, playerSnake, lastUpdateTime]);
  
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
    return <div>Loading Snake game...</div>;
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
