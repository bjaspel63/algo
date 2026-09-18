import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getDatabase, ref, set, update, get, onValue, push, remove } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-database.js";
import { firebaseConfig } from "./firebase-config.js";

export const firebaseReady = !Object.values(firebaseConfig).some(v => String(v).includes("YOUR_"));
export const app = firebaseReady ? initializeApp(firebaseConfig) : null;
export const db = firebaseReady ? getDatabase(app) : null;
export { ref, set, update, get, onValue, push, remove };
