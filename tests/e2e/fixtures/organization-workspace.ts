import { expect, type Page } from '@playwright/test'

type WorkspaceShellReadyOptions = {
  requiredTabs: string[]
  forbiddenTabs?: string[]
  positiveMarkers?: string[]
  timeoutMs?: number
}

/**
 * Canonical readiness gate for Organization Workspace V2 smoke checks.
 *
 * The V2 page has two phases:
 * 1. server projection is already resolved;
 * 2. client-side organization detail/KPI fetch finishes and mounts the shell.
 *
 * Anti-regression assertions must run after phase 2. Checking for tabs before
 * this point creates false failures where both V2 and legacy markers are absent.
 */
export const expectOrganizationWorkspaceShellReady = async (
  page: Page,
  {
    requiredTabs,
    forbiddenTabs = [],
    positiveMarkers = ['Revenue', 'Margen bruto'],
    timeoutMs = 20_000
  }: WorkspaceShellReadyOptions
) => {
  for (const marker of positiveMarkers) {
    await expect(
      page.getByText(marker, { exact: true }).first(),
      `Organization Workspace V2 marker "${marker}" debe estar visible antes de validar tabs`
    ).toBeVisible({ timeout: timeoutMs })
  }

  await expect(
    page.getByText('Workspace en modo degradado'),
    'Organization Workspace no debe quedar en modo degradado cuando el shell V2 está habilitado'
  ).toHaveCount(0, { timeout: timeoutMs })

  for (const tabName of requiredTabs) {
    await expect(
      page.getByRole('tab', { name: tabName }),
      `Organization Workspace V2 debe exponer la tab "${tabName}"`
    ).toBeVisible({ timeout: timeoutMs })
  }

  for (const tabName of forbiddenTabs) {
    await expect(
      page.getByRole('tab', { name: tabName }),
      `Organization Workspace V2 no debe exponer la tab legacy "${tabName}"`
    ).toHaveCount(0, { timeout: timeoutMs })
  }
}

type EnterpriseWorkspaceReadyOptions = {
  /** Facet rail labels rendered as cards (text), e.g. 'Identidad', 'CRM', 'Servicios'. */
  requiredFacets: string[]
  /** Legacy OrganizationView role=tab names that must be absent (anti-regression). */
  forbiddenLegacyTabs?: string[]
  /** Enterprise KPI strip markers (exact text). */
  positiveMarkers?: string[]
  timeoutMs?: number
}

/**
 * Canonical readiness gate for the Organization Enterprise Workspace Runtime
 * (TASK-1016 / TASK-1059), the surface that replaced the TASK-612 facet-tab V2
 * shell on the Agency entrypoint (`AgencyOrganizationWorkspaceClient` ->
 * `OrganizationEnterpriseWorkspaceRuntime`).
 *
 * Differences vs `expectOrganizationWorkspaceShellReady` (still used by the
 * Finance clients route, which keeps the V2 facet-tab shell):
 *   - KPI strip labels are "Revenue período" / "Margen bruto" / "FTE total"
 *     (not the exact "Revenue" the V2 shell used).
 *   - Facets render as a clickable card rail (text), NOT MUI `role='tab'` tabs.
 *
 * Invariants preserved from the original TASK-612 V1.1 smoke:
 *   1. NO degraded mode banner (ISSUE-071 anti-regression).
 *   2. Canonical workspace markers visible (enterprise KPI strip).
 *   3. Anti-regression vs legacy `OrganizationView` (its `role='tab'` tabs absent).
 */
export const expectOrganizationEnterpriseWorkspaceReady = async (
  page: Page,
  {
    requiredFacets,
    forbiddenLegacyTabs = [],
    positiveMarkers = ['Revenue período', 'Margen bruto'],
    timeoutMs = 20_000
  }: EnterpriseWorkspaceReadyOptions
) => {
  for (const marker of positiveMarkers) {
    await expect(
      page.getByText(marker, { exact: true }).first(),
      `Organization Enterprise Workspace marker "${marker}" debe estar visible antes de validar facets`
    ).toBeVisible({ timeout: timeoutMs })
  }

  await expect(
    page.getByText('Workspace en modo degradado'),
    'Organization Enterprise Workspace no debe quedar en modo degradado'
  ).toHaveCount(0, { timeout: timeoutMs })

  // Facet labels appear many times across the rich enterprise runtime (KPI
  // helpers, tables, drawers), so scope the assertion to the canonical facet
  // rail nav (`data-capture` test hook) — unambiguous and meaningful.
  const facetRail = page.locator('[data-capture="organization-enterprise-facet-rail"]')

  for (const facet of requiredFacets) {
    await expect(
      facetRail.getByText(facet, { exact: true }).first(),
      `Organization Enterprise Workspace debe exponer el facet "${facet}" en el facet rail`
    ).toBeVisible({ timeout: timeoutMs })
  }

  for (const tabName of forbiddenLegacyTabs) {
    await expect(
      page.getByRole('tab', { name: tabName }),
      `Organization Enterprise Workspace no debe exponer la tab legacy "${tabName}"`
    ).toHaveCount(0, { timeout: timeoutMs })
  }
}
