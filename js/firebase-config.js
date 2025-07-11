import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyD2D6hv2FPcsM5d0TZ3ASWLO7xnRys_1Sc",
    authDomain: "expense-tracker-3e2a1.firebaseapp.com",
    projectId: "expense-tracker-3e2a1",
    storageBucket: "expense-tracker-3e2a1.firebasestorage.app",
    messagingSenderId: "28230748305",
    appId: "1:28230748305:web:703723f0843ec45f4bd730"
  };

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const provider = new GoogleAuthProvider();
  
  export { auth, db, provider };