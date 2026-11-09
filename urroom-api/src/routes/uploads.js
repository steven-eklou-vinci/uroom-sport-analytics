import express from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';

const router = express.Router();

const uploadRoot = path.resolve('uploads');
const videosDir = path.join(uploadRoot, 'videos');

fs.mkdirSync(videosDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, videosDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.mp4';
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '');
    const safeBase = base || 'video';
    cb(null, `${safeBase}-${Date.now()}${ext}`);
  }
});

const upload = multer({ storage });

router.post('/videos', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const urlPath = `/uploads/videos/${req.file.filename}`;
  res.status(201).json({
    url: `${baseUrl}${urlPath}`,
    path: urlPath,
    filename: req.file.filename
  });
});

export default router;
