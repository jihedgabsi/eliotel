const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log de l'erreur pour le débogage
  console.error('Erreur:', err);

  // Erreur de validation Mongoose
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = {
      message,
      statusCode: 400
    };
  }

  // Erreur de duplication Mongoose (code 11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `${field} existe déjà`;
    error = {
      message,
      statusCode: 400
    };
  }

  // Erreur ObjectId invalide Mongoose
  if (err.name === 'CastError') {
    const message = 'Ressource non trouvée';
    error = {
      message,
      statusCode: 404
    };
  }

  // Erreur JWT
  if (err.name === 'JsonWebTokenError') {
    const message = 'Token invalide';
    error = {
      message,
      statusCode: 401
    };
  }

  // Token expiré
  if (err.name === 'TokenExpiredError') {
    const message = 'Token expiré';
    error = {
      message,
      statusCode: 401
    };
  }

  // Erreur de connexion MongoDB
  if (err.name === 'MongoNetworkError') {
    const message = 'Erreur de connexion à la base de données';
    error = {
      message,
      statusCode: 500
    };
  }

  // Erreur personnalisée avec message
  if (err.message && !error.statusCode) {
    error = {
      message: err.message,
      statusCode: 400
    };
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Erreur serveur interne',
    data: null,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;