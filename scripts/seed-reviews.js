const mongoose = require('mongoose');
require('dotenv').config();

const Review = require('../models/Review');
const Booking = require('../models/Booking');
const Listing = require('../models/Listing');

// Script pour créer des avis de test
async function seedReviews() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/airbnb-api');
    console.log('✅ Connecté à MongoDB');

    // Trouver une réservation confirmée
    const booking = await Booking.findOne({ status: 'confirmed' })
      .populate('listing')
      .populate('guest')
      .populate('host');

    if (!booking) {
      console.log('❌ Aucune réservation confirmée trouvée');
      process.exit(1);
    }

    console.log(`📋 Réservation trouvée: ${booking._id}`);

    // Vérifier si un avis existe déjà
    const existingReview = await Review.findOne({
      booking: booking._id,
      reviewerRole: 'guest'
    });

    if (existingReview) {
      console.log('⚠️  Un avis existe déjà pour cette réservation');
      process.exit(0);
    }

    // Créer un avis de test
    const review = await Review.create({
      booking: booking._id,
      listing: booking.listing._id,
      reviewer: booking.guest._id,
      reviewee: booking.host._id,
      reviewerRole: 'guest',
      rating: 4.5,
      ratings: {
        cleanliness: 5,
        accuracy: 4,
        checkIn: 5,
        communication: 5,
        location: 4,
        value: 4
      },
      comment: 'Excellent séjour ! La propriété était très propre et conforme à la description. L\'hôte était très accueillant et disponible. Je recommande vivement cette location pour un séjour agréable.'
    });

    console.log('✅ Avis créé avec succès:', review._id);

    // Mettre à jour la réservation
    booking.review.guest = review._id;
    booking.status = 'completed';
    await booking.save();

    console.log('✅ Réservation mise à jour');

    // Vérifier la mise à jour du listing
    const updatedListing = await Listing.findById(booking.listing._id);
    console.log(`✅ Note moyenne du listing: ${updatedListing.ratings.average}`);
    console.log(`✅ Nombre d'avis: ${updatedListing.ratings.count}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

seedReviews();
