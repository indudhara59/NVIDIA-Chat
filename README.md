# Nemotron Chat

Nemotron Chat is a production-oriented, responsive AI chat application built with Next.js, React, TypeScript, Tailwind CSS, Auth.js, and MongoDB. It provides Google sign-in, streams independent reasoning and final-answer channels from NVIDIA Nemotron 3 Ultra, and securely persists each user's conversations in MongoDB. Non-sensitive display preferences remain in browser local storage.

The application uses a server-only request flow:

```text
Authenticated browser → Next.js APIs → MongoDB / NVIDIA API
```

The browser never receives or directly uses the NVIDIA API key. The server route validates conversation input, forwards only model messages, translates NVIDIA's SSE stream into application-level newline-delimited JSON, and relays it to the browser.

## Local development

Requirements: Node.js 20.9 or newer and npm.

Copy the example configuration:

```bash
cp .env.local.example .env.local
```

Configure these server-only variables:

```env
NVIDIA_API_KEY=nvapi-...
MONGODB_URI=mongodb+srv://...
MONGODB_DB=nemotron-chat
AUTH_SECRET=generate-a-long-random-secret
AUTH_GOOGLE_ID=your-google-client-id
AUTH_GOOGLE_SECRET=your-google-client-secret
BLOB_READ_WRITE_TOKEN=vercel_blob_...
```

Generate `AUTH_SECRET` with `npx auth secret`, or use a securely generated random value. Do not commit `.env.local`.

Then run:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Useful checks:

```bash
npm run lint
npm run typecheck
npm run build
```

## Google OAuth setup

1. Create or select a project in [Google Cloud Console](https://console.cloud.google.com/).
2. Configure the Google Auth Platform consent screen.
3. Create an OAuth client with application type **Web application**.
4. Add `http://localhost:3000/api/auth/callback/google` as an authorized redirect URI for local development.
5. For production, also add `https://YOUR_DOMAIN/api/auth/callback/google` exactly as an authorized redirect URI.
6. Put the client ID and client secret into `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`.

Google requires redirect URIs to match exactly. Production redirect URIs must use HTTPS.

## MongoDB setup

1. Create a MongoDB Atlas project and cluster.
2. Create a database user with access to the application database.
3. Configure Atlas Network Access so Vercel can connect. For serverless deployments this commonly requires allowing access from anywhere and relying on strong database credentials.
4. Copy the connection string into `MONGODB_URI`.
5. Optionally change `MONGODB_DB`; it defaults to `nemotron-chat`.

Each conversation document includes an authenticated owner identifier. Every database operation filters on that owner, preventing users from reading or modifying another user's chats.

## Vercel Blob setup

1. In the Vercel project, open **Storage** and create a Blob store with private access.
2. Connect it to this project. Vercel adds `BLOB_READ_WRITE_TOKEN` automatically.
3. Pull the environment variables locally with `vercel env pull`, or copy the token into `.env.local` for local testing.

Uploads are server-mediated, authenticated, limited to five files per message and 4 MB per file, and restricted to PDF, text, Markdown, CSV, JSON, PNG, JPEG, and WebP. Blob paths do not contain user email addresses. Downloads are proxied through an authenticated ownership check.

## Environment variables

```env
NVIDIA_API_KEY=
MONGODB_URI=
MONGODB_DB=nemotron-chat
AUTH_SECRET=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
BLOB_READ_WRITE_TOKEN=
```

All credentials must remain server-side. Never add `NEXT_PUBLIC_` to any API key, database URI, OAuth secret, or Auth.js secret.

## Deploying to Vercel

1. Push the repository to GitHub.
2. Import the repository into Vercel.
3. Go to **Vercel Project → Settings → Environment Variables**.
4. Add `NVIDIA_API_KEY`, `MONGODB_URI`, `MONGODB_DB`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, and `BLOB_READ_WRITE_TOKEN` (the last value is added automatically when a Blob store is connected).
5. Add the Vercel deployment callback URL to Google OAuth: `https://YOUR_DOMAIN/api/auth/callback/google`.
6. Redeploy the project.
7. Open the deployment URL and sign in with Google.

The route uses the Node.js runtime, performs no filesystem writes, and streams responses directly, making it compatible with Vercel's Next.js deployment model.

## Storage and security

Conversation history is stored in MongoDB and scoped to the authenticated Google user. Only non-sensitive interface settings are stored in local storage. API keys, MongoDB credentials, and OAuth secrets are never included in browser storage, page HTML, client bundles, or API responses. Markdown raw HTML is not enabled, and external links use `rel="noreferrer"`.

The server owns the NVIDIA endpoint and model. It validates roles, message count, per-message length, total conversation length, overall request size, temperature range, and token presets. The browser cannot supply arbitrary upstream parameters.

The UI prevents concurrent duplicate submissions. There is intentionally no in-memory server rate limiter because instances are not shared reliably across Vercel deployments. A production service exposed to untrusted traffic should add a distributed limiter such as Upstash Redis at the `/api/chat` boundary.

## Current limitations

- Conversation availability depends on MongoDB Atlas connectivity.
- There is no attachment support, account deletion flow, or distributed rate limiting.
- Availability and maximum streaming duration depend on the selected Vercel plan and NVIDIA service limits.
