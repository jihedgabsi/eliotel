const Booking = require('../models/Booking');

class ChatFirebaseController {
  // Enregistrer le chatId Firebase dans le booking
  async saveChatId(req, res, next) {
    try {
      const { bookingId, chatId } = req.body;
      const userId = req.user.userId;

      if (!bookingId || !chatId) {
        return res.status(400).json({
          success: false,
          message: 'bookingId et chatId sont requis'
        });
      }

      // Trouver le booking et vérifier que l'utilisateur est autorisé
      const booking = await Booking.findById(bookingId);
      
      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Réservation non trouvée'
        });
      }

      // Vérifier que l'utilisateur est le host ou le guest
      if (booking.host.toString() !== userId && booking.guest.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Non autorisé'
        });
      }

      // Enregistrer le chatId
      booking.firebaseChatId = chatId;
      await booking.save();

      res.status(200).json({
        success: true,
        message: 'Chat ID enregistré avec succès',
        data: {
          bookingId: booking._id,
          chatId: chatId
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Récupérer le chatId d'un booking
  async getChatId(req, res, next) {
    try {
      const { bookingId } = req.params;
      const userId = req.user.userId;

      const booking = await Booking.findById(bookingId);
      
      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Réservation non trouvée'
        });
      }

      // Vérifier que l'utilisateur est le host ou le guest
      if (booking.host.toString() !== userId && booking.guest.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Non autorisé'
        });
      }

      res.status(200).json({
        success: true,
        data: {
          bookingId: booking._id,
          chatId: booking.firebaseChatId
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Récupérer tous les chatIds de l'utilisateur
  async getMyChatIds(req, res, next) {
    try {
      const userId = req.user.userId;
      const role = req.query.role || 'guest'; // 'guest' ou 'host'

      const query = role === 'guest' 
        ? { guest: userId, firebaseChatId: { $ne: null } }
        : { host: userId, firebaseChatId: { $ne: null } };

      const bookings = await Booking.find(query)
        .select('_id firebaseChatId listing guest host')
        .populate('listing', 'title images')
        .populate('guest', 'firstName lastName avatar')
        .populate('host', 'firstName lastName avatar')
        .sort({ updatedAt: -1 });

      const chatIds = bookings.map(booking => ({
        bookingId: booking._id,
        chatId: booking.firebaseChatId,
        listing: booking.listing,
        guest: booking.guest,
        host: booking.host
      }));

      res.status(200).json({
        success: true,
        data: {
          chatIds: chatIds,
          count: chatIds.length
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ChatFirebaseController();
