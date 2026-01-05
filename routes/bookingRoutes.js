const express = require('express');
const bookingController = require('../controllers/bookingController');
const { auth, requireHost } = require('../middleware/auth');
const {
  validateBookingCreation,
  validateBookingAction,
  validateObjectId
} = require('../middleware/validation');

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(auth);

// Routes pour les invités et hôtes
router.post('/', validateBookingCreation, bookingController.createBooking);
router.get('/my', bookingController.getMyBookings);
router.get('/stats', requireHost, bookingController.getBookingStats);
router.get('/:bookingId', validateObjectId, bookingController.getBookingById);

// Vérifier la disponibilité
router.get('/availability/:listingId', bookingController.checkAvailability);

// Obtenir les dates occupées
router.get('/occupied-dates/:listingId', bookingController.getOccupiedDates);

// Actions sur les réservations
router.patch('/:bookingId/confirm', [requireHost, validateObjectId], bookingController.confirmBooking);
router.patch('/:bookingId/reject', [requireHost, validateObjectId, validateBookingAction], bookingController.rejectBooking);
router.patch('/:bookingId/cancel', [validateObjectId, validateBookingAction], bookingController.cancelBooking);
router.patch('/:bookingId/complete', validateObjectId, bookingController.completeBooking);

module.exports = router;