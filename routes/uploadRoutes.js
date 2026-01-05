const express = require('express');
const multer = require('multer');
const upload = require('../middleware/upload');
const { uploadToImageServer } = require('../middleware/upload');

const router = express.Router();

// Route pour uploader une ou plusieurs images vers le serveur d'images
router.post('/upload', upload.array('images', 10), uploadToImageServer, (req, res) => {
  try {
    // Vérifier s'il y a des URLs d'images
    if (!req.imageUrls || req.imageUrls.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Aucune image uploadée',
        code: 'NO_IMAGE_UPLOADED'
      });
    }

    // Si une seule image
    if (req.imageUrls.length === 1) {
      const imageUrl = req.imageUrls[0];

      console.log(`Image uploaded successfully:`, {
        url: imageUrl
      });

      return res.status(200).json({
        success: true,
        message: 'Image uploadée avec succès',
        imageUrl: imageUrl
      });
    }

    // Si plusieurs images
    const uploadedImages = req.imageUrls.map(url => ({
      imageUrl: url
    }));

    console.log(`${req.imageUrls.length} images uploaded successfully`);

    res.status(200).json({
      success: true,
      message: `${req.imageUrls.length} images uploadées avec succès`,
      count: req.imageUrls.length,
      images: uploadedImages
    });

  } catch (error) {
    console.error('Erreur upload:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'upload des images',
      code: 'UPLOAD_PROCESSING_ERROR',
      details: { error: error.message }
    });
  }
});

// Route pour supprimer une image (à implémenter selon votre API d'images)
router.delete('/delete/:imageId', async (req, res) => {
  try {
    // TODO: Implémenter la suppression d'image selon votre API
    res.status(501).json({
      success: false,
      message: 'Suppression d\'image non implémentée',
      code: 'NOT_IMPLEMENTED'
    });

  } catch (error) {
    console.error('Erreur suppression:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de l\'image',
      code: 'DELETE_ERROR',
      details: { error: error.message }
    });
  }
});

// Gestion des erreurs multer
router.use((error, req, res, next) => {
  console.error('Upload error:', error);

  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          success: false,
          message: 'Fichier trop volumineux (max 5MB)',
          code: 'FILE_TOO_LARGE',
          details: { maxSize: '5MB' }
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          message: 'Champ de fichier inattendu',
          code: 'UNEXPECTED_FIELD'
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          message: 'Trop de fichiers uploadés',
          code: 'TOO_MANY_FILES'
        });
      default:
        return res.status(400).json({
          success: false,
          message: 'Erreur lors du traitement du fichier',
          code: 'MULTER_ERROR',
          details: { multerCode: error.code }
        });
    }
  }

  if (error.message === 'Seules les images sont autorisées') {
    return res.status(400).json({
      success: false,
      message: 'Seules les images sont autorisées (JPEG, PNG, WebP)',
      code: 'INVALID_FILE_TYPE'
    });
  }

  // Erreur générique du serveur
  res.status(500).json({
    success: false,
    message: 'Erreur interne du serveur lors de l\'upload',
    code: 'INTERNAL_SERVER_ERROR'
  });
});

module.exports = router;