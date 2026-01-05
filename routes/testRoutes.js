const express = require('express');
const testController = require('../controllers/testController');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Routes de test publiques
router.get('/health', testController.healthCheck);
router.get('/stats', testController.getStats);

// Routes de test nécessitant une authentification
router.get('/auth-test', auth, testController.testEndpoint);

module.exports = router;