# CLAUDE.md — Workout web app (Node/Express MVC + React + MongoDB)

> Based on my web-app template, which follows the way we built https://github.com/oritay1/web-newborn-app (reference implementation — read it when unsure how something should look).
> Where the "Project" section below differs from the generic sections (auth, i18n, theme), the "Project" section wins.

## Project

- **What it is:** One place for everything a person who trains (weightlifting, running, other sports) needs: building workout plans, tracking planned vs. actual training (including live tracking during a workout), and building and tracking diet plans. All user data is also organized so an LLM can analyze it later.
- **Users / audience:** Registered individual users (each sees only their own data), on mobile first, also desktop.
- **UI language:** English and Hebrew (RTL), switchable. Adding a language must be simple and modular.
- **Special notes:** Health data is sensitive — never log it, never expose one user's data to another, and design every model so it can later feed AI features.

### Core features

**A. Workout plan builder**
- A plan is built from exercises. Exercises come from a built-in library (seeded, shared by all users) or are custom exercises the user creates (saved to that user only).
- Exercise types need different fields: strength (sets × reps × weight), cardio (distance, duration, pace), time-based (duration), bodyweight (sets × reps). Each exercise has muscle groups / category and optional notes.
- A plan defines how many workouts per week and the workouts themselves (e.g. "Push", "Pull", "Legs"), each with ordered exercises and planned sets/reps/weight/rest.
- Optional schedule: which days of the week each workout happens, and optionally at what time.
- Implementation: `WorkoutPlan` document per plan with embedded `workouts[]` → `exercises[]` (targets stored only for the fields relevant to the exercise type) and `schedule[]` (`day` 0 = Sunday, optional `time` "HH:MM"). The editor sends the whole plan (`PUT /api/plans/:id`) and passes back workout/entry ids so they stay stable — live sessions (stage 6) should reference `planId` + `workoutId`. At most one active plan per user (the first plan is activated automatically). Deleting a plan is a hard delete — sessions must keep their own copy of what was planned.
- Built-in exercise names must be translatable (store translation keys or per-language names, not a single English string).
- Implementation: one `Exercise` collection. Built-in entries have `owner: null`, a stable `key` and `names: { en, he }`; they live in `server/src/data/builtInExercises.js` and are upserted on every server start (edit that file to add/fix exercises). Custom entries have `owner` and a single `name` (unique per user, case-insensitive). Built-in exercises are read-only. The client loads the whole library once and searches/filters locally (search matches names in every language).
- Deleting a custom exercise archives it (`isArchived: true`): it disappears from the library and can't be added to new plans, but plans (and later workout history) that already use it keep showing it. Its name becomes free to reuse.

**B. Planned vs. actual tracking**
- A workout session can be started from a planned workout (or as a free session) and tracked in real time: add/remove exercises during the session, log each set (reps, weight / distance, time), mark sets done, rest timer.
- The session stores what was actually done and stays linked to what was planned, so plan adherence can be shown (per session, per week, per exercise over time).
- A session in progress must survive a page refresh (persist to the server as it goes, not only at the end).
- Implementation: `WorkoutSession` (`status` inProgress/completed, at most one in progress per user). Starting from a plan copies each exercise's targets into `exercises[].planned` and pre-fills set rows, so history never changes when the plan is edited or deleted. The live screen autosaves the whole session with `PUT /api/sessions/:id` (debounced, retried while offline, flushed with `keepalive` when leaving). Planned exercises can't be removed from a session — unfinished sets mean "skipped"; exercises added during the workout have `planned: null` ("extra"). Planned vs actual: per exercise (done / partial / skipped / extra), per session (completed vs planned sets) and per week (finished sessions vs `workoutsPerWeek`, check marks on the week schedule). `GET /api/exercises/:id/history` feeds the "last time" hint.

**C. Diet plans and daily tracking**
- A user can have several diet plans; exactly one is **active** and is the one tracked.
- A plan can define calorie goals and/or macro goals (protein, carbs, fat), and/or explicit foods (with quantity and meal) including liquids.
- Foods come from a built-in food library or custom foods saved to the user. Nutrition values are stored per 100 g or per 100 ml (liquids), with calories, protein, carbs, fat, and optional fiber/sugar/sodium.
- Daily log: the user adds or removes what they actually ate/drank each day (from the plan or anything else) and sees progress against the active plan's goals, including water intake.
- The user can edit the plan itself and the daily log at any time.
- Implementation:
  - `DietPlan`: optional `targets` (kcal, protein, carbs, fat, water) + optional `meals[]` with food items (`quantity` + optional `portionLabel`, server computes `amount` in g/ml). One active plan per user (first plan is activated automatically). The editor can suggest targets from the health profile (Mifflin-St Jeor × activity level, adjusted by goal; protein per kg by goal; 25% fat; water 35 ml/kg) — client-side in `client/src/utils/diet.js`.
  - `DailyLog`: one document per user per local date string (`YYYY-MM-DD`, sent by the client). Entries copy the scaled nutrients at logging time. The day copies the active plan's targets on its first write; if the active plan later changes, the day view offers "update today's goals" (a day logged while no plan was active just follows the active plan). Entries added from the plan keep `planItem`, so planned-but-not-eaten items are shown per meal with one-tap add / "add all".
  - Meals in the log are the active plan's meal names, or the default keys breakfast/lunch/dinner/snacks (translated in the UI).
  - All `/api/diet/days/:date/*` endpoints return the full updated day.
- Built-in food library source: **USDA FoodData Central** (Foundation Foods + SR Legacy). Chosen over Open Food Facts because the values are lab-measured and curated, not crowd-sourced, and the data is public domain (CC0). Branded/packaged products (Open Food Facts) can be added later as a second source if needed.
- Food library implementation:
  - `server/scripts/build-usda-foods.js` turns the USDA bulk JSON downloads into `server/src/data/usdaFoods.json.gz` (committed, ~0.4 MB, ~7,600 foods). It keeps energy, macros and 8 micronutrients per 100 g plus household portions, and skips baby foods, Alaska Native foods and foods without energy/macros. Re-run it only when updating to a newer USDA release (instructions at the top of the script).
  - On server start `syncUsdaFoods()` upserts the file into the `Food` collection, but only when the file or the Hebrew names changed (hash stored in `DataVersion`). USDA foods missing from a newer file are archived, never deleted.
  - USDA names are English. `server/src/data/usdaHebrewNames.js` holds hand-written Hebrew names for ~170 common foods (fdcId -> name); those are also the "featured" foods shown when browsing. `foodSearchSynonyms.js` maps Hebrew search words to English words (with prefix/plural handling) so Hebrew searches also find untranslated foods. Add entries there when users can't find something in Hebrew.
  - Search is server-side (`GET /api/foods?q=&category=&source=&language=`), ranked: own foods, featured foods, names starting with the query, shorter names.
  - Custom foods: per 100 g or 100 ml (`basis`), energy + protein/carbs/fat required, optional portions. Deleting archives them (like custom exercises).
  - Liquids: USDA lists drinks per 100 g; treat 100 ml ≈ 100 g for drinks (documented to the user). Custom liquids use `basis: 'ml'`.

### Roadmap (one branch + PR per stage)

1. Project skeleton + app shell (server, client, i18n en/he, light/dark theme)
2. Registration, login, logout, 60-day session cookie, profile picture
3. Onboarding health screen (skippable) + profile page with health details and measurement history
4. Exercise library (seeded built-in + custom exercises)
5. Workout plan builder + weekly schedule
6. Live workout session + planned vs. actual tracking
7. Food library (USDA import + custom foods)
8. Diet plans (multiple, one active) + daily nutrition log
9. User data Markdown export (AI-ready context)
10. Deployment to Render + MongoDB Atlas (can be pulled earlier when I ask)
- Later: blood test PDF upload and parsing, AI assistant

### Accounts, profile and health data

- **Registration:** username, password, email, phone number (all required), profile picture (optional). Username and email are unique. Picture is resized in the browser before upload (see template conventions).
- **Auth (differs from the template's admin login):** real user accounts. Passwords hashed with bcryptjs (pure JS, no native build). Login issues a JWT valid for **60 days**, stored in an `httpOnly`, `Secure`, `SameSite=Lax` cookie (same origin), so a user who closes the browser and returns is still logged in. Logout clears the cookie. Rate-limit login and registration. Every API route except register/login/health requires auth, and every query is scoped to the logged-in user.
- **Onboarding:** right after registration, the user is sent to a health-details screen that can be skipped; the same details are editable later in the profile.
- **Profile:** account details (username, email, phone, picture) plus health details. Store date of birth (not age — compute age). Measurements that change over time are stored as dated entries (history), not a single overwritten value.
- **Health details (all optional):**
  - Body: sex, date of birth, height, weight, estimated body-fat %, waist circumference.
  - Vitals: resting / average heart rate, blood pressure (systolic/diastolic).
  - Lifestyle & goals: activity level, main goal (lose fat / build muscle / maintain / performance), target weight, average sleep hours, smoking, alcohol.
  - Medical: chronic conditions, injuries and physical limitations, medications, supplements, food allergies/intolerances, dietary preference (e.g. vegetarian, vegan, kosher).
  - Blood tests (future feature, model it now): upload a PDF → store the original file → extract results into structured data (test date, lab, and per marker: name, value, unit, reference range, flag) → show it in a clear readable format and keep it for later analysis.
- Data model: `HealthProfile` (one per user) holds details that rarely change; `Measurement` holds dated entries (weight, body fat, waist, resting heart rate, blood pressure). Profile API lives under `/api/me` (`PATCH /api/me`, `/api/me/health`, `/api/me/measurements`, `/api/me/onboarding`). Field definitions are mirrored in `client/src/constants/health.js` — keep both sides in sync.
- Units: metric (kg, cm, ml, km) stored in the DB; unit display preference can be added later.

### Display settings

- Light / dark mode, toggleable at any time from a button in the header and from display settings. Default follows the system. Implemented with CSS variables under `[data-theme]` on `<html>`; the choice is saved to the user's settings (and to localStorage so it applies before login / without flicker).
- Language setting in the same place.

### i18n

- `react-i18next` with one JSON file per language in `client/src/locales/<code>.json` and a single language registry (`code`, native name, `dir`). Adding a language = add a JSON file + one registry entry, nothing else.
- On language change set `lang` and `dir` on `<html>`. Use CSS logical properties (`margin-inline-start`, `padding-inline-end`, `inset-inline-start`) so RTL works without separate styles.
- No hardcoded UI strings in components. Server error messages return a stable error code the client translates.

### AI-ready data (future)

- Planned future features: an AI assistant that analyzes a user's full profile and gives training and diet recommendations and warnings (training too much / too little, eating too much / too little, needs more protein, supplement suggestions, advice based on latest blood tests, etc.).
- Prepare for it now: a server service (e.g. `services/userContext.service.js`) that builds one **Markdown** document of everything relevant about a user — profile and health details, measurement history, active and past workout plans, recent sessions with plan-vs-actual, active diet plan, recent daily nutrition logs with totals vs. goals, blood test results. Clear headings, dates on everything, units on every number, tables for series.
- Expose it to the user (`GET /api/me/export.md`) so they can download it and use their own models/tools. Only the owner can export their data.
- Future AI features must use this same builder, not a separate one.
- Implementation: `buildUserContext(userId, { period, timeZone })` in `server/src/services/userContext.service.js` (Markdown helpers in `markdown.js` escape user text so names/notes can't break tables or headings). `GET /api/me/export.md?days=30|90|365|all&tz=<IANA zone>` returns it as a download; the profile page has download / copy / preview. The document is always in English (stable for LLMs) with explicit units and local dates, and contains: profile & health, measurements (latest + history with change), active/other workout plans, sessions with planned-vs-actual per exercise, weekly adherence, exercise progress (best set, Epley 1RM), custom exercises, active/other diet plans with planned meals, daily nutrition totals vs goals, detailed food for the last 7 logged days, custom foods. When adding a new kind of user data, add it here too.

## Working with me (the user)

- Talk to me in Hebrew. Code, commits, file names and comments stay in English.
- When there is a decision, give a recommendation with the reason, not a list of options.
- For anything I must do myself (creating accounts, dashboards, settings), give exact step-by-step instructions.
- Never ask me to paste passwords, connection strings or tokens into the chat. If I paste one by mistake, tell me and guide me to rotate it.
- Report honestly: what was tested, how, what failed, and what was not tested (e.g. real iPhone/Android).

## Starting a new project

1. Check the machine first: `node`, `npm`, `git`, `gh`, `mongod`/`mongosh`, git remote and access (`git ls-remote origin`).
2. Replace any non-Node `.gitignore` with a Node/React one (`node_modules/`, `dist/`, `.env`, `.env.*`, `!.env.example`, logs, `.DS_Store`).
3. Build the skeleton on a `feature/project-skeleton` branch (layout below), verify it runs, commit, push, hand me the PR link.

## Architecture

```
package.json          root scripts: install:all, dev:server, dev:client, build, start
render.yaml           Render blueprint
server/               Node.js + Express 5, ESM ("type": "module")
  src/server.js       connect DB, then listen
  src/app.js          middleware, /api routes, serves client/dist in production
  src/config/         env.js (all process.env access), db.js
  src/routes/         URL → controller only; index.js mounts all routers under /api
  src/controllers/    read req, call services, send res — no business logic
  src/services/       business logic + validation, throw HttpError(status, message)
  src/models/         Mongoose schemas
  src/middlewares/    errorHandler.js (HttpError), auth.js
client/               React + Vite
  src/components/<Name>/<Name>.jsx + <Name>.css   one folder per component, own CSS
  src/api/            httpClient.js (single fetch wrapper) + one file per resource
  src/utils/          small helpers (localStorage keys, image resizing...)
  src/constants/      shared constants (routes, validation rules mirrored from the server)
  src/context/        React context providers (AuthProvider)
  src/hooks/          shared hooks (useAuth, useErrorMessage)
  src/i18n/, src/locales/   i18next setup, language registry, one JSON per language
  src/router.jsx      all routes (data router, so pages can use useBlocker for unsaved changes)
```

Conventions:
- Express 5 handles async errors — no try/catch in controllers; services throw `HttpError`.
- CSS: plain CSS per component, BEM-style class names (`vote-card__photo--placeholder`), shared colors as CSS variables in `index.css`. Mobile-first; test at 390px width. Set `lang`/`dir` on `<html>` for RTL.
- Dev: Vite proxies `/api` to `http://localhost:4000`. Production: one Express server serves the API and `client/dist` (same origin, no CORS), with SPA fallback.
- `app.set('trust proxy', 1)` in production (Render is behind a proxy).
- Keep lint clean (`npm run lint` in client) and the build passing.

## Config, secrets and security

- All config via environment variables. `server/.env` is gitignored; `server/.env.example` is committed with safe placeholder values.
- Never hardcode credentials. Admin login: `ADMIN_USERNAME` / `ADMIN_PASSWORD` / `ADMIN_TOKEN_SECRET` from env, JWT checked on the server, timing-safe comparison, rate-limited login.
- All permission checks happen on the server; the client only hides UI.
- Validate input in services (types, enums, max lengths/sizes). Don't return internal ids or secrets to the client.
- Images: resize/crop in the browser before upload (canvas → JPEG), fall back to `heic-to` (lazy `import()`) for HEIC; validate `data:image/` prefix and size on the server.

## Git workflow

- Never commit to `main`. Every change gets its own branch from an up-to-date `main`: `feature/<short-name>`.
- Commit with a clear message, push the branch, give me the PR link (`https://github.com/<owner>/<repo>/pull/new/<branch>`).
- I open and merge the PR myself. Don't start the next branch until I confirm the merge (unless the branches are independent and I asked for several changes at once).
- After I merge: `git checkout main && git pull`, delete the merged branch locally and on the remote.
- Merging to `main` deploys to production — warn me about risky merges (e.g. during a live event).

## Verifying changes (before handing off)

- Build + lint must pass.
- Run the app **isolated** from my own dev environment:
  - production mode on a separate port: `NODE_ENV=production PORT=4199 MONGODB_URI=mongodb://127.0.0.1:27017/<project>-e2e node src/server.js` (after `npm run build` in client)
  - never use ports 4000/5173 or my dev database; never `pkill -f` by pattern — stop only the PID you started; drop the `-e2e` database afterwards.
- Browser-test real flows with `playwright-core` + the local Google Chrome (`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`), scripts in the scratchpad, not in the repo. Take mobile screenshots (390×844) and look at them.
- Also test the negative paths: unauthorized access (401/403), invalid input (400), duplicates (409).

## Deployment (Render + MongoDB Atlas)

- **MongoDB Atlas:** free M0 cluster, AWS Frankfurt. DB user with an auto-generated alphanumeric password (special chars like `@` break the URI) and "Read and write to any database". Network Access `0.0.0.0/0` (Render has no static IP). URI must include the DB name: `mongodb+srv://user:pass@cluster.xxx.mongodb.net/<db-name>?appName=...`. Test with `mongosh` using `read -s` so the password isn't echoed.
- **Render:** Blueprint from `render.yaml` — web service, `plan: free`, `region: frankfurt`, `branch: main`, `buildCommand: npm run build`, `startCommand: npm start`, `healthCheckPath: /api/health`, `NODE_VERSION`, secrets with `sync: false`, token secret with `generateValue: true`.
- Root `build` script must install client devDependencies explicitly (`npm install --include=dev --prefix client`) so Vite exists even if `NODE_ENV=production`.
- Free tier sleeps after ~15 min idle (30–60s cold start) — open the site before sharing, or ping `/api/health` with UptimeRobot.
- Rollback: Render → Events → Rollback.
- Link previews (WhatsApp etc.): Open Graph tags in `index.html` with a `__SITE_URL__` placeholder that the server replaces per request; 1200×630 JPEG `og-image.jpg` in `client/public`.
