# TASK-2008 — Resumen cliente: GSC y AEO con evidencia propia

## Meta

- Status: `ready-for-implementation`
- Owner task: TASK-2008
- Product Design asset: `docs/ui/visual-directions/TASK-1690-client-population/propuesta-1-aeo-disponible.png`
- Visual direction mode: `source-led`
- Intended consumers: cliente contratado SEO, mono-org; mockups autenticados de ejemplo.
- Copy source: `src/lib/copy/growth.ts` / GH_GROWTH_SEO_CLIENT
- Primitive decision: reuse analyticsReport/WorkbenchHeader/SignalStrip/OperationalSection/charts.
- UI ready target: `yes`; implementación condicionada al contrato TASK-1690 y goal.

## Brief

Usuario cliente. Leer resultado orgánico y evaluación AEO del dominio con fuentes/cortes independientes.
No configurar capturas, producir contenidos ni recibir un score combinado.

## Desktop Target — 1440×1024

Preservar sidebar y utilidad de sesión actuales. Cabecera compacta en plano propio: breadcrumb,
título corto «Tu visibilidad en Google y en IA», período GSC y tabs. Primer datum antes de más chrome.
Una hoja principal: GSC domina2/3 con clics, CTR e impresiones integrados y barras de días observados;
AEO1/3 como sección abierta con análisis, índice del dominio y corte propio. Sin tarjeta dentro de tarjeta.
Fuente/cobertura inline debajo; no afirmar «último dato» global que aplique GSC a AEO/rank.

## Mobile Target — 390×844

Título/período → conclusión válida → clics/CTR → análisis AEO disponible → acción/cobertura → observaciones.
Gráfico diario recompuesto o tabla accesible en poca muestra, sin encoger ejes hasta ilegibilidad.
Sidebar colapsada por shell actual. Tabs recorren tres destinos; textos pueden wrap sin truncar números.
Sin desplazamiento horizontal de página; touch/focus nativos, cobertura enfocable.

## Action Hierarchy

- Primary: Ver cobertura, desplaza/enfoca su encabezado inline.
- Secondary: tab Evolución y Ver SEO × AEO (si cruce disponible).
- Destructive: ninguna.
- Selection vs action: tab cambia lectura, no ejecuta captura ni cambios de datos.
- Pending/disabled: declarar la razón de ausencia; no mostrar un CTA sin destino/evidencia.

## Visual Fidelity Mapping

| Source cue | Token / primitive | Intent preserved | Literal rejected |
| --- | --- | --- | --- |
| Hoja ejecutiva | analyticsReport/CompositionShell | Evidencia agrupada y abierta | Dimensiones fijas del PNG |
| Clics dominantes | SignalStrip integrated/Geist kpi-value | Primera señal medida | Número540 de ejemplo |
| Azul primaria | theme.palette.primary | Acción única | HEX inline |
| AEO lateral | OperationalSection open | Dominio y fecha propios | Card anidada/índice42 inventado en runtime |
| Corte por fuente | metadata/copy central | Frescura honesta | Globalizar fechaGSC |

## Layout Skeleton

| Región | Slot | Candidate | Data |
| --- | --- | --- | --- |
| Cabecera | header | WorkbenchHeader report | org, ventanaGSC, tabs |
| Señal GSC | primary | SignalStrip integrated | gscMetrics/cobertura |
| Serie | primary | chart canónico+tabla | sólo días observados |
| AEO | aside/integrada | OperationalSection open | resumen AEO client-safe |
| Fuentes | primary/band | filas abiertas | coverage por fuente |

## Copy Ledger

| Copy id | Texto / regla | Variables |
| --- | --- | --- |
| page.title | Tu visibilidad en Google y en IA | none |
| summary.clicks | Clics desde Google | clicks/source |
| summary.ctr | CTR | ratio; null sin impresiones |
| summary.firstPeriod | Primer período con datos | previous:null |
| summary.coverage | Ver cobertura / días con datos | capturedDays/requestedDays |
| summary.aeo | Visibilidad en IA / Análisis disponible / Último análisis | score/asOf |
| summary.rankPending | El seguimiento de posiciones todavía no inició | coverage reason |
| summary.sourceFailure | No pudimos actualizar esta fuente | error code seguro |
| navigator | Resumen / Evolución / SEO × AEO | selected section |

## State Copy

| State | Copy visible | Recuperación |
| --- | --- | --- |
| ready | Análisis disponible; fuente y fecha propias | Ver cobertura, Evolución o cruce si disponible |
| loading | Cargando resultados | Skeleton gobernado; esperar lectura de servidor, sin cifra provisional |
| empty | Todavía no hay datos de esta fuente | Explicar cobertura; mantener otras fuentes y revisar con el equipo |
| partial | Hay resultados disponibles; una fuente no pudo actualizarse | Conservar regiones válidas y mostrar fecha/razón por fuente |
| error | No pudimos actualizar esta fuente | Reintento de lectura por recarga; nunca iniciar captura pagada |
| denied | No tienes acceso a esta vista | Estado server-side existente y regreso a un destino autorizado |

Ready muestra fuente/corte; onboarding declara rank pendiente con AEO disponible si medido;
no GSC mantiene AEO/rank y su razón; no AEO declara falta de análisis de esta org/período;
partial conserva regiones válidas; stale muestra fecha sin apariencia de nuevo dato; locked usa
estado server-side existente. Ningún copy de «Próximamente» para capacidades que existen.

## Accessibility Contract

Un h1 y secciones h2. Charts con tabla/texto alternativo y nombres de unidad/origen.
Tabs MUI accesibles; región de cobertura tabIndex=-1 para foco programático sin tabstop redundante.
Fuente, estado y estimación escritos, no sólo color/símbolo. Números tabulares Geist.

## Implementation Mapping

- Route/surface: `/growth/seo`, vista existente SeoClientDashboardView.
- Primitives/variants: analyticsReport; WorkbenchHeader report; SignalStrip integrated; OperationalSection open.
- Component candidates: resumen local reemplaza SummaryDetail; no nueva primitive platform.
- Copy source: GH_GROWTH_SEO_CLIENT en src/lib/copy/growth.ts.
- Data: readSeoClientSurface/TASK-1690; canónicos readSeoOverviewKpis/readClientGraderReport.
- API parity: presentación del DTO, sin SQL/provider/fórmulas ni comando nuevo.
- Access: sesión/tenant/capability/assignment actuales; fixtures exclusivamente autenticados.
- Print/PDF: preservar adapter legacy; Insights conserva su renderer/transporte.
- GVC markers: seo-client-dashboard/summary/source-coverage/gsc-evidence/aeo-evidence.

## GVC Scenario Plan

Quality profile: premium. Scenario growth-seo-client-mockup por fixture.
Desktop evidence: 1440×1024. Mobile evidence: 390px, 390×844.
Capturas summary/cobertura/tabs, estados onboarding+AEO, AEO-only, rank-only, partial, sparse/stale,
cero medido y locked; assert presencia de datos válidos y ausencia de números fabricados.
scrollWidth≤clientWidth; teclado tabs, foco CTA y reduced-motion.
Review dossier: docs/ui/reviews/TASK-2008-growth-seo-client-evidence/.
Baseline surface ID: task1690-option1-aeo-available; selected PNG al mismo viewport/estado.

## Design Decision Log

Operador eligió1 corregida el05oct; deferidas2 readiness y3 prioridades. Reuso del sistema Greenhouse
preserva claridad desde la primera captura. Resumen AEO independiente evita confundir gap no disponible
con AEO no disponible. Riesgo del PNG: barras/labels sintéticos; code deriva gráficos de datos.
UIready describe contrato, no calidad final o rollout.
