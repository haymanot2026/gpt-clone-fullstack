
import dbConnection from "../../../../db/db.config.js";

export const getRecentConversationRows = async (limit = 5) => {
  const normalizedLimit = Number.parseInt(limit, 10);

  const safeLimit =
    Number.isInteger(normalizedLimit) && normalizedLimit > 0
      ? Math.min(normalizedLimit, 20)
      : 5;

  const [rows] = await dbConnection.execute(
    `SELECT id, role, content, token_count, created_at
     FROM conversations
     ORDER BY id DESC
     LIMIT ?`,
    [safeLimit]
  );

  return rows.reverse();
};

export const getMessageById = async (messageId) => {
  const [rows] = await dbConnection.execute(
    `SELECT id, role, content, token_count, created_at
     FROM conversations
     WHERE id = ?
     LIMIT 1`,
    [messageId]
  );

  if (!rows[0]) return null;

  return {
    id: rows[0].id,
    role: rows[0].role,
    content: rows[0].content,
    tokenCount: Number(rows[0].token_count || 0),
    createdAt: rows[0].created_at,
  };
};

export const createUserMessage = async (question) => {
  const query = `
    INSERT INTO conversations (content, role)
    VALUES (?, ?)
  `;

  const [result] = await dbConnection.execute(query, [
    question,
    "user",
  ]);

  return result.insertId;
};

export const createAssistantMessage = async ({ content, tokenCount }) => {
  const query = `
    INSERT INTO conversations (role, content, token_count)
    VALUES (?, ?, ?)
  `;

  const [result] = await dbConnection.execute(query, [
    "assistant",
    content,
    tokenCount ?? 0,
  ]);

  return result.insertId;
};
