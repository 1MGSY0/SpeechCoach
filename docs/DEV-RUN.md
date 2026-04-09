This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Run
### main webpage
npm run dev

### database
docker compose up
npx convex dev

### Backend
uv run main.py serve --host 0.0.0.0 --port 8000

### inngest
npx inngest-cli@latest dev

main webpage: http://localhost:3000/
authentication: http://localhost:3000/handler/sign-up
convex: http://localhost:6791/

## Docker stack

For the full Docker deployment flow, use [`docs/docker-pipeline.md`](/c:/Users/gushi/LTU/SpeechCoach/docs/docker-pipeline.md).

Container-to-container URLs in Docker:

- Inngest -> web: `http://web:3000/api/inngest`
- web -> Inngest: `http://inngest:8288`
- web -> Convex: `http://backend:3210`
- web -> vision agent: `http://vision-agent:8000`
- vision agent -> web: `http://web:3000`

Host-machine URLs in Docker:

- web: `http://localhost:3000`
- Convex API: `http://localhost:3210`
- Convex dashboard: `http://localhost:6791`
- Inngest dev server: `http://localhost:8288`
- vision agent: `http://localhost:8000`
