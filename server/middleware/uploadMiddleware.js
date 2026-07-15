import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary.js';

// Helper function to create dynamic folder destinations in Cloudinary
const createStorage = (folderName) => {
  return new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: `varnam-organic/${folderName}`,
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      transformation: [{ width: 800, height: 800, crop: 'limit', quality: 'auto' }], // Auto-optimization
    },
  });
};

// Custom file filter to ensure only images are processed
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images are permitted!'), false);
  }
};

// Video file filter — only accepts video/* mimetypes
const videoFileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only video files are permitted!'), false);
  }
};

// Configured Multer Storage Parsers
export const uploadProductStorage = multer({
  storage: createStorage('products'),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
  fileFilter,
});

export const uploadCategoryStorage = multer({
  storage: createStorage('categories'),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter,
});

// Blog cover images — wider crop (1200x630) matches the standard OG/social
// share image ratio, since these covers double as link-preview thumbnails.
export const uploadBlogStorage = multer({
  storage: new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'varnam-organic/blog',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      transformation: [{ width: 1200, height: 630, crop: 'limit', quality: 'auto' }],
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter,
});

export const uploadBannerStorage = multer({
  storage: createStorage('banners'),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB limit for banners
  },
  fileFilter,
});

// Banner VIDEO storage — free Cloudinary plan means we keep clips short and
// lean: hard-capped to the first 10 seconds and 1920x1080, with quality left
// as high as that budget allows. Even if an admin uploads a longer clip,
// Cloudinary trims it server-side so nothing over 10s ever gets stored.
export const uploadBannerVideoStorage = multer({
  storage: new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'varnam-organic/banners/videos',
      resource_type: 'video',
      allowed_formats: ['mp4', 'mov', 'webm', 'm4v'],
      transformation: [
        { start_offset: '0', end_offset: '10' },                         // hard-cap: first 10 seconds only
        { width: 1920, height: 1080, crop: 'limit', quality: 'auto:good' }, // high quality, capped resolution
      ],
    },
  }),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB — comfortable for a crisp 10s clip
  fileFilter: videoFileFilter,
});