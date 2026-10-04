# TASK-1905 — aviso de canales en Hoy

Estado: referencia ui-lite de la composición existente; sin nuevo layout.

```text
[icono alerta] CMP-… · Canales
N hallazgos de canal
Texto de advertencia: revisar H límites o canales sin validar.
[Revisar campaña →]
```

Reutiliza `DecisionView` y tarjeta de `apps/web/src/app/page.tsx` en Marketing Studio, con copy en
`apps/web/src/copy.ts`. Color/espaciado/typography/iconografía existentes. Aparece sólo cuando el reader
retorna hallazgos de revisiones vigentes de una campaña visible. Hard usa tono critical, resto warning.
El CTA navega a la campaña existente. Sin nuevo flujo/motion. QA desktop/mobile en runtime local; no aceptación
visual ni despliegue implícitos. Administración del catálogo permanece en TASK-1912.
