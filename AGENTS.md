# teachflow

Next.js 16 AI-powered learning platform.

## Commands

```bash
npm run dev     # :3000
npm run build
npm run start
npm run lint    # ESLint (next/core-web-vitals + typescript)
npm run test    # vitest run (unit tests for lib/)
npm run test:watch   # vitest watch mode
npm run test:coverage # vitest with coverage
npm run test:e2e   # Playwright E2E
npm run test:e2e:ui   # Playwright UI mode

# Supabase (local Docker)
npx supabase start
npx supabase stop
npx supabase db reset
npx supabase migration up
```

## Stack

- **Next.js 16.2.9** (App Router, React 19.2.4), **Tailwind CSS 4** (`@tailwindcss/postcss`)
- **Supabase** — auth + DB (`@supabase/ssr ^0.12.0`, `@supabase/supabase-js ^2.108.2`); local Docker (API 54321, DB 54322, Studio 54323)
- **OpenAI SDK** → `agnes-2.0-flash` (default; overridable via `OPENAI_MODEL`); base URL defaults to `https://api.openai.com/v1`, overridable via `OPENAI_BASE_URL`
- **Tavily** — optional web search tool (`TAVILY_API_KEY`)
- **Zod** ^4.4.3, **TypeScript** strict, `@/*` → project root

## Architecture

| Path | Purpose |
|---|---|
| `proxy.ts` | Next.js 16 Proxy (replaces `middleware.ts`); Supabase auth redirect — unauthenticated users routed to `/login` (exempts `/login`, `/signup`, `/reset-password`, `/update-password`, `/_next`) |
| `app/(auth)/` | Login, signup, reset-password, update-password |
| `app/(dashboard)/` | Workspace list, workspace detail (chat, roadmap, resources), settings |
| `app/(dashboard)/settings/` | Language preference + theme toggle UI (GET/PUT `/api/settings`) |
| `app/api/chat/route.ts` | SSE streaming chat; two-phase: phase1 non-streaming (web search tool call), phase2 streaming (response). Parses `:::` blocks via `lib/blocks.ts` → Supabase upsert |
| `app/api/workspaces/route.ts` | GET (list), POST (create) workspaces |
| `app/api/workspaces/[id]/route.ts` | DELETE workspace by id (cascading) |
| `app/api/workspaces/[id]/messages/route.ts` | GET (paginated history), DELETE (by messageIds) |
| `app/api/workspaces/[id]/roadmap/route.ts` | GET roadmap, PATCH step status |
| `app/api/lessons/[id]/versions/route.ts` | GET lesson version history |
| `app/api/resources/[id]/route.ts` | DELETE resource (lesson/reference/learning_record by type+id) |
| `app/api/settings/route.ts` | GET/PUT user language preference (`user_settings` table) |
| `lib/blocks.ts` | `slugify`, `stripHtml`, `stripAIWrapper`, `parseBlocks` — extracts `:::lesson`/`:::reference`/`:::record`/`:::roadmap` blocks; supports legacy `[/lesson]` close tags; auto-detects bare HTML as "Untitled Lesson" |
| `lib/chat-stream.ts` | Client-side SSE streaming with error handling (429 rate limit, safety filter, network errors, abort) |
| `lib/chat-stream-store.ts` | In-memory pub/sub store per workspaceId (30min TTL eviction, `useSyncExternalStore`-compatible) |
| `lib/context.ts` | Token-budgeted context builder (default 24K chars/~6857 tokens); builds state block + conversation summary + message history (newest-first truncation) |
| `lib/env.ts` | Zod env validation at startup (client: `NEXT_PUBLIC_SUPABASE_*`, server: `OPENAI_API_KEY`, optional `OPENAI_BASE_URL`/`TAVILY_API_KEY`) |
| `lib/eval-response.ts` | Offline validation of AI response structure (HTML, CSS classes, roadmap JSON, record format) |
| `lib/logger.ts` | Structured JSON logging for LLM calls, responses, stream chunks, block saves |
| `lib/openai.ts` | OpenAI client + `TEACH_SYSTEM_PROMPT` (119-line system prompt defining teacher personality, `:::` block rules, teaching sequence, web search) |
| `lib/quiz-inject.ts` | Injects JS into lesson HTML for interactive quiz behavior (click-to-reveal) |
| `lib/rate-limit.ts` | **In-memory** per-user (20 req/min, 60s window, max 10K entries with LRU eviction). Lost on serverless restart. |
| `lib/shared-styles.ts` | Shared CSS stylesheet + `injectSharedStyles()` (injects into head/html/body/bare HTML) + `stripInlineStyles()` |
| `lib/supabase-browser.ts` | Singleton browser-side Supabase client |
| `lib/supabase-server.ts` | SSR Supabase client with cookie handling (supports optional Request passthrough for API routes) |
| `lib/types.ts` | TypeScript types: `Resource`, `ResourceType`, `Workspace`, `Attachment`, `Message`, `Roadmap`, `RoadmapStep`, `RoadmapStepStatus` |
| `lib/web-search.ts` | Tavily API client (5 results, basic depth, includes answer) + `WEB_SEARCH_TOOL` function definition |
| `hooks/use-chat-stream.ts` | React hook wrapping chat stream store via `useSyncExternalStore` |
| `components/` | Auth (sign-out-button), Chat (message-list, message-input, chat-message), Resources (resource-card, resource-gallery), Roadmap (roadmap-view), Workspace (workspace-list, workspace-tabs, confirm-dialog), Layout (dashboard-header, user-menu), Theme Toggle, Error Boundary, IFrame Preview, Confirm Dialog |

## Key Conventions

- AI responses use `:::` blocks, **not** XML tags. Always close with `:::`.
- Block types: `:::lesson[Title]`, `:::reference[Title]`, `:::reference[Title]`, `:::record[Title]`, `:::roadmap[Title]`.
- Lessons are standalone HTML with inline CSS. One concept per lesson. Quiz options use `data-correct="true"` or `data-correct="false"`.
- Roadmaps are JSON with `goal` and `steps` array (each step has `order`, `title`, `description`, `status`).
- Supabase tables: `workspaces`, `lessons`, `references_doc`, `learning_records`, `chat_messages`, `roadmaps`, `lesson_versions`, `user_settings`
- RLS enabled on all tables; users can only access their own data via workspace ownership
- CSP header in `next.config.ts` — update if adding external scripts/styles. Current allowed: `connect-src 'self' https://apihub.agnes-ai.com https://api.tavily.com http://localhost:54321 ws://localhost:54321`
- `.env*` gitignored; copy `.env.example` for required vars
- Chat route uses two-phase LLM call: phase1 non-streaming with tool calling (web search), phase2 streaming for response generation
- Summary generation every 25 messages via separate LLM call
- `docs/` directory contains architecture explainers and compose/autonomous-loop-state.json
