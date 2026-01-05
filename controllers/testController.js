const User = require('../models/User');
const Listing = require('../models/Listing');
const Booking = require('../models/Booking');

class TestController {
  // Endpoint de test général
  async testEndpoint(req, res, next) {
    try {
      res.status(200).json({
        success: true,
        message: 'API de test fonctionnelle',
        data: {
          timestamp: new Date().toISOString(),
          user: req.user ? {
            userId: req.user.userId,
            email: req.user.email
          } : null
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Obtenir des statistiques de base
  async getStats(req, res, next) {
    try {
      const [userCount, listingCount, bookingCount] = await Promise.all([
        User.countDocuments(),
        Listing.countDocuments(),
        Booking.countDocuments()
      ]);

      res.status(200).json({
        success: true,
        message: 'Statistiques de la base de données',
        data: {
          users: userCount,
          listings: listingCount,
          bookings: bookingCount
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Vérifier la santé de la base de données
  async healthCheck(req, res, next) {
    try {
      const mongoose = require('mongoose');
      const dbState = mongoose.connection.readyState;
      const states = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting'
      };

      res.status(200).json({
        success: true,
        message: 'Vérification de santé',
        data: {
          database: states[dbState],
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TestController();