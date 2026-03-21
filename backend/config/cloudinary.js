const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const dotenv = require('dotenv');

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'skwap_uploads',
    allowed_formats: ['jpg', 'jpeg', 'png'],
    // Removed transformation during upload to speed up response.
    // Cloudinary supports on-the-fly resizing via URL.
  },
});

module.exports = { cloudinary, storage };
