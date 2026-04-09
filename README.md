# SpeechCoach

SpeechCoach is a full-stack practice and feedback platform for conversations, built with:

- Next.js web app (`speech-coach`)
- Convex backend + dashboard
- Inngest dev server
- Python vision agent (`backend-vision-agent`)
- Docker Compose (dev and production-style)

---

## Contents

- [Directory Structure](#directory-structure)
- [Quick Start (Docker)](#quick-start-docker)
- [Environment Files (Complete Reference)](#environment-files-complete-reference)
  - [A) Repo root env files](#a-repo-root-env-files)
  - [B) Web app env files (`speech-coach`)](#b-web-app-env-files-speech-coach)
  - [C) Vision agent env files (`backend-vision-agent`)](#c-vision-agent-env-files-backend-vision-agent)
- [URL Rules](#url-rules)
- [References](#references)

---

## Directory Structure

```text
SpeechCoach/
├─ README.md
├─ .env.docker
├─ docker-compose.yml
├─ docker-compose.prod.yml
├─ docs/
│  └─ docker-pipeline.md
├─ scripts/
│  ├─ docker-up.ps1
│  └─ docker-down.ps1
├─ speech-coach/
│  ├─ Dockerfile
│  ├─ .env
│  ├─ .env.local
│  └─ .env.docker
└─ backend-vision-agent/
   ├─ Dockerfile
   ├─ .env
   └─ .env.docker
```
---

## Quick Start (Docker)

From repo root:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\docker-up.ps1
```

Stop:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\docker-down.ps1
```

---

## Quick Start Local

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

### main webpage

```bash
npm run dev
```

### database

```bash
docker compose up
npx convex dev
```

### Backend

```bash
uv run main.py serve --host 0.0.0.0 --port 8000
```

### inngest

```bash
npx inngest-cli@latest dev
```

Main URLs:

- Web: `http://localhost:3000`
- Convex API: `http://localhost:3210`
- Convex Dashboard: `http://localhost:6791`
- Inngest: `http://localhost:8288`
- Vision Agent: `http://localhost:8000`

---

## Environment Files (Complete Reference)

> Use Docker env files for Docker runs, and local env files for non-Docker local runs.

---

### A) Repo root env files

#### `.\.env.docker` (Docker)

| Variable | Type | Required | Example / Expected |
|---|---|---|---|
| `INNGEST_APP_URL` | URL string | Yes | `http://web:3000/api/inngest` |
| `INSTANCE_SECRET` | Secret string | Yes | stable random string (do not rotate frequently) |

#### `.\.env.local` (optional local root file)

| Variable | Type | Required | Example / Expected |
|---|---|---|---|
| `INNGEST_APP_URL` | URL string | Optional | `http://localhost:3000/api/inngest` |
| `INSTANCE_SECRET` | Secret string | Optional | stable random string |

---

### B) Web app env files (`speech-coach`)

#### `.\speech-coach\.env` (base project env)

| Variable | Type | Required | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_STACK_PROJECT_ID` | UUID string | Yes | Stack Auth project id |
| `NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY` | Public key string | Yes | client-side Stack key |
| `STACK_SECRET_SERVER_KEY` | Secret key string | Yes | server-only Stack key |
| `NEXT_PUBLIC_STREAM_VIDEO_API_KEY` | Public key string | Yes | Stream public key |
| `STREAM_VIDEO_SECRET_KEY` | Secret key string | Yes | Stream server key |

#### `.\speech-coach\.env.local` (local non-Docker dev)

| Variable | Type | Required | Local Example / Expected |
|---|---|---|---|
| `NEXT_PUBLIC_STACK_PROJECT_ID` | UUID string | Yes | from Stack |
| `NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY` | Public key string | Yes | from Stack |
| `STACK_SECRET_SERVER_KEY` | Secret key string | Yes | from Stack |
| `CONVEX_SELF_HOSTED_URL` | URL string | If self-hosted Convex | `http://127.0.0.1:3210` |
| `CONVEX_SELF_HOSTED_ADMIN_KEY` | Secret string | If self-hosted Convex | self-hosted admin key |
| `NEXT_PUBLIC_CONVEX_URL` | URL string | Yes | `http://127.0.0.1:3210` (or localhost) |
| `NEXT_PUBLIC_CONVEX_SITE_URL` | URL string | Yes | `http://127.0.0.1:3211` |
| `VOICE_AGENT_URL` | URL string | Yes | `http://localhost:8000` |
| `VOICE_PIPELINE_TOKEN` | Secret string | Yes | must match vision agent |
| `NEXT_PUBLIC_STREAM_VIDEO_API_KEY` | Public key string | Yes | Stream public key |
| `STREAM_VIDEO_SECRET_KEY` | Secret key string | Yes | Stream server key |
| `OPENROUTER_API_KEY` | Secret key string | Optional/feature-based | for OpenRouter integrations |
| `GROQ_API_KEY` | Secret key string | Optional/feature-based | for Groq integrations |
| `INNGEST_DEV` | Boolean-like (`0/1`) | Usually yes in local | `1` |

#### `.\speech-coach\.env.docker` (Docker web container)

| Variable | Type | Required | Docker Value / Expected |
|---|---|---|---|
| `NEXT_PUBLIC_CONVEX_URL` | Public URL string | Yes | `http://localhost:3210` |
| `CONVEX_URL_INTERNAL` | Internal URL string | Yes | `http://backend:3210` |
| `VOICE_AGENT_URL` | Internal URL string | Yes | `http://vision-agent:8000` |
| `VOICE_PIPELINE_TOKEN` | Secret string | Yes | must match vision-agent token |
| `INNGEST_DEV` | Boolean-like (`0/1`) | Yes | `1` |
| `INNGEST_BASE_URL` | Internal URL string | Yes | `http://inngest:8288` |
| `NEXT_PUBLIC_STACK_PROJECT_ID` | UUID string | Yes | Stack Auth project id |
| `NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY` | Public key string | Yes | Stack public key |
| `STACK_SECRET_SERVER_KEY` | Secret key string | Yes | Stack server key |
| `NEXT_PUBLIC_STREAM_VIDEO_API_KEY` | Public key string | Yes | Stream public key |
| `STREAM_VIDEO_SECRET_KEY` | Secret key string | Yes | Stream server key |
| `GROQ_API_KEY` | Secret key string | Optional/feature-based | for Groq integrations |

---

### C) Vision agent env files (`backend-vision-agent`)

#### `.\backend-vision-agent\.env` (local/base)

| Variable | Type | Required | Local Example / Expected |
|---|---|---|---|
| `STREAM_API_KEY` | Public/API key string | Yes | Stream API key |
| `STREAM_API_SECRET` | Secret key string | Yes | Stream API secret |
| `GEMINI_API_KEY` | Secret key string | Optional/feature-based | Gemini integration |
| `DEEPGRAM_API_KEY` | Secret key string | Optional/feature-based | Deepgram integration |
| `ELEVENLABS_API_KEY` | Secret key string | Optional/feature-based | ElevenLabs integration |
| `CASCADE_ALLOW_BARGE_IN` | Boolean (`true/false`) | Optional | `false` |
| `CASCADE_MIN_INTERRUPTION_CHARS` | Integer | Optional | `12` |
| `VOICE_PIPELINE_TOKEN` | Secret string | Yes | must match web app token |
| `VOICE_PIPELINE_URL` | URL string | Yes | `http://localhost:3000` |

#### `.\backend-vision-agent\.env.docker` (Docker vision-agent container)

| Variable | Type | Required | Docker Value / Expected |
|---|---|---|---|
| `VOICE_TRANSPORT` | Enum/string | Yes | `stream` |
| `VOICE_PIPELINE_URL` | Internal URL string | Yes | `http://web:3000` |
| `VOICE_PIPELINE_TOKEN` | Secret string | Yes | must match web app token |
| `STREAM_API_KEY` | Public/API key string | Yes | Stream API key |
| `STREAM_API_SECRET` | Secret key string | Yes | Stream API secret |
| `GEMINI_API_KEY` | Secret key string | Optional/feature-based | Gemini integration |
| `DEEPGRAM_API_KEY` | Secret key string | Optional/feature-based | Deepgram integration |
| `ELEVENLABS_API_KEY` | Secret key string | Optional/feature-based | ElevenLabs integration |
| `CASCADE_ALLOW_BARGE_IN` | Boolean (`true/false`) | Optional | `false` |
| `CASCADE_MIN_INTERRUPTION_CHARS` | Integer | Optional | `12` |

---

## URL Rules

- Use `localhost` for browser/host-machine access.
- Use Docker service names for container-to-container calls:
  - `web`, `backend`, `inngest`, `vision-agent`.

---

## References

- Next.js: https://nextjs.org/docs  
- Convex: https://docs.convex.dev  
- Inngest: https://www.inngest.com/docs  
- Docker Compose: https://docs.docker.com/compose/  
- Stream Video: https://getstream.io/video/docs/  
- Deepgram: https://developers.deepgram.com/docs  
- ElevenLabs: https://elevenlabs.io/docs  
- Google Gemini API: https://ai.google.dev/gemini-api/docs