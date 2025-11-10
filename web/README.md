# SpeechCoach Web (Vite + React)

A modular frontend for the FastAPI backend in `src/apps/interactive_web.py`.

- Connects to backend WebSockets:
  - `ws://localhost:8000/ws/audio` for PCM16 frames from the mic
  - `ws://localhost:8000/ws/events` for JSON events (partial/token/clause/metrics/debug)
- Calls `GET /api/init` once to lazily load models before streaming.

## Prerequisites
- Node.js 18+

## Install and run (dev)
```powershell
cd web
npm install
npm run dev
```
By default Vite serves at http://localhost:5173.

Open http://localhost:5173 and ensure your backend is running separately:
```powershell
python -m uvicorn src.apps.interactive_web:app --host 0.0.0.0 --port 8000
```

## Build
```powershell
npm run build
npm run preview
```

## Structure
- `src/modules/session.ts`: session lifecycle (init + sockets + mic)
- `src/modules/App.tsx`: UI and state
- `src/modules/*`: simple modular panels and avatar

## Notes
- This is a minimal scaffold. It reuses the exact protocol already used by the inline HTML client.
- For production, consider an `.env` with `VITE_BACKEND_URL` and pass full URLs to `session.ts`.
