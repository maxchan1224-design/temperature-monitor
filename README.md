# Shared Temperature Recording App

A small React/Vite app backed by Firebase Firestore. Anyone can submit and view records. The submitting browser can edit its record for 10 minutes, and anyone can export records to Excel.

## Setup

1. Create a Firebase project and a Firestore database.
2. Copy `.env.example` to `.env` and fill in the Firebase web-app configuration values.
3. Install and run: `npm install`, then `npm run dev`.
4. Deploy rules and hosting: `firebase deploy --only firestore:rules,hosting`.

The browser stores a random device identifier locally and shows Edit only for records created by that browser during the 10-minute window. Firestore rules enforce the time limit and prevent changes to `createdAt` and `ownerId`.

Because records are publicly readable and Firebase Authentication is not used, Firestore cannot securely verify browser identity: the stored `ownerId` is necessarily visible to readers. Strong device-level authorization would require anonymous Authentication or a trusted backend. The current rules enforce every restriction Firestore can enforce without either mechanism.
