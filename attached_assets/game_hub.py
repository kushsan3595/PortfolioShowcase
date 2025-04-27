import pygame
import sys
import socket
import threading
import json
from enum import Enum

# Game States
class GameState(Enum):
    MAIN_MENU = 0
    WAITING_FOR_CONNECTION = 1
    GAME_SELECTION = 2
    PLAYING = 3

class Game:
    """Base class for all games in the hub"""
    def __init__(self, screen):
        self.screen = screen
        self.running = True
        
    def handle_event(self, event):
        if event.type == pygame.QUIT:
            self.running = False
        
    def update(self):
        pass
        
    def render(self):
        pass
        
    def run(self):
        clock = pygame.time.Clock()
        while self.running:
            for event in pygame.event.get():
                self.handle_event(event)
                
            self.update()
            self.render()
            
            pygame.display.flip()
            clock.tick(60)
        
        return GameState.GAME_SELECTION

class PongGame(Game):
    """Simple Pong game implementation"""
    def __init__(self, screen, is_host, connection):
        super().__init__(screen)
        self.width, self.height = screen.get_size()
        self.is_host = is_host
        self.connection = connection
        
        # Game objects
        self.paddle_width = 15
        self.paddle_height = 100
        self.paddle_speed = 8
        
        # Initialize paddles
        if is_host:
            self.player_paddle = pygame.Rect(50, self.height//2 - self.paddle_height//2, 
                                     self.paddle_width, self.paddle_height)
            self.opponent_paddle = pygame.Rect(self.width - 50 - self.paddle_width, 
                                      self.height//2 - self.paddle_height//2,
                                      self.paddle_width, self.paddle_height)
        else:
            self.player_paddle = pygame.Rect(self.width - 50 - self.paddle_width, 
                                     self.height//2 - self.paddle_height//2,
                                     self.paddle_width, self.paddle_height)
            self.opponent_paddle = pygame.Rect(50, self.height//2 - self.paddle_height//2, 
                                      self.paddle_width, self.paddle_height)
        
        # Ball properties
        self.ball_size = 15
        self.ball = pygame.Rect(self.width//2 - self.ball_size//2, 
                       self.height//2 - self.ball_size//2,
                       self.ball_size, self.ball_size)
        self.ball_speed_x = 7 * (1 if is_host else -1)
        self.ball_speed_y = 7
        
        # Scoring
        self.player_score = 0
        self.opponent_score = 0
        self.font = pygame.font.Font(None, 74)
        
        # Network communication thread
        self.receive_thread = threading.Thread(target=self.receive_data)
        self.receive_thread.daemon = True
        self.receive_thread.start()
        
    def handle_event(self, event):
        super().handle_event(event)
        
    def update(self):
        # Handle paddle movement
        keys = pygame.key.get_pressed()
        if keys[pygame.K_UP] and self.player_paddle.top > 0:
            self.player_paddle.y -= self.paddle_speed
        if keys[pygame.K_DOWN] and self.player_paddle.bottom < self.height:
            self.player_paddle.y += self.paddle_speed
            
        # Send paddle position to opponent
        try:
            data = {
                "paddle_y": self.player_paddle.y
            }
            self.connection.send(json.dumps(data).encode())
        except:
            pass
            
        # Update ball if host
        if self.is_host:
            # Ball movement
            self.ball.x += self.ball_speed_x
            self.ball.y += self.ball_speed_y
            
            # Ball collision with top and bottom
            if self.ball.top <= 0 or self.ball.bottom >= self.height:
                self.ball_speed_y *= -1
                
            # Ball collision with paddles
            if self.ball.colliderect(self.player_paddle) or self.ball.colliderect(self.opponent_paddle):
                self.ball_speed_x *= -1
                
            # Ball out of bounds
            if self.ball.left <= 0:
                self.opponent_score += 1
                self.reset_ball()
            elif self.ball.right >= self.width:
                self.player_score += 1
                self.reset_ball()
                
            # Send ball position to opponent
            try:
                data = {
                    "paddle_y": self.player_paddle.y,
                    "ball_x": self.ball.x,
                    "ball_y": self.ball.y,
                    "player_score": self.player_score,
                    "opponent_score": self.opponent_score
                }
                self.connection.send(json.dumps(data).encode())
            except:
                pass
    
    def reset_ball(self):
        self.ball.center = (self.width//2, self.height//2)
        self.ball_speed_x *= -1
    
    def receive_data(self):
        while self.running:
            try:
                data = self.connection.recv(1024).decode()
                if data:
                    game_data = json.loads(data)
                    self.opponent_paddle.y = game_data.get("paddle_y", self.opponent_paddle.y)
                    
                    if not self.is_host and "ball_x" in game_data:
                        self.ball.x = game_data["ball_x"]
                        self.ball.y = game_data["ball_y"]
                        self.player_score = game_data["opponent_score"]
                        self.opponent_score = game_data["player_score"]
            except:
                continue
    
    def render(self):
        # Clear screen
        self.screen.fill((0, 0, 0))
        
        # Draw middle line
        pygame.draw.aaline(self.screen, (200, 200, 200), 
                         (self.width//2, 0), (self.width//2, self.height))
        
        # Draw paddles
        pygame.draw.rect(self.screen, (200, 200, 200), self.player_paddle)
        pygame.draw.rect(self.screen, (200, 200, 200), self.opponent_paddle)
        
        # Draw ball
        pygame.draw.ellipse(self.screen, (200, 200, 200), self.ball)
        
        # Draw scores
        player_text = self.font.render(str(self.player_score), True, (200, 200, 200))
        opponent_text = self.font.render(str(self.opponent_score), True, (200, 200, 200))
        
        self.screen.blit(player_text, (self.width//4, 20))
        self.screen.blit(opponent_text, (3*self.width//4, 20))

class TicTacToeGame(Game):
    """Simple Tic-Tac-Toe game implementation"""
    def __init__(self, screen, is_host, connection):
        super().__init__(screen)
        self.width, self.height = screen.get_size()
        self.is_host = is_host
        self.connection = connection
        
        # Game state
        self.board = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]  # 0=empty, 1=X, 2=O
        self.current_player = 1  # X starts
        self.cell_size = min(self.width, self.height) // 3
        self.game_over = False
        self.winner = 0
        
        # Player assignment (host is X, client is O)
        self.player_piece = 1 if is_host else 2
        
        # Network communication thread
        self.receive_thread = threading.Thread(target=self.receive_data)
        self.receive_thread.daemon = True
        self.receive_thread.start()
        
    def handle_event(self, event):
        super().handle_event(event)
        
        if event.type == pygame.MOUSEBUTTONDOWN and not self.game_over:
            # Only allow moves when it's the player's turn
            if self.current_player == self.player_piece:
                x, y = event.pos
                col = x // self.cell_size
                row = y // self.cell_size
                
                if col < 3 and row < 3 and self.board[row][col] == 0:
                    self.board[row][col] = self.player_piece
                    self.current_player = 2 if self.current_player == 1 else 1
                    
                    # Send move to opponent
                    try:
                        data = {
                            "move": [row, col],
                            "piece": self.player_piece
                        }
                        self.connection.send(json.dumps(data).encode())
                    except:
                        pass
                        
                    self.check_winner()
    
    def check_winner(self):
        # Check rows
        for row in self.board:
            if row[0] != 0 and row[0] == row[1] == row[2]:
                self.game_over = True
                self.winner = row[0]
                return
                
        # Check columns
        for col in range(3):
            if self.board[0][col] != 0 and self.board[0][col] == self.board[1][col] == self.board[2][col]:
                self.game_over = True
                self.winner = self.board[0][col]
                return
                
        # Check diagonals
        if self.board[0][0] != 0 and self.board[0][0] == self.board[1][1] == self.board[2][2]:
            self.game_over = True
            self.winner = self.board[0][0]
            return
            
        if self.board[0][2] != 0 and self.board[0][2] == self.board[1][1] == self.board[2][0]:
            self.game_over = True
            self.winner = self.board[0][2]
            return
            
        # Check for draw
        draw = True
        for row in self.board:
            for cell in row:
                if cell == 0:
                    draw = False
                    break
        
        if draw:
            self.game_over = True
    
    def receive_data(self):
        while self.running:
            try:
                data = self.connection.recv(1024).decode()
                if data:
                    game_data = json.loads(data)
                    if "move" in game_data:
                        row, col = game_data["move"]
                        piece = game_data["piece"]
                        self.board[row][col] = piece
                        self.current_player = 2 if self.current_player == 1 else 1
                        self.check_winner()
            except:
                continue
    
    def render(self):
        # Clear screen
        self.screen.fill((0, 0, 0))
        
        # Draw grid
        for i in range(1, 3):
            pygame.draw.line(self.screen, (200, 200, 200), 
                           (0, i * self.cell_size), (self.width, i * self.cell_size), 2)
            pygame.draw.line(self.screen, (200, 200, 200), 
                           (i * self.cell_size, 0), (i * self.cell_size, self.height), 2)
        
        # Draw X's and O's
        for row in range(3):
            for col in range(3):
                x = col * self.cell_size + self.cell_size // 2
                y = row * self.cell_size + self.cell_size // 2
                
                if self.board[row][col] == 1:  # X
                    pygame.draw.line(self.screen, (255, 0, 0), 
                                   (x - self.cell_size//3, y - self.cell_size//3),
                                   (x + self.cell_size//3, y + self.cell_size//3), 5)
                    pygame.draw.line(self.screen, (255, 0, 0), 
                                   (x + self.cell_size//3, y - self.cell_size//3),
                                   (x - self.cell_size//3, y + self.cell_size//3), 5)
                elif self.board[row][col] == 2:  # O
                    pygame.draw.circle(self.screen, (0, 0, 255), (x, y), 
                                     self.cell_size//3, 5)
        
        # Game status
        font = pygame.font.Font(None, 36)
        if self.game_over:
            if self.winner == self.player_piece:
                text = font.render("You win!", True, (0, 255, 0))
            elif self.winner != 0:
                text = font.render("You lose!", True, (255, 0, 0))
            else:
                text = font.render("Draw!", True, (200, 200, 200))
        else:
            if self.current_player == self.player_piece:
                text = font.render("Your turn", True, (0, 255, 0))
            else:
                text = font.render("Opponent's turn", True, (200, 200, 200))
                
        self.screen.blit(text, (10, self.height - 40))

class SnakeGame(Game):
    """Snake game with multiplayer capabilities"""
    def __init__(self, screen, is_host, connection):
        super().__init__(screen)
        self.width, self.height = screen.get_size()
        self.is_host = is_host
        self.connection = connection
        
        # Game parameters
        self.grid_size = 20
        self.grid_width = self.width // self.grid_size
        self.grid_height = self.height // self.grid_size
        
        # Colors
        self.bg_color = (0, 0, 0)
        self.player_color = (0, 255, 0)
        self.opponent_color = (0, 0, 255)
        self.food_color = (255, 0, 0)
        self.text_color = (255, 255, 255)
        
        # Player snake
        self.player_snake = [
            {"x": 5, "y": 5},
            {"x": 4, "y": 5},
            {"x": 3, "y": 5}
        ] if is_host else [
            {"x": self.grid_width - 5, "y": self.grid_height - 5},
            {"x": self.grid_width - 4, "y": self.grid_height - 5},
            {"x": self.grid_width - 3, "y": self.grid_height - 5}
        ]
        
        # Opponent snake
        self.opponent_snake = [
            {"x": self.grid_width - 5, "y": self.grid_height - 5},
            {"x": self.grid_width - 4, "y": self.grid_height - 5},
            {"x": self.grid_width - 3, "y": self.grid_height - 5}
        ] if is_host else [
            {"x": 5, "y": 5},
            {"x": 4, "y": 5},
            {"x": 3, "y": 5}
        ]
        
        # Direction: "up", "down", "left", "right"
        self.player_direction = "right" if is_host else "left"
        self.opponent_direction = "left" if is_host else "right"
        
        # Food
        self.food = self.generate_food()
        
        # Scores
        self.player_score = 0
        self.opponent_score = 0
        self.font = pygame.font.Font(None, 36)
        
        # Game state
        self.game_over = False
        self.player_alive = True
        self.opponent_alive = True
        
        # Movement delay for snake speed
        self.last_move_time = pygame.time.get_ticks()
        self.move_delay = 150  # milliseconds
        
        # Network communication thread
        self.receive_thread = threading.Thread(target=self.receive_data)
        self.receive_thread.daemon = True
        self.receive_thread.start()
        
    def generate_food(self):
        # Generate food in a position not occupied by snakes
        while True:
            food = {
                "x": pygame.time.get_ticks() % self.grid_width,
                "y": pygame.time.get_ticks() // 1000 % self.grid_height
            }
            
            # Check if food position is not occupied by player snake
            if food not in self.player_snake and food not in self.opponent_snake:
                return food
    
    def handle_event(self, event):
        super().handle_event(event)
        
        # Handle key presses for snake direction
        if event.type == pygame.KEYDOWN and self.player_alive:
            new_direction = self.player_direction
            
            if event.key == pygame.K_UP and self.player_direction != "down":
                new_direction = "up"
            elif event.key == pygame.K_DOWN and self.player_direction != "up":
                new_direction = "down"
            elif event.key == pygame.K_LEFT and self.player_direction != "right":
                new_direction = "left"
            elif event.key == pygame.K_RIGHT and self.player_direction != "left":
                new_direction = "right"
                
            if new_direction != self.player_direction:
                self.player_direction = new_direction
                
                # Send direction change to opponent
                try:
                    data = {
                        "direction": self.player_direction
                    }
                    self.connection.send(json.dumps(data).encode())
                except:
                    pass
    
    def update(self):
        current_time = pygame.time.get_ticks()
        
        # Move snake at regular intervals
        if current_time - self.last_move_time > self.move_delay and not self.game_over:
            self.last_move_time = current_time
            
            # Only the host updates the game state
            if self.is_host and self.player_alive:
                # Move player snake
                self.move_snake(self.player_snake, self.player_direction)
                
                # Check for collisions
                if self.check_collision(self.player_snake):
                    self.player_alive = False
                
                # Check if player snake eats food
                head = self.player_snake[0]
                if head["x"] == self.food["x"] and head["y"] == self.food["y"]:
                    self.player_score += 1
                    self.food = self.generate_food()
                else:
                    # Remove tail if food wasn't eaten
                    self.player_snake.pop()
                
                # Move opponent snake if it's alive
                if self.opponent_alive:
                    self.move_snake(self.opponent_snake, self.opponent_direction)
                    
                    # Check for collisions
                    if self.check_collision(self.opponent_snake):
                        self.opponent_alive = False
                    
                    # Check if opponent snake eats food
                    head = self.opponent_snake[0]
                    if head["x"] == self.food["x"] and head["y"] == self.food["y"]:
                        self.opponent_score += 1
                        self.food = self.generate_food()
                    else:
                        # Remove tail if food wasn't eaten
                        self.opponent_snake.pop()
                
                # Check game over conditions
                if not self.player_alive and not self.opponent_alive:
                    self.game_over = True
                
                # Send game state to opponent
                try:
                    data = {
                        "player_snake": self.opponent_snake,
                        "opponent_snake": self.player_snake,
                        "food": self.food,
                        "player_score": self.opponent_score,
                        "opponent_score": self.player_score,
                        "player_alive": self.opponent_alive,
                        "opponent_alive": self.player_alive,
                        "game_over": self.game_over
                    }
                    self.connection.send(json.dumps(data).encode())
                except:
                    pass
    
    def move_snake(self, snake, direction):
        # Calculate new head position
        head = snake[0].copy()
        
        if direction == "up":
            head["y"] -= 1
        elif direction == "down":
            head["y"] += 1
        elif direction == "left":
            head["x"] -= 1
        elif direction == "right":
            head["x"] += 1
            
        # Add new head to snake
        snake.insert(0, head)
    
    def check_collision(self, snake):
        head = snake[0]
        
        # Check wall collision
        if (head["x"] < 0 or head["x"] >= self.grid_width or 
            head["y"] < 0 or head["y"] >= self.grid_height):
            return True
            
        # Check self collision (skip the head)
        for segment in snake[1:]:
            if head["x"] == segment["x"] and head["y"] == segment["y"]:
                return True
                
        # Check collision with other snake
        other_snake = self.opponent_snake if snake == self.player_snake else self.player_snake
        for segment in other_snake:
            if head["x"] == segment["x"] and head["y"] == segment["y"]:
                return True
                
        return False
    
    def receive_data(self):
        while self.running:
            try:
                data = self.connection.recv(1024).decode()
                if data:
                    game_data = json.loads(data)
                    
                    if "direction" in game_data:
                        self.opponent_direction = game_data["direction"]
                    
                    if not self.is_host and "player_snake" in game_data:
                        self.player_snake = game_data["player_snake"]
                        self.opponent_snake = game_data["opponent_snake"]
                        self.food = game_data["food"]
                        self.player_score = game_data["player_score"]
                        self.opponent_score = game_data["opponent_score"]
                        self.player_alive = game_data["player_alive"]
                        self.opponent_alive = game_data["opponent_alive"]
                        self.game_over = game_data["game_over"]
            except:
                continue
    
    def render(self):
        # Clear screen
        self.screen.fill(self.bg_color)
        
        # Draw grid lines (optional)
        for x in range(0, self.width, self.grid_size):
            pygame.draw.line(self.screen, (50, 50, 50), (x, 0), (x, self.height))
        for y in range(0, self.height, self.grid_size):
            pygame.draw.line(self.screen, (50, 50, 50), (0, y), (self.width, y))
        
        # Draw player snake
        for segment in self.player_snake:
            pygame.draw.rect(self.screen, self.player_color, 
                           (segment["x"] * self.grid_size, segment["y"] * self.grid_size, 
                            self.grid_size, self.grid_size))
                            
        # Draw opponent snake
        for segment in self.opponent_snake:
            pygame.draw.rect(self.screen, self.opponent_color, 
                           (segment["x"] * self.grid_size, segment["y"] * self.grid_size, 
                            self.grid_size, self.grid_size))
        
        # Draw food
        pygame.draw.rect(self.screen, self.food_color, 
                       (self.food["x"] * self.grid_size, self.food["y"] * self.grid_size, 
                        self.grid_size, self.grid_size))
        
        # Draw scores
        player_text = self.font.render(f"You: {self.player_score}", True, self.text_color)
        opponent_text = self.font.render(f"Opponent: {self.opponent_score}", True, self.text_color)
        
        self.screen.blit(player_text, (10, 10))
        self.screen.blit(opponent_text, (self.width - 150, 10))
        
        # Draw game over message
        if self.game_over:
            font = pygame.font.Font(None, 72)
            if self.player_score > self.opponent_score:
                text = font.render("You Win!", True, (0, 255, 0))
            elif self.player_score < self.opponent_score:
                text = font.render("You Lose!", True, (255, 0, 0))
            else:
                text = font.render("Draw!", True, (255, 255, 255))
                
            text_rect = text.get_rect(center=(self.width//2, self.height//2))
            self.screen.blit(text, text_rect)

class GamingHub:
    def __init__(self):
        # Initialize pygame
        pygame.init()
        
        # Set up display
        self.width, self.height = 800, 600
        self.screen = pygame.display.set_mode((self.width, self.height))
        pygame.display.set_caption("Multiplayer Gaming Hub")
        
        # Game state
        self.state = GameState.MAIN_MENU
        
        # Menu options
        self.menu_font = pygame.font.Font(None, 36)
        self.title_font = pygame.font.Font(None, 72)
        
        # Available games
        self.games = [
            {"name": "Pong", "description": "Classic table tennis game"},
            {"name": "Tic-Tac-Toe", "description": "Classic X and O game"},
            {"name": "Snake", "description": "Multiplayer Snake game"}
        ]
        
        # Network
        self.socket = None
        self.connection = None
        self.is_host = False
        self.connected = False
        self.ip_input = ""
        self.port = 5555
        self.input_active = False
        
        # Player info
        self.username = "Player"
        self.stats = {
            "games_played": 0,
            "games_won": 0
        }
        
        # Clock for controlling frame rate
        self.clock = pygame.time.Clock()
        
    def run(self):
        running = True
        while running:
            if self.state == GameState.MAIN_MENU:
                running = self.main_menu()
            elif self.state == GameState.WAITING_FOR_CONNECTION:
                self.waiting_for_connection()
            elif self.state == GameState.GAME_SELECTION:
                self.game_selection()
            elif self.state == GameState.PLAYING:
                self.play_game()
                
        # Clean up
        if self.socket:
            self.socket.close()
        pygame.quit()
        sys.exit()
        
    def main_menu(self):
        while True:
            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    return False
                    
                if event.type == pygame.KEYDOWN:
                    if self.input_active:
                        if event.key == pygame.K_RETURN:
                            self.input_active = False
                        elif event.key == pygame.K_BACKSPACE:
                            self.ip_input = self.ip_input[:-1]
                        else:
                            self.ip_input += event.unicode
                            
                if event.type == pygame.MOUSEBUTTONDOWN:
                    x, y = event.pos
                    
                    # Host game button
                    if 300 <= x <= 500 and 200 <= y <= 250:
                        self.is_host = True
                        self.setup_connection()
                        self.state = GameState.WAITING_FOR_CONNECTION
                        return True
                        
                    # Join game button
                    if 300 <= x <= 500 and 300 <= y <= 350:
                        self.input_active = True
                        
                    # IP input field
                    if 300 <= x <= 500 and 360 <= y <= 390:
                        self.input_active = True
                        
                    # Connect button
                    if 300 <= x <= 500 and 400 <= y <= 450:
                        if self.ip_input:
                            self.is_host = False
                            self.setup_connection(self.ip_input)
                            self.state = GameState.WAITING_FOR_CONNECTION
                            return True
                    
                    # Username input button
                    if 300 <= x <= 500 and 500 <= y <= 550:
                        # Prompt for username
                        pygame.draw.rect(self.screen, (50, 50, 50), (250, 275, 300, 100))
                        text_input = ""
                        input_done = False
                        
                        while not input_done:
                            for evt in pygame.event.get():
                                if evt.type == pygame.KEYDOWN:
                                    if evt.key == pygame.K_RETURN:
                                        input_done = True
                                        if text_input:
                                            self.username = text_input
                                    elif evt.key == pygame.K_BACKSPACE:
                                        text_input = text_input[:-1]
                                    else:
                                        text_input += evt.unicode
                                
                            # Draw input dialog
                            pygame.draw.rect(self.screen, (50, 50, 50), (250, 275, 300, 100))
                            prompt = self.menu_font.render("Enter username:", True, (255, 255, 255))
                            input_text = self.menu_font.render(text_input, True, (255, 255, 255))
                            self.screen.blit(prompt, (270, 285))
                            self.screen.blit(input_text, (270, 325))
                            pygame.display.flip()
            
            # Clear screen
            self.screen.fill((0, 0, 0))
            
            # Draw title
            title = self.title_font.render("Gaming Hub", True, (255, 255, 255))
            self.screen.blit(title, (self.width//2 - title.get_width()//2, 50))
            
            # Draw buttons
            pygame.draw.rect(self.screen, (50, 150, 50), (300, 200, 200, 50))
            host_text = self.menu_font.render("Host Game", True, (255, 255, 255))
            self.screen.blit(host_text, (350, 215))
            
            pygame.draw.rect(self.screen, (50, 50, 150), (300, 300, 200, 50))
            join_text = self.menu_font.render("Join Game", True, (255, 255, 255))
            self.screen.blit(join_text, (350, 315))
            
            # IP input field
            pygame.draw.rect(self.screen, (30, 30, 30), (300, 360, 200, 30))
            ip_text = self.menu_font.render(self.ip_input, True, (255, 255, 255))
            self.screen.blit(ip_text, (310, 365))
            
            # Connect button
            pygame.draw.rect(self.screen, (100, 100, 150), (300, 400, 200, 50))
            connect_text = self.menu_font.render("Connect", True, (255, 255, 255))
            self.screen.blit(connect_text, (350, 415))
            
            # Username button
            pygame.draw.rect(self.screen, (150, 100, 100), (300, 500, 200, 50))
            username_text = self.menu_font.render(f"Username: {self.username}", True, (255, 255, 255))
            self.screen.blit(username_text, (310, 515))
            
            # Draw stats
            stats_text = self.menu_font.render(
                f"Games: {self.stats['games_played']}  Wins: {self.stats['games_won']}", 
                True, (200, 200, 200))
            self.screen.blit(stats_text, (20, self.height - 40))
            
            pygame.display.flip()
            self.clock.tick(30)
            
    def setup_connection(self, ip=None):
        try:
            self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            
            if self.is_host:
                self.socket.bind(('', self.port))
                self.socket.listen(1)
            else:
                self.socket.connect((ip, self.port))
                self.connection = self.socket
                self.connected = True
        except Exception as e:
            print(f"Connection error: {e}")
            self.state = GameState.MAIN_MENU
            
    def waiting_for_connection(self):
        start_time = pygame.time.get_ticks()
        
        while True:
            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    if self.socket:
                        self.socket.close()
                    pygame.quit()
                    sys.exit()
                    
                if event.type == pygame.KEYDOWN and event.key == pygame.K_ESCAPE:
                    self.state = GameState.MAIN_MENU
                    return
                    
            # Clear screen
            self.screen.fill((0, 0, 0))
            
            # Draw waiting message
            if self.is_host:
                msg = "Waiting for a player to join..."
                
                # Accept connection if it's the host
                if not self.connected:
                    self.socket.settimeout(0.1)  # Non-blocking
                    try:
                        self.connection, _ = self.socket.accept()
                        self.connected = True
                    except socket.timeout:
                        pass
            else:
                msg = "Connecting to host..."
            
            waiting_text = self.menu_font.render(msg, True, (255, 255, 255))
            self.screen.blit(waiting_text, (self.width//2 - waiting_text.get_width()//2, self.height//2))
            
            # Draw timeout message and cancel button
            elapsed = (pygame.time.get_ticks() - start_time) // 1000
            timeout_text = self.menu_font.render(f"Timeout in: {30 - elapsed} seconds", True, (200, 200, 200))
            self.screen.blit(timeout_text, (self.width//2 - timeout_text.get_width()//2, self.height//2 + 40))
            
            # Cancel button
            pygame.draw.rect(self.screen, (150, 50, 50), (300, 400, 200, 50))
            cancel_text = self.menu_font.render("Cancel", True, (255, 255, 255))
            self.screen.blit(cancel_text, (370, 415))
            
            pygame.display.flip()
            self.clock.tick(30)
            
            # Check for cancel button click
            for event in pygame.event.get():
                if event.type == pygame.MOUSEBUTTONDOWN:
                    x, y = event.pos
                    if 300 <= x <= 500 and 400 <= y <= 450:
                        self.state = GameState.MAIN_MENU
                        return
            
            # Check connection status or timeout
            if self.connected:
                self.state = GameState.GAME_SELECTION
                return
                
            if elapsed > 30:  # Timeout after 30 seconds
                self.state = GameState.MAIN_MENU
                return
                
    def game_selection(self):
        try:
            # Exchange usernames
            if self.connection:
                # Send username
                self.connection.send(json.dumps({"username": self.username}).encode())
                
                # Receive opponent username
                self.connection.settimeout(5.0)
                data = self.connection.recv(1024).decode()
                opponent_data = json.loads(data)
                opponent_username = opponent_data.get("username", "Opponent")
                
                # Reset timeout
                self.connection.settimeout(None)
        except:
            self.state = GameState.MAIN_MENU
            return
        
        selected_game = None
        
        while True:
            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    if self.connection:
                        self.connection.close()
                    if self.socket:
                        self.socket.close()
                    pygame.quit()
                    sys.exit()
                    
                if event.type == pygame.KEYDOWN and event.key == pygame.K_ESCAPE:
                    self.state = GameState.MAIN_MENU
                    return
                    
                if event.type == pygame.MOUSEBUTTONDOWN:
                    x, y = event.pos
                    
                    # Check game selection
                    for i, game in enumerate(self.games):
                        if 200 <= x <= 600 and (150 + i*120) <= y <= (220 + i*120):
                            selected_game = i
                            
                            # Send game selection to opponent
                            try:
                                self.connection.send(json.dumps({"game_selection": i}).encode())
                                
                                # Start the game
                                self.state = GameState.PLAYING
                                self.current_game = selected_game
                                return
                            except:
                                self.state = GameState.MAIN_MENU
                                return
                    
                    # Back button
                    if 50 <= x <= 150 and 50 <= y <= 80:
                        self.state = GameState.MAIN_MENU
                        return
            
            # Check if opponent selected a game
            try:
                self.connection.settimeout(0.1)  # Non-blocking
                data = self.connection.recv(1024).decode()
                if data:
                    game_data = json.loads(data)
                    if "game_selection" in game_data:
                        selected_game = game_data["game_selection"]
                        self.state = GameState.PLAYING
                        self.current_game = selected_game
                        return
            except socket.timeout:
                pass
            except:
                self.state = GameState.MAIN_MENU
                return
            
            # Clear screen
            self.screen.fill((0, 0, 0))
            
            # Draw back button
            pygame.draw.rect(self.screen, (100, 100, 100), (50, 50, 100, 30))
            back_text = self.menu_font.render("Back", True, (255, 255, 255))
            self.screen.blit(back_text, (75, 55))
            
            # Draw title
            title = self.title_font.render("Select a Game", True, (255, 255, 255))
            self.screen.blit(title, (self.width//2 - title.get_width()//2, 50))
            
            # Draw opponent info
            opponent_text = self.menu_font.render(f"Playing against: {opponent_username}", True, (200, 200, 200))
            self.screen.blit(opponent_text, (self.width//2 - opponent_text.get_width()//2, 100))
            
            # Draw game options
            for i, game in enumerate(self.games):
                pygame.draw.rect(self.screen, (50, 50, 100), (200, 150 + i*120, 400, 70))
                game_name = self.menu_font.render(game["name"], True, (255, 255, 255))
                game_desc = self.menu_font.render(game["description"], True, (200, 200, 200))
                self.screen.blit(game_name, (220, 160 + i*120))
                self.screen.blit(game_desc, (220, 190 + i*120))
            
            pygame.display.flip()
            self.clock.tick(30)
            
    def play_game(self):
        game = None
        
        # Create the selected game
        if self.current_game == 0:
            game = PongGame(self.screen, self.is_host, self.connection)
        elif self.current_game == 1:
            game = TicTacToeGame(self.screen, self.is_host, self.connection)
        elif self.current_game == 2:
            game = SnakeGame(self.screen, self.is_host, self.connection)
        
        if game:
            # Run the game
            result = game.run()
            
            # Update stats
            self.stats["games_played"] += 1
            if hasattr(game, 'winner') and game.winner == game.player_piece:
                self.stats["games_won"] += 1
            
            self.state = result
        else:
            self.state = GameState.GAME_SELECTION

if __name__ == "__main__":
    hub = GamingHub()
    hub.run()
