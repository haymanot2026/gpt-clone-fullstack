import { GoogleGenAI } from "@google/genai";
import {
  getRecentConversationRows,
  getMessageById,
  createUserMessage,
  createAssistantMessage,
} from "../model/chat.model.js";

// Standardized fallback model pointing to the recommended active version
const Gemini_Model = process.env.Gemini_Model || "gemini-3.8-flash";

const geminiClient = new GoogleGenAI({
  apiKey: process.env.Gemini_API_KEY,
});

/**
 * Communicates with the Gemini API safely with a deep-inspecting retry mechanism
 */
const generateAssistantResponse = async ({ recentConversations, question }) => {
  const formattedHistory = recentConversations.map((row) => ({
    role: row.role === "assistant" ? "model" : "user",
    parts: [{ text: row.content }],
  }));

  const chat = geminiClient.chats.create({
    model: Gemini_Model,
    config: {
      maxOutputTokens: 1024,
    },
    history: formattedHistory,
  });

  let retries = 4; // Increased to 4 attempts to ride out longer global traffic spikes
  let delay = 2000; // Starts with a 2-second buffer

  while (retries > 0) {
    try {
      const response = await chat.sendMessage({
        message: question,
      });

      return {
        text: response.text,
        totalTokens: response.usageMetadata?.totalTokenCount || 0,
      };
    } catch (error) {
      // Stringify the full error object or extract message text to handle broad SDK variations
      const errorString = JSON.stringify(error) || "";
      const errorMessage = error.message || "";
      
      // Broad-spectrum check for any 503 or UNAVAILABLE status code signature
      const is503Error = 
        error.status === 503 || 
        errorMessage.includes("503") || 
        errorMessage.includes("UNAVAILABLE") ||
        errorString.includes("503") || 
        errorString.includes("UNAVAILABLE");

      if (is503Error && retries > 1) {
        console.warn(`[Gemini Overload] System busy. Waiting ${delay / 1000}s before automatic retry... (${retries - 1} slots left)`);
        
        await new Promise((resolve) => setTimeout(resolve, delay));
        retries--;
        delay *= 2; // Progressive exponential backoff (2s, 4s, 8s)
      } else {
        // Immediately bubble up other fatal faults (e.g., 400 Bad Request, invalid API keys)
        console.error("Critical error encountered, bubbling up execution path:", errorMessage);
        throw error;
      }
    }
  }
};

/**
 * Unified pipeline to manage user input injection, AI retrieval, and persistent database entries
 */
export async function createConversationService(question) {
  try {
    // 1. Validation
    if (!question?.trim()) {
      const error = new Error("Question is required");
      error.status = 400;
      throw error;
    }

    // 2. Get previous conversation history
    const recentConversations = await getRecentConversationRows(5);

    // 3. Save user question
    const userMessageId = await createUserMessage(question);

    // 4. Send question + history to Gemini invoking the deep-inspecting retry module
    const { text, totalTokens } = await generateAssistantResponse({
      recentConversations,
      question,
    });

    // 5. Save Gemini response
    const assistantMessageId = await createAssistantMessage({
      content: text,
      tokenCount: totalTokens,
    });

    // 6. Get saved user message
    const userConversation = await getMessageById(userMessageId);

    // 7. Get saved assistant message
    const assistantConversation = await getMessageById(assistantMessageId);

    // 8. Return both records back cleanly to the response pipeline
    return {
      userConversation,
      assistantConversation,
    };
  } catch (error) {
    throw error;
  }
}
