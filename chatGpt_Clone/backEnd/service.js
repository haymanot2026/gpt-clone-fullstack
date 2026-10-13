import db from "../../../../db/db.config.js";
import { GoogleGenAI } from "@google/genai";

// gemini-2.5-flash ተቀይሯል
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const geminiClient = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export const getRecentConversationrows = async (limit = 5) => {
  const normlizedLimit = Number.parseInt(limit, 10);
  const safeLimit = Number.isNaN(normlizedLimit) || normlizedLimit <= 0 ? 5 : normlizedLimit;

  // 2. 
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

  // 
  let retries = 3;
  let delay = 2000; // 

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
      // 
      if (error.message?.includes("503") && retries > 1) {
        console.log(`Gemini ቢዚ ነው፣ ከ ${delay/1000} ሰከንድ በኋላ ድጋሚ ይሞከራል...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        retries--;
        delay *= 2; // 
      } else {
        throw error; // 
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

    const [result] = await db.execute(
      `INSERT INTO conversations (content, role)
       VALUES (?, "user")`,
      [question],
    );

    const { text, totalTokens } = await generateAssistsntAnswer({
      question,
      historyRows,
    });

    const [creatAssistantMessageResult] = await db.execute(
      `INSERT INTO conversations (content, role, token_count)
       VALUES (?, ?, ?)`,
      [text, "assistant", totalTokens],
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
