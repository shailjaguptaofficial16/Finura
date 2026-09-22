# Finura Backend

## Overview

Finura backend is the API layer for the Finura finance platform. It provides authentication, financial data management, analytics, AI endpoints, notifications, and user-scoped multi-tenant safeguards.

## Tech Stack

- Node.js
- Express
- MongoDB + Mongoose
- JWT authentication
- Helmet, CORS, rate limiting, sanitization

## Local Setup

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
2. Fill in the required values in `.env`.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

## Required Environment Variables

```env
NODE_ENV=development
PORT=4000
MONGO_URI=mongodb://127.0.0.1:27017/finura
JWT_SECRET=replace_with_a_secure_random_64_character_string
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
EMAIL_HOST=smtp.mailtrap.io
EMAIL_PORT=2525
EMAIL_USERNAME=your_email_user
EMAIL_PASSWORD=your_email_password
EMAIL_FROM=no-reply@finura.local
GOOGLE_CLIENT_ID=
APP_NAME=Finura
APP_URL=http://localhost:5173
```

## Production Notes

- Use a production MongoDB URI and a strong JWT secret.
- Keep `.env` outside of version control in deployment environments.
- Use a dedicated production database, not the development database.

## Health Check

```bash
curl http://localhost:4000/api/health
```

Expected response:

```json
{"status":"ok","environment":"development"}
```

## Backup and Restore

### Backup

```bash
mongodump --uri="your_mongo_uri" --out=./backups/finura-$(date +%Y%m%d-%H%M%S)
```

### Restore

```bash
mongorestore --uri="your_mongo_uri" ./backups/finura-<timestamp>
```

## Security Notes

- Never log passwords, JWTs, cookies, tokens, or user financial records.
- Keep credentials in environment variables or secret managers.
- Use strict CORS origins and never allow arbitrary origins in production.
- Keep stack traces disabled outside development.

## Troubleshooting

- If MongoDB fails to connect, check `MONGO_URI` and network access.
- If auth fails, verify `JWT_SECRET` is set and consistent across app restarts.
- If CORS fails, ensure `CLIENT_URL` matches the frontend host exactly.
