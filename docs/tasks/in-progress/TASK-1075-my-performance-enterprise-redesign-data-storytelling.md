# TASK-1075 — Mi Desempeño: rediseño enterprise + data storytelling

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `EPIC-018`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui|delivery|ico|content|identity`
- Blocked by: `none`
- Branch: `task/TASK-1075-my-performance-enterprise-redesign`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

**Foundation + piloto** del EPIC-018 (sistema de dashboards de desempeño enterprise con storytelling, reusable cross-surface). Construye las **primitives reusables** —storytelling KPI card, hero score, marco temporal honesto, charts potentes— y las **pilotea en `/my/performance`** (Mi Desempeño). La adopción en las superficies hermanas (Agency ICO, Space 360, Person 360) vive en TASK-1076.

`/my/performance` hoy se ve como template plano 2018 y **no cuenta ninguna historia**: 9 números desconectados, sin comparación ni contexto, con una contradicción temporal que engaña (KPI cards muestran el mes en curso —junio, OTD 5%— mientras los trends muestran el mes cerrado —mayo, OTD 100%— en la misma pantalla, sin rótulo). El rediseño aplica una **espina narrativa** (cómo cerré → qué pasa este mes → qué hago), KPI cards con anatomía completa (sparkline + delta + meta + semáforo), marco temporal honesto, charts potentes y degradación por-slot. El colaborador debe **entender su situación de un vistazo**, no decodificar números sueltos.

**Las primitives nacen cross-surface por diseño** (data-agnósticas, mapeables a cualquier dominio ICO) para que TASK-1076 las adopte sin fork.

## Why This Task Exists

Auditoría enterprise (GVC real entrando como `daniela.ferreira@efeonce.org`, junio 2026, estado degradado; skills `greenhouse-ui-enterprise-review` + `modern-ui` + `dataviz-design` + `state-design` + `greenhouse-ux` + `info-architecture` + `product-design-loop`): **veredicto BLOCK**, promedio rubric ~2.0/5, 3 blockers. Tres causas raíz **estructurales, no cosméticas**:

1. **Cero data storytelling** — viola la regla de oro de dataviz ("nunca un número sin contexto"). `OTD% 5%` no dice vs qué meta, vs mes anterior, ni si es bueno/malo. No hay arco narrativo. Daniela no puede responder "¿cómo voy?".
2. **Modelo temporal incoherente que engaña** — KPI cards = junio en curso (1/23 tareas, OTD 5%); trend charts justo debajo = mayo cerrado (OTD 100%); sin marco que los distinga. Es un **bug de claridad P1** montado sobre lo estético. El contrato de modos temporales (TASK-776) es lo que falta.
3. **Madurez visual de template plano** — card blanca sobre blanco, borde hairline, cero profundidad (el sistema de elevación semántica TASK-1049 no se usa), cero acento, las 6 KPI cards son el `HorizontalWithAvatar` genérico de Vuexy. "Look 2018" que `modern-ui` marca como dated.

Subproblemas: el banner "Datos degradados" roba el hero (debería degradar por-slot); radar "Salud operativa" decorativo e ilegible (angle/area = baja precisión Cleveland-McGill); solo 2 de 6 métricas tienen trend; mobile = desktop apretado; semáforo color-only (a11y); RpA "—" se lee como roto.

Es la superficie self-service principal del colaborador — la cara de su propio desempeño. Merece el bar enterprise.

## Goal

- Espina narrativa que responde 3 preguntas en orden: **¿cómo cerré el último mes? → ¿qué pasa en el mes en curso? → ¿qué hago?** (hero score + live + acción Nexa + detalle).
- Las 6 KPI ICO con **anatomía completa** (nombre + valor tabular-nums + sparkline + delta vs período + meta + semáforo color+icono+label + drill).
- **Marco temporal honesto** explícito (mes cerrado vs mes en curso) — mata la contradicción OTD 5%/100%.
- Charts potentes y honestos (trends con meta + last-value; reemplazar el radar débil; anotar el donut CSC con insight).
- Degradación **por-slot** ("Pendiente" en la card afectada) en vez de banner-hero.
- El sistema (storytelling KPI card, marco temporal, hero score) nace como **primitives reusables data-agnósticas**, documentadas en `ui-platform/PRIMITIVES.md`, listas para que TASK-1076 las adopte en Agency/Space/Person 360 sin fork.
- Mobile real (no desktop apretado) + WCAG 2.2 AA + motion tier-apropiado.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `DESIGN.md` + `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` (AXIS, typography SoT TASK-1038, elevation roles TASK-1049, charts gov TASK-1041).
- `docs/architecture/ui-platform/README.md` + `PRIMITIVES.md` (MetricTrendCard, primitives existentes).
- Contrato de modos temporales TASK-776 (`temporalMode` snapshot/period/audit) — aplicar el patrón a este dashboard.
- `docs/architecture/GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md` (RpA/OTD/FTR son owned por Greenhouse; esta task NO cambia su cálculo, solo presentación).

Reglas obligatorias (skills de diseño):

- **NUNCA** pintar UI freehand — pasar por el `product-design-loop` (3 conceptos → elección → ruta real tokenizada) + GVC en loop desktop+mobile.
- **NUNCA** transcribir HEX/px/fontFamily crudos — tokens AXIS / variant SoT / spacing 4n / elevation roles / motion tokens. Lint: `no-hardcoded-hex-color` / `no-hardcoded-fontfamily` / `no-fontsize-inline-typography`.
- **NUNCA** un número sin contexto (dataviz): toda KPI lleva comparación + período explícito.
- **NUNCA** color como única señal (a11y): semáforo = color + icono + label.
- **NUNCA** mezclar mes-cerrado y mes-en-curso sin rótulo temporal por bloque.
- **NUNCA** mostrar `—`/`0` ambiguo cuando el estado es degradado: "Pendiente" con razón (state-design honest degradation per-slot).
- **NUNCA** cambiar el cálculo de las métricas ICO ni el bono — es presentación.
- **NUNCA** crear charts/cards paralelos cuando existe `MetricTrendCard` u otra primitive — usar/expandir (Primitive+Variants+Kinds).
- Toda string es-CL vive en `src/lib/copy/my-performance.ts` (`GH_MY_PERFORMANCE`) — validar con `greenhouse-ux-writing`; lint `no-untokenized-copy`.
- Una sola librería de charts (hoy conviven Apex+Recharts; no agregar una 3ª).

## Normative Docs

- `src/views/greenhouse/my/MyPerformanceView.tsx` — vista runtime actual.
- `src/lib/my-performance/dto.ts` — composición del DTO + readers.
- `src/lib/copy/my-performance.ts` — `GH_MY_PERFORMANCE`.
- `src/components/greenhouse/primitives/` (MetricTrendCard) + `src/components/greenhouse/NexaInsightsBlock.tsx`.
- Scenario GVC existente: `scripts/frontend/scenarios/task-1027-my-performance.scenario.ts`.

## Dependencies & Impact

### Depends on

- **TASK-1073** (Nexa self-view 2ª persona) — el bloque "acción" del rediseño consume la narrativa en 2ª persona. Si no shippeó, el bloque cae al fallback 3ª persona (honesto).
- **TASK-1074** (RpA suppressed honest microcopy) — la KPI card de RpA consume el microcopy honesto en vez de "—".
- `MetricTrendCard` primitive (existe) + `card-statistics` Vuexy.
- DTO `composeMyPerformance` (existe) — puede necesitar exponer delta/meta/temporal por métrica.

### Blocks / Impacts

- **TASK-1027** (My Performance rich self-service) — misma superficie; este rediseño la moderniza. Coordinar (TASK-1027 puede estar parcialmente shipped — verificar estado `[verificar]`).
- Superficies hermanas ICO (Agency, Space 360, Person 360) — pueden adoptar las primitives nuevas (storytelling KPI card, hero score, marco temporal). Follow-up, no V1.

### Files owned

- `src/app/(dashboard)/my/performance/mockup/**` (ruta mockup del rediseño)
- `src/views/greenhouse/my/MyPerformanceView.tsx` + `src/views/greenhouse/my/mockup/**`
- `src/lib/my-performance/dto.ts` (si requiere delta/meta/temporal)
- `src/lib/copy/my-performance.ts`
- `src/components/greenhouse/primitives/**` (primitives nuevas/expandidas: storytelling KPI, hero score)
- `scripts/frontend/scenarios/` (scenario GVC + baseline)
- `docs/` cierre

## Current Repo State

### Already exists

- `/my/performance` runtime (`MyPerformanceView.tsx`) con: header período, Resumen de foco (3 cards), Nexa Insights block, 6 KPI cards (`HorizontalWithAvatar` genérico), 2 trend cards (`MetricTrendCard`), Actividad, radar, donut CSC.
- DTO `composeMyPerformance` con readers ICO + Nexa + degradación honesta (`dataStatus`).
- `MetricTrendCard` primitive (sparkline + hover + tabular-nums + tabla sr-only).
- Scenario GVC `task-1027-my-performance` + ruta `/my/performance/mockup/runtime`.

### Gap

- KPI cards sin anatomía (sin sparkline/delta/meta/semáforo en 4 de 6).
- Sin hero score compuesto ni espina narrativa — secciones de igual peso.
- Sin marco temporal (cards junio vs trends mayo se contradicen).
- Radar débil; degradado como banner-hero; mobile apretado.
- `[verificar]` estado real de TASK-1027 (¿shipped, parcial?) para no pisar trabajo.
- `[verificar]` si el DTO ya expone delta/meta por métrica o hay que extenderlo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — product-design-loop: 3 conceptos → elección

- Generar 3 conceptos IA divergentes (`pnpm ai:image` quality medium, dir gitignored) sobre la dirección de arte de las skills: (A) score-hero dashboard, (B) narrative/story-first, (C) split temporal mes-cerrado|en-curso.
- `AskUserQuestion` → el operador elige uno o un mix. Confirmar mix exacto antes de codear.

### Slice 2 — Ruta mockup + espina narrativa

- `src/app/(dashboard)/my/performance/mockup/page.tsx` + view mockup con mock data tipada.
- Layout de la espina: HERO (score + veredicto semáforo + 3 movers, mes cerrado) → LIVE (mes en curso, rotulado parcial) → ACCIÓN (Nexa 2ª persona + CTA) → DETALLE.

### Slice 3 — Primitive: storytelling KPI card + hero score

- Expandir `MetricTrendCard` o nueva primitive `MetricStoryCard` (Primitive+Variants+Kinds): nombre + valor + sparkline + delta vs período + meta (reference line) + semáforo color+icono+label + drill. Aplicar a las 6 ICO.
- Hero score primitive (ICO compuesto + veredicto). Lab interno `/admin/design-system/<nombre>` si es platform-level.

### Slice 4 — Marco temporal honesto + estados por-slot

- Aplicar patrón TASK-776 (`temporalMode`): HERO = mes cerrado, LIVE = mes en curso parcial, rotulado explícito. Mata la contradicción.
- Degradación por-slot ("Pendiente" + tooltip en card afectada); banner degradado baja a tira fina secundaria.
- Matriz 12 estados (state-design): loading/partial/empty/degraded/stale honestos.

### Slice 5 — Charts potentes

- Trends: agregar línea de meta + last-value label; extender a las 6 métricas (small multiples).
- Reemplazar radar débil por small multiples / bullet charts (valor vs meta).
- Anotar donut CSC con insight ("65% en revisión interna — tu cuello de botella").
- Gobernados por SoT tipográfico (TASK-1041), una sola librería.

### Slice 6 — Mobile + a11y + motion + GVC baseline → runtime cutover

- Mobile priorizado (hero → acción → KPIs stack → charts colapsables), no desktop apretado.
- WCAG 2.2 AA: semáforo color+icono+label, charts `role=img`+aria-label+tabla fallback, focus, targets ≥24px, `prefers-reduced-motion`.
- Motion tier bajo (count-up hero, draw-in sparklines, hover-lift; <400ms).
- GVC desktop+mobile en loop + baseline `fe:capture:diff --promote`; cutover runtime detrás de flag (patrón home rollout flag TASK-780 o equivalente).

## Out of Scope

- **NO** cambiar el cálculo de métricas ICO, el bono, ni los readers de datos (solo presentación + posible exposición de delta/meta).
- **NO** implementar el rediseño en Agency/Space/Person 360 — la adopción es **TASK-1076** (depende de las primitives de esta task). Esta task solo las diseña + pilotea en `/my/performance`.
- **NO** el fix de la voz Nexa (TASK-1073) ni del microcopy RpA (TASK-1074) — son dependencias, no scope.
- **NO** agregar una 3ª librería de charts.
- **NO** tocar la migración RpA V2 ni los flags de captura.

## Detailed Spec

### Concepto elegido (product-design-loop Fase 2, 2026-06-10): **mix A+C** (+ B arriba)

3 conceptos IA generados (`.captures/concepts/concept-{a,b,c}-*.png`, gitignored). El operador eligió el **mix A+C**:

- **Esqueleto = C (split-temporal):** dos lanes. **Lane izq = mes cerrado** (settled, último mes completo); **lane der = mes en curso** (ring de progreso "N de M días", cards "Pendiente" honestas para lo que aún no cierra). Mata la contradicción OTD 5%/100%.
- **Por lane = A (score-hero):** cada lane lleva su **score-hero compuesto** (número grande + verdicto semáforo color+icono+label) + sus KPIs con sparkline+delta+meta.
- **Arriba = B (narrative-first):** el insight Nexa lidera como banda narrativa (2ª persona, TASK-1073) + CTA acción, sobre los dos lanes.

Imagen = intención: layout/jerarquía/interacción se toman del concepto; colores/tipografía/spacing se **mapean a tokens AXIS / SoT / 4n** (no se transcribe el PNG). Las métricas placeholder en inglés de los conceptos → RpA/OTD%/FTR%/Throughput/Cycle/Stuck en es-CL.

### Blueprint completo

Ver el blueprint completo en la conversación de análisis (sesión 2026-06-10): scorecard enterprise, espina narrativa, component manifest por sección, upgrade chart-by-chart, modelo temporal, a11y/motion. Resumen del contrato:

- **Espina:** HERO (¿cómo cerré?) → LIVE (¿qué pasa este mes?) → ACCIÓN (¿qué hago?) → DETALLE.
- **KPI anatomy (dataviz 6 elementos):** nombre + valor tabular-nums + sparkline + delta+flecha+color+texto + meta + tooltip + drill. Semáforo nunca color-only.
- **Temporal (TASK-776):** rótulo explícito mes-cerrado vs mes-en-curso por bloque.
- **Degradación per-slot (state-design `SourceResult<T>`):** "Pendiente" + razón; banner secundario.
- **Tokens:** AXIS, typography SoT, elevation roles (hero `raised`, resto `none`), motion tokens.

## Rollout Plan & Risk Matrix

Cambio de presentación sobre superficie existente. **Mockup-first → runtime cutover detrás de flag.** No toca cálculo, datos, payroll ni bono. Riesgo concentrado en regresión visual + paridad mockup→runtime.

### Slice ordering hard rule

- Slice 1 (conceptos+elección) → Slice 2 (mockup) → Slice 3 (primitives) → Slice 4/5 (temporal/estados/charts, paralelizables) → Slice 6 (mobile/a11y/GVC/cutover, último).
- El cutover runtime (Slice 6) NO ocurre sin baseline GVC verde desktop+mobile + flag.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Regresión visual en runtime vs mockup aprobado | UI | medium | mockup-first + `fe:capture:diff` baseline + flag-gated cutover | GVC baseline `exceeded` |
| DTO no expone delta/meta → cards incompletas | UI/data | medium | `[verificar]` en discovery; extender DTO additive si falta | test focal |
| Pisar trabajo de TASK-1027 (misma superficie) | UI | medium | verificar estado TASK-1027 antes de Slice 2; coordinar | code review |
| Charts nuevos suben bundle | perf | low | una sola librería; lazy-load; bundle-analyzer | build size |
| Copy es-CL inline al pasar a runtime | content | low | extraer a `GH_MY_PERFORMANCE`; lint `no-untokenized-copy` | lint |

### Feature flags / cutover

- Cutover runtime detrás de flag (patrón TASK-780 home rollout flag o equivalente `my_performance_redesign`). Default OFF; flip post GVC baseline verde + revisión operador. Revert: flag OFF + redeploy.
- El mockup (`/my/performance/mockup`) no necesita flag (ruta separada).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1-2 (conceptos/mockup) | revert PR (ruta mockup additive) | <10 min | sí |
| Slice 3 (primitives) | revert PR (additive en primitives/) | <10 min | sí |
| Slice 4-5 (temporal/estados/charts en mockup) | revert PR | <10 min | sí |
| Slice 6 (runtime cutover) | flag OFF → vista actual | <5 min | sí (instant via flag) |

### Production verification sequence

1. Mockup en staging + GVC desktop+mobile leído → enterprise.
2. `fe:capture:diff --promote` baseline del mockup aprobado.
3. Runtime con flag OFF → vista actual intacta (parity).
4. Flag ON en staging + GVC runtime con `agent-collaborator@…` (o Daniela) → baseline diff `match`.
5. Verificar mes cerrado (mayo, datos) y mes en curso (junio, parcial) ambos honestos + sin contradicción.
6. Prod: flag ON post-smoke.

### Out-of-band coordination required

- Coordinar con TASK-1027 (misma superficie) + TASK-1073/1074 (dependencias de contenido). Ninguna integración externa.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — ACCEPTANCE & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] La página responde las 3 preguntas en orden (hero cierre → live mes en curso → acción Nexa → detalle); el first-fold ancla "cómo voy", no el banner de error.
- [ ] Las 6 KPI ICO tienen anatomía completa (sparkline + delta vs período + meta + semáforo color+icono+label).
- [ ] Marco temporal explícito: ningún bloque mezcla mes-cerrado y mes-en-curso sin rótulo; la contradicción OTD 5%/100% desaparece.
- [ ] Degradación per-slot ("Pendiente" + razón); el banner degradado no domina el first-fold.
- [ ] Radar débil reemplazado; trends con meta + last-value; donut anotado con insight.
- [ ] Mobile priorizado (no desktop apretado); WCAG 2.2 AA (color+icono+label, charts con tabla fallback, focus, targets, reduced-motion).
- [ ] Cero hardcode (tokens AXIS / variant SoT / elevation roles); copy en `GH_MY_PERFORMANCE` validado con `greenhouse-ux-writing`.
- [ ] Cálculo de métricas + bono intactos (solo presentación).
- [ ] GVC baseline desktop+mobile `match`; cutover detrás de flag.
- [ ] Primitives nuevas documentadas en `ui-platform/PRIMITIVES.md` (reusables por superficies hermanas).

## Verification

```bash
pnpm local:check:ui
pnpm test src/lib/my-performance src/lib/copy
pnpm fe:capture my-performance-redesign --env=staging   # desktop + mobile
pnpm fe:capture:diff --promote <capture-dir>            # baseline mockup aprobado
```

- Smoke real con `agent-collaborator@greenhouse.efeonce.org` o Daniela (mes cerrado vs en curso).

## Closing Protocol

- Mover `Lifecycle` → `complete` + archivo a `complete/` + sincronizar `docs/tasks/README.md`.
- `greenhouse-documentation-governor`: `ui-platform/PRIMITIVES.md` + `HISTORIAL.md` (primitives nuevas), DESIGN.md si emerge token, doc funcional, changelog, Handoff.
- `pnpm test` (full) + `pnpm build` antes del cierre.

## Follow-ups

- **TASK-1076** adopta las primitives en Agency ICO, Space 360, Person 360 (EPIC-018).
- Si el hero ICO score compuesto necesita un cálculo canónico nuevo, derivarlo a una task ICO con spec (no inventar fórmula en UI) — coordinar con la skill `greenhouse-ico`.
