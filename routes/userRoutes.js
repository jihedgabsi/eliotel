const express = require('express');
const userController = require('../controllers/userController');
const { auth, requireAdmin } = require('../middleware/auth');
const {
  validateUserRegistration,
  validateUserLogin,
  validateProfileUpdate,
  validateHostProfile,
  validatePasswordChange,
  validateUserObjectId,
  validateObjectId,
  validateSearchQuery
} = require('../middleware/validation');
const upload = require('../middleware/upload');
const { uploadToImageServer } = require('../middleware/upload');

const router = express.Router();

// Routes publiques
router.post('/register', validateUserRegistration, userController.register);
router.post('/login', validateUserLogin, userController.login);
router.post('/google-auth', userController.googleAuth);

// Routes protégées (authentification requise)
router.use(auth);

// Profil utilisateur
router.get('/profile', userController.getProfile);
router.get('/me/debug', (req, res) => {
  // Endpoint de debug pour vérifier le rôle actuel
  res.json({
    success: true,
    user: {
      id: req.userDoc._id,
      email: req.userDoc.email,
      firstName: req.userDoc.firstName,
      lastName: req.userDoc.lastName,
      role: req.userDoc.role,
      isHost: req.userDoc.role === 'host'
    }
  });
});
router.put('/profile', validateProfileUpdate, userController.updateProfile);
router.put('/change-password', validatePasswordChange, userController.changePassword);

// Devenir hôte
router.post('/become-host', userController.becomeHost);

// Redevenir voyageur
router.post('/become-guest', userController.becomeGuest);

// Profil d'hôte
router.put('/host-profile', validateHostProfile, userController.updateHostProfile);

// Recherche et listing des utilisateurs
router.get('/hosts', userController.getHosts);
router.get('/search', validateSearchQuery, userController.searchUsers);

// Profil d'un hôte (authentification requise)
router.get('/host/:userId', validateUserObjectId, userController.getHostProfile);

// Routes de favoris (AVANT les routes admin pour éviter les conflits)
router.get('/favorites', userController.getFavorites);
router.post('/favorites/cleanup', userController.cleanupFavorites);
router.post(
  '/favorites/:listingId',
  validateObjectId, // Middleware pour s'assurer que :listingId est un ID Mongoose valide
  userController.toggleFavorite
);

// Routes admin uniquement (APRÈS les routes spécifiques)
router.get('/:userId', [validateUserObjectId, requireAdmin], userController.getUserById);

router.post(
  '/avatar',
  upload.single('avatar'),
  uploadToImageServer,
  userController.uploadAvatar
);

// Enregistrer le token FCM
router.post('/register-fcm-token', userController.registerFcmToken);

module.exports = router;