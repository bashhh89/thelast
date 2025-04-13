# Qandu Platform Implementation Progress

Based on the roadmap defined in the initial plan.

## Guiding Principle

**Synergy over Silos:** Focus on features that integrate intelligently and synergistically, creating a cohesive and powerful workflow, rather than just adding standalone cool features.

## Phase 0: Foundation & Setup (Weeks 1-2) - COMPLETE ✅

- [x] **1. Project Initialization**
  - [x] Create Next.js 14 project (`create-next-app`)
  - [x] Initialize Git repository
  - [x] Install core dependencies (`tailwindcss`, `zustand`, `@supabase/ssr`, `@supabase/supabase-js`, `shadcn-ui`, `next-themes`, `react-markdown`, `react-syntax-highlighter`)
  - [x] Configure Tailwind CSS (`tailwind.config.ts`, `globals.css`)
  - [x] Set up `shadcn/ui` CLI and initialize basic components (`button`, `card`, `input`)
- [x] **2. Folder Structure Setup**
  - [x] Create feature-based directory structure (`src/features/`, `src/shared/`, `src/core/`, `src/app/`)
  - [x] Configure TypeScript path aliases (`tsconfig.json`)
- [x] **3. Supabase Backend Setup**
  - [x] Create Supabase project (Manual)
  - [x] Define core database schema using Supabase migrations (`profiles`, `workspaces`, `chat_sessions`, `messages`)
  - [x] Enable Supabase Auth (Email/Password) (Manual - *Assumed complete*)
  - [x] Set up Row Level Security (RLS) policies (basic)
  - [x] Configure database trigger (auto-create profile)
  - [x] Configure `.env.local` with Supabase keys
  - [x] Install Supabase CLI & Link Project
  - [x] Apply initial migration (`db push`)
- [x] **4. Core Frontend Setup**
  - [x] Implement basic app layout (`src/app/layout.tsx`)
  - [x] Create shared layout components (`Header`, `Sidebar` placeholders)
  - [x] Set up theme provider (`next-themes`)
  - [x] Implement Zustand root store structure (`src/core/store/index.ts`)
  - [x] Set up Supabase client helpers (`client.ts`, `server.ts`, `middleware.ts`)
  - [x] Generate Supabase types (`database.types.ts`)
  - [x] Set up Next.js middleware (`src/middleware.ts`)

## Phase 1: Core User Experience & Foundational Features (Weeks 3-6) - COMPLETE ✅

- [x] **1. Authentication Flow**
  - [x] Create Auth feature module (`src/features/auth/`)
  - [x] Build Login, Registration UI components (`login-form.tsx`, `register-form.tsx`)
  - [x] Implement client-side auth logic (`/login/page.tsx`, `/register/page.tsx`)
  - [x] Create `useAuthStore` (Zustand slice) (`auth-store.ts`)
  - [x] Implement protected routes using middleware (`middleware.ts`, `core/supabase/middleware.ts`)
  - [x] Implement Logout functionality (`/page.tsx`)
- [x] **2. Basic Workspace Management**
  - [x] Create Workspace feature module (`src/features/workspaces/`)
  - [x] Define Workspace types (`types/index.ts`)
  - [x] Create Workspace API service (`api/workspace-service.ts`)
  - [x] Build UI components (`CreateWorkspaceDialog`, `WorkspaceList`)
  - [x] Implement `useWorkspaceStore` (Zustand slice) (`store/workspace-store.ts`)
  - [x] Integrate workspace list/creation into Sidebar
  - [x] Integrate Sidebar/Header into main layout (`app/layout.tsx`)
  - [x] Ensure selected workspace context is available (*partially done via store, needs UI integration*)
- [x] **3. Core Chat Interface & Basic Markdown**
  - [x] Create Chat feature module (`src/features/chat/`)
  - [x] Define Chat types (`types/index.ts`)
  - [x] Create Chat API service (`api/chat-service.ts`)
  - [x] Build core UI (`ChatInterface`, `MessageList`, `ChatInputArea`, `MessageItem`)
  - [x] Connect UI to Supabase (fetch/create sessions in Sidebar, fetch/create messages in ChatInterface)
  - [x] Implement basic markdown rendering (`react-markdown` in `MessageItem`)
  - [x] Create `useChatSessionStore` (`store/chat-session-store.ts`)
  - [ ] Implement full `useChatStore` (*Deferred - current implementation uses local state in ChatInterface*)

## Phase 2: AI Integration & Feature Enhancement (Weeks 7-10) - COMPLETE ✅

- [x] **1. Pollinations API & Model Management Setup**
  - [x] Created API route for text generation (`src/app/api/generate/text/route.ts`)
  - [ ] Securely manage Pollinations API key (*Deferred - API call currently inactive*)
  - [x] Build `useModelStore` (Zustand slice) (`src/core/store/model-store.ts`)
  - [x] Create a basic model selection UI (`ModelSelector`) & integrate into Chat UI
- [x] **2. AI Generation Integration**
  - [-] Integrate Pollinations Text generation into Chat (*non-streaming - Currently inactive, placeholder used due to API issues*)
  - [ ] Implement streaming responses for text generation (*deferred*)
  - [x] Add UI elements for Image & Audio generation
  - [x] Implement display components for generated images/audio
- [x] **3. Enhanced Markdown ("Sexy" Markdown - Stage 1)**
  - [x] Choose and configure advanced markdown library/plugins (`remark-gfm`, `react-syntax-highlighter`)
  - [x] Implement beautiful table rendering (Basic via `remark-gfm` + custom components)
  - [x] Add code block syntax highlighting (`react-syntax-highlighter`)
  - [x] Create custom renderers/styles (Basic for tables)

## Phase 3: Admin Dashboard & Advanced Features (Weeks 11-14) - IN PROGRESS ⏳

- [x] **1. Admin Dashboard - Foundation**
  - [x] Create Admin feature module (`src/features/admin/`)
  - [x] Add `is_admin` column to `profiles` table & regenerate types
  - [x] Set up admin-only routing (via middleware)
  - [x] Create basic Admin layout (`/admin/layout.tsx`)
  - [x] Create Admin dashboard page (`/admin/page.tsx`)
  - [x] Implement User Management UI (Basic List) (`/admin/users/page.tsx`)
  - [x] Build initial Endpoint Management UI (Read-Only) (`/admin/endpoints/page.tsx`)
- [ ] **2. Project Management Module**
  - [x] Create Project feature module (`src/features/projects/`)
  - [x] Implement basic Project CRUD UI and connect to Supabase
  - [x] Link projects to workspaces
  - [x] Allow associating chat sessions with projects (DB schema, API, Store, UI)
  - [ ] Allow associating other content items with projects
- [ ] **3. Content Generation Suite - Foundation**
  - [ ] Create Content Generation feature module (`src/features/content-generation/`)
  - [ ] Build a basic UI for selecting content types and providing input
  - [ ] Integrate Pollinations Text/Image generation APIs
  - [ ] Display and allow basic editing/saving of generated content

## Phase 4: Polish, Remaining Features & Deployment Prep (Weeks 15+)

- [ ] **1. Presentation Module**
- [ ] **2. Enhanced Markdown ("Sexy" Markdown - Stage 2)**
- [ ] **3. Complete Admin Dashboard**
- [ ] **4. CRM, Search, Website Builder (Optional)**
- [ ] **5. UX & Performance Polish**
  - [x] Add Sidebar Toggle functionality
  - [x] Reposition Model Selector in Chat UI
  - [ ] Further review and refine overall user experience
- [ ] **6. Deployment**

## Future Considerations / Potential Enhancements

- [ ] **Kanban Boards:** Implement Kanban-style boards for task or project management within workspaces.
- [ ] **Proactive AI Suggestions:** Have the AI proactively offer relevant actions based on context (e.g., "Summarize this conversation?", "Generate task list from notes?", "Find related projects?").
- [ ] **Custom Knowledge Bases ("Chat with your Docs"):** Allow users or teams to upload documents (PDFs, DOCX, etc.) that the AI can reference to provide contextual answers based on private data.
- [ ] **AI Workflow Builder:** Create a visual or text-based interface for users to chain multiple AI steps/prompts together into reusable workflows (e.g., Research Topic -> Draft Outline -> Write Section 1 -> Summarize).
- [ ] **AI Data Analysis:** Integrate capabilities for the AI to analyze data within tables (e.g., "What are the key trends in this sales data?") or uploaded spreadsheets.
- [ ] **Multi-modal Input/Output:** Allow users to combine text, images, and potentially audio within a single prompt for more complex AI interactions.
- [ ] **AI Meeting Assistant:** Integrate with calendar services to have AI join meetings, take notes, generate summaries, and identify action items.
- [ ] **Personal Prompt Library:** Allow users to save, organize, and reuse their favorite prompts or prompt chains.

# Qandu Project Progress & Roadmap

## Core Features Implemented
- User Authentication (Supabase Auth)
- Workspaces (CRUD)
- Projects (CRUD)
- Chat Sessions (CRUD, basic linking to workspaces/projects)
- Basic Chat Interface (Messages, Input)
- Model Selection UI (Basic)
- Web Search Toggle (Switches to 'searchgpt' model)
- Git Repository Setup on GitHub

## Current Issues & Next Steps
- [ ] **Chat Interface Polish (Circle Back):**
  - [ ] Fix input auto-focus after AI response.
  - [ ] Investigate potential minor formatting differences between models.
- [x] **Implement Rename/Delete Functionality:**
  - [x] Add UI/Logic for renaming/deleting Chats in sidebar.
  - [x] Add UI/Logic for renaming/deleting Workspaces in sidebar.
  - [x] Add UI/Logic for renaming/deleting Projects in sidebar.
  - [x] Create corresponding API endpoints and DB logic.
- [x] **Finalize RLS Policies:** Test and refine Row Level Security policies.
- [ ] **UI/UX Polish:** Address general layout inconsistencies, loading states, error handling.
- [ ] **Implement Workspace Memberships:** Add invites, roles, and proper sharing logic.
- [ ] **Email Hub Feature:** Implement the detailed spec below.

## Planned Features / Roadmap

### Feature: AI Personas / Agents
**Goal:** Allow users to create, manage, and use custom AI personas with specific instructions and potentially knowledge bases.
**Key Capabilities:**
  - [x] Define Persona database schema (`personas` table).
  - [x] Basic RLS policies for Personas.
  - [x] Basic Persona management UI (`/personas` page, list, create dialog placeholder).
  - [x] Basic API/Service/Store structure for Personas.
  - [ ] Implement full Persona CRUD (Create, Update, Delete) logic.
  - [ ] Integrate Persona selection into Chat Interface.
  - [ ] Implement Knowledge Base connection (Future).
  - [ ] Generate embeddable chat widget (Future).
  - [ ] Link chat initiation to Kanban card creation (Future).

### Feature: AI-Powered Email Hub within Qandu

**Goal:** Allow users to connect their existing email accounts (Gmail, Outlook, etc.) to Qandu, manage emails directly within the platform, and leverage AI for various email-related tasks.

**Key Capabilities:**

*   **Unified Inbox:**
    *   Connect multiple email accounts.
    *   View emails from all connected accounts in a single, integrated inbox within Qandu.
    *   Standard email client features: Read, Compose, Reply, Forward, Archive, Delete, Mark as Read/Unread, Folders/Labels.
*   **AI Email Summarization:**
    *   Get concise AI-generated summaries of long emails or entire threads with one click.
    *   Extract key points and action items automatically.
*   **AI Draft Assistance:**
    *   Draft email replies based on simple instructions (e.g., "Draft a polite refusal," "Write a follow-up asking for clarification").
    *   Generate email outlines based on bullet points.
    *   Improve email tone, clarity, and grammar using AI suggestions.
*   **AI Email Triage & Prioritization:**
    *   AI automatically categorizes incoming emails (e.g., Urgent, Requires Action, Information, Spam).
    *   AI suggests prioritization based on sender, keywords, or user-defined rules.
    *   "Focus Inbox" mode showing only AI-identified important emails.
*   **Email-to-Task/Project Integration:**
    *   Convert emails or specific text within emails directly into tasks within a Qandu project or Kanban board.
    *   Link email threads to relevant projects or workspaces for context.
    *   AI suggests which project an email might belong to.
*   **Natural Language Email Search:**
    *   Search through emails using natural language queries (e.g., "find the email from John about the Q3 budget last month").
*   **Automated Follow-ups (Advanced):**
    *   AI suggests or even drafts follow-up emails if no reply is received after a certain period.

**Implementation Considerations:**

*   **Authentication:** Requires secure OAuth 2.0 integration with email providers (Google, Microsoft) to get user permission to access their mailboxes. This is a significant security undertaking.
*   **API Integration:** Needs integration with Gmail API, Microsoft Graph API, etc., respecting their rate limits and usage policies.
*   **UI/UX:** Designing an intuitive email client within the existing Qandu interface requires careful thought to avoid clutter. How does it relate to the chat, workspaces, etc.?
*   **Privacy & Security:** Handling user emails requires robust security measures, encryption, and clear privacy policies. Users need to trust the platform implicitly.
*   **Storage:** Decide whether to sync/store email content or fetch it on demand.

## [Current Date - e.g., YYYY-MM-DD] - Focus Debugging & Search Response Fix

- Investigated input focus issue after AI response completes.
- Added detailed logging (`[Focus Effect]`) to the `useEffect` hook in `ChatInputArea.tsx` to trace focus logic execution.
- Analyzed console logs provided by the user, confirming the focus logic fires correctly (`Timer fired, calling focus()`).
- Identified issue where responses from `searchgpt` model were not appearing in the UI despite successful API calls.
- Diagnosed the cause: `ChatInterface.tsx` was expecting SSE format for all models, but `searchgpt` returns plain text.
- Modified the stream processing loop in `ChatInterface.tsx` (`handleSendMessage`) to conditionally handle plain text for `searchgpt` and SSE for other models.
- Confirmed by user that the fix resolved the missing search responses.
