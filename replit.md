# North State Pathways - AI Career Chatbot Platform

## Overview
This project is an AI-powered chatbot platform designed for North State Pathways to guide prospective students through education and healthcare career pathways in Northern California. It features an immersive student-facing chat experience and a comprehensive backend admin dashboard for managing content, AI configurations, and monitoring interactions. The platform aims to connect students with relevant career opportunities, educational programs, and financial aid resources within the region, leveraging AI for personalized guidance and content generation.

## User Preferences
I prefer clear and concise information. I want the AI to provide detailed explanations when asked, but generally keep responses to the point. I appreciate an iterative development approach where I can review changes frequently. Please ask for my approval before implementing any major architectural changes or feature removals. I prefer to use functional programming paradigms where appropriate in the codebase. Do not make changes to the `shared/schema.ts` file without explicit approval.

## System Architecture
The platform is built with a modern web stack:
-   **Frontend**: React, Vite, TypeScript, TailwindCSS, and shadcn/ui for a responsive and accessible user interface.
-   **Backend**: Express.js with TypeScript for robust API services.
-   **Database**: PostgreSQL managed with Drizzle ORM for relational data storage.
-   **AI Integration**: Multi-provider support including OpenAI, Anthropic, and OpenRouter (for DeepSeek, Perplexity, etc.), with Replit AI Integrations as the default. This allows for flexible AI model selection and configuration via the admin panel.
-   **Authentication**: Session-based authentication using `express-session` and `connect-pg-simple` for secure admin access.
-   **Internationalization**: Custom React context for English and Spanish translations, with `i18n.ts` handling.
-   **Routing**: `wouter` for client-side routing and Express for API routing.
-   **UI/UX**: Features a forest green primary theme (152 45% 32%) with nature-inspired branding. The design incorporates a circuit board SVG background and decorative tree/mountain SVGs.
-   **Key Features**:
    -   RAG-style AI chat dynamically builds knowledge from the database.
    -   Streaming AI responses via Server-Sent Events (SSE).
    -   Automated student profiling to personalize recommendations.
    -   Support for 10 North State counties, with seeded data for pathways, institutions, and resources.
    -   Guided onboarding flow with AI voice narration (OpenAI gpt-audio) and pre-generated audio.
    -   Comprehensive admin dashboard for CRUD operations on pathways, programs, resources, institutions, contacts, assessment questions, and onboarding scripts.
    -   AI Research Agent utilizing web-connected Perplexity models via OpenRouter to identify new programs/resources/institutions, with human-in-the-loop approval for JSON action recommendations.
    -   Token usage tracking, cost estimation, and configurable budgets for AI interactions.
    -   Full Spanish/English language support across the platform, including AI responses and admin content management.
    -   Interactive Explore Map displaying institutions with programs.
    -   Database-driven, AI-scored career self-assessment quiz providing personalized career matches and insights.
    -   Algorithmic (non-AI) career scoring fallback: when AI is opted out, `computeScores()` in `client/src/lib/assessment-scoring.ts` runs client-side using a weighted matrix for all 56 careers (healthcare IDs 1–30, education IDs 31–56). Public endpoint `GET /api/assessment/careers?track=` added.
    -   Q&A summary panel on all assessment results (AI and non-AI): collapsible card showing every question + selected answer(s), with a Print Summary button that opens a print-friendly window. Available to share with counselors.
    -   HUMANS Principles section on the landing page, aligning with human-centered AI frameworks.
    -   Zod schema validation for API endpoints.
    -   In-memory knowledge base cache with TTL and invalidation.
    -   AI transparency indicator ("AI Active" badge with pulsing green dot) and opt-out toggle on chat and assessment pages.
    -   Human counselor fallback panel showing contact cards when AI is opted out.
    -   Contacts system (contacts table) for managing human counselor contact information.

## External Dependencies
-   **PostgreSQL**: Primary database.
-   **OpenAI API**: Used for AI chatbot, TTS, and AI-assisted content generation.
-   **Anthropic API**: Alternative AI provider for chatbot interactions.
-   **OpenRouter API**: Provides access to various AI models like DeepSeek, Perplexity, Qwen, Gemini, Llama, Grok, and Mistral.
-   **Perplexity AI**: Specifically used by the research agent for web-connected models (Sonar, Sonar Pro, Deep Research) via OpenRouter.
-   **Vite**: Frontend build tool.
-   **TanStack Query**: For data fetching and caching on the frontend.
-   **Drizzle ORM**: TypeScript ORM for database interaction.
-   **express-session**: Middleware for session management.
-   **connect-pg-simple**: PostgreSQL store for Express sessions.
-   **wouter**: Lightweight React router.
-   **shadcn/ui**: UI component library.