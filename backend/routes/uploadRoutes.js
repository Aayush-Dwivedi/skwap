const express = require('express');
const multer = require('multer');
const { protect } = require('../middlewares/authMiddleware');
const { storage } = require('../config/cloudinary');

const router = express.Router();

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

router.post('/', protect, (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      console.error('Multer/Cloudinary Error:', err);
      // Try to log to a file if possible
      try {
        require('fs').appendFileSync('error.log', `[${new Date().toISOString()}] Upload Error: ${err.message}\n`);
      } catch (e) {}
      return res.status(400).send({ message: err.message || 'Upload failed' });
    }
    if (!req.file) {
      return res.status(400).send({ message: 'No file uploaded' });
    }
    
    console.log('Image uploaded to cloud:', req.file.path);
    res.send({
      message: 'Image uploaded to cloud',
      url: req.file.path, 
    });
  });
});

module.exports = router;
