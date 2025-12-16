// Authentication Module
import { auth, db } from './firebase-config.js';
import { 
    onAuthStateChanged, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword,
    updateProfile 
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { 
    doc, 
    setDoc, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// Check if user is already logged in
onAuthStateChanged(auth, (user) => {
    const isLoginPage = window.location.pathname === '/' || window.location.pathname.includes('index.html');
    const isChatPage = window.location.pathname.includes('chat.html');
    
    if (user && isLoginPage) {
        window.location.href = 'chat.html';
    } else if (!user && isChatPage) {
        window.location.href = 'index.html';
    }
});

// Toggle between login and signup forms
document.getElementById('showSignup')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('loginForm').classList.add('d-none');
    document.getElementById('signupForm').classList.remove('d-none');
    clearErrors();
});

document.getElementById('showLogin')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('signupForm').classList.add('d-none');
    document.getElementById('loginForm').classList.remove('d-none');
    clearErrors();
});

// Login Form Handler
document.getElementById('loginFormElement')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const loginBtn = document.getElementById('loginBtn');
    const btnText = loginBtn.querySelector('.btn-text');
    const spinner = loginBtn.querySelector('.spinner-border');
    
    // Show loading state
    loginBtn.disabled = true;
    btnText.classList.add('d-none');
    spinner.classList.remove('d-none');
    clearErrors();
    
    try {
        await signInWithEmailAndPassword(auth, email, password);
        // Redirect will happen automatically via onAuthStateChanged
    } catch (error) {
        showError('loginError', getErrorMessage(error.code));
        loginBtn.disabled = false;
        btnText.classList.remove('d-none');
        spinner.classList.add('d-none');
    }
});

// Signup Form Handler
document.getElementById('signupFormElement')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const signupBtn = document.getElementById('signupBtn');
    const btnText = signupBtn.querySelector('.btn-text');
    const spinner = signupBtn.querySelector('.spinner-border');
    
    // Show loading state
    signupBtn.disabled = true;
    btnText.classList.add('d-none');
    spinner.classList.remove('d-none');
    clearErrors();
    
    try {
        // Create user account
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Update profile with display name
        await updateProfile(user, {
            displayName: name
        });
        
        // Create user document in Firestore
        await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            displayName: name,
            email: email,
            photoURL: user.photoURL || '',
            createdAt: serverTimestamp(),
            lastSeen: serverTimestamp(),
            online: true
        });
        
        // Redirect will happen automatically via onAuthStateChanged
    } catch (error) {
        showError('signupError', getErrorMessage(error.code));
        signupBtn.disabled = false;
        btnText.classList.remove('d-none');
        spinner.classList.add('d-none');
    }
});

// Helper Functions
function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    errorElement.textContent = message;
    errorElement.classList.remove('d-none');
}

function clearErrors() {
    const errors = document.querySelectorAll('.alert-danger');
    errors.forEach(error => error.classList.add('d-none'));
}

function getErrorMessage(errorCode) {
    const errorMessages = {
        'auth/email-already-in-use': 'This email is already registered. Please login instead.',
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/operation-not-allowed': 'Email/password accounts are not enabled.',
        'auth/weak-password': 'Password should be at least 6 characters.',
        'auth/user-disabled': 'This account has been disabled.',
        'auth/user-not-found': 'No account found with this email.',
        'auth/wrong-password': 'Incorrect password. Please try again.',
        'auth/invalid-credential': 'Invalid email or password. Please try again.',
        'auth/too-many-requests': 'Too many failed attempts. Please try again later.'
    };
    
    return errorMessages[errorCode] || 'An error occurred. Please try again.';
}
