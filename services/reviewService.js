const Review = require('../models/Review');
const Booking = require('../models/Booking');
const Listing = require('../models/Listing');
const User = require('../models/User');

class ReviewService {
  // Créer un avis
  async createReview(reviewData, reviewerId) {
    const { bookingId, rating, ratings, comment } = reviewData;

    // Vérifier que la réservation existe
    const booking = await Booking.findById(bookingId)
      .populate('listing')
      .populate('guest')
      .populate('host');

    if (!booking) {
      throw new Error('Réservation non trouvée');
    }

    // Vérifier que la réservation est terminée
    if (booking.status !== 'confirmed' && booking.status !== 'completed') {
      throw new Error('Vous ne pouvez laisser un avis que pour une réservation confirmée ou terminée');
    }

    // Vérifier que la date de checkout est passée
    const now = new Date();
    if (booking.checkOut > now) {
      throw new Error('Vous ne pouvez laisser un avis qu\'après la fin du séjour');
    }

    // Déterminer le rôle de l'auteur
    let reviewerRole;
    let revieweeId;

    if (booking.guest._id.toString() === reviewerId) {
      reviewerRole = 'guest';
      revieweeId = booking.host._id;
    } else if (booking.host._id.toString() === reviewerId) {
      reviewerRole = 'host';
      revieweeId = booking.guest._id;
    } else {
      throw new Error('Vous n\'êtes pas autorisé à laisser un avis pour cette réservation');
    }

    // Vérifier qu'un avis n'existe pas déjà
    const existingReview = await Review.findOne({
      booking: bookingId,
      reviewerRole: reviewerRole
    });

    if (existingReview) {
      throw new Error('Vous avez déjà laissé un avis pour cette réservation');
    }

    // Créer l'avis
    const review = await Review.create({
      booking: bookingId,
      listing: booking.listing._id,
      reviewer: reviewerId,
      reviewee: revieweeId,
      reviewerRole: reviewerRole,
      rating: rating,
      ratings: ratings,
      comment: comment
    });

    // Mettre à jour la réservation avec la référence de l'avis
    if (reviewerRole === 'guest') {
      booking.review.guest = review._id;
    } else {
      booking.review.host = review._id;
    }
    await booking.save();

    // Marquer la réservation comme terminée si ce n'est pas déjà fait
    if (booking.status === 'confirmed') {
      booking.status = 'completed';
      await booking.save();
    }

    return await Review.findById(review._id)
      .populate('reviewer', 'firstName lastName avatar')
      .populate('reviewee', 'firstName lastName avatar')
      .populate('listing', 'title images')
      .populate('booking', 'checkIn checkOut');
  }

  // Obtenir les avis d'une annonce
  async getListingReviews(listingId, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const reviews = await Review.find({
      listing: listingId,
      reviewerRole: 'guest',
      isPublic: true
    })
      .populate('reviewer', 'firstName lastName avatar')
      .populate('booking', 'checkIn checkOut')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalReviews = await Review.countDocuments({
      listing: listingId,
      reviewerRole: 'guest',
      isPublic: true
    });

    return {
      reviews,
      pagination: {
        totalReviews,
        currentPage: page,
        totalPages: Math.ceil(totalReviews / limit),
        hasMore: page < Math.ceil(totalReviews / limit)
      }
    };
  }

  // Obtenir les avis reçus par un utilisateur
  async getUserReviews(userId, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const reviews = await Review.find({
      reviewee: userId,
      isPublic: true
    })
      .populate('reviewer', 'firstName lastName avatar')
      .populate('listing', 'title images')
      .populate('booking', 'checkIn checkOut')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalReviews = await Review.countDocuments({
      reviewee: userId,
      isPublic: true
    });

    return {
      reviews,
      pagination: {
        totalReviews,
        currentPage: page,
        totalPages: Math.ceil(totalReviews / limit),
        hasMore: page < Math.ceil(totalReviews / limit)
      }
    };
  }

  // Obtenir un avis par ID
  async getReviewById(reviewId) {
    const review = await Review.findById(reviewId)
      .populate('reviewer', 'firstName lastName avatar')
      .populate('reviewee', 'firstName lastName avatar')
      .populate('listing', 'title images')
      .populate('booking', 'checkIn checkOut');

    if (!review) {
      throw new Error('Avis non trouvé');
    }

    return review;
  }

  // Répondre à un avis
  async respondToReview(reviewId, userId, responseComment) {
    const review = await Review.findById(reviewId);

    if (!review) {
      throw new Error('Avis non trouvé');
    }

    // Seul le destinataire de l'avis peut répondre
    if (review.reviewee.toString() !== userId) {
      throw new Error('Vous n\'êtes pas autorisé à répondre à cet avis');
    }

    review.response = {
      comment: responseComment,
      createdAt: new Date()
    };

    await review.save();

    return await Review.findById(reviewId)
      .populate('reviewer', 'firstName lastName avatar')
      .populate('reviewee', 'firstName lastName avatar')
      .populate('listing', 'title images')
      .populate('booking', 'checkIn checkOut');
  }

  // Vérifier si un utilisateur peut laisser un avis pour une réservation
  async canReview(bookingId, userId) {
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return { canReview: false, reason: 'Réservation non trouvée' };
    }

    // Vérifier que l'utilisateur est le guest ou le host
    const isGuest = booking.guest.toString() === userId;
    const isHost = booking.host.toString() === userId;

    if (!isGuest && !isHost) {
      return { canReview: false, reason: 'Vous n\'êtes pas autorisé' };
    }

    // Vérifier que la réservation est confirmée ou terminée
    if (booking.status !== 'confirmed' && booking.status !== 'completed') {
      return { canReview: false, reason: 'La réservation doit être confirmée ou terminée' };
    }

    // Vérifier que la date de checkout est passée
    const now = new Date();
    if (booking.checkOut > now) {
      return { canReview: false, reason: 'Le séjour doit être terminé' };
    }

    // Vérifier qu'un avis n'existe pas déjà
    const reviewerRole = isGuest ? 'guest' : 'host';
    const existingReview = await Review.findOne({
      booking: bookingId,
      reviewerRole: reviewerRole
    });

    if (existingReview) {
      return { canReview: false, reason: 'Vous avez déjà laissé un avis', hasReview: true };
    }

    return { canReview: true, role: reviewerRole };
  }

  // Supprimer un avis
  async deleteReview(reviewId, userId) {
    const review = await Review.findById(reviewId);

    if (!review) {
      throw new Error('Avis non trouvé');
    }

    // Seul l'auteur peut supprimer son avis
    if (review.reviewer.toString() !== userId) {
      throw new Error('Vous n\'êtes pas autorisé à supprimer cet avis');
    }

    await Review.findByIdAndDelete(reviewId);

    return { message: 'Avis supprimé avec succès' };
  }

  // Obtenir l'avis d'un booking spécifique
  async getBookingReview(bookingId, userId) {
    // Vérifier que la réservation existe
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      throw new Error('Réservation non trouvée');
    }

    // Vérifier que l'utilisateur est autorisé (guest ou host)
    if (booking.guest.toString() !== userId && booking.host.toString() !== userId) {
      throw new Error('Vous n\'êtes pas autorisé à voir cet avis');
    }

    // Récupérer l'avis du voyageur (guest review)
    const review = await Review.findOne({
      booking: bookingId,
      reviewerRole: 'guest'
    })
      .populate('reviewer', 'firstName lastName avatar')
      .populate('reviewee', 'firstName lastName avatar')
      .populate('listing', 'title images')
      .populate('booking', 'checkIn checkOut');

    return review;
  }
}

module.exports = new ReviewService();
