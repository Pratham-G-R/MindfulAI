const express = require('express');
const { pool, uuidv4 } = require('../database');

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { mood, moodScore, note } = req.body;
    const userId = req.user.id;

    if (!mood || !moodScore) {
      return res.status(400).json({ error: 'Mood and mood score are required' });
    }

    const id = uuidv4();
    await pool.query(
      `INSERT INTO mood_logs (id, user_id, mood, mood_score, note) 
       VALUES ($1, $2, $3, $4, $5)`,
      [id, userId, mood, moodScore, note || null]
    );

    res.status(201).json({ success: true, id });
  } catch (error) {
    console.error('Mood log error:', error);
    res.status(500).json({ error: 'Failed to log mood' });
  }
});

router.get('/history', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT * FROM mood_logs 
       WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '${days} days'
       ORDER BY created_at ASC`,
      [userId]
    );

    res.json({ entries: result.rows });
  } catch (error) {
    console.error('Mood history error:', error);
    res.status(500).json({ error: 'Failed to fetch mood history' });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.id;

    // Averages and counts
    const basicResult = await pool.query(`
      SELECT 
        COUNT(*) as total_entries,
        ROUND(AVG(mood_score)::numeric, 1) as average_score
      FROM mood_logs
      WHERE user_id = $1
    `, [userId]);

    // Mood distribution
    const distResult = await pool.query(`
      SELECT mood, COUNT(*) as count 
      FROM mood_logs 
      WHERE user_id = $1
      GROUP BY mood 
      ORDER BY count DESC
    `, [userId]);

    res.json({
      totalEntries: parseInt(basicResult.rows[0].total_entries) || 0,
      averageScore: parseFloat(basicResult.rows[0].average_score) || 0,
      moodDistribution: distResult.rows
    });
  } catch (error) {
    console.error('Mood stats error:', error);
    res.status(500).json({ error: 'Failed to fetch mood stats' });
  }
});

module.exports = router;
