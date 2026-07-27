# Food Tracker

A private, phone-first PWA that estimates calories and macros from a photo of food using Claude's vision API. No accounts, no signup — just a password gate. Supports up to two people, each with their own password and completely separate logs/favorites/totals.

Stack: Next.js 14+ (App Router) · TypeScript · Tailwind CSS · Firestore (via `firebase-admin`) · Cloudinary · Claude (`@anthropic-ai/sdk`) · next-pwa.

## Setup overview

You need three things before this app fully works: a Firebase project (Firestore), a Cloudinary account, and an Anthropic API key. All three have generous free tiers and none require a credit card for this app's usage level.

### 1. Firebase (Firestore database)

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and create a new project (or use an existing one).
2. In the left sidebar, open **Firestore Database** → **Create database**. Choose **production mode** and any region close to you. (Do **not** enable Firebase *Storage* — this app deliberately doesn't use it; Cloudinary handles photo storage instead, which has a truly free tier with no billing account required.)
3. Go to **Project Settings** (gear icon) → **Service Accounts** → **Generate new private key**. This downloads a JSON file containing `project_id`, `client_email`, and `private_key`.
4. Map those three fields to `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` in your `.env.local` (see below for the exact escaping the private key needs).
5. In the Firestore console, go to **Rules** and set:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if false;
       }
     }
   }
   ```

   This denies all direct client access — every read/write in this app goes through the Next.js server using the Admin SDK, authorized by the app's own session cookie, never through client-side Firebase. (The app doesn't install the client `firebase` package at all, so there's no code path that could reach Firestore directly even without this rule — but setting it explicitly is good practice.)

### 2. Cloudinary (photo thumbnails)

1. Sign up free at [cloudinary.com](https://cloudinary.com) — no credit card required.
2. On the dashboard home page, copy your **Cloud Name**, **API Key**, and **API Secret** (sometimes shown together as a single `cloudinary://API_KEY:API_SECRET@CLOUD_NAME` connection string — pull the three values out of that if that's what you see).
3. Paste them into `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.

Thumbnails are uploaded to the `food-tracker/thumbnails` folder and deleted via `cloudinary.uploader.destroy()` when a log entry is deleted.

### 3. Anthropic API key

Get one from [console.anthropic.com](https://console.anthropic.com) and set `ANTHROPIC_API_KEY`.

## Environment variables

Copy `.env.local.example` to `.env.local` and fill in real values:

```
ANTHROPIC_API_KEY=
APP_PASSWORD_HASH=
APP_PASSWORD_HASH_2=
JWT_SECRET=
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

`APP_PASSWORD_HASH_2` is optional — set it to support a second person. Whichever password a login attempt matches determines which person's data (`user1` for `APP_PASSWORD_HASH`, `user2` for `APP_PASSWORD_HASH_2`) it's tied to; every log and favorite is scoped to that person, so two people can use the same deployed app simultaneously without ever seeing each other's entries.

None of these are `NEXT_PUBLIC_*` — nothing here is ever exposed to the browser. All Firebase/Cloudinary/Claude calls happen in server-side API routes.

**⚠️ Gotcha: escape every `$` in `APP_PASSWORD_HASH` as `\$`.** Next.js's `.env` loader expands `$VAR`/`${VAR}` syntax, and bcrypt hashes are full of `$` delimiters (e.g. `$2b$10$...`). Left unescaped, the loader silently mangles the hash and every login attempt fails with no useful error. Always write it as:

```
APP_PASSWORD_HASH=\$2b\$10\$therestofyourhash...
```

**`FIREBASE_PRIVATE_KEY`** — copy the `private_key` field from the downloaded service account JSON verbatim, including the `-----BEGIN PRIVATE KEY-----` / `-----END PRIVATE KEY-----` lines and `\n` escapes, wrapped in double quotes:

```
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEv...\n-----END PRIVATE KEY-----\n"
```

### Generating `APP_PASSWORD_HASH`

```bash
node scripts/hash-password.js "your-password-here"
```

This prints a bcrypt hash. Paste it into `APP_PASSWORD_HASH` (remembering to escape the `$` characters as above), or into `APP_PASSWORD_HASH_2` for the second person's password. Generate `JWT_SECRET` as any random 32+ character string (e.g. `openssl rand -hex 32`).

### Firestore composite indexes (required for two-person mode)

Once `userId` scoping is in play, the `logs` and `favorites` queries need two composite indexes that Firestore won't create automatically. The first time each query runs without them, Firestore returns an error containing a direct "create this index" link — open it (you'll need to be logged into the Google account tied to the Firebase project), click **Create Index**, and wait ~1–2 minutes for it to finish building. You need one for:

- `logs`: equality on `userId` + range/order on `timestamp`
- `favorites`: equality on `userId` + order on `lastUsedAt`

If you'd rather set them up before hitting the error, go to Firestore → Indexes → Composite → Add Index in the Firebase console and create those two combinations manually.

## Running locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You'll be redirected to `/login`.

**Note on the dev server:** `next dev` runs on Turbopack and does **not** generate the PWA service worker (this is intentional — `next.config.ts` only wraps the app with `next-pwa` for production builds, since next-pwa's webpack plugin conflicts with Turbopack). To test PWA behavior (install prompt, offline caching), use a production build:

```bash
npm run build   # runs `next build --webpack` — required for next-pwa's Workbox plugin
npm start
```

## Deploying to Vercel

1. Push this repo to GitHub (or connect it directly) and import it in the [Vercel dashboard](https://vercel.com/new).
2. In **Project Settings → Environment Variables**, add every variable listed above (same names, same escaping rules for `APP_PASSWORD_HASH` and `FIREBASE_PRIVATE_KEY`).
3. Vercel runs `npm run build` automatically, which is already configured as `next build --webpack` in `package.json` — no build command override needed.
4. Deploy. On your phone, open the deployed URL in Chrome/Safari, log in, and use "Add to Home Screen" to install it as a standalone app.

## Architecture notes

- **Auth**: one shared password per person (bcrypt-hashed, up to two via `APP_PASSWORD_HASH`/`APP_PASSWORD_HASH_2`), a JWT session cookie (httpOnly, secure, sameSite=strict, 7-day expiry) carrying which person logged in, and `middleware.ts` gating every route except `/login` and `/api/auth/*`. On a valid session, middleware injects an `x-user-id` header (`user1`/`user2`) that every API route reads to scope its Firestore reads/writes and reject cross-person access to a `logId`/`favoriteId` that isn't theirs. Failed logins are rate-limited per IP (5 attempts → 5 minute lockout) via an in-memory map — fine at this scale, but note it resets on server restart/redeploy, and two people behind the same NAT/WiFi share the same rate-limit bucket.
- **AI pipeline**: `POST /api/logs/analyze` resizes the photo server-side (sharp), sends it to Claude (`claude-sonnet-5`) with a JSON-schema-constrained response for guaranteed-valid structured output, uploads a compressed thumbnail to Cloudinary, and writes the log to Firestore (tagged with the logged-in person's `userId`).
- **Offline support**: `next-pwa` precaches the app shell. An IndexedDB queue (via `idb`) captures analyze/edit/delete actions made while offline; a small manager component flushes the queue on the `online` event and after a successful flush notifies open tabs to re-fetch. Pending items show a small amber sync icon.
- **No `/users` collection** — there's no registration or profile data, just a fixed `userId` string per configured password, used purely to partition `/logs` and `/favorites` documents.

## Security checklist

- ✅ Anthropic key, Cloudinary secret, and Firebase credentials are referenced only in server-side code (API routes and `src/lib/*`) — verified by grepping the built `.next/static` client output for the secret values and env var names.
- ✅ Session cookie is httpOnly, secure, sameSite=strict.
- ✅ Login rate-limited (5 failed attempts → 5 min lockout).
- ✅ `X-Robots-Tag: noindex` header and `<meta name="robots" content="noindex, nofollow">` on every page.
- ✅ No `console.log` of sensitive data anywhere in the codebase.
- ⚠️ Firestore security rules (deny-all client access) must be set manually in the Firebase console — see step 5 above. This app has no code path that talks to Firestore from the client at all (no `firebase` client package installed), but the explicit rule is good defense-in-depth.
