const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: [true, 'Réservation requise']
  },
  listing: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Listing',
    required: [true, 'Annonce requise']
  },
  reviewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Auteur de l\'avis requis']
  },
  reviewee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Destinataire de l\'avis requis']
  },
  reviewerRole: {
    type: String,
    enum: ['guest', 'host'],
    required: [true, 'Rôle de l\'auteur requis']
  },
  rating: {
    type: Number,
    required: [true, 'Note requise'],
    min: [1, 'La note minimale est 1'],
    max: [5, 'La note maximale est 5']
  },
  // Notes détaillées (pour les avis des voyageurs sur les annonces)
  ratings: {
    cleanliness: {
      type: Number,
      min: [1, 'La note minimale est 1'],
      max: [5, 'La note maximale est 5']
    },
    accuracy: {
      type: Number,
      min: [1, 'La note minimale est 1'],
      max: [5, 'La note maximale est 5']
    },
    checkIn: {
      type: Number,
      min: [1, 'La note minimale est 1'],
      max: [5, 'La note maximale est 5']
    },
    communication: {
      type: Number,
      min: [1, 'La note minimale est 1'],
      max: [5, 'La note maximale est 5']
    },
    location: {
      type: Number,
      min: [1, 'La note minimale est 1'],
      max: [5, 'La note maximale est 5']
    },
    value: {
      type: Number,
      min: [1, 'La note minimale est 1'],
      max: [5, 'La note maximale est 5']
    }
  },
  comment: {
    type: String,
    required: [true, 'Commentaire requis'],
    trim: true,
    minlength: [10, 'Le commentaire doit contenir au moins 10 caractères'],
    maxlength: [1000, 'Le commentaire ne peut pas dépasser 1000 caractères']
  },
  response: {
    comment: {
      type: String,
      trim: true,
      maxlength: [500, 'La réponse ne peut pas dépasser 500 caractères']
    },
    createdAt: Date
  },
  isPublic: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index pour améliorer les performances
reviewSchema.index({ listing: 1, createdAt: -1 });
reviewSchema.index({ reviewer: 1 });
reviewSchema.index({ reviewee: 1 });
reviewSchema.index({ booking: 1 });

// Un seul avis par réservation et par rôle
reviewSchema.index({ booking: 1, reviewerRole: 1 }, { unique: true });

// Middleware pour mettre à jour les notes moyennes du listing
reviewSchema.post('save', async function() {
  if (this.reviewerRole === 'guest') {
    const Review = this.constructor;
    const Listing = mongoose.model('Listing');
    
    // Calculer la moyenne des notes pour ce listing
    const stats = await Review.aggregate([
      {
        $match: {
          listing: this.listing,
          reviewerRole: 'guest',
          isPublic: true
        }
      },
      {
        $group: {
          _id: '$listing',
          averageRating: { $avg: '$rating' },
          count: { $sum: 1 }
        }
      }
    ]);

    if (stats.length > 0) {
      await Listing.findByIdAndUpdate(this.listing, {
        'ratings.average': Math.round(stats[0].averageRating * 10) / 10,
        'ratings.count': stats[0].count
      });
    }
  }
});

// Middleware pour mettre à jour les notes moyennes lors de la suppression
reviewSchema.post('findOneAndDelete', async function(doc) {
  if (doc && doc.reviewerRole === 'guest') {
    const Review = mongoose.model('Review');
    const Listing = mongoose.model('Listing');
    
    const stats = await Review.aggregate([
      {
        $match: {
          listing: doc.listing,
          reviewerRole: 'guest',
          isPublic: true
        }
      },
      {
        $group: {
          _id: '$listing',
          averageRating: { $avg: '$rating' },
          count: { $sum: 1 }
        }
      }
    ]);

    if (stats.length > 0) {
      await Listing.findByIdAndUpdate(doc.listing, {
        'ratings.average': Math.round(stats[0].averageRating * 10) / 10,
        'ratings.count': stats[0].count
      });
    } else {
      await Listing.findByIdAndUpdate(doc.listing, {
        'ratings.average': 0,
        'ratings.count': 0
      });
    }
  }
});

module.exports = mongoose.model('Review', reviewSchema);
