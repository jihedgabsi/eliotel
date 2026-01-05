const express = require('express');
const chatFirebaseController = require('../controllers/chatFirebaseController');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(auth);

// Enregistrer un chatId Firebase
router.post('/save-chat-id', chatFirebaseController.saveChatId);

// Récupérer le chatId d'un booking
router.get('/chat-id/:bookingId', chatFirebaseController.getChatId);

// Récupérer tous les chatIds de l'utilisateur
router.get('/my-chat-ids', chatFirebaseController.getMyChatIds);

module.exports = router;
