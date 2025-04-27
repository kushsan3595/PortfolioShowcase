import { useState, useEffect } from "react";
import { Player } from "@shared/schema";

interface TicTacToeGameProps {
  gameState: any;
  players: Player[];
  currentUser: { id: number; username: string };
  onGameAction: (action: any) => void;
  containerSize: { width: number; height: number };
}

export default function TicTacToeGame({
  gameState,
  players,
  currentUser,
  onGameAction,
  containerSize
}: TicTacToeGameProps) {
  const [board, setBoard] = useState<number[][]>([[0, 0, 0], [0, 0, 0], [0, 0, 0]]);
  const [currentPlayer, setCurrentPlayer] = useState<number>(0);
  const [playerSymbol, setPlayerSymbol] = useState<number>(0);
  const [cellSize, setCellSize] = useState<number>(0);
  
  // Set up the game when gameState is received
  useEffect(() => {
    if (!gameState) return;
    
    setBoard(gameState.board);
    setCurrentPlayer(gameState.currentPlayer);
    setPlayerSymbol(gameState.players[currentUser.id]);
    
    // Calculate cell size based on container width
    setCellSize(containerSize.width / 3);
  }, [gameState, currentUser.id, containerSize]);

  // Handle cell click
  const handleCellClick = (row: number, col: number) => {
    // Check if it's player's turn and the cell is empty
    if (currentPlayer !== currentUser.id || board[row][col] !== 0) {
      return;
    }
    
    // Send move to server
    onGameAction({
      type: 'move',
      row,
      col
    });
  };

  // Render X or O based on cell value
  const renderSymbol = (value: number) => {
    if (value === 0) return null;
    
    const padding = cellSize * 0.2;
    const size = cellSize - (padding * 2);
    
    if (value === 1) { // X
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="red">
          <line x1={padding} y1={padding} x2={cellSize - padding} y2={cellSize - padding} strokeWidth="4" />
          <line x1={cellSize - padding} y1={padding} x2={padding} y2={cellSize - padding} strokeWidth="4" />
        </svg>
      );
    } else { // O
      const centerX = cellSize / 2;
      const centerY = cellSize / 2;
      const radius = (cellSize - (padding * 2)) / 2;
      
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="blue">
          <circle cx={12} cy={12} r={8} strokeWidth="4" />
        </svg>
      );
    }
  };

  // Render the game status
  const renderStatus = () => {
    const isPlayerTurn = currentPlayer === currentUser.id;
    const playerName = isPlayerTurn ? 'Your' : 'Opponent\'s';
    
    return (
      <div className="absolute top-4 left-0 w-full text-center text-white font-bold">
        {playerName} turn
      </div>
    );
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center relative bg-black text-white">
      {renderStatus()}
      
      <div className="grid grid-cols-3 grid-rows-3 gap-1 bg-gray-800">
        {board.map((row, rowIndex) => (
          row.map((cell, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              className="flex items-center justify-center bg-black cursor-pointer hover:bg-gray-900"
              style={{ width: cellSize, height: cellSize }}
              onClick={() => handleCellClick(rowIndex, colIndex)}
            >
              {renderSymbol(cell)}
            </div>
          ))
        ))}
      </div>
      
      <div className="absolute bottom-4 left-0 w-full flex justify-evenly text-white">
        {players.map(player => (
          <div key={player.id} className="flex items-center gap-2">
            <div 
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: gameState?.players[player.id] === 1 ? 'red' : 'blue' }}
            ></div>
            <span>{player.id === currentUser.id ? 'You' : player.displayName}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
