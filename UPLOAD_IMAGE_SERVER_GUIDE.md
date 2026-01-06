# Guide d'utilisation du serveur d'images externe

## Configuration

### Middleware `upload.js`
Le middleware gère l'upload d'images vers un serveur externe via l'API configurée dans `IMAGE_SERVER_URL`.

### Variables d'environnement
Dans `.env` :
```
IMAGE_SERVER_URL=http://m4ckwwswggwo8c8g08gwsscc.82.112.242.233.sslip.io/uploads/upload
```

## Fonctionnement

### Middleware `uploadToImageServer`
Ce middleware :
- Supporte `upload.single()` → utilise `req.file`
- Supporte `upload.array()` → utilise `req.files`
- Convertit les buffers en streams
- Envoie les fichiers à l'API externe via FormData
- Stocke les URLs dans `req.imageUrls`

### Exemple d'utilisation

#### Upload d'un avatar (fichier unique)
```javascript
router.post('/avatar',
  upload.single('avatar'),
  uploadToImageServer,
  userController.uploadAvatar
);
```

Dans le contrôleur :
```javascript
const avatarUrl = req.imageUrls[0];
```

#### Upload de plusieurs images (listings)
```javascript
router.post('/',
  upload.array('images', 10),
  uploadToImageServer,
  listingController.createListing
);
```

Dans le contrôleur :
```javascript
const images = req.imageUrls.map((url, index) => ({
  url: url,
  isPrimary: index === 0,
  caption: `Image ${index + 1}`
}));
```

## Format de réponse de l'API externe

L'API doit retourner :
```json
{
  "success": true,
  "imageUrl": "https://example.com/path/to/image.jpg"
}
```

## Test

Utilisez `test-avatar-upload.http` pour tester l'upload d'avatar.

## Dépendances

- `multer` : Gestion des uploads multipart/form-data
- `axios` : Requêtes HTTP vers l'API externe
- `form-data` : Création de FormData pour Node.js
