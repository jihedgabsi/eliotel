const express = require('express');
const chatController = require('../controllers/chatController');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(auth);

/**
 * @route   POST /api/chat/send-notification
 * @desc    Envoyer une notification de nouveau message
 * @access  Private (authentifié)
 */
router.post('/send-notification', chatController.sendChatNotification);

/**
 * @route   GET /api/chat/:chatId/info
 * @desc    Obtenir les informations d'un chat
 * @access  Private (authentifié)
 */
router.get('/:chatId/info', chatController.getChatInfo);

module.exports = router;
