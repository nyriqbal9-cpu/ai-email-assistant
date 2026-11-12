# AI Email Assistant

React (Vite) + Node.js/Express + OpenRouter API.

Features: professional reply, rewrite message, summarize email, follow-up message.
The API key stays on the backend and is never exposed to the browser.

## Run in VS Code

1. Open this folder in VS Code (File > Open Folder).
2. Open `.env` and paste your key after `OPENROUTER_API_KEY=` (get it from https://openrouter.ai/keys).
3. Open the terminal (Ctrl + `) and run:

```bash
npm install
npm run dev
```

4. Open http://localhost:5173

Health check: http://localhost:5000/api/health (should show `"keyConfigured":true`).

## Production (local)

```bash
npm run build
npm start
```
Open http://localhost:5000

## Deploy online (Render, Railway, etc.)

| Setting | Value |
|---|---|
| Build command | `npm install && npm run build` |
| Start command | `npm start` |
| Environment variable | `OPENROUTER_API_KEY` = your key |
| Optional | `OPENROUTER_MODEL`, `APP_URL` |

Do not upload `.env` to GitHub (it is in `.gitignore`); set the key in the hosting dashboard instead.

## Change AI model

Set `OPENROUTER_MODEL` in `.env` (any model ID from https://openrouter.ai/models).

## Troubleshooting

| Problem | Fix |
|---|---|
| "API key is not set" | Paste key in `.env`, restart `npm run dev` |
| "Invalid OpenRouter API key" | Check key for typos/spaces |
| "Insufficient credits" | Add credits or use a `:free` model |
| "Could not reach the server" | Make sure `npm run dev` is running |
