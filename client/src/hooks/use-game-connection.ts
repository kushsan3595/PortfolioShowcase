import { useState, useEffect, useCallback, useRef } from 'react';
import { GameRoom, Player } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';

interface UseGameConnectionProps {
  user: { id: number; username: string };
  roomId: string;
}

export default function useGameConnection({ user, roomId }: UseGameConnectionProps) {
  const { toast } = useToast();
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [gameState, setGameState] = useState<any>(null);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<number | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Connect to WebSocket server
  const connectWebSocket = useCallback(() => {
    if (socket && socket.readyState === WebSocket.OPEN) return;
    
    setIsReconnecting(true);
    
    // Determine WebSocket URL (using relative path with current protocol)
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;
    
    console.log('Connecting to WebSocket at:', wsUrl);
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsReconnecting(false);
      
      // Authenticate
      ws.send(JSON.stringify({
        type: 'auth',
        userId: user.id
      }));
      
      // Join room if roomId is provided
      if (roomId) {
        ws.send(JSON.stringify({
          type: 'join_room',
          roomId
        }));
      }
    };
    
    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setSocket(null);
      
      // Try to reconnect after a delay
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log('Attempting to reconnect...');
        connectWebSocket();
      }, 2000); // 2 seconds delay
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      toast({
        title: "Connection Error",
        description: "Failed to connect to game server. Trying to reconnect...",
        variant: "destructive"
      });
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('WebSocket message:', data);
        
        switch (data.type) {
          case 'room_joined':
          case 'player_joined':
          case 'player_left':
          case 'player_ready_changed':
          case 'room_reset':
            setRoom(data.room);
            setGameOver(false);
            setWinner(null);
            break;
            
          case 'game_started':
            setRoom(data.room);
            setGameState(data.gameState);
            setGameOver(false);
            setWinner(null);
            break;
            
          case 'game_update':
            setGameState(data.gameState);
            break;
            
          case 'game_over':
            setGameOver(true);
            setWinner(data.winner);
            break;
            
          case 'error':
            toast({
              title: "Error",
              description: data.message,
              variant: "destructive"
            });
            break;
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    setSocket(ws);
  }, [user.id, roomId, socket, toast]);
  
  // Connect to WebSocket on component mount
  useEffect(() => {
    connectWebSocket();
    
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (socket) {
        socket.close();
      }
    };
  }, [connectWebSocket]);
  
  // Send game action to server
  const sendGameAction = useCallback((action: any) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      toast({
        title: "Connection Error",
        description: "Not connected to game server. Trying to reconnect...",
        variant: "destructive"
      });
      connectWebSocket();
      return;
    }
    
    socket.send(JSON.stringify({
      type: 'game_action',
      action
    }));
  }, [socket, toast, connectWebSocket]);
  
  // Toggle player ready status
  const toggleReady = useCallback(() => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      toast({
        title: "Connection Error",
        description: "Not connected to game server. Trying to reconnect...",
        variant: "destructive"
      });
      connectWebSocket();
      return;
    }
    
    socket.send(JSON.stringify({
      type: 'toggle_ready'
    }));
  }, [socket, toast, connectWebSocket]);
  
  // Leave room
  const leaveRoom = useCallback(() => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }
    
    socket.send(JSON.stringify({
      type: 'leave_room'
    }));
  }, [socket]);
  
  return {
    socket,
    room,
    gameState,
    gameOver,
    winner,
    isReconnecting,
    sendGameAction,
    toggleReady,
    leaveRoom
  };
}
