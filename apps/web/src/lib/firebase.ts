import { initializeApp, getApps } from 'firebase/app'

const firebaseConfig = {
  apiKey: 'AIzaSyBgYWj2XF_hGMNwTuFfVuo4bdsFgEx2YhA',
  authDomain: 'mzadat-s-web.firebaseapp.com',
  projectId: 'mzadat-s-web',
  storageBucket: 'mzadat-s-web.firebasestorage.app',
  messagingSenderId: '203712137565',
  appId: '1:203712137565:web:7778c793095ab74cc980b4',
  measurementId: 'G-PBG3GZH10D',
}

// Avoid re-initializing on hot reload
export const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
