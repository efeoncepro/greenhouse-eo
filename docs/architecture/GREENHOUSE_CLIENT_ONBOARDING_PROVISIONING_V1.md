# GREENHOUSE_CLIENT_ONBOARDING_PROVISIONING_V1 — Onboarding/provisioning control plane de tenants Notion (ICO/delivery)

| Campo | Valor |
|---|---|
| Status | Accepted (modelo; implementación por tasks derivadas) |
| Created | 2026-05-23 por sesión deep-dive escalabilidad onboarding + skills notion-platform + ICO + arquitectura |
| Owner domain | `delivery \| ico \| integrations \| platform \| reliability` |
| Scope | Cómo se onboardea un cliente/teamspace nuevo al motor de métricas ICO/delivery: provisionar schema canónico Notion + instalar propiedades `[GH]` + registrar + conectar + verificar readiness, idempotente |
| Cross-refs | `GREENHOUSE_TASK_STATUS_LIFECYCLE_V1` (Golden Template = clone Demo Greenhouse — **decisión ya tomada**) · `GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1` · `GREENHOUSE_ATTRIBUTABLE_LATENESS_V1` · TASK-742 (status canónico) · TASK-910 (demo teamspace = clone vivo) · TASK-912/916 (captura + writeback) · `space_notion_sources` · `/api/integrations/notion/{discover,register}` |

---

## 1. Contexto / problema

Hoy onboardear un cliente al motor ICO es **trabajo manual per-cliente**: replicar el schema Notion (DB Tareas + propiedades + fórmulas + opciones de estado), registrar los data source IDs, conectar la integración, suscribir webhooks. Esto **no escala**, y es **la fuente directa del drift/bugs** que venimos arreglando (fórmulas per-tenant que divergen, el `elYp` muerto, vocabulary de estados distinto entre Efeonce y Sky cerrado en TASK-742).

La pregunta operativa: *¿para cada cliente nuevo hay que pedir setup manual de RpA/OTD/ICO?* La respuesta canónica debe ser **no** — debe existir un control plane que provisione y conecte.

## 2. Decisión

**El onboarding de un tenant nuevo se hace con un control plane idempotente "adopt" (`provision-tenant`), NO con setup manual de fórmulas per-cliente.** Modelo **híbrido**:

1. **Humano** (admin Notion): crea el teamspace + **duplica el Golden Template** (Demo Greenhouse / template canónico — decisión ya tomada en `GREENHOUSE_TASK_STATUS_LIFECYCLE_V1`).
2. **Greenhouse `provision-tenant`** (idempotente): **adopta** ese teamspace — verifica schema → instala propiedades `[GH]` → registra data sources → suscribe webhooks → smoke de readiness.

**Habilitado por y secuenciado DESPUÉS de la migración de cómputo a Greenhouse** (RpA V2 + OTD redefinition): una vez el cómputo es tenant-agnóstico, el onboarding **no instala fórmulas** — solo primitivas + targets `[GH]` + conexión. Las métricas "simplemente funcionan" porque el motor es central.

### Alternativas rechazadas

- *Setup manual per-cliente* — no escala, fuente del drift; es el problema.
- *Terraform 100% API del teamspace* — Notion **no crea teamspaces por API** (concepto admin/UI; sí crea databases+properties) → terminás híbrido igual. Complejidad extra sin valor en V1.
- *Re-decidir el template* — innecesario: el Golden Template (clone Demo Greenhouse, vocabulary canónico) ya es decisión canónica (TASK-742). Este ADR lo **reusa**, no lo re-define.
- *Instalar fórmulas de cómputo en el template* — viola el boundary (Notion = OS / Greenhouse = motor); el cómputo vive en Greenhouse.

## 3. Prior art + gap

| Pieza | Estado | Rol |
|---|---|---|
| `GREENHOUSE_TASK_STATUS_LIFECYCLE_V1` (Golden Template = clone Demo Greenhouse) | **existe** | el "qué duplicar" ya está decidido |
| `task-status-canonical.ts` (11 estados V1, property `Estado`) | **existe** | schema canónico de estados |
| `/api/integrations/notion/discover` | **existe** | enumera teamspaces/databases |
| `/api/integrations/notion/register` | **existe** | persiste data source en `space_notion_sources` (+ BQ MERGE, `sync_enabled=TRUE`) |
| `/api/admin/tenants/[id]/notion-{governance,parity-audit,data-quality}` | **existe** | auditoría per-tenant |
| Captura webhooks (TASK-912) + writeback (TASK-916) | en curso | conexión runtime |
| **`provision-tenant` adopt routine (verify schema + install `[GH]` props + subscribe webhooks + smoke readiness)** | **GAP** | la pieza que pega todo |
| **Onboarding state machine + readiness/drift signal** | **GAP** | observabilidad del onboarding |

El gap: `register` hoy conecta un data source cuyo schema ya se armó a mano. **No existe el "adopt" que verifica el schema canónico, instala las `[GH]` properties por API, suscribe los webhooks y verifica readiness como un flujo cohesivo idempotente.**

## 4. El Golden Template (qué se duplica)

Reusa el canónico de TASK-742 — el template **solo declara primitivas**, NO fórmulas de cómputo ICO:

- Property `Estado` (status) con los **11 estados canónicos V1** (no custom per-cliente).
- Propiedades primitivas: `Fecha límite`, `Fecha de Completado`, `Fecha límite original`, asignado/responsable, tipo de entregable, etc.
- Propiedades **`[GH]` read-only** (targets del writeback): `[GH] RpA v2`, `[GH] OTD bucket`, `[GH] FTR`, `Días de retraso`/`gh_otd_bucket` display, etc. — el operador no las edita.
- **Cero fórmulas de cómputo ICO** (RpA/OTD/Indicador de Performance/Días de retraso freeze): el motor es Greenhouse.

## 5. Flujo `provision-tenant` (5 pasos idempotentes)

```text
[Humano] crea teamspace + duplica Golden Template
   ↓
provision-tenant(teamspaceId | dataSourceIds):
  1. VERIFY   — schema vs canónico: 11 estados V1, props primitivas, property name `Estado`.
                Drift → reporta (signal) + bloquea o auto-repara según política. NUNCA aliases per-cliente.
  2. INSTALL  — crea las propiedades `[GH]` read-only faltantes vía Notion API (create/update data source),
                Notion-Version explícito, marcadas read-only por permisos.
  3. REGISTER — reusa /register: persiste data sources en space_notion_sources (PG + BQ), sync_enabled.
  4. SUBSCRIBE— suscribe webhooks (status transitions TASK-912 + due_date changes TASK-921) para el data source.
  5. SMOKE    — readiness check: el tenant produce métricas correctamente (status canónico, captura llega,
                compute central las toma). Honest degradation si falta algo → estado `degraded`, no falso OK.
```

Idempotente: re-correr es seguro → sirve para **onboarding** Y para **detectar/reparar drift** de un tenant ya existente.

## 6. Onboarding state machine + audit

Estado del tenant en el pipeline de onboarding (append-only audit, patrón state-machine + CHECK + audit):

`discovered → template_cloned → schema_verified → gh_props_installed → registered → webhooks_subscribed → ready` (+ `drift_detected` / `degraded` como estados laterales observables).

Persistido en una extensión de `space_notion_sources` o tabla hermana `notion_tenant_provisioning` (decisión de implementación). Cada transición = audit row.

## 7. Boundary canónico (Notion = OS / Greenhouse = motor)

- **Notion (operador/cliente)**: crea teamspace, duplica template, edita primitivas (estado, fechas).
- **Greenhouse**: verifica schema, instala `[GH]` props, registra, suscribe, computa, escribe `[GH]` read-only.
- Cero fórmulas de cómputo ICO en Notion. Completa el boundary que cierran RpA V2 / OTD redefinition.

## 8. Multi-tenant invariants

- **Vocabulary canónico enforced al onboarding** (TASK-742): cliente nuevo usa los 11 estados V1, NO custom. Si un cliente trae nombres custom → se migra el template ANTES del onboarding, **NUNCA se agregan aliases** (hard rule TASK-742).
- **Cero fórmulas de cómputo per-tenant**: el motor es central y tenant-agnóstico. Onboarding instala primitivas + `[GH]` targets.
- **Tenant-agnóstico**: un teamspace nuevo hereda el cómputo sin trabajo adicional de métricas (solo el `provision-tenant`).

## 9. Sequencing (crítico)

**No construir el control plane antes de que aterrice la migración de cómputo.** Si se construye ahora, terraformearía el mundo viejo de fórmulas frágiles. Orden:

1. Migración de cómputo a Greenhouse (RpA V2 ya; OTD redefinition modelada) → cómputo tenant-agnóstico.
2. **Entonces** `provision-tenant` provisiona primitivas + `[GH]` targets + conexión.

Es concern **separado** del modelo OTD (dominio provisioning/multi-tenant), aunque **habilitado** por la migración.

## 10. Reliability signals (propuestos)

- `integrations.notion.tenant_schema_drift` — data source registrado cuyo schema diverge del canónico (estados, props faltantes). Steady=0.
- `integrations.notion.tenant_unprovisioned` — data source en `space_notion_sources` sin `[GH]` props instaladas / sin webhook suscrito (onboarding incompleto). Steady=0.
- `integrations.notion.tenant_not_ready` — tenant que no pasa el smoke de readiness (no produce métricas). Steady=0.

## 11. Scoring (4-pillar + 5-pillar ICO)

| Pilar | Veredicto |
|---|---|
| **Safety** | Idempotente; instala solo `[GH]` props (no toca primitivas del operador); read-only por permisos; no toca compute (central). Onboarding no afecta tenants existentes. |
| **Robustness** | Verify-before-install; honest degradation (smoke falla → `degraded`, no falso OK); re-fetch (no confiar payload); Notion-Version explícito. |
| **Resilience** | Re-correr repara drift; rollback = no instalar / des-registrar; signals de drift/unprovisioned/not_ready. |
| **Scalability** | El objetivo mismo: N clientes sin trabajo manual de métricas; tenant-agnóstico. |
| **Auditability** ⭐ | State machine append-only del onboarding; cada paso auditado; drift detectable. |

## 12. Hard rules

- **NUNCA** onboardear un cliente instalando fórmulas de cómputo ICO en Notion — el motor es Greenhouse; solo se instalan primitivas + `[GH]` targets.
- **NUNCA** agregar aliases de estado per-cliente — enforce vocabulary canónico (11 V1) al onboarding (TASK-742).
- **NUNCA** construir `provision-tenant` para el mundo legacy de fórmulas — solo para el target (primitivas + `[GH]`), después de la migración de cómputo.
- **NUNCA** confiar el payload del webhook ni omitir HMAC al suscribir.
- **NUNCA** `Sentry.captureException` directo — `captureWithDomain(err, 'integrations.notion', { tags: { source: 'tenant_provisioning', stage } })`.
- **SIEMPRE** idempotente: `provision-tenant` re-corrible para onboarding Y reparación de drift.
- **SIEMPRE** verify-before-install + smoke de readiness con degradación honesta.
- **SIEMPRE** reusar `discover`/`register`/`space_notion_sources` — no paralelizar el registro.

## 13. Open questions (deliberadamente sin cerrar)

1. **Verify drift → bloquear vs auto-reparar**: ¿`provision-tenant` auto-corrige schema drift (renombra/crea) o solo reporta y exige acción humana? Recomiendo: auto-instala `[GH]` props faltantes; **reporta** (no auto-renombra) divergencias de estado (riesgo de pisar data).
- 2. **¿Crear DB Tareas/Proyectos/Sprints por API si el humano no duplicó el template**, o exigir siempre el clone manual? Recomiendo: V1 exige clone (Notion no crea teamspaces por API igual); API solo para `[GH]` props.
3. **Dónde vive el estado de onboarding**: extender `space_notion_sources` vs tabla `notion_tenant_provisioning` nueva.
4. **¿Surface UI** (Admin Center "Onboard tenant") o CLI/script en V1? Recomiendo CLI/admin endpoint V1, UI follow-up.
5. **Property allowlist `[GH]`**: qué set exacto de propiedades `[GH]` instala el provisioner (depende de qué métricas tienen writeback live al momento — hoy RpA v2; OTD cuando shipee).

## 14. Roadmap por tasks derivadas (follow-up, no creadas)

- Task **provisioning control plane**: `provision-tenant` (verify/install/register/subscribe/smoke) + state machine + 3 reliability signals + admin endpoint/CLI.
- Task **Golden Template hardening**: formalizar el template canónico (qué props primitivas + `[GH]` targets) como artefacto versionado, no solo "clone Demo Greenhouse".
- Depende de: migración de cómputo (RpA V2 + OTD redefinition) live.

## 15. Cross-refs

- `GREENHOUSE_TASK_STATUS_LIFECYCLE_V1` — Golden Template + onboarding = clone (decisión base)
- `GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1` — Notion = OS / Greenhouse = motor
- `GREENHOUSE_ATTRIBUTABLE_LATENESS_V1` — la migración OTD que habilita esto
- `GREENHOUSE_SOURCE_SYNC_PIPELINES_V1` / `space_notion_sources` — registro
- TASK-742 (status canónico) · TASK-910 (demo = clone vivo) · TASK-912 (captura) · TASK-916 (writeback)
