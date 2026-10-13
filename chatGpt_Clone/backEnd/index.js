
import "dotenv/config";
import express from "express";
import cors from "cors";
import mainRouter from "./src/api/main.route.js";
import { errorHandler } from "./src/middleware/error-handler.js";

const app = express();

// CORS: Allow local development and configured frontend URL
const allowedOrigins = [
  "http://localhost:5173",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without an Origin header (e.g. server-to-server)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
  })
);

// Parse incoming JSON
app.use(express.json());

// API routes
app.use("/api", mainRouter);

// Centralized error handler
app.use(errorHandler);

// Render provides PORT at runtime
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on port ${PORT}`);
});
