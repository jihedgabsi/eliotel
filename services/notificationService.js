const admin = require('firebase-admin');
const User = require('../models/User');

class NotificationService {
  /**
   * Envoyer une notification FCM à un utilisateur
   * @param {String} userId - ID de l'utilisateur destinataire
   * @param {String} title - Titre de la notification
   * @param {String} body - Corps de la notification
   * @param {Object} data - Données supplémentaires
   * @returns {Promise<Object>}
   */
  async sendNotificationToUser(userId, title, body, data = {}) {
    try {
      // Récupérer l'utilisateur et son token FCM
      const user = await User.findById(userId).select('fcmToken firstName lastName');
      
      if (!user) {
        console.log(`Utilisateur ${userId} non trouvé`);
        return { success: false, message: 'Utilisateur non trouvé' };
      }

      if (!user.fcmToken) {
        console.log(`Utilisateur ${user.firstName} ${user.lastName} n'a pas de token FCM`);
        return { success: false, message: 'Token FCM non disponible' };
      }

      // Préparer le message
      const message = {
        token: user.fcmToken,
        notification: {
          title,
          body
        },
        data: {
          ...data,
          click_action: 'FLUTTER_NOTIFICATION_CLICK'
        },
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'booking_notifications'
          }
        },
        apns: {
          headers: {
            'apns-priority': '10'
          },
          payload: {
            aps: {
              sound: 'default',
              badge: 1
            }
          }
        }
      };

      // Envoyer la notification
      const response = await admin.messaging().send(message);
      console.log(`Notification envoyée avec succès à ${user.firstName} ${user.lastName}:`, response);
      
      return {
        success: true,
        messageId: response,
        recipient: `${user.firstName} ${user.lastName}`
      };
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la notification:', error);
      
      // Si le token est invalide, le supprimer de la base de données
      if (error.code === 'messaging/invalid-registration-token' || 
          error.code === 'messaging/registration-token-not-registered') {
        await User.findByIdAndUpdate(userId, { $set: { fcmToken: null } });
        console.log(`Token FCM invalide supprimé pour l'utilisateur ${userId}`);
      }
      
      return {
        success: false,
        message: error.message,
        code: error.code
      };
    }
  }

  /**
   * Envoyer une notification de nouvelle réservation à l'hôte
   */
  async notifyNewBooking(booking) {
    try {
      const title = '🎉 Nouvelle réservation !';
      const body = `${booking.guest.firstName} souhaite réserver votre propriété du ${this.formatDate(booking.checkIn)} au ${this.formatDate(booking.checkOut)}`;
      
      const data = {
        type: 'new_booking',
        bookingId: booking._id.toString(),
        guestId: booking.guest._id.toString(),
        listingId: booking.listing._id.toString(),
        status: booking.status
      };

      return await this.sendNotificationToUser(booking.host._id, title, body, data);
    } catch (error) {
      console.error('Erreur notifyNewBooking:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Envoyer une notification de confirmation de réservation au voyageur
   */
  async notifyBookingConfirmed(booking) {
    try {
      const title = '✅ Réservation confirmée !';
      const body = `Votre réservation chez ${booking.host.firstName} a été confirmée pour le ${this.formatDate(booking.checkIn)}`;
      
      const data = {
        type: 'booking_confirmed',
        bookingId: booking._id.toString(),
        hostId: booking.host._id.toString(),
        listingId: booking.listing._id.toString(),
        status: 'confirmed'
      };

      return await this.sendNotificationToUser(booking.guest._id, title, body, data);
    } catch (error) {
      console.error('Erreur notifyBookingConfirmed:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Envoyer une notification de rejet de réservation au voyageur
   */
  async notifyBookingRejected(booking) {
    try {
      const title = '❌ Réservation refusée';
      const body = `Votre demande de réservation chez ${booking.host.firstName} a été refusée`;
      
      const data = {
        type: 'booking_rejected',
        bookingId: booking._id.toString(),
        hostId: booking.host._id.toString(),
        listingId: booking.listing._id.toString(),
        status: 'rejected'
      };

      return await this.sendNotificationToUser(booking.guest._id, title, body, data);
    } catch (error) {
      console.error('Erreur notifyBookingRejected:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Envoyer une notification d'annulation de réservation
   */
  async notifyBookingCancelled(booking, cancelledByUserId) {
    try {
      const cancelledByGuest = booking.guest._id.toString() === cancelledByUserId.toString();
      const recipientId = cancelledByGuest ? booking.host._id : booking.guest._id;
      const cancellerName = cancelledByGuest ? booking.guest.firstName : booking.host.firstName;
      
      const title = '🚫 Réservation annulée';
      const body = cancelledByGuest 
        ? `${cancellerName} a annulé sa réservation du ${this.formatDate(booking.checkIn)}`
        : `${cancellerName} a annulé votre réservation du ${this.formatDate(booking.checkIn)}`;
      
      const data = {
        type: 'booking_cancelled',
        bookingId: booking._id.toString(),
        cancelledBy: cancelledByGuest ? 'guest' : 'host',
        listingId: booking.listing._id.toString(),
        status: 'cancelled'
      };

      return await this.sendNotificationToUser(recipientId, title, body, data);
    } catch (error) {
      console.error('Erreur notifyBookingCancelled:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Envoyer une notification de réservation terminée
   */
  async notifyBookingCompleted(booking) {
    try {
      // Notifier le voyageur
      const guestTitle = '🎊 Séjour terminé !';
      const guestBody = `Merci d'avoir séjourné chez ${booking.host.firstName}. N'oubliez pas de laisser un avis !`;
      
      const guestData = {
        type: 'booking_completed',
        bookingId: booking._id.toString(),
        hostId: booking.host._id.toString(),
        listingId: booking.listing._id.toString(),
        action: 'leave_review'
      };

      // Notifier l'hôte
      const hostTitle = '🎊 Séjour terminé !';
      const hostBody = `Le séjour de ${booking.guest.firstName} est terminé. N'oubliez pas de laisser un avis !`;
      
      const hostData = {
        type: 'booking_completed',
        bookingId: booking._id.toString(),
        guestId: booking.guest._id.toString(),
        listingId: booking.listing._id.toString(),
        action: 'leave_review'
      };

      // Envoyer les deux notifications
      const guestNotif = await this.sendNotificationToUser(booking.guest._id, guestTitle, guestBody, guestData);
      const hostNotif = await this.sendNotificationToUser(booking.host._id, hostTitle, hostBody, hostData);

      return {
        success: true,
        guestNotification: guestNotif,
        hostNotification: hostNotif
      };
    } catch (error) {
      console.error('Erreur notifyBookingCompleted:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Envoyer un rappel de check-in
   */
  async notifyCheckInReminder(booking) {
    try {
      const title = '🏠 Rappel de check-in';
      const body = `Votre check-in chez ${booking.host.firstName} est prévu demain !`;
      
      const data = {
        type: 'checkin_reminder',
        bookingId: booking._id.toString(),
        hostId: booking.host._id.toString(),
        listingId: booking.listing._id.toString(),
        checkInDate: booking.checkIn.toISOString()
      };

      return await this.sendNotificationToUser(booking.guest._id, title, body, data);
    } catch (error) {
      console.error('Erreur notifyCheckInReminder:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Formater une date en format lisible
   */
  formatDate(date) {
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    return new Date(date).toLocaleDateString('fr-FR', options);
  }
}

module.exports = new NotificationService();
