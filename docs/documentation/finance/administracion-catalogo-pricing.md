# Administración del Catálogo de Pricing

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.1
> **Creado:** 2026-04-19 por Claude (TASK-467)
> **Ultima actualizacion:** 2026-04-19 por Claude (TASK-467 phase-2)
> **Documentacion tecnica:**
> - Spec: [TASK-467](../../tasks/complete/TASK-467-pricing-catalog-admin-ui.md)
> - Catálogos base: [TASK-464a](../../tasks/complete/TASK-464a-sellable-roles-catalog-canonical.md), [TASK-464b](../../tasks/complete/TASK-464b-pricing-governance-tables.md), [TASK-464c](../../tasks/complete/TASK-464c-tool-catalog-extension-overhead-addons.md)

## Para qué sirve

La pantalla `/admin/pricing-catalog` permite a Finance Admin y Efeonce Admin **administrar el catálogo comercial de Efeonce sin necesidad de un developer**. Antes, agregar un rol nuevo (ej. "Blockchain Developer") o una herramienta nueva (ej. "Cursor AI") requería abrir un ticket de dev: editar CSV de seed + re-correr seeder + PR + merge. Ahora es un form en la UI con audit log automático.

## Qué resuelve

| Dolor operativo | Solución |
|---|---|
| "Necesito agregar Blockchain Developer como rol" → dev ticket, días | Form de creación de rol → SKU `ECG-034` auto-asignado → disponible en cotizador inmediato |
| "Cursor AI entró al stack, hay que agregarlo" → Excel + seed + PR | Create tool form → `ETG-027` auto-asignado |
| "Deel cambió su fee" → editar código | Toggle active + governance inline edit con `effective_from` |
| "¿Quién cambió el margin_opt del Tier 3 el mes pasado?" → nadie sabe | Audit log persistente con actor + fecha + diff |
| Cambios retroactivos afectan cotizaciones emitidas | `effective_from` obligatorio; cotizaciones históricas quedan con el snapshot de su fecha |

## Quién puede acceder

Solo roles `efeonce_admin` y `finance_admin` ven el menú "Catálogo de pricing" (bajo Admin → Equipo y operaciones). Otros roles reciben redirect si intentan entrar por URL directa.

## Cómo se organiza la home

La home muestra 7 tarjetas, cada una un catálogo:

| Tarjeta | Qué gestiona | Edición MVP |
|---|---|---|
| **Roles vendibles** | Los 32+ roles que Efeonce cotiza (Senior Visual Designer, Account Lead, etc.) | Crear nuevo + activar/desactivar |
| **Herramientas** | 26+ tools del stack (Adobe CC, Notion, Deel, Claude…) | Crear nuevo + activar/desactivar |
| **Overheads y fees** | 9+ addons (Client Management %, Gastos Administrativos, etc.) | Crear nuevo + activar/desactivar |
| **Gobierno de márgenes** | Tier margins (4), commercial models (4), country factors (6), FTE hours | Inline edit de porcentajes |
| **Modalidades de contrato** | 7 employment types (indefinido_clp, contractor_deel_usd, etc.) | Placeholder — edición en follow-up |
| **Servicios empaquetados** | Los servicios EFG-XXX | Se administra desde TASK-465 (otra vista) |
| **Factores por país** | 6 factores (Chile Corporate, Chile PYME, Colombia LATAM…) | Dentro de "Gobierno de márgenes" |

## Flujo: crear un rol nuevo

1. Click "Roles vendibles" → list view con los roles existentes
2. Botón "+ Nuevo rol" primary → abre drawer
3. Llenar form:
   - **Label español** (required, ej. "Blockchain Developer")
   - **Label inglés** (opcional)
   - **Categoría** (ej. "Desarrollo")
   - **Tier** (1-4, con guidance: "2 = Especializado")
   - **¿Se puede vender como staff aug?** (toggle)
   - **¿Se puede vender como componente de servicio?** (toggle)
   - Notas internas
4. Submit → backend INSERT con DEFAULT sequence → toast "Rol creado — SKU ECG-034 asignado"
5. Automáticamente aparece en el cotizador (`/finance/quotes/new`) en la siguiente sesión

**Importante**: el rol creado nace con cost components y pricing **vacíos**. Para cargarlos hay dos caminos:
- Seguir el flujo MVP actual: editarlos vía re-seed CSV (TASK-464a) con PR
- Esperar TASK-467-phase-2 que agregará los tabs de edit de cost/pricing por employment_type

## Flujo: desactivar un elemento

- Switch "Activo" en la tabla → PATCH al endpoint → audit registra `action='deactivated'`
- El elemento **NO se borra** — queda `active=FALSE`. Cotizaciones históricas que lo referencian siguen funcionando; nuevas cotizaciones no lo ven en el picker
- Reactivar es el mismo switch al revés; audit registra `action='reactivated'`

## Flujo: editar governance

En `/admin/pricing-catalog/governance`:
- 4 secciones colapsables (accordion)
- Cada celda numérica tiene un lápiz — click activa edición inline
- Cambio dispara PATCH inmediato → toast success/error
- Cada cambio va al audit log con actor + diff

Actualmente editables:
- **Tier margins** (role + service): `margin_min`, `margin_opt`, `margin_max` por tier
- **Commercial models**: `multiplier_pct` por modelo (on_going, on_demand, hybrid, license_consulting)
- **Country factors**: `factor_min`, `factor_opt`, `factor_max` por país
- **FTE hours guide**: read-only (11 filas fijas, explícito)

## Audit log

Toda creación, actualización, activación y desactivación se registra en `greenhouse_commercial.pricing_catalog_audit_log` con:
- `entity_type` (sellable_role, tool_catalog, etc.)
- `entity_id` + `entity_sku` para trazabilidad
- `action` (created, updated, deactivated, reactivated, cost_updated, pricing_updated, bulk_imported)
- `actor_user_id` + `actor_name`
- `change_summary` JSONB con previous_values / new_values / fields_changed
- `effective_from` (cuándo aplica el cambio)
- `created_at`

La UI de consulta del log está disponible via `GET /api/admin/pricing-catalog/audit-log` (API funcional, vista UI con filtros queda para follow-up).

## Qué NO hace (MVP)

- **No importa Excel bulk**: el re-seed CSV sigue siendo el path para bulk updates masivas. Follow-up si Efeonce lo pide.
- **No tiene approval workflow**: V1 confía que admins saben lo que hacen. El audit garantiza traceability.
- **Cost components tiene dos campos con limitación de backend actual**: `hours_per_fte_month` y `fee_eor_usd` se muestran editables en el drawer pero el store `insertCostComponentsIfChanged` los hardcodea a 180 / 0. Helper text en el form aclara esto. Queda como phase-3 cuando se extienda el store.

## Novedades phase-2 (2026-04-19)

Se agregaron las capacidades que quedaron fuera del MVP inicial:

### Edit drawer de roles con 4 tabs
1. **Info general**: edita label, categoría, tier, tipo (staff/servicio) y estado activo
2. **Modalidades de contrato**: vista de employment types asociados al rol con badge "Con costo cargado" / "Sin costo cargado" (gestión de compatibility full llega en próxima iteración)
3. **Componentes de costo**: agrupados por employment_type, historial por `effective_from`. Botón "+ Nueva versión" crea entries para salario + bonos + gastos previsionales + fees (Deel/EOR)
4. **Pricing por moneda**: las 6 monedas (USD/CLP/CLF/COP/MXN/PEN) con margin%, hourly price y fte monthly price editables. Una fila mínima requerida.

### Edit drawers para tools y overheads
- Tools: form completo con 23 campos; conditional fields según `costModel` (subscription vs fixed vs one_time); arrays (applicable_business_lines, applicability_tags) via comma-separated inputs
- Overheads: form con 17 campos; conditional fields según `addon_type` (overhead_fixed vs fee_percentage vs resource_month vs adjustment_pct)

### Employment types admin UI
Página `/admin/pricing-catalog/employment-types` con:
- List view: tabla con code, label, currency, country, previsional%, fee, sourceOfTruth, active
- Create drawer: form con toggles condicionales (previsional → muestra %), sourceOfTruth como dropdown conocido + opción "Otra"
- Edit drawer: mismo shape, code inmutable (es PK)

### Audit timeline UI
Página `/admin/pricing-catalog/audit-log` con:
- Filtros por entityType, entityId, actorUserId
- Timeline cronológico (MUI Lab Timeline) con dots por acción (verde=created/reactivated, azul=updated/cost_updated/pricing_updated, naranja=deactivated)
- Cada entry muestra entity + SKU + actor + fecha + diff expandible (JSON del changeSummary)

## Aclaración importante: las "horas por FTE" de pricing NO son las horas de capacity operacional

Greenhouse tiene **dos capas FTE distintas** que el admin debe entender para no confundir lo que edita:

| Capa | Dónde vive | Valor | Para qué |
|---|---|---|---|
| **Capacity operacional** | `greenhouse_core.client_team_assignments` + snapshot `greenhouse_serving.member_capacity_economics`. Constante `CAPACITY_HOURS_PER_FTE = 160h` en `src/lib/team-capacity/units.ts` | **160h por FTE** (fijo) | Agency / Delivery / Person Intelligence: mide lo que una persona **puede entregar** operacionalmente |
| **Billable para cotización** | `greenhouse_commercial.fte_hours_guide` (editable desde el admin UI de pricing, tab "Gobierno de márgenes") | **Variable por fracción** (ej. 0.25 FTE → 45h, 0.5 FTE → 90h, 1.0 FTE → 180h) | Pricing engine v2: horas que se **cobran al cliente** según la fracción vendida |

**Regla clave**: si cambias `fte_hours_guide` en el admin UI, afectas **solo cotizaciones nuevas** (via pricing engine v2). **No cambia** la capacidad operacional — eso sigue con el 160h canónico que consume el ICO Engine, el módulo de Agency Team y las proyecciones de `member_capacity_economics`.

**¿Por qué dos valores?** Porque no son lo mismo:
- "1 FTE de Senior Designer" operacionalmente = 160h/mes que puede trabajar
- "1 FTE de Senior Designer" comercialmente = 180h/mes que se cotizan al cliente (incluye buffer de revisiones, meetings, etc.)

La separación es intencional y canónica. El doc técnico `GREENHOUSE_TEAM_CAPACITY_ARCHITECTURE_V1.md` especifica el 160h como baseline operacional; `fte_hours_guide` es específico del módulo comercial.

**Sinergia resuelta phase-2 (2026-04-19)**: el campo `hours_per_fte_month` en `sellable_role_cost_components` ahora funciona como **override per-role del `fte_hours_guide`**. El pricing engine v2 ya lo leía como fallback; antes estaba bloqueado porque el store hardcodeaba el valor a 180. Phase-2 lo desbloquea — el admin puede ahora especificar horas billable distintas para roles que lo necesiten (ej. un Senior Designer a 180h vs un Consultor a 160h). Mismo fix aplica a `fee_eor_usd` (antes hardcoded a 0). Stores aceptan defaults back-compat (180h / 0 fee) para CSVs de seed legacy que no los especifican. Regla: las dos capas siguen siendo distintas (160h capacity vs variable billable), pero ahora se coordinan explícitamente via el override per-role.

**Sinergia resuelta phase-4 (2026-04-19, TASK-477)**: el mismo tab "Componentes de costo" ahora también administra el lane `role_modeled` completo. Además del breakdown base, cada modalidad puede guardar overhead directo/compartido, origen del supuesto y nivel de confianza. La UI muestra dos lecturas:
- **Base**: costo mensual / hora antes de overhead extra
- **Loaded**: costo mensual / hora ya cargado con overhead directo + compartido

Esto evita crear otra pantalla paralela para "supuestos modelados". El cotizador sigue prefiriendo `role_blended` cuando existe evidencia real, pero cuando cae al catálogo ya puede explicar de dónde sale el costo modelado y con qué confianza.

## Aislamiento payroll

La UI **NUNCA escribe** en `greenhouse_payroll.*`. Los campos de rates de payroll (AFP, previsional) son SOLO lectura cuando se muestran como referencia. Los 194 tests del módulo payroll se mantienen intactos — TASK-467 no los toca.

> **Detalle técnico:** API routes en [src/app/api/admin/pricing-catalog/](../../../src/app/api/admin/pricing-catalog/). Views en [src/views/greenhouse/admin/pricing-catalog/](../../../src/views/greenhouse/admin/pricing-catalog/). Audit store en [src/lib/commercial/pricing-catalog-audit-store.ts](../../../src/lib/commercial/pricing-catalog-audit-store.ts). Permission helper `canAdministerPricingCatalog` en [src/lib/tenant/authorization.ts](../../../src/lib/tenant/authorization.ts).

## Próximos pasos (follow-ups phase-5+)

- **Role employment compatibility**: endpoint + UI para gestión full (hoy solo read-only en tab "Modalidades")
- **Excel import con diff preview** si Efeonce lo pide (CSV re-seed sigue como fallback)
- **Approval workflow** para cambios críticos (ej. bajar `margin_min` requiere aprobación de efeonce_admin)
- **Bulk edit** (seleccionar 10 roles + ajustar salary +5% todos)
- **Preview de impacto**: "¿cuántas cotizaciones activas se verían afectadas si subo este rate?"
- **Diff viewer mejorado** en el audit timeline (hoy muestra JSON raw; próximo: diff visual side-by-side)
