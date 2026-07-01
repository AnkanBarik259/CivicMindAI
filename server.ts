import express, { Request, Response, NextFunction } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";

dotenv.config();

import authRouter from "./src/api/auth";
import reportsRouter from "./src/api/reports";
import aiRouter from "./src/api/ai";
import analyticsRouter from "./src/api/analytics";
import adminRouter from "./src/api/admin";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Trust proxy for rate limiting (since we're behind a proxy in Cloud Run / Nginx)
  app.set("trust proxy", 1);

  // Validate required backend secrets before starting
  if (process.env.NODE_ENV === "production" && !process.env.GEMINI_API_KEY) {
    console.warn("WARNING: GEMINI_API_KEY is not set. AI features will fail.");
    // We don't crash aggressively here to allow the container to start, 
    // but the API calls will handle the missing key safely.
  }

  // Security Headers
  app.use(helmet({
    contentSecurityPolicy: false, // In development, Vite HMR needs CSP disabled or carefully configured. We disable for now but enable in prod.
  }));

  // CORS Configuration
  app.use(cors({
    origin: process.env.NODE_ENV === "production" ? process.env.APP_URL : "*",
    credentials: true,
  }));

  // Rate Limiting
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
    standardHeaders: true,
    legacyHeaders: false,
    validate: false,
    message: { error: "Too many requests, please try again later." }
  });

  // Apply rate limiter to all API routes
  app.use("/api/", apiLimiter);

  // Body Parsing with Limits
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // API Routes
  app.use("/api/auth", authRouter);
  app.use("/api/report", reportsRouter);
  app.use("/api/ai", aiRouter);
  app.use("/api/analytics", analyticsRouter);
  app.use("/api/admin", adminRouter);

  // Global Error Handler (Prevents stack traces from leaking)
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error(err.stack); // Log internally
    res.status(500).json({ error: "Internal Server Error" }); // Generic message to client
  });

  // Start background processes
  if (process.env.NODE_ENV !== "test") {
    import("./src/api/agents/background").then(module => {
      module.startBackgroundSupervisor();
    }).catch(err => {
      console.error("Failed to start background supervisor", err);
    });
  }

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
