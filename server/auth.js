const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'secret-key-123';

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, password, teamColor } = req.body;
    
    // Check if user exists
    const userCheck = await db.query('SELECT id FROM users WHERE username = $1', [username]);
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Kullanıcı adı zaten alınmış.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await db.query(
      'INSERT INTO users (username, password_hash, team_color) VALUES ($1, $2, $3) RETURNING id, username, team_color',
      [username, hashedPassword, teamColor || 'GRAY']
    );

    const user = newUser.rows[0];
    const token = jwt.sign({ id: user.id, username: user.username, teamColor: user.team_color }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, user });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Sunucu hatası.');
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const userQuery = await db.query('SELECT * FROM users WHERE username = $1', [username]);
    if (userQuery.rows.length === 0) {
      return res.status(400).json({ error: 'Geçersiz kullanıcı adı veya şifre.' });
    }

    const user = userQuery.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(400).json({ error: 'Geçersiz kullanıcı adı veya şifre.' });
    }

    const token = jwt.sign({ id: user.id, username: user.username, teamColor: user.team_color }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, user: { id: user.id, username: user.username, teamColor: user.team_color } });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Sunucu hatası.');
  }
});

module.exports = router;
