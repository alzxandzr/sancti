# Custom Plan Builder - Implementation Guide

## Overview
The custom plan builder lets users create their own devotional plans by choosing a saint, duration, theme, and preferred tone. Generated plans include full guardrails: devotional-reflection label, teaching authority disclaimer, and sensitive-case escalation guidance.

## Feature Flow

### Step 1: Create Draft
**Endpoint:** `POST /api/create-plan-draft`

**Request:**
```typescript
{
  user_id: string;
  setup: {
    title: string;              // 3-80 chars
    saint_id: string;           // e.g., "1" for St. Joseph
    route: RouteLabel;          // e.g., "VOCATION_DISCERNMENT"
    themes: string[];           // 1-5 themes, e.g., ["healing", "trust"]
    duration_days: 3|4|5|6|7;
    preferred_tone: "gentle" | "direct" | "encouraging" | "contemplative";
    prayer_duration_minutes: 5|10|15|20|30;
  }
}
```

**Response:**
```typescript
{
  draft_id: string;
  user_id: string;
  setup: CustomPlanSetup;
  days: CustomPlanDay[];        // Auto-generated with rotating prompt types
  status: "in_progress" | "ready_to_publish";
  created_at: ISO8601;
  updated_at: ISO8601;
}
```

**What happens:**
- Validates all inputs via Zod.
- Generates initial day prompts (reflection, journal, prayer, action cycle).
- Stores draft in shared in-memory store (Phase 1; Supabase in Phase 2).
- Returns draft ready for user review/editing.

---

### Step 2: Edit Days (Optional)
**Endpoint:** `PATCH /api/update-plan-day`

**Request:**
```typescript
{
  draft_id: string;
  day: {
    day_number: 1-7;
    prompt_type: "reflection" | "journal" | "prayer" | "action";
    title: string;              // 1-100 chars
    text: string;               // 10-1000 chars
    edited_by_user: boolean;
  }
}
```

**Response:**
Updated `CustomPlanDraft` with revised day.

**What happens:**
- Validates day content via Zod.
- Checks for banned roleplay/sacramental terms via `assertGuardrails`.
- Updates draft in store and increments `updated_at`.
- User can call this multiple times for multiple days.

---

### Step 3: Publish Plan
**Endpoint:** `POST /api/publish-plan`

**Request:**
```typescript
{
  draft_id: string;
}
```

**Response:**
```typescript
{
  plan_id: string;
  user_id: string;
  setup: CustomPlanSetup;
  days: CustomPlanDay[];
  content_label: "devotional_reflection";
  teaching_authority_note: string;
  pastoral_escalation: {
    should_escalate: boolean;
    suggestions: string[];
  };
  created_at: ISO8601;
}
```

**What happens:**
- Retrieves draft from store.
- Detects sensitive keywords (suicide, self-harm, abuse, danger, crisis, emergency) in plan title and all day text.
- If sensitive content detected: sets `should_escalate: true` and populates escalation suggestions including priest/parish guidance.
- Includes authority note on all plans.
- Validates all guardrail fields.
- Stores published plan and returns it.

---

### Step 4: Start Plan
**Endpoint:** `POST /api/start-plan`

**Request:**
```typescript
{
  user_id: string;
  plan_id: string;
}
```

**Response:**
```typescript
{
  plan_id: string;
  current_day: 1;
  total_days: number;          // e.g., 5 or 7
  current_prompt: {
    day_number: 1;
    title: string;
    text: string;
    prompt_type: string;
  };
  started_at: ISO8601;
}
```

**What happens:**
- Verifies plan exists and belongs to user (ownership check).
- Marks plan as active with current_day = 1.
- Returns Day 1 prompt ready to display on Today screen.
- Stores active plan state in shared storage.

---

## UI Integration

### Create Screen (`app/create.tsx`)
Three-step flow:

1. **Setup Step**
   - Text input for plan title.
   - Saint picker (placeholder shows "St. Joseph" for demo).
   - Duration slider: 3–7 days.
   - Tone selector: gentle, direct, encouraging, contemplative.

2. **Review Step**
   - Shows plan summary.
   - Displays devotional-only disclaimer.
   - Shows priest/parish escalation guidance if sensitive.
   - CTA: Publish or Back.

3. **Confirm Step**
   - "Plan created!" confirmation.
   - CTA: Start Today (navigates to `/today` with active plan).
   - Secondary CTA: Go to Profile.

### Today Screen Integration
When user calls `start-plan`, populate:
- Current day number (e.g., "Day 1 of 7").
- Day prompt (title, text, type).
- Mark Complete button (calls profile API to record completion event).

---

## Data Storage (Phase 1)

**Shared store module:** `lib/drafts.ts`

```typescript
export const draftStorage = {
  store: new Map<string, CustomPlanDraft>(),
  get(draft_id: string): CustomPlanDraft | null,
  set(draft_id: string, draft: CustomPlanDraft): void,
}

export const publishedStorage = {
  store: new Map<string, CustomPlanPublished>(),
  get(plan_id: string): CustomPlanPublished | null,
  set(plan_id: string, plan: CustomPlanPublished): void,
}

export const activePlanStorage = {
  store: new Map<string, { plan_id: string; current_day: number; started_at: string }>(),
  get(user_id: string, plan_id: string),
  set(user_id: string, plan_id: string, data),
}
```

---

## Guardrails Behavior

### Content Label
Every published plan includes:
```
content_label: "devotional_reflection"
```

This signals to the UI that the content is not official Church teaching.

### Teaching Authority Note
Every published plan includes:
```
teaching_authority_note: "This content is devotional reflection only and is not official Church teaching. For authoritative guidance, consult the Catechism, magisterial documents, or your priest/parish."
```

### Pastoral Escalation
Triggered if sensitive keywords detected:

```typescript
pastoral_escalation: {
  should_escalate: true,
  suggestions: [
    "Speak with a trusted priest as soon as possible for pastoral support.",
    "Contact your local parish office and request immediate accompaniment.",
    "If immediate risk is present, contact local emergency services or a crisis hotline."
  ]
}
```

UI must display these suggestions prominently when `should_escalate: true`.

---

## Testing the Feature (Manual)

1. **Create draft:**
   ```
   POST /api/create-plan-draft
   {
     "user_id": "user-123",
     "setup": {
       "title": "Healing and Trust",
       "saint_id": "1",
       "route": "SUFFERING_HARDSHIP",
       "themes": ["healing", "trust"],
       "duration_days": 5,
       "preferred_tone": "gentle",
       "prayer_duration_minutes": 10
     }
   }
   ```
   Returns draft with 5 auto-generated days.

2. **Edit Day 2:**
   ```
   PATCH /api/update-plan-day
   {
     "draft_id": "abc123",
     "day": {
       "day_number": 2,
       "prompt_type": "journal",
       "title": "Grace in Hardship",
       "text": "Write about a moment when you felt held by God's love.",
       "edited_by_user": true
     }
   }
   ```

3. **Publish:**
   ```
   POST /api/publish-plan
   {
     "draft_id": "abc123"
   }
   ```
   Returns published plan with label and authority note.

4. **Start:**
   ```
   POST /api/start-plan
   {
     "user_id": "user-123",
     "plan_id": "plan-xyz"
   }
   ```
   Returns Day 1 ready for Today screen.

---

## Next Steps (Phase 2)

1. **Migrate storage to Supabase:**
   - Tables: `custom_plan_drafts`, `custom_plan_days`, `published_plans`.
   - Update `lib/drafts.ts` to query/insert/update Supabase instead of in-memory Maps.

2. **Add plan-day completion tracking:**
   - Wire `mark_plan_day_complete` in profile API to increment `current_day`.
   - Update active plan state in storage.

3. **Enhance saint picker:**
   - Load saints from `data/saints.json` instead of placeholder.
   - Show saint bio and themes in picker UI.

4. **Add AI enhancement (optional):**
   - Route to Anthropic Claude to rewrite user-edited days with user's preferred tone.
   - Call within `update-plan-day` before storing.

5. **Plan history and re-runs:**
   - Allow users to re-run a published plan (fork as new draft).
   - Track multiple plan runs for same user.
