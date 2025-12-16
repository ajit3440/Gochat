// Chat Module
import { auth, db } from './firebase-config.js';
import { 
    onAuthStateChanged,
    signOut 
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { 
    collection, 
    doc, 
    getDoc,
    getDocs,
    addDoc,
    setDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    updateDoc,
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

let currentUser = null;
let selectedUserId = null;
let messagesListener = null;

// Check authentication
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        await initializeChat();
    } else {
        window.location.href = 'index.html';
    }
});

// Initialize chat
async function initializeChat() {
    // Set current user info
    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
    
    // If user document doesn't exist, create it
    if (!userDoc.exists()) {
        await setDoc(doc(db, 'users', currentUser.uid), {
            uid: currentUser.uid,
            displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
            email: currentUser.email,
            photoURL: currentUser.photoURL || '',
            createdAt: serverTimestamp(),
            lastSeen: serverTimestamp(),
            online: true
        });
    }
    
    const userData = userDoc.exists() ? userDoc.data() : {
        displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'User'
    };
    
    document.getElementById('currentUserName').textContent = userData.displayName || 'User';
    
    // Set user online status
    await updateUserStatus(true);
    
    // Load users
    loadUsers();
    
    // Handle page unload - set user offline
    window.addEventListener('beforeunload', () => {
        updateUserStatus(false);
    });
}

// Update user online status
async function updateUserStatus(online) {
    try {
        await updateDoc(doc(db, 'users', currentUser.uid), {
            online: online,
            lastSeen: serverTimestamp()
        });
    } catch (error) {
        console.error('Error updating status:', error);
    }
}

// Load all users except current user
function loadUsers() {
    const usersQuery = query(
        collection(db, 'users'),
        where('uid', '!=', currentUser.uid)
    );
    
    onSnapshot(usersQuery, (snapshot) => {
            const userListElement = document.getElementById('userList');
            userListElement.innerHTML = '';
            
            if (snapshot.empty) {
                userListElement.innerHTML = `
                    <div class="text-center p-4 text-muted">
                        <i class="bi bi-person-x fs-1 d-block mb-2"></i>
                        <p>No users found</p>
                    </div>
                `;
                return;
            }
            
            snapshot.forEach((doc) => {
                const user = doc.data();
                renderUserItem(user);
            });
        });
}

// Render user item in list
function renderUserItem(user) {
    const userListElement = document.getElementById('userList');
    const userItem = document.createElement('div');
    userItem.className = 'user-item';
    userItem.dataset.userId = user.uid;
    
    const statusClass = user.online ? 'online' : '';
    const statusText = user.online ? 'Online' : 'Offline';
    
    userItem.innerHTML = `
        <div class="d-flex align-items-center p-3">
            <div class="position-relative me-3">
                <div class="user-avatar">
                    ${user.photoURL ? `<img src="${user.photoURL}" alt="${user.displayName}">` : '<i class="bi bi-person-circle"></i>'}
                </div>
                ${user.online ? '<span class="status-indicator"></span>' : ''}
            </div>
            <div class="flex-grow-1">
                <h6 class="mb-0">${user.displayName}</h6>
                <small class="text-muted ${statusClass}">${statusText}</small>
            </div>
        </div>
    `;
    
    userItem.addEventListener('click', () => selectUser(user));
    userListElement.appendChild(userItem);
}

// Select user to chat with
function selectUser(user) {
    selectedUserId = user.uid;
    
    // Update UI
    document.querySelectorAll('.user-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-user-id="${user.uid}"]`)?.classList.add('active');
    
    // Show chat container
    document.getElementById('welcomeScreen').classList.add('d-none');
    document.getElementById('chatContainer').classList.remove('d-none');
    
    // Update chat header
    document.getElementById('chatUserName').textContent = user.displayName;
    document.getElementById('chatUserStatus').textContent = user.online ? 'Online' : 'Offline';
    
    const avatarHtml = user.photoURL ? 
        `<img src="${user.photoURL}" alt="${user.displayName}">` : 
        '<i class="bi bi-person-circle"></i>';
    document.getElementById('chatUserAvatar').innerHTML = avatarHtml;
    
    // Load messages
    loadMessages(user.uid);
}

// Load messages between current user and selected user
function loadMessages(otherUserId) {
    // Unsubscribe from previous listener
    if (messagesListener) {
        messagesListener();
    }
    
    // Create chat ID (alphabetically sorted to ensure consistency)
    const chatId = [currentUser.uid, otherUserId].sort().join('_');
    
    // Listen for messages
    const messagesQuery = query(
        collection(db, 'chats', chatId, 'messages'),
        orderBy('timestamp', 'asc')
    );
    
    messagesListener = onSnapshot(messagesQuery, (snapshot) => {
            const messagesArea = document.getElementById('messagesArea');
            messagesArea.innerHTML = '';
            
            snapshot.forEach((doc) => {
                const message = doc.data();
                renderMessage(message);
            });
            
            // Scroll to bottom
            scrollToBottom();
        });
}

// Render a single message
function renderMessage(message) {
    const messagesArea = document.getElementById('messagesArea');
    const messageDiv = document.createElement('div');
    
    const isOwnMessage = message.senderId === currentUser.uid;
    messageDiv.className = `message ${isOwnMessage ? 'sent' : 'received'}`;
    
    const timestamp = message.timestamp ? 
        formatTimestamp(message.timestamp.toDate()) : 
        'Just now';
    
    messageDiv.innerHTML = `
        <div class="message-bubble">
            <p class="mb-1">${escapeHtml(message.text)}</p>
            <small class="message-time">${timestamp}</small>
        </div>
    `;
    
    messagesArea.appendChild(messageDiv);
}

// Send message
document.getElementById('messageForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const messageInput = document.getElementById('messageInput');
    const messageText = messageInput.value.trim();
    
    if (!messageText || !selectedUserId) return;
    
    // Create chat ID
    const chatId = [currentUser.uid, selectedUserId].sort().join('_');
    
    try {
        // Add message to Firestore
        await addDoc(collection(db, 'chats', chatId, 'messages'), {
            text: messageText,
            senderId: currentUser.uid,
            receiverId: selectedUserId,
            timestamp: serverTimestamp(),
            read: false
        });
        
        // Update chat metadata
        await setDoc(doc(db, 'chats', chatId), {
            participants: [currentUser.uid, selectedUserId],
            lastMessage: messageText,
            lastMessageTime: serverTimestamp(),
            lastMessageBy: currentUser.uid
        }, { merge: true });
        
        // Clear input
        messageInput.value = '';
    } catch (error) {
        console.error('Error sending message:', error);
        alert('Failed to send message. Please try again.');
    }
});

// Search users
document.getElementById('searchUsers')?.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const userItems = document.querySelectorAll('.user-item');
    
    userItems.forEach(item => {
        const userName = item.querySelector('h6').textContent.toLowerCase();
        if (userName.includes(searchTerm)) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
});

// Logout
document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    if (confirm('Are you sure you want to logout?')) {
        try {
            await updateUserStatus(false);
            await signOut(auth);
        } catch (error) {
            console.error('Error logging out:', error);
        }
    }
});

// Helper functions
function scrollToBottom() {
    const messagesArea = document.getElementById('messagesArea');
    messagesArea.scrollTop = messagesArea.scrollHeight;
}

function formatTimestamp(date) {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
