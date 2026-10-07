# TASK-2008 — Resumen cliente SEO con evidencia GSC y AEO independiente

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `yes`
- Wireframe: `docs/ui/wireframes/TASK-2008-growth-seo-client-evidence.md`
- Flow: `docs/ui/flows/TASK-2008-growth-seo-client-evidence-flow.md`
- Motion: `docs/ui/motion/TASK-2008-growth-seo-client-evidence-motion.md`
- Backend impact: `none`
- Epic: `EPIC-022`
- Status real: `Diseno` — operador seleccionó la opción1 corregida el 2026-10-05; contratos preparados. Goal/task-hook e implementación pendientes.
- Rank: `TBD`
- Domain: `growth`
- Blocked by: `TASK-1690`
- Branch: `develop` existente; sin worktrees ni cambio de branch
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Materializa la opción1 corregida: resultados Search Console y análisis AEO disponibles de forma
independiente, con ventana/corte propios. La ausencia de seguimiento rank no borra GSC ni AEO.
El cliente entiende evidencia/cobertura y navega a evolución y al cruce existente.

## Why This Task Exists

El Resumen actual atribuye señales rank a Search Console y su página corta por ausencia GSC.
TASK-1690 entrega el contrato por fuente; esta task es su consumidor visual separado.
El operador recordó que AEO ya existe: ausencia es estado por organización, no producto futuro.

## Goal

- Implementar la dirección seleccionada en el portal existente, con gráficos desde datos reales/fixtures.
- Hacer visibles cobertura, cortes, cero medido, primera ventana y fallos parciales sin señales fabricadas.
- Validar desktop1440 y mobile390, interacciones/teclado, fuente/copy y no-regresión de rutas hermanas.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md`.
- `docs/architecture/GREENHOUSE_SEO_SEARCH_VISIBILITY_360_DECISION_V1.md`.
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`.
- `docs/architecture/GREENHOUSE_COMPOSITION_SHELL_DECISION_V1.md`.
- `docs/architecture/agent-invariants/UI_FEATURE_AGENT_INVARIANTS.md`.
- `docs/architecture/ui-platform/README.md` y `PRIMITIVES.md`.

## Normative Docs

- `DESIGN.md`; `docs/context/00_INDEX.md`; `docs/tasks/TASK_UI_UX_ADDENDUM.md`.
- `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md`.
- `docs/audits/seo/2026-10-04-task-1690-discovery.md`.
- `docs/ui/visual-directions/TASK-1690-client-population/README.md`.

## Dependencies & Impact

### Depends on

- TASK-1690: contrato local por fuente, KPIs GSC/previous, resumen AEO independiente y fixtures.
  Es dependencia de esos slices; no esperar el rollout completo para construir el consumidor local.
- TASK-1310 complete: rutas y consumidores existentes. No reabrirla.

### Blocks / Impacts

Primera experiencia cliente y estados nuevos de `/growth/seo`; report legacy conserva compatibilidad.

### Files owned

- `src/views/greenhouse/growth/seo/client/SeoClientDashboardView.tsx` y subcomponentes locales.
- `src/app/(dashboard)/growth/seo/page.tsx` (presentación; no alterar autoridad).
- `src/lib/copy/growth.ts` bloque `GH_GROWTH_SEO_CLIENT`.
- `scripts/frontend/scenarios/growth-seo-client-mockup*.scenario.ts`.
- Estos contratos/wireframe/flow/motion y dossier de revisión.

## Current Repo State

### Already exists

Dashboard, evolución, quadrant, mockup autenticado, CompositionShell y copy centralizado.
Fuente visual seleccionada persistida; discovery con 53 tests baseline PASS.

### Gap

No consumer de cobertura/metrics por fuente, lecturas de GSC/rank confundidas y empty global.
El cruce gap requiere SEO; no sirve como sustituto del análisis AEO independiente.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/views/greenhouse/growth/seo/client/` dentro del portal existente.
- Future candidate home: `portal`
- Boundary: browser consume DTO client-safe de TASK-1690; no fórmulas, SQL, SDK ni comandos nuevos.
- Server/browser split: tenant/readers server-only; presentación y estado de tabs browser-safe.
- Build impact: ninguno; reusar dependencias y shell MUI/Vuexy existentes.
- Extraction blocker: `none`.

## UI/UX Contract

### Experience brief

UI rigor: `ui-standard`. Cliente contratado, mono-org. Leer qué resultado existe y qué fuente falta.
Estado principal muestra GSC y AEO; rank pendiente es un caso de población, no una promesa de producto.

### Surface & system decision

Surface `/growth/seo`. Nav placement: `none`; conservar el destino SEO y tabs existentes.
Composition Shell aplica: `SurfaceRecipe analyticsReport`, header `WorkbenchHeader report` fuera de primary.
Primitive decision `reuse`: SignalStrip integrated, OperationalSection open, EmptyState y chart canónico.
Adaptive density/The Seam aplica por región. Sin nuevo drawer/dialog, una sección inline de cobertura.
Copy source `src/lib/copy/growth.ts`. Access impact: `none`; preservar capability/assignment/tenant.

### State inventory

Default GSC+AEO; onboarding sin rank; rank-only; AEO-only; ninguna; conectado sin capturas;
sparse/stale; fallo parcial; cero medido; previous null; locked; nombres largos; desktop/mobile.
Estados de permiso no se deciden en React. No inventar score AEO ni posición cero.

### Interaction contract

Tabs MUI con flechas/Enter, selección visible. «Ver cobertura» lleva a sección inline y restaura
contexto por encabezado enfocable. «Ver SEO × AEO» selecciona el tab existente cuando hay cruce.
Sin comandos de negocio ni nuevas rutas. CTA de cruce ausente si no hay evidencia suficiente.

### Motion & microinteractions

Motion primitive CSS/tokens actuales, sin nuevo showpiece ni counters animados. Transición de tabs
preserva wrappers gobernados; reduced-motion evita desplazamiento animado y transición espacial.
Ver contrato de motion. No nuevos Framer/GSAP/Lottie.

### Implementation mapping

Route `/growth/seo`; consumer `SeoClientDashboardView` y resumen local.
Primitives: recipe analyticsReport, WorkbenchHeader report, SignalStrip integrated, secciones abiertas.
Copy GH_GROWTH_SEO_CLIENT. Reader `readSeoClientSurface`; fórmulas y estados los entrega TASK-1690.
API parity: sólo navegación/lectura del mismo contrato; sin endpoint por widget ni acción UI-only.
Access: sesión cliente, routeGroup client, capability read_client/read/own, module seo_v2.
Estados completos enumerados arriba. Tabla/texto alternativo a charts y fuente/asOf por región.

### GVC scenario plan

Scenario existente `growth-seo-client-mockup` ampliado por familia; ruta mockup autenticada.
Quality profile: premium. Viewports 1440×1024 y 390×844. Capturar summary, cobertura, evolución,
quadrant, onboarding/AEO disponible, rank-only, AEO-only, parcial, sparse/stale y locked.
Markers seo-client-dashboard/summary/source-coverage/gsc-evidence/aeo-evidence.
Assert no datos falsos/scroll horizontal; teclado tabs, foco cobertura y reduced-motion.
Dossier `docs/ui/reviews/TASK-2008-growth-seo-client-evidence/`; baseline imagen seleccionada.

### Design decision log

Opción1 corregida seleccionada por operador; 2 prioriza readiness y3 prioriza cola, ambas diferidas.
La hoja ejecutiva da valor desde la primera medición y conserva AEO existente. Reuso de primitives,
sin nueva plataforma o copies de shell. Riesgos: fuente/corte incorrectos, muestra escasa y eje AEO
de dominio presentado como keyword-level. Mitigación: contrato/fixtures y comparación visual.

<!-- ZONE 2 — PLAN MODE: plan conjunto preparado; goal pendiente -->

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Primera lectura y cobertura

Cabecera compacta, métricas GSC integradas, gráfico desde observaciones y AEO con evidencia/corte propio.
Cobertura inline y estados declarados; normalizar la data/geometría defectuosa del mock generativo.

### Slice 2 — Recorrido y estados

Tabs existentes, recuperación parcial, tablas alternativas, fuentes largas/mobile y fixtures.
Evolución rank conserva procedencia estimada. No modificar la fórmula o granularity del quadrant.

### Slice 3 — Verificación y continuidad

QA local y dossier; source/prototype al mismo viewport y estado; registrar rollout pendiente.

## Out of Scope

Fuentes/DB/providers/scoring (TASK-1690), publicación editorial (Studio), segundo motor de informes
(Insights), nuevas rutas, flips, captura pagada, deploy. La brecha de view revocation del discovery
requiere issue y canary propios; no cambiar auth dentro de esta presentación.

## Detailed Spec

Wireframe/flow/motion son la especificación visible. Las imágenes son dirección visual, no datos.
Si no hay cobertura GSC, clicks/CTR ausentes explícitos. Cero sólo con evidencia. AEO se lee desde
su resumen client-safe independiente aunque no exista el cruce gap; sin promedio SEO/AEO.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

TASK-1690 contrato+fixtures+tests → Slice 1 → Slice 2 → Slice 3. Guard/capability/assignment actuales
intactos; dependencia desbloqueada con evidencia local del contrato, sin simular un cierre operativo.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
| --- | --- | --- | --- | --- |
| Ausencia presentada como cero | UI | medium | Fixtures por cobertura y assertions contra DTO | Tests de población |
| Corte/fuente SEO aplicado a AEO | UI | medium | Readers independientes y fecha por región | Tests de atribución |
| Desbordamiento o foco perdido en móvil | UI | medium | Capturas390, teclado y reduced-motion | GVC premium |
| Revocación individual no aplicada por guard heredado | Client Portal | known gap | Issue/canary propio previo al release | Prueba allow/deny/revoked |

### Feature flags / cutover

Sin flag nuevo — presentación aditiva sobre el módulo SEO existente; conserva los guards actuales.
Promoción por release gobernado después de canaries; este trabajo no activa flags ni despliega.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
| --- | --- | --- | --- |
| 1 | Revert del consumidor visual; DTO aditivo permanece | Un release gobernado | Sí |
| 2 | Revert tabs/cobertura/copy; conserva lectores | Un release gobernado | Sí |
| 3 | Evidencia no modifica runtime | Inmediato | Sí |

### Production verification sequence

1. QA local de contrato/UI y GVC PASS.
2. Release a staging por owner autorizado; canary cliente real y no-regresión.
3. Canary de revocación por owner Client Portal, resolviendo la brecha antes de producción.
4. Promoción autorizada a producción y readback de fuentes/cortes/estados por organización.

### Out-of-band coordination required

Canary cliente y revocación coordinados con Client Portal; ningún proveedor requiere nuevas escrituras.
No declarar complete sin sus evidencias; local puede quedar code complete, rollout pendiente.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] Resumen usa GSC clics/CTR y AEO independiente con corte real por fuente.
- [ ] Rank pendiente no borra GSC/AEO; missing, cero medido y previous null son distintos.
- [ ] Tabs, cobertura y acceso al cruce funcionan con teclado y foco.
- [ ] Datos/estimaciones y cobertura parcial no se mezclan ni recalculan en UI.
- [ ] Fuente seleccionada respetada en desktop y390, sin scroll horizontal.
- [ ] Capturas/revisión premium: average≥4.5, ninguna dimensión<4; críticas≥4.5.
- [ ] Tests/tipos/build y no-regresión adecuados PASS; rollout/canaries pendientes registrados.

## Verification

Task/wireframe/flow/motion/readiness lint; pruebas del compositor y consumers; tipos/build;
GVC desktop/mobile con dossier, design-qa y scorecard; docs closure/context strict.

## Closing Protocol

Acceptance con evidencia, status/lifecycle e índices/epic sincronizados; sin push/deploy automáticos.

## Follow-ups

Canary de acceso/revocación y promoción: owner Client Portal/Release, previo a cierre operativo.

## Open Questions

Goal explícito propuesto pendiente; selección visual confirmada. Sin decisiones visuales abiertas.
