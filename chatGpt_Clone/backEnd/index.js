import "dotenv/config";
import express from "express";
import cors from "cors";
import mainRouter from "./src/api/main.route.js";
import { errorHandler } from "./src/middleware/error-handler.js";
// Import the database connection pool configuration
import db from "./db/db.config.js"; 

const app = express();

// Automatically create the conversations table if it doesn't exist on server startup
const initDatabase = async () => {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS conversations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        role VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        token_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await db.execute(createTableQuery);
    console.log("🔎 conversations table successfully verified/created inside index.js!");
  } catch (err) {
    console.error("❌ Failed to create table inside index.js:", err.message);
  }
};
// Trigger the database initialization instantly
initDatabase();

const allowedOrigins = [
  "http://localhost:5173",
  "https://gpt-clone-fullstack.vercel.app",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.error("Blocked CORS origin:", origin);
      return callback(new Error(`CORS blocked origin: ${origin}`));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 204,
  })
);

app.use(express.json());

app.use("/api", mainRouter);

app.use(errorHandler);

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on port ${PORT}`);
});
