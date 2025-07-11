const EXPENSE_TYPE_ORDER = {
    'Personal Expenses': 1,
    'Travel Budget': 2,
    'Business Expenses': 3,
    'Household Budget': 4
};

let currentUser = null;

function initAuth() {
    firebase.auth().onAuthStateChanged((user) => {
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
        }
    });

    document.getElementById('sign-in-btn').addEventListener('click', () => {
        const provider = new firebase.auth.GoogleAuthProvider();
        firebase.auth().signInWithPopup(provider);
    });

    document.getElementById('sign-out-btn').addEventListener('click', () => {
        firebase.auth().signOut();
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

function applyFilters() {
    if (!currentUser) return;
    
    const dateFilter = document.getElementById('date-filter').value;
    const typeFilter = document.getElementById('type-filter').value;
    
    let savedTrackers = JSON.parse(localStorage.getItem('savedTrackers')) || [];
    savedTrackers = savedTrackers.filter(tracker => tracker.userId === currentUser.uid);
    
    if (dateFilter) {
        const filterDate = new Date(dateFilter).toLocaleDateString();
        savedTrackers = savedTrackers.filter(tracker => {
            return new Date(tracker.date).toLocaleDateString() === filterDate;
        });
    }
    
    if (typeFilter !== 'all') {
        savedTrackers = savedTrackers.filter(tracker => tracker.type === typeFilter);
    }
    
    renderTrackers(savedTrackers);
}

function clearDateFilter() {
    document.getElementById('date-filter').value = '';
    applyFilters();
}

function renderTrackers(trackers) {
    const container = document.getElementById('saved-trackers-container');

    if (trackers.length === 0) {
        container.innerHTML = '<div class="no-trackers">No trackers match your filters</div>';
        return;
    }

    container.innerHTML = '';
    trackers.forEach((tracker, index) => {
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
        <div class="tracker-date">Created: ${tracker.date || 'Unknown date'}</div>
        <button class="delete-tracker" onclick="deleteTracker(event, ${index})">Delete</button>
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

function loadSavedTrackers(sortBy = 'date-desc') {
    if (!currentUser) return;
    
    let savedTrackers = JSON.parse(localStorage.getItem('savedTrackers')) || [];
    savedTrackers = savedTrackers.filter(tracker => tracker.userId === currentUser.uid);
    
    switch(sortBy) {
        case 'date-asc':
            savedTrackers.sort((a, b) => new Date(a.date) - new Date(b.date));
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
            savedTrackers.sort((a, b) => new Date(b.date) - new Date(a.date));
            break;
    }

    renderTrackers(savedTrackers);
}

function deleteTracker(event, index) {
    event.stopPropagation();
    if (!currentUser) return;
    
    if (confirm('Are you sure you want to delete this tracker?')) {
        const savedTrackers = JSON.parse(localStorage.getItem('savedTrackers')) || [];
        const userTrackers = savedTrackers.filter(tracker => tracker.userId === currentUser.uid);
        const globalIndex = savedTrackers.findIndex(t => 
            t.userId === currentUser.uid && 
            JSON.stringify(t) === JSON.stringify(userTrackers[index]));
        
        if (globalIndex !== -1) {
            savedTrackers.splice(globalIndex, 1);
            localStorage.setItem('savedTrackers', JSON.stringify(savedTrackers));
            applyFilters();
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initAuth();
});