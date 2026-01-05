require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function checkUserRole(email) {
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

    console.log('\n📋 Informations utilisateur:');
    console.log('ID:', user._id);
    console.log('Email:', user.email);
    console.log('Nom:', user.firstName, user.lastName);
    console.log('Rôle:', user.role);
    console.log('Est hôte?', user.role === 'host');
    console.log('\n');

    if (user.role !== 'host') {
      console.log('⚠️  Cet utilisateur n\'est PAS un hôte!');
      console.log('Pour le rendre hôte, exécutez: node scripts/make-user-host.js', email);
    } else {
      console.log('✅ Cet utilisateur EST un hôte');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

// Récupérer l'email depuis les arguments de ligne de commande
const email = process.argv[2];

if (!email) {
  console.log('Usage: node check-user-role.js <email>');
  console.log('Exemple: node check-user-role.js user@example.com');
  process.exit(1);
}

checkUserRole(email);
