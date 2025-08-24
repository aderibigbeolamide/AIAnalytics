import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
// import { registerRoutes } from "./routes"; // DISABLED - All routes migrated to MongoDB
// New organized routes
import { registerAuthRoutes } from "./routes/auth-routes";
import { registerEventRoutes } from "./routes/event-routes";
import { registerRegistrationRoutes } from "./routes/registration-routes";
import { registerPaymentRoutes } from "./routes/payment-routes";
import { registerOrganizationRoutes } from "./routes/organization-routes";
import { registerEmailRoutes } from "./routes/email-routes";
import { registerFaceRecognitionRoutes } from "./routes/face-recognition-routes";

// Legacy routes (to be migrated)
import { registerMongoSuperAdminRoutes } from "./mongo-super-admin-routes";
import { registerMongoDashboardRoutes } from "./mongo-dashboard-routes";
import { setupNotificationRoutes } from "./notification-routes";
import { setupChatbotRoutes } from "./chatbot-routes";
import { setupChatbotTestRoutes } from "./chatbot-test-route";
import { setupVite, serveStatic, log } from "./vite";
import { fileStorage } from "./storage-handler";
import { connectToMongoDB } from "./mongodb";
import { mongoAutoSeed } from "./mongo-auto-seed";
import { WebSocketChatServer } from "./websocket-chat";
import path from "path";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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
  // Connect to MongoDB
  await connectToMongoDB();
  
  // Run auto-seeding before starting the server
  await mongoAutoSeed();
  
  // Register new organized routes
  registerAuthRoutes(app);
  registerEventRoutes(app);
  registerRegistrationRoutes(app);
  registerPaymentRoutes(app);
  registerOrganizationRoutes(app);
  registerEmailRoutes(app);
  registerFaceRecognitionRoutes(app);
  
  // Register legacy routes (to be migrated)
  registerMongoSuperAdminRoutes(app);
  registerMongoDashboardRoutes(app);
  setupNotificationRoutes(app);
  setupChatbotRoutes(app);
  setupChatbotTestRoutes(app);
  
  // Register event reminder routes
  const { registerEventReminderRoutes } = await import("./event-reminder-routes.js");
  registerEventReminderRoutes(app);
  
  // Register analytics routes
  const { registerAnalyticsRoutes } = await import("./mongo-analytics-routes.js");
  registerAnalyticsRoutes(app);
  
  // Register MongoDB routes (includes ticket lookup)
  const { registerMongoRoutes } = await import("./mongo-routes.js");
  registerMongoRoutes(app);
  
  // Create HTTP server directly since legacy routes disabled
  const server = createServer(app);
  
  // Initialize WebSocket chat server
  const chatServer = new WebSocketChatServer(server);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();