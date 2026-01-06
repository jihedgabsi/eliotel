const admin = require('firebase-admin');

// Initialiser Firebase Admin SDK
const initializeFirebase = () => {
  try {
    if (admin.apps.length === 0) {
      // Construire le service account depuis les variables d'environnement
      const serviceAccount = {
        type: process.env.FIREBASE_TYPE || "service_account",
        project_id: process.env.FIREBASE_PROJECT_ID || "eliotel-4c571",
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY
          ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
          : undefined,
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: process.env.FIREBASE_AUTH_URI || "https://accounts.google.com/o/oauth2/auth",
        token_uri: process.env.FIREBASE_TOKEN_URI || "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_CERT_URL || "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
        universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN || "googleapis.com"
      };

      // Vérifier que les credentials essentiels sont présents
      if (!serviceAccount.private_key || !serviceAccount.client_email) {
        throw new Error('Firebase credentials manquants dans .env (FIREBASE_PRIVATE_KEY et FIREBASE_CLIENT_EMAIL requis)');
      }

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
      });

      console.log('✅ Firebase Admin SDK initialisé avec succès');
      console.log(`📧 Client Email: ${serviceAccount.client_email}`);
      console.log(`🔑 Project ID: ${serviceAccount.project_id}`);
    } else {
      console.log('ℹ️  Firebase Admin SDK déjà initialisé');
    }
  } catch (error) {
    console.error('❌ Erreur initialisation Firebase Admin SDK:', error.message);
    console.error('💡 Vérifiez que les variables FIREBASE_* sont correctement définies dans .env');
  }
};

module.exports = { initializeFirebase, admin };
