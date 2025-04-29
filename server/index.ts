import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { createServer } from "http";
import { drizzle } from "drizzle-orm/node-postgres";
const pg = require('pg');
const { Pool } = pg;

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Database connection with retry logic
const createPool = async (retries = 5, delay = 5000): Promise<typeof Pool> => {
  for (let i = 0; i < retries; i++) {
    try {
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });
      await pool.query('SELECT NOW()');
      return pool;
    } catch (error) {
      if (i === retries - 1) throw error;
      log(`Database connection attempt ${i + 1} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  let pool: typeof Pool;
  try {
    // Initialize database connection with retry
    pool = await createPool();
    log('Database connection established successfully');

    const server = await registerRoutes(app);

    // Setup Vite in development mode
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      log(`Server is running on port ${PORT}`);
      log(`WebSocket server is running at ws://localhost:${PORT}/ws`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      log('SIGTERM received. Shutting down gracefully...');
      pool.end(() => {
        log('Database pool closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      log('SIGINT received. Shutting down gracefully...');
      pool.end(() => {
        log('Database pool closed');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();
