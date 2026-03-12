# North State Pathways

AI-powered career guidance platform helping students explore education and healthcare pathways across 10 Northern California counties (Butte, Glenn, Lassen, Modoc, Plumas, Shasta, Sierra, Siskiyou, Tehama, Trinity).

## Tech Stack

- **Frontend**: React 18 + TypeScript, Vite 7, TailwindCSS 3, shadcn/ui (Radix), wouter (routing), TanStack React Query, Framer Motion, React Hook Form + Zod
- **Backend**: Express 5 + TypeScript, Drizzle ORM (PostgreSQL), express-session + connect-pg-simple
- **AI**: OpenAI (default via Replit), Anthropic, OpenRouter (DeepSeek, Perplexity, Llama, Mistral, Grok, Gemini). SSE streaming for chat responses.
- **Build**: tsx, esbuild (server), Vite (client), Drizzle Kit (migrations)

## Project Structure

```
client/src/
├── pages/              # Page components (landing, chat, assessment, explore, about, disclaimer)
│   └── admin/          # Auth-protected admin panel (dashboard, pathways, institutions, resources, etc.)
├── components/ui/      # shadcn/ui components (30+ files)
├── lib/                # i18n, assessment-scoring, queryClient, utils
├── hooks/              # use-toast, use-mobile
└── App.tsx             # Root routing with language context

server/
├── index.ts            # Express app setup, session config, middleware
├── routes.ts           # All 50+ API endpoints
├── storage.ts          # DatabaseStorage class (IStorage interface)
├── db.ts               # PostgreSQL pool + Drizzle instance
├── seed.ts             # Initial data seeding
├── seed-assessment.ts  # Assessment questions & careers data
├── static.ts           # Static file serving (production)
├── vite.ts             # Vite dev server setup
└── replit_integrations/ # Audio, chat, image, batch processing

shared/
└── schema.ts           # Drizzle schema (16 tables) + Zod validation types

public/                 # Static assets (videos, audio, images)
dist/                   # Production build output
```

## Key Features

- **AI Chat**: Multi-provider with RAG knowledge base from DB, 5-min cache, streaming via SSE, token tracking with cost budgets
- **Career Self-Assessment**: 56 careers (30 healthcare, 26 education), weighted scoring matrix, AI or algorithmic fallback
- **Chat Onboarding**: Step-by-step flow (Pathway → County → Student Type → Location → Support Needs) with audio/video
- **Multilingual**: English/Spanish, 200+ translation keys in `lib/i18n.ts`, persisted in localStorage (`nsp-language`)
- **Explore Map**: Institution listing with filters, program counts, geolocation
- **Admin Panel**: Full CMS for pathways, institutions, programs, resources, contacts, conversations, AI settings
- **AI Transparency**: Opt-out toggle, human counselor fallback, HUMANS Principles framework

## Database Schema (16 tables)

Core: `counties`, `institutions`, `pathways`, `programs`, `resources`
Chat: `chatSessions`, `chatMessages`
Assessment: `assessmentQuestions`, `assessmentOptions`, `assessmentCareers`
Admin: `appSettings`, `tokenUsage`, `contacts`, `onboardingScripts`, `researchTasks`, `conversations`, `messages`

## Coding Conventions

- **Components**: Functional with hooks, shadcn/ui wrapped in `components/ui/`
- **Naming**: PascalCase components, camelCase utils/DB tables, kebab-case API routes
- **Validation**: Zod schemas for all DB inserts, React Hook Form on client
- **Styling**: TailwindCSS utility-first, CSS variables for theming (primary: `hsl(152, 45%, 32%)`)
- **AI**: Model switching via `getAIClient(modelId)`, system prompts as constants, token tracking middleware
- **i18n**: `useLanguage()` hook provides `language` state & `t()` function
- **Path aliases**: `@/` → `client/src/`, `@shared/` → `shared/`, `@assets/` → `attached_assets/`

## Commands

```bash
npm run dev        # Dev server (Express + Vite HMR)
npm run build      # Production build (client + server)
npm start          # Run production build
npm run check      # TypeScript type check
npm run db:push    # Push schema changes to PostgreSQL
```

## Environment Variables

- `DATABASE_URL` — PostgreSQL connection string
- `SESSION_SECRET` — Session encryption key
- `ADMIN_USERNAME` / `ADMIN_PASSWORD` — Admin login (default user: SCAILE)
- `AI_INTEGRATIONS_OPENAI_API_KEY` / `AI_INTEGRATIONS_OPENAI_BASE_URL` — Replit AI keys
- `PORT` — Server port (default 5000)

## Git / Commit Preferences

- Author: `siskiyousresearch <siskiyousresearch@users.noreply.github.com>`
- Remote: `https://github.com/siskiyousresearch/north-state-pathways`
- Do NOT add Claude as co-author
