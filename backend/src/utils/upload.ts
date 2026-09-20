import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { AppError } from './AppError';
import { logger } from './logger';

// Uploads directory at backend root (auto-created)
export const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  logger.info(`Uploads directory created: ${uploadsDir}`);
}

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    // Unique ID-based filename: <random-uuid>.<ext>
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const uniqueName = `${crypto.randomUUID()}${ext}`;
    cb(null, uniqueName);
  },
});

const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Only image files are allowed (JPEG, PNG, WEBP, GIF)', 400));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

// Single image upload — field name: "image"
export const uploadSingleImage = (fieldName = 'image') => upload.single(fieldName);

// Multiple images upload — field name: "images" (max 8)
export const uploadMultipleImages = (fieldName = 'images', maxCount = 8) =>
  upload.array(fieldName, maxCount);

// Returns "/uploads/<filename>" for the uploaded file
export const getUploadedImagePath = (file?: Express.Multer.File): string | undefined =>
  file ? `/uploads/${file.filename}` : undefined;

/**
 * Deletes an uploaded file from the uploads folder.
 * Accepts the stored image path (e.g. "/uploads/xxx.jpg").
 * Path-traversal safe: only deletes files inside uploadsDir.
 */
export const deleteUploadedFile = (imagePath?: string | null): void => {
  if (!imagePath || !imagePath.startsWith('/uploads/')) return;
  const filename = path.basename(imagePath);
  const filePath = path.join(uploadsDir, filename);
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.info(`Uploaded file deleted: ${filename}`);
    }
  } catch (err) {
    logger.error(`Failed to delete uploaded file ${filename}: ${err}`);
  }
};