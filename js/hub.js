import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { 
    getAuth, 
    GoogleAuthProvider, 
    signInWithPopup, 
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    query, 
    where, 
    getDocs,
    addDoc,
    deleteDoc,
    doc
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyD2D6hv2FPcsM5d0TZ3ASWLO7xnRys_1Sc",
    authDomain: "expense-tracker-3e2a1.firebaseapp.com",
    projectId: "expense-tracker-3e2a1",
    storageBucket: "expense-tracker-3e2a1.appspot.com",
    messagingSenderId: "28230748305",
    appId: "1:28230748305:web:703723f0843ec45f4bd730"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// Make services available globally
window.firebaseApp = app;
window.firebaseAuth = auth;
window.firebaseDb = db;

const EXPENSE_TYPE_ORDER = {
    'Personal Expenses': 1,
    'Travel Budget': 2,
    'Business Expenses': 3,
    'Household Budget': 4
};

let currentUser = null;

function safeQuerySelector(selector) {
    const el = document.querySelector(selector);
    if (!el) console.warn(`Element not found: ${selector}`);
    return el;
}

function initAuth() {
    const signInBtn = safeQuerySelector('#sign-in-btn');
    const signOutBtn = safeQuerySelector('#sign-out-btn');
    const userInfo = safeQuerySelector('#user-info');
    const signInContainer = safeQuerySelector('#sign-in-container');
    const userName = safeQuerySelector('#user-name');
    const savedTrackersContainer = safeQuerySelector('#saved-trackers-container');

    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            if (userName) userName.textContent = user.displayName || user.email;
            if (userInfo) userInfo.classList.remove('hidden');
            if (signInContainer) signInContainer.classList.add('hidden');
            loadSavedTrackers();
        } else {
            currentUser = null;
            if (userInfo) userInfo.classList.add('hidden');
            if (signInContainer) signInContainer.classList.remove('hidden');
            if (savedTrackersContainer) {
                savedTrackersContainer.innerHTML = '<div class="no-trackers">Please sign in to view your trackers</div>';
            }
        }
    });

    if (signInBtn) {
        signInBtn.addEventListener('click', () => {
            signInWithPopup(auth, provider).catch((error) => {
                console.error("Sign in error:", error);
                alert("Sign in failed: " + error.message);
            });
        });
    }

    if (signOutBtn) {
        signOutBtn.addEventListener('click', () => {
            signOut(auth);
        });
    }
}

function createNewTracker(trackerName) {
    if (!currentUser) {
        alert('Please sign in to create a tracker');
        return;
    }
    localStorage.removeItem('isReadOnly');
    localStorage.setItem('currentTracker', trackerName);
    localStorage.setItem('trackerType', trackerName);
    localStorage.removeItem('transactions');
    localStorage.removeItem('initialBalance');
    window.location.href = 'tracker.html';
}

async function loadSavedTrackers() {
    if (!currentUser) return;
    
    const savedTrackersContainer = safeQuerySelector('#saved-trackers-container');
    if (!savedTrackersContainer) return;

    try {
        const q = query(collection(db, "trackers"), where("userId", "==", currentUser.uid));
        const querySnapshot = await getDocs(q);
        
        let savedTrackers = [];
        querySnapshot.forEach((doc) => {
            savedTrackers.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Sort by date descending (newest first)
        savedTrackers.sort((a, b) => new Date(b.date) - new Date(a.date));
        renderTrackers(savedTrackers);
    } catch (error) {
        console.error("Error loading trackers: ", error);
        savedTrackersContainer.innerHTML = '<div class="no-trackers">Error loading trackers</div>';
    }
}

function renderTrackers(trackers) {
    const container = safeQuerySelector('#saved-trackers-container');
    if (!container) return;

    if (trackers.length === 0) {
        container.innerHTML = '<div class="no-trackers">No trackers found. Create one to get started!</div>';
        return;
    }

    container.innerHTML = '';
    trackers.forEach((tracker) => {
        const transactions = tracker.transactions || [];
        const totalExpenses = transactions.reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);
        const remainingBalance = (tracker.initialBalance || 0) - totalExpenses;

        const card = document.createElement('div');
        card.className = 'tracker-card';
        card.innerHTML = `
            <div class="tracker-card-header">
                <span class="tracker-name">${tracker.name || 'Unnamed Tracker'}</span>
                <span class="expense-count-badge">${transactions.length} expenses</span>
            </div>
            
            <div class="tracker-stats">
                <div class="stat-item">
                    <div class="stat-label">Initial Balance</div>
                    <div class="stat-value">₦${(tracker.initialBalance || 0).toFixed(2)}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Total Spent</div>
                    <div class="stat-value">₦${totalExpenses.toFixed(2)}</div>
                </div>
                <div class="remaining-balance ${remainingBalance >= 0 ? 'positive' : 'negative'}">
                    <div class="stat-label">Remaining Balance</div>
                    <div class="stat-value">₦${Math.abs(remainingBalance).toFixed(2)}</div>
                </div>
            </div>
            
            <div class="tracker-footer">
                <div class="tracker-date">Created: ${new Date(tracker.date).toLocaleDateString()}</div>
                <button class="delete-tracker" onclick="deleteTracker('${tracker.id}')">Delete</button>
            </div>
        `;

        card.addEventListener('click', (e) => {
            if (!e.target.classList.contains('delete-tracker')) {
                localStorage.setItem('isReadOnly', 'true');
                localStorage.setItem('currentTracker', tracker.name || 'Unnamed Tracker');
                localStorage.setItem('initialBalance', tracker.initialBalance || 0);
                localStorage.setItem('transactions', JSON.stringify(transactions));
                window.location.href = 'tracker.html';
            }
        });

        container.appendChild(card);
    });
}

async function deleteTracker(trackerId) {
    if (!confirm('Are you sure you want to delete this tracker?')) return;
    
    try {
        await deleteDoc(doc(db, "trackers", trackerId));
        loadSavedTrackers();
    } catch (error) {
        console.error("Error deleting tracker:", error);
        alert("Failed to delete tracker: " + error.message);
    }
}

function applyFilters() {
    // Filter implementation would go here
    console.log("Applying filters...");
}

function clearDateFilter() {
    const dateFilter = safeQuerySelector('#date-filter');
    if (dateFilter) dateFilter.value = '';
    applyFilters();
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize auth if we're on a page that needs it
    if (document.getElementById('auth-container')) {
        initAuth();
    }
    
    // Make functions available globally
    window.createNewTracker = createNewTracker;
    window.deleteTracker = deleteTracker;
    window.applyFilters = applyFilters;
    window.clearDateFilter = clearDateFilter;
});