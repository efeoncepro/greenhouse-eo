import 'server-only'

import { resolveHomeRolloutFlag, type HomeRolloutSubject } from '@/lib/home/rollout-flags'

/**
 * TASK-612 Slice 4 — Helper canónico para gating del Organization Workspace shell.
 *
 * Wrappea `resolveHomeRolloutFlag` (TASK-780 patrón canónico) para los 2 flag
 * keys del workspace:
 *   - `organization_workspace_shell_agency` (Agency entrypoint, TASK-612)
 *   - `organization_workspace_shell_finance` (Finance entrypoint, TASK-613)
 *
 * Sólo cuando emerja una 4a flag fuera del scope home/workspace, evaluar
 * generalización a `feature_rollout_flags`. V1.1 mantiene una sola tabla
 * (`greenhouse_serving.home_rollout_flags`) con CHECK whitelist.
 *
 * Cache TTL 30s in-memory (heredado de resolveHomeRolloutFlag). Invalidación
 * via outbox events del store de TASK-780.
 *
 * **Server-only** por construcción — el shell consume esta decision RSC y la
 * pasa al cliente.
 */

export type WorkspaceShellScope = 'agency' | 'finance'

const FLAG_KEYS: Record<WorkspaceShellScope, 'organization_workspace_shell_agency' | 'organization_workspace_shell_finance'> = {
  agency: 'organization_workspace_shell_agency',
  finance: 'organization_workspace_shell_finance'
}

/**
 * Resuelve si el shell del Organization Workspace está habilitado para
 * un subject + scope (entrypoint). Default disabled (staged rollout).
 *
 * El consumer (page.tsx server-side) usa el resultado para decidir entre:
 *  - true → render `<OrganizationWorkspaceShell>` con el FacetContentRouter
 *  - false → render legacy `<OrganizationView>` (preservar zero-risk cutover)
 */
export const isWorkspaceShellEnabledForSubject = async (
  subject: HomeRolloutSubject,
  scope: WorkspaceShellScope
): Promise<boolean> => {
  const flagKey = FLAG_KEYS[scope]
  const resolved = await resolveHomeRolloutFlag(flagKey, subject)

  return resolved.enabled
}

export { type HomeRolloutSubject } from '@/lib/home/rollout-flags'
