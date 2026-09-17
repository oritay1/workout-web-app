# workout-web-app

One place for training and nutrition: workout plans, live workout tracking and diet plans.

Stack: Node.js + Express 5 (MVC) · React + Vite · MongoDB. UI in English and Hebrew, light/dark mode.

## Run locally

Requirements: Node.js 24+, a local MongoDB.

```bash
npm run install:all
cp server/.env.example server/.env   # first time only
npm run dev:server                   # API on http://localhost:4000
npm run dev:client                   # app on http://localhost:5173
```

## Production

```bash
npm run build
npm start
```

## Adding a UI language

1. Copy `client/src/locales/en.json` to `client/src/locales/<code>.json` and translate the values.
2. Add `{ code, name, dir }` to `LANGUAGES` in `client/src/i18n/languages.js`.
