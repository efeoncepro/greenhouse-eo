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
