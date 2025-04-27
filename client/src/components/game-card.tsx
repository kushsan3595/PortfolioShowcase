import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface GameCardProps {
  game: {
    id: number;
    name: string;
    description: string;
    svgIcon: string;
    maxPlayers: number;
  };
  onClick?: () => void;
  disabled?: boolean;
}

export default function GameCard({ game, onClick, disabled = false }: GameCardProps) {
  return (
    <Card className={cn(
      "overflow-hidden transition-all duration-200 hover:shadow-md",
      disabled ? "opacity-70" : "hover:border-primary/50"
    )}>
      <CardHeader className="p-0 h-28 relative overflow-hidden">
        <div 
          className="absolute inset-0 flex items-center justify-center bg-gradient-to-r from-primary/20 to-secondary/20"
        >
          <div 
            className="w-16 h-16 text-primary" 
            dangerouslySetInnerHTML={{ __html: game.svgIcon }}
          />
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <CardTitle className="text-lg mb-2">{game.name}</CardTitle>
        <p className="text-sm text-muted-foreground">{game.description}</p>
      </CardContent>
      <CardFooter className="p-4 pt-0 flex justify-between items-center">
        <div className="text-xs text-muted-foreground">
          {game.maxPlayers} player{game.maxPlayers > 1 ? 's' : ''}
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onClick}
          disabled={disabled}
        >
          {disabled ? "Login to Play" : "Play Now"}
        </Button>
      </CardFooter>
    </Card>
  );
}
