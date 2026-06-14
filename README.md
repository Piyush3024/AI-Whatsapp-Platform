# WhatsApp AI Platform

[![CI](https://github.com/Piyush3024/AI-Whatsapp-Platform/actions/workflows/ci.yml/badge.svg)](https://github.com/Piyush3024/AI-Whatsapp-Platform/actions/workflows/ci.yml)

A multi-application monorepo for a WhatsApp automation SaaS platform.

This repository contains:

- `apps/api`: NestJS backend API and webhook platform for WhatsApp, authentication, billing, mail, knowledge base, analytics, and multi-tenant data access.
- `apps/web`: Next.js frontend application that communicates with `apps/api` and renders the customer-facing dashboard.
- `apps/worker`: background worker process for OpenAI-powered message handling, outbound WhatsApp delivery, quality scoring, and async task processing.
- `packages/db`: shared Prisma schema and generated database client.

## Key Features

- Multi-tenant NestJS API with JWT auth, rate limiting, file uploads, and real-time sockets.
- Next.js frontend that uses `NEXT_PUBLIC_API_URL` to connect to the API and socket endpoints.
- Worker service with `bullmq`, Redis, Prisma, and OpenAI integration.
- Environment validation for API and worker apps.
- Shared package management with `pnpm` and `turbo`.

## Prerequisites

- Node.js `>=18`
- `pnpm` package manager
- PostgreSQL database
- Redis server

## Getting Started

Install dependencies from the repository root:

```bash
pnpm install
```

## Root Workspace Commands

```bash
pnpm run dev
pnpm run build
pnpm run lint
pnpm run format
pnpm run check-types
```

## App-Specific Commands

### API

```bash
cd apps/api
pnpm run start:dev
pnpm run build
pnpm run lint
pnpm run test
pnpm run prisma:generate
pnpm run prisma:migrate
pnpm run prisma:studio
```

### Web

```bash
cd apps/web
pnpm run dev
pnpm run build
pnpm run start
pnpm run lint
pnpm run check-types
```

### Worker

```bash
cd apps/worker
pnpm run dev
pnpm run build
pnpm run start
pnpm run generate
pnpm run check-types
```

## Environment Variables

Each app has its own example env file:

- `apps/api/.env.example`
- `apps/worker/.env.example`
- `apps/web/.env.example`

The API app relies on environment values such as `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `WHATSAPP_*`, `OPENAI_API_KEY`, `STRIPE_*`, `ESEWA_*`, `RESEND_API_KEY`, and mail settings.

The worker app relies on `DATABASE_URL`, `REDIS_URL`, `OPENAI_API_KEY`, and WhatsApp credentials.

The web app uses `NEXT_PUBLIC_API_URL` and optional Sentry settings.

## Database

The shared database package uses Prisma and includes commands under the root workspace:

```bash
pnpm db:generate
pnpm db:migrate:dev
pnpm db:migrate:deploy
pnpm db:studio
```

## Notes

- `apps/api` uses `@nestjs/config` and Joi validation for environment configuration.
- `apps/worker` validates environment variables with Zod at startup.
- `apps/web` exposes the API endpoint through `NEXT_PUBLIC_API_URL` and has Sentry client/server config.

## License

This repository is private. See individual apps for license details.
