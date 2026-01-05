const mongoose = require('mongoose');
const Listing = require('../models/Listing');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function activateAllListings() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connecté à MongoDB');

    // Compter les listings non-actifs
    const inactiveCount = await Listing.countDocuments({ status: { $ne: 'active' } });
    console.log(`📊 Listings non-actifs trouvés: ${inactiveCount}`);

    if (inactiveCount === 0) {
      console.log('🎉 Tous les listings sont déjà actifs !');
      return;
    }

    // Mettre à jour tous les listings vers le statut actif
    const updateResult = await Listing.updateMany(
      { status: { $ne: 'active' } },
      { status: 'active' }
    );

    console.log(`✅ ${updateResult.modifiedCount} listings mis à jour vers "active"`);

    // Vérifier le résultat
    const activeCount = await Listing.countDocuments({ status: 'active' });
    const totalCount = await Listing.countDocuments({});
    
    console.log(`\n📈 Résultat final:`);
    console.log(`   - Total listings: ${totalCount}`);
    console.log(`   - Listings actifs: ${activeCount}`);
    console.log(`   - Pourcentage actif: ${Math.round((activeCount / totalCount) * 100)}%`);

    console.log('\n🎯 Tous les listings sont maintenant visibles dans l\'application !');

  } catch (error) {
    console.error('💥 Erreur:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Déconnecté de MongoDB');
  }
}

activateAllListings();