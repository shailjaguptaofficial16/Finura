# Finura Setup & Installation Guide

## System Requirements
- Node.js version 18.0.0 or higher
- npm version 9.0.0 or higher
- Local MongoDB daemon or MongoDB Atlas URI

## Step-by-Step Installation

### Step 1: Environment Configuration
Create `finura-backend/.env` with the following variables:
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/finura
JWT_SECRET=finura_enterprise_super_secret_jwt_key_2026
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
```

### Step 2: Install Dependencies
```bash
# Install root orchestration tools
npm install

# Install client packages
cd finura-client
npm install
cd ..

# Install backend packages
cd finura-backend
npm install
cd ..
```

### Step 3: Seed Demo Workspace
Seed the pre-configured demo user and financial dataset:
```bash
npm run seed-demo
```
*This creates the `demo@finura.app` account with 4 accounts, 14 transactions, 3 budgets, and 2 financial goals.*

### Step 4: Run Development Environment
```bash
# Runs backend server and Vite client concurrently
npm run dev
```

### Step 5: Building for Production
```bash
# Compiles React 19 application into dist/
npm run build-client

# Starts production Node server serving static assets
npm run prod
```
