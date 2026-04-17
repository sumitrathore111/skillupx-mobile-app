import express, { NextFunction, Request, Response } from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';

// Define file type inline to avoid Express.Multer.File namespace issues
interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
}

const router = express.Router();

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `image-${uniqueSuffix}${ext}`);
  }
});

// File filter to only allow images
const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'));
  }
};

// Configure multer upload
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});

// Upload single image
router.post('/image', upload.single('image'), (req, res: Response) => {
  try {
    const file = (req as any).file as UploadedFile | undefined;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Get the server URL from environment or construct from request
    const baseUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
    const imageUrl = `${baseUrl}/uploads/${file.filename}`;

    res.json({
      success: true,
      imageUrl,
      filename: file.filename,
      originalName: file.originalname,
      size: file.size
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to upload image';
    console.error('Upload error:', error);
    res.status(500).json({ error: errorMessage });
  }
});

// Upload multiple images (up to 5)
router.post('/images', upload.array('images', 5), (req, res: Response) => {
  try {
    const files = (req as any).files as UploadedFile[] | undefined;
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const baseUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
    
    const uploadedImages = files.map(file => ({
      imageUrl: `${baseUrl}/uploads/${file.filename}`,
      filename: file.filename,
      originalName: file.originalname,
      size: file.size
    }));

    res.json({
      success: true,
      images: uploadedImages
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to upload images';
    console.error('Upload error:', error);
    res.status(500).json({ error: errorMessage });
  }
});

// Error handling middleware for multer errors
router.use((err: Error, _req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    const multerErr = err as multer.MulterError;
    if (multerErr.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size too large. Maximum size is 5MB.' });
    }
    if (multerErr.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Too many files. Maximum is 5 files.' });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
});

export default router;
