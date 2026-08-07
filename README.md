# Nemotron Chat

Nemotron Chat is a production-oriented, responsive AI chat application built with Next.js, React, TypeScript, and Tailwind CSS. It streams independent reasoning and final-answer channels from NVIDIA Nemotron 3 Ultra, renders Markdown and code, supports aborting generation, and keeps conversation context in client-side state. It does not persist data or implement authentication yet.

The interface is designed for a future server-only request flow:

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

Import the repository in Vercel and use the detected Next.js settings. Configure the key under **Vercel Project → Settings → Environment Variables** using the name `NVIDIA_API_KEY`. Enable it for the desired deployment environments and redeploy after saving it.

The route uses the Node.js runtime, performs no filesystem writes, and streams responses directly, making it compatible with Vercel's Next.js deployment model.
