import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { GameHistory } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { games } from "@/lib/game-utils";

interface UserStatsProps {
  gameHistory: GameHistory[];
  userId: number;
}

export default function UserStats({ gameHistory, userId }: UserStatsProps) {
  const [selectedTimeFrame, setSelectedTimeFrame] = useState("all");
  const [filteredHistory, setFilteredHistory] = useState<GameHistory[]>([]);
  
  const { data: gamesData } = useQuery({
    queryKey: ['/api/games'],
  });

  useEffect(() => {
    // Filter history based on selected time frame
    let filtered = [...gameHistory];
    
    const now = new Date();
    if (selectedTimeFrame === "week") {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(h => new Date(h.playedAt).getTime() > oneWeekAgo.getTime());
    } else if (selectedTimeFrame === "month") {
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(h => new Date(h.playedAt).getTime() > oneMonthAgo.getTime());
    }
    
    setFilteredHistory(filtered);
  }, [gameHistory, selectedTimeFrame]);

  const getWinLossData = () => {
    const wins = filteredHistory.filter(h => h.winnerId === userId).length;
    const losses = filteredHistory.filter(h => h.winnerId !== null && h.winnerId !== userId).length;
    const draws = filteredHistory.filter(h => h.winnerId === null).length;
    
    return [
      { name: "Wins", value: wins, color: "#4f46e5" },
      { name: "Losses", value: losses, color: "#ef4444" },
      { name: "Draws", value: draws, color: "#a1a1aa" }
    ];
  };

  const getGameTypeData = () => {
    const gameTypeCounts: Record<number, { wins: number, played: number }> = {};
    
    filteredHistory.forEach(h => {
      if (!gameTypeCounts[h.gameId]) {
        gameTypeCounts[h.gameId] = { wins: 0, played: 0 };
      }
      
      gameTypeCounts[h.gameId].played += 1;
      
      if (h.winnerId === userId) {
        gameTypeCounts[h.gameId].wins += 1;
      }
    });
    
    return Object.entries(gameTypeCounts).map(([gameId, stats]) => {
      const game = games.find(g => g.id === parseInt(gameId));
      return {
        name: game?.name || `Game ${gameId}`,
        winRate: stats.played > 0 ? Math.round((stats.wins / stats.played) * 100) : 0,
        played: stats.played
      };
    });
  };

  const winLossData = getWinLossData();
  const gameTypeData = getGameTypeData();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Performance Summary</h3>
        <div className="flex items-center gap-2">
          <Label htmlFor="time-frame" className="text-sm text-muted-foreground">
            Time Frame:
          </Label>
          <Select
            value={selectedTimeFrame}
            onValueChange={setSelectedTimeFrame}
          >
            <SelectTrigger id="time-frame" className="w-32">
              <SelectValue placeholder="All Time" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="month">Last Month</SelectItem>
                <SelectItem value="week">Last Week</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {filteredHistory.length === 0 ? (
        <div className="text-center p-6 bg-secondary/10 rounded-md">
          <p className="text-muted-foreground">No game history available for the selected time frame.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardContent className="pt-6">
              <h4 className="text-sm font-medium mb-4 text-center">Win/Loss Ratio</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={winLossData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {winLossData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} games`, ""]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              <div className="flex justify-center gap-4 mt-4">
                {winLossData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: entry.color }}
                    ></div>
                    <span className="text-sm text-muted-foreground">
                      {entry.name}: {entry.value}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <h4 className="text-sm font-medium mb-4 text-center">Performance by Game</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={gameTypeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis yAxisId="left" orientation="left" stroke="#4f46e5" domain={[0, 100]} />
                    <YAxis yAxisId="right" orientation="right" stroke="#f97316" />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="winRate" name="Win Rate (%)" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="right" dataKey="played" name="Games Played" fill="#f97316" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Recent Games</h3>
        {filteredHistory.length === 0 ? (
          <div className="text-center p-6 bg-secondary/10 rounded-md">
            <p className="text-muted-foreground">No recent games available.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredHistory.slice(0, 5).map((game) => {
              const gameInfo = games.find(g => g.id === game.gameId);
              const isWinner = game.winnerId === userId;
              const isDraw = game.winnerId === null;
              
              return (
                <div key={game.id} className="p-4 border border-border rounded-md flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 flex items-center justify-center rounded-md bg-primary/10">
                      <div className="text-primary" dangerouslySetInnerHTML={{ __html: gameInfo?.svgIcon || '' }} />
                    </div>
                    <div>
                      <p className="font-medium">{gameInfo?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(game.playedAt).toLocaleDateString()} at {new Date(game.playedAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    isWinner 
                      ? 'bg-green-500/20 text-green-500' 
                      : isDraw 
                        ? 'bg-amber-500/20 text-amber-500' 
                        : 'bg-red-500/20 text-red-500'
                  }`}>
                    {isWinner ? 'Won' : isDraw ? 'Draw' : 'Lost'}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
