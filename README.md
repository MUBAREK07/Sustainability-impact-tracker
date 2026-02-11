# Sustainability Impact Tracker — Frontend (sample)

This folder contains a minimal Vite + React frontend scaffold for a "Sustainability Impact" tracker UI. It uses mock data and components to show an Eco-Credit Score, actionable suggestions, and a community ranking.

Quick start:

```bash
cd "C:/Users/mubar/Desktop/Sustainability impact tracker"
npm install
npm run dev
```

Files created:
- index.html — app entry
- package.json — scripts and deps
- src/main.jsx — React entry
- src/App.jsx — main app
- src/components/* — UI components
- src/styles.css — styles

Next steps you might want:
- Hook up real APIs for smart meter, grocery, and travel data.
- Add authentication and user profiles.
- Persist user data and compute live scoring.
 - Start the backend stub server for local integration testing.

Backend stub (optional)

1. Change to the `server` folder and install dependencies:

```bash
cd "C:/Users/mubar/Desktop/Sustainability impact tracker/server"
npm install
```

2. Start the stub server:

```bash
npm start
```

The server exposes simple endpoints used by the frontend:
- `POST /api/auth/login` — accepts `{ name }`, returns `{ name, token }`
- `GET /api/data/smart-meter` — returns sample smart meter data
- `GET /api/data/grocery` — returns sample grocery data
- `GET /api/data/travel` — returns sample travel data

The frontend is configured to call `http://localhost:4000/api` by default. Run the stub server to enable `Refresh integrations` in the dashboard to pull live sample data.

PWA & Offline
----------------
- The app includes a `manifest.json` and a service worker (`service-worker.js`) that caches core assets for offline use.
- The frontend implements a local queue for API requests when offline. Actions (like login or integration refreshes) will be queued and flushed when the browser regains connectivity.
- To activate the PWA features, open the site (http://localhost:5173) and register the app using your browser (Install app / Add to home screen). The service worker registers automatically on load.
