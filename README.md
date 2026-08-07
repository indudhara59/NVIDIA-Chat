# Nemotron Chat

Nemotron Chat is a production-oriented, responsive AI chat frontend built with Next.js, React, TypeScript, and Tailwind CSS. Stage 1 provides the complete interface foundation, local demo responses, Markdown and code rendering, responsive navigation, and generation states. It intentionally does not call an AI API, persist data, or implement authentication.

The interface is designed for a future server-only request flow:

```text
Browser → Next.js /api/chat route → NVIDIA API
```

No `/api/chat` route is included in Stage 1.

## Local development

Requirements: Node.js 20.9 or newer and npm.

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

Copy `.env.example` to `.env.local` only when beginning the server integration in Stage 2:

```env
NVIDIA_API_KEY=
```

The NVIDIA key must remain server-side. **Never name it `NEXT_PUBLIC_NVIDIA_API_KEY` or expose it through any `NEXT_PUBLIC_` variable**, because those values are bundled into browser code.

## Deploying to Vercel

Import the repository in Vercel and use the detected Next.js settings. Stage 1 requires no environment variables. A future `NVIDIA_API_KEY` should be configured as a private project environment variable in Vercel, consumed only by the server route.
