const listingService = require('../services/listingService');

class ListingController {
  // Créer un nouveau listing
  async createListing(req, res, next) {
    try {
      console.log('Raw request body:', req.body);
      console.log('Files:', req.files?.length || 0);

      // Parser les données JSON des champs de formulaire
      const listingData = {};

      // Parser chaque champ
      for (const [key, value] of Object.entries(req.body)) {
        try {
          if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
            listingData[key] = JSON.parse(value);
          } else {
            listingData[key] = value;
          }
        } catch (e) {
          listingData[key] = value;
        }
      }

      console.log('Parsed listing data:', listingData);

      // Validation basique des champs requis
      const requiredFields = {
        title: 'Titre requis',
        description: 'Description requise',
        propertyType: 'Type de propriété requis',
        roomType: 'Type de chambre requis',
        address: 'Adresse requise',
        capacity: 'Capacité requise',
        pricing: 'Prix requis'
      };

      for (const [field, message] of Object.entries(requiredFields)) {
        if (!listingData[field]) {
          return res.status(400).json({
            success: false,
            message: message,
            field: field
          });
        }
      }

      // Validation des sous-objets
      if (listingData.address && (!listingData.address.street || !listingData.address.city || !listingData.address.country)) {
        return res.status(400).json({
          success: false,
          message: 'Adresse complète requise (rue, ville, pays)'
        });
      }

      if (listingData.capacity && (!listingData.capacity.guests || !listingData.capacity.bedrooms || !listingData.capacity.beds || !listingData.capacity.bathrooms)) {
        return res.status(400).json({
          success: false,
          message: 'Capacité complète requise (invités, chambres, lits, salles de bain)'
        });
      }

      if (listingData.pricing && (!listingData.pricing.basePrice || !listingData.pricing.currency)) {
        return res.status(400).json({
          success: false,
          message: 'Prix complet requis (prix de base, devise)'
        });
      }

      // Vérifier qu'au moins une image est fournie
      if (!req.imageUrls || req.imageUrls.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Au moins une image est requise'
        });
      }

      // Traiter les images uploadées - format attendu par le modèle
      const images = req.imageUrls.map((imageUrl, index) => {
        return {
          url: imageUrl,
          isPrimary: index === 0, // La première image est principale
          caption: `Image ${index + 1}`
        };
      });

      console.log(`${req.imageUrls.length} images uploaded for listing`);

      // Ajouter les images aux données du listing
      listingData.images = images;

      // Vérifier si des coordonnées valides sont fournies
      if (listingData.location && listingData.location.coordinates && listingData.location.coordinates.length >= 2) {
        console.log('Coordonnées valides fournies:', listingData.location.coordinates);
      } else {
        console.log('Aucune coordonnée valide fournie, le service géocodera l\'adresse');
        // Ne pas forcer de coordonnées par défaut, laisser le service gérer
      }

      // Ajouter des valeurs par défaut pour les champs optionnels
      if (!listingData.amenities) {
        listingData.amenities = [];
      }

      // Définir le statut comme actif par défaut pour les nouveaux listings
      if (!listingData.status) {
        listingData.status = 'active';
      }

      console.log('Final listing data:', JSON.stringify(listingData, null, 2));

      const hostId = req.user.userId;
      const listing = await listingService.createListing(listingData, hostId);

      res.status(201).json({
        success: true,
        message: 'Annonce créée avec succès',
        data: {
          listing
        }
      });
    } catch (error) {
      console.error('Error creating listing:', error);

      // Gestion spécifique des erreurs Mongoose
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map(err => err.message);
        return res.status(400).json({
          success: false,
          message: 'Erreur de validation',
          errors: validationErrors
        });
      }

      if (error.message.includes('Hôte non trouvé') || error.message.includes('Seuls les hôtes')) {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Erreur lors de la création de l\'annonce',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Obtenir tous les listings avec filtres
  async getListings(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      // Extraire les filtres de la query string
      const filters = {};
      if (req.query.propertyType) filters.propertyType = req.query.propertyType;
      if (req.query.roomType) filters.roomType = req.query.roomType;
      if (req.query.minPrice) filters.minPrice = parseFloat(req.query.minPrice);
      if (req.query.maxPrice) filters.maxPrice = parseFloat(req.query.maxPrice);
      if (req.query.guests) filters.guests = parseInt(req.query.guests);
      if (req.query.city) filters.city = req.query.city;
      if (req.query.country) filters.country = req.query.country;
      if (req.query.amenities) {
        filters.amenities = Array.isArray(req.query.amenities)
          ? req.query.amenities
          : req.query.amenities.split(',');
      }

      // Géolocalisation : filtrer par distance si latitude et longitude sont fournies
      const latitude = req.query.latitude ? parseFloat(req.query.latitude) : null;
      const longitude = req.query.longitude ? parseFloat(req.query.longitude) : null;
      const maxDistance = req.query.maxDistance ? parseFloat(req.query.maxDistance) : 100; // 100 km par défaut

      if (latitude && longitude) {
        filters.latitude = latitude;
        filters.longitude = longitude;
        filters.maxDistance = maxDistance;
      }

      const result = await listingService.getListings(filters, page, limit);

      res.status(200).json({
        success: true,
        listings: result.listings,
        totalCount: result.pagination.totalListings,
        currentPage: result.pagination.currentPage,
        totalPages: result.pagination.totalPages
      });
    } catch (error) {
      next(error);
    }
  }

  // Rechercher des listings disponibles avec filtrage par dates
  async searchAvailableListings(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 100;

      // Extraire les filtres
      const filters = {};
      if (req.query.city) filters.city = req.query.city;
      if (req.query.country) filters.country = req.query.country;
      if (req.query.guests) filters.guests = parseInt(req.query.guests);
      if (req.query.propertyType) filters.propertyType = req.query.propertyType;

      // Extraire les dates
      const checkIn = req.query.checkIn ? new Date(req.query.checkIn) : null;
      const checkOut = req.query.checkOut ? new Date(req.query.checkOut) : null;

      const result = await listingService.searchAvailableListings(
        filters,
        checkIn,
        checkOut,
        page,
        limit
      );

      res.status(200).json({
        success: true,
        listings: result.listings,
        totalCount: result.pagination.totalListings,
        currentPage: result.pagination.currentPage,
        totalPages: result.pagination.totalPages
      });
    } catch (error) {
      next(error);
    }
  }

  // Rechercher des listings par proximité
  async searchNearby(req, res, next) {
    try {
      const { longitude, latitude } = req.query;
      const maxDistance = parseInt(req.query.maxDistance) || 10000;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      if (!longitude || !latitude) {
        return res.status(400).json({
          success: false,
          message: 'Longitude et latitude sont requises'
        });
      }

      // Extraire les filtres additionnels
      const filters = {};
      if (req.query.propertyType) filters.propertyType = req.query.propertyType;
      if (req.query.minPrice) filters.minPrice = parseFloat(req.query.minPrice);
      if (req.query.maxPrice) filters.maxPrice = parseFloat(req.query.maxPrice);
      if (req.query.guests) filters.guests = parseInt(req.query.guests);

      const result = await listingService.searchNearby(
        parseFloat(longitude),
        parseFloat(latitude),
        maxDistance,
        filters,
        page,
        limit
      );

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // Obtenir un listing par ID
  async getListingById(req, res, next) {
    try {
      const { listingId } = req.params;
      console.log('getListingById called with listingId:', listingId);

      if (listingId === 'my-listings') {
        console.log('ERROR: getListingById called with "my-listings" - routing issue!');
        return res.status(400).json({
          success: false,
          message: 'Invalid listing ID - routing error detected'
        });
      }

      const listing = await listingService.getListingById(listingId);

      res.status(200).json({
        success: true,
        data: {
          listing
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Obtenir les listings d'un hôte
  async getHostListings(req, res, next) {
    try {
      console.log('getHostListings called - correct route');
      const hostId = req.user.userId;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      console.log('Host ID:', hostId, 'Type:', typeof hostId);

      const result = await listingService.getHostListings(hostId, page, limit);

      res.status(200).json({
        success: true,
        listings: result.listings,
        totalCount: result.pagination.totalListings,
        currentPage: result.pagination.currentPage,
        totalPages: result.pagination.totalPages
      });
    } catch (error) {
      next(error);
    }
  }

  // Obtenir les listings d'un hôte spécifique (par ID)
  async getListingsByHostId(req, res, next) {
    try {
      const { hostId } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      const result = await listingService.getHostListings(hostId, page, limit);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // Mettre à jour un listing
  async updateListing(req, res, next) {
    try {
      console.log('Raw update request body:', req.body);
      console.log('New image files:', req.files?.length || 0);

      // Parser les données JSON des champs de formulaire si nécessaire
      const updateData = {};

      for (const [key, value] of Object.entries(req.body)) {
        try {
          if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
            updateData[key] = JSON.parse(value);
          } else {
            updateData[key] = value;
          }
        } catch (e) {
          updateData[key] = value;
        }
      }

      console.log('Parsed update data:', updateData);

      const { listingId } = req.params;
      const hostId = req.user.userId;

      // Traiter les nouvelles images si présentes
      let newImages = [];
      if (req.imageUrls && req.imageUrls.length > 0) {
        newImages = req.imageUrls.map((imageUrl, index) => {
          return {
            url: imageUrl,
            isPrimary: false, // Les nouvelles images ne sont pas principales par défaut
            caption: `Image ${index + 1}`
          };
        });
        console.log(`${req.imageUrls.length} new images processed for update`);
      }

      // Ajouter les nouvelles images aux données de mise à jour
      if (newImages.length > 0) {
        updateData.newImages = newImages;
      }

      const listing = await listingService.updateListing(listingId, updateData, hostId);

      res.status(200).json({
        success: true,
        message: 'Annonce mise à jour avec succès',
        data: {
          listing
        }
      });
    } catch (error) {
      console.error('Error updating listing:', error);

      // Gestion spécifique des erreurs
      if (error.message.includes('Listing not found') || error.message.includes('Annonce non trouvée')) {
        return res.status(404).json({
          success: false,
          message: 'Annonce non trouvée'
        });
      }

      if (error.message.includes('Unauthorized') || error.message.includes('Non autorisé')) {
        return res.status(403).json({
          success: false,
          message: 'Non autorisé à modifier cette annonce'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Erreur lors de la mise à jour de l\'annonce',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Supprimer un listing
  async deleteListing(req, res, next) {
    try {
      const { listingId } = req.params;
      const hostId = req.user.userId;

      const result = await listingService.deleteListing(listingId, hostId);

      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  // Changer le statut d'un listing
  async updateListingStatus(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Données invalides',
          errors: errors.array()
        });
      }

      const { listingId } = req.params;
      const { status } = req.body;
      const hostId = req.user.userId;

      const listing = await listingService.updateListingStatus(listingId, status, hostId);

      res.status(200).json({
        success: true,
        message: 'Statut de l\'annonce mis à jour avec succès',
        data: {
          listing
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Obtenir les statistiques des listings d'un hôte
  async getListingStats(req, res, next) {
    try {
      const hostId = req.user.userId;
      const stats = await listingService.getListingStats(hostId);

      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }

  // Obtenir les suggestions de villes ou pays pour l'autocomplétion
  async getLocationSuggestions(req, res, next) {
    try {
      const query = req.query.q || '';
      const type = req.query.type || 'city'; // 'city' ou 'country'

      const suggestions = await listingService.getLocationSuggestions(query, type);

      res.status(200).json({
        success: true,
        suggestions
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ListingController();