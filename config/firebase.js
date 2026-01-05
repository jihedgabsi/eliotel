const admin = require('firebase-admin');

// Initialiser Firebase Admin SDK
const initializeFirebase = () => {
  try {
    if (admin.apps.length === 0) {
      
      // --- NETTOYAGE ROBUSTE DE LA CLÉ PRIVÉE ---
      let privateKey = process.env.FIREBASE_PRIVATE_KEY;

      if (privateKey) {
        // 1. Supprime les guillemets (") ou simples quotes (') au début et à la fin
        // Cela règle votre problème si vous avez mis la clé entre guillemets dans Coolify
        privateKey = privateKey.trim().replace(/^['"]|['"]$/g, '');
        
        // 2. Remplace les \n textuels par de vrais sauts de ligne
        privateKey = privateKey.replace(/\\n/g, '\n');
      }

      // --- CONSTRUCTION DU SERVICE ACCOUNT ---
      const serviceAccount = {
        type: process.env.FIREBASE_TYPE || "service_account",
        project_id: process.env.FIREBASE_PROJECT_ID || "eliotel-4c571",
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: privateKey,
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: process.env.FIREBASE_AUTH_URI || "https://accounts.google.com/o/oauth2/auth",
        token_uri: process.env.FIREBASE_TOKEN_URI || "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_CERT_URL || "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
        universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN || "googleapis.com"
      };

      // Vérification des données critiques
      if (!serviceAccount.private_key || !serviceAccount.client_email) {
        throw new Error('FIREBASE_PRIVATE_KEY ou FIREBASE_CLIENT_EMAIL manquant dans les variables d\'environnement.');
      }

      // Initialisation
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
      });

      console.log('✅ Firebase Admin SDK initialisé avec succès');
    } else {
      console.log('ℹ️ Firebase Admin SDK déjà initialisé');
    }
  } catch (error) {
    console.error('❌ Erreur initialisation Firebase Admin SDK:', error.message);
    console.error('💡 Conseil: Dans Coolify, assurez-vous que FIREBASE_PRIVATE_KEY ne contient PAS de guillemets au début et à la fin.');
  }
};

module.exports = { initializeFirebase, admin };
