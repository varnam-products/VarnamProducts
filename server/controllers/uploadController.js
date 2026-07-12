import cloudinary from '../config/cloudinary.js';

// @desc    Upload Single Product Image
// @route   POST /api/upload/product
export const uploadProductImage = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    res.status(200).json({
      success: true,
      url: req.file.path,
      publicId: req.file.filename,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Upload Single Category Image
// @route   POST /api/upload/category
export const uploadCategoryImage = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    res.status(200).json({
      success: true,
      url: req.file.path,
      publicId: req.file.filename,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Upload Single Banner Image
// @route   POST /api/upload/banner
export const uploadBannerImage = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    res.status(200).json({
      success: true,
      url: req.file.path,
      publicId: req.file.filename,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Upload Single Banner Video
// @route   POST /api/upload/banner-video
// Cloudinary (free plan) is asked to trim to the first 10 seconds and cap
// resolution at upload time via uploadMiddleware's transformation. As a
// safety net, we also check the returned duration here and delete the
// asset if it somehow still came back longer than expected.
export const uploadBannerVideo = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No video file uploaded' });

    const duration = req.file.duration ?? null;

    if (duration && duration > 11) {
      try {
        await cloudinary.uploader.destroy(req.file.filename, { resource_type: 'video' });
      } catch (_) {
        // non-fatal — orphaned asset can be cleaned up manually if this fails
      }
      return res.status(400).json({
        success: false,
        message: 'Video is longer than the 10-second limit. Please trim it and try again.',
      });
    }

    res.status(200).json({
      success: true,
      url: req.file.path,
      publicId: req.file.filename,
      duration,
      resourceType: 'video',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Upload Multiple Product Images
// @route   POST /api/upload/products/multiple
export const uploadMultipleProductImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded' });
    }

    const uploadedImages = req.files.map((file) => ({
      url: file.path,
      publicId: file.filename,
    }));

    res.status(200).json({
      success: true,
      data: uploadedImages,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete Image or Video from Cloudinary
// @route   DELETE /api/upload
// Pass resourceType: 'video' in the body when deleting a banner video —
// Cloudinary defaults to 'image' and silently no-ops on video public IDs
// otherwise.
export const deleteAsset = async (req, res) => {
  try {
    const { publicId, resourceType } = req.body;
    if (!publicId) return res.status(400).json({ success: false, message: 'Cloudinary publicId is required' });

    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType === 'video' ? 'video' : 'image',
    });

    if (result.result === 'not_found') {
      return res.status(404).json({ success: false, message: 'Asset not found on Cloudinary remote cloud' });
    }

    res.status(200).json({ success: true, message: 'Asset successfully purged from storage layers' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};