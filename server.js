const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const { initializeFirebase } = require('./config/firebase');

const userRoutes = require('./routes/userRoutes');
const listingRoutes = require('./routes/listingRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const chatFirebaseRoutes = require('./routes/chatFirebaseRoutes');
const chatRoutes = require('./routes/chatRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const testRoutes = require('./routes/testRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN === '*' ? true : (process.env.CORS_ORIGIN || "http://localhost:3000"),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Servir les fichiers statiques (images uploadées)
app.use('/uploads', express.static('uploads'));

// Headers de réponse explicites pour les routes API
app.use('/api', (req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

// Routes
app.use('/api/users', userRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/chat-firebase', chatFirebaseRoutes);
app.use('/api/chat', chatRoutes); // Routes de notification chat
app.use('/api/test', testRoutes); // Routes de test
app.use('/', uploadRoutes); // Route d'upload sans préfixe /api

// Route de santé
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API Airbnb fonctionne correctement',
    timestamp: new Date().toISOString(),
    services: {
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    }
  });
});

// Route de test pour l'upload
app.get('/test-upload', (req, res) => {
  res.sendFile(__dirname + '/test-upload.html');
});

// Middleware de gestion d'erreurs (doit être en dernier)
app.use(errorHandler);

// Connexion à MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/airbnb-api');
    console.log('MongoDB connecté avec succès');
  } catch (error) {
    console.error('Erreur de connexion MongoDB:', error.message);
    process.exit(1);
  }
};

const PORT = process.env.PORT || 3000;

// Initialiser Firebase Admin SDK
initializeFirebase();

connectDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
  });
});