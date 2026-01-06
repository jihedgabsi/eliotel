const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const { Readable } = require('stream');

// Configuration du stockage en mémoire
const storage = multer.memoryStorage();

// Filtre pour les types de fichiers
const fileFilter = (req, file, cb) => {
  console.log('File filter check:', {
    originalname: file.originalname,
    mimetype: file.mimetype,
    fieldname: file.fieldname
  });

  // Types MIME autorisés
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp',
    'image/gif',
    'application/octet-stream'
  ];

  // Vérifier le type MIME
  if (!allowedMimeTypes.includes(file.mimetype.toLowerCase())) {
    console.log('Rejected file - invalid MIME type:', file.mimetype);
    return cb(new Error('Seules les images sont autorisées'), false);
  }

  console.log('File accepted:', file.originalname);
  cb(null, true);
};

// Configuration de multer avec stockage en mémoire
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max par fichier
    files: 10, // Jusqu'à 10 fichiers
  },
  fileFilter: fileFilter
});

// Middleware pour uploader les images vers l'API externe
const uploadToImageServer = async (req, res, next) => {
  try {
    // Gérer à la fois req.file (single) et req.files (array)
    const files = [];
    if (req.file) {
      files.push(req.file);
    } else if (req.files && req.files.length > 0) {
      files.push(...req.files);
    }

    // Si aucun fichier, passer au middleware suivant
    if (files.length === 0) {
      return next();
    }

    const imageUrls = [];
    const IMAGE_SERVER_URL = process.env.IMAGE_SERVER_URL;

    if (!IMAGE_SERVER_URL) {
      throw new Error('IMAGE_SERVER_URL is not configured');
    }

    for (const file of files) {
      // Create FormData properly for Node.js
      const formData = new FormData();
      
      // Convert buffer to readable stream
      const readableStream = new Readable();
      readableStream.push(file.buffer);
      readableStream.push(null); // End the stream

      // Append the stream with proper metadata
      formData.append('image', readableStream, {
        filename: file.originalname || 'image.jpg',
        contentType: file.mimetype
      });

      const imageResponse = await axios.post(IMAGE_SERVER_URL, formData, {
        headers: {
          ...formData.getHeaders()
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity
      });

      if (!imageResponse.data.success || !imageResponse.data.imageUrl) {
        console.error('Failed to upload an image:', imageResponse.data);
        continue;
      }

      imageUrls.push(imageResponse.data.imageUrl);
    }

    if (imageUrls.length === 0 && files.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Failed to upload any images successfully'
      });
    }

    // Ajouter les URLs des images à la requête
    req.imageUrls = imageUrls;
    next();
  } catch (error) {
    console.error('Error uploading images:', error);
    next(error);
  }
};

module.exports = upload;
module.exports.uploadToImageServer = uploadToImageServer;