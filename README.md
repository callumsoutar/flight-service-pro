# Aero Safety

A modern SaaS safety management system for flight schools, built with Next.js (App Router), Supabase, shadcn/ui, TypeScript, and Tanstack Query.

## Features
- Secure authentication and RLS with Supabase
- Modern, accessible UI with shadcn/ui and Tailwind CSS
- Role-based access (Admin, Instructor, Student)
- Fast, scalable API and data fetching
- Clean, maintainable architecture

## Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/your-org/aero-safety.git
cd aero-safety
```

### 2. Install dependencies
```bash
npm install
# or
pnpm install
```

### 3. Configure environment variables
Copy `.env.example` to `.env.local` and fill in your Supabase project details:
```bash
cp .env.example .env.local
```

- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key

### 4. Run locally
```bash
npm run dev
```

### 5. Lint and build
```bash
npm run lint
npm run build
```

## Deployment (Vercel)
- Push your code to GitHub/GitLab/Bitbucket
- Import the project into [Vercel](https://vercel.com/)
- Set the environment variables in the Vercel dashboard
- Deploy!

## Project Structure
- `/src/app` - Next.js App Router pages, layouts, and API routes
- `/src/components` - UI and feature components (domain-driven)
- `/src/lib` - Supabase clients and utilities
- `/src/types` - TypeScript types for DB tables
- `/public` - Static assets

## Testing
- (Recommended) Add tests in `/tests` using your preferred framework (Jest, Vitest, Playwright)

## Contributing
PRs and issues welcome!

---

© 2024 Aero Safety. All rights reserved.
