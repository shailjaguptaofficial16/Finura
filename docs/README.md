# Finura — Intelligent Financial Control & Wealth Management Platform

[![Finura Security](https://img.shields.io/badge/Security-Enterprise%20Grade-emerald)](https://finura.app)
[![Vite Client](https://img.shields.io/badge/Client-React%2019%20%7C%20Vite-teal)](https://finura.app)
[![Node Backend](https://img.shields.io/badge/Backend-Node%20Express-blue)](https://finura.app)
[![Database](https://img.shields.io/badge/Database-MongoDB%20%7C%20Mongoose-green)](https://finura.app)

> **Finura** is a modern, enterprise-grade personal wealth and finance management application designed to give clients complete control over their money, budgets, investments, credit health, and long-term financial destiny.

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Main Features](#main-features)
3. [Tech Stack](#tech-stack)
4. [Architecture Summary](#architecture-summary)
5. [Security Highlights](#security-highlights)
6. [Setup Instructions](#setup-instructions)
7. [Demo Credentials](#demo-credentials)
8. [Screenshots & UI Mockups](#screenshots--ui-mockups)
9. [Future Improvements](#future-improvements)

---

## Project Overview

Finura transforms fragmented financial records into an actionable, unified command center. Whether tracking daily expenses across multiple bank accounts, monitoring investment portfolio yields, simulating loan amortizations, or receiving real-time AI spending audits, Finura empowers users with absolute clarity, speed, and privacy.

---

## Main Features

| Module | Core Capability | Key Highlights |
| :--- | :--- | :--- |
| **Landing Page** | High-conversion client portal | Hero, Features, How It Works, Security Pillars, Dashboard Preview & CTAs |
| **Interactive Onboarding** | 7-step guided walkthrough | Step-by-step setup for accounts, income, expenses, budgets, goals & AI |
| **Money Management** | Real-time multi-account ledger | Checking, Savings, Cash & Credit cards with transaction categorization |
| **Smart Budgets** | Monthly spending thresholds | Category limits, real-time alert badges, velocity tracking |
| **Financial Goals** | Milestone wealth building | Emergency funds, major milestones, deadline forecasting |
| **Investment Portfolio** | Multi-asset tracking | Stocks, mutual funds, SIP contributions, ROI analytics |
| **Wealth Overview** | Comprehensive net worth | Real-time assets vs. liabilities balance sheet |
| **Credit Dashboard** | Credit health intelligence | Score tracking, card utilization warnings, repayment schedules |
| **Finura AI Assistant** | Contextual financial copilot | Natural-language query answers, surplus optimization, budget audits |
| **Report Exporting** | Financial statement generation | PDF statement export with jsPDF, CSV data exports |

---

## Tech Stack

### Frontend Client (`finura-client`)
- **Core Framework**: React 19, React Router v7
- **Bundler & Build Tool**: Vite 8 with Rolldown compiler
- **Styling**: Tailored Emerald & Slate CSS Design System, Tailwind utility classes
- **Visualizations**: Chart.js, React-ChartJS-2, Recharts
- **Icons**: Lucide React
- **Document Export**: jsPDF, jsPDF-autotable, react-csv
- **Notifications**: React-Toastify

### Backend Server (`finura-backend`)
- **Runtime**: Node.js (LTS), Express 4
- **Database Layer**: MongoDB with Mongoose ODM
- **Authentication**: JSON Web Tokens (JWT), Bcrypt password hashing
- **Security Middleware**: CORS, Rate Limiting, Input Validation, Role-Based Access Control

---

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────┐
│                 Finura Client (Vite + React 19)             │
│  ┌───────────────┐   ┌────────────────┐   ┌──────────────┐  │
│  │ Landing Page  │   │ Onboarding Flow│   │  Dashboard   │  │
│  └───────┬───────┘   └────────┬───────┘   └──────┬───────┘  │
└──────────┼────────────────────┼──────────────────┼──────────┘
           │ Axios HTTP + JWT   │                  │
           ▼                    ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│            Express REST API (/api/v1)                       │
│  ┌─────────────────┐  ┌───────────────┐  ┌───────────────┐  │
│  │ Auth Middleware │  │ User tenancy  │  │ Route Guards  │  │
│  └────────┬────────┘  └───────┬───────┘  └───────┬───────┘  │
└───────────┼───────────────────┼──────────────────┼──────────┘
            ▼                   ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                   MongoDB Persistent Data                   │
│   Users · Accounts · Transactions · Budgets · Goals · AI    │
└─────────────────────────────────────────────────────────────┘
```

Detailed architectural patterns and schemas are documented in [docs/architecture.md](./architecture.md).

---

## Security Highlights

1. **Cryptographic Authentication**: JWT bearer tokens signed with secret salt rotation; password records hashed via Bcrypt (salt rounds = 10).
2. **Strict Multi-Tenancy**: Database queries enforce user ID filtering (`userId: req.user.id`) preventing cross-user data leakage.
3. **Protected API Endpoints**: Unauthenticated requests to private resources immediately reject with `401 Unauthorized`.
4. **Zero Telemetry Leakage**: Client logs and sensitive credentials are never transmitted to unauthorized third-party trackers.
5. **Session Resilience**: Token expiry handling with automatic clean logout and session restoration.

---

## Setup Instructions

### Prerequisites
- Node.js (v18 or v20+)
- npm (v9+)
- MongoDB instance (local or MongoDB Atlas connection string)

### Quick Start
```bash
# 1. Clone repository
git clone <repo-url>
cd landing\ page

# 2. Install dependencies
npm install
cd finura-client && npm install && cd ..
cd finura-backend && npm install && cd ..

# 3. Configure Environment
# Copy example env in finura-backend
cp finura-backend/.env.example finura-backend/.env

# 4. Seed Demo Data
npm run seed-demo

# 5. Start Development Server
npm run dev
```

The client application will run at `http://localhost:5173` and the backend API at `http://localhost:5000`.

To build the client for production:
```bash
npm run build-client
```

---

## Demo Credentials

For client walkthroughs and automated testing, use the pre-configured demo account:
- **Email**: `demo@finura.app`
- **Password**: `DemoPassword123!`
- **Role**: Verified Member (Pre-seeded with accounts, income, budgets, and investments)

*Alternatively, click "Explore Demo" directly from the landing page hero section for instant pre-filled access.*

---

## Screenshots & UI Mockups

- **Landing Page Hero & Features**: [docs/screenshots/01_landing_hero.svg](./screenshots/01_landing_hero.svg)
- **Product Dashboard & Net Worth**: [docs/screenshots/02_dashboard_overview.svg](./screenshots/02_dashboard_overview.svg)
- **Onboarding Flow Guide**: [docs/screenshots/03_onboarding_modal.svg](./screenshots/03_onboarding_modal.svg)

---

## Future Improvements

- **Open Banking Plaid / SaltEdge Integration**: Automated real-time bank account transaction sync.
- **Predictive Cash Flow Machine Learning**: Advanced forecasting models for seasonal expenditure volatility.
- **Tax Harvesting Optimization**: Automated tax estimation algorithms for stock and mutual fund investments.
- **Mobile Native Apps**: React Native cross-platform mobile application deployment for iOS and Android.
