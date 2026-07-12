# Crear y operar una propuesta (Proposal Studio)

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.0
> **Creado:** 2026-07-12 por Claude
> **Ultima actualizacion:** 2026-07-12 por Claude
> **Modulo:** Comercial — Proposal Studio (`TASK-1392`)
> **Ruta en portal:** — (no hay UI todavía: se opera por API y por scripts)
> **Documentacion tecnica:** [GREENHOUSE_TENDER_PROPOSAL_STUDIO_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_TENDER_PROPOSAL_STUDIO_ARCHITECTURE_V1.md)
> **Documentacion funcional:** [proposal-studio-aggregate.md](../../documentation/comercial/proposal-studio-aggregate.md)
> **Método comercial:** [construir-una-licitacion.md](../comercial/construir-una-licitacion.md)

## Para qué sirve

Una **propuesta** (`Proposal`) es el objeto de negocio de una licitación pública, un RFP privado o una
venta directa. Este manual explica cómo crearla, cómo mover su ciclo de vida, cómo adjuntarle el RFP,
cómo registrar la evidencia que sostiene cada cifra, cómo declarar los requisitos de las bases y cómo
vincular la cotización que decide si vale la pena competir.

Todo lo que hagas acá queda **auditado y es irreversible por diseño**: las propuestas no se borran, la
evidencia no se edita y el historial de transiciones no se toca. Un `declined` o un `lost` son estados,
no un `DELETE`.

## Antes de empezar

**Necesitas 2 puertas abiertas, en este orden:**

1. **Entitlement por organización.** El módulo `proposal_studio_v1` debe estar asignado a la
   organización dueña de la propuesta (`ownerOrgId`) en
   `greenhouse_client_portal.module_assignments` con `status` en `active` o `pilot`. Hoy sólo está
   activo para **Efeonce** (`org-2df565fb-98aa-42f7-b324-ea9a2209017f`). Sin esto, cualquier llamada
   devuelve **403 `proposal_not_entitled`**, sin importar tu rol.
2. **Capability de tu rol.** Dentro de una organización habilitada:

   | Rol | Leer | Crear / actualizar / avanzar | Cruzar gates humanos | Pedir renders |
   |---|---|---|---|---|
   | `efeonce_admin` | Sí | Sí | Sí | Sí |
   | `efeonce_account` | Sí | Sí | Sí | Sí |
   | `efeonce_operations` | Sí | No | No | **No** (tampoco puede *leer* jobs de render) |
   | Cualquier rol `client_*` | **Nunca** | Nunca | Nunca | Nunca |

   Las capabilities son `commercial.proposal.read`, `commercial.proposal.manage`,
   `commercial.proposal.gate` y `commercial.proposal.render`.

**Ambientes.** Staging funciona completo. En Production el ciclo de la propuesta opera, pero el
**render está apagado** (ver [operar-el-artifact-worker.md](operar-el-artifact-worker.md)).

**Cómo llamar la API desde staging** (SSO activo — nunca `curl` directo):

```bash
pnpm staging:request /api/commercial/proposals?ownerOrgId=org-2df565fb-98aa-42f7-b324-ea9a2209017f
pnpm staging:request POST /api/commercial/proposals '{"ownerOrgId":"…","clientOrganizationId":"…","origin":"private_rfp","title":"…"}'
```

## Paso a paso

### 1. Crear la propuesta

**API:** `POST /api/commercial/proposals`

```json
{
  "ownerOrgId": "org-2df565fb-98aa-42f7-b324-ea9a2209017f",
  "clientOrganizationId": "org-…",
  "origin": "private_rfp",
  "title": "SKY — Gestión del blog 2026 (Wherex)",
  "platform": "Wherex",
  "deadline": "2026-07-15T18:00:00Z",
  "deadlineConfidence": "ambiguous",
  "deadlineAssumption": "Bases §2.5: se asume la fecha de cierre de recepción de ofertas.",
  "currency": "CLP",
  "idempotencyKey": "sky-blog-2026-wherex"
}
```

Respuesta: `201` con `{ "proposal": {…}, "idempotent": false }`. Si repites la llamada con el mismo
`idempotencyKey`, devuelve `200` con `"idempotent": true` y **la misma propuesta** — reintentar nunca
duplica.

**Reglas del formulario que el sistema exige (no son sugerencias):**

| Campo | Regla |
|---|---|
| `origin` | `public_tender`, `private_rfp` o `direct_sales`. **Inmutable** después de crear. |
| `publicOpportunityId` | Obligatorio **si y sólo si** `origin=public_tender`. Ningún otro origen lo admite. |
| `title` | Mínimo 3 caracteres. |
| `deadline` | Si lo declaras, **debes** declarar `deadlineConfidence` (`confirmed` o `ambiguous`). Si no hay fecha, el sistema guarda `none_declared`. La ausencia de deadline es una declaración explícita, nunca un silencio. |
| `deadlineAssumption` | Sólo se acepta cuando `deadlineConfidence` es `ambiguous`. Es donde escribes *de dónde sacaste la fecha*. |
| `ownerOrgId`, `clientOrganizationId` | **Inmutables**. Una propuesta no cambia de dueño ni se reasigna de comprador. |

> **Por qué el `deadline` es columna de primera clase:** si se pasa, el proceso se pierde sin
> recuperación. De ese campo salen la señal `commercial.proposal.deadline_at_risk` y la **prioridad de
> la cola de render**.

**Script (local, contra el proxy de Postgres):** el comando canónico equivalente es `createProposal`
desde `src/lib/commercial/tenders/proposals/store.ts`. La corrida de referencia real vive en
`scripts/commercial/_sanity-sky-render-pipeline.ts`.

### 2. Adjuntar el RFP y los documentos

El **binario nunca entra por la API de la propuesta**. El archivo se sube primero al asset store
canónico (donde se escanea) y después se le da significado con este endpoint.

**API:** `POST /api/commercial/proposals/{proposalId}/assets`

```json
{
  "ownerOrgId": "org-2df565fb-…",
  "assetId": "asset-…",
  "kind": "rfp_source",
  "audience": "internal",
  "version": 1
}
```

`kind` admite: `rfp_source`, `fillable_template`, `diagnostic`, `technical_offer`, `economic_offer`,
`admissibility_matrix`, `deck`, `other_doc`.

**El `audience` tiene un default seguro.** Si no lo declaras, el sistema lo deriva del `kind`:

| `kind` | `audience` por defecto |
|---|---|
| `technical_offer`, `economic_offer`, `deck` | `client_facing` |
| **todo lo demás** (`rfp_source`, `diagnostic`, `admissibility_matrix`, `fillable_template`, `other_doc`) | `internal` |

El default **nunca** promueve material interno hacia el comprador. Promoverlo exige declararlo a mano.

**Formatos y tamaño aceptados** por el asset store para contextos de propuesta: PDF, JPEG, PNG, WEBP,
`.docx` y `.xlsx` (Office OpenXML). Los `.doc`/`.xls` legacy y los ZIP están fuera. Techo: **50 MB**.

> ⚠️ **Gap conocido (2026-07-12):** el endpoint genérico de subida `POST /api/assets/private` **aún no
> acepta** los contextos `proposal_rfp_draft` / `proposal_deliverable_draft`. Hoy el binario del RFP se
> sube desde un script server-side (`createPrivatePendingAsset`), no desde HTTP. El vínculo semántico
> (este paso 2) sí funciona por API con un `assetId` ya existente.

**Descargar un documento de la propuesta:** `GET /api/assets/private/{assetId}` (los PDF e imágenes se
sirven inline; agrega `?inline=1` para forzarlo). Requiere `commercial.proposal.read`; ningún rol
`client_*` puede descargarlo jamás.

### 3. Registrar evidencia — el paso donde se gana o se pierde plata

**API:** `POST /api/commercial/proposals/{proposalId}/evidence`

```json
{
  "ownerOrgId": "org-2df565fb-…",
  "externalSourceSnapshot": { "source": "run del AI Visibility Grader", "runId": "run-…" },
  "locator": "dimensión 3 · tabla de motores",
  "method": "corrida del grader con 4 motores, 2026-07-10",
  "asOf": "2026-07-10",
  "classification": "measured",
  "audience": "client_facing"
}
```

Con fuente-asset en lugar de snapshot:

```json
{
  "ownerOrgId": "org-2df565fb-…",
  "sourceAssetId": "asset-…",
  "locator": "bases.pdf p. 14, tabla 2",
  "method": "cita textual de las bases",
  "asOf": "2026-07-01",
  "classification": "attested",
  "audience": "client_facing"
}
```

**Reglas duras:**

- **Exactamente una fuente:** `sourceAssetId` **o** `externalSourceSnapshot`. Nunca ambas, nunca ninguna.
- Si usas `sourceAssetId`, ese asset **debe estar ya vinculado a esta propuesta** (paso 2). La evidencia
  cita fuentes de la propuesta, no del store global.
- `locator` y `method` son obligatorios (≥3 caracteres cada uno). Sin procedencia no hay evidencia.
- `classification`: `measured` (lo medimos), `illustrative` (es un ejemplo, no un dato del cliente) o
  `attested` (alguien lo afirma y firma).
- **`audience` es obligatorio y no es derivable.** Se declara al registrar.
- La evidencia es **inmutable**: no se edita ni se borra. Si estaba mal, registras una nueva fila que la
  supersede. El sistema sella el contenido con un hash SHA-256.

#### El `audience` como riesgo comercial (léelo aunque saltes el resto)

Marcar una evidencia como `client_facing` significa: **"este dato puede viajar dentro del PDF que le
entrego al comprador"**.

Marcarla `internal` significa: **"esto lo mira sólo mi lado de la mesa"**. Ahí viven el diagnóstico, la
matriz de admisibilidad y —sobre todo— el **squad blueprint con el loaded cost**: el costo real cargado
de cada persona del equipo. Ese número **es el piso de negociación**. Si se filtra al comprador dentro
de una lámina, no estás perdiendo un secreto técnico: le estás entregando el punto exacto hasta donde
puedes bajar el precio. La negociación termina antes de empezar.

Por eso el sistema **falla cerrado**: un artefacto `client_facing` que referencie **una sola** evidencia
`internal` se **rechaza completo** al momento de encolar el render (`audience_violation`). No se omite la
lámina, no se filtra la cita: se cae el render entero. Y no hay forma de arreglarlo reintentando — hay
que corregir el plan y pedir un render nuevo.

### 4. Declarar los requisitos del RFP

**API:** `POST /api/commercial/proposals/{proposalId}/requirements`

```json
{
  "ownerOrgId": "org-2df565fb-…",
  "requirementKind": "format",
  "label": "El archivo de la propuesta técnica no podrá superar los 20 MB",
  "value": "20 MB",
  "sourceLocator": "bases.pdf §4.2",
  "sourceAssetId": "asset-…",
  "isBlocking": true
}
```

`requirementKind` admite: `excluyente`, `puntua`, `economic_minimum`, `format`, `deadline`, `penalty`,
`sla`. El campo `weight` **sólo** se acepta cuando `requirementKind` es `puntua`.

**El `label` debe ser el literal de las bases, no tu paráfrasis.** Es evidencia.

**De este set salen los gates del render.** El sistema lee los requisitos de tipo `format` y
`excluyente` y deriva las restricciones del archivo:

| Lo que el requisito dice | Lo que el sistema fija en el job |
|---|---|
| menciona MB (ej. "20 MB", "máximo 15 megabytes") | `maxPdfMb`. Si hay más de un límite, gana **el más restrictivo**. |
| menciona un máximo de páginas/láminas (ej. "máximo 40 páginas") | `maxPages` |
| menciona accesibilidad (`PDF/UA`, `Section 508`, `EAA`, `WCAG`, "accesible", "accessibility") — en **cualquier** tipo de requisito | `accessibilityRequired = true` ⇒ **el render se rechaza al encolar** |
| no dice nada sobre peso | `maxPdfMb = 20` (default de admisibilidad de portal) |

> **Sobre accesibilidad:** el motor usa Chromium para imprimir el PDF, y Chromium **no emite PDF
> taggeado**. Si las bases exigen PDF/UA, el sistema **no ofrece un PDF a medias**: rechaza el render
> con `accessibility_unsupported`. Mejor no ofertar que presentar un archivo inadmisible. La detección
> es deliberadamente conservadora: prefiere un falso positivo que un humano revisa.

### 5. Vincular la cotización (la costura con el cotizador)

**API:** `POST /api/commercial/proposals/{proposalId}/quote`

```json
{ "ownerOrgId": "org-2df565fb-…", "quoteId": "quot-…" }
```

La propuesta **no calcula el precio ni lo transcribe: lo referencia**. El cotizador es el único que
calcula sobre loaded cost.

- La cotización debe pertenecer **a la misma organización compradora** que la propuesta. Si no, el
  sistema rechaza (una económica de otra org dentro del PDF es la clase de error que no se ve mirando).
- Una vez que la propuesta entra a `packaging`, la cotización queda **congelada** y **no se puede
  re-apuntar**. Un PDF cuyo precio cambia después miente.

### 6. Mover el ciclo de vida

**API:** `POST /api/commercial/proposals/{proposalId}/transitions`

```json
{
  "ownerOrgId": "org-2df565fb-…",
  "toState": "producing",
  "reason": "GO aprobado: fit alto, margen 34% sobre el piso declarado.",
  "metadata": { "comite": "2026-07-11" }
}
```

`reason` es obligatorio y necesita **≥5 caracteres**. Repetir una transición ya aplicada devuelve
`200` con `"idempotent": true` (no-op), no un error.

**Consultar el detalle + el historial completo:**
`GET /api/commercial/proposals/{proposalId}?ownerOrgId=…` devuelve `{ proposal, transitions }`.

## Qué significan los estados

Los **12 estados** del ciclo y las **11 transiciones legales**. Cualquier salto fuera de esta matriz es
rechazado por el command **y** por la base de datos (409 `proposal_invalid_transition`).

| # | Desde | Hacia | ¿Gate humano? | Quién puede cruzarla | Qué más exige |
|---|---|---|---|---|---|
| 1 | `intake` | `analyzing` | No | `manage`/`execute` (también `system`/`cli`) | — |
| 2 | `analyzing` | `analyzed` | No | `manage`/`execute` | — |
| 3 | `analyzed` | `fit_review` | No | `manage`/`execute` | — |
| 4 | `fit_review` | **`producing`** | **Sí** | **Persona** (`actor member`) con capability `commercial.proposal.gate` | **Gate de margen:** cotización vinculada, con margen efectivo conocido, **positivo** y **sobre el piso declarado**. Falla cerrado. |
| 5 | `fit_review` | **`declined`** | **Sí** | **Persona** con `commercial.proposal.gate` | Terminal. No se reabre. |
| 6 | `producing` | `base_ready` | No | `manage`/`execute` | Requiere cotización vinculada (regla de la DB para todo estado post-GO). |
| 7 | `base_ready` | `packaging` | No | `manage`/`execute` | **Congela la cotización** en un snapshot inmutable. |
| 8 | `packaging` | `ready_to_submit` | No | `manage`/`execute` | Exige que el snapshot ya exista. |
| 9 | `ready_to_submit` | **`submitted`** | **Sí** | **Persona** con `commercial.proposal.gate` | El humano sube y firma. El sistema nunca presenta solo. |
| 10 | `submitted` | `won` | No | `manage`/`execute` | Terminal. |
| 11 | `submitted` | `lost` | No | `manage`/`execute` | Terminal. |

**Los 3 gates humanos son `fit_review → producing`, `fit_review → declined` y
`ready_to_submit → submitted`.** Un agente, un script (`cli`) o el sistema **no los cruzan** — ni por un
bug: la base de datos exige `actor_kind='member'` con `member_id` para cualquier transición marcada como
gate. No existe `actor_kind='agent'` en el esquema.

**Estados terminales:** `declined`, `won`, `lost`. No tienen salida en la matriz — una propuesta cerrada
no se reabre. Si te equivocaste, creas una propuesta nueva.

### El gate de margen, en detalle

Al cruzar `fit_review → producing` el sistema lee la cotización vinculada y rechaza (409
`proposal_quote_gate_failed`) en cualquiera de estos casos:

| Código interno | Qué pasó |
|---|---|
| `quote_missing` | La propuesta no tiene cotización vinculada. Sin costo conocido no hay GO. |
| `quote_not_found` | La cotización vinculada ya no existe. |
| `margin_unknown` | La cotización no tiene margen efectivo calculado. |
| `margin_not_positive` | Margen ≤ 0. Un fit perfecto con margen negativo es **NO-BID**. |
| `margin_below_floor` | El margen es positivo pero está bajo el piso declarado. El GO exige margen **sobre el piso**, no cualquier margen. |

### Señales de confiabilidad (visibles en `/admin/operations`)

| Señal | Estado sano | Qué significa si suena |
|---|---|---|
| `commercial.proposal.stuck_in_state` | 0 | Hay propuestas activas sin movimiento hace **más de 14 días**: un bid pudriéndose en silencio. |
| `commercial.proposal.deadline_at_risk` | 0 | Hay propuestas con deadline a **menos de 72 h** que aún no están listas para presentar. **Si se pasa, el proceso se pierde.** Severidad `error`. |

## Qué no hacer

- **Nunca escribas SQL directo** contra `greenhouse_commercial.proposals` ni sus tablas hijas. Los
  triggers lo bloquean (campos inmutables, anti-`DELETE`, matriz de estados, gate humano), pero además
  te saltarías el historial y el outbox. Todo pasa por los commands.
- **Nunca marques una evidencia `client_facing` "para que pase el render".** Si el dato es interno,
  sacarlo del deck es la solución; cambiar la etiqueta es regalar el piso de negociación.
- **Nunca uses un `deadline` inventado "para que quede algo".** Si no lo sabes, no lo declares: la
  ausencia es un estado válido (`none_declared`). Un deadline falso corrompe la prioridad de la cola y
  la señal de riesgo.
- **Nunca parafrasees un requisito en el `label`.** Copia el literal de las bases. De ahí salen los gates
  que deciden si tu PDF es admisible.
- **Nunca intentes borrar una propuesta.** `declined` y `lost` son estados. La base de datos rechaza el
  `DELETE`.
- **Nunca vincules una cotización de otra organización.** El sistema lo rechaza, pero si lo consigues por
  otra vía, el PDF llevará el precio equivocado y nadie lo va a notar mirando.

## Problemas comunes

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| `403 proposal_not_entitled` | La organización no tiene el módulo `proposal_studio_v1` asignado. | Verifica `module_assignments` para ese `ownerOrgId`. La activación es una decisión humana (se contrata por organización, no se hereda por rol). |
| `403 forbidden` | Tu rol no tiene la capability, o eres un usuario `client_*`. | Ver la tabla de roles en "Antes de empezar". `efeonce_operations` sólo lee. |
| `403 proposal_human_gate_required` | Intentaste cruzar un gate humano desde un script/agente, o sin `memberId`. | Ese paso lo confirma una persona. Es el diseño, no un bug. |
| `409 proposal_invalid_transition` | Saltaste un estado (ej. `analyzed → producing`). | Consulta la matriz de arriba. La ruta es secuencial. |
| `409 proposal_quote_gate_failed` | No hay cotización, o el margen es desconocido / ≤0 / bajo el piso. | Vincula o corrige la cotización en el cotizador. El gate no aprueba por omisión. |
| `422 proposal_invalid_input` | Falta un campo obligatorio, o rompiste una regla (dos fuentes de evidencia, `weight` en un requisito que no puntúa, `deadlineAssumption` sin `ambiguous`…). | Revisa las reglas de cada paso. El mensaje es genérico a propósito: el detalle técnico va a Sentry, no al cliente. |
| `404 proposal_not_found` | El `proposalId` no existe **o no pertenece a tu organización**. | Verifica el `ownerOrgId`. Todos los readers son org-scoped: una propuesta de otra org simplemente no existe para ti. |
| Registré mal una evidencia y no puedo editarla | Es inmutable por diseño. | Registra una nueva fila que la supersede y deja de citar la anterior en el plan del deck. |

## Referencias tecnicas

- Commands y readers: `src/lib/commercial/tenders/proposals/store.ts`, `assets.ts`, `quote-gate.ts`
- Autorización: `src/lib/commercial/tenders/proposals/authz.ts`, `access.ts`
- Máquina de estados: `src/lib/commercial/tenders/tender-state-machine.ts`
- Esquema: `migrations/20260712160001023_task-1392-proposal-studio-foundation.sql`
- API: `src/app/api/commercial/proposals/**`
- Señales: `src/lib/reliability/queries/commercial-proposal-signals.ts`
- Errores canónicos: `src/lib/api/canonical-error-response.ts` (códigos `proposal_*`)
- Siguiente paso: [generar-el-deck-de-una-propuesta.md](generar-el-deck-de-una-propuesta.md)
