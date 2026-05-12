# Personal OS

Personal OS is a Next.js PWA for managing tasks, habits, goals, projects, metrics, weekly reviews, and AI-driven planning.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Prisma
- Neon Postgres
- Neon Auth

## Environment Variables

Create a `.env` file with:

```env
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
NEON_AUTH_BASE_URL="https://<your-branch-auth-endpoint>/neondb/auth"
NEON_AUTH_COOKIE_SECRET="<at-least-32-characters>"
OPENAI_API_KEY="sk-..."
```

Notes:

- `DATABASE_URL` should use your pooled Neon connection string for the running app.
- `DIRECT_URL` should use the direct Neon connection string for Prisma migrations.
- `NEON_AUTH_BASE_URL` must be the branch-scoped Neon Auth endpoint from the Neon console.
- `NEON_AUTH_COOKIE_SECRET` should be a strong secret, for example from `openssl rand -base64 32`.

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Run Prisma against Neon:

```bash
npx prisma migrate dev
npx prisma generate
```

3. Start the development server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

## Authentication

The app uses Neon Auth with Next.js route handling at:

- `/api/auth/[...path]`
- `/auth/sign-in`
- `/auth/sign-up`

Authenticated product routes are protected through `proxy.ts`.

## AI Features

The app includes:

- Weekly AI analysis
- Behavioral memory
- AI daily planner

These features rely on `OPENAI_API_KEY` and authenticated app users stored in Prisma.

## Prisma Notes

This project keeps Prisma as the ORM and uses Neon Postgres as the datasource.

- Runtime reads and writes use `DATABASE_URL`
- Prisma CLI uses `DIRECT_URL` when available

## Manual Verification Checklist

- Neon Postgres connection works
- Prisma migrations apply successfully
- Neon Auth sign-up works
- Neon Auth sign-in works
- Session persists across page loads
- Protected routes redirect unauthenticated users
- Tasks, habits, goals, projects, reviews, metrics, and AI routes work per signed-in user
