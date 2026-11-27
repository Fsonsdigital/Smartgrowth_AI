# SmartGrowth AI — Firebase & cPanel Deployment Guide

This guide explains how to launch SmartGrowth AI as a real-user validation prototype using **Firebase Auth + Cloud Firestore**, the **Node.js + Gemini AI backend**, and **cPanel hosting** without disturbing any existing website on your cPanel account.

---

## Step 1: Firebase Setup for Real Users
SmartGrowth AI is already wired to your provisioned Firebase project (`eastern-genius-0k4jk`) with Google Sign-In (`signInWithPopup`) and Cloud Firestore security rules (`firestore.rules`).

1. **Allow Your cPanel Domain in Firebase Auth**:
   - Open [Firebase Console](https://console.firebase.google.com/) -> project `eastern-genius-0k4jk` -> **Authentication** -> **Settings** -> **Authorized domains**.
   - Click **Add domain** and add your cPanel pilot domain (for example, `app.yourdomain.com`).
2. **Verify Sign-In Method**:
   - Under **Authentication** -> **Sign-in method**, verify **Google** is enabled.
   - *(Optional)* If you also want Firebase Email/Password sign-in, enable **Email/Password** there as well; otherwise users can sign in with **Continue with Google** or the built-in Express email/password accounts.
3. **Review Firestore Security Rules**:
   - Check `firestore.rules` in this repo before broad launch. Users can only read/write their own `/users/{uid}`, `/users/{uid}/smes`, `/users/{uid}/assessments`, and `/users/{uid}/recommendations`.
   - Your verified admin email (`fsonsdigitalmarketing@gmail.com`, or `ADMIN_EMAIL` on the server) can review all `/pilotFeedback` validation submissions inside **Admin & Data Lab -> System Overview**.
4. **Pilot Launch Toggle**:
   - When opening to external testers or investors, set `ENABLE_DEMO_ACCOUNTS=false` on the backend to hide synthetic demo login buttons, or keep `true` for live stakeholder walkthroughs.

---

## Step 2: Deploy the AI Backend (`GEMINI_API_KEY` Must Stay Server-Side)
Because `@google/genai` requires a secret `GEMINI_API_KEY`, the Express server (`server.ts`) **must** run in a Node.js environment (never put `GEMINI_API_KEY` into `VITE_*` frontend variables).

You have two deployment options for the Node.js AI server:

### Option A (Recommended): Cloud Run / Render / Railway + Static Frontend on cPanel
1. Deploy this repository as a Node service on **Google Cloud Run** (or Render/Railway) with start command `npm run start` (or `NODE_ENV=production tsx server.ts`).
2. Set environment variables on that Node service:
   - `GEMINI_API_KEY=<your Gemini API key>`
   - `SESSION_SECRET=<random 32+ char secret>`
   - `ADMIN_EMAIL=fsonsdigitalmarketing@gmail.com`
   - `CORS_ORIGIN=https://app.yourdomain.com` *(exact cPanel subdomain URL, no trailing slash)*
   - `ENABLE_DEMO_ACCOUNTS=false` *(or `true` for stakeholder demos)*
3. Confirm health check works: `https://your-ai-api.run.app/api/health` returns `{"status":"ok","geminiConfigured":true,...}`.

### Option B: cPanel "Setup Node.js App" (If Your cPanel Plan Supports Node.js)
1. In cPanel -> **Setup Node.js App** -> **Create Application**:
   - Node.js version: `20` or `22`
   - Application mode: `Production`
   - Application root: `smartgrowth-api` (outside `public_html`!)
   - Application URL: `api.yourdomain.com` (or `app.yourdomain.com` if serving full-stack)
   - Startup file: `server.ts` (with `tsx` installed, or `npm run start`)
2. Add the same environment variables (`GEMINI_API_KEY`, `SESSION_SECRET`, `ADMIN_EMAIL`, `CORS_ORIGIN`, `NODE_ENV=production`) in the cPanel Node.js App environment variable panel.
3. Click **Run NPM Install** and **Restart**.

---

## Step 3: Build & Upload the Frontend to a Safe cPanel Subdomain
**Important**: Do **not** upload into your main `public_html` root if you already have a live website there.

1. In cPanel -> **Domains**, create a dedicated subdomain such as `app.yourdomain.com` pointing to a fresh folder (e.g., `/home/username/app.yourdomain.com`).
2. Build the frontend locally pointing `VITE_API_BASE_URL` to your deployed Node/AI backend URL from Step 2:
   ```bash
   VITE_API_BASE_URL=https://api.yourdomain.com npm run build
   ```
   *(If Option B serves both frontend and API on the exact same domain `app.yourdomain.com`, leave `VITE_API_BASE_URL` empty and run `npm run build`.)*
3. Upload everything inside the generated `dist/` folder (`index.html`, `assets/`, `.htaccess`, etc.) into `/home/username/app.yourdomain.com`.
4. Ensure AutoSSL / Let's Encrypt HTTPS is active for `app.yourdomain.com` (Google Sign-In requires `https://`).
5. Visit `https://app.yourdomain.com`, sign in with Google, run a Health Assessment + AI Business Growth Coach session, and submit a test response in **Share Pilot Feedback** to confirm end-to-end persistence.
