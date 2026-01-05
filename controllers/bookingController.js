const bookingService = require('../services/bookingService');
const { validationResult } = require('express-validator');

class BookingController {
  // Créer une nouvelle réservation
  async createBooking(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Données invalides',
          errors: errors.array()
        });
      }

      const guestId = req.user.userId;
      const booking = await bookingService.createBooking(req.body, guestId);

      res.status(201).json({
        success: true,
        message: 'Réservation créée avec succès',
        data: {
          booking
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Obtenir les réservations de l'utilisateur connecté
  async getMyBookings(req, res, next) {
    try {
      const userId = req.user.userId;
      const role = req.query.role || 'guest'; // 'guest' ou 'host'
      const status = req.query.status;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      // Auto-compléter les réservations passées si c'est un voyageur
      if (role === 'guest') {
        await bookingService.autoCompleteBookings(userId);
      }

      const result = await bookingService.getUserBookings(userId, role, status, page, limit);

      res.status(200).json({
        success: true,
        bookings: result.bookings,
        totalCount: result.pagination.totalBookings,
        currentPage: result.pagination.currentPage,
        totalPages: result.pagination.totalPages
      });
    } catch (error) {
      next(error);
    }
  }

  // Obtenir une réservation par ID
  async getBookingById(req, res, next) {
    try {
      const { bookingId } = req.params;
      const userId = req.user.userId;

      const booking = await bookingService.getBookingById(bookingId, userId);

      res.status(200).json({
        success: true,
        data: {
          booking
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Confirmer une réservation (hôte)
  async confirmBooking(req, res, next) {
    try {
      const { bookingId } = req.params;
      const { hostMessage } = req.body;
      const hostId = req.user.userId;

      const booking = await bookingService.confirmBooking(bookingId, hostId, hostMessage);

      res.status(200).json({
        success: true,
        message: 'Réservation confirmée avec succès',
        data: {
          booking
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Rejeter une réservation (hôte)
  async rejectBooking(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Données invalides',
          errors: errors.array()
        });
      }

      const { bookingId } = req.params;
      const { reason } = req.body;
      const hostId = req.user.userId;

      const booking = await bookingService.rejectBooking(bookingId, hostId, reason);

      res.status(200).json({
        success: true,
        message: 'Réservation rejetée',
        data: {
          booking
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Annuler une réservation
  async cancelBooking(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Données invalides',
          errors: errors.array()
        });
      }

      const { bookingId } = req.params;
      const { reason } = req.body;
      const userId = req.user.userId;

      const booking = await bookingService.cancelBooking(bookingId, userId, reason);

      res.status(200).json({
        success: true,
        message: 'Réservation annulée avec succès',
        data: {
          booking
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Marquer une réservation comme terminée
  async completeBooking(req, res, next) {
    try {
      const { bookingId } = req.params;

      const booking = await bookingService.completeBooking(bookingId);

      res.status(200).json({
        success: true,
        message: 'Réservation marquée comme terminée',
        data: {
          booking
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Obtenir les statistiques de réservation (hôte)
  async getBookingStats(req, res, next) {
    try {
      const hostId = req.user.userId;
      const stats = await bookingService.getBookingStats(hostId);

      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }

  // Vérifier la disponibilité d'une annonce
  async checkAvailability(req, res, next) {
    try {
      const { listingId } = req.params;
      const { checkIn, checkOut } = req.query;

      if (!checkIn || !checkOut) {
        return res.status(400).json({
          success: false,
          message: 'Dates d\'arrivée et de départ requises'
        });
      }

      const result = await bookingService.checkListingAvailability(listingId, checkIn, checkOut);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // Obtenir les dates occupées pour une annonce
  async getOccupiedDates(req, res, next) {
    try {
      const { listingId } = req.params;
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Dates de début et de fin requises'
        });
      }

      const result = await bookingService.getOccupiedDates(listingId, startDate, endDate);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new BookingController();