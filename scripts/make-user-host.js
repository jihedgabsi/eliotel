require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function makeUserHost(email) {
  try {
    // Connexion à MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connecté à MongoDB');

    // Chercher l'utilisateur par email
    const user = await User.findOne({ email: email });

    if (!user) {
      console.log('❌ Utilisateur non trouvé avec l\'email:', email);
      process.exit(1);
    }

    console.log('\n📋 Utilisateur trouvé:');
    console.log('ID:', user._id);
    console.log('Email:', user.email);
    console.log('Rôle actuel:', user.role);

    if (user.role === 'host') {
      console.log('✅ Cet utilisateur est déjà un hôte!');
      process.exit(0);
    }

    // Transformer en hôte
    await user.becomeHost();
    console.log('\n✅ Utilisateur transformé en hôte avec succès!');
    console.log('Nouveau rôle:', user.role);

    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

// Récupérer l'email depuis les arguments de ligne de commande
const email = process.argv[2];

if (!email) {
  console.log('Usage: node make-user-host.js <email>');
  console.log('Exemple: node make-user-host.js user@example.com');
  process.exit(1);
}

makeUserHost(email);
