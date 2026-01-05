const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

async function checkUserPhones() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connecté à MongoDB');

    const users = await User.find({}).select('firstName lastName email phone role');
    
    console.log('\n📋 Liste des utilisateurs et leurs numéros:');
    console.log('='.repeat(80));
    
    users.forEach(user => {
      console.log(`\n👤 ${user.firstName} ${user.lastName} (${user.role})`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Phone: ${user.phone || '❌ PAS DE NUMÉRO'}`);
    });
    
    const usersWithoutPhone = users.filter(u => !u.phone);
    console.log('\n' + '='.repeat(80));
    console.log(`\n📊 Résumé:`);
    console.log(`   Total utilisateurs: ${users.length}`);
    console.log(`   Avec numéro: ${users.length - usersWithoutPhone.length}`);
    console.log(`   Sans numéro: ${usersWithoutPhone.length}`);
    
    if (usersWithoutPhone.length > 0) {
      console.log('\n⚠️  Utilisateurs sans numéro de téléphone:');
      usersWithoutPhone.forEach(u => {
        console.log(`   - ${u.firstName} ${u.lastName} (${u.email})`);
      });
    }

    await mongoose.disconnect();
    console.log('\n✅ Déconnecté de MongoDB');
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

checkUserPhones();
