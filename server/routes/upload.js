const express = require('express');
const multer = require('multer');
const { requireAdmin } = require('../middleware/auth');
const { uploadToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');

const router = express.Router();

// Multer with memory storage (no temp files on disk)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, WebP, and AVIF images are allowed'));
    }
  },
});

// All routes require admin authentication
router.use(requireAdmin);

// Upload a single image to Cloudinary
router.post('/', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: { message: 'No image file provided' } });
    }

    const folder = req.body.folder || 'bodhichitta/products';

    const result = await uploadToCloudinary(req.file.buffer, { folder });

    res.json({
      url: result.secure_url,
      public_id: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
    });
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({ error: { message: error.message || 'Failed to upload image' } });
  }
});

// Upload multiple images to Cloudinary (max 5)
router.post('/multiple', upload.array('images', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: { message: 'No image files provided' } });
    }

    const folder = req.body.folder || 'bodhichitta/products';

    const results = await Promise.all(
      req.files.map((file) => uploadToCloudinary(file.buffer, { folder }))
    );

    const images = results.map((r) => ({
      url: r.secure_url,
      public_id: r.public_id,
      width: r.width,
      height: r.height,
      format: r.format,
      bytes: r.bytes,
    }));

    res.json({ images });
  } catch (error) {
    console.error('Multiple image upload error:', error);
    res.status(500).json({ error: { message: error.message || 'Failed to upload images' } });
  }
});

// Delete an image from Cloudinary
router.delete('/', async (req, res) => {
  try {
    const { public_id } = req.body;

    if (!public_id) {
      return res.status(400).json({ error: { message: 'public_id is required' } });
    }

    await deleteFromCloudinary(public_id);
    res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    console.error('Image delete error:', error);
    res.status(500).json({ error: { message: 'Failed to delete image' } });
  }
});

module.exports = router;
