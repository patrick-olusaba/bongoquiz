import { initializeApp } from "firebase/app";
import { getFirestore }  from "firebase/firestore";
import { getAuth }       from "firebase/auth";

const firebaseConfig = {
    apiKey:            "AIzaSyBETgk4L08AfM1vWQJWxvqGHkFv1Jof8HE",
    authDomain:        "bongoquiz-23ad4.firebaseapp.com",
    databaseURL:       "https://bongoquiz-23ad4-default-rtdb.firebaseio.com",
    projectId:         "bongoquiz-23ad4",
    storageBucket:     "bongoquiz-23ad4.firebasestorage.app",
    messagingSenderId: "137543415708",
    appId:             "1:137543415708:web:fef699dfa9169c5c573a59",
    measurementId:     "G-33CTK3CEGV",
};

const app = initializeApp(firebaseConfig);

export const db   = getFirestore(app);
export const auth = getAuth(app);
