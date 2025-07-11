import { auth, db, provider } from './firebase-config.js';
import { collection, query, where, getDocs, doc, deleteDoc, onSnapshot } from "firebase/firestore";

const EXPENSE_TYPE_ORDER = {
  'Personal Expenses': 1,
  'Travel Budget': 2,
  'Business Expenses': 3,
  'Household Budget': 4
};

let currentUser = null;
let unsubscribeTrackers = null;

function initAuth() {
  auth.onAuthStateChanged((user) => {
    if (user) {
      currentUser = user;
      document.getElementById('user-name').textContent = user.displayName || user.email;
      document.getElementById('user-info').style.display = 'block';
      document.getElementById('sign-in-container').style.display = 'none';
      loadSavedTrackers('date-desc');
    } else {
      currentUser = null;
      document.getElementById('user-info').style.display = 'none';
      document.getElementById('sign-in-container').style.display = 'block';
      document.getElementById('saved-trackers-container').innerHTML = 
        '<div class="no-trackers">Please sign in to view your trackers</div>';
      if (unsubscribeTrackers) unsubscribeTrackers();
    }
  });

  document.getElementById('sign-in-btn').addEventListener('click', () => {
    signInWithPopup(auth, provider).catch((error) => {
      console.error("Sign in error:", error);
      alert("Sign in failed: " + error.message);
    });
  });

  document.getElementById('sign-out-btn').addEventListener('click', () => {
    auth.signOut();
  });
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

async function loadSavedTrackers(sortBy = 'date-desc') {
  if (!currentUser) return;
  
  const q = query(collection(db, "trackers"), 
              where("userId", "==", currentUser.uid));
  
  unsubscribeTrackers = onSnapshot(q, (querySnapshot) => {
    let savedTrackers = [];
    querySnapshot.forEach((doc) => {
      savedTrackers.push({ id: doc.id, ...doc.data() });
    });
    
    // Apply sorting
    switch(sortBy) {
      case 'date-asc':
        savedTrackers.sort((a, b) => a.createdAt - b.createdAt);
        break;
      case 'type-asc':
        savedTrackers.sort((a, b) => {
          const aOrder = EXPENSE_TYPE_ORDER[a.type] || 99;
          const bOrder = EXPENSE_TYPE_ORDER[b.type] || 99;
          return aOrder - bOrder;
        });
        break;
      case 'type-desc':
        savedTrackers.sort((a, b) => {
          const aOrder = EXPENSE_TYPE_ORDER[a.type] || 0;
          const bOrder = EXPENSE_TYPE_ORDER[b.type] || 0;
          return bOrder - aOrder;
        });
        break;
      case 'date-desc':
      default:
        savedTrackers.sort((a, b) => b.createdAt - a.createdAt);
        break;
    }

    renderTrackers(savedTrackers);
  }, (error) => {
    console.error("Error loading trackers:", error);
  });
}

function renderTrackers(trackers) {
  const container = document.getElementById('saved-trackers-container');

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
        <div class="tracker-date">Created: ${new Date(tracker.createdAt).toLocaleDateString()}</div>
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
    console.log("Tracker deleted successfully");
  } catch (error) {
    console.error("Error deleting tracker:", error);
    alert("Failed to delete tracker: " + error.message);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initAuth();
});

// Make functions available globally
window.createNewTracker = createNewTracker;
window.deleteTracker = deleteTracker;