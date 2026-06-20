const express = require('express');
const { pool, uuidv4 } = require('../database');

const router = express.Router();

router.post('/session', async (req, res) => {
  try {
    const { technique, duration, completed } = req.body;
    const userId = req.user.id;

    if (!technique || !duration) {
      return res.status(400).json({ error: 'Technique and duration are required' });
    }

    const id = uuidv4();
    await pool.query(
      `INSERT INTO breathing_sessions (id, user_id, technique, duration, completed) 
       VALUES ($1, $2, $3, $4, $5)`,
      [id, userId, technique, duration, completed ? true : false]
    );

    res.status(201).json({ success: true, id });
  } catch (error) {
    console.error('Breathing session error:', error);
    res.status(500).json({ error: 'Failed to log session' });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.id;

    // Get simple count of completed sessions as a proxy for 'streak'
    const result = await pool.query(`
      SELECT COUNT(*) as completed_count 
      FROM breathing_sessions 
      WHERE user_id = $1 AND completed = TRUE
    `, [userId]);

    res.json({ currentStreak: parseInt(result.rows[0].completed_count) || 0 });
  } catch (error) {
    console.error('Breathing stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;
