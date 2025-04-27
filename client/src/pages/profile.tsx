import { User } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowLeft, Gamepad, Trophy, Award, BarChart2 } from "lucide-react";
import UserStats from "@/components/user-stats";
import { useQuery } from "@tanstack/react-query";
import Leaderboard from "@/components/leaderboard";

interface ProfileProps {
  user: User;
  onLogout: () => Promise<void>;
}

export default function Profile({ user, onLogout }: ProfileProps) {
  const { data: gameHistory, isLoading } = useQuery({
    queryKey: ['/api/history'],
  });

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
          <Link href="/lobby" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Lobby</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Profile</CardTitle>
                <CardDescription>Your gaming profile and statistics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center mb-6">
                  <div 
                    className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold mb-4"
                    style={{ backgroundColor: user.avatarColor || '#4f46e5', color: 'white' }}
                  >
                    {(user.displayName || user.username).charAt(0).toUpperCase()}
                  </div>
                  <h2 className="text-xl font-bold">{user.displayName || user.username}</h2>
                  <p className="text-sm text-muted-foreground">@{user.username}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="flex flex-col items-center p-4 bg-secondary/20 rounded-md">
                    <Trophy className="w-5 h-5 text-primary mb-2" />
                    <p className="text-2xl font-bold">{user.gamesWon}</p>
                    <p className="text-xs text-muted-foreground">Wins</p>
                  </div>
                  <div className="flex flex-col items-center p-4 bg-secondary/20 rounded-md">
                    <BarChart2 className="w-5 h-5 text-primary mb-2" />
                    <p className="text-2xl font-bold">{user.gamesPlayed}</p>
                    <p className="text-xs text-muted-foreground">Games</p>
                  </div>
                </div>
                
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Win Rate</span>
                    <span className="text-sm font-medium">
                      {user.gamesPlayed > 0 
                        ? `${Math.round((user.gamesWon / user.gamesPlayed) * 100)}%` 
                        : '0%'}
                    </span>
                  </div>
                  <div className="w-full bg-secondary/30 rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full" 
                      style={{ 
                        width: user.gamesPlayed > 0 
                          ? `${Math.round((user.gamesWon / user.gamesPlayed) * 100)}%` 
                          : '0%' 
                      }}
                    ></div>
                  </div>
                </div>
                
                {user.gamesPlayed >= 10 && (
                  <div className="mt-6 flex items-center gap-2 p-3 bg-secondary/20 rounded-md">
                    <Award className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">Experienced Player</p>
                      <p className="text-xs text-muted-foreground">Played 10+ games</p>
                    </div>
                  </div>
                )}
                
                {user.gamesWon >= 5 && (
                  <div className="mt-3 flex items-center gap-2 p-3 bg-secondary/20 rounded-md">
                    <Trophy className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">Champion</p>
                      <p className="text-xs text-muted-foreground">Won 5+ games</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          <div className="md:col-span-2">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Game Statistics</CardTitle>
                <CardDescription>Your performance across different games</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center h-40">
                    <p>Loading statistics...</p>
                  </div>
                ) : gameHistory && gameHistory.length > 0 ? (
                  <UserStats gameHistory={gameHistory} userId={user.id} />
                ) : (
                  <div className="flex flex-col items-center justify-center h-40 text-center">
                    <Gamepad className="w-12 h-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No game history yet. Play some games to build your stats!</p>
                    <Link href="/lobby">
                      <Button className="mt-4">Find a Game</Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Leaderboard</CardTitle>
                <CardDescription>Top players in the Gaming Hub</CardDescription>
              </CardHeader>
              <CardContent>
                <Leaderboard currentUserId={user.id} />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
