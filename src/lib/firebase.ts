import { getAuth } from "firebase/auth";
import { firebaseApp } from "./firebase-app";

export const auth = firebaseApp ? getAuth(firebaseApp) : null;
