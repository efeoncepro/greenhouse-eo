/**
 * Display-name fallback for delivery surfaces (tasks, projects, sprints)
 * =====================================================================
 *
 * TASK-588 made the canonical title columns NULLABLE in
 * `greenhouse_delivery.{projects,tasks,sprints}.{project_name,task_name,sprint_name}`
 * with CHECK constraints that PROHIBIT sentinel placeholders. This helper is the
 * **single source of truth** for what a UI surface should render when the
 * canonical name is null, ensuring every consumer (web, mobile, MCP, exports,
 * Slack notifications, ...) shows the same fallback.
 *
 * **Bit-exact parity with the SQL functions** in
 * `migrations/20260426144105255_add-delivery-display-name-functions.sql`
 * (`greenhouse_delivery.task_display_name`, `project_display_name`,
 * `sprint_display_name`). The parity test in `task-display.test.ts` mocks both
 * sides and asserts identical output for the same input across thousands of
 * cases. **Do not change the format here without updating the SQL function and
 * bumping the parity test.**
 *
 * The fallback is intentionally:
 *   - **Data-derived** (uses the page's own source ID, not a sentinel string).
 *   - **Spanish-localized** to match the rest of the portal.
 *   - **Stable per page** — same input always produces same output, safe for
 *     deduplication, sorting, deep-linking.
 *   - **Non-PII** — only contains the public Notion page ID short form.
 *
 * UI components should also surface the `isFallback` flag so they can render
 * a subtle visual treatment (italic + warning icon + tooltip + click-through to
 * Notion to fix at source). Use the shared `<TaskNameLabel>` /
 * `<ProjectNameLabel>` / `<SprintNameLabel>` components rather than calling
 * this helper directly in JSX — they wrap the consistent visual treatment.
 */

export interface DisplayNameResult {
  /** The text to render in the UI. Always a non-empty string. */
  text: string

  /**
   * `true` when the canonical name was missing and the fallback was applied.
   * UI uses this to render italic + warning icon + tooltip + edit-in-Notion CTA.
   */
  isFallback: boolean

  /**
   * Direct link to the Notion page so the user can fix the title at source
   * with one click. `null` when the page URL was not provided in the input.
   */
  notionUrl: string | null
}

const SHORT_ID_LENGTH = 8

const isMissingTitle = (value: string | null | undefined): boolean => {
  if (value === null || value === undefined) return true
  if (typeof value !== 'string') return true
  if (value.trim() === '') return true

  return false
}

/**
 * Build the fallback label that mirrors the SQL function.
 *
 * SQL equivalent:
 * ```sql
 * 'Tarea sin título · ' || LOWER(SUBSTRING(COALESCE(task_source_id, ''), 1, 8))
 * ```
 *
 * Matches `LOWER(SUBSTRING(..., 1, 8))` exactly: pads-or-truncates to 8 chars
 * starting at position 1, lowercased. Safe for `null`/`undefined`/empty IDs
 * (returns the prefix alone with empty suffix).
 */
const buildFallback = (prefix: string, sourceId: string | null | undefined): string => {
  const safeId = typeof sourceId === 'string' ? sourceId : ''
  const shortId = safeId.slice(0, SHORT_ID_LENGTH).toLowerCase()

  return `${prefix} · ${shortId}`
}

const buildResult = (
  prefix: string,
  rawName: string | null | undefined,
  sourceId: string | null | undefined,
  pageUrl: string | null | undefined
): DisplayNameResult => {
  if (!isMissingTitle(rawName)) {
    return {
      text: (rawName as string).trim(),
      isFallback: false,
      notionUrl: pageUrl ?? null
    }
  }

  return {
    text: buildFallback(prefix, sourceId),
    isFallback: true,
    notionUrl: pageUrl ?? null
  }
}

export interface TaskDisplayInput {
  task_name?: string | null
  taskName?: string | null
  task_source_id?: string | null
  taskSourceId?: string | null
  page_url?: string | null
  pageUrl?: string | null
}

export const displayTaskName = (input: TaskDisplayInput): DisplayNameResult =>
  buildResult(
    'Tarea sin título',
    input.task_name ?? input.taskName,
    input.task_source_id ?? input.taskSourceId,
    input.page_url ?? input.pageUrl
  )

export interface ProjectDisplayInput {
  project_name?: string | null
  projectName?: string | null
  project_source_id?: string | null
  projectSourceId?: string | null
  page_url?: string | null
  pageUrl?: string | null
}

export const displayProjectName = (input: ProjectDisplayInput): DisplayNameResult =>
  buildResult(
    'Proyecto sin título',
    input.project_name ?? input.projectName,
    input.project_source_id ?? input.projectSourceId,
    input.page_url ?? input.pageUrl
  )

export interface SprintDisplayInput {
  sprint_name?: string | null
  sprintName?: string | null
  sprint_source_id?: string | null
  sprintSourceId?: string | null
  page_url?: string | null
  pageUrl?: string | null
}

export const displaySprintName = (input: SprintDisplayInput): DisplayNameResult =>
  buildResult(
    'Sprint sin título',
    input.sprint_name ?? input.sprintName,
    input.sprint_source_id ?? input.sprintSourceId,
    input.page_url ?? input.pageUrl
  )

/**
 * Convenience export so consumers can detect a fallback label without parsing
 * the prefix. Useful for analytics, audits, or surfacing "X tareas sin título"
 * counters in admin dashboards.
 */
export const isFallbackDisplayName = (text: string): boolean =>
  text.startsWith('Tarea sin título · ') ||
  text.startsWith('Proyecto sin título · ') ||
  text.startsWith('Sprint sin título · ')
