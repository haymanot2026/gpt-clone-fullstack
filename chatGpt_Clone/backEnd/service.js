
import db from "../../../../db/db.config.js";
import { GoogleGenAI } from "@google/genai";

// Initialize the conversations table before running queries.
const initDatabase = async () => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS conversations (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      role ENUM('user', 'assistant') NOT NULL,
      content TEXT NOT NULL,
      token_count INT UNSIGNED NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await db.execute(createTableQuery);
  console.log("Conversations table verified/created.");
};

// Keep the initialization promise so queries wait for the table.
const databaseReady = initDatabase().catch((error) => {
  console.error("Failed to initialize conversations table:", error.message);
  throw error;
});

const GEMINI_MODEL =
  process.env.GEMINI_MODEL || "gemini-2.5-flash";

const geminiApiKey = process.env.GEMINI_API_KEY;

const geminiClient = geminiApiKey
  ? new GoogleGenAI({ apiKey: geminiApiKey })
  : null;

const ensureDatabaseReady = async () => {
  await databaseReady;
};

export const getMessageById = async (id) => {
  await ensureDatabaseReady();

  const [rows] = await db.execute(
    `SELECT id, role, content, token_count, created_at
     FROM conversations
     WHERE id = ?`,
    [id]
  );

  return rows[0] || null;
};

export const getRecentConversationrows = async (limit = 5) => {
  await ensureDatabaseReady();

  const parsedLimit = Number.parseInt(limit, 10);
  const safeLimit =
    Number.isInteger(parsedLimit) && parsedLimit > 0
      ? Math.min(parsedLimit, 20)
      : 5;

  const [rows] = await db.execute(
    `SELECT id, role, content, token_count, created_at
     FROM conversations
     ORDER BY id DESC
     LIMIT ?`,
    [safeLimit]
  );

  return rows.reverse();
};

const generateAssistantAnswer = async ({ question, historyRows }) => {
  if (!geminiClient) {
    const error = new Error("GEMINI_API_KEY is not configured.");
    error.status = 500;
    throw error;
  }

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

  let retries = 3;
  let delay = 2000;

  while (retries > 0) {
    try {
      const result = await chat.sendMessage({
        message: question,
      });

      return {
        text: result.text || "",
        totalTokens: result.usageMetadata?.totalTokenCount ?? 0,
      };
    } catch (error) {
      const isTemporary =
        error.status === 503 ||
        error.status === 429 ||
        error.message?.includes("503") ||
        error.message?.includes("429");

      retries -= 1;

      if (!isTemporary || retries === 0) {
        throw error;
      }

      console.warn(
        `Gemini request failed temporarily. Retrying in ${delay / 1000}s...`
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2;
    }
  }

  throw new Error("Gemini request failed after retries.");
};

export async function createConversationService(question) {
  if (typeof question !== "string" || !question.trim()) {
    const error = new Error("Invalid question provided.");
    error.status = 400;
    throw error;
  }

  // Initialize the database if not already done
  await ensureDatabaseReady();

  // Fetch the conversation history
  const historyRows = await getRecentConversationrows(5);

  // Generate the assistant's answer
  const { text, totalTokens } = await generateAssistantAnswer({
    question,
    historyRows,
  });

  // Save the new conversation to the database
  const [result] = await db.execute(
    `INSERT INTO conversations (role, content, token_count) VALUES (?, ?, ?)`,
    ["user", question, 0]
  );

  const conversationId = result.insertId;

  // Save the assistant's response
  await db.execute(
    `INSERT INTO conversations (role, content, token_count) VALUES (?, ?, ?)`,
    ["assistant", text, totalTokens]
  );

  return { id: conversationId, text, totalTokens };
}