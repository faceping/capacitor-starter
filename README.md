# FaceCheck for Capacitor

**FaceCheck**: a small Capacitor app that enrols your face and verifies it live, on the phone, with a head-turn liveness check. Switch on airplane mode and it still matches. It can also run as a check-in device for your practice list, like the other FaceCheck starters. Built on [`@faceping/capacitor`](https://www.npmjs.com/package/@faceping/capacitor), with Vite and TypeScript.

## Run it

You need Node 22 or later, and a phone: an Android phone (Android 7 or later, 64-bit) with USB debugging on and [Android Studio](https://developer.android.com/studio), or an iPhone (iOS 16 or later) with Xcode 26 on a Mac. Emulators and simulators have no real front camera.

1. **Get a free sandbox key** at [app.faceping.ai/signup](https://app.faceping.ai/signup) (no card, no approval). In the dashboard: **Developers → Sandbox keys → Create sandbox key**.
2. **Paste it** into a new file `.env.local` (copy `.env.example`): `VITE_FACEPING_SANDBOX_KEY=fp_test_...`. The file is ignored by git.
3. **Install and run:**

   ```bash
   npm install
   npm run android      # or: npm run ios
   ```

   Android builds need JDK 21. If `java -version` shows something newer (25, say), point the build at the JDK that comes with Android Studio first, or the Android build fails:

   ```bash
   export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"   # macOS
   ```

   These build the web app, copy it into the native project (`npx cap sync`) and run it on your phone. On iPhone, pick your team in Xcode under **Signing & Capabilities** first (`npx cap open ios`), or run the app from Xcode or Android Studio (`npx cap open android`).

4. Tap **Enrol my face** and take a photo, then tap **Verify** and turn your head when asked: you should see **Match**. Now switch on airplane mode and tap **Verify** again.

Before you build your own app from this, change the app id (`com.yourcompany.facecheck`) in `capacitor.config.ts`, `android/app/build.gradle` (`applicationId` and `namespace`, and move `MainActivity.java` to the matching folder) and the Xcode project.

## Try it as a check-in device

Once you've tried the server side with your sandbox key (a practice check-in list, an enrolment link, a device), this app can be the check-in device:

1. Enrol a person on your practice list with a `personId` (through an enrolment link, or from your server; see the [API quickstart](https://docs.faceping.ai/quickstart/)).
2. Add a device to the list (the list's **Devices** tab, or `POST /v1/lists/{listId}/devices`) and copy its `fpd_` token.
3. Add these two lines to `.env.local`:

   ```bash
   VITE_FACEPING_DEVICE_TOKEN=fpd_yourtoken
   VITE_FACEPING_PERSON_ID=ACME-000123
   ```

   With a device token set, the sandbox key is ignored. On Android, the build then adds `.device` to the app id and names the app **FaceCheck Device**, so it installs next to the sandbox app. On iPhone, do the same by hand to keep both: in Xcode (`npx cap open ios`), select the **App** target, set **Bundle Identifier** to `com.yourcompany.facecheck.device` under **Signing & Capabilities** and **Display Name** to `FaceCheck Device` under **General**.

4. Run it again (`npm run android` or `npm run ios`). The app syncs the list when it starts and shows what it found: how many people synced and whether your person is there, or why not (a revoked or mistyped token, a deleted list, no connection). **Enrol my face** is hidden: people enrol on the server. Tap **Verify** once your person is here.

## What's where

| File | What it does |
|---|---|
| `.env.local` | Your sandbox key, or a device token and person id (see `.env.example`). |
| `src/main.ts` | `FacePing.init` with your key or device token, `enroll` and `verifyLive` (each opens FacePing's camera screen), what each result means, and what each sync found on a check-in device. |
| `index.html`, `src/style.css` | The screen: the result card and the two buttons. |
| `ios/App/App/Info.plist` | The camera text iOS shows the person (`NSCameraUsageDescription`). |
| `android/app/build.gradle` | The app id (with `.device` added in device mode), and `abiFilters`: only the two ABIs FacePing runs on (arm64-v8a, x86_64). |
| `android/app/src/main/res/xml/` | Backup rules that keep FacePing's data on the phone (Android 12+ backups and device-to-device transfers). |

## The sandbox

Free, for building and testing: up to 25 faces per device, each deleted 24 hours after it was enrolled. Faces you enrol in the app never leave the phone; people on your practice list are held by FacePing, each for 24 hours. The app needs a connection the first time it runs, to activate your key; after that it works offline.

## Licence

This starter app is MIT licensed (see [LICENSE](LICENSE)). The FacePing SDK it uses has its own licence, the [FacePing SDK licence](https://faceping.ai/legal/sdk-licence).
