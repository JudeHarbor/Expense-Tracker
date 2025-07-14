import { 
  getAuth, 
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { 
  getFirestore, 
  collection, 
  addDoc 
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// Use the initialized Firebase app from hub.js
const auth = window.firebaseAuth || getAuth();
const db = window.firebaseDb || getFirestore();

// Helper function to safely get elements
function getElement(id) {
  const el = document.getElementById(id);
  if (!el) {
      console.warn(`Element with ID ${id} not found`);
      return null;
  }
  return el;
}

// DOM Elements with null checks
const balanceDisplay = getElement("balance-display");
const money_minus = getElement("money-minus");
const list = getElement("list");
const form = getElement("form");
const text = getElement("text");
const amount = getElement("amount");
const balanceEditor = getElement("balance-editor");
const balanceInput = getElement("balance-input");
const saveBalanceBtn = getElement("save-balance-btn");
const saveTrackerBtn = getElement("save-tracker-btn");
const editBalanceBtn = getElement("edit-balance-btn");
const signOutBtn = getElement("sign-out-btn");
const trackerTitle = getElement("tracker-title");
const formContainer = getElement("form-container");

// Initialize with localStorage data
const localStorageTransactions = JSON.parse(localStorage.getItem("transactions") || "[]");
let transactions = localStorageTransactions.length ? localStorageTransactions : [];
let initialBalance = Math.abs(parseFloat(localStorage.getItem('initialBalance')) || 0);


// Set tracker name from localStorage or default
if (trackerTitle) {
  trackerTitle.textContent = `Expensify - ${localStorage.getItem('currentTracker') || 'Expense Tracker'}`;
}

// Set up balance editor
if (localStorage.getItem('initialBalance') !== null) {
  if (balanceDisplay) {
      balanceDisplay.textContent = `₦${initialBalance.toFixed(2)}`;
      balanceDisplay.classList.remove('hidden');
  }
  const isReadOnly = localStorage.getItem('isReadOnly') === 'true';
  if (balanceEditor) balanceEditor.classList.add('hidden');
  if (editBalanceBtn) {
      editBalanceBtn.style.display = isReadOnly ? 'none' : 'block';
      editBalanceBtn.classList.remove('hidden');
  }
} else {
  if (balanceEditor) balanceEditor.classList.remove('hidden');
  if (balanceDisplay) balanceDisplay.classList.add('hidden');
  if (editBalanceBtn) editBalanceBtn.classList.add('hidden');
}

// Initialize auth state
onAuthStateChanged(auth, (user) => {
  const userInfo = getElement('user-info');
  const userName = getElement('user-name');
  
  if (user) {
      if (userName) userName.textContent = user.displayName || user.email;
      if (userInfo) userInfo.classList.remove('hidden');
  } else {
      if (userInfo) userInfo.classList.add('hidden');
  }
});

// Sign out button
if (signOutBtn) {
  signOutBtn.addEventListener('click', () => {
      signOut(auth).then(() => {
          window.location.href = 'index.html';
      });
  });
}

// Save initial balance
if (saveBalanceBtn) {
  saveBalanceBtn.addEventListener('click', function(e) {
      e.preventDefault();
      const value = parseFloat(balanceInput?.value || '0');
      if (!isNaN(value) && value >= 0) {  // Ensure value is positive
          initialBalance = value;
          if (balanceDisplay) {
              balanceDisplay.textContent = `₦${value.toFixed(2)}`;
              balanceDisplay.classList.remove('hidden');
          }
          if (balanceEditor) balanceEditor.classList.add('hidden');
          if (editBalanceBtn) {
              editBalanceBtn.style.display = 'block';
              editBalanceBtn.classList.remove('hidden');
          }
          localStorage.setItem('initialBalance', value.toString());
          updateValues();
      } else {
          alert('Please enter a valid positive number');
      }
  });
}

// Edit balance button
if (editBalanceBtn) {
  editBalanceBtn.addEventListener('click', function() {
      if (balanceEditor) balanceEditor.classList.remove('hidden');
      if (balanceDisplay) balanceDisplay.classList.add('hidden');
      if (editBalanceBtn) editBalanceBtn.classList.add('hidden');
      if (balanceInput) balanceInput.value = initialBalance;
  });
}

function addTransaction(e) {
  e.preventDefault();

  if (!auth.currentUser) {
    alert('Please sign in to add expenses');
    return;
  }

  if (!text?.value.trim() || !amount?.value.trim()) {
    alert("Please add an expense name and amount");
  } else if (localStorage.getItem('isReadOnly') === 'true') {
    alert("This is a saved tracker. Create a new one to make changes.");
  } else {
    const amountValue = parseFloat(amount.value);
    if (isNaN(amountValue)) {
      alert("Please enter a valid amount");
      return;
    }

    const transaction = {
      id: generateId(),
      text: text.value,
      amount: -Math.abs(amountValue),  // Ensure negative value for expenses
      date: new Date().toISOString()
    };

    transactions.push(transaction);
    addTransactionToDOM(transaction);
    updateLocalStorage();
    updateValues();

    if (text) text.value = "";
    if (amount) amount.value = "";
  }
}


// Add Transactions To DOM List
function addTransactionToDOM(transaction) {
  if (!list) return;
  
  const item = document.createElement("li");
  item.dataset.id = transaction.id;
  item.classList.add("minus");
  item.innerHTML = `
      ${transaction.text} 
      <span>-₦${Math.abs(transaction.amount).toFixed(2)}</span> 
      <button class="delete-btn" onclick="removeTransaction(${transaction.id})">x</button>
  `;
  list.appendChild(item);
}

// Update the balance and expenses
function updateValues() {
  const amounts = transactions.map((transaction) => transaction.amount);
  const total = (initialBalance + amounts.reduce((acc, item) => (acc + item), 0)).toFixed(2);
  const expense = (amounts.reduce((acc, item) => (acc + item), 0) * -1).toFixed(2);

  if (balanceDisplay) balanceDisplay.innerText = `₦${total}`;
  if (money_minus) money_minus.innerText = `₦${expense}`;
}

// Remove transaction by ID
function removeTransaction(id) {
  if (!auth.currentUser) {
      alert('Please sign in to modify expenses');
      return;
  }
  
  if (localStorage.getItem('isReadOnly') === 'true') {
      alert("This is a saved tracker. Create a new one to make changes.");
      return;
  }
  
  transactions = transactions.filter((transaction) => transaction.id !== id);
  updateLocalStorage();
  init();
}

// Update localStorage
function updateLocalStorage() {
  localStorage.setItem("transactions", JSON.stringify(transactions));
}

// Initialize app
function init() {
  const isReadOnly = localStorage.getItem('isReadOnly') === 'true';
  
  if (formContainer) {
      formContainer.style.display = isReadOnly ? 'none' : 'block';
  }

  if (isReadOnly) {
      const existingMsg = document.querySelector('.read-only-message');
      if (!existingMsg && document.querySelector('.container')) {
          const readOnlyMsg = document.createElement('div');
          readOnlyMsg.className = 'read-only-message';
          readOnlyMsg.textContent = 'This is a saved tracker. Create a new one to make changes.';
          document.querySelector('.container').appendChild(readOnlyMsg);
      }
  } else {
      const existingMsg = document.querySelector('.read-only-message');
      if (existingMsg) existingMsg.remove();
  }

  if (list) list.innerHTML = "";
  transactions.forEach(addTransactionToDOM);
  updateValues();
}

// Generate random ID
function generateId() {
  return Math.floor(Math.random() * 100000000);
}

// Save Tracker to Firestore
if (saveTrackerBtn) {
  saveTrackerBtn.addEventListener('click', async function(e) {
      e.preventDefault();
      
      const user = auth.currentUser;
      if (!user) {
          alert('Please sign in to save trackers');
          return;
      }

      const trackerType = localStorage.getItem('trackerType') || 'Custom Tracker';
      const totalExpenses = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
      const remainingBalance = initialBalance - totalExpenses;

      const trackerData = {
          userId: user.uid,
          name: trackerType,
          initialBalance: initialBalance,
          transactions: transactions,
          date: new Date().toISOString(),
          expenseCount: transactions.length,
          totalExpenses: totalExpenses,
          remainingBalance: remainingBalance,
          type: trackerType
      };
      
      try {
          await addDoc(collection(db, "trackers"), trackerData);
          
          // Clear current tracker data
          localStorage.removeItem('currentTracker');
          localStorage.removeItem('trackerType');
          localStorage.removeItem('transactions');
          localStorage.removeItem('initialBalance');
          localStorage.removeItem('isReadOnly');
          
          // Redirect to hub
          window.location.href = 'index.html';
      } catch (error) {
          console.error("Error saving tracker: ", error);
          alert("Error saving tracker. Please try again.");
      }
  });
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  if (form) {
      init();
      form.addEventListener("submit", addTransaction);
  }
});

// Make functions available globally
window.removeTransaction = removeTransaction;