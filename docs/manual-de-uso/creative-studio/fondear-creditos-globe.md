# Manual — Fondear los créditos de Globe por el carril gobernado (propose → confirm)

> **Tipo de documento:** Manual de uso / runbook (orientado al operador)
> **Version:** 1.2
> **Creado:** 2026-07-26 por Claude (TASK-1566)
> **Ultima actualizacion:** 2026-08-01 por Codex (TASK-1630)
> **Documentacion tecnica:** [ADR-015](../../architecture/creative-studio/EFEONCE_GLOBE_GREENHOUSE_ADMINISTRATION_DECISION_V1.md) · [TASK-1566](../../tasks/complete/TASK-1566-globe-governed-credit-funding-command.md)

## Para qué sirve

Este manual explica cómo **ponerle presupuesto al mes de créditos de Globe** — el combustible de la
generación de imagen/video/audio — por el **carril gobernado**: un usuario autenticado, humano o
agente delegado, propone un plan, lo revisa y lo confirma por API. Reemplaza al break-glass
(impersonar la service account y firmar a mano), que se usó tres veces para esta misma clase de acto
y ya no debe usarse.

Ejercido end-to-end por primera vez el 2026-07-26: `confirm` en 905 ms, grant +100, tope 400→800,
atribuido al operador real. Este manual documenta ese camino verificado, con las dos correcciones de
runbook que salieron de medirlo.

## Antes de empezar

- **Las dos capas de crédito NO son lo mismo.** El **ledger** (`credits.allocate`) es la caja; la
  **política** (`monthlyCap` + grants de pools activos) es lo que el gasto consulta. Cargar el ledger
  sin subir la política no habilita nada — el plan del propose te muestra exactamente eso.
- **Un fondeo útil casi siempre sube `monthlyCap`.** Si el tope vigente es lo que restringe (caso
  típico), un grant sin `monthlyCap` deja `policyAvailableAfter` igual o menor que antes. El plan lo
  dice antes de confirmar; léelo.
- **Quién hace qué:** un usuario humano puede confirmar con sus entitlements; un usuario agente
  puede hacerlo cuando el runtime reconoce una autoridad one-shot o una delegación expresa del workspace y el
  acto cabe en sus límites. Un workload, API key o principal de servicio genérico nunca confirma.
- **Necesitas:** una sesión autenticada en Google Chrome para completar OAuth, los scopes
  `globe.credits.funding.propose` y `globe.credits.funding.confirm`, los entitlements de
  administración de créditos, el `poolId` vigente (ver
  [`GLOBE_RUNTIME_HANDOFF.md`](../../operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md)), y que
  `GLOBE_CREDIT_ADMIN_LANE_ENABLED=true` esté en la revisión activa de `globe-api-internal`.
- **La propuesta vence en 15 minutos.** Se confirma sobre el estado que se vio; si venció, se
  propone de nuevo.

## Paso a paso

### 1. Ejecutar el cliente OAuth gobernado

Desde el repo de Greenhouse, usa el cliente canónico. Abre Google Chrome para autorizar mediante
OAuth 2.0 Authorization Code + PKCE y conserva el token solo en memoria. La sesión puede pertenecer
a una persona o a un agente autenticado; la política de delegación se valida nuevamente al confirmar.

```bash
GREENHOUSE_API_BASE_URL=https://dev-greenhouse.efeoncepro.com \
GLOBE_ADMIN_OAUTH_CLIENT_ID=greenhouse-admin-cli \
pnpm globe:credit-funding -- \
  --input '{"globeWorkspaceId":"greenhouse-org:efeonce","poolId":"<pool-vigente>","grantCredits":500,"monthlyCap":1500,"periodStart":"<inicio-UTC>","periodEnd":"<fin-UTC>"}' \
  --propose-idempotency-key <clave-unica-propose> \
  --confirm-idempotency-key <clave-unica-confirm> \
  --yes true
```

Sin `--yes true`, el CLI muestra el plan y pide confirmación interactiva. `--yes true` es válido para
un agente sólo cuando la autoridad/delegación ya existe en el runtime; la instrucción textual del operador no
omite ninguna verificación server-side.

> **Estado de convergencia:** este comando es el carril V1 recuperado por TASK-1629. Todavía exige `poolId` y dos
> claves de idempotencia; no ofrece `status/list/reconcile` ni asegura por sí solo el pool del período. TASK-1630
> ordena corregir primero la verdad de período/enforcement (TASK-1482) y luego entregar one-command/readback. No
> tratar este comando crudo como la experiencia final.

### 2. Revisar el plan — éste es el punto entero del carril

El plan muestra el **delta**: `monthlyCapBefore/After`, `policyAvailableBefore/After`,
`spentInPeriod` y, si hoy se niega, `currentDenialReason`. Reglas de lectura:

- Si `policyAvailableAfter` **no sube**, el fondeo no sirve como está — probablemente falta subir
  `monthlyCap`.
- Un `monthlyCap` por debajo de lo ya gastado se rechaza en el propose (`invalid_request`).

### 3. Confirmar — con clave de idempotencia propia

⚠️ **Corrección de runbook (medida 2026-07-26):** el confirm **necesita su propia clave** — reusar
la del propose devuelve `409 globe_funding_already_recorded` (el broker registra la intención por
clave). Usa `${KEY}-confirm`.

La respuesta trae `outcome.outcome` con `state: completed`, `grantId`, `policyId` (si subiste el
tope) y `allocationEntryId`. Todo ocurre en **una** transacción: grant + asiento de ledger + política
+ estado terminal.

### 4. Verificar

1. **Intents** (Greenhouse PG): `SELECT phase, actor_user_id FROM
   greenhouse_core.globe_credit_funding_intents ORDER BY created_at DESC LIMIT 2` → `proposed` +
   `confirmed` con el user id real y `actor_auth_mode` (`human` o `agent`).
2. **Globe PG**: grant `posted`, política nueva `active` (la anterior `superseded`), asiento
   `allocation` con los créditos.
3. **Generación**: el estimado del Producer debe mostrar `withinDayCap`/disponible acorde al plan.

## Qué significan los estados de una propuesta

| Estado | Significa | Acción |
|---|---|---|
| `proposed` | Esperando confirmación; vence a los 15 min | Revisar plan y confirmar, o dejar vencer |
| `expired` | Venció sin confirmar | Proponer de nuevo |
| `completed` | Fondeo ejecutado; apunta a grant/política/asiento | Nada — es el estado final feliz |
| `confirm_failed` | La confirmación falló DESPUÉS de transicionar; la transacción revirtió | Leer el estado antes de reintentar; es evidencia, no se borra |
| `confirmed` (sin completar) | Anomalía: la mutación no terminó (era el síntoma del deadlock pre-fix) | NO reintentar a ciegas; ver `pg_locks`; se terminaliza vía TASK-1469 |

## Qué NO hacer

- **NO** reintentar un `confirm` tras un timeout del cliente sin leer primero el estado — puede
  haber completado en el servidor.
- **NO** reusar la clave de idempotencia del propose en el confirm (409 garantizado).
- **NO** convertir una API key, service account o principal de workload en confirmador. Un agente
  debe entrar como usuario autenticado y estar delegado por la política del workspace.
- **NO** extraer cookies, tokens, `localStorage` ni contraseñas de Chrome. Chrome aporta únicamente
  la sesión autenticada para la autorización OAuth; el CLI recibe el código PKCE por loopback.
- **NO** usar los scripts legacy de firma cliente (`raise-credit-monthly-cap.mjs`) ni el break-glass
  para fondear: su premisa (firmar desde el cliente) contradice el diseño y están en retiro.
- **NO** tocar las tablas de crédito con SQL manual.

## Problemas comunes

| Síntoma | Causa probable | Salida |
|---|---|---|
| `409 globe_funding_already_recorded` | Reusaste una clave, o esa propuesta ya tiene decisión registrada (el anti-replay del broker es **por propuesta**: ningún confirm repetido pasa, con cualquier clave) | Leer el estado de la propuesta; si `completed`, ya está |
| `422 globe_funding_rejected` | Globe rechazó el payload (4xx real, no un problema de red) | Leer `code`; no reintentar igual |
| `503 globe_unavailable` | El puente falló (red/WIF); si ocurrió durante confirm, el outcome puede ser desconocido | No repetir confirm a ciegas. Verificar health y reconciliar la propuesta/intent; TASK-1629 agrega el readback canónico |
| `401` | Sin sesión válida | Renovar sesión del portal |
| `403 agent_confirmation_forbidden` | El usuario agente no tiene delegación activa para ese workspace | Habilitar la política gobernada; no usar una identidad humana como bypass |
| `422 agent_funding_limit_exceeded` | El grant o el tope mensual excede la delegación del agente | Reducir el acto o elevar la política mediante el dueño del workspace |
| `400 invalid_request` en propose | Tope < gastado, período inválido, o payload incompleto | Corregir el plan |
| Plan con `currentDenialReason: pool_exhausted` | Los grants activos no cubren lo pedido | El plan igual se puede confirmar; la razón es el estado VIGENTE, no el resultante |

## Referencias técnicas

- Decisión: [ADR-015 — Greenhouse administra Globe](../../architecture/creative-studio/EFEONCE_GLOBE_GREENHOUSE_ADMINISTRATION_DECISION_V1.md)
- Programa de convergencia y autoridad CEO/agente: [TASK-1630](../../tasks/to-do/TASK-1630-globe-credits-control-plane-convergence.md)
- Implementación + evidencia del primer fondeo real: [TASK-1566](../../tasks/complete/TASK-1566-globe-governed-credit-funding-command.md) (Deltas 4–6)
- Estado vivo (revisiones, pool, flags): [`GLOBE_RUNTIME_HANDOFF.md`](../../operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md)
- Explicación en simple: [documentación funcional](../../documentation/creative-studio/fondeo-gobernado-creditos-globe.md)
- Reglas de gasto/crédito para agentes: skill `greenhouse-globe` § «Gasto y crédito en Globe»
