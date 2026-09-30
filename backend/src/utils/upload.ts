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

// Per-entity subfolders under uploads/ — every uploaded file lives in the
// folder of the entity it belongs to (uploads/product/..., uploads/category/...)
const entityDirs: Record<string, string> = {
  product: path.join(uploadsDir, 'product'),
  category: path.join(uploadsDir, 'category'),
  banner: path.join(uploadsDir, 'banner'),
  settings: path.join(uploadsDir, 'settings'),
};
Object.values(entityDirs).forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    logger.info(`Uploads sub-directory created: ${dir}`);
  }
});

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

// Files are stored with a temporary uuid name at upload time (the entity id
// is not known yet) and renamed to "<entityId>.<ext>" by the controllers
// right after the entity is created.
const makeEntityStorage = (dir: string) =>
  multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, dir);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
      cb(null, `${crypto.randomUUID()}${ext}`);
    },
  });

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

// Entity-specific uploads: files go into uploads/<entity>/ and are renamed to
// "<entityId>.<ext>" by the controllers once the entity is created.
// Files are stored with a temporary uuid name at upload time because the
// entity id is not known until the DB document is created.

// Multiple product images — field name: "images" (max 8), stored in uploads/product/
export const uploadProductImages = (fieldName = 'images', maxCount = 8) =>
  multer({
    storage: makeEntityStorage(entityDirs.product),
    fileFilter,
    limits: { fileSize: MAX_FILE_SIZE },
  }).array(fieldName, maxCount);

// Single category image — field name: "image", stored in uploads/category/
export const uploadCategoryImage = (fieldName = 'image') =>
  multer({
    storage: makeEntityStorage(entityDirs.category),
    fileFilter,
    limits: { fileSize: MAX_FILE_SIZE },
  }).single(fieldName);

// Banner images — field names: "image" (desktop) and "mobileImage" (mobile).
// Both live in uploads/banner/ and are renamed to "<bannerId>.<ext>" (desktop)
// / "<bannerId>-mobile.<ext>" (mobile) by the controller.
export const BANNER_IMAGE_FIELDS = ['image', 'mobileImage'] as const;

export const uploadBannerImages = () =>
  multer({
    storage: makeEntityStorage(entityDirs.banner),
    fileFilter,
    limits: { fileSize: MAX_FILE_SIZE },
  }).fields(BANNER_IMAGE_FIELDS.map((name) => ({ name, maxCount: 1 })));

// Store logos — field names: "storeLogo", "logoLight", "logoDark"
// (all stored in uploads/settings/ and renamed to "<settingsId>[-light|-dark].<ext>")
export const SETTINGS_LOGO_FIELDS = ['storeLogo', 'logoLight', 'logoDark'] as const;

export const uploadSettingsLogos = () =>
  multer({
    storage: makeEntityStorage(entityDirs.settings),
    fileFilter,
    limits: { fileSize: MAX_FILE_SIZE },
  }).fields(SETTINGS_LOGO_FIELDS.map((name) => ({ name, maxCount: 1 })));

// Returns "/uploads/<filename>" for the uploaded file
export const getUploadedImagePath = (file?: Express.Multer.File): string | undefined =>
  file ? `/uploads/${file.filename}` : undefined;

// --- Video uploads (homepage shorts) ---
export const videosDir = path.join(uploadsDir, 'videos');
if (!fs.existsSync(videosDir)) {
  fs.mkdirSync(videosDir, { recursive: true });
  logger.info(`Videos directory created: ${videosDir}`);
}

const ALLOWED_VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime', // .mov
];

const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

const videoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, videosDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.mp4';
    const uniqueName = `${crypto.randomUUID()}${ext}`;
    cb(null, uniqueName);
  },
});

const videoFileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  if (ALLOWED_VIDEO_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Only video files are allowed (MP4, WEBM, MOV)', 400));
  }
};

const videoUpload = multer({
  storage: videoStorage,
  fileFilter: videoFileFilter,
  limits: { fileSize: MAX_VIDEO_SIZE },
});

// Single video upload — field name: "video"
export const uploadSingleVideo = (fieldName = 'video') => videoUpload.single(fieldName);

// Returns "/uploads/videos/<filename>" for the uploaded video
export const getUploadedVideoPath = (file?: Express.Multer.File): string | undefined =>
  file ? `/uploads/videos/${file.filename}` : undefined;

/**
 * Renames just-uploaded files to entity-ID-based names inside the entity's
 * subfolder and returns their public paths.
 * - Single file:  /uploads/<folder>/<entityId>.<ext>
 * - Multiple:     /uploads/<folder>/<entityId>-1.<ext>, -2, -3, ...
 * - With suffix:  /uploads/<folder>/<entityId><suffix>.<ext> (e.g. "-light")
 * If a target name is already taken (e.g. new images added to an existing
 * product), a short random suffix is appended so nothing is overwritten.
 * Rename failures never throw — the original upload path is kept instead.
 */
export const renameUploadedEntityFiles = (
  files: Express.Multer.File[] | undefined | null,
  folder: 'product' | 'category' | 'banner' | 'settings',
  entityId: string,
  /** Optional name suffix, e.g. "-light" → "<entityId>-light.png" */
  suffix = ''
): string[] => {
  if (!files || files.length === 0) return [];
  const dir = entityDirs[folder];

  return files.map((file, index) => {
    const ext =
      path.extname(file.originalname).toLowerCase() ||
      path.extname(file.filename) ||
      '.jpg';
    const prefix = suffix ? `${entityId}${suffix}` : entityId;
    let base = files.length === 1 ? prefix : `${prefix}-${index + 1}`;
    let target = path.join(dir, `${base}${ext}`);

    if (fs.existsSync(target)) {
      base = `${base}-${crypto.randomBytes(3).toString('hex')}`;
      target = path.join(dir, `${base}${ext}`);
    }

    try {
      fs.renameSync(file.path, target);
      return `/uploads/${folder}/${path.basename(target)}`;
    } catch (err) {
      logger.error(`Failed to rename uploaded file to ${target}: ${err}`);
      return `/uploads/${folder}/${file.filename}`;
    }
  });
};

/**
 * Deletes an uploaded file from the uploads folder (any subfolder).
 * Accepts the stored path (e.g. "/uploads/xxx.jpg", "/uploads/product/xxx.png"
 * or "/uploads/videos/xxx.mp4").
 * Path-traversal safe: only deletes files inside uploadsDir.
 */
export const deleteUploadedFile = (imagePath?: string | null): void => {
  if (!imagePath) return;

  if (!imagePath.startsWith('/uploads/')) return;
  const relative = imagePath.slice('/uploads/'.length);

  const filePath = path.join(uploadsDir, relative);
  // Safety: ensure resolved path stays inside uploadsDir
  if (!path.resolve(filePath).startsWith(path.resolve(uploadsDir))) return;

  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.info(`Uploaded file deleted: ${relative}`);
    }
  } catch (err) {
    logger.error(`Failed to delete uploaded file ${relative}: ${err}`);
  }
};