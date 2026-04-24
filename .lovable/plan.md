

# ETHINX Unified SaaS Platform -- Stitching Plan

## What Each Project Does

| # | Project | Purpose | Type |
|---|---------|---------|------|
| 1 | **ETHINX Admin Command Center** | Admin dashboard: clients, deployments, agents, workflows, revenue, content engine, support tickets | Admin panel (Supabase-backed) |
| 2 | **ETHINX Launchpad** | Public marketing/landing page: products, pricing, how it works, results, partners | Marketing site |
| 3 | **Creator Blueprint V1** | 8-week creator curriculum dashboard with progress tracking, video lessons, worksheets | Member dashboard |
| 4 | **Video Velocity** | Sales/order page for video production services: offer, process, order form, FAQ | Sales funnel |
| 5 | **ETHINX Showcase** | Case studies, results wall, partner logos, activity feed -- social proof page | Portfolio/showcase |
| 6 | **Creator OS Launchpad** | Audit questionnaire for creators (archetype assessment) | Onboarding funnel |
| 7 | **Neon Studio** | AI video generation tool with form, generating state, output preview + pricing | SaaS tool |
| 8 | **ETHINX Partner Program** | Partner program landing page: tiers, revenue calculator, application form | Partner recruitment |
| 9 | **Creator Growth Hub** | Full member dashboard: curriculum, ad engine, email templates, community, support | Member portal |

## Architecture: How They Fit Together

```text
                        ETHINX Platform
                             |
         ┌───────────────────┼───────────────────┐
         |                   |                   |
    PUBLIC PAGES        MEMBER AREA         ADMIN AREA
    (no auth)          (auth required)     (admin auth)
         |                   |                   |
  ┌──────┴──────┐    ┌──────┴──────┐    ┌──────┴──────┐
  | Launchpad   |    | Growth Hub  |    | Command     |
  | Showcase    |    | Blueprint   |    | Center      |
  | Partner Pgm |    | Neon Studio |    | (all admin  |
  | Video Vel.  |    | Creator OS  |    |  pages)     |
  └─────────────┘    | (onboard)   |    └─────────────┘
                     └─────────────┘
```

## User Flow

1. **Visitor lands on `/`** -- ETHINX Launchpad (main marketing page)
2. **Explores public pages** -- `/showcase`, `/partners`, `/video-velocity`
3. **Takes the audit** -- `/onboarding` (Creator OS questionnaire)
4. **Signs up / logs in** -- `/login`, `/signup`
5. **Enters member area** -- `/dashboard` (Creator Growth Hub as main dashboard)
6. **Accesses tools** -- `/dashboard/curriculum` (Blueprint), `/dashboard/studio` (Neon Studio)
7. **Admin users** -- `/admin/*` (Command Center with full sidebar)

## Implementation Plan

### Phase 1: Foundation (this session)
Set up the unified app shell with routing, shared auth, and theme provider.

- **Unified App.tsx** with all route groups (public, member, admin)
- **Shared AuthProvider** and ProtectedRoute (adapted from Admin Command Center)
- **Shared ThemeProvider** with dark/light toggle
- **Shared layout components**: public Navbar, member DashboardLayout, AdminLayout

### Phase 2: Public Pages
Copy and adapt components from the 4 public-facing projects.

- **`/`** -- ETHINX Launchpad (hero, products, pricing, results, partners)
- **`/showcase`** -- ETHINX Showcase (case studies, results wall, activity feed)
- **`/partners`** -- ETHINX Partner Program (tiers, calculator, application form)
- **`/video-velocity`** -- Video Velocity (offer, order form, FAQ)

Each gets its own page file importing its original components, namespaced under folders (e.g. `src/components/launchpad/`, `src/components/showcase/`).

### Phase 3: Onboarding + Auth
- **`/onboarding`** -- Creator OS audit questionnaire (public, leads to signup)
- **`/login`**, **`/signup`**, **`/forgot-password`**, **`/reset-password`** -- Unified auth pages
- Supabase integration for auth + archetype_results storage

### Phase 4: Member workspace — Offer + Distribution Engine ✅ shell complete
The member area is the real SaaS product (manual-first, AI-second), NOT a port of Growth Hub/Blueprint/Neon Studio.

- **`/dashboard`** — Workspace overview (stats, shortcuts, empty state)
- **`/engines`** — List of available engines (Offer Engine live, others "soon")
- **`/engines/offer`** — Offer Engine: structured form + live preview + save-as-asset
- **`/assets`** — AssetTable of all saved offers/posts (empty until persistence lands)
- **`/distribution`** — Distribution planner (empty until persistence lands)
- **`/settings`** — Profile, theme, sign out

Reusable primitives in `src/components/engine/`: EngineLayout, FormSection, PreviewCard, AssetTable, StatusBadge.
Retired stitch pages (Curriculum, Studio, AdEngine, Templates, Community, member Support) — removed.

### Phase 5: Admin Panel
- **`/admin`** -- Command Board
- **`/admin/clients`**, **`/admin/deployments`**, **`/admin/agents`**, **`/admin/workflows`**, **`/admin/revenue`**, **`/admin/content`**, **`/admin/support`**, **`/admin/settings`**
- AdminLayout with sidebar navigation (already built in Command Center)

### Phase 6: Supabase + Wiring
- Connect Lovable Cloud Supabase for database (tables from Admin Command Center schema)
- Wire up real data flows: questionnaire results, client management, support tickets, checkout/payments
- Role-based access (admin vs member) using a `user_roles` table

## Technical Details

- **Component namespacing**: Each project's components go into `src/components/{module}/` to avoid naming collisions (e.g. multiple HeroSections become `launchpad/HeroSection`, `showcase/HeroSection`, etc.)
- **Shared UI**: The `src/components/ui/` folder (shadcn) is already in this project and shared across all modules
- **Assets**: Images/fonts from each project will be copied via `cross_project--copy_project_asset`
- **Supabase types**: Merged from the Admin Command Center's 1100-line types file as the starting schema
- **Dependencies**: Some projects use `framer-motion`, `recharts`, `date-fns` -- these will be installed once in the unified project

## Execution Approach

Due to size, this will be built incrementally across multiple sessions. Phase 1 (foundation + routing shell) will be built first. Each subsequent phase copies components from the source projects, adapts imports, and wires them into the unified router.

