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
    serverTimestamp,
    arrayUnion 
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

let currentUser = null;
let selectedUserId = null;
let selectedGroupId = null;
let isGroupChat = false;
let messagesListener = null;
let createGroupModal = null;

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
    
    // Initialize Bootstrap modal
    createGroupModal = new bootstrap.Modal(document.getElementById('createGroupModal'));
    
    // Load users and groups
    loadUsers();
    loadGroups();
    
    // Setup event listeners
    setupEventListeners();
    
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
    selectedGroupId = null;
    isGroupChat = false;
    
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
    
    // For group messages, show sender name
    const senderName = isGroupChat && !isOwnMessage && message.senderName ? 
        `<small class="text-muted d-block mb-1"><strong>${message.senderName}</strong></small>` : '';
    
    messageDiv.innerHTML = `
        <div class="message-bubble">
            ${senderName}
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
    
    if (!messageText) return;
    
    if (isGroupChat && selectedGroupId) {
        // Send group message
        await sendGroupMessage(messageText);
    } else if (selectedUserId) {
        // Send direct message
        await sendDirectMessage(messageText);
    }
    
    messageInput.value = '';
});

// Send direct message
async function sendDirectMessage(messageText) {
    const chatId = [currentUser.uid, selectedUserId].sort().join('_');
    
    try {
        await addDoc(collection(db, 'chats', chatId, 'messages'), {
            text: messageText,
            senderId: currentUser.uid,
            receiverId: selectedUserId,
            timestamp: serverTimestamp(),
            read: false
        });
        
        await setDoc(doc(db, 'chats', chatId), {
            participants: [currentUser.uid, selectedUserId],
            lastMessage: messageText,
            lastMessageTime: serverTimestamp(),
            lastMessageBy: currentUser.uid
        }, { merge: true });
    } catch (error) {
        console.error('Error sending message:', error);
        alert('Failed to send message. Please try again.');
    }
}

// Send group message
async function sendGroupMessage(messageText) {
    try {
        await addDoc(collection(db, 'groups', selectedGroupId, 'messages'), {
            text: messageText,
            senderId: currentUser.uid,
            senderName: currentUser.displayName || 'User',
            timestamp: serverTimestamp()
        });
        
        await updateDoc(doc(db, 'groups', selectedGroupId), {
            lastMessage: messageText,
            lastMessageTime: serverTimestamp(),
            lastMessageBy: currentUser.uid
        });
    } catch (error) {
        console.error('Error sending group message:', error);
        alert('Failed to send message. Please try again.');
    }
}

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

// ========== GROUP CHAT FUNCTIONS ==========

// Load all groups where current user is a member
function loadGroups() {
    const groupsQuery = query(
        collection(db, 'groups'),
        where('members', 'array-contains', currentUser.uid)
    );
    
    onSnapshot(groupsQuery, (snapshot) => {
        const groupListElement = document.getElementById('groupList');
        groupListElement.innerHTML = '';
        
        if (snapshot.empty) {
            groupListElement.innerHTML = `
                <div class="text-center p-4 text-muted">
                    <i class="bi bi-people fs-1 d-block mb-2"></i>
                    <p>No groups yet. Create one!</p>
                </div>
            `;
            return;
        }
        
        snapshot.forEach((doc) => {
            const group = { id: doc.id, ...doc.data() };
            renderGroupItem(group);
        });
    });
}

// Render group item in list
function renderGroupItem(group) {
    const groupListElement = document.getElementById('groupList');
    const groupItem = document.createElement('div');
    groupItem.className = 'user-item';
    groupItem.dataset.groupId = group.id;
    
    groupItem.innerHTML = `
        <div class="d-flex align-items-center p-3">
            <div class="me-3">
                <div class="user-avatar bg-primary text-white">
                    <i class="bi bi-people-fill"></i>
                </div>
            </div>
            <div class="flex-grow-1">
                <h6 class="mb-0">
                    ${group.name}
                    <span class="group-badge">${group.members.length}</span>
                </h6>
                <small class="text-muted">${group.lastMessage || 'No messages yet'}</small>
            </div>
        </div>
    `;
    
    groupItem.addEventListener('click', () => selectGroup(group));
    groupListElement.appendChild(groupItem);
}

// Select group to chat with
function selectGroup(group) {
    selectedGroupId = group.id;
    selectedUserId = null;
    isGroupChat = true;
    
    // Update UI
    document.querySelectorAll('.user-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-group-id="${group.id}"]`)?.classList.add('active');
    
    // Show chat container
    document.getElementById('welcomeScreen').classList.add('d-none');
    document.getElementById('chatContainer').classList.remove('d-none');
    
    // Update chat header
    document.getElementById('chatUserName').textContent = group.name;
    document.getElementById('chatUserStatus').textContent = `${group.members.length} members`;
    document.getElementById('chatUserAvatar').innerHTML = '<i class="bi bi-people-fill"></i>';
    
    // Load group messages
    loadGroupMessages(group.id);
}

// Load group messages
function loadGroupMessages(groupId) {
    if (messagesListener) {
        messagesListener();
    }
    
    const messagesQuery = query(
        collection(db, 'groups', groupId, 'messages'),
        orderBy('timestamp', 'asc')
    );
    
    messagesListener = onSnapshot(messagesQuery, (snapshot) => {
        const messagesArea = document.getElementById('messagesArea');
        messagesArea.innerHTML = '';
        
        snapshot.forEach((doc) => {
            const message = doc.data();
            renderMessage(message);
        });
        
        scrollToBottom();
    });
}

// Setup event listeners
function setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.chat-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabType = tab.dataset.tab;
            
            // Update active tab
            document.querySelectorAll('.chat-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Show/hide lists
            if (tabType === 'direct') {
                document.getElementById('userList').classList.remove('d-none');
                document.getElementById('groupList').classList.add('d-none');
            } else {
                document.getElementById('userList').classList.add('d-none');
                document.getElementById('groupList').classList.remove('d-none');
            }
        });
    });
    
    // Create group button
    document.getElementById('createGroupBtn')?.addEventListener('click', openCreateGroupModal);
    
    // Submit group form
    document.getElementById('submitGroupBtn')?.addEventListener('click', createGroup);
}

// Open create group modal
async function openCreateGroupModal() {
    // Clear previous data
    document.getElementById('groupName').value = '';
    document.getElementById('groupError').classList.add('d-none');
    
    // Load all users for member selection
    const membersList = document.getElementById('membersList');
    membersList.innerHTML = '<p class="text-muted">Loading users...</p>';
    
    try {
        const usersQuery = query(
            collection(db, 'users'),
            where('uid', '!=', currentUser.uid)
        );
        
        const snapshot = await getDocs(usersQuery);
        membersList.innerHTML = '';
        
        if (snapshot.empty) {
            membersList.innerHTML = '<p class="text-muted">No other users found</p>';
        } else {
            snapshot.forEach((doc) => {
                const user = doc.data();
                const memberItem = document.createElement('div');
                memberItem.className = 'member-checkbox form-check';
                memberItem.innerHTML = `
                    <input class="form-check-input" type="checkbox" value="${user.uid}" id="member_${user.uid}">
                    <label class="form-check-label w-100" for="member_${user.uid}">
                        ${user.displayName}
                    </label>
                `;
                membersList.appendChild(memberItem);
            });
        }
        
        createGroupModal.show();
    } catch (error) {
        console.error('Error loading users:', error);
        alert('Failed to load users. Please try again.');
    }
}

// Create new group
async function createGroup() {
    const groupName = document.getElementById('groupName').value.trim();
    const selectedMembers = Array.from(document.querySelectorAll('#membersList input:checked'))
        .map(input => input.value);
    
    // Validation
    if (!groupName) {
        showGroupError('Please enter a group name');
        return;
    }
    
    if (selectedMembers.length === 0) {
        showGroupError('Please select at least one member');
        return;
    }
    
    // Add current user to members
    selectedMembers.push(currentUser.uid);
    
    try {
        // Create group document
        await addDoc(collection(db, 'groups'), {
            name: groupName,
            members: selectedMembers,
            createdBy: currentUser.uid,
            createdAt: serverTimestamp(),
            lastMessage: '',
            lastMessageTime: serverTimestamp()
        });
        
        createGroupModal.hide();
        
        // Switch to groups tab
        document.getElementById('groupChatsTab').click();
    } catch (error) {
        console.error('Error creating group:', error);
        showGroupError('Failed to create group. Please try again.');
    }
}

function showGroupError(message) {
    const errorElement = document.getElementById('groupError');
    errorElement.textContent = message;
    errorElement.classList.remove('d-none');
}
