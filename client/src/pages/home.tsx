import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User } from "@shared/schema";
import { Gamepad, Users, Trophy } from "lucide-react";
import GameCard from "@/components/game-card";
import { games } from "@/lib/game-utils";

interface HomeProps {
  user: User | null;
  onLogin: (username: string, password: string) => Promise<boolean>;
  onRegister: (username: string, password: string, displayName?: string) => Promise<boolean>;
  onLogout: () => Promise<void>;
}

export default function Home({ user, onLogin, onRegister, onLogout }: HomeProps) {
  const [, setLocation] = useLocation();
  const [loginData, setLoginData] = useState({ username: "", password: "" });
  const [registerData, setRegisterData] = useState({ username: "", password: "", displayName: "" });
  const [authError, setAuthError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAuthError("");
    
    try {
      const success = await onLogin(loginData.username, loginData.password);
      if (success) {
        setLocation("/lobby");
      } else {
        setAuthError("Invalid username or password");
      }
    } catch (error) {
      setAuthError("Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAuthError("");
    
    try {
      const success = await onRegister(
        registerData.username, 
        registerData.password,
        registerData.displayName || undefined
      );
      if (success) {
        setLocation("/lobby");
      } else {
        setAuthError("Registration failed. Username may already exist.");
      }
    } catch (error) {
      setAuthError("Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <div className="container mx-auto px-4 py-8">
        <header className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-2">
            <Gamepad className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold">Gaming Hub</h1>
          </div>
          
          {user ? (
            <div className="flex items-center gap-4">
              <Link href="/profile">
                <Button variant="outline">Profile</Button>
              </Link>
              <Link href="/lobby">
                <Button>Game Lobby</Button>
              </Link>
              <Button variant="ghost" onClick={onLogout}>Logout</Button>
            </div>
          ) : null}
        </header>

        <main>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <div>
              <h2 className="text-4xl font-bold mb-4">
                Multiplayer Gaming Hub
              </h2>
              <p className="text-xl text-muted-foreground mb-6">
                Join the ultimate multiplayer experience with classic games and real-time competition.
              </p>
              
              <div className="flex flex-col gap-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Gamepad className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">Multiple Games</h3>
                    <p className="text-muted-foreground">Enjoy Pong, Tic-Tac-Toe, Snake and more!</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">Real-time Multiplayer</h3>
                    <p className="text-muted-foreground">Play with friends or join random matches.</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Trophy className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">Track Your Stats</h3>
                    <p className="text-muted-foreground">Keep track of wins and improve your skills.</p>
                  </div>
                </div>
              </div>
              
              {user ? (
                <div className="mt-8">
                  <Button size="lg" onClick={() => setLocation('/lobby')}>
                    Go to Game Lobby
                  </Button>
                </div>
              ) : null}
            </div>
            
            {!user ? (
              <div>
                <Tabs defaultValue="login" className="max-w-md mx-auto">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="login">Login</TabsTrigger>
                    <TabsTrigger value="register">Register</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="login">
                    <Card>
                      <CardHeader>
                        <CardTitle>Login</CardTitle>
                        <CardDescription>
                          Enter your credentials to access your account.
                        </CardDescription>
                      </CardHeader>
                      <form onSubmit={handleLogin}>
                        <CardContent className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="username">Username</Label>
                            <Input 
                              id="username" 
                              type="text" 
                              placeholder="Enter your username"
                              value={loginData.username}
                              onChange={(e) => setLoginData({...loginData, username: e.target.value})}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input 
                              id="password" 
                              type="password" 
                              placeholder="Enter your password"
                              value={loginData.password}
                              onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                              required
                            />
                          </div>
                          {authError && (
                            <p className="text-sm text-destructive">{authError}</p>
                          )}
                        </CardContent>
                        <CardFooter>
                          <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? "Logging in..." : "Login"}
                          </Button>
                        </CardFooter>
                      </form>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="register">
                    <Card>
                      <CardHeader>
                        <CardTitle>Create an account</CardTitle>
                        <CardDescription>
                          Register to start playing multiplayer games.
                        </CardDescription>
                      </CardHeader>
                      <form onSubmit={handleRegister}>
                        <CardContent className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="reg-username">Username</Label>
                            <Input 
                              id="reg-username" 
                              type="text" 
                              placeholder="Choose a username"
                              value={registerData.username}
                              onChange={(e) => setRegisterData({...registerData, username: e.target.value})}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="display-name">Display Name (Optional)</Label>
                            <Input 
                              id="display-name" 
                              type="text" 
                              placeholder="How others will see you"
                              value={registerData.displayName}
                              onChange={(e) => setRegisterData({...registerData, displayName: e.target.value})}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="reg-password">Password</Label>
                            <Input 
                              id="reg-password" 
                              type="password" 
                              placeholder="Create a password"
                              value={registerData.password}
                              onChange={(e) => setRegisterData({...registerData, password: e.target.value})}
                              required
                            />
                          </div>
                          {authError && (
                            <p className="text-sm text-destructive">{authError}</p>
                          )}
                        </CardContent>
                        <CardFooter>
                          <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? "Creating account..." : "Register"}
                          </Button>
                        </CardFooter>
                      </form>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            ) : (
              <div className="bg-card p-6 rounded-lg shadow-lg">
                <h3 className="text-xl font-semibold mb-4">Welcome back, {user.displayName || user.username}!</h3>
                <p className="text-muted-foreground mb-6">
                  Continue your gaming journey and challenge other players.
                </p>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-4 bg-background rounded-md">
                    <p className="text-sm text-muted-foreground">Games Played</p>
                    <p className="text-2xl font-bold">{user.gamesPlayed}</p>
                  </div>
                  <div className="p-4 bg-background rounded-md">
                    <p className="text-sm text-muted-foreground">Victories</p>
                    <p className="text-2xl font-bold">{user.gamesWon}</p>
                  </div>
                </div>
                <Button className="w-full" onClick={() => setLocation('/lobby')}>
                  Enter Game Lobby
                </Button>
              </div>
            )}
          </div>
          
          <div className="mt-20">
            <h2 className="text-3xl font-bold mb-8 text-center">Available Games</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {games.map((game) => (
                <GameCard 
                  key={game.id}
                  game={game}
                  onClick={() => user ? setLocation('/lobby') : null}
                  disabled={!user}
                />
              ))}
            </div>
          </div>
        </main>
        
        <footer className="mt-20 py-6 border-t border-border">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Gamepad className="w-6 h-6 text-primary" />
              <span className="font-semibold">Gaming Hub</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Gaming Hub. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
