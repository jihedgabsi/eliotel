const Listing = require('../models/Listing');
const User = require('../models/User');

class ListingService {
  // Fonction d'aide pour simuler le géocodage
  async geocodeAddress(address) {
    // Simulation du géocodage - dans un vrai projet, utilisez une API comme Google Maps
    const mockCoordinates = {
      'Paris, France': [2.3522, 48.8566],
      'London, UK': [-0.1276, 51.5074],
      'New York, USA': [-74.0060, 40.7128],
      'Tokyo, Japan': [139.6917, 35.6895],
      'Sydney, Australia': [151.2093, -33.8688],
      'Berlin, Germany': [13.4050, 52.5200],
      'Barcelona, Spain': [2.1734, 41.3851],
      'Rome, Italy': [12.4964, 41.9028],
      'Tunis, Tunisia': [10.1815, 36.8065],
      'Sousse, Tunisia': [10.6411, 35.8256],
      'Sfax, Tunisia': [10.7600, 34.7406],
      'Monastir, Tunisia': [10.8262, 35.7643],
      'Hammamet, Tunisia': [10.6167, 36.4000],
      'Djerba, Tunisia': [10.8611, 33.8076],
      'Kairouan, Tunisia': [10.0963, 35.6781],
      'Bizerte, Tunisia': [9.8739, 37.2744],
      'Gabès, Tunisia': [10.0982, 33.8815],
      'Tozeur, Tunisia': [8.1339, 33.9197]
    };

    const fullAddress = `${address.city}, ${address.country}`;
    console.log('Tentative de géocodage pour:', fullAddress);

    let coordinates = mockCoordinates[fullAddress];

    if (!coordinates) {
      // Essayer avec juste la ville
      const cityKey = Object.keys(mockCoordinates).find(key =>
        key.toLowerCase().includes(address.city.toLowerCase())
      );

      if (cityKey) {
        coordinates = mockCoordinates[cityKey];
        console.log('Coordonnées trouvées par recherche de ville:', coordinates);
      } else {
        // Coordonnées par défaut basées sur le pays
        if (address.country.toLowerCase().includes('tunisia') || address.country.toLowerCase().includes('tunisie')) {
          coordinates = [10.1815, 36.8065]; // Tunis par défaut pour la Tunisie
        } else if (address.country.toLowerCase().includes('france')) {
          coordinates = [2.3522, 48.8566]; // Paris par défaut pour la France
        } else {
          coordinates = [2.3522, 48.8566]; // Paris par défaut global
        }
        console.log('Coordonnées par défaut utilisées:', coordinates);
      }
    } else {
      console.log('Coordonnées exactes trouvées:', coordinates);
    }

    return {
      type: 'Point',
      coordinates: coordinates
    };
  }

  // Créer un nouveau listing
  async createListing(listingData, hostId) {
    try {
      // Vérifier que l'utilisateur est un hôte
      const host = await User.findById(hostId);
      if (!host) {
        throw new Error('Hôte non trouvé');
      }
      if (host.role !== 'host') {
        throw new Error('Seuls les hôtes peuvent créer des annonces');
      }

      // Utiliser la localisation fournie, sinon géocoder l'adresse
      let location = listingData.location;
      if (!location || !location.coordinates || location.coordinates.length < 2) {
        console.log('Pas de coordonnées valides fournies, géocodage de l\'adresse...');
        location = await this.geocodeAddress(listingData.address);
      } else {
        console.log('Coordonnées fournies:', location.coordinates);
      }

      // Créer le listing avec la localisation
      const listing = new Listing({
        ...listingData,
        host: hostId,
        location
      });

      await listing.save();

      // Ne pas populer le host lors de la création pour éviter les problèmes de parsing côté client
      // Le client n'a besoin que de l'ID lors de la création

      return listing;
    } catch (error) {
      throw error;
    }
  }

  // helper pour obtenir les utilisateurs bloqués
  async _getBlockedUsers(userId) {
    if (!userId) return [];
    const user = await User.findById(userId).select('blockedUsers');
    return user ? user.blockedUsers : [];
  }

  // Obtenir tous les listings avec filtres
  async getListings(filters = {}, page = 1, limit = 10, requestingUserId = null) {
    try {
      const skip = (page - 1) * limit;
      const minListings = 20; // Minimum de listings à retourner si disponibles

      const blockedUsers = await this._getBlockedUsers(requestingUserId);

      // Si latitude et longitude sont fournies, utiliser la recherche géographique
      if (filters.latitude && filters.longitude) {
        // Construire les critères de base (sans distance)
        const baseCriteria = {
          status: 'active',
          host: { $nin: blockedUsers }
        };

        // Ajouter les autres filtres
        if (filters.propertyType) baseCriteria.propertyType = filters.propertyType;
        if (filters.roomType) baseCriteria.roomType = filters.roomType;
        if (filters.guests) baseCriteria['capacity.guests'] = { $gte: filters.guests };
        if (filters.city) baseCriteria['address.city'] = { $regex: filters.city, $options: 'i' };
        if (filters.country) baseCriteria['address.country'] = { $regex: filters.country, $options: 'i' };

        if (filters.minPrice || filters.maxPrice) {
          baseCriteria['pricing.basePrice'] = {};
          if (filters.minPrice) baseCriteria['pricing.basePrice'].$gte = filters.minPrice;
          if (filters.maxPrice) baseCriteria['pricing.basePrice'].$lte = filters.maxPrice;
        }

        if (filters.amenities && filters.amenities.length > 0) {
          baseCriteria.amenities = { $all: filters.amenities };
        }

        // Compter le total de listings disponibles
        const totalAvailable = await Listing.countDocuments(baseCriteria);

        // Calculer combien de listings récupérer (minimum 20 si disponibles)
        const fetchLimit = Math.max(minListings, limit);

        // Utiliser l'agrégation pour calculer la distance et trier par proximité
        const allListings = await Listing.aggregate([
          { $match: baseCriteria },
          {
            $addFields: {
              distance: {
                $sqrt: {
                  $add: [
                    {
                      $pow: [
                        {
                          $subtract: [
                            { $arrayElemAt: ['$location.coordinates', 0] },
                            filters.longitude
                          ]
                        },
                        2
                      ]
                    },
                    {
                      $pow: [
                        {
                          $subtract: [
                            { $arrayElemAt: ['$location.coordinates', 1] },
                            filters.latitude
                          ]
                        },
                        2
                      ]
                    }
                  ]
                }
              }
            }
          },
          { $sort: { distance: 1 } }, // Trier du plus proche au plus loin
          { $limit: fetchLimit } // Récupérer au moins 20 listings
        ]);

        // Appliquer la pagination sur les résultats triés
        const listings = allListings.slice(skip, skip + limit);

        // Populer les données host manuellement après l'agrégation
        await Listing.populate(listings, {
          path: 'host',
          select: 'firstName lastName avatar role createdAt hostProfile'
        });

        console.log(`📍 Recherche géolocalisée: ${allListings.length} listings trouvés (triés par distance), affichage de ${listings.length}`);

        return {
          listings,
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(allListings.length / limit),
            totalListings: allListings.length,
            hasNext: (skip + limit) < allListings.length,
            hasPrev: page > 1
          }
        };
      }

      // Sinon, recherche normale avec pagination aléatoire
      const searchCriteria = {
        status: 'active',
        host: { $nin: blockedUsers }
      };

      if (filters.propertyType) searchCriteria.propertyType = filters.propertyType;
      if (filters.roomType) searchCriteria.roomType = filters.roomType;
      if (filters.guests) searchCriteria['capacity.guests'] = { $gte: filters.guests };
      if (filters.city) searchCriteria['address.city'] = { $regex: filters.city, $options: 'i' };
      if (filters.country) searchCriteria['address.country'] = { $regex: filters.country, $options: 'i' };

      if (filters.minPrice || filters.maxPrice) {
        searchCriteria['pricing.basePrice'] = {};
        if (filters.minPrice) searchCriteria['pricing.basePrice'].$gte = filters.minPrice;
        if (filters.maxPrice) searchCriteria['pricing.basePrice'].$lte = filters.maxPrice;
      }

      if (filters.amenities && filters.amenities.length > 0) {
        searchCriteria.amenities = { $all: filters.amenities };
      }

      // Utiliser l'agrégation pour obtenir des résultats aléatoires à chaque scroll
      const total = await Listing.countDocuments(searchCriteria);

      const listings = await Listing.aggregate([
        { $match: searchCriteria },
        { $sample: { size: Math.min(limit * 3, total) } },
        { $skip: skip },
        { $limit: limit }
      ]);

      // Populer les données host manuellement après l'agrégation
      await Listing.populate(listings, {
        path: 'host',
        select: 'firstName lastName avatar role createdAt hostProfile'
      });

      console.log(`🎲 Recherche aléatoire: ${listings.length} listings sur ${total} total (page ${page})`);

      return {
        listings,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalListings: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      throw error;
    }
  }

  // Rechercher des listings par proximité géographique
  async searchNearby(longitude, latitude, maxDistance = 10000, filters = {}, page = 1, limit = 10, requestingUserId = null) {
    try {
      const skip = (page - 1) * limit;
      const blockedUsers = await this._getBlockedUsers(requestingUserId);

      // Construire les critères de recherche avec géolocalisation
      const searchCriteria = {
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [longitude, latitude]
            },
            $maxDistance: maxDistance
          }
        },
        status: 'active',
        host: { $nin: blockedUsers }
      };

      // Ajouter les filtres supplémentaires
      if (filters.propertyType) {
        searchCriteria.propertyType = filters.propertyType;
      }

      if (filters.minPrice || filters.maxPrice) {
        searchCriteria['pricing.basePrice'] = {};
        if (filters.minPrice) {
          searchCriteria['pricing.basePrice'].$gte = filters.minPrice;
        }
        if (filters.maxPrice) {
          searchCriteria['pricing.basePrice'].$lte = filters.maxPrice;
        }
      }

      if (filters.guests) {
        searchCriteria['capacity.guests'] = { $gte: filters.guests };
      }

      const listings = await Listing.find(searchCriteria)
        .populate('host', 'firstName lastName avatar role createdAt hostProfile')
        .skip(skip)
        .limit(limit);

      const total = await Listing.countDocuments(searchCriteria);

      return {
        listings,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalListings: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      throw error;
    }
  }

  // Obtenir un listing par ID
  async getListingById(listingId, requestingUserId = null) {
    try {
      const listing = await Listing.findById(listingId)
        .populate('host', 'firstName lastName avatar role createdAt hostProfile');

      if (!listing) {
        throw new Error('Annonce non trouvée');
      }

      // Vérifier si l'hôte est bloqué par l'utilisateur
      if (requestingUserId) {
        const blockedUsers = await this._getBlockedUsers(requestingUserId);
        const isBlocked = blockedUsers.some(
          id => id.toString() === listing.host._id.toString()
        );
        if (isBlocked) {
          throw new Error('Contenu non disponible');
        }
      }

      return listing;
    } catch (error) {
      throw error;
    }
  }

  // Obtenir les listings d'un hôte
  async getHostListings(hostId, page = 1, limit = 10, requestingUserId = null) {
    try {
      const skip = (page - 1) * limit;

      // Si l'hôte est bloqué par l'utilisateur, ne rien retourner
      if (requestingUserId) {
        const blockedUsers = await this._getBlockedUsers(requestingUserId);
        if (blockedUsers.some(id => id.toString() === hostId.toString())) {
          return {
            listings: [],
            pagination: {
              currentPage: page,
              totalPages: 0,
              totalListings: 0,
              hasNext: false,
              hasPrev: false
            }
          };
        }
      }

      const listings = await Listing.find({ host: hostId, status: 'active' })
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });

      const total = await Listing.countDocuments({ host: hostId, status: 'active' });

      return {
        listings,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalListings: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      throw error;
    }
  }

  // Mettre à jour un listing
  async updateListing(listingId, updateData, hostId) {
    try {
      const listing = await Listing.findById(listingId);

      if (!listing) {
        throw new Error('Annonce non trouvée');
      }

      // Vérifier que l'utilisateur est le propriétaire du listing
      if (listing.host.toString() !== hostId) {
        throw new Error('Non autorisé à modifier cette annonce');
      }

      // Gérer la localisation - utiliser les coordonnées fournies ou géocoder seulement si nécessaire
      if (updateData.location && updateData.location.coordinates && updateData.location.coordinates.length >= 2) {
        console.log('Coordonnées de localisation fournies pour la mise à jour:', updateData.location.coordinates);
        // Utiliser les coordonnées fournies
      } else if (updateData.address && !updateData.location) {
        console.log('Adresse modifiée sans coordonnées, géocodage...');
        updateData.location = await this.geocodeAddress(updateData.address);
      }

      // Gérer les images
      if (updateData.existingImages || updateData.newImages) {
        let finalImages = [];

        // Ajouter les images existantes conservées
        if (updateData.existingImages) {
          finalImages = [...updateData.existingImages];
        }

        // Ajouter les nouvelles images
        if (updateData.newImages) {
          finalImages = [...finalImages, ...updateData.newImages];
        }

        // S'assurer qu'il y a au moins une image principale
        if (finalImages.length > 0) {
          const hasPrimary = finalImages.some(img => img.isPrimary);
          if (!hasPrimary) {
            finalImages[0].isPrimary = true;
          }
        }

        updateData.images = finalImages;

        // Supprimer les champs temporaires
        delete updateData.existingImages;
        delete updateData.newImages;
      }

      const updatedListing = await Listing.findByIdAndUpdate(
        listingId,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      return updatedListing;
    } catch (error) {
      throw error;
    }
  }

  // Supprimer un listing
  async deleteListing(listingId, hostId) {
    try {
      const listing = await Listing.findById(listingId);

      if (!listing) {
        throw new Error('Annonce non trouvée');
      }

      // Vérifier que l'utilisateur est le propriétaire du listing
      if (listing.host.toString() !== hostId) {
        throw new Error('Non autorisé à supprimer cette annonce');
      }

      await Listing.findByIdAndDelete(listingId);

      return {
        success: true,
        message: 'Annonce supprimée avec succès'
      };
    } catch (error) {
      throw error;
    }
  }

  // Changer le statut d'un listing
  async updateListingStatus(listingId, status, hostId) {
    try {
      const listing = await Listing.findById(listingId);

      if (!listing) {
        throw new Error('Annonce non trouvée');
      }

      // Vérifier que l'utilisateur est le propriétaire du listing
      if (listing.host.toString() !== hostId) {
        throw new Error('Non autorisé à modifier cette annonce');
      }

      listing.status = status;
      await listing.save();

      return listing;
    } catch (error) {
      throw error;
    }
  }

  // Obtenir les statistiques des listings
  async getListingStats(hostId) {
    try {
      const stats = await Listing.aggregate([
        { $match: { host: hostId } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            avgPrice: { $avg: '$pricing.basePrice' },
            avgRating: { $avg: '$ratings.average' }
          }
        }
      ]);

      const totalListings = await Listing.countDocuments({ host: hostId });

      return {
        totalListings,
        statusBreakdown: stats,
        summary: {
          active: stats.find(s => s._id === 'active')?.count || 0,
          draft: stats.find(s => s._id === 'draft')?.count || 0,
          inactive: stats.find(s => s._id === 'inactive')?.count || 0
        }
      };
    } catch (error) {
      throw error;
    }
  }

  // Rechercher des listings disponibles avec filtrage par dates
  async searchAvailableListings(filters = {}, checkIn = null, checkOut = null, page = 1, limit = 100, requestingUserId = null) {
    try {
      const Booking = require('../models/Booking');
      const skip = (page - 1) * limit;
      const blockedUsers = await this._getBlockedUsers(requestingUserId);

      // Construire les critères de recherche de base
      const searchCriteria = {
        status: 'active',
        host: { $nin: blockedUsers }
      };

      if (filters.city) {
        searchCriteria['address.city'] = { $regex: filters.city, $options: 'i' };
      }

      if (filters.country) {
        searchCriteria['address.country'] = { $regex: filters.country, $options: 'i' };
      }

      if (filters.guests) {
        searchCriteria['capacity.guests'] = { $gte: filters.guests };
      }

      if (filters.propertyType) {
        searchCriteria.propertyType = filters.propertyType;
      }

      // Récupérer tous les listings qui correspondent aux critères de base
      let listings = await Listing.find(searchCriteria)
        .populate('host', 'firstName lastName avatar role createdAt hostProfile')
        .sort({ createdAt: -1 });

      // Si des dates sont fournies, filtrer par disponibilité
      if (checkIn && checkOut) {
        console.log('Filtrage par disponibilité pour les dates:', checkIn, 'à', checkOut);

        // Récupérer toutes les réservations confirmées qui chevauchent les dates demandées
        const overlappingBookings = await Booking.find({
          status: { $in: ['pending', 'confirmed'] },
          $or: [
            // Cas 1: La réservation commence pendant la période demandée
            {
              checkIn: { $gte: checkIn, $lt: checkOut }
            },
            // Cas 2: La réservation se termine pendant la période demandée
            {
              checkOut: { $gt: checkIn, $lte: checkOut }
            },
            // Cas 3: La réservation englobe toute la période demandée
            {
              checkIn: { $lte: checkIn },
              checkOut: { $gte: checkOut }
            }
          ]
        }).select('listing');

        // Extraire les IDs des listings occupés
        const occupiedListingIds = overlappingBookings.map(booking => booking.listing.toString());

        console.log(`${occupiedListingIds.length} listings occupés trouvés`);

        // Filtrer les listings pour exclure ceux qui sont occupés
        listings = listings.filter(listing =>
          !occupiedListingIds.includes(listing._id.toString())
        );

        console.log(`${listings.length} listings disponibles après filtrage`);
      }

      // Pagination
      const totalListings = listings.length;
      const paginatedListings = listings.slice(skip, skip + limit);

      return {
        listings: paginatedListings,
        pagination: {
          totalListings,
          currentPage: page,
          totalPages: Math.ceil(totalListings / limit),
          limit
        }
      };
    } catch (error) {
      console.error('Erreur dans searchAvailableListings:', error);
      throw error;
    }
  }

  // Obtenir les suggestions de villes et pays pour l'autocomplétion
  async getLocationSuggestions(query = '', type = 'city') {
    try {
      const searchField = type === 'city' ? 'address.city' : 'address.country';

      // Utiliser l'agrégation pour obtenir les valeurs uniques avec normalisation
      const suggestions = await Listing.aggregate([
        {
          $match: {
            status: 'active',
            [searchField]: { $regex: query, $options: 'i' }
          }
        },
        {
          // Ajouter un champ normalisé (minuscules, sans espaces multiples)
          $addFields: {
            normalizedName: {
              $trim: {
                input: {
                  $toLower: `$${searchField}`
                }
              }
            }
          }
        },
        {
          // Grouper par nom normalisé pour éliminer les doublons
          $group: {
            _id: '$normalizedName',
            // Prendre le premier nom original (avec la bonne casse)
            originalName: { $first: `$${searchField}` },
            count: { $sum: 1 }
          }
        },
        {
          // Filtrer les noms vides
          $match: {
            _id: { $ne: '' }
          }
        },
        {
          // Trier par popularité (count) puis alphabétiquement
          $sort: { count: -1, _id: 1 }
        },
        {
          $limit: 20
        },
        {
          $project: {
            _id: 0,
            // Capitaliser la première lettre de chaque mot
            name: {
              $reduce: {
                input: { $split: ['$originalName', ' '] },
                initialValue: '',
                in: {
                  $concat: [
                    '$$value',
                    {
                      $cond: [
                        { $eq: ['$$value', ''] },
                        '',
                        ' '
                      ]
                    },
                    {
                      $concat: [
                        { $toUpper: { $substrCP: ['$$this', 0, 1] } },
                        { $toLower: { $substrCP: ['$$this', 1, { $strLenCP: '$$this' }] } }
                      ]
                    }
                  ]
                }
              }
            },
            count: 1
          }
        }
      ]);

      console.log(`🔍 Suggestions ${type}: ${suggestions.length} résultats pour "${query}"`);
      return suggestions;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new ListingService();