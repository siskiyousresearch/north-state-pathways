# North State Pathways - AI Career Chatbot Platform

## Overview
An AI-powered chatbot platform for North State Pathways (northstatepathways.org) that guides prospective students through education and healthcare career pathways in Northern California. Features an immersive student-facing chat experience and backend admin dashboard.

## Architecture
- **Frontend**: React + Vite + TypeScript + TailwindCSS + shadcn/ui
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **AI**: Multi-provider support (OpenAI, Anthropic, OpenRouter/DeepSeek/Perplexity) with Replit AI Integrations as default
- **Auth**: Session-based admin authentication (express-session + connect-pg-simple)
- **Routing**: wouter for frontend, Express for API

## Project Structure
```
client/src/
  pages/
    landing.tsx       - Public landing page with hero and features
    about.tsx         - About Us page with mission, values, pathways info
    chat.tsx          - Student-facing AI chat interface with streaming
    admin/
      login.tsx       - Admin login page
      layout.tsx      - Admin layout with sidebar + auth gate
      dashboard.tsx   - Analytics overview
      conversations.tsx - Review student chat sessions (rich markdown)
      pathways.tsx    - Manage career pathways and programs
      resources.tsx   - Manage scholarships/financial aid
      research.tsx    - AI research tasks with human-in-the-loop
      settings.tsx    - AI model selection, API keys, research model config
  components/
    admin-sidebar.tsx - Admin navigation sidebar
    ui/              - shadcn/ui components
  lib/
    queryClient.ts   - TanStack Query configuration

server/
  index.ts          - Express server entry + session middleware
  routes.ts         - All API endpoints + admin auth middleware
  storage.ts        - Database access layer (IStorage interface)
  db.ts             - Drizzle database connection
  seed.ts           - Database seed script
  vite.ts           - Vite dev server middleware

shared/
  schema.ts         - Drizzle schema + Zod types
```

## Key API Routes
- `POST /api/auth/login` - Admin login
- `POST /api/auth/logout` - Admin logout
- `GET /api/auth/check` - Check auth status
- `POST /api/chat/sessions` - Create chat session
- `POST /api/chat/sessions/:id/messages` - Send message (SSE streaming response)
- `GET /api/admin/stats` - Dashboard analytics (auth required)
- `GET /api/admin/sessions` - List all chat sessions (auth required)
- `GET /api/admin/sessions/:id/messages` - Get session messages (auth required)
- `GET/POST/PATCH/DELETE /api/admin/pathways` - Pathway CRUD (auth required)
- `GET/POST/DELETE /api/admin/programs` - Program CRUD (auth required)
- `GET/POST/DELETE /api/admin/resources` - Resource CRUD (auth required)
- `GET/POST /api/admin/research` - Research task management (auth required)
- `POST /api/admin/research/:id/run` - Execute AI research (auth required)
- `POST /api/admin/research/:id/approve|reject` - Approve/reject findings (auth required)
- `DELETE /api/admin/research/:id` - Delete research task (auth required)
- `PATCH /api/admin/programs/:id` - Update program (auth required)
- `GET/POST /api/admin/settings` - App settings (auth required, API keys masked on GET)

## Database Tables
- counties, institutions, pathways, programs, resources (knowledge base)
- chat_sessions, chat_messages (student interactions)
- research_tasks (AI research with human approval)
- app_settings (key-value store for AI model selection, API keys)
- session (express-session store, auto-created by connect-pg-simple)

## Environment Variables
- `DATABASE_URL` - PostgreSQL connection
- `SESSION_SECRET` - Express session secret
- `ADMIN_USERNAME` - Admin login username
- `ADMIN_PASSWORD` - Admin login password
- `AI_INTEGRATIONS_OPENAI_API_KEY` - Replit-managed OpenAI key (default provider)
- `AI_INTEGRATIONS_OPENAI_BASE_URL` - Replit-managed OpenAI base URL

## AI Provider Architecture
- **Replit (default)**: No API key needed, uses AI_INTEGRATIONS_* env vars
- **OpenAI Direct**: Models prefixed `openai-direct/`, requires OpenAI API key in settings
- **Anthropic**: Models prefixed `anthropic/`, requires Anthropic API key in settings
- **OpenRouter**: Models prefixed `openrouter/`, requires OpenRouter API key in settings
- **Perplexity**: Models prefixed `perplexity/`, routed through OpenRouter API
- API keys stored in app_settings table, masked (first 4 + last 4 chars) on GET responses

## Theme
- Primary: Forest green (152 45% 32%)
- Nature-inspired North State California branding
- Images in public/images/ (hero-landscape.png, chat-bg.png)

## Key Features
1. RAG-style chat: AI dynamically builds knowledge base from database
2. Streaming responses via SSE (Server-Sent Events)
3. Automated student profiling (extracts user type, county, interests)
4. 10 North State counties: Butte, Glenn, Lassen, Modoc, Plumas, Shasta, Sierra, Siskiyou, Tehama, Trinity
5. Healthcare & Education pathways with 21 programs, 14 institutions, 12 resources seeded
6. Guided onboarding flow: Pathway (Healthcare/Education) -> County -> Student Type ("I AM A...") -> Study Location (local/travel) -> Support Needs (wraparound/financial/work experience) -> AI chat
7. AI voice (OpenAI gpt-audio, nova voice) for onboarding narration and chat response TTS
8. Pre-generated audio files for onboarding steps (public/audio/)
9. POST /api/tts endpoint for dynamic text-to-speech
10. Zod schema validation on all admin POST/PATCH endpoints
11. SSE client disconnect handling to prevent server resource leaks
12. About Us page with mission, values, pathways, partners info
13. Admin settings page: multi-provider AI model selection (chat + profiling + research models)
14. In-memory knowledge base cache (5-min TTL) with invalidation on admin CRUD
15. Background student profiling (non-blocking, runs after response sent)
16. TTS audio prefetching for faster onboarding narration (caches next step's audio)
17. AI responses include clickable markdown links to program/institution/resource URLs
18. All 21 programs have direct URLs to their institution program pages
19. ReactMarkdown links open in new tabs with target="_blank"
20. Admin conversation viewer uses rich markdown formatting (bold, spacing, clickable links) matching student chat experience
21. Inline pathway creation from Research Tasks dialog (no need to navigate away)
22. Admin login with session-based auth (express-session + PostgreSQL session store)
23. Multi-provider AI: OpenAI, Anthropic, OpenRouter (DeepSeek, Qwen, Gemini, Llama, Grok, Mistral), Perplexity
24. Admin-configurable API keys with masked display
25. Separate research agent model selection with Perplexity Deep Research option
26. Token usage tracking (per request: model, provider, type, prompt/completion tokens, estimated cost)
27. Configurable daily and monthly token budgets with automatic enforcement
28. Token usage dashboard with cost estimates, progress bars, breakdowns by model and type

## Running
- `npm run dev` starts both frontend (Vite) and backend (Express) on port 5000
- `npx tsx server/seed.ts` seeds database with pathway data
