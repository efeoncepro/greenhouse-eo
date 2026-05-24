export const GH_GITHUB_BILLING_COPY = {
  title: 'Costo GitHub Actions',
  subtitle: 'Lectura read-only de GitHub Billing Usage API; sin persistencia propia.',
  status: {
    configured: 'Activo',
    awaiting_data: 'Esperando datos',
    not_configured: 'Sin configurar',
    error: 'Error'
  },
  totalLabel: (startDate: string, endDate: string) => `Uso ${startDate} -> ${endDate}`,
  latestLabel: (latestDate: string) => `ultimo usage: ${latestDate}`,
  forecastTitle: 'Forecast mensual',
  guardrailsTitle: 'Guardrails',
  actionsTitle: 'Actions',
  topSkusTitle: 'SKUs principales',
  topReposTitle: 'Repositorios principales',
  unavailableFallback: 'GitHub Billing no rinde datos todavia.',
  thresholdsUnconfigured: 'Sin umbrales configurados; lectura informativa.',
  spikeClear: 'Sin spike diario sobre el umbral configurado.'
}
