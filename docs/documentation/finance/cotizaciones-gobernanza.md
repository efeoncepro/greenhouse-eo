# Cotizaciones — Gobernanza, versiones, aprobaciones y templates

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.1
> **Creado:** 2026-04-17 por Claude (TASK-348)
> **Ultima actualizacion:** 2026-04-19 por Codex (TASK-504)
> **Documentacion tecnica:** [GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md)

## Que es

La gobernanza de cotizaciones es la capa que asegura que las propuestas comerciales de Efeonce sean auditables, reversibles y controladas cuando el riesgo lo exige. Todo lo que pasa en una cotización (editar un ítem, aplicar un descuento, aprobar un cambio) queda registrado con quién lo hizo y por qué, y el sistema pide aprobación solo cuando se rompe una regla financiera — no en cada quote.

## Que resuelve

| Dolor operativo | Como lo resuelve la gobernanza |
|-----------------|---------------------------------|
| No hay trazabilidad de quién bajó el precio | Audit log inmutable por cotización con actor + timestamp + detalle |
| Cambios sobre una quote emitida pisan la versión original | Cada edición significativa crea una versión nueva con diff automático vs la anterior |
| El Account Lead aprueba descuentos sin visibilidad de Finance | Approval workflow por excepción conectado al margin health |
| Cada quote se arma desde cero copiando otra | Templates reutilizables por Business Line + pricing model, con line items, terms y defaults |
| Los términos y condiciones se copian mal de quote en quote | Library centralizada con variables dinámicas ({{payment_terms_days}}, {{valid_until}}, etc.) |

## Pilares

### 1. Versiones (historial + diff)

Cada cotización tiene una versión vigente (`current_version`). Cuando alguien crea una nueva versión, el sistema:

1. Clona los line items de la versión actual
2. Toma un snapshot JSON de la versión anterior en `quotation_versions`
3. Calcula automáticamente un diff: qué se agregó, qué se removió, qué cambió (precio, cantidad, subtotal) y cuánto varió el total y el margen
4. Deja la cotización en `draft` para que el comercial edite tranquilo

Es el único mecanismo seguro para editar una cotización que ya fue emitida: no se pisa la versión previa, se genera una nueva y el PDF apunta a la vigente.

> Detalle técnico: `src/lib/commercial/governance/versions-store.ts` + `version-diff.ts`.

### 2. Aprobaciones (por excepción)

No toda cotización necesita aprobación. El flujo default es que el Account Lead crea, edita y **emite**. La aprobación se dispara solo cuando una condición de riesgo se cumple:

| Condición | Ejemplo de política default |
|-----------|------------------------------|
| `margin_below_floor` | Margen efectivo bajo el piso configurado para la BL → requiere Finance |
| `margin_below_target` | Margen bajo el target pero sobre el piso → opcional según BL |
| `amount_above_threshold` | Monto total supera 50M CLP → requiere Efeonce Admin |
| `discount_above_threshold` | Descuento agregado supera 30% → requiere Finance |
| `always` | Política de compliance universal (ej: quotes internacionales) |

Flujo real:

1. El comercial presiona **"Emitir cotización"** desde el detail, o **"Evaluar excepción"** desde el tab Aprobaciones
2. El sistema corre el discount health contra los totales de la versión vigente
3. Busca las approval policies activas que apliquen a esa BL + pricing model
4. Crea un `approval_step` pendiente por cada política que se haya cumplido
5. Si hubo excepción, la cotización pasa a `pending_approval` y se notifica a los aprobadores por outbox
6. Si no hubo excepción, la cotización pasa directo a `issued`
7. Cuando todos los pasos están `approved`, la cotización pasa a `issued` automáticamente; si alguno se rechaza, queda en `approval_rejected` con las notas visibles

> Detalle técnico: `src/lib/commercial/governance/approval-evaluator.ts` + `approval-steps-store.ts`. Tablas `approval_policies` y `approval_steps`.

### 3. Terms library + quotation_terms

Los términos y condiciones viven en una library global (`terms_library`) y se aplican a cada cotización como snapshots resueltos. El flujo:

1. Al abrir una cotización, el sistema precarga los términos activos que apliquen a su pricing model y business line
2. Cada término tiene un `body_template` con placeholders tipo `{{payment_terms_days}}`, `{{valid_until}}`, `{{organization_name}}`
3. Al aplicarlos, el sistema los resuelve con los datos de la quote y guarda el texto final en `quotation_terms.body_resolved`
4. El comercial puede excluir términos no-required o reordenarlos; los `required = true` siempre van

Importante: el `body_resolved` es un snapshot inmutable. Si Efeonce actualiza un término en la library, las quotes previas mantienen el texto que se les aplicó al momento.

**Seeds iniciales** de la library (version 1):

- `payment_default` — Condiciones de pago (required)
- `validity_default` — Vigencia de la propuesta (required)
- `confidentiality` — Confidencialidad
- `scope_change` — Cambios de alcance
- `replacement_staff_aug` — Reemplazo de personas (solo staff_aug)
- `escalation_policy` — Escalamiento anual (solo retainer)

> Detalle técnico: `src/lib/commercial/governance/terms-store.ts`. Resolver `resolveTermVariables`.

### 4. Templates reutilizables

Los templates son cotizaciones predefinidas por Business Line + pricing model con:

- Line items default (person, role, deliverable o direct_cost)
- Moneda, billing frequency, payment terms default
- Terms precargados desde la library
- Descripción y conditions text default

El comercial los usa para ir más rápido en quotes recurrentes (ej: "Retainer creativo Globe 80h"). Cada template guarda un `usage_count` y `last_used_at`, lo que permite priorizar templates populares en la UI.

**Resolución de precio** al aplicar un template (respuesta a la open question original):

1. Si el line item tiene `default_unit_price` → ese precio se usa directo
2. Si el line item tiene solo `default_margin_pct` → el costing-engine calcula `unit_price` desde el cost loaded + margen
3. Si ambos son null → solo se precarga la estructura y el comercial completa manualmente

Esto permite templates rígidos (precio fijo) y templates variables (margen objetivo) coexistiendo.

> Detalle técnico: `src/lib/commercial/governance/templates-store.ts`. Tablas `quote_templates` y `quote_template_items`.

### 5. Audit log inmutable

Todo cambio significativo sobre una cotización genera un registro en `quotation_audit_log` con:

- `action` — tipo de evento (`created`, `version_created`, `approval_requested`, `approval_decided`, `terms_changed`, `template_used`, etc.)
- `actor_user_id` + `actor_name` — quién hizo el cambio
- `version_number` — versión activa al momento del cambio
- `details` jsonb — contexto específico (diff, stepId, decision, notes, etc.)

La tabla nunca se actualiza ni se borra desde la aplicación. Es el registro narrativo del ciclo de vida de cada quote.

| Mecanismo | Propósito | Granularidad | Inmutable |
|-----------|-----------|--------------|-----------|
| Outbox events | Disparar consumers (notifications, sync) | Por evento de negocio | Sí |
| Versions | Snapshot completo para comparar | Por versión | Sí |
| Audit log | Registro de quién cambió qué y cuándo | Por acción | Sí |

Los tres coexisten — cada uno sirve un propósito distinto.

> Detalle técnico: `src/lib/commercial/governance/audit-log.ts`. Tabla `quotation_audit_log`.

## Surfaces en el portal

### QuoteDetailView — tabs nuevos

La vista `Finanzas > Cotizaciones > [id]` ahora tiene 5 tabs:

| Tab | Contenido | Acciones |
|-----|-----------|----------|
| General | KPIs, metadata, line items, totales | Solo lectura (por ahora) |
| Versiones | Timeline con diff resumido vs versión anterior | Botón "Nueva versión" (si la quote no está en `pending_approval` ni `converted`) |
| Aprobaciones | Pasos pending + historial decidido | "Evaluar excepción" (request) + Aprobar/Rechazar (si tienes el rol) |
| Términos | Lista de terms aplicados con toggle include | Guardar cambios (si la quote está en `draft` o `approval_rejected`) |
| Auditoría | Timeline cronológico inverso de todos los eventos | Solo lectura |

### Endpoints disponibles

**Por cotización:**

- `GET /api/finance/quotes/[id]/versions` — historial + diffs
- `POST /api/finance/quotes/[id]/versions` — crear nueva versión (clona + diff)
- `POST /api/finance/quotes/[id]/issue` — emitir la quote o gatillar aprobación por excepción
- `GET /api/finance/quotes/[id]/approve` — listar pasos de aprobación
- `POST /api/finance/quotes/[id]/approve` con `{ action: 'request' }` — evaluar y crear pasos
- `POST /api/finance/quotes/[id]/approve` con `{ action: 'decide', stepId, decision, notes }` — aprobar/rechazar
- `GET /api/finance/quotes/[id]/audit` — timeline de auditoría
- `GET /api/finance/quotes/[id]/terms` — lista de terms aplicados (auto-seed si está vacía)
- `PUT /api/finance/quotes/[id]/terms` — upsert de terms aplicados

**Globales:**

- `/api/finance/quotation-governance/approval-policies[/[id]]` — CRUD de policies (requiere Finance Admin o Efeonce Admin)
- `/api/finance/quotation-governance/terms-library[/[id]]` — CRUD de library (requiere Finance Admin o Efeonce Admin)
- `/api/finance/quotation-governance/templates[/[id]]` — CRUD de templates (cualquier rol con acceso a Finance)

## Eventos outbox emitidos

| Evento | Cuándo se emite | Consumers |
|--------|-----------------|-----------|
| `commercial.quotation.version_created` | Al crear una nueva versión | HubSpot sync (update deal amount), notifications |
| `commercial.quotation.issued` | Cuando la quote queda emitida oficialmente | HubSpot sync, projections, quote-to-cash |
| `commercial.quotation.approval_requested` | Al gatillarse aprobación | Notifications → aprobadores |
| `commercial.quotation.approval_decided` | Cuando un step se aprueba/rechaza | Notifications → creador + Finance |
| `commercial.quotation.sent` | Bridge legacy emitido junto a `issued` mientras existan consumers no migrados | Consumers legacy |
| `commercial.quotation.approved` | Quote termina aprobada end-to-end | Delivery module (futuro), Finance projections |
| `commercial.quotation.rejected` | Evento legacy de rechazo; la persistencia canónica queda en `approval_rejected` | Notifications legacy |
| `commercial.quotation.template_used` | Template aplicado a una quote | Audit log, telemetría futura |
| `commercial.quotation.template_saved` | Template creado o save-as-template | Audit log |
| `commercial.discount.health_alert` | Margin health dispara warning/error | Notifications → Finance |

## Permisos (versión operativa)

| Acción | Roles permitidos |
|--------|------------------|
| Ver cotización y su audit | Finance, Efeonce Admin (heredado por `requireFinanceTenantContext`) |
| Crear nueva versión | Finance, Finance Admin, Efeonce Admin, Efeonce Operations |
| Emitir cotización / Evaluar excepción | Mismo que crear versión |
| Decidir un approval step | Quien tenga el `required_role` del step o `efeonce_admin` |
| Editar terms aplicados | Mismo que crear versión, y solo si la quote está en `draft` o `approval_rejected` |
| CRUD approval policies / terms library | Solo Finance Admin y Efeonce Admin |
| CRUD templates | Cualquier rol con acceso a Finance |

## Gaps conocidos (ver TASK-349)

- **Aplicar template al crear quote**: el template se puede consultar vía API pero aún no está cableado al POST de creación de cotización; llega con TASK-349.
- **Save-as-template desde quote existente**: flujo descrito en la arquitectura §19.3 pendiente.
- **Páginas admin para CRUD visual de policies/terms/templates**: los endpoints existen, la UI aún no.

## Glosario breve

| Término | Significado |
|---------|-------------|
| Versión | Snapshot completo de line items + totales + margen, identificado por `version_number` |
| Diff | Resumen automático de qué cambió entre dos versiones consecutivas |
| Approval policy | Regla que define cuándo y de quién se requiere aprobación |
| Approval step | Instancia pendiente/decidida de aprobación para una versión específica |
| Term | Cláusula reutilizable con variables; vive en la library |
| Template | Cotización predefinida reutilizable con defaults y line items |
| Audit log | Registro inmutable de cambios por cotización |
