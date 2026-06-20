const express = require('express');
const { pool, uuidv4 } = require('../database');
const { generateResponse } = require('../services/llm');
const { analyzeSentiment, containsCrisisKeyword } = require('../services/sentiment');

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { message, sessionId, history = [] } = req.body;
    const userId = req.user.id; // from authenticateToken middleware

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // 1. Analyze Sentiment
    const sentiment = analyzeSentiment(message);
    const isCrisis = containsCrisisKeyword(message);

    // 2. Format history for LLM
    const formattedHistory = history.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // Add current message to history
    formattedHistory.push({ role: 'user', content: message });

    // 3. Save User Message to DB
    const userMsgId = uuidv4();
    const activeSessionId = sessionId || uuidv4();

    await pool.query(
      `INSERT INTO chat_messages (id, user_id, session_id, role, content, sentiment_score, crisis_flag) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userMsgId, userId, activeSessionId, 'user', message, sentiment.score, isCrisis]
    );

    // 4. Generate AI Response
    const responseText = await generateResponse(message, formattedHistory);

    // 5. Save AI Message to DB
    const aiMsgId = uuidv4();
    await pool.query(
      `INSERT INTO chat_messages (id, user_id, session_id, role, content) 
       VALUES ($1, $2, $3, $4, $5)`,
      [aiMsgId, userId, activeSessionId, 'assistant', responseText]
    );

    // 6. Return response
    res.json({
      response: responseText,
      sessionId: activeSessionId,
      crisis: { detected: isCrisis }
    });

  } catch (error) {
    console.error('Chat endpoint error:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
});

router.get('/history/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT role, content, created_at 
       FROM chat_messages 
       WHERE session_id = $1 AND user_id = $2 
       ORDER BY created_at ASC`,
      [sessionId, userId]
    );

    res.json({ history: result.rows });
  } catch (error) {
    console.error('History fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

router.delete('/history/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    await pool.query(
      `DELETE FROM chat_messages WHERE session_id = $1 AND user_id = $2`,
      [sessionId, userId]
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete history' });
  }
});

module.exports = router;
