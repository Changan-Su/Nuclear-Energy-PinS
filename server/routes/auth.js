import express from 'express';
import jwt from 'jsonwebtoken';

const router = express.Router();

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  const correctPassword = process.env.CMS_PASSWORD || '2026PinS';

  if (password !== correctPassword) {
    return res.status(401).json({ error: 'Incorrect password' });
  }

  // Generate JWT token
  const token = jwt.sign(
    { authenticated: true, timestamp: Date.now() },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({
    success: true,
    token,
    expiresIn: '24h'
  });
});

// POST /api/auth/verify - verify if token is still valid
router.post('/verify', (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ valid: false, error: 'Invalid or expired token' });
    }
    res.json({ valid: true, decoded });
  });
});

export default router;
