const mongoose = require('mongoose');
const User = require('../models/User');
const Listing = require('../models/Listing');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Données de test pour les listings
const sampleListings = [
  {
    title: "Appartement moderne au cœur de Paris",
    description: "Magnifique appartement de 2 chambres avec vue sur la Seine. Idéalement situé près des monuments historiques et des transports en commun.",
    propertyType: "apartment",
    roomType: "entire_place",
    address: {
      street: "15 Rue de Rivoli",
      city: "Paris",
      country: "France",
      zipCode: "75001"
    },
    location: {
      type: "Point",
      coordinates: [2.3522, 48.8566]
    },
    capacity: {
      guests: 4,
      bedrooms: 2,
      beds: 2,
      bathrooms: 1
    },
    amenities: ["wifi", "kitchen", "washer", "tv", "air_conditioning"],
    pricing: {
      basePrice: 120,
      currency: "EUR",
      cleaningFee: 25,
      serviceFee: 15
    },
    images: [
      {
        url: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800",
        caption: "Vue d'ensemble de l'appartement",
        isPrimary: true
      },
      {
        url: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800",
        caption: "Salon moderne",
        isPrimary: false
      }
    ],
    status: "active"
  },
  {
    title: "Villa avec piscine à Nice",
    description: "Superbe villa avec piscine privée et jardin. Parfaite pour des vacances en famille sur la Côte d'Azur.",
    propertyType: "villa",
    roomType: "entire_place",
    address: {
      street: "25 Avenue des Palmiers",
      city: "Nice",
      country: "France",
      zipCode: "06000"
    },
    location: {
      type: "Point",
      coordinates: [7.2619, 43.7102]
    },
    capacity: {
      guests: 8,
      bedrooms: 4,
      beds: 4,
      bathrooms: 3
    },
    amenities: ["wifi", "pool", "kitchen", "washer", "tv", "air_conditioning", "patio", "bbq_grill"],
    pricing: {
      basePrice: 280,
      currency: "EUR",
      cleaningFee: 50,
      serviceFee: 35
    },
    images: [
      {
        url: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800",
        caption: "Vue extérieure de la villa",
        isPrimary: true
      },
      {
        url: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800",
        caption: "Piscine privée",
        isPrimary: false
      }
    ],
    status: "active"
  },
  {
    title: "Studio cosy à Lyon",
    description: "Charmant studio dans le Vieux Lyon, proche des restaurants et attractions touristiques.",
    propertyType: "studio",
    roomType: "entire_place",
    address: {
      street: "8 Rue du Bœuf",
      city: "Lyon",
      country: "France",
      zipCode: "69005"
    },
    location: {
      type: "Point",
      coordinates: [4.8357, 45.7640]
    },
    capacity: {
      guests: 2,
      bedrooms: 1,
      beds: 1,
      bathrooms: 1
    },
    amenities: ["wifi", "kitchen", "tv", "heating"],
    pricing: {
      basePrice: 65,
      currency: "EUR",
      cleaningFee: 15,
      serviceFee: 8
    },
    images: [
      {
        url: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800",
        caption: "Intérieur du studio",
        isPrimary: true
      }
    ],
    status: "active"
  },
  {
    title: "Maison de campagne en Provence",
    description: "Authentique maison provençale entourée de lavande et d'oliviers. Calme et sérénité garantis.",
    propertyType: "house",
    roomType: "entire_place",
    address: {
      street: "Chemin des Lavandes",
      city: "Aix-en-Provence",
      country: "France",
      zipCode: "13100"
    },
    location: {
      type: "Point",
      coordinates: [5.4474, 43.5297]
    },
    capacity: {
      guests: 6,
      bedrooms: 3,
      beds: 3,
      bathrooms: 2
    },
    amenities: ["wifi", "kitchen", "washer", "tv", "patio", "bbq_grill", "fire_pit"],
    pricing: {
      basePrice: 150,
      currency: "EUR",
      cleaningFee: 30,
      serviceFee: 20
    },
    images: [
      {
        url: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800",
        caption: "Façade de la maison",
        isPrimary: true
      },
      {
        url: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800",
        caption: "Jardin avec lavande",
        isPrimary: false
      }
    ],
    status: "active"
  },
  {
    title: "Loft industriel à Marseille",
    description: "Loft moderne dans un ancien entrepôt rénové. Design contemporain et espace ouvert.",
    propertyType: "loft",
    roomType: "entire_place",
    address: {
      street: "45 Rue de la République",
      city: "Marseille",
      country: "France",
      zipCode: "13002"
    },
    location: {
      type: "Point",
      coordinates: [5.3698, 43.2965]
    },
    capacity: {
      guests: 4,
      bedrooms: 2,
      beds: 2,
      bathrooms: 2
    },
    amenities: ["wifi", "kitchen", "washer", "tv", "air_conditioning", "dedicated_workspace"],
    pricing: {
      basePrice: 95,
      currency: "EUR",
      cleaningFee: 20,
      serviceFee: 12
    },
    images: [
      {
        url: "https://images.unsplash.com/photo-1502672023488-70e25813eb80?w=800",
        caption: "Espace de vie ouvert",
        isPrimary: true
      }
    ],
    status: "active"
  }
];

async function seedListings() {
  try {
    // Connexion à MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connecté à MongoDB');

    // Vérifier s'il existe des utilisateurs hôtes
    let hosts = await User.find({ role: 'host' }).limit(5);
    
    if (hosts.length === 0) {
      console.log('Aucun hôte trouvé, création d\'hôtes de test...');
      
      // Créer des hôtes de test
      const hostData = [
        {
          firstName: "Marie",
          lastName: "Dubois",
          email: "marie.dubois@example.com",
          password: "$2b$10$rOvHPxfzABtlbiHlQFiu6.kMlkGjwjYkHpDsM6b8FHxw8E.Nt8zTu", // password123
          role: "host",
          isVerified: true,
          hostProfile: {
            bio: "Hôte passionnée depuis 5 ans",
            responseRate: 95,
            responseTime: "within_hour"
          }
        },
        {
          firstName: "Pierre",
          lastName: "Martin",
          email: "pierre.martin@example.com",
          password: "$2b$10$rOvHPxfzABtlbiHlQFiu6.kMlkGjwjYkHpDsM6b8FHxw8E.Nt8zTu", // password123
          role: "host",
          isVerified: true,
          hostProfile: {
            bio: "Propriétaire de plusieurs biens immobiliers",
            responseRate: 98,
            responseTime: "within_hour"
          }
        },
        {
          firstName: "Sophie",
          lastName: "Leroy",
          email: "sophie.leroy@example.com",
          password: "$2b$10$rOvHPxfzABtlbiHlQFiu6.kMlkGjwjYkHpDsM6b8FHxw8E.Nt8zTu", // password123
          role: "host",
          isVerified: true,
          hostProfile: {
            bio: "Spécialisée dans les locations de charme",
            responseRate: 92,
            responseTime: "within_few_hours"
          }
        }
      ];

      hosts = await User.insertMany(hostData);
      console.log(`${hosts.length} hôtes créés`);
    }

    // Supprimer les anciens listings
    await Listing.deleteMany({});
    console.log('Anciens listings supprimés');

    // Créer les nouveaux listings
    const listingsToCreate = sampleListings.map((listing, index) => ({
      ...listing,
      host: hosts[index % hosts.length]._id
    }));

    const createdListings = await Listing.insertMany(listingsToCreate);
    console.log(`${createdListings.length} listings créés avec succès`);

    // Afficher un résumé
    console.log('\n=== RÉSUMÉ ===');
    for (const listing of createdListings) {
      console.log(`- ${listing.title} (${listing.address.city}) - ${listing.pricing.basePrice}€/nuit`);
    }

    console.log('\n✅ Données de test créées avec succès!');
    console.log('Vous pouvez maintenant tester l\'application Flutter.');

  } catch (error) {
    console.error('Erreur lors de la création des données:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Déconnecté de MongoDB');
  }
}

// Exécuter le script
seedListings();