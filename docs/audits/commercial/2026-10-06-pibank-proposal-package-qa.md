# QA Release Audit - Pibank, paquete de propuesta 2027

## Verdict

**PASS — preparación local para revisión.**

Closure state: **complete** para las tres etapas autorizadas de preparación. Cotización, aceptación bancaria, implementación y distribución no forman parte de este cierre.

## Scope

- Research público y demanda real por CLI canónica; modelo editable; fuentes y renders del memo, deck y anexo; contenido y preview DEV X-Ray.
- Expediente: [caso 2027](../../commercial/prospects/banco-pichincha-peru-seo-2026/BUSINESS-CASE-2027.md), [índice](../../commercial/prospects/banco-pichincha-peru-seo-2026/README.md) y [manifest de entrega](../../commercial/prospects/banco-pichincha-peru-seo-2026/propuesta/delivery-manifest.json).
- Runtime revisado: Think DEV, loopback `127.0.0.1:4355`, fixture con case externo. Think conserva checkout limpio y el renderer existente.
- Checkout compartido con cambios ajenos de HubSpot, licitaciones, tareas y producción creativa. No se sobrescribieron ni se incluyeron en un commit. No hubo commit, push, CRM/Notion write, envío, publicación ni deploy.
- La primera fase y actualización de cuatro skills se conserva en [auditoría documental](2026-10-06-pibank-business-case-documentation.md).

## Risk Classification

| Riesgo | Nivel | Alcance y control |
| --- | --- | --- |
| Evidencia y economía comercial | Medio | Modelo condicionado; cifras observadas y supuestas separadas; ROI/CAC N/D; no oferta aprobada |
| Información financiera al ahorrador | Medio | Fuentes oficiales fechadas; contenido candidato, sujeto a revisión bancaria; no recomendación financiera personalizada |
| Render de documentos y demo | Medio | Render existente y fuentes oficiales; guardas de desborde, revisión de píxeles y navegación desktop/móvil |
| Documentación/skills | Bajo–medio | Espejos y continuidad; no cambio de autoridad, contratos financieros o agentes |

## Injected Skills

- `seo-aeo`, `seo-aeo-practice`, `dataforseo-operator`: investigación, método y procedencia.
- `efeonce-customer-model-operator`, `efeonce-pricing-operator`: decisiones del comprador, costos separados y límites de pricing.
- `deck-studio`, `report-studio`, `axis-design-system`: catálogo de slides, A4, assets oficiales y tokens del SSOT.
- `astro`, `greenhouse-browser-diagnostics`: fixture de otro runtime; Playwright enfocado, sin bifurcar Think ni motor.
- `greenhouse-documentation-governor`, `greenhouse-qa-release-auditor`: continuidad y dictamen. No cambios en ledger/accounting/runtime bancario.

## Evidence

| Gate | Resultado | Evidencia |
| --- | --- | --- |
| Demanda | PASS | [Research](../../commercial/prospects/banco-pichincha-peru-seo-2026/research/PIBANK-DEMAND-2026-10-06.md): 127 keywords, 113 con volumen, 14 nulos; proxy histórico seleccionado 3.900/mes; costo real USD0,07714; cuatro SERP completos |
| Modelo | PASS | [Validation](../../commercial/prospects/banco-pichincha-peru-seo-2026/modelo/validation.json): 12 pruebas nativas LibreOffice, selector, driver último mes, Finance, costos/driver ausentes y cero; siete hojas revisadas; fórmulas y cachés conciliados |
| Root readback XLSX | PASS | SHA del workbook concuerda con validation; siete hojas; Base 13,879125 fondeadas; fórmula Resumen D10 preservada; D19/D20 N/D |
| Revisión comercial independiente | PASS tras corrección | [Revisión](../../commercial/prospects/banco-pichincha-peru-seo-2026/propuesta/REVISION-COMERCIAL-2026-10-06.md): cifras coherentes; «hito por acordar», dependencias CAC/ROI y decisión M1 corregidas en fuente/render |
| Memo y anexo | PASS | `node .../propuesta/render-src/build-package.mjs`: memo 2 páginas y anexo 7, fuentes cargadas, cero desbordes/imágenes rotas; PDF con texto buscable en todas las páginas, contacto/pie institucional |
| Deck | PASS | `pnpm deck:compose .../propuesta/deck-plan.json --out <directorio interno>`: doce slides, catálogo `deck-axis`; slots y overflow aceptados; PDF 12 páginas con texto buscable |
| QA visual | PASS local | `.captures/pibank-propuesta-2027/memo/`, `annex/`; doce PNG del deck bajo paquete interno. Contact sheets + páginas densas inspeccionadas; fuentes, contraste de logo Pibank y cortes corregidos |
| X-Ray | PASS DEV | [QA específica](../../commercial/prospects/banco-pichincha-peru-seo-2026/demo/QA-DEV-2026-10-06.md): 183/183 + 21/21 checks, 16 combinaciones desktop/móvil × dos piezas × cuatro pasos; inspector, teclado, derivados, no-JS, motion, headers y schema inerte; cero errores JS |
| Sintaxis helpers | PASS | `node --check` en los dos generadores de propuesta |
| Skills | PASS | `pnpm skills:mirrors`; `pnpm mcp:skills:check` sin regeneración necesaria |
| Docs/QA advisory | PASS | `pnpm docs:closure-check`: cero warnings documentales; flags/índice/inventario PASS. `pnpm qa:gates --changed --agent codex --docs -- <caso>` identifica dominio documental; auditor especializado emite este dictamen |
| Operación | PASS con warnings ajenos | `pnpm ops:lint --changed`: cero errores, warnings de paridad de tasks/epics ajenos al caso; no corregidos por esta unidad |
| Cierre scoped/continuidad | PASS | `node scripts/check-documentation-closure.mjs --strict -- <paths propios>`; enlaces, `git diff --check` y `pnpm docs:context-check:strict` repetidos tras integración final |

El guard inicial de PDF se ejecutaba antes de solicitar fuentes; la inspección visual detectó que el texto posterior desbordaba. Se corrigió esperando explícitamente las fuentes antes de paginar, se compactó el memo y se regeneraron todos sus renders. El contraste incorrecto de la variante de logo se resolvió usando los SVG oficiales adecuados sin recolorearlos. La demo corrigió overflow sólo en el payload, añadiendo una cuarta columna semántica a la tabla para evitar activar la plantilla de tasas. No se modificaron catálogos ni componentes.

## Blockers

Ninguno para revisar los artefactos locales. No se declara propuesta económica final, aprobación bancaria o publicación lista para producción.

## Conditional Follow-Ups

1. Confirmar con el banco moneda, periodo, definición de cuentas/saldo, ticket, fuente de fondeo y responsable económico. USD38m sigue inferencia del operador.
2. Ampliar y validar demanda elegible y datos privados; los escenarios 2,12 / 13,88 / 40,15 son pruebas condicionadas y no sostienen prometer el 1% de la meta.
3. Cerrar alcance, criterios, costo y responsables de M1. Semestre y 995,9 h son candidatos: faltan tarifas, costos y disponibilidad. Finance debe valorar el fondeo antes de ROI/payback.
4. Revisar claims, CTA y contenido Pibank; faltan kit/licencias y medios aprobados para acabado de marca. Demo usa system-sans y assets vacíos. No aprobar imagen/video inexistentes.
5. Revisar materiales antes del 09/10; siguiente reunión/gerencia según calendario expresado (semanas 12/19). No se enviaron comunicaciones.

## False-Closure Traps Checked

- Pruebas verdes no se convierten en forecast, causalidad ni retorno confirmado. Saldo ≠ ingreso; citas IA ≠ cuentas.
- Hay capturas reales e interacción. GVC Greenhouse no se usó: fixture pública local en otro runtime; scripts Playwright y explicación están en QA DEV.
- No flags, migración, deploy o publicación requeridos para esta preparación. Preview local no es link compartible con el banco.
- Handoff, changelog, índices y expediente se actualizan con estados locales; no se mueve una tarea a complete por inferencia.
- No se certifica onboarding, Excel Desktop, dispositivos físicos, WCAG integral, CWV de campo, analítica privada ni observabilidad de producción.

## Final Call

Las tres etapas tienen entregables concretos, trazables y verificados para revisión de Julio. La decisión comercial recomendada es M1 acotado con aceptación y gate de continuidad. El retorno, precio y contratación se definen con los datos y responsables faltantes; el paquete no oculta esos límites ni los resuelve con supuestos presentados como hechos.
