// Initialize Firebase Auth
let currentUser = null;
firebase.auth().onAuthStateChanged((user) => {
    currentUser = user;
    if (user) {
        document.getElementById('user-name').textContent = user.displayName || user.email;
        document.getElementById('user-info').style.display = 'block';
    } else {
        document.getElementById('user-info').style.display = 'none';
    }
});

document.getElementById('sign-out-btn').addEventListener('click', () => {
    firebase.auth().signOut();
    window.location.href = 'index.html';
});

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

// Create edit button element
const editBalanceBtn = document.createElement("button");
editBalanceBtn.id = "edit-balance-btn";
editBalanceBtn.className = "btn";
editBalanceBtn.textContent = "Edit Balance";
editBalanceBtn.style.display = "none";
editBalanceBtn.style.margin = "10px 0";
editBalanceBtn.style.width = "auto";
document.querySelector("#balance-container").appendChild(editBalanceBtn);

// Initialize with localStorage data
const localStorageTransactions = JSON.parse(
    localStorage.getItem("transactions")
);

let transactions =
    localStorage.getItem("transactions") !== null
        ? localStorageTransactions
        : [];

let initialBalance = 10000; // Default value

// Set up balance editor
const savedBalance = localStorage.getItem('initialBalance');

if (savedBalance !== null) {
    initialBalance = parseFloat(savedBalance);
    balanceDisplay.textContent = `₦${initialBalance.toFixed(2)}`;
    
    const isReadOnly = localStorage.getItem('isReadOnly') === 'true';
    if (isReadOnly) {
        balanceEditor.style.display = 'none';
        balanceDisplay.style.display = 'block';
        editBalanceBtn.style.display = 'none';
    } else {
        balanceEditor.style.display = 'none';
        balanceDisplay.style.display = 'block';
        editBalanceBtn.style.display = 'block';
    }
} else {
    balanceEditor.style.display = 'flex';
    balanceDisplay.style.display = 'none';
    editBalanceBtn.style.display = 'none';
}

// Save initial balance
saveBalanceBtn.addEventListener('click', function() {
    const value = parseFloat(balanceInput.value);
    if (!isNaN(value)) {
        initialBalance = value;
        balanceDisplay.textContent = `$${value.toFixed(2)}`;
        balanceEditor.style.display = 'none';
        balanceDisplay.style.display = 'block';
        editBalanceBtn.style.display = 'block';
        updateValues();
        
        localStorage.setItem('initialBalance', value.toString());
    } else {
        alert('Please enter a valid number');
    }
});

// Edit balance functionality
editBalanceBtn.addEventListener('click', function() {
    balanceEditor.style.display = 'flex';
    balanceDisplay.style.display = 'none';
    editBalanceBtn.style.display = 'none';
    balanceInput.value = initialBalance;
    balanceInput.focus();
});

// Add Transactions
function addTransaction(e) {
    e.preventDefault();
    
    if (!currentUser) {
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

    item.classList.add("minus");
    item.innerHTML = `
    ${transaction.text} <span>-₦${Math.abs(
    transaction.amount
).toFixed(2)}</span> <button class="delete-btn" onClick="removeTransaction(${
    transaction.id
})">x</button>
`;
    list.appendChild(item);
}

// Update the balance and expenses
function updateValues() {
    const amounts = transactions.map((transaction) => transaction.amount);
    const total = amounts.reduce((acc, item) => (acc += item), initialBalance).toFixed(2);
    const expense = (
        amounts
            .reduce((acc, item) => (acc += item), 0) * -1
    ).toFixed(2);

    balanceDisplay.innerText = `₦${total}`;
    money_minus.innerText = `₦${expense}`;
}

// Remove transaction by ID
function removeTransaction(id) {
    if (!currentUser) {
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
    // Check if we're in read-only mode
    const isReadOnly = localStorage.getItem('isReadOnly') === 'true';
    
    // Hide form and save button if in read-only mode
    const formContainer = document.getElementById('form-container');
    if (isReadOnly) {
        if (formContainer) formContainer.style.display = 'none';
        document.getElementById('edit-balance-btn').style.display = 'none';
        
        // Add read-only message
        const readOnlyMsg = document.createElement('div');
        readOnlyMsg.className = 'read-only-message';
        readOnlyMsg.textContent = 'This is a saved tracker. Create a new one to make changes.';
        document.querySelector('.container').appendChild(readOnlyMsg);
    } else {
        if (formContainer) formContainer.style.display = 'block';
        
        // Remove any existing read-only message
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

// Save Tracker Functionality
saveTrackerBtn.addEventListener('click', function(e) {
    e.preventDefault();
    
    if (!currentUser) {
        alert('Please sign in to save trackers');
        return;
    }

    const trackerType = localStorage.getItem('trackerType') || 'Custom Tracker';
    const totalExpenses = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const remainingBalance = initialBalance - totalExpenses;

    const trackerData = {
        userId: currentUser.uid,
        name: trackerType,
        initialBalance: initialBalance,
        transactions: transactions,
        date: new Date().toLocaleDateString(),
        expenseCount: transactions.length,
        totalExpenses: totalExpenses,
        remainingBalance: remainingBalance,
        type: trackerType
    };
    
    const savedTrackers = JSON.parse(localStorage.getItem('savedTrackers')) || [];
    savedTrackers.push(trackerData);
    localStorage.setItem('savedTrackers', JSON.stringify(savedTrackers));
    
    // Clear current tracker data
    localStorage.removeItem('currentTracker');
    localStorage.removeItem('trackerType');
    localStorage.removeItem('transactions');
    localStorage.removeItem('initialBalance');
    localStorage.removeItem('isReadOnly');
    
    // Redirect to hub
    window.location.href = 'index.html';
});

form.addEventListener("submit", addTransaction);

// Initialize the app
init();