# Aero Safety

A modern SaaS safety management system for flight schools, built with Next.js (App Router), Supabase, shadcn/ui, TypeScript, and Tanstack Query.

## Features
- Secure authentication and RLS with Supabase
- Modern, accessible UI with shadcn/ui and Tailwind CSS
- Role-based access (Admin, Instructor, Student)
- Fast, scalable API and data fetching
- Clean, maintainable architecture
- Comprehensive booking time slot management system
- Configurable default booking durations

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
Copy `.env.example` to `.env.local` and fill in your project details:
```bash
cp .env.example .env.local
```

**Required Environment Variables:**
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key
- `RESEND_API_KEY`: Your Resend API key (for transactional and auth emails)
- `FROM_EMAIL`: Verified sender email address (e.g., `no-reply@yourdomain.com`)
- `REPLY_TO_EMAIL`: Support email address for replies (optional)

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

## Documentation

### System Configuration
- [Resend SMTP Setup Guide](./RESEND_SMTP_SETUP_GUIDE.md) - Complete guide to configure Resend as SMTP provider for Supabase authentication emails
- [SMTP Configuration Reference](./SMTP_CONFIGURATION_REFERENCE.md) - Quick reference for SMTP settings
- [SMTP Troubleshooting Guide](./SMTP_TROUBLESHOOTING_GUIDE.md) - Common issues and solutions for email delivery
- [Production Deployment Checklist](./PRODUCTION_DEPLOYMENT_CHECKLIST.md) - Complete pre-launch verification checklist

### Feature Documentation
- [Booking Time Slots & Default Duration System](./BOOKING_TIME_SLOTS_DOCUMENTATION.md) - Comprehensive guide to configuring and using the booking time management system
- [Booking Time Slots - Quick Reference](./BOOKING_TIME_SLOTS_QUICK_REFERENCE.md) - Quick start guide and troubleshooting for developers

### Email Templates
- [Supabase Auth Email Templates](./email-templates/supabase-auth-templates.md) - Branded email templates for authentication flows

## Testing
- (Recommended) Add tests in `/tests` using your preferred framework (Jest, Vitest, Playwright)

## Contributing
PRs and issues welcome!

---

© 2024 Aero Safety. All rights reserved.
