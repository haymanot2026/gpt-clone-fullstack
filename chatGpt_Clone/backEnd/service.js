import db from "../../../../db/db.config.js";
import { GoogleGenAI } from "@google/genai";

// Check if the table exists on startup and create it if it doesn't
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
    console.log("🔎 conversations table successfully verified/created!");
  } catch (err) {
    console.error("❌ Failed to create database table:", err.message);
  }
};
// Initialize table creation immediately
initDatabase();

// Helper function to fetch a specific message by its database ID
export const getMessageById = async (id) => {
  const [rows] = await db.execute(
    `SELECT id, role, content, token_count, created_at 
     FROM conversations 
     WHERE id = ?`,
    [id]
  );
  return rows[0] || null;
};

// Fallback to gemini-2.5-flash if GEMINI_MODEL is not set in environment variables
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const geminiClient = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export const getRecentConversationrows = async (limit = 5) => {
  const normlizedLimit = Number.parseInt(limit, 10);
  const safeLimit = Number.isNaN(normlizedLimit) || normlizedLimit <= 0 ? 5 : normlizedLimit;

  // Fetch recent message rows from the database
  const [rows] = await db.execute(
    `SELECT id, role, content, created_at
     FROM conversations
     ORDER BY id DESC
     LIMIT ?`,
    [safeLimit],
  );

  return rows.reverse();
};

const generateAssistsntAnswer = async ({ question, historyRows }) => {
  const formattedHistory = historyRows.map((row) => ({
    role: row.role === "assistant" ? "model" : "user",
    parts: [{ text: row.content }],
  }));

  const chat = geminiClient.chats.create({
    model: GEMINI_MODEL,
    config: {
      maxOutputTokens: 1024,
    },
    history: formattedHistory,
  });

  // Retry configuration for Gemini API calls
  let retries = 3;
  let delay = 2000; // Delay in milliseconds

  while (retries > 0) {
    try {
      const result = await chat.sendMessage({
        message: question,
      });

      return {
        text: result.text,
        totalTokens: result.usageMetadata.totalTokenCount ?? 0,
      };
    } catch (error) {
      // Retry mechanism if Gemini API returns a 503 Service Unavailable error
      if (error.message?.includes("503") && retries > 1) {
        console.log(`Gemini is busy, retrying in ${delay/1000} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        retries--;
        delay *= 2; // Exponential backoff
      } else {
        throw error; // Re-throw any other critical errors
      }
    }
  }
};

export async function createConversationService(question) {
  try {
    if (!question.trim()) {
      const error = new Error("question is required");
      error.status = 400;
      throw error;
    }

    const historyRows = await getRecentConversationrows(5);

    // FIXED: Changed "user" to 'user' (single quotes) to fix MySQL field list error
    const [result] = await db.execute(
      `INSERT INTO conversations (content, role)
       VALUES (?, 'user')`,
      [question],
    );

    const { text, totalTokens } = await generateAssistsntAnswer({
      question,
      historyRows,
    });

    // FIXED: Changed "assistant" to 'assistant' (single quotes) to fix MySQL field list error
    const [creatAssistantMessageResult] = await db.execute(
      `INSERT INTO conversations (content, role, token_count)
       VALUES (?, 'assistant', ?)`,
      [text, totalTokens],
    );

    const userConversation = await getMessageById(result.insertId);
    const assistantConversation = await getMessageById(
      creatAssistantMessageResult.insertId,
    );

    return {
      userConversation,
      assistantConversation,
    };
  } catch (error) {
    throw error;
  }
}
