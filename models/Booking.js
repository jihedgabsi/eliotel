const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  listing: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Listing',
    required: [true, 'Annonce requise']
  },
  guest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Invité requis']
  },
  host: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Hôte requis']
  },
  // ID du chat Firebase pour cette réservation
  firebaseChatId: {
    type: String,
    default: null
  },
  checkIn: {
    type: Date,
    required: [true, 'Date d\'arrivée requise']
  },
  checkOut: {
    type: Date,
    required: [true, 'Date de départ requise'],
    validate: {
      validator: function (checkOut) {
        return checkOut > this.checkIn;
      },
      message: 'La date de départ doit être après la date d\'arrivée'
    }
  },
  guests: {
    adults: {
      type: Number,
      required: [true, 'Nombre d\'adultes requis'],
      min: [1, 'Au moins 1 adulte requis']
    },
    children: {
      type: Number,
      default: 0,
      min: [0, 'Nombre d\'enfants ne peut pas être négatif']
    },
    infants: {
      type: Number,
      default: 0,
      min: [0, 'Nombre de bébés ne peut pas être négatif']
    },
    pets: {
      type: Number,
      default: 0,
      min: [0, 'Nombre d\'animaux ne peut pas être négatif']
    }
  },
  pricing: {
    basePrice: {
      type: Number,
      required: [true, 'Prix de base requis'],
      min: [0, 'Prix ne peut pas être négatif']
    },
    nights: {
      type: Number,
      required: [true, 'Nombre de nuits requis'],
      min: [1, 'Au moins 1 nuit requise']
    },
    subtotal: {
      type: Number,
      required: [true, 'Sous-total requis']
    },
    cleaningFee: {
      type: Number,
      default: 0,
      min: [0, 'Frais de nettoyage ne peuvent pas être négatifs']
    },
    serviceFee: {
      type: Number,
      default: 0,
      min: [0, 'Frais de service ne peuvent pas être négatifs']
    },
    taxes: {
      type: Number,
      default: 0,
      min: [0, 'Taxes ne peuvent pas être négatives']
    },
    total: {
      type: Number,
      required: [true, 'Total requis'],
      min: [0, 'Total ne peut pas être négatif']
    },
    currency: {
      type: String,
      required: [true, 'Devise requise'],
      enum: ['USD', 'EUR', 'TND'],
      default: 'EUR'
    }
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed', 'rejected'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'refunded', 'failed'],
    default: 'pending'
  },

  paymentDetails: {
    transactionId: String,
    paymentDate: Date,
    refundAmount: {
      type: Number,
      default: 0
    },
    refundDate: Date
  },
  specialRequests: {
    type: String,
    maxlength: [500, 'Les demandes spéciales ne peuvent pas dépasser 500 caractères']
  },
  guestMessage: {
    type: String,
    maxlength: [1000, 'Le message ne peut pas dépasser 1000 caractères']
  },
  hostResponse: {
    message: {
      type: String,
      maxlength: [1000, 'La réponse ne peut pas dépasser 1000 caractères']
    },
    respondedAt: Date
  },
  cancellation: {
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    cancelledAt: Date,
    reason: {
      type: String,
      maxlength: [500, 'La raison ne peut pas dépasser 500 caractères']
    },
    refundAmount: {
      type: Number,
      default: 0
    }
  },
  review: {
    guest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Review'
    },
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Review'
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index pour améliorer les performances
bookingSchema.index({ listing: 1, checkIn: 1, checkOut: 1 });
bookingSchema.index({ guest: 1, status: 1 });
bookingSchema.index({ host: 1, status: 1 });
bookingSchema.index({ status: 1, checkIn: 1 });

// Virtual pour le nombre total d'invités
bookingSchema.virtual('totalGuests').get(function () {
  return this.guests.adults + this.guests.children + this.guests.infants;
});

// Virtual pour la durée du séjour
bookingSchema.virtual('duration').get(function () {
  const diffTime = Math.abs(this.checkOut - this.checkIn);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Middleware pour calculer automatiquement les prix
bookingSchema.pre('save', function (next) {
  if (this.isModified('checkIn') || this.isModified('checkOut') || this.isModified('pricing.basePrice')) {
    const nights = this.duration;
    this.pricing.nights = nights;
    this.pricing.subtotal = this.pricing.basePrice * nights;
    this.pricing.total = this.pricing.subtotal + this.pricing.cleaningFee + this.pricing.serviceFee + this.pricing.taxes;
  }
  next();
});

// Méthode pour vérifier les conflits de dates
bookingSchema.statics.checkAvailability = async function (listingId, checkIn, checkOut, excludeBookingId = null) {
  const query = {
    listing: listingId,
    status: { $in: ['confirmed', 'pending'] },
    $or: [
      {
        checkIn: { $lt: checkOut },
        checkOut: { $gt: checkIn }
      }
    ]
  };

  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId };
  }

  const conflictingBookings = await this.find(query);
  return conflictingBookings.length === 0;
};

// Méthode pour confirmer une réservation
bookingSchema.methods.confirm = function () {
  this.status = 'confirmed';
  this.paymentStatus = 'paid';
  this.paymentDetails.paymentDate = new Date();
  return this.save();
};

// Méthode pour annuler une réservation
bookingSchema.methods.cancel = function (cancelledBy, reason, refundAmount = 0) {
  this.status = 'cancelled';
  this.cancellation = {
    cancelledBy,
    cancelledAt: new Date(),
    reason,
    refundAmount
  };
  if (refundAmount > 0) {
    this.paymentStatus = 'refunded';
    this.paymentDetails.refundAmount = refundAmount;
    this.paymentDetails.refundDate = new Date();
  }
  return this.save();
};

module.exports = mongoose.model('Booking', bookingSchema);