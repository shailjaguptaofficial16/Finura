# Finura Production Deployment Manifest

This document is a deployment-ready configuration guide for the Finura app using Vercel for the frontend, Render for the backend, and MongoDB Atlas for the database.

Important:
- This is a configuration manifest only.
- No real credentials or secrets are generated here.
- All values marked with angle brackets must be filled by the operator manually.
- Do not commit real production secrets to source control.

## 1. Backend deployment on Render

### 1.1 Render app configuration

Service type: Web Service
- Runtime: Node
- Root directory: finura-backend
- Build command: `npm install`
- Start command: `npm start`
- Health check path: `/api/health`

### 1.2 Backend production environment variables

These must be configured in Render dashboard > Environment > Add Environment Variables.

| Variable | Required | Example value | Notes |
|---|---:|---|---|
| NODE_ENV | Yes | `production` | Must be production in hosted env |
| PORT | Yes | `4000` | Render injects port automatically; set explicitly if needed |
| MONGO_URI | Yes | `mongodb+srv://<username>:<password>@<cluster>.mongodb.net/finura?retryWrites=true&w=majority` | MongoDB Atlas connection string |
| JWT_SECRET | Yes | `replace_with_secure_random_string` | Minimum length: 32+ recommended |
| CLIENT_URL | Yes | `https://your-vercel-app.vercel.app` | Frontend origin allowed by CORS |
| FRONTEND_URL | Yes | `https://your-vercel-app.vercel.app` | Frontend URL used by backend logic and docs |
| EMAIL_HOST | Optional | `smtp.mailtrap.io` | For password reset emails |
| EMAIL_PORT | Optional | `2525` | Mail provider SMTP port |
| EMAIL_USERNAME | Optional | `your_mailtrap_user` | SMTP username |
| EMAIL_PASSWORD | Optional | `your_mailtrap_password` | SMTP password |
| EMAIL_FROM | Optional | `no-reply@your-domain.com` | Verified sender address |
| GOOGLE_CLIENT_ID | Optional | `""` or `<google-oauth-client-id>` | Only if Google login is enabled |
| APP_NAME | Optional | `Finura` | App metadata |
| APP_URL | Optional | `https://your-vercel-app.vercel.app` | Public app URL |

### 1.3 Render deployment settings

Recommended Render settings:
- Auto deploy: enabled
- Region: nearest to your MongoDB Atlas cluster and users
- Plan: starter or above
- Health check path: `/api/health`
- Run command: `npm start`
- Build command: `npm install`

### 1.4 Backend health check

The backend is already configured with a health route in [finura-backend/server.js](../finura-backend/server.js):

```http
GET /api/health
```

Expected response:

```json
{
  "status": "ok",
  "environment": "production"
}
```

### 1.5 Production error handling verification

The app includes central error middleware in [finura-backend/middleware/errorMiddleware.js](../finura-backend/middleware/errorMiddleware.js) and uses the auth middleware in [finura-backend/middleware/authMiddleware.js](../finura-backend/middleware/authMiddleware.js).

Verified behavior:
- 404 handlers exist
- 500 responses are sanitized outside development mode
- stack traces are not exposed in production
- invalid tokens and missing auth are returned in a consistent format
- production startup validates required env variables before boot

## 2. Frontend deployment on Vercel

### 2.1 Vercel project configuration

Build command:
```bash
npm install && npm run build
```

Output directory:
```text
finura-client/dist
```

Project root:
```text
.
```

### 2.2 Required frontend env vars

In Vercel dashboard > Project > Settings > Environment Variables:

| Variable | Required | Example value | Notes |
|---|---:|---|---|
| VITE_API_URL | Yes | `https://your-render-backend.onrender.com/api` | Full backend API base URL |
| VITE_GOOGLE_CLIENT_ID | Conditional | `your_google_client_id_here` | Only needed when Google login is enabled |
| VITE_APP_NAME | Optional | `Finura` | Frontend app name |

### 2.3 SPA routing config

This repository includes [vercel.json](../vercel.json) to support SPA fallback:

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "cleanUrls": true,
  "trailingSlash": false
}
```

This must be present in the Vercel project root to prevent dashboard route refresh issues.

### 2.4 Production API URL verification

The frontend uses [finura-client/src/services/api.js](../finura-client/src/services/api.js) to compute the API base URL via `VITE_API_URL`.

Required behavior:
- `VITE_API_URL` must point to the deployed backend API origin
- no hardcoded localhost value should be used in production builds
- use HTTPS in production

## 3. MongoDB Atlas setup

### 3.1 Database creation

1. Create a MongoDB Atlas account.
2. Create a new project.
3. Create a cluster.
4. Choose a regional cluster close to the app deployment regions.
5. Configure database access.

### 3.2 Network access

Set Atlas network access:
- Add the Render service IPs if required by the host
- Add Vercel static host IPs only if your backend or database requires direct IP whitelisting
- Prefer private networking or provider-managed network rules if available
- For most modern deployments, use secure connection string with proper credentials and managed access

### 3.3 Database user and permissions

Create a database user with the minimum required privileges:
- readWrite on the target database
- access to the specific app database, e.g. `finura`
- do not use admin credentials in the application

Example connection format:

```text
mongodb+srv://<db-user>:<db-password>@<cluster-host>/<database-name>?retryWrites=true&w=majority
```

### 3.4 Backup considerations

- Use Atlas continuous backup or scheduled snapshots for production
- Test a restore in a staging database before relying on production backup policy
- Keep a recovery plan and retention policy documented
- Avoid storing the connection string in the repository

## 4. CORS and cookies

### 4.1 CORS

Backend CORS is configured in [finura-backend/middleware/securityMiddleware.js](../finura-backend/middleware/securityMiddleware.js).

Production rule:
- only allow the exact frontend origin, e.g. `https://your-vercel-app.vercel.app`
- local development may allow `localhost` origins
- do not open production CORS to `*`

### 4.2 Cookies and session settings

The current app uses JWT in headers rather than server-set cookies. Verify before production deployment:
- keep token handling in secure browser storage or session-based auth flow
- if cookies are later introduced, set:
  - `httpOnly: true`
  - `secure: true`
  - `sameSite: 'lax'` or `'strict'` depending on cross-site needs
  - `domain` only for the exact production host

Important:
- Localhost and production config must be separate
- `secure` should be true in production HTTPS environments
- never expose JWT tokens or database credentials in client or logs

## 5. Deployment order and rollback

### 5.1 Required deployment sequence

1. MongoDB Atlas setup
2. Render backend deployment
3. Frontend Vercel deployment
4. CORS and API configuration update
5. Smoke testing against the deployed environment

### 5.2 Rollback steps

If deployment fails:
1. Keep the previous production frontend build and backend release available in the provider dashboard
2. Revert environment variable values to the last working values
3. Restore the previous MongoDB snapshot if data integrity is in question
4. Re-run the health checks and auth smoke tests before re-enabling traffic

### 5.3 Common deployment errors and solutions

| Issue | Cause | Fix |
|---|---|---|
| `401` on authenticated requests | wrong JWT secret or expired token | ensure JWT_SECRET matches production config |
| Frontend API fails | wrong `VITE_API_URL` | update to deployed backend URL |
| CORS error | frontend origin not in allowed list | update `CLIENT_URL` and allowed origins |
| Route 404 after refresh | missing SPA fallback | add Vercel rewrite rule |
| Backend not starting | missing `MONGO_URI` or invalid secret | set env values and verify database access |
| Health check fails | app not listening or runtime crash | inspect Render logs and confirm `npm start` is correct |

## 6. Production smoke test checklist

### Endpoint checks
- [ ] `GET /api/health` returns 200
- [ ] invalid route returns 404 response
- [ ] invalid auth returns 401
- [ ] protected endpoints reject missing auth

### Auth flow
- [ ] signup works for a test user
- [ ] login works with valid credentials
- [ ] logout clears session state
- [ ] protected route redirects or rejects unauthenticated access
- [ ] session expiration returns a safe auth error

### Financial functionality
- [ ] add account succeeds
- [ ] edit account succeeds
- [ ] delete account succeeds
- [ ] add transaction succeeds
- [ ] edit transaction succeeds
- [ ] delete transaction succeeds
- [ ] budget creation and tracking work
- [ ] analytics page loads and renders data
- [ ] AI pages load without crashing
- [ ] settings update persists

### Validation and error handling
- [ ] invalid request payload returns consistent 400 response
- [ ] unauthorized access returns 401 or 403 as expected
- [ ] duplicate financial record protection works
- [ ] failed transfer rolls back without partial balance loss

### Responsive checks
- [ ] dashboard works on mobile layout
- [ ] protected route is still accessible on refresh
- [ ] navigation and menu behavior work on smaller screens

## 7. Exact deployment commands

### Backend Render

```bash
cd finura-backend
npm install
npm start
```

### Frontend Vercel

```bash
cd finura-client
npm install
npm run build
```

Then deploy the generated `dist` directory or the Vercel project directory with the build config above.

## 8. Manual steps required

These values must be filled by the user before a real deployment:

- MongoDB Atlas cluster connection string
- database username and password
- Render app environment variables
- Vercel environment variables
- custom frontend domain and backend domain
- Gmail, Mailtrap, or SMTP credentials if email flows are enabled
- Google OAuth client ID if Google login is enabled

## 9. Known risks

- Real production deployment has not been executed in this workspace, so live environment verification is still pending
- external provider-specific DNS and TLS settings must be configured by the user
- production database permissions and network restrictions must be reviewed by the operator before launch
- any provider-specific environment differences must be validated after deployment

## 10. Final deployment sequence

1. Create MongoDB Atlas cluster and database user
2. Set MongoDB Atlas network access and note the connection string
3. Configure Render backend environment variables
4. Deploy the backend service and confirm `/api/health` responds
5. Configure Vercel frontend environment variables and deploy frontend
6. Update backend `CLIENT_URL` and `FRONTEND_URL` to the real production domain
7. Run live smoke tests against the deployed app
8. Roll back to the previous release if any critical auth or financial flow fails

This deployment manifest is documentation-ready and safe for operator use, but it does not claim that a real hosted environment is live or verified.
