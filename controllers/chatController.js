const notificationService = require('../services/notificationService');
const User = require('../models/User');

class ChatController {
  /**
   * Envoyer une notification de nouveau message
   * POST /api/chat/send-notification
   */
  async sendChatNotification(req, res, next) {
    try {
      const senderId = req.user.userId; // Utilisateur authentifié
      const { recipientId, senderName, messageText, chatId } = req.body;

      // Validation
      if (!recipientId || !senderName || !messageText || !chatId) {
        return res.status(400).json({
          success: false,
          message: 'Données manquantes (recipientId, senderName, messageText, chatId requis)',
        });
      }

      // Vérifier que l'expéditeur est bien l'utilisateur authentifié
      const sender = await User.findById(senderId).select('firstName lastName');
      if (!sender) {
        return res.status(404).json({
          success: false,
          message: 'Expéditeur non trouvé',
        });
      }

      // Vérifier que le nom de l'expéditeur correspond
      const fullName = `${sender.firstName} ${sender.lastName}`;
      if (fullName !== senderName) {
        return res.status(403).json({
          success: false,
          message: 'Nom de l\'expéditeur ne correspond pas',
        });
      }

      // Vérifier que le destinataire existe
      const recipient = await User.findById(recipientId).select('fcmToken firstName lastName');
      if (!recipient) {
        return res.status(404).json({
          success: false,
          message: 'Destinataire non trouvé',
        });
      }

      // Vérifier que l'expéditeur n'envoie pas à lui-même
      if (senderId === recipientId) {
        return res.status(400).json({
          success: false,
          message: 'Impossible d\'envoyer une notification à soi-même',
        });
      }

      // Tronquer le message si trop long
      let displayText = messageText;
      if (displayText.length > 100) {
        displayText = displayText.substring(0, 100) + '...';
      }

      // Envoyer la notification FCM
      const result = await notificationService.sendNotificationToUser(
        recipientId,
        `💬 ${senderName}`,
        displayText,
        {
          type: 'chat_message',
          chatId: chatId,
          senderId: senderId,
          senderName: senderName,
        }
      );

      if (result.success) {
        return res.status(200).json({
          success: true,
          message: 'Notification envoyée avec succès',
          data: {
            recipient: `${recipient.firstName} ${recipient.lastName}`,
            messageId: result.messageId,
          },
        });
      } else {
        return res.status(500).json({
          success: false,
          message: 'Échec de l\'envoi de la notification',
          error: result.message,
        });
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtenir les informations d'un chat (pour vérification)
   * GET /api/chat/:chatId/info
   */
  async getChatInfo(req, res, next) {
    try {
      const userId = req.user.userId;
      const { chatId } = req.params;

      // TODO: Implémenter la récupération des infos du chat depuis Firebase
      // Pour l'instant, retourner une réponse basique
      
      res.status(200).json({
        success: true,
        data: {
          chatId,
          userId,
          message: 'Endpoint à implémenter avec Firebase Admin SDK',
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ChatController();
