const express = require('express');
const { pool, uuidv4 } = require('../database');

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { title, content, tags = [], gratitude } = req.body;
    const userId = req.user.id;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const id = uuidv4();
    await pool.query(
      `INSERT INTO journal_entries (id, user_id, title, content, tags, gratitude) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, userId, title, content, JSON.stringify(tags), gratitude || null]
    );

    res.status(201).json({ success: true, id });
  } catch (error) {
    console.error('Journal create error:', error);
    res.status(500).json({ error: 'Failed to create journal entry' });
  }
});

router.get('/', async (req, res) => {
  try {
    const search = req.query.search ? `%${req.query.search}%` : null;
    const userId = req.user.id;
    let result;

    if (search) {
      result = await pool.query(
        `SELECT * FROM journal_entries 
         WHERE user_id = $1 AND (title ILIKE $2 OR content ILIKE $2)
         ORDER BY created_at DESC`,
        [userId, search]
      );
    } else {
      result = await pool.query(
        `SELECT * FROM journal_entries WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
        [userId]
      );
    }

    // Parse tags back to array
    const entries = result.rows.map(row => ({
      ...row,
      tags: row.tags ? JSON.parse(row.tags) : []
    }));

    res.json({ entries });
  } catch (error) {
    console.error('Journal fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch journal entries' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    await pool.query('DELETE FROM journal_entries WHERE id = $1 AND user_id = $2', [id, userId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete entry' });
  }
});

const gratitudePrompts = [
  "What's one small thing that made you smile today?",
  "Who is someone you're grateful to have in your life?",
  "What's a simple pleasure you enjoyed recently?"
];

const reflectionPrompts = [
  "How are you really feeling right now, beneath the surface?",
  "What's been occupying your mind the most lately?",
  "What boundary do you need to set or reinforce?"
];

router.get('/prompts/gratitude', (req, res) => {
  const prompt = gratitudePrompts[Math.floor(Math.random() * gratitudePrompts.length)];
  res.json({ prompt });
});

router.get('/prompts/reflection', (req, res) => {
  const question = reflectionPrompts[Math.floor(Math.random() * reflectionPrompts.length)];
  res.json({ question });
});

module.exports = router;
