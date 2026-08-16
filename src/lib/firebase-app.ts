import { getApp, getApps, initializeApp } from "firebase/app";
import { firebaseConfig, firebaseReady } from "./firebase-config";

export const firebaseApp = firebaseReady
  ? getApps().length
    ? getApp()
    : initializeApp(firebaseConfig)
  : null;
