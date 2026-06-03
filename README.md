<div align="center">

# ◈ CoreStack

### Modular SaaS Backend Foundation

[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-5.x-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-7.x-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

A secure, scalable and production-ready backend core designed to power modern SaaS applications — with multi-tenant isolation, advanced JWT authentication, device fingerprinting, audit logging, and a real-time monitoring dashboard.

[🇧🇷 Leia em Português](./README.pt-BR.md)

</div>

---

## 🧠 Overview

CoreStack is a modular backend foundation built with security, scalability and real-world architecture in mind. It serves as a **reusable SaaS core** where new modules can be plugged in without breaking the existing system.

The project ships with a **full-stack implementation**: a robust Express + Prisma backend and a Next.js frontend with a real-time session monitoring dashboard.

---

## ✨ Features

### 🔐 Authentication & Security
- **JWT Authentication** — Access + Refresh token pair with configurable expiration
- **Refresh Token Rotation** — Automatic rotation on every refresh call; old tokens marked as `USED`
- **Reuse Attack Detection** — Family-wide token revocation when a consumed token is replayed
- **Password Hashing** — bcrypt with salt rounds for secure credential storage
- **Zod Validation** — Runtime input validation with strict schemas (min length, uppercase, digits)
- **Helmet Integration** — HTTP security headers (CSP, Referrer-Policy, X-Frame-Options)
- **Rate Limiting** — Global (100 req/15min) + auth-specific (10 req/15min) rate limiters with auto-skip on success

### 🏢 Multi-Tenant Architecture
- **Tenant Isolation** — Every resource is scoped to a tenant via `X-Tenant-ID` / `X-Tenant-Slug` header
- **Tenant Resolution Middleware** — Automatic lookup by UUID or slug with active status validation
- **Tenant-scoped Uniqueness** — Email uniqueness enforced per tenant, not globally
- **Tenant Seeding** — Default tenant created on database seed

### 🧾 Session Management
- **Persistent Sessions** — Database-backed sessions with IP, User-Agent, geolocation tracking
- **Session Listing** — Users can view all their active sessions
- **Session Revocation** — Revoke individual sessions or admin-revoke all sessions for a user
- **Token Family Tracking** — Each session has a token family chain; logout revokes the entire family
- **Automatic Cleanup** — Scheduled job (every 6h) removes expired sessions and stale tokens

### 🖐️ Device Fingerprinting
- **SHA-256 Fingerprint** — Generated from IP + User-Agent + Accept-Language + Timezone
- **Upsert Logic** — First-seen and last-seen tracking with visit count increments
- **Per-tenant, per-user** — Unique constraint on `(tenantId, userId, fingerprintHash)`
- **Extensible** — `externalFingerprintId` field ready for FingerprintJS Pro or similar services

### 📜 Audit Logging
- **Comprehensive Events** — `USER_REGISTER`, `USER_LOGIN`, `USER_LOGIN_FAILED`, `USER_LOGOUT`, `TOKEN_REFRESHED`, `TOKEN_REUSE_DETECTED`, `SESSION_REVOKED`, `PROFILE_UPDATED`, `PASSWORD_CHANGED`
- **Contextual Data** — IP address, User-Agent, and arbitrary JSON metadata per event
- **Non-blocking** — Audit failures never break the main request flow
- **Tenant-scoped** — Every log entry tied to its tenant and user

### 👤 User Management
- **Profile CRUD** — Get and update user profile (name, email)
- **Role Support** — `USER` and `ADMIN` roles with database-level enforcement
- **Admin Endpoints** — List all users, revoke all sessions for any user (admin only)
- **Last Login Tracking** — `lastLoginAt` updated on every successful authentication

### 🧩 Plug & Play Module System
- **Auto-registration** — Modules are declared in a simple array and auto-mounted with logging
- **Zero coupling** — Adding a new module requires no changes to the core
- **Prepared slots** — Finance, Marketplace, Admin tools planned as future modules

### 🖥️ Frontend Dashboard
- **Next.js 16 + React 19** — Modern SSR/CSR frontend with Tailwind CSS
- **Landing Page** — Animated system-online indicator, feature grid, CTA buttons
- **Login & Register** — Form pages with client-side validation
- **Session Monitor Dashboard** — Real-time display of:
  - User identity and role
  - Access token with live countdown timer
  - Refresh token hash, family ID, and expiration
  - JWT payload preview (decoded)
  - Active sessions table with individual revocation
  - Rotation history log (OK / REUSE_DETECTED / ERROR)
  - Security mode indicator (HttpOnly, Secure, SameSite)

### 🐳 Docker & DevOps
- **Docker Compose** — Full stack (PostgreSQL + Backend + Frontend) with health checks
- **Multi-stage Dockerfile** — Optimized production builds with separate deps/build/runtime stages
- **Docker Entrypoint** — Auto-runs Prisma migrations before server start
- **Graceful Shutdown** — SIGTERM / SIGINT handlers with Prisma disconnect
- **Environment Validation** — Zod-validated env vars with early failure on misconfiguration

### 🧪 Testing
- **Jest + ts-jest** — TypeScript-native test runner
- **Supertest** — HTTP-level integration tests
- **Test Categories**:
  - **Unit**: Token service (hash, generation)
  - **Integration**: Auth routes (register, login, refresh, logout, reuse detection), Tenant middleware, User routes (profile, sessions)
- **Isolated Test DB** — Separate `.env.test` with dedicated database
- **Custom Test Environment** — Global setup/teardown with per-test Prisma cleanup

---

## 🏗️ Architecture

```
CoreStack
├── backend/                    # Express + Prisma API
│   ├── src/
│   │   ├── core/               # 🔒 Stable Layer (rarely changes)
│   │   │   ├── config/         #    Database connection, env validation (Zod)
│   │   │   ├── errors/         #    AppError, HttpError classes
│   │   │   ├── middlewares/     #    Auth, Tenant, Error middlewares
│   │   │   ├── services/       #    Audit logging, Cleanup scheduler
│   │   │   ├── utils/          #    Fingerprint builder, Hash, JWT helpers
│   │   │   └── modules/        #    Module auto-registration
│   │   ├── modules/            # 🧩 Expandable Layer
│   │   │   ├── auth/           #    Register, Login, Refresh, Logout, Me
│   │   │   ├── user/           #    Profile, Sessions, Admin routes
│   │   │   └── admin/          #    (Planned)
│   │   └── __tests__/          #    Unit + Integration tests
│   ├── prisma/
│   │   ├── schema.prisma       #    6 models: Tenant, User, Session,
│   │   │                       #    RefreshToken, DeviceFingerprint, AuditLog
│   │   └── seed.ts             #    Default tenant + admin user
│   └── Dockerfile              #    Multi-stage production build
├── frontend/                   # Next.js 16 + React 19
│   ├── src/app/
│   │   ├── page.tsx            #    Landing page
│   │   ├── login/              #    Login form
│   │   ├── register/           #    Register form
│   │   └── dashboard/          #    Session Monitor (real-time)
│   └── Dockerfile              #    Production build
└── docker-compose.yml          #    Full stack orchestration
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20+ |
| Language | TypeScript 5.9 |
| Backend Framework | Express 5 |
| ORM | Prisma 7 |
| Database | PostgreSQL 16 |
| Authentication | JWT (Access + Refresh) with HS256 |
| Validation | Zod 4 |
| Security | Helmet, bcrypt, express-rate-limit |
| Frontend | Next.js 16, React 19, Tailwind CSS 4 |
| Testing | Jest 30, Supertest, ts-jest |
| DevOps | Docker, Docker Compose |
| Dev Tools | ts-node-dev, Prisma CLI, ESLint |

---

## 📡 API Reference

### Auth (`/auth`)
> All auth routes require the `X-Tenant-ID` header.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/auth/register` | — | Register a new user |
| `POST` | `/auth/login` | — | Login and receive token pair |
| `POST` | `/auth/refresh` | Cookie | Rotate refresh token |
| `POST` | `/auth/logout` | Cookie | Revoke entire token family |
| `GET` | `/auth/me` | Bearer | Get current user + token metadata |

### Users (`/users`)
> All user routes require `X-Tenant-ID` + Bearer token.

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| `GET` | `/users/me` | Any | Get own profile |
| `PUT` | `/users/me` | Any | Update own profile (name, email) |
| `GET` | `/users/me/sessions` | Any | List own active sessions |
| `DELETE` | `/users/me/sessions/:id` | Any | Revoke a specific session |
| `GET` | `/users/` | Admin | List all tenant users |
| `DELETE` | `/users/:userId/sessions` | Admin | Revoke all sessions for a user |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/admin/cleanup` | Manually trigger expired session/token cleanup |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Service status + registered modules |

---

## 🔒 Security Design

| Layer | Implementation |
|-------|---------------|
| Password Storage | bcrypt with salt rounds |
| Access Token | JWT HS256, 15min expiration (configurable) |
| Refresh Token | JWT HS256, 7-day expiration (configurable), stored as SHA-256 hash |
| Token Rotation | Old token → `USED`, new token generated, linked via `replacedBy` |
| Reuse Detection | Replaying a `USED` token revokes the entire family (`REVOKED`) |
| Session Validation | Auth middleware checks session existence and expiration on every request |
| Role Enforcement | Fresh role fetched from DB on each request (not just from token) |
| Rate Limiting | Global 100/15min + Auth 10/15min with `skipSuccessfulRequests` |
| HTTP Security | Helmet (CSP, Referrer-Policy, strict headers) |
| CORS | Configurable origin with credentials support |
| Env Validation | Zod schema — server refuses to start with invalid config |
| Fingerprinting | SHA-256 hash of IP + User-Agent + Accept-Language + Timezone |
| Graceful Shutdown | SIGTERM/SIGINT handlers close server and disconnect Prisma |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL 16+ (or Docker)
- npm

### Option 1: Docker (Recommended)

```bash
# Clone the repo
git clone https://github.com/Ecandiido93/CoreStack.git
cd CoreStack

# Configure environment
cp .env.example .env
# Edit .env with your JWT_SECRET (min 32 chars)

# Start all services
docker compose up -d
```

The stack will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **PostgreSQL**: localhost:5432

### Option 2: Local Development

```bash
# Clone and install
git clone https://github.com/Ecandiido93/CoreStack.git
cd CoreStack

# Backend
cd backend
npm install
cp .env.test.example .env   # or create your own .env
npx prisma generate
npx prisma migrate dev
npx prisma db seed           # Creates default tenant
npm run dev

# Frontend (in another terminal)
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

### Environment Variables

```env
# PostgreSQL
POSTGRES_USER=corestack
POSTGRES_PASSWORD=corestack
POSTGRES_DB=corestack

# JWT (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_SECRET=your_super_secret_minimum_32_characters_long_here

# URLs
CORS_ORIGIN=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_TENANT_ID=default

# Token Expiration
ACCESS_TOKEN_EXPIRES=15m
REFRESH_TOKEN_EXPIRES_DAYS=7
```

---

## 🧪 Running Tests

```bash
cd backend

# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

Tests use a separate database (`.env.test`) with automated setup/teardown.

---

## 🗄️ Database

### Models

| Model | Description |
|-------|-------------|
| `Tenant` | Organization/workspace with slug, active status |
| `User` | Tenant-scoped user with role, email uniqueness per tenant |
| `Session` | Login session with IP, User-Agent, geolocation, expiration |
| `RefreshToken` | Token chain with family tracking, status (ACTIVE/USED/REVOKED), hash |
| `DeviceFingerprint` | Device tracking with SHA-256 hash, seen count, extensible |
| `AuditLog` | Event log with action, IP, User-Agent, JSON metadata |

### Useful Commands

```bash
npx prisma migrate dev    # Run migrations
npx prisma studio         # Open database GUI
npx prisma db seed        # Seed default data
```

---

## 🧪 Testing the Authentication Flow

### 1. Register
```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: default" \
  -d '{"name": "John Doe", "email": "john@example.com", "password": "Test123"}'
```

### 2. Login
```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: default" \
  -d '{"email": "john@example.com", "password": "Test123"}'
```

### 3. Refresh Token (Rotation)
```bash
curl -X POST http://localhost:3001/auth/refresh \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: default" \
  --cookie "refreshToken=YOUR_REFRESH_TOKEN"
```
**Expected behavior**: New access token + rotated refresh token. Old token marked `USED`.

### 4. Reuse Attack Test
Replay the **old** refresh token after rotation:
```bash
# Expected: 401 — "Refresh token reuse detected"
# All tokens in the family are revoked
```

### 5. Logout
```bash
curl -X POST http://localhost:3001/auth/logout \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: default" \
  --cookie "refreshToken=YOUR_REFRESH_TOKEN"
```
**Expected behavior**: Entire token family revoked. No further refreshes possible.

---

## 📈 Roadmap

- [x] JWT Authentication (Access + Refresh)
- [x] Refresh Token Rotation with Reuse Detection
- [x] Multi-Tenant Architecture
- [x] Persistent Session Management
- [x] Device Fingerprinting
- [x] Audit Logging System
- [x] Role Support (USER / ADMIN)
- [x] Rate Limiting
- [x] Docker Compose Deployment
- [x] Integration & Unit Tests
- [x] Next.js Frontend + Session Monitor Dashboard
- [x] Automated Cleanup Scheduler
- [x] Zod Environment Validation
- [x] Graceful Shutdown
- [ ] RBAC (Role-Based Access Control) — granular permissions
- [ ] Email Verification
- [ ] Password Reset Flow
- [ ] Swagger / OpenAPI Documentation
- [ ] CI/CD Pipeline
- [x] HTTP-only Cookies (Secure + SameSite=Strict)
- [ ] CSRF Protection
- [ ] Production Deployment Guide

---

## 🎯 Purpose

This project was built to:
1. Demonstrate real backend engineering skills
2. Apply scalable multi-tenant architecture
3. Build a reusable, extensible SaaS core
4. Focus on security best practices and maintainability
5. Simulate a production-grade full-stack system

---

## 📌 Status

🚧 **Active Development** — Core foundation fully implemented. New modules and improvements coming.

---

## 👨‍💻 Author

**Emerson R. Candido**
Building solid systems, one layer at a time.

---

<div align="center">

Made with ☕ and dedication

</div>