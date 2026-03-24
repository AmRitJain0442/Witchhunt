# Web App Map

Next.js App Router · TailwindCSS v4 · React Query + Axios · Firebase Auth

---

## Routing Structure

```
web/src/app/
├── layout.tsx           # Root layout — provider stack
├── page.tsx             # Landing page (public)
├── globals.css          # TailwindCSS v4 design tokens
├── auth/
│   └── page.tsx         # Login / register (public)
├── dashboard/
│   ├── layout.tsx       # AppShell wrapper
│   └── page.tsx         # Dashboard overview (protected)
├── checkin/
│   ├── layout.tsx       # AppShell wrapper
│   └── page.tsx         # Daily check-in form (protected)
├── medicines/
│   ├── layout.tsx       # AppShell wrapper
│   └── page.tsx         # Medicine cabinet (protected)
├── health/
│   ├── layout.tsx       # AppShell wrapper
│   └── page.tsx         # Organ health scores (protected)
├── ai/
│   ├── layout.tsx       # AppShell wrapper
│   └── page.tsx         # Kutumb AI chat (protected)
├── family/
│   ├── layout.tsx       # AppShell wrapper
│   └── page.tsx         # Family member management (protected)
└── lab-reports/
    ├── layout.tsx       # AppShell wrapper
    └── page.tsx         # Lab report upload + list (protected)
```

**Auth enforcement**: Client-side only in `AppShell`. No RSC/middleware auth checks.

---

## Provider Stack — Root Layout (`src/app/layout.tsx`)

```
ThemeProvider (next-themes, attribute="class", defaultTheme="system", disableTransitionOnChange=false)
  └── ReactQueryProvider (staleTime=60_000ms, retry=1)
        └── AuthProvider (Firebase onAuthStateChanged)
              └── {children}
```

- Fonts: Geist + Geist_Mono loaded via `next/font/google`, exposed as `--font-geist` / `--font-mono`
- `suppressHydrationWarning` on `<html>` for theme toggling
- `lang="en"` — no i18n
- Page title: `"Kutumb — Family Health"`

---

## Library Layer (`src/lib/`)

### `firebase.ts`
- Singleton Firebase app (guarded with `getApps().length === 0`)
- Only initialises `getAuth(app)` — no Firestore, no Storage (backend owns those)
- Config from 6 `NEXT_PUBLIC_FIREBASE_*` env vars

### `auth-context.tsx`
Two state objects:
- `user: FirebaseUser | null` — raw Firebase auth state
- `appUser: AppUser | null` — backend-enriched profile (uid, name, email, date_of_birth, family_count, active_medicine_count)

Auth lifecycle:
1. `onAuthStateChanged` fires → if `fbUser` exists, calls `userApi.me()` to populate `appUser`
2. `signIn(email, pw)`: `signInWithEmailAndPassword` → `getIdToken()` → `authApi.login(token)` → sets `appUser` from response
3. `signUp(email, pw, name)`: `createUserWithEmailAndPassword` → `updateProfile({ displayName: name })` → `getIdToken(true)` → `authApi.register(token)` → sets `appUser`
4. `signOut()`: `authApi.logout()` (fire-and-forget) → `fbSignOut(auth)` → clears state

Exposes via `useAuth()`: `user`, `appUser`, `loading`, `signIn`, `signUp`, `signOut`, `refreshAppUser`

### `api.ts`
Single Axios instance:
- Base URL: `NEXT_PUBLIC_API_URL` (default `http://localhost:8000/api/v1`)
- Timeout: 30s
- Request interceptor: `auth.currentUser.getIdToken()` → `Authorization: Bearer <token>`
- Response interceptor: extracts `err.response?.data?.detail` as error message string

API surface (all return `r.data`):

| Module | Methods |
|--------|---------|
| `authApi` | `register(idToken)`, `login(idToken)`, `logout()` |
| `userApi` | `me()`, `update(data)` |
| `healthApi` | `scores()`, `history(days=30)` |
| `checkinApi` | `today()`, `list(params?)`, `create(data)`, `update(id, data)` |
| `medicineApi` | `today()`, `list()`, `create(data)`, `logDose(id, action, time)`, `adherence()` |
| `familyApi` | `list()`, `add(data)`, `update(id, data)`, `delete(id)`, `invite(id)` |
| `aiApi` | `message(data)`, `onboard(data)`, `validate(data)` |
| `insightApi` | `advisories()`, `exercise()`, `interactions(ids[])`, `audit()` |
| `labApi` | `list(params?)`, `upload(FormData)`, `get(id)`, `trends(biomarker)` |

### `query-client.tsx`
- `QueryClient` instantiated with `useState` (prevents SSR singleton reuse)
- Global defaults: `staleTime: 60_000`, `retry: 1`

### `utils.ts`
- `cn(...inputs)` — `clsx` wrapper
- `scoreColor(n)` — `text-green` ≥75, `text-amber` ≥50, `text-red` <50
- `scoreBorder(n)` — matching border variant
- `scoreBarColor(n)` — background bar variant
- `trendIcon(trend)` — `↑` / `↓` / `→` / `—`
- `trendColor(trend)` — green / red / tx-3
- `severityBg(s)` — red/amber/accent alert box classes for critical/warning/info
- `relativeDate(iso)` — Today / Yesterday / Nd ago

---

## Layout System

### `AppShell.tsx` (auth guard + shell)
```tsx
// Client component
useEffect(() => {
  if (!loading && !user) router.replace('/auth');
}, [user, loading, router]);

// Loading: animated 3-dot bounce (accent color)
// Authenticated: flex row — <Sidebar w-52> + <main flex-1 overflow-y-auto>
```

All 7 section layouts are identical 5-line files that pass `children` into `AppShell`.

### `Sidebar.tsx`
- Width: `w-52`, sticky, full height
- Logo bar (h-14) + nav list + footer strip
- Active detection: `pathname.startsWith(href)` — active item gets `bg-accent-muted text-accent`
- 7 nav items (inline SVG icons, 14×14):
  - Dashboard → `/dashboard`
  - Check-in → `/checkin`
  - Medicines → `/medicines`
  - Health → `/health`
  - Kutumb AI → `/ai`
  - Family → `/family`
  - Lab Reports → `/lab-reports`
- Footer: user initials avatar, truncated name, `ThemeToggle`, sign out button

### `ThemeToggle.tsx`
- `useTheme()` from next-themes
- Mounts placeholder `w-8 h-8` div until hydrated (prevents SSR mismatch)
- SVG sun icon (light mode) / moon icon (dark mode)

---

## Pages

### Landing (`src/app/page.tsx`) — Server component
Public, no auth. Sections:
- Fixed nav (h-14) with "Kutumb" wordmark, Features anchor link, Sign in link, ThemeToggle, "Get started" CTA → `/auth?tab=register`
- Hero: badge pill, large `clamp` heading, subtitle, two CTA buttons (`/auth?tab=register` + `/dashboard` demo)
- Divider line
- Features grid (3-col, gap-px on bg-border): 6 items — AI Health Memory, Medicine Intelligence, Organ Scores, Whole Family, Lab Report OCR, Emergency SOS
- Stats row: 12+ modules / 4 organ scores / 100% local memory
- Bottom CTA + footer

### Auth (`src/app/auth/page.tsx`) — Client component
- `useSearchParams()` sets initial tab from `?tab=register` (wrapped in `<Suspense>` per Next.js requirement)
- Tab switcher: Sign in / Create account
- Login fields: email, password
- Register fields: name, email, password (min 6 chars)
- On success: `router.replace('/dashboard')`
- Error display: inline red box

### Dashboard (`src/app/dashboard/page.tsx`) — Client component
4 parallel React Query fetches:
1. `healthApi.scores` → `['health-scores']`
2. `checkinApi.today` → `['checkin-today']`
3. `medicineApi.today` → `['medicines-today']`
4. `insightApi.advisories` → `['advisories']`

Renders:
- Header: locale date (en-IN, long format), greeting by hour (morning/afternoon/evening) + first name
- Critical advisories (severity=`critical`, first 2) as red alert bars
- KPI row (3 cards): Overall score | Doses pending (amber if >0) | Today's check-in
- Organ scores grid (4 cards): score, trend arrow, progress bar — empty state links to `/checkin`
- Medicine schedule list: first 6 doses, status icon (✓/—/!/·), taken/skipped/overdue/pending + adherence bar
- All advisories list with `severityBg` coloring

### Health (`src/app/health/page.tsx`) — Client component
Fetches `healthApi.scores` → `['health-scores']`.

Renders:
- Large overall score (`6rem` mono font) in a wide card, weight annotation top-right: `30% Heart · 25% Brain · 25% Gut · 20% Lungs`, computed_at timestamp
- 2×2 grid of organ cards (heart/brain/gut/lungs), each with: label, trend text, large score, progress bar, descriptor string (e.g. "HR · BP · stress · cardiac symptoms"), up to 3 contributing factor bullets

### Check-in (`src/app/checkin/page.tsx`) — Client component
Fetches today's check-in, pre-populates all fields if exists.

Reusable `Scale` component: label + optional subtitle + current value label + row of buttons.

Fields:
- **Mood**: 1-5 (Very low / Low / Okay / Good / Great)
- **Energy**: 1-5 (1=drained · 5=energetic)
- **Pain**: 1-5 (1=none · 5=extreme)
- **Stress**: 1-5 (1=calm · 5=very high)
- **Sleep**: 4-10h buttons
- **Hydration**: 1-8 glasses buttons
- **Symptoms**: 12 chip toggles (red highlight when selected)
- **Notes**: free-text textarea

Submission via `checkinApi.create`. Mood is the only required field. "Save check-in" vs "Update" depending on existing data. Success toast shown for 3s.

### Medicines (`src/app/medicines/page.tsx`) — Client component
Two tabs: Today / All medicines.

**Today tab**: adherence bar, schedule list with colored status dots (green/border-strong/red/tx-3), Taken + Skip action buttons for pending/overdue doses. `logDose` mutation invalidates `['medicines-today']`.

**All medicines tab**: 2-col card grid. Each card shows: name, dosage + frequency, category (underscored → spaces), Emergency badge (amber) if `is_emergency`, refill alert bar if `refill_alert` (`days_supply_remaining`).

### Family (`src/app/family/page.tsx`) — Client component
Member list fetched from `familyApi.list`. Shows linked/unlinked badge, permission badge (View/Manage/Emergency).

Inline Invite button (calls `familyApi.invite`) for unlinked members with phone.

`AddModal` (local state, no router): fields — name (text), relation (dropdown: 11 options including "other"), phone (optional, tel), permission (view/manage/emergency_only). Validation: name + relation required.

### Lab Reports (`src/app/lab-reports/page.tsx`) — Client component
- Drag-and-drop zone + click-to-browse (`<input ref>`)
- Accepted: `.pdf,.jpg,.jpeg,.png,.webp`
- Upload sends `FormData` with: file, `report_date` (today ISO), `report_type` (hardcoded `"blood_test"`)
- Invalidates `['lab-reports']` on success

Report card: type (underscores → spaces), lab name, report_date, `relativeDate(created_at)`, status badge, biomarker grid (up to 12 key-value tiles, "+N" overflow tile)

Status display map:
```
completed   → "Processed"  green
pending_ocr → "Queued"     amber
processing  → "Processing" accent
failed      → "Failed"     red
```

### AI Chat (`src/app/ai/page.tsx`) — Client component
Full-height layout (`h-screen`, no page scroll).

- Initial welcome message from assistant
- 5 suggested prompts shown until first reply
- Each send: appends user message → calls `aiApi.message({ message, conversation_history, memory_file: {} })` → appends assistant reply
- `conversation_history` grows in local state — stateless sessions (full history sent each call)
- `memory_file: {}` placeholder — actual memory context injected by backend via Firestore
- Fired triggers from response displayed above chat as severity-colored alerts
- Animated 3-dot typing indicator during loading
- Enter to send, Shift+Enter for newline

---

## Design Tokens (TailwindCSS v4)

Custom semantic tokens used throughout (defined in `globals.css`):

| Token | Usage |
|-------|-------|
| `bg-bg` | Page background |
| `bg-surface` | Card / sidebar background |
| `bg-bg-subtle` | Hover state background |
| `text-tx-1` | Primary text |
| `text-tx-2` | Secondary text |
| `text-tx-3` | Muted / label text |
| `text-accent` | Brand accent (active nav, CTAs) |
| `bg-accent` | Accent background (buttons) |
| `bg-accent-hover` | Hover state |
| `bg-accent-muted` | Subtle accent fill |
| `text-accent-text` | Text on accent background |
| `border-border` | Default border |
| `border-border-strong` | Focused/hover border |
| `text-green / text-amber / text-red` | Semantic status colors |

---

## Architectural Observations

1. **Client-only app in Next.js shell**: Every page is `'use client'`. No RSC data fetching, no server actions. Next.js provides routing and font optimization only.

2. **Auth guard is purely client-side**: `AppShell` redirects to `/auth` in `useEffect` after mount. Protected route HTML loads before redirect fires — no middleware or RSC gating.

3. **All section layouts are identical**: Every `[section]/layout.tsx` is the same 5-line `<AppShell>` wrapper. Authentication enforcement lives entirely in one component.

4. **Dual auth state**: `user` (FirebaseUser) and `appUser` (backend profile) are kept separate. The Axios interceptor reads `auth.currentUser` directly, not from React state — avoids stale token.

5. **AI session is stateless on web**: Unlike mobile (which uses SecureStore JSON-patch memory), the web AI page sends `memory_file: {}`. The backend injects health context from Firestore. Conversation history lives in React state and is lost on page refresh.

6. **Lab report type hardcoded**: Upload always sends `report_type: "blood_test"`. No UI to select report type.

7. **Family permission surface simplified**: Web UI exposes three permission labels (view/manage/emergency_only), a subset of the full `FamilyPermission` enum the backend supports.

8. **No React Query cache sharing with mobile**: Cache keys like `['health-scores']` exist only in the browser session. No persistence layer (no `persistQueryClient`).
