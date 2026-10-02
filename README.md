# BKK-CUTZ

## Stack

- React 19, TypeScript, and Vite 7
- Firebase Web SDK 12.19 for Authentication, Cloud Firestore, and Storage
- Vitest for domain unit tests
- POS and Admin are separate GitHub Pages entries: `/BKK-CUTZ/` and `/BKK-CUTZ/admin.html`

The Admin app and POS app are React + TypeScript applications built by Vite. Admin auth/navigation, services, payouts, payout history, and daily history live under `src/admin/`; the legacy `admin.js` script is removed. The POS migration is complete: `index.html` only mounts `src/pos/main.tsx`, and the legacy `app.js` runtime has been removed after all `bkk:pos:*` callers and script references were checked. POS login, active branch authorization, attendance/PIN/RFID, service selection, payment and slip upload, success details, and transaction history live under `src/pos/`. Shared Firestore access lives in typed repositories under `src/shared/firebase/repositories/`, and pricing, attendance contracts, payment snapshots, history mapping, and RFID normalization live in tested domain modules under `src/shared/domain/`. POS transaction history filters by both branch and local business date. The RFID reader protocol remains documented in `README.txt` and unchanged: the POS skips old scans on the initial snapshot and writes current scan outcomes to `reader_results/{scanId}` for the ESP32.

## Local Development

Use Node.js 22.12+ or 24+, then install dependencies:

```sh
npm ci
```

Copy `.env.example` to `.env.local` and fill in the Firebase web app configuration from the Firebase console. The web API key is included in the browser bundle; access control must be enforced by Firebase Authentication and Firestore/Storage Security Rules. Never put service-account credentials in this frontend project.

Run the development server:

```sh
npm run dev
```

With the configured Pages base path, open `http://localhost:5173/BKK-CUTZ/` for POS and `http://localhost:5173/BKK-CUTZ/admin.html` for Admin.

## Checks

```sh
npm run typecheck
npm test -- --run
npm run build
npm audit
npm run dev
npm run preview
```

## POS migration verification

After starting the Vite server, open `http://localhost:5173/BKK-CUTZ/`. The login and authorized branch workspace are separate roots; use an active branch account for the full manual flow. Confirm that the barber list follows today's branch presence, PIN and RFID check-in update the list, and the ESP32 receives `success`, `already_active`, or `error` at `reader_results/{scanId}`. Confirm that closing the store writes today's attendance checkout and `daily_closings/{branchId}_{dateKey}`. In a test environment, exercise a service cart, cash payment, scan payment with a captured slip, success details, and history filtered by date and barber; verify the stored transaction totals, timestamps, snapshots, and Storage path. The automated suite covers Firestore paths/fields, scan snapshot seeding and deduplication, cleanup, payment prerequisites, and branch/date history filters. A browser smoke check can stop at the login page; do not enter credentials or complete payment in production.

## GitHub Pages

The workflow in `.github/workflows/deploy.yml` builds and deploys the `main` branch. In repository settings, set **Pages > Build and deployment > Source** to **GitHub Actions**. Add these repository Actions variables under **Settings > Secrets and variables > Actions > Variables**:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

The Vite base path is set to `/BKK-CUTZ/` for this repository. If the repository name changes, update `vite.config.ts` and this documentation.

## Device Compatibility

Keep the Firestore reader contract documented in `README.txt` unchanged during the UI migration: the POS watches `reader_scans`, performs check-in, and writes the result under `reader_results/{scanId}` for the ESP32 reader.
