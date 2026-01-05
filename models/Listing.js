const mongoose = require('mongoose');

const listingSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Titre est requis'],
    trim: true,
    maxlength: [100, 'Le titre ne peut pas dépasser 100 caractères']
  },
  description: {
    type: String,
    required: [true, 'Description est requise'],
    trim: true,
    maxlength: [2000, 'La description ne peut pas dépasser 2000 caractères']
  },
  host: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Hôte est requis']
  },
  propertyType: {
    type: String,
    required: [true, 'Type de propriété est requis'],
    enum: [
      'apartment', 'house', 'villa', 'studio', 'loft', 'townhouse',
      'cabin', 'cottage', 'chalet', 'castle', 'boat', 'camper'
    ]
  },
  roomType: {
    type: String,
    required: [true, 'Type de chambre est requis'],
    enum: ['entire_place', 'private_room', 'shared_room']
  },
  address: {
    street: {
      type: String,
      required: [true, 'Rue est requise'],
      trim: true
    },
    city: {
      type: String,
      required: [true, 'Ville est requise'],
      trim: true
    },
    state: {
      type: String,
      trim: true
    },
    country: {
      type: String,
      required: [true, 'Pays est requis'],
      trim: true
    },
    zipCode: {
      type: String,
      trim: true
    }
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: [true, 'Coordonnées sont requises'],
      validate: {
        validator: function (coords) {
          return coords.length === 2 &&
            coords[0] >= -180 && coords[0] <= 180 && // longitude
            coords[1] >= -90 && coords[1] <= 90;     // latitude
        },
        message: 'Coordonnées invalides [longitude, latitude]'
      }
    }
  },
  capacity: {
    guests: {
      type: Number,
      required: [true, 'Nombre d\'invités est requis'],
      min: [1, 'Au moins 1 invité requis'],
      max: [20, 'Maximum 20 invités']
    },
    bedrooms: {
      type: Number,
      required: [true, 'Nombre de chambres est requis'],
      min: [0, 'Nombre de chambres ne peut pas être négatif']
    },
    beds: {
      type: Number,
      required: [true, 'Nombre de lits est requis'],
      min: [1, 'Au moins 1 lit requis']
    },
    bathrooms: {
      type: Number,
      required: [true, 'Nombre de salles de bain est requis'],
      min: [0.5, 'Au moins 0.5 salle de bain requise']
    }
  },
  amenities: [{
    type: String,
    enum: [
      // Essentiels
      'wifi', 'kitchen', 'washer', 'dryer', 'air_conditioning', 'heating',
      'dedicated_workspace', 'tv', 'hair_dryer', 'iron',

      // Caractéristiques
      'pool', 'hot_tub', 'patio', 'bbq_grill', 'fire_pit', 'pool_table',
      'piano', 'exercise_equipment', 'lake_access', 'beach_access',

      // Localisation
      'free_parking', 'paid_parking', 'ev_charger',

      // Sécurité
      'smoke_alarm', 'carbon_monoxide_alarm', 'first_aid_kit', 'fire_extinguisher',
      'security_cameras', 'lockbox', 'hangers',

      // Pas accessible
      'step_free_access', 'wide_entrance', 'accessible_bathroom', 'elevator',

      // Cuisine et salle à manger
      'refrigerator', 'microwave', 'dishes_silverware', 'freezer', 'oven',
      'stove', 'coffee_maker', 'dishwasher', 'toaster', 'blender',

      // Chambre et buanderie
      'bed_linens', 'extra_pillows_blankets', 'room_darkening_shades',
      'clothing_storage', 'safe',

      // Salle de bain
      'bathtub', 'cleaning_products', 'shampoo', 'body_soap', 'hot_water',

      // Divertissement
      'ethernet_connection', 'sound_system', 'projector', 'books_reading_material',

      // Famille
      'high_chair', 'travel_crib', 'children_books_toys', 'children_dinnerware',
      'baby_safety_gates', 'outlet_covers', 'table_corner_guards'
    ]
  }],
  pricing: {
    basePrice: {
      type: Number,
      required: [true, 'Prix de base est requis'],
      min: [1, 'Le prix doit être supérieur à 0']
    },
    currency: {
      type: String,
      required: [true, 'Devise est requise'],
      enum: ['EUR', 'TND'],
      default: 'EUR'
    },
    cleaningFee: {
      type: Number,
      min: [0, 'Les frais de nettoyage ne peuvent pas être négatifs'],
      default: 0
    },
    serviceFee: {
      type: Number,
      min: [0, 'Les frais de service ne peuvent pas être négatifs'],
      default: 0
    }
  },
  images: [{
    url: {
      type: String,
      required: [true, 'URL de l\'image est requise']
    },
    caption: {
      type: String,
      maxlength: [200, 'La légende ne peut pas dépasser 200 caractères']
    },
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  availability: {
    minStay: {
      type: Number,
      min: [1, 'Séjour minimum doit être au moins 1 nuit'],
      default: 1
    },
    maxStay: {
      type: Number,
      min: [1, 'Séjour maximum doit être au moins 1 nuit'],
      default: 365
    },
    instantBook: {
      type: Boolean,
      default: false
    }
  },
  houseRules: {
    checkIn: {
      type: String,
      default: '15:00'
    },
    checkOut: {
      type: String,
      default: '11:00'
    },
    smokingAllowed: {
      type: Boolean,
      default: false
    },
    petsAllowed: {
      type: Boolean,
      default: false
    },
    partiesAllowed: {
      type: Boolean,
      default: false
    },
    additionalRules: [{
      type: String,
      maxlength: [200, 'Chaque règle ne peut pas dépasser 200 caractères']
    }]
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'inactive', 'suspended'],
    default: 'draft'
  },
  ratings: {
    average: {
      type: Number,
      min: [0, 'Note ne peut pas être négative'],
      max: [5, 'Note ne peut pas dépasser 5'],
      default: 0
    },
    count: {
      type: Number,
      min: [0, 'Nombre d\'avis ne peut pas être négatif'],
      default: 0
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index géospatial pour les recherches de proximité
listingSchema.index({ location: '2dsphere' });

// Index composé pour les recherches fréquentes
listingSchema.index({ status: 1, 'pricing.basePrice': 1 });
listingSchema.index({ host: 1, status: 1 });
listingSchema.index({ propertyType: 1, roomType: 1 });
listingSchema.index({ 'capacity.guests': 1, status: 1 });

// Virtual pour l'adresse complète
listingSchema.virtual('fullAddress').get(function () {
  const { street, city, state, country, zipCode } = this.address;
  return `${street}, ${city}${state ? `, ${state}` : ''}, ${country}${zipCode ? ` ${zipCode}` : ''}`;
});

// Virtual pour l'image principale
listingSchema.virtual('primaryImage').get(function () {
  if (!this.images || this.images.length === 0) {
    return null;
  }
  return this.images.find(img => img.isPrimary) || this.images[0] || null;
});

// Middleware pour valider qu'il y a au moins une image principale
listingSchema.pre('save', function (next) {
  if (this.images && this.images.length > 0) {
    const primaryImages = this.images.filter(img => img.isPrimary);
    if (primaryImages.length === 0) {
      this.images[0].isPrimary = true;
    } else if (primaryImages.length > 1) {
      // S'assurer qu'il n'y a qu'une seule image principale
      this.images.forEach((img, index) => {
        img.isPrimary = index === 0;
      });
    }
  }
  next();
});

// Méthode statique pour rechercher par proximité
listingSchema.statics.findNearby = function (longitude, latitude, maxDistance = 10000) {
  return this.find({
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: maxDistance
      }
    },
    status: 'active'
  });
};

module.exports = mongoose.model('Listing', listingSchema);