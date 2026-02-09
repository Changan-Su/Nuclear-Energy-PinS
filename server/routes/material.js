import express from 'express';
import db from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/material - retrieve entire material JSON
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT material FROM site_data WHERE id = 1');
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Material not found' });
    }

    res.json(rows[0].material);
  } catch (error) {
    console.error('Error fetching material:', error);
    res.status(500).json({ error: 'Failed to fetch material' });
  }
});

// PUT /api/material - replace entire material JSON
router.put('/', authenticateToken, async (req, res) => {
  try {
    const material = req.body;

    if (!material || typeof material !== 'object') {
      return res.status(400).json({ error: 'Invalid material data' });
    }

    await db.query(
      'INSERT INTO site_data (id, material) VALUES (1, ?) ON DUPLICATE KEY UPDATE material = ?',
      [JSON.stringify(material), JSON.stringify(material)]
    );

    res.json({ success: true, message: 'Material updated successfully' });
  } catch (error) {
    console.error('Error updating material:', error);
    res.status(500).json({ error: 'Failed to update material' });
  }
});

// PATCH /api/material - partial update by JSON path
router.patch('/', authenticateToken, async (req, res) => {
  try {
    const { path, value } = req.body;

    if (!path) {
      return res.status(400).json({ error: 'Path is required' });
    }

    // Fetch current material
    const [rows] = await db.query('SELECT material FROM site_data WHERE id = 1');
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Material not found' });
    }

    const material = rows[0].material;

    // Update the value at the specified path
    const keys = path.split('.');
    let current = material;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;

    // Save updated material
    await db.query(
      'UPDATE site_data SET material = ? WHERE id = 1',
      [JSON.stringify(material)]
    );

    res.json({ success: true, message: 'Material updated successfully', path, value });
  } catch (error) {
    console.error('Error patching material:', error);
    res.status(500).json({ error: 'Failed to patch material' });
  }
});

export default router;
