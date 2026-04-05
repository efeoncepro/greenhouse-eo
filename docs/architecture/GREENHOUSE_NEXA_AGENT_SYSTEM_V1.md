# Greenhouse Nexa Agent System V1

## Purpose

This document defines the architecture for Nexa's evolution from a passive insight generator into an agentic intelligence system capable of detecting anomalies, recommending actions, executing approved operations, and coordinating cross-domain reasoning across Greenhouse's operational, financial, and HR domains.

Any agent, engineer, or contributor working on the Nexa Agent System should:
- read this document before making architectural decisions
- treat this document as the authoritative source for agent design, tool boundaries, and orchestration patterns
- update this document when architecture-changing work lands

Use together with:
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md` — master architecture
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md` — canonical object model
- `Greenhouse_ICO_Engine_v1.md` — metrics engine, metric registry, materialization
- `CODEX_TASK_Greenhouse_Home_Nexa.md` — Home view, Nexa chat, Gemini integration
- `CODEX_TASK_Notification_System.md` — notification dispatch, categories, preferences
- `CODEX_TASK_Financial_Intelligence_Layer.md` — finance analytics views and APIs
- `Greenhouse_HRIS_Architecture_v1.md` — HR modules, payroll, performance
- `Brand_Voice_Tone_Personality_Efeonce_v1.docx` — Nexa voice (Section 8, Voice 3)

---

## Status

- **Nexa Insights (passive):** Live — generates narrative insights from ICO Engine data using Gemini 2.5 Flash
- **Nexa Chat (conversational):** Specified in CODEX TASK, pending implementation
- **Nexa Agent System (this document):** Architecture phase — defines the agentic evolution

---

## Product Thesis

Nexa is the operational intelligence layer of Greenhouse. Today it observes and narrates. Tomorrow it detects, recommends, and acts.

The progression:

| Phase | Behavior | How it works |
|---|---|---|
| **Phase 0 (live)** | Passive insight generation | Gemini reads ICO Engine metrics, generates narrative insights without user prompting |
| **Phase 1 (next)** | Conversational + tool-augmented | Nexa Chat with function calling — user asks questions, Gemini invokes tools to query data dynamically |
| **Phase 2 (target)** | Proactive detection + actionable recommendations | Nexa runs scheduled analysis, detects anomalies, dispatches notifications, proposes actions |
| **Phase 3 (horizon)** | Multi-agent orchestration | Specialized domain agents (Operations, Finance, HR) coordinated by an orchestrator that produces cross-domain insights |

**The core principle:** each phase builds on the previous without replacing it. Phase 0 insights continue running. Phase 1 adds interactivity. Phase 2 adds proactivity. Phase 3 adds cross-domain reasoning.

---

## Architecture Overview

### Phase 1–2: Single Agent with Domain Tools (Gemini + Function Calling)

```
┌─────────────────────────────────────────────────────┐
│                   Nexa Agent                        │
│              Gemini 2.5 Flash/Pro                    │
│           @google/genai SDK (TypeScript)             │
│                                                     │
│   ┌─────────────┐ ┌──────────────┐ ┌─────────────┐ │
│   │  Operations  │ │   Finance    │ │     HR      │ │
│   │    Tools     │ │    Tools     │ │    Tools    │ │
│   └──────┬──────┘ └──────┬───────┘ └──────┬──────┘ │
│          │               │                │         │
└──────────┼───────────────┼────────────────┼─────────┘
           │               │                │
    ┌──────▼──────┐ ┌──────▼───────┐ ┌──────▼──────┐
    │ ICO Engine  │ │ Finance APIs │ │  HR APIs    │
    │ BigQuery    │ │ PostgreSQL   │ │ PostgreSQL  │
    │ Notion data │ │ BigQuery     │ │ BigQuery    │
    └─────────────┘ └──────────────┘ └─────────────┘
           │               │                │
           └───────────────┼────────────────┘
                           │
                  ┌────────▼────────┐
                  │  Action Layer   │
                  │  Notifications  │
                  │  Draft creation │
                  │  Reassignment   │
                  └─────────────────┘
```

### Phase 3: Multi-Agent Orchestration (Google ADK)

```
┌──────────────────────────────────────────────────────────┐
│                  Nexa Orchestrator                        │
│                  Google ADK (Python)                      │
│                  Cloud Run service                        │
│                                                          │
│   ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │
│   │  Operations   │ │   Finance    │ │     HR       │    │
│   │    Agent      │ │    Agent     │ │    Agent     │    │
│   │              │ │              │ │              │    │
│   │  Tools:      │ │  Tools:      │ │  Tools:      │    │
│   │  ops-tools/  │ │  fin-tools/  │ │  hr-tools/   │    │
│   └──────┬───────┘ └──────┬───────┘ └──────┬───────┘    │
│          │                │                │             │
│   ┌──────▼────────────────▼────────────────▼───────┐    │
│   │            Shared Action Layer                  │    │
│   │    Notifications · Drafts · Reassignments       │    │
│   └────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────┘
         │                                    │
    REST API to                          SSE streaming
    Greenhouse                           to Greenhouse
    (internal)                           frontend
```

**Key design decision:** The domain tools defined in Phase 1–2 become the tools of each specialized agent in Phase 3. The tools themselves don't change — only the orchestration layer above them.

---

## Domain Tools Specification

### Naming Convention

All tool files live in `src/lib/nexa/tools/` grouped by domain:

```
src/lib/nexa/tools/
├── operations/
│   ├── index.ts                    ← Re-exports all ops tools
│   ├── get-space-metrics.ts
│   ├── get-stuck-assets.ts
│   ├── get-sprint-progress.ts
│   ├── get-project-health.ts
│   ├── get-team-workload.ts
│   ├── compare-periods.ts
│   ├── detect-anomalies.ts
│   └── send-ops-notification.ts
├── finance/
│   ├── index.ts
│   ├── get-pnl-summary.ts
│   ├── get-margin-by-service.ts
│   ├── get-margin-by-client.ts
│   ├── get-expense-trends.ts
│   ├── get-cashflow-projection.ts
│   ├── detect-expense-anomalies.ts
│   └── send-finance-alert.ts
├── hr/
│   ├── index.ts
│   ├── get-member-utilization.ts
│   ├── get-expiring-contracts.ts
│   ├── get-leave-balances.ts
│   ├── get-payroll-preview.ts
│   ├── validate-bonus-kpis.ts
│   └── send-hr-notification.ts
├── actions/
│   ├── index.ts
│   ├── dispatch-notification.ts
│   ├── create-update-draft.ts
│   ├── suggest-reassignment.ts
│   └── generate-executive-summary.ts
└── shared/
    ├── tool-types.ts               ← Shared TypeScript types
    ├── tool-registry.ts            ← Declares all tools for Gemini
    └── bigquery-client.ts          ← Shared BQ query executor
```

### Tool Interface Contract

Every tool follows the same TypeScript interface:

```typescript
// src/lib/nexa/tools/shared/tool-types.ts

export interface NexaTool<TInput, TOutput> {
  /** Unique tool name — matches Gemini function declaration */
  name: string

  /** Human-readable description for Gemini's function calling */
  description: string

  /** JSON Schema for the input parameters */
  parameters: Record<string, unknown>

  /** Execute the tool — always receives space_id from session, never from input */
  execute: (input: TInput, context: NexaToolContext) => Promise<TOutput>
}

export interface NexaToolContext {
  /** Always from server-side session — never from user input */
  spaceId: string

  /** Role of the current user */
  role: string

  /** User's identity_profile_id */
  profileId: string

  /** Whether this is a proactive (scheduled) or reactive (user-initiated) call */
  mode: 'reactive' | 'proactive'
}
```

**Non-negotiable rule:** `space_id` is always injected from the server-side session into `NexaToolContext`. No tool accepts `space_id` as a parameter from Gemini. This is the same tenant isolation pattern used across all of Greenhouse.

---

## Operations Tools — Detailed Specification

### get-space-metrics

Reads pre-calculated metrics from ICO Engine. Never calculates inline.

```typescript
// Input
{ period?: 'current_month' | 'last_month' | 'last_quarter' | 'all_time' }

// Output
{
  rpa_avg: number
  otd_pct: number
  ftr_pct: number
  cycle_time_avg: number
  throughput_weekly: number
  stuck_count_48h: number
  stuck_count_96h: number
  pipeline: Record<string, number>  // CSC phase distribution
  _materialized_at: string
}
```

**Data source:** `ico_engine.metric_snapshots_monthly` or `ico_engine.metrics_by_project` via `getMetricsBySpace()` from `src/lib/ico-engine/read-metrics.ts`.

### get-stuck-assets

Returns assets stuck in the creative pipeline beyond threshold.

```typescript
// Input
{ severity?: 'warning' | 'danger' | 'all', limit?: number }

// Output
Array<{
  task_name: string
  project_name: string
  csc_phase: string
  hours_stuck: number
  days_stuck: number
  severity: 'warning' | 'danger'
  assignees: string[]
  rpa: number
  frameio_url?: string
}>
```

**Data source:** `ico_engine.stuck_assets_detail`.

### get-sprint-progress

Compares sprint timeline vs delivery progress to detect risk.

```typescript
// Input
{ sprint_id?: string }  // null = current active sprint

// Output
{
  sprint_name: string
  start_date: string
  end_date: string
  time_elapsed_pct: number     // % of sprint duration consumed
  tasks_completed_pct: number  // % of tasks completed
  risk_level: 'on_track' | 'at_risk' | 'behind'
  tasks_total: number
  tasks_completed: number
  tasks_in_progress: number
  tasks_blocked: number
  days_remaining: number
}
```

**Risk logic:** `at_risk` when `time_elapsed_pct - tasks_completed_pct > 20`. `behind` when delta > 40 or `days_remaining < 3 && tasks_completed_pct < 70`.

**Data source:** `greenhouse_conformed.sprints` + `greenhouse_conformed.delivery_tasks`.

### get-project-health

Multi-dimensional health assessment per project.

```typescript
// Input
{ project_id?: string }  // null = all projects in space

// Output
Array<{
  project_name: string
  project_id: string
  health_score: number          // 0–100 composite
  rpa_status: 'green' | 'yellow' | 'red'
  otd_status: 'green' | 'yellow' | 'red'
  cycle_time_status: 'green' | 'yellow' | 'red'
  stuck_count: number
  active_tasks: number
  trend: 'improving' | 'stable' | 'declining'
}>
```

**Health score formula:** Weighted composite — OTD (40%), RpA (30%), Cycle Time (20%), Stuck ratio (10%). Thresholds from `ICO_METRIC_REGISTRY`.

### get-team-workload

Team capacity analysis — task load per member.

```typescript
// Input
{ include_all_spaces?: boolean }  // true only for operators with can_view_all_spaces

// Output
Array<{
  member_name: string
  member_id: string
  active_tasks: number
  tasks_in_review: number
  utilization_pct: number       // active_tasks / capacity (from capacity system)
  overloaded: boolean           // utilization > 90%
  projects: string[]            // project names assigned
}>
```

**Data source:** `greenhouse_conformed.delivery_tasks` (current assignments) + `greenhouse_core.members` (capacity data from Team Identity Capacity System).

### detect-anomalies

Scheduled anomaly detection — compares current metrics against historical baselines.

```typescript
// Input — typically called by proactive scheduler, not by user
{ lookback_days?: number }  // default 7

// Output
Array<{
  anomaly_type: 'metric_drop' | 'metric_spike' | 'stuck_surge' | 'sprint_risk' | 'workload_imbalance'
  severity: 'info' | 'warning' | 'critical'
  metric?: string
  current_value: number
  baseline_value: number
  delta_pct: number
  affected_entity: string       // project name, member name, sprint name
  suggested_action: string      // natural language recommendation
}>
```

**Detection rules (hardcoded thresholds v1):**
- `metric_drop`: OTD% fell > 10pp from 4-week rolling average
- `metric_spike`: RpA rose > 0.5 from 4-week rolling average
- `stuck_surge`: Stuck asset count increased > 3x from previous week
- `sprint_risk`: Sprint at-risk or behind (from get-sprint-progress logic)
- `workload_imbalance`: Any member at > 90% utilization while another in same project is at < 50%

### compare-periods

Period-over-period comparison for any ICO metric.

```typescript
// Input
{ metric: string, period_a: string, period_b: string }
// e.g. { metric: 'otd_pct', period_a: '2026-03', period_b: '2026-02' }

// Output
{
  metric: string
  period_a: { value: number, label: string }
  period_b: { value: number, label: string }
  delta: number
  delta_pct: number
  direction: 'improved' | 'declined' | 'stable'
}
```

### send-ops-notification

Dispatches an operational notification via the existing Notification System.

```typescript
// Input
{
  category: 'ico_alert' | 'capacity_warning'
  recipients: Array<{ userId: string, email?: string }>
  title: string
  body: string
  actionUrl?: string
  metadata?: Record<string, unknown>
}

// Output
{ sent: number, skipped: number, failed: number }
```

**Implementation:** Calls `NotificationService.dispatch()` directly. Category must be from the defined `NOTIFICATION_CATEGORIES`. The agent cannot create new categories.

---

## Finance Tools — Detailed Specification

### get-pnl-summary

Reads P&L for current month and YTD.

```typescript
// Input
{ period?: string }  // '2026-03' or 'ytd'

// Output
{
  period: string
  revenue: number
  cogs: number
  gross_margin: number
  gross_margin_pct: number
  opex: number
  operating_margin: number
  operating_margin_pct: number
  currency: 'CLP'
}
```

**Data source:** `/api/finance/analytics/pnl/summary` (existing API from Financial Intelligence Layer).

### get-margin-by-service

Margin breakdown by business unit / service line.

```typescript
// Input
{ period?: string }

// Output
Array<{
  service_line: string          // Globe, Efeonce Digital, Reach, Wave, CRM Solutions
  revenue: number
  allocated_cost: number
  margin: number
  margin_pct: number
}>
```

**Data source:** `v_margin_by_service_line` view (Financial Intelligence Layer).

### get-margin-by-client

Per-client profitability analysis.

```typescript
// Input
{ min_months_active?: number, sort_by?: 'revenue' | 'margin' | 'margin_pct' }

// Output
Array<{
  client_name: string
  client_id: string
  revenue_total: number
  cost_allocated: number
  margin: number
  margin_pct: number
  months_active: number
  trend: 'improving' | 'stable' | 'declining'
}>
```

### detect-expense-anomalies

Identifies unusual expense patterns.

```typescript
// Input
{ lookback_months?: number }  // default 3

// Output
Array<{
  anomaly_type: 'supplier_spike' | 'category_spike' | 'new_recurring' | 'duplicate_suspect'
  severity: 'info' | 'warning'
  description: string
  supplier_name?: string
  category?: string
  current_amount: number
  baseline_amount: number
  delta_pct: number
}>
```

**Detection rules:**
- `supplier_spike`: A supplier's monthly total > 2x their 3-month average
- `category_spike`: A cost_category > 1.5x its 3-month average
- `new_recurring`: Same supplier + similar amount appears 3 consecutive months (new commitment)
- `duplicate_suspect`: Two expenses with same amount ± 5% within 48 hours to same supplier

### get-cashflow-projection

Forward-looking cash flow based on committed income and expenses.

```typescript
// Input
{ horizon_months?: number }  // default 3

// Output
{
  current_balance: number
  projections: Array<{
    month: string
    expected_income: number     // from pending invoices
    expected_expenses: number   // from recurring + committed
    projected_balance: number
    risk: 'healthy' | 'tight' | 'negative'
  }>
}
```

---

## HR Tools — Detailed Specification

### get-member-utilization

Workload and utilization metrics per team member.

```typescript
// Input
{ department?: string, threshold_pct?: number }

// Output
Array<{
  member_name: string
  member_id: string
  department: string
  contract_type: string
  active_tasks: number
  utilization_pct: number
  consecutive_weeks_over_90: number
  risk_level: 'normal' | 'high' | 'burnout_risk'
}>
```

**Rule:** `burnout_risk` when `consecutive_weeks_over_90 >= 3`.

### get-expiring-contracts

Contracts approaching expiration.

```typescript
// Input
{ days_ahead?: number }  // default 60

// Output
Array<{
  member_name: string
  member_id: string
  contract_type: 'plazo_fijo' | 'contractor' | 'eor'
  end_date: string
  days_until_expiry: number
  action_required: 'renew' | 'convert' | 'offboard'
}>
```

**Data source:** `greenhouse_core.members` with `contract_end_date`.

### validate-bonus-kpis

Cross-references member ICO metrics against payroll bonus thresholds.

```typescript
// Input
{ period: string }  // '2026-03'

// Output
Array<{
  member_name: string
  member_id: string
  otd_pct: number
  otd_qualifies: boolean        // >= 89%
  ftr_pct: number
  ftr_qualifies: boolean        // >= 65%
  bonus_eligible: boolean       // both must qualify
  bonus_amount?: number         // from payroll_bonus_config
}>
```

**Data source:** `ico_engine.metrics_by_member` + `greenhouse_payroll.payroll_bonus_config`. Thresholds hardcoded per `CODEX_TASK_HR_Payroll_Module_v2.md`: OTD ≥ 89%, FTR ≥ 65%.

### get-payroll-preview

Pre-validates payroll entries before period close.

```typescript
// Input
{ period: string }

// Output
{
  period: string
  total_headcount: number
  total_gross: number
  total_net: number
  entries_with_override: number
  entries_with_bonus: number
  anomalies: Array<{
    member_name: string
    issue: 'missing_compensation' | 'net_override_detected' | 'kpi_data_stale' | 'contract_expired'
  }>
}
```

---

## Action Tools — Cross-Domain

### dispatch-notification

Wraps `NotificationService.dispatch()` with agent-specific guardrails.

```typescript
// Guardrails:
// - Agent can only dispatch to categories: ico_alert, capacity_warning, system_event
// - Agent cannot dispatch to: feedback_requested, leave_status, payroll_ready
//   (those are triggered by module-specific business logic, not by AI)
// - Rate limit: max 10 notifications per space per hour from agent
// - All agent-dispatched notifications include metadata.source = 'nexa_agent'
```

### create-update-draft

Pre-generates a client-facing sprint or project update as a draft.

```typescript
// Input
{
  type: 'sprint_summary' | 'project_status' | 'monthly_report'
  context: Record<string, unknown>  // metrics, highlights, risks
}

// Output
{
  draft_id: string
  title: string
  body_markdown: string
  suggested_recipients: string[]
  status: 'draft'  // always draft — human must approve before sending
}
```

**Rule:** The agent NEVER publishes directly. All generated content goes to `status: 'draft'` and requires human approval.

### suggest-reassignment

Recommends task reassignment based on workload analysis.

```typescript
// Input
{
  task_id: string
  reason: 'overload' | 'stuck' | 'skill_match' | 'availability'
}

// Output
{
  current_assignee: string
  suggested_assignees: Array<{
    member_name: string
    member_id: string
    utilization_pct: number
    same_project: boolean
    rationale: string
  }>
  recommendation: string       // natural language summary
  auto_reassign: false         // ALWAYS false — human decides
}
```

**Rule:** The agent NEVER auto-reassigns. It suggests and waits for human confirmation.

### generate-executive-summary

Produces a cross-domain narrative summary for operators/admins.

```typescript
// Input
{
  scope: 'space' | 'agency'
  period: 'weekly' | 'monthly'
}

// Output
{
  title: string
  sections: Array<{
    domain: 'operations' | 'finance' | 'hr'
    headline: string           // one-sentence summary
    highlights: string[]       // 2-3 key points
    risks: string[]            // 0-2 items requiring attention
    metrics: Record<string, number>
  }>
  overall_health: 'strong' | 'stable' | 'attention_needed'
  generated_at: string
}
```

---

## Proactive Detection System (Phase 2)

### Architecture

Nexa's proactive detection runs as a scheduled process, separate from user-initiated chat.

```
Vercel Cron (daily 07:00 AM Santiago time)
    │
    ▼
POST /api/nexa/scheduled-analysis
    │
    ├── 1. Run detect-anomalies (operations)
    ├── 2. Run detect-expense-anomalies (finance)
    ├── 3. Run get-expiring-contracts (hr)
    ├── 4. Run get-sprint-progress (all active sprints)
    ├── 5. Run get-member-utilization (burnout check)
    │
    ▼
    Collect all findings
    │
    ▼
    Gemini generates narrative synthesis
    (one prompt with all findings as context)
    │
    ▼
    Dispatch notifications for critical/warning findings
    │
    ▼
    Store analysis snapshot in BigQuery
    (greenhouse_conformed.nexa_analysis_log)
```

### Scheduled Analysis API

```typescript
// POST /api/nexa/scheduled-analysis
// Auth: Vercel cron secret (CRON_SECRET env var)
// No user session — runs as system

export async function POST(request: Request) {
  // 1. Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  // 2. Get all active spaces
  const spaces = await getActiveSpaces()

  // 3. For each space, run detection tools
  for (const space of spaces) {
    const context: NexaToolContext = {
      spaceId: space.space_id,
      role: 'system',
      profileId: 'nexa-agent',
      mode: 'proactive'
    }

    const findings = await runAllDetectors(context)

    // 4. If findings exist, synthesize and notify
    if (findings.length > 0) {
      const synthesis = await synthesizeFindings(findings, space)
      await dispatchFindingNotifications(synthesis, space)
      await logAnalysis(space.space_id, findings, synthesis)
    }
  }
}
```

### Analysis Log Table

```sql
-- BigQuery: greenhouse_conformed.nexa_analysis_log
-- Append-only log of all scheduled analyses

CREATE TABLE IF NOT EXISTS `efeonce-group.greenhouse_conformed.nexa_analysis_log` (
  analysis_id STRING NOT NULL,          -- UUID
  space_id STRING NOT NULL,
  run_type STRING NOT NULL,             -- 'scheduled_daily' | 'manual'
  findings_count INT64,
  findings_critical INT64,
  findings_warning INT64,
  findings_info INT64,
  findings_json STRING,                 -- Full findings payload (JSON)
  synthesis_text STRING,                -- Gemini-generated narrative
  notifications_dispatched INT64,
  executed_at TIMESTAMP NOT NULL,
  duration_ms INT64
);
```

---

## Phase 3: Multi-Agent Orchestration (ADK)

### When to Transition

Transition from Phase 2 (function calling) to Phase 3 (ADK) when:

1. The number of tools exceeds Gemini's effective function calling context (~20-25 tools)
2. Cross-domain reasoning requires multi-step delegation (e.g., "analyze the financial impact of the operational delay and recommend HR actions")
3. Verk Agent is also ready for ADK — shared infrastructure amortizes the cost of a Python runtime

### ADK Architecture

```
Cloud Run service: nexa-orchestrator
Runtime: Python 3.12
Framework: Google ADK
Region: us-central1
Auth: Internal service account (greenhouse-portal@efeonce-group.iam.gserviceaccount.com)
```

**Agent hierarchy:**

```python
# Orchestrator — routes queries to domain agents
orchestrator = Agent(
    name="nexa_orchestrator",
    model="gemini-2.5-flash",
    instruction="""You are Nexa, the operational intelligence system for Greenhouse.
    You coordinate three specialized agents: operations, finance, and hr.
    For questions that span multiple domains, consult each relevant agent
    and synthesize their findings into a unified recommendation.""",
    sub_agents=[operations_agent, finance_agent, hr_agent]
)

# Operations Agent — ICO Engine, delivery, pipeline
operations_agent = Agent(
    name="operations",
    model="gemini-2.5-flash",
    instruction="You handle all operational metrics, project health, sprint progress, stuck assets, and team workload analysis.",
    tools=[get_space_metrics, get_stuck_assets, get_sprint_progress,
           get_project_health, get_team_workload, compare_periods,
           detect_anomalies]
)

# Finance Agent — P&L, margins, expenses, cash flow
finance_agent = Agent(
    name="finance",
    model="gemini-2.5-flash",
    instruction="You handle all financial analysis: P&L, margins by service line and client, expense trends, cash flow projections, and financial anomaly detection.",
    tools=[get_pnl_summary, get_margin_by_service, get_margin_by_client,
           get_expense_trends, get_cashflow_projection, detect_expense_anomalies]
)

# HR Agent — utilization, contracts, payroll, performance
hr_agent = Agent(
    name="hr",
    model="gemini-2.5-flash",
    instruction="You handle all HR intelligence: member utilization, contract management, payroll validation, bonus KPI verification, and burnout risk detection.",
    tools=[get_member_utilization, get_expiring_contracts, get_leave_balances,
           get_payroll_preview, validate_bonus_kpis]
)
```

**Communication pattern:** Greenhouse frontend calls the ADK orchestrator via REST (Cloud Run). The orchestrator delegates to sub-agents, each sub-agent calls tools that hit the same Greenhouse APIs and BigQuery views as Phase 2. The tools are reimplemented in Python but read from the exact same data sources.

### Shared Infrastructure with Verk

If Verk Agent (P1) also uses ADK, both can run in the same Cloud Run service with separate agent hierarchies:

```
Cloud Run: efeonce-agent-runtime
├── /nexa/      → Nexa orchestrator (operations, finance, hr)
└── /verk/      → Verk agent (content, research, distribution)
```

Shared infrastructure: GCP auth, BigQuery client, Vertex AI config, health checks. Separate concerns: agent definitions, tools, prompt versions.

---

## Client-Facing Agent (Phase 3+)

### Scope

A reduced-capability version of Nexa exposed to client users in their Home view. Has access only to operations tools scoped to their space, with no finance or HR visibility.

### Available Tools (Client Context)

| Tool | Available | Notes |
|---|---|---|
| get-space-metrics | Yes | Scoped to client's space |
| get-stuck-assets | Yes | Shows only their assets |
| get-sprint-progress | Yes | Their active sprint |
| get-project-health | Yes | Their projects |
| get-team-workload | No | Internal only |
| detect-anomalies | No | Internal only |
| All finance tools | No | Internal only |
| All HR tools | No | Internal only |
| create-update-draft | No | Operators only |
| suggest-reassignment | No | Internal only |

### Client-Facing Behaviors

What the client-facing Nexa can do:
- "Tu sprint actual va en 72% de avance, con 3 assets esperando tu aprobación desde hace 2 días"
- "Si apruebas los assets pendientes hoy, estamos on-track para cerrar el sprint a tiempo"
- "Tu proyecto tiene un OTD de 94% en los últimos 3 meses — arriba del benchmark"
- "Hay 2 assets en fase de producción que llevan más de 48 horas sin actualización"

What it cannot do:
- Reveal financial information (margins, costs, revenue)
- Show team capacity or workload data
- Expose HR information about team members
- Share cross-client comparisons

---

## Gemini Configuration

### Model Selection

| Context | Model | Reason |
|---|---|---|
| Nexa Insights (passive) | Gemini 2.5 Flash | Cost efficiency for batch generation |
| Nexa Chat (reactive) | Gemini 2.5 Flash | Low latency for conversational UX |
| Scheduled analysis (proactive) | Gemini 2.5 Flash | Batch processing, cost sensitive |
| Cross-domain synthesis (Phase 3) | Gemini 2.5 Pro | Complex multi-step reasoning |

### Function Calling Registration

```typescript
// src/lib/nexa/tools/shared/tool-registry.ts

import type { FunctionDeclaration } from '@google/genai'

export const NEXA_TOOL_DECLARATIONS: FunctionDeclaration[] = [
  // Operations
  {
    name: 'get_space_metrics',
    description: 'Get pre-calculated ICO Engine metrics for the current space. Returns RpA, OTD%, FTR%, cycle time, throughput, stuck counts, and CSC pipeline distribution.',
    parameters: {
      type: 'object',
      properties: {
        period: {
          type: 'string',
          enum: ['current_month', 'last_month', 'last_quarter', 'all_time'],
          description: 'Time period for metrics. Defaults to current_month.'
        }
      }
    }
  },
  // ... one entry per tool
]
```

---

## Security & Guardrails

### Tenant Isolation

- `space_id` injected from server-side session — never from user input, never from Gemini
- All BigQuery queries include `WHERE space_id = @spaceId` parameterized
- Operators with `can_view_all_spaces` can access agency-wide tools; clients cannot
- Client-facing Nexa has a restricted tool set (no finance, no HR, no cross-client)

### Action Guardrails

| Rule | Enforcement |
|---|---|
| Agent NEVER publishes content directly | `create-update-draft` always returns `status: 'draft'` |
| Agent NEVER auto-reassigns tasks | `suggest-reassignment` always returns `auto_reassign: false` |
| Agent NEVER dispatches to human-triggered notification categories | Allowlist: `ico_alert`, `capacity_warning`, `system_event` only |
| Agent rate-limited on notifications | Max 10 per space per hour from `source: 'nexa_agent'` |
| Agent cannot modify data | All tools are read-only except notification dispatch and draft creation |
| Agent cannot access other spaces | `NexaToolContext.spaceId` is immutable per request |

### Audit Trail

Every agent action is logged:

```sql
-- BigQuery: greenhouse_conformed.nexa_action_log

CREATE TABLE IF NOT EXISTS `efeonce-group.greenhouse_conformed.nexa_action_log` (
  action_id STRING NOT NULL,
  space_id STRING NOT NULL,
  user_id STRING,                       -- null for proactive/scheduled
  mode STRING NOT NULL,                 -- 'reactive' | 'proactive'
  tool_name STRING NOT NULL,
  tool_input STRING,                    -- JSON
  tool_output STRING,                   -- JSON
  gemini_model STRING NOT NULL,
  prompt_version STRING,                -- Git commit hash of system prompt
  tokens_input INT64,
  tokens_output INT64,
  latency_ms INT64,
  executed_at TIMESTAMP NOT NULL
);
```

---

## Decisions Locked by This Document

1. **Phase 1–2 uses Gemini function calling via `@google/genai` SDK in TypeScript** — no external agent framework
2. **Phase 3 uses Google ADK in Python on Cloud Run** — transition only when tool count or reasoning complexity demands it
3. **Tools are domain-grouped and follow `NexaTool<TInput, TOutput>` interface** — same tools in Phase 2 become sub-agent tools in Phase 3
4. **`space_id` is always from server-side session** — tenant isolation is non-negotiable
5. **Agent NEVER writes to operational tables** — read-only except notifications and drafts
6. **All agent-generated content is `status: 'draft'`** — human approval required for anything client-facing
7. **Proactive detection runs as Vercel cron** — not as a persistent background process
8. **Nexa Agent audit trail goes to BigQuery** — append-only, never modified
9. **Client-facing Nexa has restricted tool access** — no finance, no HR, no cross-client
10. **Gemini 2.5 Flash is the default model** — Pro only for complex cross-domain synthesis in Phase 3
11. **Notification dispatch from agent is rate-limited and category-restricted** — cannot impersonate module-triggered notifications

---

## Roadmap

| Phase | Scope | Depends on | Estimated effort |
|---|---|---|---|
| **1a** | Operations tools (5 core) + Nexa Chat integration | Nexa Chat (CODEX TASK), ICO Engine live | 1 CODEX TASK, ~2 weeks |
| **1b** | Finance tools (4 core) | Financial Intelligence Layer implemented | 1 CODEX TASK, ~1.5 weeks |
| **1c** | HR tools (4 core) | HRIS Phase 1 + Payroll implemented | 1 CODEX TASK, ~1.5 weeks |
| **2a** | Proactive detection (scheduled analysis) | Phase 1a complete | 1 CODEX TASK, ~2 weeks |
| **2b** | Action tools (notifications, drafts, reassignment suggestions) | Notification System, Phase 2a | 1 CODEX TASK, ~1.5 weeks |
| **2c** | Client-facing Nexa | Phase 1a, Greenhouse Home live | 1 CODEX TASK, ~1 week |
| **3** | ADK multi-agent orchestration | Phase 2 validated, Verk Agent P1 ready | 1 architecture migration, ~3 weeks |

---

## Changelog

| Date | Version | Change |
|---|---|---|
| 2026-04-05 | v1.0 | Initial architecture — phased evolution from passive insights to multi-agent orchestration |

---

*Efeonce Greenhouse™ · Efeonce Group · Abril 2026*
*Documento técnico interno para agentes de desarrollo. Cualquier agente que trabaje en Nexa Agent System debe leer este documento completo antes de implementar.*
