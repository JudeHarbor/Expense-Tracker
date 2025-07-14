const firebaseConfig = {
  apiKey: "AIzaSyD2D6hv2FPcsM5d0TZ3ASWLO7xnRys_1Sc",
  authDomain: "expense-tracker-3e2a1.firebaseapp.com",
  projectId: "expense-tracker-3e2a1",
  storageBucket: "expense-tracker-3e2a1.appspot.com",
  messagingSenderId: "28230748305",
  appId: "1:28230748305:web:703723f0843ec45f4bd730"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize services
const auth = firebase.auth();
const db = firebase.firestore();