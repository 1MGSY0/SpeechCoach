# Docker Pipeline

This stack puts the local SpeechCoach runtime behind one Docker Compose entrypoint:

- Convex backend
- Convex dashboard
- Next.js web app
- Python vision agent
- Inngest dev server

## Files Added

- [`docker-compose.yml`](/c:/Users/gushi/LTU/SpeechCoach/docker-compose.yml)
- [`scripts/docker-up.ps1`](/c:/Users/gushi/LTU/SpeechCoach/scripts/docker-up.ps1)
- [`scripts/docker-down.ps1`](/c:/Users/gushi/LTU/SpeechCoach/scripts/docker-down.ps1)
- [`speech-coach/Dockerfile`](/c:/Users/gushi/LTU/SpeechCoach/speech-coach/Dockerfile)
- [`backend-vision-agent/Dockerfile`](/c:/Users/gushi/LTU/SpeechCoach/backend-vision-agent/Dockerfile)

## First-Time Setup

1. Copy the example env files if you want to do it manually:

```powershell
Copy-Item .env.docker.example .env.docker
Copy-Item speech-coach/.env.docker.example speech-coach/.env.docker
Copy-Item backend-vision-agent/.env.docker.example backend-vision-agent/.env.docker
```

2. Fill in the secrets in:

- [`speech-coach/.env.docker`](/c:/Users/gushi/LTU/SpeechCoach/speech-coach/.env.docker)
- [`backend-vision-agent/.env.docker`](/c:/Users/gushi/LTU/SpeechCoach/backend-vision-agent/.env.docker)

3. Start everything:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\docker-up.ps1
```

The startup script will:

- create missing Docker env files from the examples
- create a stable `INSTANCE_SECRET` once for a brand-new root `.env.docker`
- build and start the rest of the stack

## URLs

- Web app: `http://localhost:3000`
- Convex API: `http://localhost:3210`
- Convex dashboard: `http://localhost:6791`
- Inngest dev server: `http://localhost:8288`
- Vision agent: `http://localhost:8000`

## Day-To-Day Commands

Start:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\docker-up.ps1
```

Stop:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\docker-down.ps1
```

Logs:

```powershell
docker compose --env-file .env.docker logs -f
```

Rebuild after Dockerfile or dependency changes:

```powershell
docker compose --env-file .env.docker up --build -d
```

## Important Env Notes

- `INSTANCE_SECRET` should stay stable once created.
- `NEXT_PUBLIC_CONVEX_URL` stays on `http://localhost:3210` so the browser can reach Convex directly.
- `CONVEX_URL_INTERNAL` is `http://backend:3210` so server-side Next.js code and Inngest can talk to Convex over the Docker network.
- `VOICE_AGENT_URL` is `http://vision-agent:8000` so the web app can create call sessions inside Docker.
- `VOICE_PIPELINE_URL` is `http://web:3000` so the Python agent can call the Next.js API from inside Docker.
- `VOICE_PIPELINE_TOKEN` must match in both service env files.

## Troubleshooting

- If the web app loads but server actions fail, check that `CONVEX_URL_INTERNAL=http://backend:3210` is present in [`speech-coach/.env.docker`](/c:/Users/gushi/LTU/SpeechCoach/speech-coach/.env.docker).
- If the Python agent cannot post transcripts back, verify `VOICE_PIPELINE_URL=http://web:3000` in [`backend-vision-agent/.env.docker`](/c:/Users/gushi/LTU/SpeechCoach/backend-vision-agent/.env.docker).
