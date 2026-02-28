# North State Pathways - AI Career Chatbot Platform

## Overview
An AI-powered chatbot platform for North State Pathways (northstatepathways.org) that guides prospective students through education and healthcare career pathways in Northern California. Features an immersive student-facing chat experience and backend admin dashboard.

## Architecture
- **Frontend**: React + Vite + TypeScript + TailwindCSS + shadcn/ui
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **AI**: Multi-provider support (OpenAI, Anthropic, OpenRouter/DeepSeek/Perplexity) with Replit AI Integrations as default
- **Auth**: Session-based admin authentication (express-session + connect-pg-simple)
- **i18n**: Custom React context with EN/ES translations (`client/src/lib/i18n.ts`)
- **Routing**: wouter for frontend, Express for API

## Project Structure
```
client/src/
  pages/
    landing.tsx       - Public landing page with hero and features
    about.tsx         - About Us page with mission, values, pathways info
    chat.tsx          - Student-facing AI chat interface with streaming
    admin/
      login.tsx       - Admin login page (with password reveal toggle)
      layout.tsx      - Admin layout with sidebar + auth gate
      dashboard.tsx   - Analytics overview
      conversations.tsx - Review student chat sessions (rich markdown)
      pathways.tsx    - Manage career pathways and programs
      resources.tsx   - Manage scholarships/financial aid
      research.tsx    - AI research tasks with human-in-the-loop
      settings.tsx    - AI model selection, API keys, research model config
      onboarding-scripts.tsx - Onboarding narration scripts (In Development)
      explore-map.tsx - Explore Map admin page (In Development)
      self-assessment.tsx - Self-Assessment admin page (In Development)
    assessment.tsx      - Career self-assessment quiz (Healthcare/Education tracks)
  components/
    admin-sidebar.tsx - Admin navigation sidebar (collapsible "In Development" section)
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
- `GET/POST/PATCH/DELETE /api/admin/onboarding-scripts` - Onboarding script CRUD (auth required)
- `POST /api/admin/onboarding-scripts/:id/upload-audio` - Upload recorded audio (auth required)
- `POST /api/admin/onboarding-scripts/:id/generate-audio` - Generate TTS audio (auth required)
- `POST /api/admin/onboarding-scripts/auto-generate` - AI-generate script text (auth required)
- `GET /api/onboarding-scripts?pathwayId=N` - Public: fetch scripts for a pathway
- `POST /api/assessment/results` - Career quiz program matching (public)

## Database Tables
- counties, institutions, pathways, programs, resources (knowledge base)
- onboarding_scripts (editable narration scripts per pathway/step with audio URLs)
- chat_sessions, chat_messages (student interactions)
- assessment_questions, assessment_options, assessment_careers (admin-editable self-assessment quiz)
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
25. Research agent uses web-connected Perplexity models only (Sonar, Sonar Pro, Deep Research) via OpenRouter — searches the internet for new programs/resources
26. Token usage tracking (per request: model, provider, type, prompt/completion tokens, estimated cost)
27. Configurable daily and monthly token budgets with automatic enforcement
28. Token usage dashboard with cost estimates, progress bars, breakdowns by model and type
29. County-specific research tasks with dropdown for 10 North State counties
30. Research agent produces structured output with JSON action recommendations (programs/resources to add)
31. Actionable recommendation cards from research results — one-click "Add Program" / "Add Resource" buttons
32. Resources support multi-county and multi-pathway selection via checkbox UI
33. Resources schema: `counties` (text array) and `pathwayIds` (integer array) for multi-selection
34. Research tasks schema: `county` field for scoping research to specific counties
35. Admin Onboarding Scripts page: edit narration scripts per pathway/step, record voice audio via browser microphone, or generate with AI TTS
36. Database-backed onboarding scripts with fallback to static audio files
37. `onboarding_scripts` table: pathway_id, step, context_key, title, script_text, audio_url, image_url
38. Audio recording uses browser MediaRecorder API, files saved to public/audio/onboarding/custom/
39. AI script auto-generation using GPT-4o Mini for creating initial narration text
40. Full Spanish/English language support: EN/ES toggle on landing, about, and chat pages
41. `client/src/lib/i18n.ts`: 130+ translation keys, `useLanguage()` hook, localStorage persistence ("nsp-language")
42. `onboarding_scripts` table has `language` column (default "en"); 40 English + 40 Spanish scripts seeded
43. Spanish TTS audio files in `public/audio/onboarding/es/` (generated via gpt-audio model)
44. Spanish system prompt (`SYSTEM_PROMPT_SPANISH`) for AI chatbot responses in Spanish
45. Admin Onboarding Scripts page: EN/ES filter tabs for managing scripts by language
46. Chat messages accept `language` field to select Spanish AI responses
47. Interactive Explore Map page (`/explore`) with AI-generated artistic illustration of North State CA
48. Map markers for all 14 institutions with hover/click info cards showing programs
49. Pathway filter (All/Healthcare/Education) on map sidebar
50. Mobile-responsive: bottom card overlay on small screens, sidebar on desktop
51. `GET /api/map/institutions` public endpoint returns institutions with programs and pathway data
52. `client/src/lib/map-data.ts` defines institution/county positions on the illustrated map
53. Career Self-Assessment quiz at `/assessment` — fully database-driven, admin-editable
54. `assessment_questions` table: track, category, bilingual question text, GIF URL, multi-select flag, sort_order, is_active
55. `assessment_options` table: question_id (FK cascade), value slug, bilingual labels, sort_order
56. `assessment_careers` table: track, bilingual name/description/salary/education/outlook
57. AI-driven career scoring: GPT-4o-mini analyzes student answers + career descriptions (no hardcoded weight matrices)
58. `POST /api/assessment/results` returns top 3 AI-scored career matches with matchPercent, salary, education, outlook, plus personalized AI insight
59. `GET /api/assessment/questions?track=X` — public endpoint for fetching active quiz questions with options
60. Admin Self-Assessment page: Questions tab (CRUD with inline edit, reorder, active toggle) + Careers tab (CRUD with bilingual fields)
61. AI Assist buttons: generate new questions/careers, improve existing question text, suggest GIF search terms
62. `POST /api/admin/assessment/ai-assist` — AI generation endpoint for questions, careers, and GIF suggestions
63. Admin CRUD routes: `GET/POST/PATCH/DELETE /api/admin/assessment/questions` and `/api/admin/assessment/careers`
64. 16 questions (8 healthcare + 8 education) with 58 options and 56 careers (30 HC + 26 ED) seeded from `server/seed-assessment.ts`
65. Career match cards with rank icons (Trophy/Award/Medal), salary/education/outlook info blocks, and percentage badges

## Running
- `npm run dev` starts both frontend (Vite) and backend (Express) on port 5000
- `npx tsx server/seed.ts` seeds database with pathway data
