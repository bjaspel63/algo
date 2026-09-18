import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getDatabase, ref, set, get, update, remove, onValue, runTransaction, push } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-database.js";
import { firebaseConfig } from "./firebase-config.js";
export const firebaseReady = !Object.values(firebaseConfig).some(v => String(v).includes("YOUR_"));
export const db = firebaseReady ? getDatabase(initializeApp(firebaseConfig)) : null;
export { ref, set, get, update, remove, onValue, runTransaction, push };
