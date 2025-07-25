import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { fileStorage } from "./storage-handler";
import { seed } from "./seed";
import { env, validateEnvironment, logEnvironmentStatus } from "../config/environment";
import path from "path";

// Initialize environment and validate configuration
validateEnvironment();
logEnvironmentStatus();

const app = express();
app.use(express.json({ limit: `${env.MAX_FILE_SIZE}b` }));
app.use(express.urlencoded({ extended: false, limit: `${env.MAX_FILE_SIZE}b` }));

// Initialize database seeding based on environment
if (env.IS_DEVELOPMENT || env.IS_REPLIT) {
  console.log("⏩ Skipping database seeding - running in development/replit mode");
} else {
  console.log("🌱 Production environment detected - database seeding may be required");
}

try {
  // Only attempt seeding if database is available
  // await seed();
} catch (error) {
  console.log("Database unavailable, continuing without seeding");
}

// Serve uploaded files statically
app.use('/uploads', express.static(fileStorage.getUploadDirectory()));

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
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  // For Replit environment, force static serving since Vite dev has path issues
  serveStatic(app);

  // Serve the app on the configured port
  // In Replit, this must be 5000 (the only non-firewalled port)
  // In other environments, use the configured PORT
  const port = env.IS_REPLIT ? 5000 : env.PORT;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
