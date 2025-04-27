// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCY0Jz4dDqIiKe5u5tMOZbyx7crErRTUUc",
  authDomain: "postmoore-e0b20.firebaseapp.com",
  projectId: "postmoore-e0b20",
  storageBucket: "postmoore-e0b20.firebasestorage.app",
  messagingSenderId: "697726443214",
  appId: "1:697726443214:web:eae3a51d008ef1fba87a9f",
  measurementId: "G-9T0F98BLH5",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
