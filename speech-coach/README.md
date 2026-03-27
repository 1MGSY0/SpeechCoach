This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


npx create-next-app@latest
npx shadcn@latest init
npx install convex

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

urls
main webpage: http://localhost:3000/
authentication: http://localhost:3000/handler/sign-up
convex: http://localhost:6791/




  try { Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/voice-agent/events" -ContentType "application/json" -Headers @{ "x-pipeline-token" = "speech-coach-pipeline-secret-token" } -Body '{"type":"call.transcription_ready","conversationId":"jn7bag1yaj02s26061hgvxesex83nka3","userId":"js7dqx6xxqpz5shhm6t6vhm1bn83aqjw","summary":"ok"}'} catch { $_.Exception.Response.StatusCode.value__ ; $_.Exception.Response.StatusDescription ; $_.Exception.Message }


  try { Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/voice-agent/events" -ContentType "application/json" -Body '{"type":"call.transcription_ready","conversationId":"jn7bag1yaj02s26061hgvxesex83nka3","userId":"js7dqx6xxqpz5shhm6t6vhm1bn83aqjw","summary":"ok"}'} catch { $_.Exception.Response.StatusCode.value__ ; $_.Exception.Response.StatusDescription ; $_.Exception.Message }