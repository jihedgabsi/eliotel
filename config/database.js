const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/airbnb-api', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`MongoDB connecté: ${conn.connection.host}`);
    
    // Gestion des événements de connexion
    mongoose.connection.on('connected', () => {
      console.log('Mongoose connecté à MongoDB');
    });

    mongoose.connection.on('error', (err) => {
      console.error('Erreur de connexion Mongoose:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('Mongoose déconnecté');
    });

    // Fermeture propre de la connexion lors de l'arrêt de l'application
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('Connexion MongoDB fermée suite à l\'arrêt de l\'application');
      process.exit(0);
    });

  } catch (error) {
    console.error('Erreur de connexion à MongoDB:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;