import "dotenv/config";
import express from "express";
import cors from "cors";
import mainRouter from "./src/api/main.route.js";
import { errorHandler } from "./src/middleware/error-handler.js";

const app = express();

// 1. Restrict CORS access solely to the Frontend development port (Vite)
app.use(cors({ origin: "http://localhost:5173" }));

// 2. Middleware to parse incoming JSON payloads
app.use(express.json());

// 3. Base routing for the API endpoints
app.use("/api", mainRouter);

// 4. Global centralized error handling middleware
app.use(errorHandler);

/**
 * Starts the Express server on port 3000
 */
async function startServer() {
  try {
    // 5. Streamlined listening setup that correctly delegates runtime failures to the catch block
   const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on port ${PORT}`);
});
  } catch (error) {
    console.error("Error starting the server:", error.message);
  }
}

startServer();
