/**
 * Script de test pour les notifications FCM
 * Usage: node test-notification.js <userId>
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { initializeFirebase } = require('./config/firebase');
const notificationService = require('./services/notificationService');

async function testNotification() {
  try {
    // Récupérer l'userId depuis les arguments
    const userId = process.argv[2];
    
    if (!userId) {
      console.log('Usage: node test-notification.js <userId>');
      process.exit(1);
    }

    console.log('🔄 Connexion à MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/airbnb-api');
    console.log('✅ MongoDB connecté');

    console.log('🔄 Initialisation Firebase...');
    initializeFirebase();
    console.log('✅ Firebase initialisé');

    console.log(`\n📤 Envoi d'une notification de test à l'utilisateur ${userId}...`);
    
    const result = await notificationService.sendNotificationToUser(
      userId,
      '🧪 Test de Notification',
      'Ceci est une notification de test depuis le backend',
      {
        type: 'test',
        timestamp: new Date().toISOString()
      }
    );

    console.log('\n📊 Résultat:');
    console.log(JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('\n✅ Notification envoyée avec succès!');
    } else {
      console.log('\n❌ Échec de l\'envoi de la notification');
    }

    await mongoose.disconnect();
    console.log('\n👋 Déconnexion de MongoDB');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    process.exit(1);
  }
}

testNotification();
