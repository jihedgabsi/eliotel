const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware d'authentification
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Accès refusé. Token manquant.'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Vérifier que l'utilisateur existe toujours
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Token invalide. Utilisateur non trouvé.'
      });
    }

    req.user = decoded;
    req.userDoc = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token invalide.'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expiré.'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de l\'authentification.'
    });
  }
};

// Middleware pour vérifier le rôle d'hôte
const requireHost = (req, res, next) => {
  if (req.userDoc.role !== 'host') {
    return res.status(403).json({
      success: false,
      message: 'Accès refusé. Seuls les hôtes peuvent effectuer cette action.'
    });
  }
  next();
};

// Middleware pour vérifier le rôle d'admin
const requireAdmin = (req, res, next) => {
  if (req.userDoc.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Accès refusé. Seuls les administrateurs peuvent effectuer cette action.'
    });
  }
  next();
};

// Middleware optionnel d'authentification (pour les routes publiques avec données utilisateur optionnelles)
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      const user = await User.findById(decoded.userId);
      
      if (user) {
        req.user = decoded;
        req.userDoc = user;
      }
    }
    
    next();
  } catch (error) {
    // En cas d'erreur, continuer sans authentification
    next();
  }
};

module.exports = {
  auth,
  requireHost,
  requireAdmin,
  optionalAuth
};