import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB5oonVqbBEgdNlEaO6NFNNSkn-AxH-_KM",
  authDomain: "the-project7039.firebaseapp.com",
  projectId: "the-project7039",
  storageBucket: "the-project7039.firebasestorage.app",
  messagingSenderId: "1029948729390",
  appId: "1:1029948729390:web:a6793f872560a3934a57bf",
  measurementId: "G-8554JDLFR2"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
