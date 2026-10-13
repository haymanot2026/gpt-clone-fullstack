import express from "express";
import { createConversationController, getConversationController } from "../controller/chat.controller.js";

const chatRouter = express.Router();

// /api/chat/conversations
chatRouter.post('/conversations', createConversationController);

chatRouter.get('/conversations', getConversationController);

export default chatRouter;