# Administración del Catálogo de Pricing

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-04-19 por Claude (TASK-467)
> **Ultima actualizacion:** 2026-04-19 por Claude
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

- **No edita cost components ni pricing per currency**: esos tabs con sub-tabs por employment_type son scope grande (6 components × 6 employment_types × 6 currencies). Follow-up TASK-467-phase-2.
- **No edita employment types**: placeholder en home. Baja frecuencia de cambio; queda como follow-up.
- **No importa Excel bulk**: el re-seed CSV sigue siendo el path para bulk updates masivas. Follow-up si Efeonce lo pide.
- **No tiene diff viewer visual del audit**: el audit log se consulta via API. UI con timeline queda como follow-up.
- **No tiene approval workflow**: V1 confía que admins saben lo que hacen. El audit garantiza traceability.

## Aislamiento payroll

La UI **NUNCA escribe** en `greenhouse_payroll.*`. Los campos de rates de payroll (AFP, previsional) son SOLO lectura cuando se muestran como referencia. Los 194 tests del módulo payroll se mantienen intactos — TASK-467 no los toca.

> **Detalle técnico:** API routes en [src/app/api/admin/pricing-catalog/](../../../src/app/api/admin/pricing-catalog/). Views en [src/views/greenhouse/admin/pricing-catalog/](../../../src/views/greenhouse/admin/pricing-catalog/). Audit store en [src/lib/commercial/pricing-catalog-audit-store.ts](../../../src/lib/commercial/pricing-catalog-audit-store.ts). Permission helper `canAdministerPricingCatalog` en [src/lib/tenant/authorization.ts](../../../src/lib/tenant/authorization.ts).

## Próximos pasos (follow-ups)

- **TASK-467-phase-2**: edit completo de cost components per employment_type + pricing per currency
- Admin UI de employment types
- Excel import con diff preview
- Audit timeline UI con diff viewer visual
- Approval workflow para cambios críticos (ej. bajar `margin_min` requiere aprobación de efeonce_admin)
- Bulk edit (seleccionar 10 roles + ajustar salary +5% todos)
- Preview de impacto: "¿cuántas cotizaciones activas se verían afectadas si subo este rate?"
