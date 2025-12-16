# ChatApp - Instagram-like Real-time Chat Application

A modern, real-time chat application built with HTML, Bootstrap, JavaScript, and Firebase. Features an Instagram-inspired design with user authentication, real-time messaging, and online status indicators.

## Features

- 🔐 **User Authentication** - Email/password signup and login
- 💬 **Real-time Messaging** - Instant message delivery using Firebase Firestore
- 👥 **User List** - View all registered users with online/offline status
- ⚡ **Online Status** - Real-time online/offline indicators
- 🔍 **User Search** - Search for users by name
- 📱 **Responsive Design** - Mobile-friendly interface using Bootstrap 5
- 🎨 **Instagram-like UI** - Clean, modern design inspired by Instagram

## Project Structure

```
OpenChattingApp/
├── index.html              # Login/Signup page
├── chat.html              # Main chat interface
├── css/
│   └── style.css          # Custom styles
├── js/
│   ├── firebase-config.js # Firebase configuration
│   ├── auth.js           # Authentication logic
│   └── chat.js           # Chat functionality
├── assets/
│   └── images/           # Image assets (optional)
└── README.md             # This file
```

## Setup Instructions

### 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" and follow the setup wizard
3. Once created, click on the **Web icon** (</>) to add a web app
4. Register your app with a nickname (e.g., "ChatApp")
5. Copy the Firebase configuration object

### 2. Configure Firebase in Your Project

1. Open `js/firebase-config.js`
2. Replace the placeholder values with your Firebase configuration:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    databaseURL: "https://YOUR_PROJECT_ID.firebaseio.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

### 3. Enable Firebase Services

#### Enable Authentication:
1. In Firebase Console, go to **Authentication** > **Sign-in method**
2. Enable **Email/Password** provider
3. Click **Save**

#### Enable Firestore Database:
1. Go to **Firestore Database** > **Create database**
2. Start in **Test mode** (for development)
3. Choose a location closest to your users
4. Click **Enable**

#### Set Firestore Security Rules:
Go to **Firestore Database** > **Rules** and replace with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read/write their own data
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Allow chat participants to read/write messages
    match /chats/{chatId}/messages/{messageId} {
      allow read, write: if request.auth != null;
    }
    
    match /chats/{chatId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 4. Run the Application

#### Option 1: Using Live Server (Recommended)
1. Install [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension in VS Code
2. Right-click on `index.html`
3. Select "Open with Live Server"

#### Option 2: Using Python HTTP Server
```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

#### Option 3: Using Node.js HTTP Server
```bash
# Install http-server globally
npm install -g http-server

# Run server
http-server
```

Then open your browser and navigate to:
- `http://localhost:8000` (or the appropriate port)

### 5. Create User Accounts

1. Open the application in your browser
2. Click "Sign Up" to create a new account
3. Enter your name, email, and password
4. Click "Sign Up"
5. You'll be automatically redirected to the chat interface

### 6. Test the Chat

1. Open the app in **two different browsers** or **incognito/private windows**
2. Create two different user accounts
3. In one browser, select the other user from the user list
4. Start sending messages
5. You should see real-time updates in both windows

## Usage Guide

### Login/Signup
- Open `index.html` to access the authentication page
- Toggle between login and signup forms using the links
- Enter credentials and submit

### Chat Interface
- **User List** (left sidebar): View all users, click to start a chat
- **Search Bar**: Filter users by name
- **Chat Area** (center): View and send messages
- **Message Input**: Type your message and click send or press Enter
- **Logout**: Click the logout icon in the top-right

### Features in Action
- **Online Status**: Green dot indicates user is online
- **Real-time Updates**: Messages appear instantly without refresh
- **Timestamps**: See when messages were sent
- **Responsive**: Works on mobile and desktop

## Technologies Used

- **HTML5** - Structure
- **CSS3** - Styling
- **Bootstrap 5.3** - Responsive framework
- **JavaScript (ES6+)** - Application logic
- **Firebase Authentication** - User management
- **Firebase Firestore** - Real-time database
- **Bootstrap Icons** - UI icons

## Firestore Database Structure

```
users/
  ├── {userId}/
      ├── uid: string
      ├── displayName: string
      ├── email: string
      ├── photoURL: string
      ├── online: boolean
      ├── lastSeen: timestamp
      └── createdAt: timestamp

chats/
  ├── {chatId}/ (format: userId1_userId2, alphabetically sorted)
      ├── participants: array
      ├── lastMessage: string
      ├── lastMessageTime: timestamp
      ├── lastMessageBy: string
      └── messages/
          ├── {messageId}/
              ├── text: string
              ├── senderId: string
              ├── receiverId: string
              ├── timestamp: timestamp
              └── read: boolean
```

## Troubleshooting

### Issue: Firebase not defined
- Make sure Firebase CDN scripts are loaded before your custom scripts
- Check your internet connection
- Verify the Firebase SDK version is compatible

### Issue: Authentication not working
- Ensure Email/Password authentication is enabled in Firebase Console
- Check browser console for error messages
- Verify Firebase configuration is correct

### Issue: Messages not appearing
- Check Firestore security rules
- Ensure Firestore is enabled in Firebase Console
- Check browser console for permission errors

### Issue: CORS errors
- Don't open HTML files directly (file://)
- Use a local server (Live Server, http-server, etc.)

## Future Enhancements

- [ ] Image/file sharing
- [ ] Voice messages
- [ ] Video calls
- [ ] Group chats
- [ ] Message reactions
- [ ] Read receipts
- [ ] Typing indicators
- [ ] Push notifications
- [ ] Dark mode
- [ ] Profile pictures upload

## Security Notes

- **Never commit your Firebase config with real API keys to public repositories**
- Use environment variables for production
- Implement proper Firestore security rules for production
- Enable Firebase App Check for additional security
- Regularly review Firebase Console for suspicious activity

## License

This project is open source and available for educational purposes.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review Firebase documentation
3. Check browser console for errors
4. Ensure all setup steps were completed

---

**Enjoy chatting! 💬**
