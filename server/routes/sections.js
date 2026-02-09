import express from 'express';
import db from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/sections - get section configuration array
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT material FROM site_data WHERE id = 1');
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Material not found' });
    }

    const material = rows[0].material;
    const sections = material.config?.sections || [];

    res.json(sections);
  } catch (error) {
    console.error('Error fetching sections:', error);
    res.status(500).json({ error: 'Failed to fetch sections' });
  }
});

// PUT /api/sections - update entire sections array (for reordering/toggling)
router.put('/', authenticateToken, async (req, res) => {
  try {
    const sections = req.body;

    if (!Array.isArray(sections)) {
      return res.status(400).json({ error: 'Sections must be an array' });
    }

    // Fetch current material
    const [rows] = await db.query('SELECT material FROM site_data WHERE id = 1');
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Material not found' });
    }

    const material = rows[0].material;
    
    if (!material.config) {
      material.config = {};
    }
    
    material.config.sections = sections;

    // Save updated material
    await db.query(
      'UPDATE site_data SET material = ? WHERE id = 1',
      [JSON.stringify(material)]
    );

    res.json({ success: true, message: 'Sections updated successfully' });
  } catch (error) {
    console.error('Error updating sections:', error);
    res.status(500).json({ error: 'Failed to update sections' });
  }
});

// POST /api/sections - add a new section from template
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { id, template, insertAfter } = req.body;

    if (!id || !template) {
      return res.status(400).json({ error: 'Section id and template are required' });
    }

    // Fetch current material
    const [rows] = await db.query('SELECT material FROM site_data WHERE id = 1');
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Material not found' });
    }

    const material = rows[0].material;
    
    if (!material.config) {
      material.config = {};
    }
    
    if (!material.config.sections) {
      material.config.sections = [];
    }

    // Find insertion point
    let insertIndex = material.config.sections.length;
    if (insertAfter !== undefined) {
      const afterIndex = material.config.sections.findIndex(s => s.id === insertAfter);
      if (afterIndex >= 0) {
        insertIndex = afterIndex + 1;
      }
    }

    // Create new section
    const newSection = {
      id,
      template,
      enabled: true,
      order: insertIndex
    };

    // Insert section
    material.config.sections.splice(insertIndex, 0, newSection);

    // Reorder
    material.config.sections.forEach((s, i) => {
      s.order = i;
    });

    // Initialize section data if not exists
    if (!material.index) {
      material.index = {};
    }
    if (!material.index[id]) {
      material.index[id] = {
        title: 'New Section',
        description: 'Edit this section content'
      };
    }

    // Save updated material
    await db.query(
      'UPDATE site_data SET material = ? WHERE id = 1',
      [JSON.stringify(material)]
    );

    res.json({ success: true, message: 'Section added successfully', section: newSection });
  } catch (error) {
    console.error('Error adding section:', error);
    res.status(500).json({ error: 'Failed to add section' });
  }
});

// DELETE /api/sections/:id - remove a section
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch current material
    const [rows] = await db.query('SELECT material FROM site_data WHERE id = 1');
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Material not found' });
    }

    const material = rows[0].material;
    
    if (!material.config?.sections) {
      return res.status(404).json({ error: 'No sections found' });
    }

    // Remove section
    const initialLength = material.config.sections.length;
    material.config.sections = material.config.sections.filter(s => s.id !== id);

    if (material.config.sections.length === initialLength) {
      return res.status(404).json({ error: 'Section not found' });
    }

    // Reorder
    material.config.sections.forEach((s, i) => {
      s.order = i;
    });

    // Save updated material
    await db.query(
      'UPDATE site_data SET material = ? WHERE id = 1',
      [JSON.stringify(material)]
    );

    res.json({ success: true, message: 'Section deleted successfully' });
  } catch (error) {
    console.error('Error deleting section:', error);
    res.status(500).json({ error: 'Failed to delete section' });
  }
});

export default router;
