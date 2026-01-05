const { body, param, query } = require('express-validator');
const mongoose = require('mongoose');

// Validation pour l'enregistrement d'utilisateur
const validateUserRegistration = [
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Le prénom doit contenir entre 2 et 50 caractères'),
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Le nom doit contenir entre 2 et 50 caractères'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email invalide'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Le mot de passe doit contenir au moins 6 caractères')
];

// Validation pour la connexion
const validateUserLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email invalide'),
  body('password')
    .notEmpty()
    .withMessage('Mot de passe requis')
];

// Validation pour la mise à jour du profil
const validateProfileUpdate = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Le prénom doit contenir entre 2 et 50 caractères'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Le nom doit contenir entre 2 et 50 caractères'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Email invalide'),
  body('phone')
    .optional()
    .trim()
    .matches(/^\+\d{1,4}\s\d{6,15}$/)
    .withMessage('Format de téléphone invalide. Utilisez le format: +33 612345678')
];

// Validation pour le profil d'hôte
const validateHostProfile = [
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('La bio ne peut pas dépasser 500 caractères')
];

// Validation pour le changement de mot de passe
const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Mot de passe actuel requis'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('Le nouveau mot de passe doit contenir au moins 6 caractères')
];

// Validation pour la recherche
const validateSearchQuery = [
  query('q')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Terme de recherche requis')
];

// Validation simple pour ObjectId - middleware personnalisé
const validateObjectId = (req, res, next) => {
  // Vérifier tous les paramètres qui finissent par 'Id'
  for (const [key, value] of Object.entries(req.params)) {
    if (key.endsWith('Id') && !mongoose.Types.ObjectId.isValid(value)) {
      return res.status(400).json({
        success: false,
        message: `${key} invalide`
      });
    }
  }
  next();
};

// Validation simple pour User ObjectId
const validateUserObjectId = [
  param('userId')
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('ID utilisateur invalide');
      }
      return true;
    })
];

// Validation pour les coordonnées
const validateCoordinates = [
  query('longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude invalide'),
  query('latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude invalide')
];

// Validation simple pour la mise à jour de listing
const validateListingUpdate = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage('Le titre doit contenir entre 5 et 100 caractères')
];

// Validation pour le statut
const validateStatusUpdate = [
  body('status')
    .isIn(['active', 'inactive', 'draft'])
    .withMessage('Statut invalide')
];

// Validations pour les chats
const validateChatCreation = [
  body('participantId')
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('ID participant invalide');
      }
      return true;
    })
];

const validateMessage = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Le message doit contenir entre 1 et 1000 caractères')
];

const validateMessageEdit = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Le message doit contenir entre 1 et 1000 caractères')
];

// Validations pour les réservations
const validateBookingCreation = [
  body('listingId')
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('ID listing invalide');
      }
      return true;
    }),
  body('checkIn')
    .isISO8601()
    .withMessage('Date d\'arrivée invalide')
    .custom((value) => {
      const checkInDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (checkInDate < today) {
        throw new Error('La date d\'arrivée ne peut pas être dans le passé');
      }
      return true;
    }),
  body('checkOut')
    .isISO8601()
    .withMessage('Date de départ invalide')
    .custom((value, { req }) => {
      const checkOutDate = new Date(value);
      const checkInDate = new Date(req.body.checkIn);
      if (checkOutDate <= checkInDate) {
        throw new Error('La date de départ doit être après la date d\'arrivée');
      }
      return true;
    }),
  body('guests')
    .isObject()
    .withMessage('Informations invités invalides'),
  body('guests.adults')
    .isInt({ min: 1, max: 16 })
    .withMessage('Nombre d\'adultes invalide (1-16)'),
  body('guests.children')
    .optional()
    .isInt({ min: 0, max: 10 })
    .withMessage('Nombre d\'enfants invalide (0-10)'),
  body('guests.infants')
    .optional()
    .isInt({ min: 0, max: 5 })
    .withMessage('Nombre de bébés invalide (0-5)'),
  body('guests.pets')
    .optional()
    .isInt({ min: 0, max: 5 })
    .withMessage('Nombre d\'animaux invalide (0-5)'),

  body('specialRequests')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Les demandes spéciales ne peuvent pas dépasser 500 caractères'),
  body('guestMessage')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Le message ne peut pas dépasser 1000 caractères')
];

const validateBookingAction = [
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('La raison ne peut pas dépasser 500 caractères')
];

module.exports = {
  validateUserRegistration,
  validateUserLogin,
  validateProfileUpdate,
  validateHostProfile,
  validatePasswordChange,
  validateSearchQuery,
  validateListingUpdate,
  validateStatusUpdate,
  validateObjectId,
  validateUserObjectId,
  validateCoordinates,
  validateChatCreation,
  validateMessage,
  validateMessageEdit,
  validateBookingCreation,
  validateBookingAction
};