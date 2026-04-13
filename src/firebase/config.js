import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC3DWs0TR0Zhod8Yo7wrGdIg9VE_XVFtmA",
  authDomain: "placement-exam-system.firebaseapp.com",
  projectId: "placement-exam-system",
  storageBucket: "placement-exam-system.firebasestorage.app",
  messagingSenderId: "879774268333",
  appId: "1:879774268333:web:f5e15c617aa4f7b792bf24"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
});
export default app;