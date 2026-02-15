import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import db from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit for image/video media
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/webm',
      'video/ogg',
      'video/quicktime',
      'video/x-m4v'
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only image/video media are allowed.'));
    }
  }
});

// POST /api/upload - upload image/video media
router.post('/', upload.fields([
  { name: 'media', maxCount: 1 },
  { name: 'image', maxCount: 1 } // Backward compatibility
]), async (req, res) => {
  try {
    const file = req.files?.media?.[0] || req.files?.image?.[0];

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { filename, originalname, mimetype, size } = file;

    // Save media record to database (optional - skip if db not available)
    try {
      await db.query(
        'INSERT INTO media (filename, original_name, mime_type, size) VALUES (?, ?, ?, ?)',
        [filename, originalname, mimetype, size]
      );
    } catch (dbError) {
      console.warn('Database insert skipped:', dbError.message);
    }

    // Return the URL path
    const url = `/uploads/${filename}`;

    res.json({
      success: true,
      filename,
      originalName: originalname,
      url,
      size,
      mimeType: mimetype
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    
    // Clean up uploaded file if database insert fails
    const file = req.files?.media?.[0] || req.files?.image?.[0];
    if (file) {
      fs.unlink(file.path, (err) => {
        if (err) console.error('Error deleting file:', err);
      });
    }
    
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// GET /api/upload/list - list all uploaded media
router.get('/list', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM media ORDER BY uploaded_at DESC LIMIT 100'
    );

    const media = rows.map(row => ({
      id: row.id,
      filename: row.filename,
      originalName: row.original_name,
      url: `/uploads/${row.filename}`,
      mimeType: row.mime_type,
      size: row.size,
      uploadedAt: row.uploaded_at
    }));

    res.json(media);
  } catch (error) {
    console.error('Error fetching media list:', error);
    res.status(500).json({ error: 'Failed to fetch media list' });
  }
});

// DELETE /api/upload/:filename - delete an uploaded file
router.delete('/:filename', authenticateToken, async (req, res) => {
  try {
    const { filename } = req.params;

    // Delete from database
    const [result] = await db.query(
      'DELETE FROM media WHERE filename = ?',
      [filename]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'File not found in database' });
    }

    // Delete physical file
    const filePath = path.join(uploadsDir, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({ success: true, message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

export default router;
