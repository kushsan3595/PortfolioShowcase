import { User, GameRoom } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Gamepad, Plus, RefreshCcw, Users, ArrowRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { games } from "@/lib/game-utils";
import { useLocation } from "wouter";
import GameCard from "@/components/game-card";

interface LobbyProps {
  user: User;
  onLogout: () => Promise<void>;
}

export default function Lobby({ user, onLogout }: LobbyProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [gameRooms, setGameRooms] = useState<GameRoom[]>([]);
  const [newRoomData, setNewRoomData] = useState({
    gameId: "1",
    roomName: "",
    isPrivate: false
  });
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: gamesData } = useQuery({
    queryKey: ['/api/games'],
  });

  const connectWebSocket = useCallback(() => {
    if (socket && socket.readyState === WebSocket.OPEN) return;
    
    setIsConnecting(true);
    
    // Determine WebSocket URL (using relative path with current protocol)
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnecting(false);
      // Authenticate
      ws.send(JSON.stringify({
        type: 'auth',
        userId: user.id
      }));
    };
    
    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setSocket(null);
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      toast({
        title: "Connection Error",
        description: "Failed to connect to game server. Please try again.",
        variant: "destructive"
      });
      setIsConnecting(false);
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('WebSocket message:', data);
        
        switch (data.type) {
          case 'auth_success':
            setGameRooms(data.rooms || []);
            break;
            
          case 'room_created':
            setIsCreateDialogOpen(false);
            setLocation(`/game/${data.room.id}`);
            break;
            
          case 'error':
          case 'auth_error':
            toast({
              title: "Error",
              description: data.message,
              variant: "destructive"
            });
            break;
            
          case 'room_updated':
            updateRoom(data.room);
            break;
            
          case 'room_removed':
            removeRoom(data.roomId);
            break;
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    setSocket(ws);
  }, [user.id, socket, toast, setLocation]);

  useEffect(() => {
    connectWebSocket();
    
    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, [connectWebSocket, socket]);

  const createRoom = () => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      toast({
        title: "Connection Error",
        description: "Not connected to game server. Please refresh the page.",
        variant: "destructive"
      });
      return;
    }
    
    if (!newRoomData.roomName.trim()) {
      toast({
        title: "Validation Error",
        description: "Room name is required",
        variant: "destructive"
      });
      return;
    }
    
    socket.send(JSON.stringify({
      type: 'create_room',
      gameId: parseInt(newRoomData.gameId),
      roomName: newRoomData.roomName,
      isPrivate: newRoomData.isPrivate
    }));
  };

  const joinRoom = (roomId: string) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      toast({
        title: "Connection Error",
        description: "Not connected to game server. Please refresh the page.",
        variant: "destructive"
      });
      return;
    }
    
    socket.send(JSON.stringify({
      type: 'join_room',
      roomId
    }));
    
    setLocation(`/game/${roomId}`);
  };

  const refreshRooms = () => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      connectWebSocket();
      return;
    }
    
    setIsRefreshing(true);
    
    // Re-authenticate to get fresh room list
    socket.send(JSON.stringify({
      type: 'auth',
      userId: user.id
    }));
    
    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  };

  const updateRoom = (updatedRoom: GameRoom) => {
    setGameRooms(prevRooms => {
      const index = prevRooms.findIndex(room => room.id === updatedRoom.id);
      
      if (index !== -1) {
        const newRooms = [...prevRooms];
        newRooms[index] = updatedRoom;
        return newRooms;
      } else {
        return [...prevRooms, updatedRoom];
      }
    });
  };

  const removeRoom = (roomId: string) => {
    setGameRooms(prevRooms => prevRooms.filter(room => room.id !== roomId));
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
              <Link href="/profile">
                <Button variant="outline">Profile</Button>
              </Link>
              <Button variant="ghost" onClick={onLogout}>Logout</Button>
            </div>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="md:w-1/3">
            <Card>
              <CardHeader>
                <CardTitle>Game Lobby</CardTitle>
                <CardDescription>Join or create a game room</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4">
                  <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="w-full" size="lg">
                        <Plus className="w-5 h-5 mr-2" />
                        Create New Room
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create Game Room</DialogTitle>
                        <DialogDescription>
                          Set up a new room for players to join.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="game-select" className="text-right">
                            Game
                          </Label>
                          <Select
                            value={newRoomData.gameId}
                            onValueChange={(value) => setNewRoomData({...newRoomData, gameId: value})}
                          >
                            <SelectTrigger id="game-select" className="col-span-3">
                              <SelectValue placeholder="Select a game" />
                            </SelectTrigger>
                            <SelectContent>
                              {games.map((game) => (
                                <SelectItem key={game.id} value={game.id.toString()}>
                                  {game.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="room-name" className="text-right">
                            Room Name
                          </Label>
                          <Input
                            id="room-name"
                            value={newRoomData.roomName}
                            onChange={(e) => setNewRoomData({...newRoomData, roomName: e.target.value})}
                            className="col-span-3"
                            placeholder="My Game Room"
                          />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="is-private" className="text-right">
                            Private
                          </Label>
                          <div className="flex items-center gap-2 col-span-3">
                            <Switch
                              id="is-private"
                              checked={newRoomData.isPrivate}
                              onCheckedChange={(checked) => setNewRoomData({...newRoomData, isPrivate: checked})}
                            />
                            <Label htmlFor="is-private" className="text-sm text-muted-foreground">
                              Only joinable with direct link
                            </Label>
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button onClick={createRoom}>Create Room</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  
                  <Button 
                    variant="outline" 
                    onClick={refreshRooms} 
                    disabled={isRefreshing || isConnecting}
                  >
                    <RefreshCcw className={`w-5 h-5 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                    {isRefreshing ? 'Refreshing...' : isConnecting ? 'Connecting...' : 'Refresh Rooms'}
                  </Button>
                </div>
                
                <div className="mt-6 space-y-1">
                  <h3 className="font-medium text-sm">Your Info:</h3>
                  <div className="flex items-center gap-3 p-3 rounded-md bg-secondary/20">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                      style={{ backgroundColor: user.avatarColor || '#4f46e5', color: 'white' }}
                    >
                      {(user.displayName || user.username).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">{user.displayName || user.username}</p>
                      <p className="text-xs text-muted-foreground">
                        {user.gamesPlayed} games played • {user.gamesWon} wins
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="md:w-2/3">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Available Rooms</CardTitle>
                    <CardDescription>Join an existing game room</CardDescription>
                  </div>
                  <div className="flex items-center gap-2 bg-secondary/20 px-3 py-1 rounded-md">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{gameRooms.length} active</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isConnecting ? (
                  <div className="flex items-center justify-center h-40">
                    <p>Connecting to server...</p>
                  </div>
                ) : gameRooms.length > 0 ? (
                  <div className="space-y-4">
                    {gameRooms.map(room => {
                      const game = games.find(g => g.id === room.gameId);
                      
                      return (
                        <div key={room.id} className="flex items-center justify-between p-4 border border-border rounded-md">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 flex items-center justify-center rounded-md bg-primary/10">
                              <div className="text-primary" dangerouslySetInnerHTML={{ __html: game?.svgIcon || '' }} />
                            </div>
                            <div>
                              <h3 className="font-medium">{room.name}</h3>
                              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                <span>{game?.name}</span>
                                <span>•</span>
                                <div className="flex items-center gap-1">
                                  <Users className="w-4 h-4" />
                                  <span>{room.players.length}/{room.maxPlayers}</span>
                                </div>
                                <span>•</span>
                                <span className="capitalize">{room.status}</span>
                              </div>
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => joinRoom(room.id)}
                            disabled={room.players.length >= room.maxPlayers || room.status !== "waiting"}
                          >
                            <ArrowRight className="w-4 h-4 mr-1" />
                            {room.status === "waiting" 
                              ? (room.players.length >= room.maxPlayers ? "Full" : "Join") 
                              : "Spectate"}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-40 text-center">
                    <Gamepad className="w-12 h-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No active game rooms. Create one to get started!</p>
                    <Button className="mt-4" onClick={() => setIsCreateDialogOpen(true)}>Create Room</Button>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <h2 className="text-2xl font-bold mt-8 mb-4">Available Games</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {games.map((game) => (
                <GameCard 
                  key={game.id}
                  game={game}
                  onClick={() => {
                    setNewRoomData({
                      ...newRoomData,
                      gameId: game.id.toString()
                    });
                    setIsCreateDialogOpen(true);
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
