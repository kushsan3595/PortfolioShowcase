import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Profile from "@/pages/profile";
import Lobby from "@/pages/lobby";
import GameRoomPage from "@/pages/game-room";
import { useEffect, useState } from "react";
import { User } from "@shared/schema";
import { apiRequest } from "./lib/queryClient";

function Router() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on app start
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/me', {
          credentials: 'include'
        });
        
        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
        }
      } catch (error) {
        console.error('Failed to fetch user data', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUser();
  }, []);

  const handleLogin = async (username: string, password: string) => {
    try {
      const res = await apiRequest('POST', '/api/login', { username, password });
      const userData = await res.json();
      setUser(userData);
      return true;
    } catch (error) {
      console.error('Login failed', error);
      return false;
    }
  };

  const handleRegister = async (username: string, password: string, displayName?: string) => {
    try {
      const res = await apiRequest('POST', '/api/register', { 
        username, 
        password,
        displayName,
        avatarColor: '#' + Math.floor(Math.random()*16777215).toString(16)
      });
      const userData = await res.json();
      setUser(userData);
      return true;
    } catch (error) {
      console.error('Registration failed', error);
      return false;
    }
  };

  const handleLogout = async () => {
    try {
      await apiRequest('POST', '/api/logout', {});
      setUser(null);
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  if (loading) {
    return <div className="h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <Switch>
      <Route path="/">
        <Home user={user} onLogin={handleLogin} onRegister={handleRegister} onLogout={handleLogout} />
      </Route>
      <Route path="/profile">
        {user ? <Profile user={user} onLogout={handleLogout} /> : <Home user={user} onLogin={handleLogin} onRegister={handleRegister} onLogout={handleLogout} />}
      </Route>
      <Route path="/lobby">
        {user ? <Lobby user={user} onLogout={handleLogout} /> : <Home user={user} onLogin={handleLogin} onRegister={handleRegister} onLogout={handleLogout} />}
      </Route>
      <Route path="/game/:roomId">
        {params => (
          user ? <GameRoomPage user={user} roomId={params.roomId} onLogout={handleLogout} /> : <Home user={user} onLogin={handleLogin} onRegister={handleRegister} onLogout={handleLogout} />
        )}
      </Route>
      <Route>
        <NotFound />
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
