const userService = require('../services/userService');
const { validationResult } = require('express-validator');

class UserController {


   // ------------------------------------------------------------------
// NOUVELLES MÉTHODES POUR LA GESTION DES FAVORIS
// ------------------------------------------------------------------

// 1. Ajouter/Retirer un favori
async toggleFavorite(req, res, next) {
    try {
        // L'ID utilisateur est extrait du token JWT (via le middleware 'auth')
        const userId = req.user.userId;
        const { listingId } = req.params;

        // Appel au service
        const result = await userService.toggleFavorite(userId, listingId);

        res.status(200).json({
            success: true,
            message: `Listing ${result.action} des favoris avec succès.`,
            data: {
                favoriteListings: result.user.favoriteListings
            }
        });
    } catch (error) {
        next(error);
    }
}

// 2. Obtenir la liste des favoris
async getFavorites(req, res, next) {
    try {
        const userId = req.user.userId;

        // Appel au service pour récupérer la liste enrichie (avec populate)
        const favorites = await userService.getFavoriteListings(userId);

        res.status(200).json({
            success: true,
            data: {
                favorites,
                count: favorites.length
            }
        });
    } catch (error) {
        next(error);
    }
}

// 3. Nettoyer les favoris invalides
async cleanupFavorites(req, res, next) {
    try {
        const userId = req.user.userId;

        const result = await userService.cleanupInvalidFavorites(userId);

        res.status(200).json({
            success: true,
            message: `${result.cleaned} favoris invalides supprimés. ${result.remaining} favoris restants.`,
            data: result
        });
    } catch (error) {
        next(error);
    }
}




  // Inscription d'un nouvel utilisateur
  async register(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Données invalides',
          errors: errors.array()
        });
      }

      const result = await userService.createUser(req.body);
      
      res.status(201).json({
        success: true,
        message: 'Utilisateur créé avec succès',
        data: {
          user: result.user,
          token: result.token
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Connexion d'un utilisateur
  async login(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Données invalides',
          errors: errors.array()
        });
      }

      const { email, password } = req.body;
      const result = await userService.authenticateUser(email, password);
      
      res.status(200).json({
        success: true,
        message: 'Connexion réussie',
        data: {
          user: result.user,
          token: result.token
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Authentification Google
  async googleAuth(req, res, next) {
    try {
      const { idToken, email, displayName, photoURL } = req.body;

      if (!idToken || !email) {
        return res.status(400).json({
          success: false,
          message: 'Token Google et email requis'
        });
      }

      const result = await userService.authenticateWithGoogle({
        idToken,
        email,
        displayName,
        photoURL
      });
      
      res.status(200).json({
        success: true,
        message: result.isNewUser ? 'Compte créé avec succès' : 'Connexion réussie',
        data: {
          user: result.user,
          token: result.token,
          isNewUser: result.isNewUser
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Devenir hôte
  async becomeHost(req, res, next) {
    try {
      const userId = req.user.userId;
      const result = await userService.becomeHost(userId);
      
      res.status(200).json({
        success: true,
        message: result.message,
        data: {
          user: result.user
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Redevenir voyageur
  async becomeGuest(req, res, next) {
    try {
      const userId = req.user.userId;
      const result = await userService.becomeGuest(userId);
      
      res.status(200).json({
        success: true,
        message: result.message,
        data: {
          user: result.user
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Obtenir le profil utilisateur
  async getProfile(req, res, next) {
    try {
      const userId = req.user.userId;
      const user = await userService.getUserProfile(userId);
      
      res.status(200).json({
        success: true,
        data: {
          user
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Mettre à jour le profil utilisateur
  async updateProfile(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Données invalides',
          errors: errors.array()
        });
      }

      const userId = req.user.userId;
      const user = await userService.updateUserProfile(userId, req.body);
      
      res.status(200).json({
        success: true,
        message: 'Profil mis à jour avec succès',
        data: {
          user
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async uploadAvatar(req, res, next) {
    try {
        const userId = req.user.userId;

        // Vérifier si une image a été uploadée
        if (!req.imageUrls || req.imageUrls.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Veuillez fournir un fichier image pour l\'avatar.'
            });
        }
        
        // Utiliser la première URL d'image
        const avatarUrl = req.imageUrls[0];
        
        // Mise à jour de l'utilisateur dans la DB
        const user = await userService.updateUserAvatar(userId, avatarUrl);

        res.status(200).json({
            success: true,
            message: 'Avatar mis à jour avec succès',
            data: {
                user,
                avatarUrl: avatarUrl
            }
        });
    } catch (error) {
        next(error);
    }
}


  // Mettre à jour le profil d'hôte
  async updateHostProfile(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Données invalides',
          errors: errors.array()
        });
      }

      const userId = req.user.userId;
      const user = await userService.updateHostProfile(userId, req.body);
      
      res.status(200).json({
        success: true,
        message: 'Profil d\'hôte mis à jour avec succès',
        data: {
          user
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Changer le mot de passe
  async changePassword(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Données invalides',
          errors: errors.array()
        });
      }

      const userId = req.user.userId;
      const { currentPassword, newPassword } = req.body;
      
      const result = await userService.changePassword(userId, currentPassword, newPassword);
      
      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  // Obtenir tous les hôtes
  async getHosts(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      
      const result = await userService.getAllHosts(page, limit);
      
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // Rechercher des utilisateurs
  async searchUsers(req, res, next) {
    try {
      const { query, role } = req.query;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      
      if (!query) {
        return res.status(400).json({
          success: false,
          message: 'Paramètre de recherche requis'
        });
      }

      const result = await userService.searchUsers(query, role, page, limit);
      
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // Obtenir le profil d'un utilisateur (peut être guest ou host)
  async getHostProfile(req, res, next) {
    try {
      const { userId } = req.params;
      const user = await userService.getUserProfile(userId);
      
      // Retourner les informations de l'utilisateur même s'il n'est pas actuellement hôte
      // Car un utilisateur peut avoir été hôte avant ou peut le devenir
      const publicProfile = {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
        role: user.role,
        isVerified: user.isVerified,
        hostProfile: user.hostProfile,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };
      
      res.status(200).json({
        success: true,
        data: {
          user: publicProfile
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Obtenir un utilisateur par ID (pour les admins)
  async getUserById(req, res, next) {
    try {
      const { userId } = req.params;
      const user = await userService.getUserProfile(userId);
      
      res.status(200).json({
        success: true,
        data: {
          user
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Enregistrer le token FCM
  async registerFcmToken(req, res, next) {
    try {
      const userId = req.user.userId;
      const { fcmToken } = req.body;

      if (!fcmToken) {
        return res.status(400).json({
          success: false,
          message: 'Token FCM requis'
        });
      }

      const user = await userService.updateFcmToken(userId, fcmToken);
      
      res.status(200).json({
        success: true,
        message: 'Token FCM enregistré avec succès',
        data: {
          user
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UserController();