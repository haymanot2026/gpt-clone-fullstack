import { createConversationService } from "../service/chat.service.js";

import { getRecentConversationRows } from "../model/chat.model.js";

export async function createConversationController(req, res) {
  try {
    const { question } = req.body;

    const result = await createConversationService(question);
    res.status(201).json({
      status: "success",
      message: "Conversation created successfully",
      data: result,
    });
  } catch (error) {
    throw error;
  }
}

export async function getConversationController(req, res) {
  try {
    const result = await getRecentConversationRows(100);
    res.status(200).json({
      status: "success",
      message: " Conversation fetched successfully.",
      data: result,
    });
  } catch (error) {
    throw error;
  }
}
