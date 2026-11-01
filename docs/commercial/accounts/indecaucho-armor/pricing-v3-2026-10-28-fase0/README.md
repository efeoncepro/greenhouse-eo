# ARMOR · Fase 0 de medición, valorizada y bonificada (Cotizador V3, 28/10/2026)

Simulación local con `pnpm --silent pricing:v3 compose quote --current` (oferta `performance-commerce-distribution`,
On-Demand, mercado EC, USD). **No es precio aprobado ni cotización emitida** (`requires_review`, exit 3).

- **Alcance:** las líneas de preparación de medición del escenario base del 27/10, en un solo período: ECG-031
  Implementación GA4/GTM 32 h, ECG-012 24 h, ECG-021 16 h (campos y ruta de lead en Kommo, sin flujos Zapier) y ECG-016
  8 h, todos CL. 80 horas. Asientos de Notion y Microsoft 365: uno por línea.
- **Resultado:** neto **US$3.090**, costo US$1.253, margen 59,4 %. Coincide con la diferencia entre el escenario base
  (US$22.450) y el escenario A sin preparación (US$19.360).
- **Decisión de Julio (28/10):** la Fase 0 se muestra valorizada en US$3.090 y **bonificada** (no se factura). El total
  del piloto queda en hasta US$27.260 (honorarios US$9.260 + medios hasta US$18.000).
- Archivos: `fase0.demand.json`, `fase0.artifact.json`, `fase0.summary.json`.
