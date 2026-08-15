# Digital Locker — Customer App (Expo)

React Native customer app, runnable instantly on a real phone via **Expo Go**
— no Android Studio, no Xcode, no Flutter SDK. Only Node.js is required
(same as the admin-web portal).

## Setup

```bash
cd customer-mobile-expo
npm install
```

## Point it at your backend

Your phone and PC must be on the **same WiFi network**. Find your PC's LAN IP:

- **Windows:** `ipconfig` → look for "IPv4 Address" under your active WiFi adapter (e.g. `192.168.1.42`)
- **macOS/Linux:** `ifconfig` or `ip addr`

```bash
cp .env.example .env
```
Edit `.env` and set:
```
EXPO_PUBLIC_API_BASE_URL=http://<your-pc-lan-ip>:8000
```

## Run the backend so your phone can reach it

By default `uvicorn` only listens on `127.0.0.1` (your PC only). Restart it with:
```bash
uvicorn app.main:app --reload --host 0.0.0.0
```
`--host 0.0.0.0` makes it listen on all network interfaces, including your LAN IP.

If Windows Firewall prompts you to allow access when you first do this, click **Allow**.

## Start the Expo app

```bash
npx expo start
```

A QR code appears in the terminal (and a browser tab opens with the same QR + a dev menu).

## Open it on your phone

1. Install **Expo Go** from the Play Store (Android) or App Store (iOS)
2. Open Expo Go, tap "Scan QR code"
3. Scan the QR code from your terminal/browser
4. The app loads on your phone within a few seconds

Log in with `customer@demo.bank` / `Demo@1234`.

## Feature coverage

Login (+ demo login) → Home (locker snapshot, active request shortcut) →
My Locker (detail + history) → Request Access (operation picker) → Request
Tracking (progress stepper + live dual-token verification against the real
backend) → My Requests (full history) → Notifications (mark-as-read) →
Profile (account info + sign out).

Every screen calls the real backend — nothing is mocked.
