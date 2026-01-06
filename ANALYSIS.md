# Hygieia Codebase Analysis

## Project Overview
Hygieia is a comprehensive medical management application built with **Next.js 16 (App Router)** and **TypeScript**. It facilitates appointment management, patient and doctor portals, and secure communication.

## Tech Stack
### Core Frameworks
- **Runtime**: Node.js
- **Framework**: Next.js 16.1.1
- **Language**: TypeScript 5
- **Database ORM**: Prisma 6.5.0

### UI & Styling
- **Styling**: Tailwind CSS
- **Component Library**: Shadcn UI (Radix UI primitives)
- **Icons**: Lucide React, React Icons
- **Themes**: next-themes (Dark/Light mode support)

### Forms & Validation
- **Forms**: React Hook Form
- **Validation**: Zod (Schema validation)

### Authentication & Security
- **Auth Provider**: Clerk (`@clerk/nextjs`)

### Communication
- **Email**: React Email, Nodemailer, Resend

### State Management & Utilities
- **State**: Zustand (Global state)
- **Dates**: date-fns
- **Charts**: Recharts

### Monitoring
- **Error Tracking**: Sentry (`@sentry/nextjs`)
- **Performance**: Vercel Speed Insights

## Key Directories
- **`/app`**: Next.js App Router structure (pages, layouts, API routes).
- **`/components`**: Reusable UI components (likely shadcn components in `/components/ui`).
- **`/lib`**: Utility functions, Prisma client instance, shared logic.
- **`/prisma`**: Database schema and migrations.
- **`/types`**: Global TypeScript type definitions.
- **`/utils`**: Helper functions.

## Architectural Highlights
- **Server Actions**: Uses Next.js Server Actions for backend logic.
- **Type Safety**: Strong emphasis on TypeScript throughout the stack.
- **Modern React**: React 19 support.

## Recommendations
- Ensure strict type checking is maintained.
- Utilize `hygieia.code-workspace` for consistent editor settings.
