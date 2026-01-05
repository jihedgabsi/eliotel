const Chat = require('../models/Chat');
const Booking = require('../models/Booking');
const User = require('../models/User');
const Listing = require('../models/Listing');

class ChatService {
  // Obtenir les chats d'un utilisateur
  async getUserChats(userId, page = 1, limit = 20, chatType = null) {
    try {
      const skip = (page - 1) * limit;
      
      const query = { 
        participants: userId,
        isActive: true 
      };
      
      if (chatType) {
        query.chatType = chatType;
      }

      const chats = await Chat.find(query)
        .populate('participants', 'firstName lastName avatar')
        .populate('booking', 'checkIn checkOut status guest host')
        .populate('listing', 'title images')
        .sort({ 'lastMessage.sentAt': -1 })
        .skip(skip)
        .limit(limit);

      const total = await Chat.countDocuments(query);

      // Calculer les messages non lus et ajouter les IDs hôte/voyageur pour chaque chat
      const chatsWithUnread = chats.map(chat => {
        const chatObj = chat.toObject();
        chatObj.unreadCount = chat.unreadCount(userId);
        
        // Ajouter les IDs hôte/voyageur directement sur l'objet chat pour faciliter l'accès côté frontend
        if (chatObj.chatType === 'booking' && chatObj.booking) {
          chatObj.hostId = chatObj.booking.host?._id || chatObj.booking.host;
          chatObj.guestId = chatObj.booking.guest?._id || chatObj.booking.guest;
        }
        
        return chatObj;
      });

      return {
        chats: chatsWithUnread,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalChats: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      throw error;
    }
  }

  // Créer un nouveau chat
  async createChat(userId, participantId, chatType = 'general', listingId = null, initialMessage = null) {
    try {
      // Vérifier que l'utilisateur n'essaie pas de créer un chat avec lui-même
      if (userId === participantId) {
        throw new Error('Vous ne pouvez pas créer un chat avec vous-même');
      }

      // Vérifier que le participant existe
      const participant = await User.findById(participantId);
      if (!participant) {
        throw new Error('Utilisateur non trouvé');
      }

      // Vérifier s'il existe déjà un chat entre ces utilisateurs
      const existingChat = await Chat.findOne({
        participants: { $all: [userId, participantId] },
        chatType: chatType,
        listing: listingId,
        isActive: true
      });

      if (existingChat) {
        return existingChat;
      }

      // Créer le nouveau chat
      const chatData = {
        participants: [userId, participantId],
        chatType,
        isActive: true
      };

      if (listingId) {
        const listing = await Listing.findById(listingId);
        if (!listing) {
          throw new Error('Annonce non trouvée');
        }
        chatData.listing = listingId;
        chatData.metadata = {
          title: `Discussion - ${listing.title}`,
          description: 'Chat concernant cette annonce'
        };
      }

      const chat = new Chat(chatData);
      await chat.save();

      // Ajouter le message initial si fourni
      if (initialMessage) {
        await chat.addMessage(userId, initialMessage);
      }

      // Populer les données pour la réponse
      await chat.populate([
        { path: 'participants', select: 'firstName lastName avatar' },
        { path: 'listing', select: 'title images' }
      ]);

      return chat;
    } catch (error) {
      throw error;
    }
  }

  // Obtenir un chat par ID pour l'API (avec IDs hôte/voyageur)
  async getChatByIdForAPI(chatId, userId) {
    try {
      const chat = await this.getChatById(chatId, userId);

      // Ajouter les IDs hôte/voyageur directement sur l'objet chat
      const chatObj = chat.toObject();
      if (chatObj.chatType === 'booking' && chatObj.booking) {
        chatObj.hostId = chatObj.booking.host?._id || chatObj.booking.host;
        chatObj.guestId = chatObj.booking.guest?._id || chatObj.booking.guest;
      }

      return chatObj;
    } catch (error) {
      throw error;
    }
  }

  // Créer un chat de réservation
  async createBookingChat(bookingId, userId) {
    try {
      const booking = await Booking.findById(bookingId)
        .populate('guest', 'firstName lastName')
        .populate('host', 'firstName lastName')
        .populate('listing', 'title');

      if (!booking) {
        throw new Error('Réservation non trouvée');
      }

      // Vérifier que l'utilisateur est soit l'invité soit l'hôte
      if (booking.guest._id.toString() !== userId && booking.host._id.toString() !== userId) {
        throw new Error('Non autorisé à créer ce chat');
      }

      // Utiliser la méthode statique du modèle
      const chat = await Chat.createBookingChat(
        bookingId,
        booking.guest._id,
        booking.host._id,
        booking.listing._id
      );

      await chat.populate([
        { path: 'participants', select: 'firstName lastName avatar' },
        { path: 'booking', select: 'checkIn checkOut status guest host' },
        { path: 'listing', select: 'title images' }
      ]);

      // Ajouter les IDs hôte/voyageur directement sur l'objet chat
      const chatObj = chat.toObject();
      if (chatObj.chatType === 'booking' && chatObj.booking) {
        chatObj.hostId = chatObj.booking.host?._id || chatObj.booking.host;
        chatObj.guestId = chatObj.booking.guest?._id || chatObj.booking.guest;
      }

      return chatObj;
    } catch (error) {
      throw error;
    }
  }

  // Obtenir un chat par ID
  async getChatById(chatId, userId) {
    try {
      const chat = await Chat.findById(chatId)
        .populate('participants', 'firstName lastName avatar')
        .populate('booking', 'checkIn checkOut status guest host')
        .populate('listing', 'title images address');

      if (!chat) {
        throw new Error('Chat non trouvé');
      }

      // Vérifier que l'utilisateur est participant
      if (!chat.participants.some(p => p._id.toString() === userId)) {
        throw new Error('Non autorisé à accéder à ce chat');
      }

      return chat;
    } catch (error) {
      throw error;
    }
  }

  // Obtenir les messages d'un chat
  async getChatMessages(chatId, userId, page = 1, limit = 50) {
    try {
      // Récupérer le chat directement (document Mongoose)
      const chat = await Chat.findById(chatId)
        .populate('participants', 'firstName lastName avatar')
        .populate('booking', 'checkIn checkOut status guest host')
        .populate('listing', 'title images address');

      if (!chat) {
        throw new Error('Chat non trouvé');
      }

      // Vérifier que l'utilisateur est participant
      if (!chat.participants.some(p => p._id.toString() === userId)) {
        throw new Error('Non autorisé à accéder à ce chat');
      }

      // Calculer la pagination pour les messages
      const skip = (page - 1) * limit;
      const totalMessages = chat.messages.filter(msg => !msg.isDeleted).length;
      
      // Trier les messages par date (plus récents en premier) et paginer
      const messages = chat.messages
        .filter(msg => !msg.isDeleted)
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(skip, skip + limit)
        .reverse(); // Remettre dans l'ordre chronologique pour l'affichage

      // Populer les informations des expéditeurs
      await chat.populate('messages.sender', 'firstName lastName avatar');

      return {
        messages,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalMessages / limit),
          totalMessages,
          hasNext: page < Math.ceil(totalMessages / limit),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      throw error;
    }
  }

  // Envoyer un message
  async sendMessage(chatId, userId, content, messageType = 'text', attachments = []) {
    try {
      const chat = await Chat.findById(chatId);
      if (!chat) {
        throw new Error('Chat non trouvé');
      }

      // Vérifier que l'utilisateur est participant
      if (!chat.participants.includes(userId)) {
        throw new Error('Non autorisé à envoyer des messages dans ce chat');
      }

      // Vérifier que le chat est actif
      if (!chat.isActive) {
        throw new Error('Ce chat n\'est plus actif');
      }

      // Ajouter le message
      await chat.addMessage(userId, content, messageType, attachments);

      // Récupérer le message ajouté avec les données populées
      const updatedChat = await Chat.findById(chatId)
        .populate('messages.sender', 'firstName lastName avatar');

      const newMessage = updatedChat.messages[updatedChat.messages.length - 1];

      return newMessage;
    } catch (error) {
      throw error;
    }
  }

  // Marquer les messages comme lus
  async markAsRead(chatId, userId) {
    try {
      const chat = await Chat.findById(chatId);
      if (!chat) {
        throw new Error('Chat non trouvé');
      }

      // Vérifier que l'utilisateur est participant
      if (!chat.participants.includes(userId)) {
        throw new Error('Non autorisé à accéder à ce chat');
      }

      await chat.markAsRead(userId);
      return true;
    } catch (error) {
      throw error;
    }
  }

  // Supprimer un message
  async deleteMessage(chatId, messageId, userId) {
    try {
      const chat = await Chat.findById(chatId);
      if (!chat) {
        throw new Error('Chat non trouvé');
      }

      // Vérifier que l'utilisateur est participant
      if (!chat.participants.includes(userId)) {
        throw new Error('Non autorisé à accéder à ce chat');
      }

      await chat.deleteMessage(messageId, userId);
      return true;
    } catch (error) {
      throw error;
    }
  }

  // Éditer un message
  async editMessage(chatId, messageId, userId, newContent) {
    try {
      const chat = await Chat.findById(chatId);
      if (!chat) {
        throw new Error('Chat non trouvé');
      }

      // Vérifier que l'utilisateur est participant
      if (!chat.participants.includes(userId)) {
        throw new Error('Non autorisé à accéder à ce chat');
      }

      await chat.editMessage(messageId, userId, newContent);

      // Retourner le message modifié
      const message = chat.messages.id(messageId);
      return message;
    } catch (error) {
      throw error;
    }
  }

  // Désactiver un chat
  async deactivateChat(chatId, userId) {
    try {
      const chat = await Chat.findById(chatId);
      if (!chat) {
        throw new Error('Chat non trouvé');
      }

      // Vérifier que l'utilisateur est participant
      if (!chat.participants.includes(userId)) {
        throw new Error('Non autorisé à désactiver ce chat');
      }

      chat.isActive = false;
      await chat.save();

      return true;
    } catch (error) {
      throw error;
    }
  }

  // Rechercher des chats
  async searchChats(userId, query, chatType = null, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;

      const searchCriteria = {
        participants: userId,
        isActive: true,
        $or: [
          { 'metadata.title': { $regex: query, $options: 'i' } },
          { 'metadata.description': { $regex: query, $options: 'i' } },
          { 'lastMessage.content': { $regex: query, $options: 'i' } }
        ]
      };

      if (chatType) {
        searchCriteria.chatType = chatType;
      }

      const chats = await Chat.find(searchCriteria)
        .populate('participants', 'firstName lastName avatar')
        .populate('booking', 'checkIn checkOut status')
        .populate('listing', 'title images')
        .sort({ 'lastMessage.sentAt': -1 })
        .skip(skip)
        .limit(limit);

      const total = await Chat.countDocuments(searchCriteria);

      return {
        chats,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalChats: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      throw error;
    }
  }

  // Obtenir le nombre total de messages non lus
  async getUnreadCount(userId) {
    try {
      const chats = await Chat.find({
        participants: userId,
        isActive: true
      });

      let totalUnread = 0;
      chats.forEach(chat => {
        totalUnread += chat.unreadCount(userId);
      });

      return totalUnread;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new ChatService();