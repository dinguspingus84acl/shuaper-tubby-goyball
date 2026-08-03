# Live Draft Room Setup

The multiplayer page is available at:

`https://shuapertubbygoyball.com/live-draft.html`

It needs a free Firebase Realtime Database project before rooms can sync between browsers.

## 1. Create the Firebase project

1. Go to Firebase Console.
2. Create a project.
3. Open **Build → Realtime Database**.
4. Create the database in the closest US region.
5. Start in test mode temporarily.

## 2. Register the web app

1. Open **Project settings**.
2. Under **Your apps**, choose the web icon `</>`.
3. Register the app.
4. Copy the displayed `firebaseConfig` values.

## 3. Update the repository

Open `firebase-config.js` and replace every `PASTE_...` value with the matching Firebase value.

The `databaseURL` field must be included.

## 4. Realtime Database rules

For initial testing, use:

```json
{
  "rules": {
    "rooms": {
      "$room": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

These rules are intentionally open for testing. Add Firebase Authentication before using the site publicly at scale.

## Current multiplayer features

- Create a six-character room code
- Join the same room from another browser or device
- Claim a draft slot
- Real-time draft-board updates
- Real-time available-player removal
- Host-controlled draft start
- 10-, 12-, and 14-team snake drafts
- 14 rounds
- Invite-link copying

## Next development step

Add CPU control for every unclaimed team slot, including weighted randomized picks from the next four available players.
