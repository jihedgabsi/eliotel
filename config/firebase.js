const admin = require('firebase-admin');

const initializeFirebase = () => {
  try {
    if (admin.apps.length === 0) {
      
      // Nettoyage ultra-robuste de la clé privée
      let privateKey = process.env.FIREBASE_PRIVATE_KEY;
      if (privateKey) {
        // 1. Enlever les guillemets éventuels aux extrémités
        privateKey = privateKey.trim().replace(/^"(.*)"$/, '$1');
        // 2. Remplacer les \n textuels par de vrais sauts de ligne
        privateKey = privateKey.replace(/\\n/g, '\n');
      }

      const serviceAccount = {
        type: process.env.FIREBASE_TYPE || "service_account",
        project_id: process.env.FIREBASE_PROJECT_ID || "eliotel-4c571",
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: privateKey, // Utilisation de la clé nettoyée
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: process.env.FIREBASE_AUTH_URI || "https://accounts.google.com/o/oauth2/auth",
        token_uri: process.env.FIREBASE_TOKEN_URI || "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_CERT_URL || "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
        universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN || "googleapis.com"
      };

      if (!serviceAccount.private_key || !serviceAccount.client_email) {
        throw new Error('Credentials manquants (FIREBASE_PRIVATE_KEY ou FIREBASE_CLIENT_EMAIL)');
      }

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
      });

      console.log('✅ Firebase Admin SDK initialisé avec succès');
    }
  } catch (error) {
    console.error('❌ Erreur initialisation Firebase Admin SDK:', error.message);
  }
};

module.exports = { initializeFirebase, admin };
