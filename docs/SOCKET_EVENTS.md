# Documentation des Événements Socket.IO

## Authentification

### Connexion
```javascript
const socket = io('http://localhost:3000', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

## Événements Émis par le Client

### `joinUserChats`
Rejoindre automatiquement tous les chats de l'utilisateur.
```javascript
socket.emit('joinUserChats');
```

### `joinChat`
Rejoindre un chat spécifique.
```javascript
socket.emit('joinChat', chatId);
```

### `leaveChat`
Quitter un chat.
```javascript
socket.emit('leaveChat', chatId);
```

### `sendMessage`
Envoyer un message dans un chat.
```javascript
socket.emit('sendMessage', {
  chatId: 'chat_id',
  content: 'Contenu du message',
  messageType: 'text', // 'text', 'image', 'file', 'system'
  attachments: [], // Optionnel
  tempId: Date.now() // ID temporaire pour le suivi
});
```

### `markAsRead`
Marquer les messages d'un chat comme lus.
```javascript
socket.emit('markAsRead', {
  chatId: 'chat_id'
});
```

### `typing`
Indiquer que l'utilisateur est en train d'écrire.
```javascript
socket.emit('typing', {
  chatId: 'chat_id',
  isTyping: true // ou false
});
```

### `deleteMessage`
Supprimer un message.
```javascript
socket.emit('deleteMessage', {
  chatId: 'chat_id',
  messageId: 'message_id'
});
```

### `editMessage`
Modifier un message.
```javascript
socket.emit('editMessage', {
  chatId: 'chat_id',
  messageId: 'message_id',
  newContent: 'Nouveau contenu'
});
```

### `updateStatus`
Mettre à jour le statut de l'utilisateur.
```javascript
socket.emit('updateStatus', 'online'); // 'online', 'away', 'busy'
```

## Événements Reçus par le Client

### `joinedChats`
Confirmation de la connexion aux chats.
```javascript
socket.on('joinedChats', (data) => {
  // data: { success: true, message: string, chatCount: number }
});
```

### `joinedChat`
Confirmation de la connexion à un chat spécifique.
```javascript
socket.on('joinedChat', (data) => {
  // data: { success: true, chatId: string, message: string }
});
```

### `newMessage`
Nouveau message reçu.
```javascript
socket.on('newMessage', (data) => {
  // data: {
  //   chatId: string,
  //   message: {
  //     _id: string,
  //     content: string,
  //     messageType: string,
  //     createdAt: Date,
  //     sender: { _id, firstName, lastName, avatar }
  //   }
  // }
});
```

### `messagesRead`
Messages marqués comme lus par un utilisateur.
```javascript
socket.on('messagesRead', (data) => {
  // data: { chatId: string, userId: string, readAt: Date }
});
```

### `userTyping`
Utilisateur en train d'écrire.
```javascript
socket.on('userTyping', (data) => {
  // data: {
  //   userId: string,
  //   user: { firstName: string, lastName: string },
  //   isTyping: boolean
  // }
});
```

### `userJoined`
Utilisateur a rejoint le chat.
```javascript
socket.on('userJoined', (data) => {
  // data: {
  //   userId: string,
  //   user: { firstName: string, lastName: string, avatar: string }
  // }
});
```

### `userLeft`
Utilisateur a quitté le chat.
```javascript
socket.on('userLeft', (data) => {
  // data: {
  //   userId: string,
  //   user: { firstName: string, lastName: string }
  // }
});
```

### `messageDeleted`
Message supprimé.
```javascript
socket.on('messageDeleted', (data) => {
  // data: { chatId: string, messageId: string, deletedBy: string }
});
```

### `messageEdited`
Message modifié.
```javascript
socket.on('messageEdited', (data) => {
  // data: {
  //   chatId: string,
  //   messageId: string,
  //   newContent: string,
  //   editedBy: string,
  //   editedAt: Date
  // }
});
```

### `userStatusUpdate`
Mise à jour du statut d'un utilisateur.
```javascript
socket.on('userStatusUpdate', (data) => {
  // data: { userId: string, status: string, lastSeen: Date }
});
```

### `messageSent`
Confirmation d'envoi de message.
```javascript
socket.on('messageSent', (data) => {
  // data: { success: true, messageId: string, tempId: number }
});
```

### `error`
Erreur survenue.
```javascript
socket.on('error', (error) => {
  // error: { message: string, error?: string, tempId?: number }
});
```

## Gestion des Erreurs

Toutes les erreurs sont émises via l'événement `error` avec la structure :
```javascript
{
  message: "Description de l'erreur",
  error: "Détails techniques", // optionnel
  tempId: 123456789 // optionnel, pour associer à une action spécifique
}
```

## Bonnes Pratiques

### 1. Gestion de la Reconnexion
```javascript
socket.on('disconnect', () => {
  console.log('Déconnecté du serveur');
});

socket.on('connect', () => {
  console.log('Reconnecté au serveur');
  socket.emit('joinUserChats'); // Rejoindre les chats
});
```

### 2. Indicateur de Frappe
```javascript
let typingTimer;
const TYPING_TIMER_LENGTH = 2000;

messageInput.addEventListener('input', () => {
  socket.emit('typing', { chatId: currentChatId, isTyping: true });
  
  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => {
    socket.emit('typing', { chatId: currentChatId, isTyping: false });
  }, TYPING_TIMER_LENGTH);
});
```

### 3. Gestion des Messages Temporaires
```javascript
const tempMessages = new Map();

function sendMessage(content) {
  const tempId = Date.now();
  const tempMessage = {
    tempId,
    content,
    status: 'sending',
    createdAt: new Date()
  };
  
  tempMessages.set(tempId, tempMessage);
  displayMessage(tempMessage); // Afficher immédiatement
  
  socket.emit('sendMessage', {
    chatId: currentChatId,
    content,
    tempId
  });
}

socket.on('messageSent', (data) => {
  const tempMessage = tempMessages.get(data.tempId);
  if (tempMessage) {
    tempMessage.status = 'sent';
    tempMessage._id = data.messageId;
    tempMessages.delete(data.tempId);
  }
});
```

## Exemple d'Intégration Flutter

```dart
import 'package:socket_io_client/socket_io_client.dart';

class ChatService {
  Socket? _socket;
  
  void connect(String token) {
    _socket = io('http://localhost:3000', 
      OptionBuilder()
        .setAuth({'token': token})
        .setTransports(['websocket'])
        .build()
    );
    
    _socket!.connect();
    _setupEventListeners();
  }
  
  void _setupEventListeners() {
    _socket!.on('newMessage', (data) {
      // Gérer le nouveau message
      final message = Message.fromJson(data['message']);
      _messageController.add(message);
    });
    
    _socket!.on('userTyping', (data) {
      // Gérer l'indicateur de frappe
      if (data['isTyping']) {
        _showTypingIndicator(data['user']['firstName']);
      } else {
        _hideTypingIndicator();
      }
    });
  }
  
  void sendMessage(String chatId, String content) {
    _socket!.emit('sendMessage', {
      'chatId': chatId,
      'content': content,
      'messageType': 'text',
      'tempId': DateTime.now().millisecondsSinceEpoch
    });
  }
  
  void joinChat(String chatId) {
    _socket!.emit('joinChat', chatId);
  }
}
```