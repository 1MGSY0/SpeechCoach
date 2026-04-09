# Docker Pipeline

This stack puts the local SpeechCoach runtime behind one Docker Compose entrypoint:

- Convex backend
- Convex dashboard
- Next.js web app
- Python vision agent
- Inngest dev server

The repo now has two Docker modes:

- Dev stack: [`docker-compose.yml`](/c:/Users/gushi/LTU/SpeechCoach/docker-compose.yml)
  Uses `next dev`, bind mounts, and route-by-route compilation.
- Production-style stack: [`docker-compose.prod.yml`](/c:/Users/gushi/LTU/SpeechCoach/docker-compose.prod.yml)
  Uses a prebuilt Next.js standalone image and avoids compile-on-first-request.

## Files Added

- [`docker-compose.yml`](/c:/Users/gushi/LTU/SpeechCoach/docker-compose.yml)
- [`scripts/docker-up.ps1`](/c:/Users/gushi/LTU/SpeechCoach/scripts/docker-up.ps1)
- [`scripts/docker-down.ps1`](/c:/Users/gushi/LTU/SpeechCoach/scripts/docker-down.ps1)
- [`speech-coach/Dockerfile`](/c:/Users/gushi/LTU/SpeechCoach/speech-coach/Dockerfile)
- [`backend-vision-agent/Dockerfile`](/c:/Users/gushi/LTU/SpeechCoach/backend-vision-agent/Dockerfile)

## Docker Update Steps

Use this flow whenever you want the running Docker stack to pick up new code or env changes.

1. Confirm the Docker-only service URLs are still set for container-to-container traffic:

- Root [`.env.docker`](/c:/Users/gushi/LTU/SpeechCoach/.env.docker)
  `INNGEST_APP_URL=http://web:3000/api/inngest`
- [`speech-coach/.env.docker`](/c:/Users/gushi/LTU/SpeechCoach/speech-coach/.env.docker)
  `CONVEX_URL_INTERNAL=http://backend:3210`
- [`speech-coach/.env.docker`](/c:/Users/gushi/LTU/SpeechCoach/speech-coach/.env.docker)
  `VOICE_AGENT_URL=http://vision-agent:8000`
- [`speech-coach/.env.docker`](/c:/Users/gushi/LTU/SpeechCoach/speech-coach/.env.docker)
  `INNGEST_BASE_URL=http://inngest:8288`
- [`backend-vision-agent/.env.docker`](/c:/Users/gushi/LTU/SpeechCoach/backend-vision-agent/.env.docker)
  `VOICE_PIPELINE_URL=http://web:3000`

2. Rebuild and restart the stack from the repo root:

```powershell
docker compose --env-file .env.docker up --build -d
```

Production-style rebuild and start:

```powershell
docker compose -f docker-compose.prod.yml --env-file .env.docker up --build -d
```

3. If you want a clean restart first, stop the stack and then bring it back:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\docker-down.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\docker-up.ps1
```

4. Verify the containers are healthy:

```powershell
docker compose --env-file .env.docker ps
docker compose --env-file .env.docker logs -f web vision-agent inngest
```

## Current Env Files

Fill in or verify the secrets in:

- [`speech-coach/.env.docker`](/c:/Users/gushi/LTU/SpeechCoach/speech-coach/.env.docker)
- [`backend-vision-agent/.env.docker`](/c:/Users/gushi/LTU/SpeechCoach/backend-vision-agent/.env.docker)

Start everything:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\docker-up.ps1
```

The startup script will:

- reuse the checked-in Docker env files already in this repo
- create a stable `INSTANCE_SECRET` once for a brand-new root `.env.docker` if needed
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

Production-style rebuild:

```powershell
docker compose -f docker-compose.prod.yml --env-file .env.docker up --build -d
```

Recreate just one service after code changes if needed:

```powershell
docker compose --env-file .env.docker up --build -d web
docker compose --env-file .env.docker up --build -d vision-agent
docker compose --env-file .env.docker up --build -d inngest
```

Recreate just one production-style service after code changes if needed:

```powershell
docker compose -f docker-compose.prod.yml --env-file .env.docker up --build -d web
docker compose -f docker-compose.prod.yml --env-file .env.docker up --build -d vision-agent
docker compose -f docker-compose.prod.yml --env-file .env.docker up --build -d inngest
```

## Production-Style Docker

Use the production-style stack when you want Docker to start the app already built instead of compiling pages on first request.

What changes in production-style mode:

- the web image runs `next build` during Docker build
- the runtime container uses Next.js standalone output
- there are no source bind mounts for the web app
- `next dev` polling and hot reload are removed

Start it with:

```powershell
docker compose -f docker-compose.prod.yml --env-file .env.docker up --build -d
```

Stop it with:

```powershell
docker compose -f docker-compose.prod.yml --env-file .env.docker down
```

Logs:

```powershell
docker compose -f docker-compose.prod.yml --env-file .env.docker logs -f
```

## Host Vs Container URLs

Use `localhost` only for things opened from your browser or host machine.

- Browser to web app: `http://localhost:3000`
- Browser to Convex API: `http://localhost:3210`
- Browser to Convex dashboard: `http://localhost:6791`
- Browser to Inngest dev server: `http://localhost:8288`
- Browser to vision agent: `http://localhost:8000`

Use Docker service names for traffic between containers.

- Inngest to Next.js route: `http://web:3000/api/inngest`
- Next.js app to Inngest dev server: `http://inngest:8288`
- Next.js server actions to Convex: `http://backend:3210`
- Next.js API to vision agent: `http://vision-agent:8000`
- Vision agent back to Next.js API: `http://web:3000`

## Important Env Notes

- `INSTANCE_SECRET` should stay stable once created.
- `NEXT_PUBLIC_CONVEX_URL` stays on `http://localhost:3210` so the browser can reach Convex directly.
- `CONVEX_URL_INTERNAL` is `http://backend:3210` so server-side Next.js code and Inngest can talk to Convex over the Docker network.
- `VOICE_AGENT_URL` is `http://vision-agent:8000` so the web app can create call sessions inside Docker.
- `VOICE_PIPELINE_URL` is `http://web:3000` so the Python agent can call the Next.js API from inside Docker.
- `INNGEST_BASE_URL` should be `http://inngest:8288` in Docker so the Next.js app does not try `localhost:8288` inside the web container.
- `INNGEST_APP_URL` must be `http://web:3000/api/inngest` inside Docker. Do not point it at `localhost` from the Inngest container.
- `VOICE_PIPELINE_TOKEN` must match in both service env files.

## Troubleshooting

- If the web app loads but server actions fail, check that `CONVEX_URL_INTERNAL=http://backend:3210` is present in [`speech-coach/.env.docker`](/c:/Users/gushi/LTU/SpeechCoach/speech-coach/.env.docker).
- If the web app logs `ECONNREFUSED 127.0.0.1:8288` in Docker, verify `INNGEST_BASE_URL=http://inngest:8288` in [`speech-coach/.env.docker`](/c:/Users/gushi/LTU/SpeechCoach/speech-coach/.env.docker) and rebuild the `web` container.
- If the Python agent cannot post transcripts back, verify `VOICE_PIPELINE_URL=http://web:3000` in [`backend-vision-agent/.env.docker`](/c:/Users/gushi/LTU/SpeechCoach/backend-vision-agent/.env.docker).
- If Inngest shows handler or sync failures, verify `INNGEST_APP_URL=http://web:3000/api/inngest` in [`.env.docker`](/c:/Users/gushi/LTU/SpeechCoach/.env.docker) and then rebuild the `inngest` service.
