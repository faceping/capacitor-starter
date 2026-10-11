# FaceCheck for Capacitor

**FaceCheck**: a small Capacitor app that enrols your face and verifies it live, on the phone, with a head-turn liveness check. Switch on airplane mode and it still matches. The same app as the Android, iOS, .NET MAUI, Flutter and React Native starters, built on [`@faceping/capacitor`](https://www.npmjs.com/package/@faceping/capacitor), with Vite and TypeScript.

## Run it

You need Node 22 or later, and a phone: an Android phone (Android 7 or later, 64-bit) with USB debugging on and [Android Studio](https://developer.android.com/studio), or an iPhone (iOS 16 or later) with Xcode 26 on a Mac. Emulators and simulators have no real front camera.

1. **Get a free sandbox key** at [app.faceping.ai/signup](https://app.faceping.ai/signup) (no card, no approval). In the dashboard: **Developers → Sandbox keys → Create sandbox key**.
2. **Paste it** into a new file `.env.local` (copy `.env.example`): `VITE_FACEPING_SANDBOX_KEY=fp_test_...`. The file is ignored by git.
3. **Install and run:**

   ```bash
   npm install
   npm run android      # or: npm run ios
   ```

   These build the web app, copy it into the native project (`npx cap sync`) and run it on your phone. On iPhone, pick your team in Xcode under **Signing & Capabilities** first (`npx cap open ios`), or run the app from Xcode or Android Studio (`npx cap open android`).

4. Tap **Enrol my face** and take a photo, then tap **Verify** and turn your head when asked: you should see **Match**. Now switch on airplane mode and tap **Verify** again.

Before you build your own app from this, change the app id (`com.example.facecheck.capacitor`) in `capacitor.config.ts`, the Android project and the Xcode project.

## What's where

| File | What it does |
|---|---|
| `.env.local` | Your sandbox key (see `.env.example`). |
| `src/main.ts` | `FacePing.init`, `enroll` and `verifyLive` (each opens FacePing's camera screen), and what each result means. |
| `index.html`, `src/style.css` | The screen: the result card and the two buttons. |
| `ios/App/App/Info.plist` | The camera text iOS shows the person (`NSCameraUsageDescription`). |

## The sandbox

Free, for building and testing: up to 25 faces per device, each deleted 24 hours after it was enrolled. Faces never leave the phone. The app needs a connection the first time it runs, to activate your key; after that it works offline.

## Licence

This starter app is MIT licensed (see [LICENSE](LICENSE)). The FacePing SDK it uses has its own licence, the [FacePing SDK licence](https://faceping.ai/legal/sdk-licence).
