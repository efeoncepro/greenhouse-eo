export const GH_VERCEL_BILLING_COPY = {
  title: 'Costo Vercel (Billing FOCUS)',
  subtitle: 'Lectura read-only de Vercel Billing FOCUS v1.3; sin persistencia propia.',
  status: {
    configured: 'Activo',
    awaiting_data: 'Esperando datos',
    not_configured: 'Sin configurar',
    error: 'Error'
  },
  totalLabel: (days: number) => `Total ${days} dias`,
  periodLabel: (startDate: string, endDate: string, latestDate: string) =>
    `${startDate} -> ${endDate} · ultimo cargo: ${latestDate}`,
  forecastTitle: 'Forecast mensual',
  guardrailsTitle: 'Guardrails',
  topServicesTitle: 'Servicios principales',
  topProjectsTitle: 'Proyectos principales',
  unavailableFallback: 'Vercel Billing no rinde datos todavia.',
  thresholdsUnconfigured: 'Sin umbrales configurados; lectura informativa.',
  spikeClear: 'Sin spike diario sobre el umbral configurado.'
}
