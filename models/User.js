const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email est requis'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Format email invalide']
  },
  password: {
    type: String,
    required: [true, 'Mot de passe est requis'],
    minlength: [6, 'Le mot de passe doit contenir au moins 6 caractères']
  },
  firstName: {
    type: String,
    required: [true, 'Prénom est requis'],
    trim: true,
    maxlength: [50, 'Le prénom ne peut pas dépasser 50 caractères']
  },
  lastName: {
    type: String,
    required: [true, 'Nom est requis'],
    trim: true,
    maxlength: [50, 'Le nom ne peut pas dépasser 50 caractères']
  },
  phone: {
    type: String, // Le type de donnée est une chaîne de caractères
    trim: true,   // Supprime les espaces blancs au début et à la fin
    match: [
      /^\+\d{1,4}\s\d{6,15}$/, // Expression régulière pour la validation
      'Format de téléphone invalide' // Message d'erreur si la validation échoue
    ],
    required: false, // Optionnel lors de l'inscription
    default: null
  },
  avatar: {
    type: String,
    default: null
  },
  role: {
    type: String,
    enum: ['guest', 'host', 'admin'],
    default: 'guest'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  favoriteListings: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing'
    }
  ],
  fcmToken: {
    type: String,
    default: null
  },
  hostProfile: {
    bio: {
      type: String,
      maxlength: [500, 'La bio ne peut pas dépasser 500 caractères']
    },
    responseRate: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    responseTime: {
      type: String,
      enum: ['within an hour', 'within a few hours', 'within a day', 'a few days or more'],
      default: 'within a day'
    },
    joinedDate: {
      type: Date,
      default: null
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index pour améliorer les performances de recherche
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });

// Virtual pour le nom complet
userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Middleware pour hasher le mot de passe avant sauvegarde
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Méthode pour comparer les mots de passe
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Méthode pour transformer en hôte
userSchema.methods.becomeHost = function () {
  this.role = 'host';
  this.hostProfile.joinedDate = new Date();
  return this.save();
};

// Méthode pour redevenir voyageur
userSchema.methods.becomeGuest = function () {
  this.role = 'guest';
  // Optionnel: réinitialiser certaines données du profil hôte
  // this.hostProfile.joinedDate = null;
  return this.save();
};

// Méthode pour exclure le mot de passe des réponses JSON
userSchema.methods.toJSON = function () {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

// userSchema.methods.js (Ajouter dans le modèle User)
// Méthode pour ajouter un listing aux favoris
userSchema.methods.addFavorite = function (listingId) {
  if (!this.favoriteListings.includes(listingId)) {
    this.favoriteListings.push(listingId);
  }
  return this.save();
};

// Méthode pour retirer un listing des favoris
userSchema.methods.removeFavorite = function (listingId) {
  this.favoriteListings.pull(listingId); // Mongoose Array method
  return this.save();
};



module.exports = mongoose.model('User', userSchema);