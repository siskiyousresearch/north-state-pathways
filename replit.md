# North State Pathways - AI Career Chatbot Platform

## Overview
An AI-powered chatbot platform for North State Pathways (northstatepathways.org) that guides prospective students through education and healthcare career pathways in Northern California. Features an immersive student-facing chat experience and backend admin dashboard.

## Architecture
- **Frontend**: React + Vite + TypeScript + TailwindCSS + shadcn/ui
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **AI**: OpenAI (via Replit AI Integrations, gpt-5-mini for chat, gpt-5-nano for profiling)
- **Routing**: wouter for frontend, Express for API

## Project Structure
```
client/src/
  pages/
    landing.tsx       - Public landing page with hero and features
    about.tsx         - About Us page with mission, values, pathways info
    chat.tsx          - Student-facing AI chat interface with streaming
    admin/
      layout.tsx      - Admin layout with sidebar
      dashboard.tsx   - Analytics overview
      conversations.tsx - Review student chat sessions
      pathways.tsx    - Manage career pathways and programs
      resources.tsx   - Manage scholarships/financial aid
      research.tsx    - AI research tasks with human-in-the-loop
  components/
    admin-sidebar.tsx - Admin navigation sidebar
    ui/              - shadcn/ui components
  lib/
    queryClient.ts   - TanStack Query configuration

server/
  index.ts          - Express server entry
  routes.ts         - All API endpoints
  storage.ts        - Database access layer (IStorage interface)
  db.ts             - Drizzle database connection
  seed.ts           - Database seed script
  vite.ts           - Vite dev server middleware

shared/
  schema.ts         - Drizzle schema + Zod types
```

## Key API Routes
- `POST /api/chat/sessions` - Create chat session
- `POST /api/chat/sessions/:id/messages` - Send message (SSE streaming response)
- `GET /api/admin/stats` - Dashboard analytics
- `GET /api/admin/sessions` - List all chat sessions
- `GET /api/admin/sessions/:id/messages` - Get session messages
- `GET/POST/PATCH/DELETE /api/admin/pathways` - Pathway CRUD
- `GET/POST/DELETE /api/admin/programs` - Program CRUD
- `GET/POST/DELETE /api/admin/resources` - Resource CRUD
- `GET/POST /api/admin/research` - Research task management
- `POST /api/admin/research/:id/run` - Execute AI research
- `POST /api/admin/research/:id/approve|reject` - Approve/reject findings

## Database Tables
- counties, institutions, pathways, programs, resources (knowledge base)
- chat_sessions, chat_messages (student interactions)
- research_tasks (AI research with human approval)

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
6. Guided onboarding flow: Pathway (Healthcare/Education) -> County -> Student Type ("I AM A...") -> AI chat
7. AI voice (OpenAI gpt-audio, nova voice) for onboarding narration and chat response TTS
8. Pre-generated audio files for onboarding steps (public/audio/)
9. POST /api/tts endpoint for dynamic text-to-speech
10. Zod schema validation on all admin POST/PATCH endpoints
11. SSE client disconnect handling to prevent server resource leaks
12. About Us page with mission, values, pathways, partners info

## Running
- `npm run dev` starts both frontend (Vite) and backend (Express) on port 5000
- `npx tsx server/seed.ts` seeds database with pathway data
