# Athanor Platform

Customer console for Athanor's versioned RL training environments. Evaluate, calibrate, and benchmark AI agents.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Runtime**: Bun
- **Styling**: Tailwind CSS v4
- **Database**: Supabase (Postgres + Auth)
- **Server State**: TanStack Query v5
- **Language**: TypeScript (strict mode)

## Getting Started

```bash
# Install dependencies
bun install

# Copy env vars
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Run development server
bun dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `bun dev` | Start development server |
| `bun run build` | Production build |
| `bun run lint` | ESLint check |
| `bun run lint:fix` | ESLint auto-fix |
| `bun run typecheck` | TypeScript type-check |

## Project Structure

```
src/
├── app/              # Next.js App Router pages
│   ├── overview/     # Dashboard overview
│   ├── environments/ # Environment list + detail
│   ├── tasks/        # Task browser
│   ├── runs/         # Run list + detail
│   ├── calibration/  # Calibration profiles + sigmoid preview
│   ├── baselines/    # Model baselines comparison
│   ├── training/     # Training integration guides
│   ├── credentials/  # API key management
│   └── docs/         # Documentation viewer
├── components/
│   ├── layout/       # AppShell, Sidebar
│   └── ui/           # Reusable UI components
├── data/             # Mock data layer
├── hooks/            # TanStack Query hooks
├── lib/              # Supabase clients, query keys
└── types/            # TypeScript type definitions
supabase/
└── migrations/       # Database schema migrations
```
