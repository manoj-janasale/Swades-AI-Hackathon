# Swades-AI-Hackathon

A local monorepo with a Next.js web app, a Hono backend, and a Python audio transcription helper.

## What this repo contains

- `apps/web` — Next.js frontend app with upload and transcription UI
- `apps/server` — Hono backend app (optional)
- `workers/transcriber` — Python transcription helper using `faster_whisper`
- `packages/*` — shared workspace packages for config, env, UI, and db

## Prerequisites

- Node.js 20+ and npm
- Python 3.9+
- `ffmpeg` installed on macOS:  `brew install ffmpeg`
- Optional: Bun if you want to run `apps/server` with Bun

## Install dependencies

From the repo root:

```bash
cd /Users/manojjanasale/placement_projects/Swades-AI-Hackathon
npm install
```

## Python transcription helper setup

Create and activate the Python virtual environment, then install the transcription dependencies:

```bash
cd workers/transcriber
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install --upgrade pip
python3 -m pip install faster-whisper av onnxruntime
```

If you already have the venv, activate it with:

```bash
source workers/transcriber/.venv/bin/activate
```

## Run the web app

Start the Next.js app from `apps/web`:

```bash
cd apps/web
npm run dev
```

Then open:

- http://localhost:3001

The web app includes the upload/transcribe UI and the `app/upload` and `app/transcribe-all` API routes.

## Optional: Run the backend server

The backend app is in `apps/server`. It uses Bun in the current package scripts.

```bash
cd apps/server
bun install
bun run --hot src/index.ts
```

Or from the repo root if Bun and Turbo are configured:

```bash
npm run dev:server
```

## Notes

- The frontend upload routes expect the local Python transcriber to be available at `workers/transcriber/transcribe.py`.
- If the web app cannot find the Python script, make sure the root path is correct and the venv is activated.

## Recommended commands

```bash
# Install everything
npm install

# Start the web app
cd apps/web
npm run dev

# Start the Python transcription env if needed
cd workers/transcriber
source .venv/bin/activate
```

## Useful commands

- `npm install` — install all workspace dependencies
- `npm run dev:web` — start only the Next.js web app
- `npm run dev:server` — start only the backend server
- `npm run build` — build workspace packages
