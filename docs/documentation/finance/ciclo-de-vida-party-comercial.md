# Ciclo de Vida de Parties Comerciales — Del Prospecto al Cliente Activo

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-04-21 por Claude (Opus 4.7) — TASK-535
> **Ultima actualizacion:** 2026-04-21 por Claude
> **Documentacion tecnica:**
> - Spec: [GREENHOUSE_COMMERCIAL_PARTY_LIFECYCLE_V1](../../architecture/GREENHOUSE_COMMERCIAL_PARTY_LIFECYCLE_V1.md)
> - Task: [TASK-535](../../tasks/complete/TASK-535-party-lifecycle-schema-commands-foundation.md)
> - Programa paraguas: [TASK-534](../../tasks/to-do/TASK-534-commercial-party-lifecycle-program.md)
> - Event catalog: [GREENHOUSE_EVENT_CATALOG_V1 § Commercial Party Lifecycle](../../architecture/GREENHOUSE_EVENT_CATALOG_V1.md)

## Que es una "Party"

En Greenhouse una **Party** es cualquier empresa con la que tenemos algun tipo de relacion comercial: un lead de marketing, una empresa a la que le estamos cotizando, un cliente que ya nos factura, un cliente que se fue, un proveedor que nos vende. Todas son la misma fila tecnica (`greenhouse_core.organizations`), pero tienen un **estado** distinto segun en que momento del embudo comercial estan.

Antes de este cambio, Greenhouse solo consideraba "cliente" a una empresa **despues** de ganar un closed-won en HubSpot. Todo lo previo vivia en HubSpot sin reflejo en Greenhouse. El equipo comercial tenia que saltar al CRM cada vez que queria cotizar a una empresa nueva.

Ahora toda empresa vive como `Organization` desde el primer momento en que aparece en el funnel, con un **estado** que refleja donde esta.

## Los 7 estados del lifecycle

| Estado | Significado | Puede cotizar | Puede facturar |
|---|---|---|---|
| `prospect` | Lead detectado en HubSpot o ingresado manualmente. Sin deal ganado todavia. | Si | No |
| `opportunity` | Al menos un HubSpot deal en pipeline abierto. Target activo. | Si | No |
| `active_client` | Deal ganado o contrato activo. Tiene `client_id` asociado. | Si | Si |
| `inactive` | Fue cliente activo pero sin contratos ni facturacion en los ultimos 6 meses. | Si (recotizar) | No (pausa) |
| `churned` | Fin de relacion explicito o por falta de actividad prolongada. | Con override | No |
| `provider_only` | Proveedor que nos vende; no es target comercial. | No | No (AP separado) |
| `disqualified` | Descartada del funnel (fuera de mercado, blacklist, conflicto). | No | No |

## Como se mueven entre estados

Las transiciones no son libres — estan governadas por una maquina de estados que define que transiciones son legales. Solo tres "comandos" internos pueden mover a una Party:

1. **`promoteParty`** — mover una Party de un estado a otro (p.ej. `prospect → opportunity` cuando aparece un deal, o `opportunity → active_client` cuando se firma un contrato).
2. **`createPartyFromHubSpotCompany`** — crear una Party desde una company nueva de HubSpot (normalmente como `prospect`).
3. **`instantiateClientForParty`** — side-effect automatico al entrar a `active_client`: crea el `client_id` + perfil financiero.

Toda transicion queda registrada **inmutable** en `organization_lifecycle_history`: quien la hizo, cuando, desde que estado, por que motivo. No se puede editar ni borrar esta tabla a nivel de base de datos.

### Transiciones validas

```
prospect      → opportunity, active_client, disqualified
opportunity   → active_client, disqualified, prospect (si se pierden todos los deals)
active_client → inactive, churned, provider_only
inactive      → active_client (recuperada), churned
churned       → active_client (solo con override explicito)
disqualified  → prospect (solo con override)
provider_only → (terminal — no cruza al funnel)
```

## Quien puede cambiar el estado

Las transiciones requieren capabilities especificas segun la severidad:

| Comando | Capability requerida | Roles default con acceso |
|---|---|---|
| Crear Party desde HubSpot | `commercial.party.create` | `efeonce_admin` (en Fase A; `sales` cuando exista el rol) |
| Promover a `active_client` | `commercial.party.promote_to_client` | `efeonce_admin`, `finance_admin` |
| Marcar como churned | `commercial.party.churn` | `efeonce_admin` (mas `sales_lead` cuando exista) |
| Override de estado terminal | `commercial.party.override_lifecycle` | Solo `efeonce_admin` |
| Crear deal desde Greenhouse | `commercial.deal.create` | `efeonce_admin` (en Fase A) |
| Ejecutar quote-to-cash | `commercial.quote_to_cash.execute` | `efeonce_admin`, `finance_admin` |

Los roles `sales` y `sales_lead` todavia no existen en el portal; cuando aterricen (fases B+), las capabilities se extenderan sin tocar el catalogo.

## Como se conecta con HubSpot

HubSpot tiene su propio campo `lifecyclestage` en Company. Greenhouse lo mapea al estado canonico cuando sincroniza:

| HubSpot `lifecyclestage` | Greenhouse `lifecycle_stage` |
|---|---|
| `subscriber`, `lead`, `marketingqualifiedlead`, `salesqualifiedlead` | `prospect` |
| `opportunity` | `opportunity` |
| `customer`, `evangelist` | `active_client` |
| `other` | `churned` |
| (sin valor) | `prospect` por default |

### Cuando HubSpot cambia nombres de stages

HubSpot permite que cada portal renombre los stages built-in o agregue stages custom (p.ej. "Partner", "Strategic Account"). Si eso pasa, **no hace falta redesplegar Greenhouse**.

Los admins pueden configurar el mapping via la variable de entorno `HUBSPOT_LIFECYCLE_STAGE_MAP_OVERRIDE` en Vercel, con un JSON como:

```json
{
  "partner": "active_client",
  "strategic_account": "active_client",
  "unqualified_lead": "disqualified"
}
```

Stages desconocidos **nunca rompen** el sync — caen a `prospect` por default y se registra un warning en logs para que ops se entere y los agregue explicitamente.

> Detalle tecnico: [src/lib/commercial/party/hubspot-lifecycle-mapping.ts](../../../src/lib/commercial/party/hubspot-lifecycle-mapping.ts). Ver tambien `GREENHOUSE_COMMERCIAL_PARTY_LIFECYCLE_V1` §4.5.

### Sync bi-direccional controlado

Greenhouse ya no solo recibe lifecycle desde HubSpot. Tambien devuelve a HubSpot, cuando Greenhouse gana la autoridad del campo:

- `lifecyclestage`
- `gh_commercial_party_id`
- `gh_last_quote_at`
- `gh_last_contract_at`
- `gh_active_contracts_count`
- `gh_last_write_at`
- `gh_mrr_tier`

HubSpot sigue siendo owner de:

- `name`
- `domain`
- `industry`
- `address`
- `phone`

Si ambos lados escriben casi al mismo tiempo, Greenhouse registra el conflicto y evita loopback usando `gh_last_write_at` como guard anti-ping-pong.

## Que eventos se emiten

Cada cambio de estado genera un evento en el outbox que puede ser consumido por otros modulos:

| Evento | Cuando se emite | Quien lo consume |
|---|---|---|
| `commercial.party.created` | Al crear una Party nueva (inbound HubSpot o manual) | Materializacion del selector (Fase D), outbound sync (Fase F) |
| `commercial.party.promoted` | Promocion hacia adelante (p.ej. `prospect → opportunity`) | Sync outbound a HubSpot, quote-to-cash, analytics |
| `commercial.party.demoted` | Movimiento hacia atras (p.ej. `opportunity → prospect` por perder deals) | Sync outbound, analytics |
| `commercial.party.hubspot_synced_out` | Cuando Greenhouse logra o intenta cerrar el write outbound hacia HubSpot | Observabilidad del bridge outbound, retry/degraded paths |
| `commercial.party.sync_conflict` | Cuando field authority, anti-ping-pong u override bloquean o resuelven un write | Admin Center, runbooks operacionales, auditoria |
| `commercial.party.lifecycle_backfilled` | Migracion inicial o re-clasificacion bulk | Auditoria operacional |
| `commercial.client.instantiated` | Cuando se crea automaticamente el `client_id` + perfil financiero | Finance, pipelines de atribucion de costos, ICO |

Todos los eventos incluyen `commercial_party_id` — un identificador **estable y unico** para la Party que no cambia aunque `organization_id` se reasigne. Este es el id que los modulos deben usar para referenciar una Party en reports, dashboards o integraciones externas.

## Que garantiza el sistema

- **Historial inmutable**: cada transicion deja rastro en `organization_lifecycle_history`. No se puede borrar ni editar.
- **Un unico camino de escritura**: los tres comandos son el unico write path legal. Nada mas puede tocar `lifecycle_stage` directamente.
- **Transacciones atomicas**: si un comando falla, nada se persiste — ni la actualizacion del estado, ni el history, ni el evento.
- **Idempotencia**: `createPartyFromHubSpotCompany` no crea duplicados si la company ya existe. El backfill inicial puede correr dos veces sin efectos.
- **Validacion de permisos**: ningun comando corre sin la capability correspondiente.
- **Validacion de transicion**: promover de `prospect` a `inactive` (ilegal) se rechaza antes de tocar la base de datos.
- **Side-effects controlados**: al entrar a `active_client`, el sistema crea automaticamente el `client_id` y su perfil financiero con defaults (CLP + 30 dias de pago). Si ya existe un cliente, lo reutiliza sin duplicar.

## Estado del programa

| Fase | Task | Que trae |
|---|---|---|
| B | TASK-536 | Shipped. HubSpot companies nuevas se materializan como `prospect` automaticamente |
| C | TASK-537 | Shipped. `GET /parties/search` + `POST /parties/adopt` ya listos. V1 usa `greenhouse_crm.companies` y expone `hubspot_candidate` solo para carril interno |
| D | TASK-538 | Shipped. Quote Builder ya consume el selector unificado como carril default; adopta candidates HubSpot on-select y preserva `organizationId` como anchor canónico |
| E | TASK-539 | Shipped. Crear deal desde Greenhouse sin saltar a HubSpot |
| F | TASK-540 | Shipped. Greenhouse ya propaga lifecycle a HubSpot, valida anti-ping-pong y deja trazabilidad de conflictos |
| G | TASK-541 | Shipped. Quote-to-cash atomico: firmar contrato + promover a cliente + crear income, todo en una transaccion |
| H | TASK-542 | Shipped. Admin Center: dashboards de funnel, conflictos de sync, detalle por party, transiciones manuales y sweep de inactivos |
| I | TASK-543 | Cleanup post-rollout: remover flags y branches legacy del selector/sync inbound |

## Ejemplos practicos

### Caso 1 — Company nueva desde HubSpot (Fase B)

Cuando aterrice la Fase B:

```
HubSpot Company creada (lifecyclestage=lead)
  → webhook → createPartyFromHubSpotCompany({hubspotCompanyId: "...", hubspotLifecycleStage: "lead"})
    → Organization nueva con lifecycle_stage="prospect", commercial_party_id=<uuid estable>
    → Evento commercial.party.created emitido
    → Visible en Quote Builder via selector unificado
```

### Caso 2 — Deal cerrado won (Fase E/G)

```
HubSpot deal stage=closedwon
  → webhook → promoteParty({organizationId, toStage: "active_client", source: "deal_won", triggerEntity: {type: "deal", id: "..."}})
    → Valida transicion opportunity→active_client (legal)
    → Inserta fila en organization_lifecycle_history
    → Update lifecycle_stage en organizations
    → Side-effect: instantiateClientForParty crea client_id + fin_client_profiles (CLP/30d defaults)
    → Evento commercial.party.promoted emitido
    → Evento commercial.client.instantiated emitido
    → Todo en una transaccion atomica
```

### Caso 3 — Override manual desde Admin Center (Fase H)

```
Admin marca manualmente a una empresa como "churned" con razon
  → UI → POST /api/commercial/parties/{id}/promote
    → Valida que el actor tiene capability commercial.party.churn
    → promoteParty({toStage: "churned", source: "manual", actor: {userId, reason}})
    → Se registra la razon en history.metadata
```

## Preguntas frecuentes

**¿Que pasa con las empresas que ya existian antes de este cambio?**

Se ejecuto un backfill idempotente que clasifico a todas las organizations existentes segun estas reglas (adaptadas al schema real):

- Empresa con `client_id` (via `fin_client_profiles` o `hubspot_company_id` compartido) + contratos activos → `active_client`
- Empresa con `client_id` sin facturacion en los ultimos 6 meses → `inactive`
- Empresa con `client_id` y facturacion reciente → `active_client`
- Sin `client_id` → `prospect` por default

Cada org tiene al menos una fila en `organization_lifecycle_history` con `transition_source='bootstrap'`.

**¿Puedo cambiar el estado de una empresa desde la UI?**

Si, pero solo desde Admin Center y con permisos altos. La surface `Commercial Parties` en `/admin/commercial/parties` deja revisar el detalle por party, resolver conflictos de sync y forzar una transición manual cuando el actor tiene la capability `commercial.party.override_lifecycle`. Toda intervención deja rastro en `organization_lifecycle_history` con `source='operator_override'` y razón obligatoria.

**¿Que hago si HubSpot agrega un stage nuevo que no esta mapeado?**

Dos opciones:
1. Setear `HUBSPOT_LIFECYCLE_STAGE_MAP_OVERRIDE` en Vercel con el mapping, sin redeploy.
2. Si el stage es parte canonica del modelo comercial, agregarlo como default mapping (toca `hubspot-lifecycle-mapping.ts` y amerita task dedicada).

Mientras tanto los stages desconocidos caen a `prospect` y se loguea un warning.

**¿Puedo agregar un estado nuevo (p.ej. "negotiation")?**

No trivial — requiere:
1. Migration para ampliar el CHECK constraint en `organizations.lifecycle_stage` y `organization_lifecycle_history.to_stage`.
2. Extender `LIFECYCLE_STAGES` en `types.ts`.
3. Actualizar la maquina de estados (`ALLOWED_TRANSITIONS`).
4. Decidir si se expone a HubSpot (outbound) y con que `lifecyclestage` mapear bidireccionalmente.

Por eso la mejor via es registrar una task dedicada si se necesita un estado nuevo canonico.

> Detalle tecnico:
> - Codigo del modulo: [src/lib/commercial/party/](../../../src/lib/commercial/party/)
> - Migrations: [20260421113910459_task-535-organization-lifecycle-ddl.sql](../../../migrations/20260421113910459_task-535-organization-lifecycle-ddl.sql) + [20260421114006586_task-535-organization-lifecycle-backfill.sql](../../../migrations/20260421114006586_task-535-organization-lifecycle-backfill.sql)
> - Spec canonica: [GREENHOUSE_COMMERCIAL_PARTY_LIFECYCLE_V1](../../architecture/GREENHOUSE_COMMERCIAL_PARTY_LIFECYCLE_V1.md)
