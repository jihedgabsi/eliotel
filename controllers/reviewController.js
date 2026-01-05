const reviewService = require('../services/reviewService');
const { validationResult } = require('express-validator');

class ReviewController {
  // Créer un avis
  async createReview(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Données invalides',
          errors: errors.array()
        });
      }

      const userId = req.user.userId;
      const review = await reviewService.createReview(req.body, userId);

      res.status(201).json({
        success: true,
        message: 'Avis créé avec succès',
        data: {
          review
        }
      });
    } catch (error) {
      if (error.message.includes('non trouvée') || 
          error.message.includes('autorisé') ||
          error.message.includes('déjà laissé') ||
          error.message.includes('confirmée') ||
          error.message.includes('après la fin')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      next(error);
    }
  }

  // Obtenir les avis d'une annonce
  async getListingReviews(req, res, next) {
    try {
      const { listingId } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      const result = await reviewService.getListingReviews(listingId, page, limit);

      res.status(200).json({
        success: true,
        reviews: result.reviews,
        totalCount: result.pagination.totalReviews,
        currentPage: result.pagination.currentPage,
        totalPages: result.pagination.totalPages
      });
    } catch (error) {
      next(error);
    }
  }

  // Obtenir les avis reçus par un utilisateur
  async getUserReviews(req, res, next) {
    try {
      const { userId } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      const result = await reviewService.getUserReviews(userId, page, limit);

      res.status(200).json({
        success: true,
        reviews: result.reviews,
        totalCount: result.pagination.totalReviews,
        currentPage: result.pagination.currentPage,
        totalPages: result.pagination.totalPages
      });
    } catch (error) {
      next(error);
    }
  }

  // Obtenir un avis par ID
  async getReviewById(req, res, next) {
    try {
      const { reviewId } = req.params;
      const review = await reviewService.getReviewById(reviewId);

      res.status(200).json({
        success: true,
        data: {
          review
        }
      });
    } catch (error) {
      if (error.message.includes('non trouvé')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      next(error);
    }
  }

  // Répondre à un avis
  async respondToReview(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Données invalides',
          errors: errors.array()
        });
      }

      const { reviewId } = req.params;
      const { response } = req.body;
      const userId = req.user.userId;

      const review = await reviewService.respondToReview(reviewId, userId, response);

      res.status(200).json({
        success: true,
        message: 'Réponse ajoutée avec succès',
        data: {
          review
        }
      });
    } catch (error) {
      if (error.message.includes('non trouvé') || error.message.includes('autorisé')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      next(error);
    }
  }

  // Vérifier si un utilisateur peut laisser un avis
  async canReview(req, res, next) {
    try {
      const { bookingId } = req.params;
      const userId = req.user.userId;

      const result = await reviewService.canReview(bookingId, userId);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // Supprimer un avis
  async deleteReview(req, res, next) {
    try {
      const { reviewId } = req.params;
      const userId = req.user.userId;

      const result = await reviewService.deleteReview(reviewId, userId);

      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      if (error.message.includes('non trouvé') || error.message.includes('autorisé')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      next(error);
    }
  }

  // Obtenir l'avis d'un booking spécifique
  async getBookingReview(req, res, next) {
    try {
      const { bookingId } = req.params;
      const userId = req.user.userId;

      const review = await reviewService.getBookingReview(bookingId, userId);

      if (!review) {
        return res.status(404).json({
          success: false,
          message: 'Aucun avis trouvé pour cette réservation'
        });
      }

      res.status(200).json({
        success: true,
        data: {
          review
        }
      });
    } catch (error) {
      if (error.message.includes('non trouvé') || error.message.includes('autorisé')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      next(error);
    }
  }
}

module.exports = new ReviewController();
