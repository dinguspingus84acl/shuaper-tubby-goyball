# Live Draft Room Setup

The multiplayer page is already in GitHub:

`https://shuapertubbygoyball.com/live-draft.html`

The only remaining step is connecting the free Firebase Realtime Database.

## What you need to send me

After creating the Firebase web app, send me the full `firebaseConfig` block Firebase gives you. It looks like this:

```js
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  databaseURL: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

These browser configuration values are intended to be used in frontend code. Do not send a service-account private key or admin SDK secret.

## Create the free Firebase project

1. Open the Firebase Console.
2. Click **Create a project**.
3. Give it any name, such as `shua-live-draft`.
4. Google Analytics is optional and can be disabled.
5. After the project opens, click the web-app icon `</>`.
6. Name the app `SHUA Live Draft` and register it.
7. Copy the complete `firebaseConfig` block.

## Create Realtime Database

1. In Firebase, open **Build → Realtime Database**.
2. Click **Create Database**.
3. Pick the closest United States location.
4. Choose **Start in locked mode**.
5. Open the **Rules** tab.
6. Replace the rules with the contents of `firebase-database-rules.json` from this repository.
7. Click **Publish**.

## After you send the configuration

I will place the values into `firebase-config.js` in GitHub. Once GitHub Pages redeploys, you can:

- Create a live room.
- Copy the invite link.
- Send it to a friend.
- Select separate draft slots.
- See picks update instantly on both devices.

## Files already added

- `live-draft.html` — multiplayer draft room
- `firebase-config.js` — Firebase browser configuration
- `firebase-database-rules.json` — database rules to paste into Firebase
