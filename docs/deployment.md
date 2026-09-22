# Production Deployment

## Environment configuration

Backend hosting must define these variables separately from development:

```env
NODE_ENV=production
PORT=5000
MONGO_URI=your_production_database_url
JWT_SECRET=your_secure_random_secret
CLIENT_URL=https://your-frontend-domain.example
```

Frontend hosting must define:

```env
VITE_API_URL=https://your-backend-domain.example
```

Use separate MongoDB databases for development and production. Generate `JWT_SECRET` with a password manager or cryptographically secure generator. Do not put secrets in `VITE_*` variables, commit `.env` files, or publish demo credentials.

## Backend deployment

Run from `finura-backend`:

```bash
npm install
npm start
```

The service must expose `GET /api/health` and return `{"status":"ok","environment":"production"}`. Before deploying the frontend, verify:

```text
GET  /api/health       -> 200
GET  /api/auth/me      -> 401 without a token
POST /api/auth/login   -> safe error for invalid credentials
```

Then test registration/login, `/api/auth/me`, logout, and representative protected APIs with a test account. Confirm the database is the production database, CORS accepts only `CLIENT_URL`, cookies/tokens persist as designed, and errors contain no stack traces or secrets.

## Frontend deployment

Run from `finura-client`:

```bash
npm install
npm run build
```

Publish `dist` and configure the host to rewrite unknown SPA routes to `index.html`. Confirm the built app calls only `VITE_API_URL`, with no `localhost` API requests.

## Smoke test

Run the live flow in order: landing page, register, login, onboarding, account, income, expense, budget, goal, analytics, wealth, investments, credit, Finura AI, export, settings, and logout. Check refresh persistence, ownership isolation, protected-route rejection, mobile navigation, direct-route refresh, and browser console/network errors.

## Monitoring and privacy

Monitor uptime, latency, 4xx/5xx responses, database connectivity, authentication failures, AI failures, memory, CPU, frontend runtime errors, and failed API requests. Use structured logs, but never log passwords, JWTs, cookies, API keys, full account/card numbers, request bodies, or unnecessary financial records. Keep privacy policy, terms, support/contact, deletion requests, data collection details, and the informational-not-financial-advice AI notice published before launch.

Run `npm audit` in both `finura-backend` and `finura-client`, review high-severity findings, and re-run the production build after fixes. Live deployment itself requires a hosting provider, production database, domains, and credentials; those values must be supplied through the provider's secret configuration rather than committed here.