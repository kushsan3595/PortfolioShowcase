import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Trophy, Medal } from "lucide-react";
import { User } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";

interface LeaderboardProps {
  currentUserId: number;
}

export default function Leaderboard({ currentUserId }: LeaderboardProps) {
  const [sortBy, setSortBy] = useState("winRate");
  const [users, setUsers] = useState<User[]>([]);
  
  // Fetch all users for leaderboard
  const { data: usersData, isLoading } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      // Since we don't have a real endpoint for this in our API, 
      // let's create a mock response for demo purposes
      // In a real app, this would be fetched from the API
      const mockUsers: User[] = [];
      return mockUsers;
    },
  });
  
  useEffect(() => {
    // If we can't fetch users from the server, create some mock data
    // This is only for demonstration - in a real app, data would come from the API
    const mockUsers: User[] = [
      { id: 1, username: "player1", displayName: "GameMaster", password: "", avatarColor: "#4c1d95", gamesPlayed: 25, gamesWon: 18 },
      { id: 2, username: "player2", displayName: "ProGamer", password: "", avatarColor: "#1e40af", gamesPlayed: 32, gamesWon: 15 },
      { id: 3, username: "player3", displayName: "Novice", password: "", avatarColor: "#047857", gamesPlayed: 12, gamesWon: 3 },
      { id: 4, username: "player4", displayName: "Challenger", password: "", avatarColor: "#b45309", gamesPlayed: 18, gamesWon: 9 },
      { id: 5, username: "player5", displayName: "Tactician", password: "", avatarColor: "#9d174d", gamesPlayed: 20, gamesWon: 12 },
      { id: currentUserId, username: "currentUser", displayName: "You", password: "", avatarColor: "#4f46e5", gamesPlayed: 15, gamesWon: 7 }
    ];
    
    setUsers(mockUsers);
  }, [currentUserId]);
  
  const sortedUsers = [...users].sort((a, b) => {
    if (sortBy === "winRate") {
      const aWinRate = a.gamesPlayed === 0 ? 0 : a.gamesWon / a.gamesPlayed;
      const bWinRate = b.gamesPlayed === 0 ? 0 : b.gamesWon / b.gamesPlayed;
      return bWinRate - aWinRate;
    } else if (sortBy === "gamesWon") {
      return b.gamesWon - a.gamesWon;
    } else { // gamesPlayed
      return b.gamesPlayed - a.gamesPlayed;
    }
  });
  
  const getUserRank = (userId: number): number => {
    const index = sortedUsers.findIndex(user => user.id === userId);
    return index + 1;
  };
  
  const renderMedal = (rank: number) => {
    if (rank === 1) {
      return <Trophy className="w-5 h-5 text-yellow-500" />;
    } else if (rank === 2) {
      return <Medal className="w-5 h-5 text-slate-400" />;
    } else if (rank === 3) {
      return <Medal className="w-5 h-5 text-amber-600" />;
    }
    return <span className="w-5 h-5 flex items-center justify-center font-bold text-muted-foreground">{rank}</span>;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Player Rankings</h3>
        <div className="flex items-center gap-2">
          <Label htmlFor="sort-by" className="text-sm text-muted-foreground">
            Sort by:
          </Label>
          <Select
            value={sortBy}
            onValueChange={setSortBy}
          >
            <SelectTrigger id="sort-by" className="w-36">
              <SelectValue placeholder="Win Rate" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="winRate">Win Rate</SelectItem>
                <SelectItem value="gamesWon">Total Wins</SelectItem>
                <SelectItem value="gamesPlayed">Games Played</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {isLoading ? (
        <div className="text-center p-6">
          <p className="text-muted-foreground">Loading leaderboard...</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedUsers.map((user, index) => {
            const isCurrentUser = user.id === currentUserId;
            const rank = index + 1;
            const winRate = user.gamesPlayed > 0 
              ? Math.round((user.gamesWon / user.gamesPlayed) * 100) 
              : 0;
              
            return (
              <div 
                key={user.id} 
                className={`p-3 border border-border rounded-md flex items-center gap-4 ${
                  isCurrentUser ? 'bg-primary/5 border-primary/20' : ''
                }`}
              >
                <div className="flex items-center justify-center w-8">
                  {renderMedal(rank)}
                </div>
                
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{ backgroundColor: user.avatarColor || '#4f46e5', color: 'white' }}
                >
                  {(user.displayName || user.username).charAt(0).toUpperCase()}
                </div>
                
                <div className="flex-grow">
                  <p className="font-medium">
                    {user.displayName || user.username} 
                    {isCurrentUser && <span className="text-xs ml-2 text-muted-foreground">(You)</span>}
                  </p>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>{user.gamesPlayed} games</span>
                    <span>{user.gamesWon} wins</span>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-xl font-bold">{winRate}%</div>
                  <div className="text-xs text-muted-foreground">Win Rate</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {sortedUsers.length === 0 && (
        <div className="text-center p-6 bg-secondary/10 rounded-md">
          <p className="text-muted-foreground">No players found.</p>
        </div>
      )}
      
      {/* Your Rank Card */}
      {sortedUsers.length > 0 && (
        <Card className="mt-6 bg-secondary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-8">
                {renderMedal(getUserRank(currentUserId))}
              </div>
              <div className="flex-grow">
                <p className="text-sm font-medium">Your Rank</p>
                <p className="text-2xl font-bold">
                  #{getUserRank(currentUserId)} of {sortedUsers.length}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Keep playing to improve your rank!</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
