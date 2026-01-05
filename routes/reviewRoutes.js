const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { auth } = require('../middleware/auth');
const { body } = require('express-validator');

// Validation pour la création d'un avis
const createReviewValidation = [
  body('bookingId').notEmpty().withMessage('ID de réservation requis'),
  body('rating').isFloat({ min: 1, max: 5 }).withMessage('Note entre 1 et 5 requise'),
  body('comment').isLength({ min: 10, max: 1000 }).withMessage('Commentaire entre 10 et 1000 caractères requis')
];

// Validation pour la réponse à un avis
const respondReviewValidation = [
  body('response').isLength({ min: 1, max: 500 }).withMessage('Réponse entre 1 et 500 caractères requise')
];

// Routes protégées (authentification requise)
router.post('/', auth, createReviewValidation, reviewController.createReview);
router.get('/listing/:listingId', reviewController.getListingReviews);
router.get('/user/:userId', reviewController.getUserReviews);
router.get('/can-review/:bookingId', auth, reviewController.canReview);
router.get('/booking/:bookingId', auth, reviewController.getBookingReview);
router.post('/:reviewId/respond', auth, respondReviewValidation, reviewController.respondToReview);
router.get('/:reviewId', reviewController.getReviewById);
router.delete('/:reviewId', auth, reviewController.deleteReview);

module.exports = router;
