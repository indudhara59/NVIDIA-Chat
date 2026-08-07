# Nemotron Chat

Nemotron Chat is a production-oriented, responsive AI chat application built with Next.js, React, TypeScript, and Tailwind CSS. It streams independent reasoning and final-answer channels from NVIDIA Nemotron 3 Ultra, renders Markdown and code, supports aborting generation, and persists conversations and safe preferences in browser local storage. It does not require a database or implement authentication.

The application uses a server-only request flow:

```text
Browser → Next.js `/api/chat` route → NVIDIA API
```

The browser never receives or directly uses the NVIDIA API key. The server route validates conversation input, forwards only model messages, translates NVIDIA's SSE stream into application-level newline-delimited JSON, and relays it to the browser.

## Local development

Requirements: Node.js 20.9 or newer and npm.

Create `.env.local` in the project root:

```env
NVIDIA_API_KEY=nvapi-...
```

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

## Environment

Copy `.env.local.example` to `.env.local` and add your key:

```env
NVIDIA_API_KEY=nvapi-...
```

The NVIDIA key must remain server-side. **Never name it `NEXT_PUBLIC_NVIDIA_API_KEY` or expose it through any `NEXT_PUBLIC_` variable**, because those values are bundled into browser code.

## Deploying to Vercel

1. Push the repository to GitHub.
2. Import the repository into Vercel.
3. Go to **Vercel Project → Settings → Environment Variables**.
4. Add `NVIDIA_API_KEY` with the NVIDIA API key as its value. Do not use a `NEXT_PUBLIC_` name.
5. Redeploy the project.
6. Open the deployment URL.

The route uses the Node.js runtime, performs no filesystem writes, and streams responses directly, making it compatible with Vercel's Next.js deployment model.

## Storage and security

Conversation history and non-sensitive settings are stored only in the current browser under namespaced local-storage keys. The API key is never included in browser storage, page HTML, client bundles, or API responses. Markdown raw HTML is not enabled, and external links use `rel="noreferrer"`.

The server owns the NVIDIA endpoint and model. It validates roles, message count, per-message length, total conversation length, overall request size, temperature range, and token presets. The browser cannot supply arbitrary upstream parameters.

The UI prevents concurrent duplicate submissions. There is intentionally no in-memory server rate limiter because instances are not shared reliably across Vercel deployments. A production service exposed to untrusted traffic should add a distributed limiter such as Upstash Redis at the `/api/chat` boundary.

## Current limitations

- Conversations do not sync between browsers or devices.
- Clearing browser storage removes local conversation history.
- There is no authentication, account system, attachment support, or distributed rate limiting.
- Availability and maximum streaming duration depend on the selected Vercel plan and NVIDIA service limits.
