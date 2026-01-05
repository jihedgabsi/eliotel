const User = require('../models/User');
const jwt = require('jsonwebtoken');

class UserService {
  // Créer un nouvel utilisateur
  async createUser(userData) {
    try {
      const existingUser = await User.findOne({ email: userData.email });
      if (existingUser) {
        throw new Error('Un utilisateur avec cet email existe déjà');
      }

      const user = new User(userData);
      await user.save();

      return {
        user,
        token: this.generateToken(user._id)
      };
    } catch (error) {
      throw error;
    }
  }

  // Authentifier un utilisateur
  async authenticateUser(email, password) {
    try {
      const user = await User.findOne({ email }).select('+password');
      if (!user) {
        throw new Error('Email ou mot de passe incorrect');
      }

      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        throw new Error('Email ou mot de passe incorrect');
      }

      return {
        user,
        token: this.generateToken(user._id)
      };
    } catch (error) {
      throw error;
    }
  }

  // Authentifier avec Google
  async authenticateWithGoogle({ idToken, email, displayName, photoURL }) {
    try {
      // Vérifier si l'utilisateur existe déjà
      let user = await User.findOne({ email });
      let isNewUser = false;

      if (!user) {
        // Créer un nouvel utilisateur
        isNewUser = true;
        const [firstName, ...lastNameParts] = (displayName || email.split('@')[0]).split(' ');
        const lastName = lastNameParts.join(' ') || firstName;

        user = new User({
          email,
          firstName,
          lastName,
          avatar: photoURL || undefined,
          googleId: idToken,
          // Pas de mot de passe pour les utilisateurs Google
          password: Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8)
        });

        await user.save();
      } else {
        // Mettre à jour l'avatar si fourni et différent
        if (photoURL && user.avatar !== photoURL) {
          user.avatar = photoURL;
          await user.save();
        }
      }

      return {
        user,
        token: this.generateToken(user._id),
        isNewUser
      };
    } catch (error) {
      throw error;
    }
  }

  // Transformer un utilisateur en hôte
  async becomeHost(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('Utilisateur non trouvé');
      }

      if (user.role === 'host') {
        throw new Error('L\'utilisateur est déjà un hôte');
      }

      // Utiliser la méthode du modèle pour devenir hôte
      await user.becomeHost();

      return {
        success: true,
        message: 'Vous êtes maintenant un hôte !',
        user
      };
    } catch (error) {
      throw error;
    }
  }

  // Transformer un hôte en voyageur
  async becomeGuest(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('Utilisateur non trouvé');
      }

      if (user.role === 'guest') {
        throw new Error('L\'utilisateur est déjà un voyageur');
      }

      // Utiliser la méthode du modèle pour redevenir voyageur
      await user.becomeGuest();

      return {
        success: true,
        message: 'Vous êtes maintenant un voyageur !',
        user
      };
    } catch (error) {
      throw error;
    }
  }

  // Obtenir le profil utilisateur
  async getUserProfile(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('Utilisateur non trouvé');
      }

      return user;
    } catch (error) {
      throw error;
    }
  }

  async updateUserAvatar(userId, avatarUrl) {
    try {
        const user = await User.findByIdAndUpdate(
            userId,
            // $set est utilisé pour mettre à jour uniquement le champ 'avatar'
            { $set: { avatar: avatarUrl } },
            // { new: true } retourne le document mis à jour
            // { runValidators: true } s'assure que les validateurs du schéma sont exécutés
            { new: true, runValidators: true } 
        );

        if (!user) {
            throw new Error('Utilisateur non trouvé');
        }

        // Optionnel: Ici, vous pourriez ajouter une logique pour supprimer l'ancien fichier avatar du disque
        // if (user.avatar && user.avatar !== avatarUrl) {
        //   const oldFilename = user.avatar.split('/').pop();
        //   // Supprimer le fichier (nécessite le module 'fs')
        // }

        return user;
    } catch (error) {
        throw error;
    }
}

  // Mettre à jour le profil utilisateur
  async updateUserProfile(userId, updateData) {
    try {
      // Empêcher la modification directe du rôle et du mot de passe
      const { role, password, ...allowedUpdates } = updateData;

      const user = await User.findByIdAndUpdate(
        userId,
        { $set: allowedUpdates },
        { new: true, runValidators: true }
      );

      if (!user) {
        throw new Error('Utilisateur non trouvé');
      }

      return user;
    } catch (error) {
      throw error;
    }
  }

  // Mettre à jour le profil d'hôte
  async updateHostProfile(userId, hostProfileData) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('Utilisateur non trouvé');
      }

      if (user.role !== 'host') {
        throw new Error('L\'utilisateur doit être un hôte pour mettre à jour le profil d\'hôte');
      }

      // Mettre à jour seulement les champs du profil d'hôte
      Object.keys(hostProfileData).forEach(key => {
        if (user.hostProfile[key] !== undefined) {
          user.hostProfile[key] = hostProfileData[key];
        }
      });

      await user.save();
      return user;
    } catch (error) {
      throw error;
    }
  }

  // Changer le mot de passe
  async changePassword(userId, currentPassword, newPassword) {
    try {
      const user = await User.findById(userId).select('+password');
      if (!user) {
        throw new Error('Utilisateur non trouvé');
      }

      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        throw new Error('Mot de passe actuel incorrect');
      }

      user.password = newPassword;
      await user.save();

      return {
        success: true,
        message: 'Mot de passe mis à jour avec succès'
      };
    } catch (error) {
      throw error;
    }
  }

  // Obtenir tous les hôtes
  async getAllHosts(page = 1, limit = 10) {
    try {
      const skip = (page - 1) * limit;

      const hosts = await User.find({ role: 'host' })
        .select('-password')
        .skip(skip)
        .limit(limit)
        .sort({ 'hostProfile.joinedDate': -1 });

      const total = await User.countDocuments({ role: 'host' });

      return {
        hosts,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalHosts: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      throw error;
    }
  }

  // Rechercher des utilisateurs
  async searchUsers(query, role = null, page = 1, limit = 10) {
    try {
      const skip = (page - 1) * limit;

      const searchCriteria = {
        $or: [
          { firstName: { $regex: query, $options: 'i' } },
          { lastName: { $regex: query, $options: 'i' } },
          { email: { $regex: query, $options: 'i' } }
        ]
      };

      if (role) {
        searchCriteria.role = role;
      }

      const users = await User.find(searchCriteria)
        .select('-password')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });

      const total = await User.countDocuments(searchCriteria);

      return {
        users,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalUsers: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      throw error;
    }
  }

  // Générer un token JWT
  generateToken(userId) {
    return jwt.sign(
      { userId },
      process.env.JWT_SECRET || 'your-secret-key',

    );
  }

  // Vérifier un token JWT
  verifyToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    } catch (error) {
      throw new Error('Token invalide');
    }
  }

// GESTION DES FAVORIS (SANS ASYNC/AWAIT)
  // ------------------------------------------------------------------

  // 1. Gérer l'ajout/retrait de favori
  toggleFavorite(userId, listingId) {
    return User.findById(userId)
      .then(user => {
        if (!user) {
          throw new Error('Utilisateur non trouvé');
        }

        const isFavorite = user.favoriteListings.includes(listingId);

        if (isFavorite) {
          // user.removeFavorite retourne une Promesse
          return user.removeFavorite(listingId)
            .then(() => ({ action: 'removed', user }));
        } else {
          // user.addFavorite retourne une Promesse
          return user.addFavorite(listingId)
            .then(() => ({ action: 'added', user }));
        }
      });
  }

  // 2. Lister les favoris
  async getFavoriteListings(userId) {
    try {
      // D'abord, nettoyer les favoris invalides
      await this.cleanupInvalidFavorites(userId);

      // Ensuite, récupérer les favoris valides avec TOUS les champs nécessaires
      const user = await User.findById(userId)
        .populate({
          path: 'favoriteListings',
          // ✅ CORRECTION: Récupérer TOUS les champs du listing
          select: 'title description propertyType roomType address location capacity amenities pricing images availability houseRules status ratings host createdAt updatedAt',
          match: { status: 'active' } // Ne récupérer que les listings actifs
        })
        .select('favoriteListings');

      if (!user) {
        throw new Error('Utilisateur non trouvé');
      }

      // Filtrer les favoris pour ne garder que ceux qui existent encore (double sécurité)
      const validFavorites = user.favoriteListings.filter(listing => listing !== null);

      return validFavorites;
    } catch (error) {
      throw error;
    }
  }

  // 3. Vérifier si un listing est un favori
  isFavorite(userId, listingId) {
    return User.findById(userId)
      .select('favoriteListings')
      .then(user => {
        if (!user) return false;
        return user.favoriteListings.includes(listingId);
      })
      // Gérer l'erreur si la Promesse échoue (par exemple, connexion DB)
      .catch(() => false);
  }

  // 4. Nettoyer les favoris invalides (listings supprimés)
  async cleanupInvalidFavorites(userId) {
    try {
      const user = await User.findById(userId).select('favoriteListings');
      if (!user || user.favoriteListings.length === 0) {
        return { cleaned: 0, remaining: 0 };
      }

      // Vérifier quels listings existent encore
      const Listing = require('../models/Listing');
      const validListings = await Listing.find({
        _id: { $in: user.favoriteListings },
        status: 'active'
      }).select('_id');

      const validIds = validListings.map(listing => listing._id);
      const cleanedCount = user.favoriteListings.length - validIds.length;

      // Mettre à jour la liste des favoris si nécessaire
      if (cleanedCount > 0) {
        await User.findByIdAndUpdate(userId, {
          favoriteListings: validIds
        });
      }

      return {
        cleaned: cleanedCount,
        remaining: validIds.length
      };
    } catch (error) {
      console.error('Erreur lors du nettoyage des favoris:', error);
      return { cleaned: 0, remaining: 0 };
    }
  }

  // Mettre à jour le token FCM
  async updateFcmToken(userId, fcmToken) {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { $set: { fcmToken } },
        { new: true, runValidators: true }
      );

      if (!user) {
        throw new Error('Utilisateur non trouvé');
      }

      return user;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new UserService();