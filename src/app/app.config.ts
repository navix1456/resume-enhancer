import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getAnalytics, provideAnalytics, ScreenTrackingService, UserTrackingService } from '@angular/fire/analytics';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { getFunctions, provideFunctions } from '@angular/fire/functions';
import { getStorage, provideStorage } from '@angular/fire/storage';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes), provideFirebaseApp(() => initializeApp({ projectId: "resume-parser-app-95020", appId: "1:549130216448:web:5f6661b427638cb1d524e5", storageBucket: "resume-parser-app-95020.firebasestorage.app", apiKey: "AIzaSyDg39Kdb5vj1dRVaKqShlI0fC-O5czD3pE", authDomain: "resume-parser-app-95020.firebaseapp.com", messagingSenderId: "549130216448", measurementId: "G-0XECHYYCC3" })), provideAuth(() => getAuth()), provideAnalytics(() => getAnalytics()), ScreenTrackingService, UserTrackingService, provideFirestore(() => getFirestore()), provideFunctions(() => getFunctions()), provideStorage(() => getStorage())
  ]
};
