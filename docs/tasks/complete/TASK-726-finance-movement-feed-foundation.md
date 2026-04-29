# TASK-726 — Finance Movement Feed Foundation

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `none`
- Status real: `Completada`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none`
- Branch: `feature/finance-movement-feed`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crear un componente reusable para representar movimientos financieros como feed operativo adaptable, inspirado en el mockup aprobado `docs/mockups/finance-movement-feed-mockup.html`. El feed debe complementar a las tablas existentes, soportar descripciones largas sin scroll horizontal, preparar virtualizacion para historiales grandes y reutilizar catalogos existentes para identidad visual.

## Why This Task Exists

Las tablas financieras son utiles para comparacion, pero resultan pesadas cuando el usuario necesita recorrer movimientos, reconocer proveedores y abrir trazabilidad puntual. La lista de conciliacion ya evidencio que descripciones largas pueden romper la UX. Greenhouse necesita una primitive compartida que mantenga trazabilidad financiera sin sacrificar lectura rapida.

## Goal

- Crear `FinanceMovementFeed` como primitive compartida bajo `src/components/greenhouse/finance/`.
- Integrar el feed en `/finance/reconciliation` para "Movimientos de caja por conciliar" sin modificar saldos, matching ni queries.
- Preparar virtualizacion con `@tanstack/react-virtual` para listas grandes, encapsulada dentro del componente.
- Resolver identidad visual via provider/tooling catalog y payment provider catalog cuando existan, con fallback seguro si logos no estan verificados.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
- `docs/ui/GREENHOUSE_UI_ORCHESTRATION_V1.md`
- `docs/ui/GREENHOUSE_VUEXY_COMPONENT_CATALOG_V1.md`
- `docs/ui/GREENHOUSE_MODERN_UI_UX_BASELINE_V1.md`
- `docs/mockups/finance-movement-feed-mockup.html`

Reglas obligatorias:

- Read-only por defecto: el feed no calcula saldos, no aplica matches, no escribe DB y no rematerializa balances.
- Los saldos posteriores se muestran solo si vienen del caller como `runningBalance`.
- Los logos externos no son confiables hasta auditoria; usar fallback por iniciales/icono semantico cuando no haya logo verificado.
- No hacer string matching fragil como fuente unica de identidad visual; preferir `providerId`, `toolCatalogId` o `paymentProviderSlug`.
- No reemplazar tablas donde la comparacion multi-columna sea la tarea principal.

## Normative Docs

- `docs/mockups/finance-movement-feed-mockup.html`
- `docs/documentation/finance/conciliacion-bancaria.md`

## Dependencies & Impact

### Depends on

- `@tanstack/react-virtual`
- Provider/tooling catalog existente (`ProviderRecord.iconUrl`, `AiTool.iconUrl`)
- Payment provider catalog existente (`src/lib/finance/payment-instruments/canonical-providers.ts`)

### Blocks / Impacts

- Mejora incremental de `/finance/reconciliation`.
- Base reusable para `/finance/bank`, `/finance/cash-position`, shareholder account, candidatos de conciliacion y sugerencias AI.

### Files owned

- `src/components/greenhouse/finance/*`
- `src/views/greenhouse/finance/ReconciliationView.tsx`
- `docs/documentation/finance/conciliacion-bancaria.md`
- `docs/manual-de-uso/finance/sugerencias-asistidas-conciliacion.md`

## Current Repo State

### Already exists

- Mockup aprobado: `docs/mockups/finance-movement-feed-mockup.html`
- Reconciliation view: `src/views/greenhouse/finance/ReconciliationView.tsx`
- Provider/tooling types: `src/types/ai-tools.ts`
- Payment provider catalog: `src/lib/finance/payment-instruments/canonical-providers.ts`

### Gap

- No existe primitive reusable para feed financiero.
- La identidad visual de proveedores aun no tiene higiene de logos garantizada.
- Las listas financieras pequeñas dependen de tabla incluso cuando el usuario esta recorriendo movimientos.

## Scope

### Slice 1 — Foundation shared component

- Crear tipos, utils, resolver visual y componentes `FinanceMovementFeed`.
- Soportar variantes `comfortable` y `compact`.
- Soportar agrupacion por fecha, empty/loading/error states, details expandible y virtualizacion opcional.

### Slice 2 — Reconciliation integration

- Reemplazar la mini-tabla de movimientos pendientes por `FinanceMovementFeed`.
- Mapear `PendingMovement` al contrato canónico sin cambiar fetches ni saldos.
- Mantener la tabla de periodos intacta.

### Slice 3 — Docs and verification

- Actualizar documentacion funcional de conciliacion.
- Actualizar manual de uso si aplica.
- Ejecutar lint/build/tests relevantes.

## Out of Scope

- Auditoria completa/correccion de logos reales del provider catalog.
- Cambios en matching, auto-match, suggestions AI o saldos.
- Nuevas API routes.
- Virtualizacion en todas las pantallas financieras.

## Detailed Spec

El contrato base del feed expone movimientos con identidad, monto, estado, metadata y trazabilidad opcional. La virtualizacion se activa por prop o threshold, pero queda encapsulada dentro del componente para que las vistas no dependan de `@tanstack/react-virtual`.

El resolver visual usa prioridad:

1. `visual` explicito del item.
2. `providerId` / `toolCatalogId` / `paymentProviderSlug` desde catalogos recibidos por props.
3. Direccion/source type para icono semantico.
4. Fallback neutro.

## Acceptance Criteria

- [x] `FinanceMovementFeed` renderiza movimientos con wrapping seguro, sin scroll horizontal.
- [x] El feed soporta empty, loading y error states accesibles.
- [x] La integracion en `/finance/reconciliation` no cambia queries, saldos ni acciones financieras.
- [x] La virtualizacion esta disponible y encapsulada, con threshold configurable.
- [x] Los logos no verificados degradan a iniciales o iconos semanticos.
- [x] Hay tests unitarios para utils/visual resolver y render basico.

## Verification

- `pnpm test src/components/greenhouse/finance` OK.
- `pnpm exec eslint src/components/greenhouse/finance src/views/greenhouse/finance/ReconciliationView.tsx` OK.
- `pnpm exec tsc --noEmit` OK.
- `pnpm lint` OK.
- `pnpm build` OK.

## Closing Protocol

- [x] `Lifecycle` del markdown quedo sincronizado con el estado real.
- [x] el archivo vive en la carpeta correcta.
- [x] `docs/tasks/README.md` quedo sincronizado con el cierre.
- [x] `Handoff.md` quedo actualizado.
- [x] `changelog.md` quedo actualizado.
- [x] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas.

## Follow-ups

- Logo hygiene del provider/tooling catalog antes de activar isotipos reales masivamente.
- Evaluar toggle `Tabla | Feed` en superficies donde ambos patrones aporten.
