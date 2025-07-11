import { auth, db } from './firebase-config.js';
import { collection, addDoc } from "firebase/firestore";

// Set tracker name from localStorage or default
const trackerName = localStorage.getItem('currentTracker') || 'Expense Tracker';
document.getElementById('tracker-title').textContent = `Expensify - ${trackerName}`;

// DOM Elements
const balanceDisplay = document.getElementById("balance-display");
const money_minus = document.getElementById("money-minus");
const list = document.getElementById("list");
const form = document.getElementById("form");
const text = document.getElementById("text");
const amount = document.getElementById("amount");
const balanceEditor = document.getElementById("balance-editor");
const balanceInput = document.getElementById("balance-input");
const saveBalanceBtn = document.getElementById("save-balance-btn");
const saveTrackerBtn = document.getElementById("save-tracker-btn");

// Initialize with localStorage data
const localStorageTransactions = JSON.parse(localStorage.getItem("transactions"));
let transactions = localStorage.getItem("transactions") !== null ? localStorageTransactions : [];
let initialBalance = parseFloat(localStorage.getItem('initialBalance')) || 0;

// Set up balance editor
if (localStorage.getItem('initialBalance') !== null) {
  balanceDisplay.textContent = `₦${initialBalance.toFixed(2)}`;
  const isReadOnly = localStorage.getItem('isReadOnly') === 'true';
  balanceEditor.style.display = isReadOnly ? 'none' : 'none';
  balanceDisplay.style.display = 'block';
} else {
  balanceEditor.style.display = 'flex';
  balanceDisplay.style.display = 'none';
}

// Save initial balance
saveBalanceBtn.addEventListener('click', function() {
  const value = parseFloat(balanceInput.value);
  if (!isNaN(value)) {
    initialBalance = value;
    balanceDisplay.textContent = `₦${value.toFixed(2)}`;
    balanceEditor.style.display = 'none';
    balanceDisplay.style.display = 'block';
    localStorage.setItem('initialBalance', value.toString());
    updateValues();
  } else {
    alert('Please enter a valid number');
  }
});

// Add Transactions
function addTransaction(e) {
  e.preventDefault();
  
  if (!auth.currentUser) {
    alert('Please sign in to add expenses');
    return;
  }
  
  if (text.value.trim() === "" || amount.value.trim() === "") {
    alert("Please add an expense name and amount");
  } else if (localStorage.getItem('isReadOnly') === 'true') {
    alert("This is a saved tracker. Create a new one to make changes.");
  } else {
    const transaction = {
      id: generateId(),
      text: text.value,
      amount: -Math.abs(+amount.value),
    };

    transactions.push(transaction);
    addTransactionToDOM(transaction);
    updateLocalStorage();
    updateValues();

    text.value = "";
    amount.value = "";
  }
}

// Add Transactions To DOM List
function addTransactionToDOM(transaction) {
  const item = document.createElement("li");
  item.dataset.id = transaction.id;
  item.classList.add("minus");
  item.innerHTML = `
    <span class="transaction-text">${transaction.text}</span>
    <span class="transaction-amount">-₦${Math.abs(transaction.amount).toFixed(2)}</span>
    <div class="transaction-actions">
      <button class="edit-btn" onClick="enableEditMode(${transaction.id})">Edit</button>
      <button class="delete-btn" onClick="removeTransaction(${transaction.id})">x</button>
    </div>
  `;
  list.appendChild(item);
}

// Update the balance and expenses
function updateValues() {
  const amounts = transactions.map((transaction) => transaction.amount);
  const total = amounts.reduce((acc, item) => (acc += item), initialBalance).toFixed(2);
  const expense = (amounts.reduce((acc, item) => (acc += item), 0) * -1).toFixed(2);

  balanceDisplay.innerText = `₦${total}`;
  money_minus.innerText = `₦${expense}`;
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
  const formContainer = document.getElementById('form-container');
  
  if (isReadOnly) {
    if (formContainer) formContainer.style.display = 'none';
    const readOnlyMsg = document.createElement('div');
    readOnlyMsg.className = 'read-only-message';
    readOnlyMsg.textContent = 'This is a saved tracker. Create a new one to make changes.';
    document.querySelector('.container').appendChild(readOnlyMsg);
  } else {
    if (formContainer) formContainer.style.display = 'block';
    const existingMsg = document.querySelector('.read-only-message');
    if (existingMsg) existingMsg.remove();
  }

  list.innerHTML = "";
  transactions.forEach(addTransactionToDOM);
  updateValues();
}

// Generate random ID
function generateId() {
  return Math.floor(Math.random() * 100000000);
}

// Save Tracker to Firestore
saveTrackerBtn.addEventListener('click', async function(e) {
  e.preventDefault();
  
  if (!auth.currentUser) {
    alert('Please sign in to save trackers');
    return;
  }

  const trackerType = localStorage.getItem('trackerType') || 'Custom Tracker';
  const totalExpenses = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const remainingBalance = initialBalance - totalExpenses;

  const trackerData = {
    userId: auth.currentUser.uid,
    name: trackerType,
    initialBalance: initialBalance,
    transactions: transactions,
    createdAt: new Date(),
    expenseCount: transactions.length,
    totalExpenses: totalExpenses,
    remainingBalance: remainingBalance,
    type: trackerType
  };
  
  try {
    await addDoc(collection(db, "trackers"), trackerData);
    
    // Clear local data
    localStorage.removeItem('currentTracker');
    localStorage.removeItem('trackerType');
    localStorage.removeItem('transactions');
    localStorage.removeItem('initialBalance');
    localStorage.removeItem('isReadOnly');
    
    // Redirect to hub
    window.location.href = 'index.html';
  } catch (error) {
    alert('Failed to save tracker: ' + error.message);
  }
});

form.addEventListener("submit", addTransaction);

// Initialize the app
init();

// Make functions available globally
window.enableEditMode = enableEditMode;
window.saveEditedTransaction = saveEditedTransaction;
window.cancelEdit = cancelEdit;
window.removeTransaction = removeTransaction;