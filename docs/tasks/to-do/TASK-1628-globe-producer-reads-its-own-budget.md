# TASK-1628 — El Producer puede leer su propio presupuesto

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `api`
- Epic: `EPIC-028`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `task/TASK-1628-globe-producer-reads-its-own-budget`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El tope mensual de crédito existe, está publicado y el runtime lo aplica — pero la superficie `ui` no
puede leerlo, así que el panel de créditos del Producer muestra el dato equivocado. Esta task abre los
dos readers de presupuesto a `ui` **sin** abrir las capabilities de mutación que hoy comparten su
`COVERAGE`, agrega la capability al grant humano por el rollout de tres pasos, y reconecta el anillo del
header al tope real.

## Why This Task Exists

`TASK-1566` declaró en su alcance que `globe.credits.budget.evaluate` y
`globe.credits.budget.availability.get` pasaban a `ui: available`. La task está `complete` y **esa parte
no se aplicó**: `packages/domain/src/credit-administration.ts:34` sigue con
`COVERAGE={ui:'policy-blocked',…}`.

La consecuencia es visible y fue reportada por el operador el 2026-08-01: el panel del header muestra
`Uso del mes: 0 / —` mientras la política activa declara un tope de **1.500 créditos**. El header cayó
en `globe.credits.usage.get` —el **ledger**, que responde *"cuánto se acreditó en esta ventana"*— porque
es el único disponible en su superficie. Ese número es 0 en cualquier mes sin recarga, y el fondeo es
esporádico: hay 501.110 créditos acreditados en julio y ninguno en agosto.

Medido en `globe-pg` el 2026-08-01 (sólo lectura, vía Cloud SQL proxy con IAM):

| Dato | Valor |
|---|---|
| `credit_admin_policy_versions` activa → `monthlyCap` | **1.500** |
| `lowBalanceThreshold` | 20 |
| `GLOBE_LAB_DAILY_CAP_CREDITS` (`globe-api-internal`) | **500** |
| Historial de la política | 100 → 110 → 400 → 800 → 1.500 |
| Gastado julio / agosto | 244 / 0 |

Con el reader correcto el anillo mostraría `0 / 1.500` hoy y habría mostrado `244 / 1.500` (16 %) en
julio — un medidor que se mueve. Es la **tercera** aparición del mismo patrón en una sola sesión: la
capability existe y la superficie no la consume (las otras dos: el diálogo de compare del feed y el
`nextCursor` de la paginación).

## Goal

- Los dos readers de presupuesto son consumibles desde `ui` **sin** que ninguna capability de mutación
  de crédito cambie de coverage.
- El grant humano del Producer lleva `globe.credits.budget.read`, aplicado sin romper el login.
- El anillo del header mide gasto del período contra el tope real de la política, y el aro neutro queda
  reservado para la ausencia genuina de política.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/EFEONCE_GLOBE_API_CONTRACT_SPINE_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_GREENHOUSE_ADMINISTRATION_DECISION_V1.md` (ADR-015)
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`

Reglas obligatorias:

- Una surface que no se implementa es `policy-blocked`, nunca "sin contrato": `missing` no es
  representable en `SurfaceCoverageState`.
- **NUNCA** ampliar el coverage de una capability de mutación de crédito para desbloquear una lectura.
  El `COVERAGE` compartido es una coincidencia de implementación, no una decisión.
- **NUNCA** agregar un capability scope al grant del broker en un solo movimiento: el broker impone
  `capabilityScopes ⊆ requiredScopes`, así que otorgar un scope lo vuelve **requerido**, y un cliente
  desplegado que no lo pida deja de poder iniciar sesión — pasó con ADR-010 y tumbó todo el login.
- El header no computa autoridad: lee lo que el reader publica y degrada honesto si su gate no está
  `available`.

## Normative Docs

- `docs/tasks/complete/TASK-1566-globe-governed-credit-funding-command.md` — declaró este cambio en su
  alcance (líneas 183 y 267) y advierte que abrir el coverage **sin** la capability en el grant no
  arregla nada: sólo renombra `policy_blocked` como `access_denied`.
- `docs/issues/open/ISSUE-124-globe-credit-grant-canonical-409-root-cause-hidden.md`

## Dependencies & Impact

### Depends on

- `packages/domain/src/credit-administration.ts` — registro de commands/readers y su `COVERAGE`.
- `packages/contracts/src/credit-administration.ts` — `CreditBudgetAvailabilityV1`,
  `CreditBudgetEvaluationV1`.
- `apps/studio-web/src/app.ts` — `PRODUCER_HUMAN_CAPABILITY_SCOPES`.
- `greenhouse-eo` → `src/lib/sister-platforms/globe-oauth-grants.ts` — `GLOBE_PRODUCER_CAPABILITY_SCOPES`.

### Blocks / Impacts

- `ISSUE-124` — el desambiguador de la negación deja de ser inalcanzable desde la superficie humana.
- Cualquier superficie futura que quiera mostrar presupuesto (Workbench, Nexa) hereda el reader abierto.

### Files owned

- `packages/domain/src/credit-administration.ts`
- `apps/studio-web/src/app.ts`
- `apps/studio-client/src/surfaces/producer/ProducerHeader.tsx`
- `src/lib/sister-platforms/globe-oauth-grants.ts` (repo `greenhouse-eo`)

## Current Repo State

### Already exists

- `CreditBudgetAvailabilityV1` publica `policyAvailable`, `ledgerAvailable`, `effectiveAvailable`,
  `spentInPeriod` y `policyVersion` — exactamente el dato que el anillo necesita.
- `CreditBudgetEvaluationV1` publica `reason` tipado, incluido `month_cap_exceeded`.
- La política activa con `monthlyCap` está publicada y el runtime la aplica.
- El anillo del header ya mide el ciclo y ya cae a aro neutro sin denominador (PR #66 de `efeonce-globe`);
  sólo está conectado a la fuente equivocada.

### Gap

- `COVERAGE` es **uno solo** para las tres registraciones del módulo (`command`, `reader` de política y
  `reader` de presupuesto): no existe forma de abrir un reader sin abrir las mutaciones.
- `globe.credits.budget.read` no está en `PRODUCER_HUMAN_CAPABILITY_SCOPES` ni en el grant del broker.
- El header usa `globe.credits.usage.get` como denominador del período.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `efeonce-globe` (`packages/domain`, `apps/studio-web`, `apps/studio-client`) + `greenhouse-eo` (broker OAuth)
- Future candidate home: `remain-shared`
- Boundary: el reader de presupuesto es el primitive; los consumers autorizados son las superficies humanas de Globe con la capability en su grant.
- Server/browser split: la autoridad y el cálculo quedan server-side; el browser recibe una proyección ya resuelta y nunca deriva disponibilidad.
- Build impact: `none`
- Extraction blocker: `none`

## Backend/Data Contract

- **Contrato tocado:** ninguno cambia de forma. Se modifica el `coverage` declarado de dos readers
  existentes y se agrega una capability a un grant. Los tipos de respuesta quedan idénticos.
- **Migraciones:** ninguna.
- **Autorización:** `globe.credits.budget.read` (ya existente en `capabilities.ts`). El reader sigue
  workspace-scoped por trusted context.
- **Idempotencia:** n/a — son lecturas.
- **Observabilidad:** el gate del header ya reporta su razón cuando el reader no está `available`; al
  abrirlo, esa razón deja de aparecer y el dato se muestra.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Separar el coverage de lectura del de mutación

- Introducir un `READ_COVERAGE` con `ui: 'available'` aplicado **sólo** a
  `globe.credits.budget.evaluate` y `globe.credits.budget.availability.get`.
- `COVERAGE` actual queda intacto para commands y para el resto de los readers del módulo.
- Test que afirma la disyunción: ninguna capability cuyo `kind` sea `command` puede tener
  `ui: 'available'` en este módulo. Es el guard que impide que un cambio futuro los vuelva a fundir.

### Slice 2 — Rollout del scope en tres pasos, verificando login entre cada uno

- Paso 1 — `greenhouse-eo`: `globe.credits.budget.read` a `allowedScopes` **solamente**. Verificar
  `/auth/start` y `authorize`; el login debe seguir intacto.
- Paso 2 — `efeonce-globe`: agregar el scope a `PRODUCER_HUMAN_CAPABILITY_SCOPES` y desplegar.
  Verificar login otra vez.
- Paso 3 — `greenhouse-eo`: mover el scope a `capabilityScopes` + `requiredScopes`. Verificar login y
  que el token ya lleve la capability.

### Slice 3 — El anillo lee el tope real

- El header consume `globe.credits.budget.availability.get` detrás de su gate.
- Denominador = tope de la política; numerador = `spentInPeriod`.
- El aro neutro queda **sólo** para `policy_unavailable` — la ausencia genuina de política, no la
  ausencia de recarga en el mes.
- El cap diario (`500`) se expone en el panel junto al mensual: son dos límites que niegan por separado.

## Out of Scope

- Cambiar el `monthlyCap`, emitir grants o fondear: esta task **lee**, no administra.
- Abrir cualquier capability de mutación de crédito a `ui`.
- El guard de "un solo grant activo" que `ISSUE-124` descarta.
- La píldora de llegadas y la paginación del feed — ya entregadas, sin relación.

## Detailed Spec

### El coverage compartido, y por qué no se toca

`packages/domain/src/credit-administration.ts:34` declara **un** `COVERAGE` y lo aplican las tres
registraciones del módulo: `command(...)`, el `reader` de política y el `reader` de presupuesto. Cambiar
`ui` ahí abriría también `createPool`, `issueGrant` y `publishPolicy` a la superficie humana.

La forma correcta es una segunda constante aplicada sólo a los dos readers de presupuesto:

```ts
const COVERAGE      = { ui:'policy-blocked', http:'available', … } as const; // commands + policy reader
const READ_COVERAGE = { ...COVERAGE, ui:'available' } as const;              // budget readers only
```

`READ_COVERAGE` se deriva de `COVERAGE` a propósito: si mañana alguien cierra `sdk` o `cli` en el
módulo, la lectura lo hereda y no queda una segunda tabla divergiendo en silencio. Lo único que la
lectura decide por su cuenta es `ui`.

El guard que impide la regresión afirma la disyunción sobre los descriptores REGISTRADOS, no sobre las
constantes: ninguna capability de `kind: 'command'` del módulo puede tener `ui: 'available'`. Un test
sobre las constantes pasaría aunque alguien aplicara `READ_COVERAGE` a un command por error.

### El dato que consume el header

`globe.credits.budget.availability.get` → `CreditBudgetAvailabilityV1`:

| Campo | Uso en el anillo |
|---|---|
| `spentInPeriod` | numerador |
| `policyAvailable` | el resto disponible bajo la política |
| `policyVersion` | qué política se está midiendo |
| `ledgerAvailable` | el saldo del espacio — sigue en la cifra del chip, no en el aro |

El denominador es `spentInPeriod + policyAvailable`, no un campo propio: es el tope vigente derivado de
lo que el reader publica, y evita que el header tenga que leer la política por separado y arriesgar dos
fuentes desincronizadas.

`globe.credits.budget.evaluate` aporta `reason` tipado; su valor `policy_unavailable` es la ÚNICA
condición que deja el aro neutro. Un mes sin recarga ya no lo es.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 → Slice 3, sin excepción.
- Slice 2 tiene su propio orden interno **inviolable**: broker-permitido → cliente-pide →
  broker-otorga. Invertirlo tumba el login de todos los usuarios de Globe.
- Slice 3 no puede ejecutarse antes de que el paso 3 del Slice 2 esté verificado: sin la capability en
  el token, el reader responde `access_denied` y el header mostraría un error donde antes había un dato
  incompleto — peor que el estado actual.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Abrir mutaciones de crédito a `ui` al tocar el `COVERAGE` compartido | identity / crédito | medium | Coverage separado + test de disyunción command/ui | Test rojo en `pnpm check` |
| Romper el login de Globe al mover el scope | SSO | high si se hace en un paso | Rollout de 3 pasos con verificación de `/auth/start` y `authorize` entre cada uno | `400 invalid_scope` en authorize; "Acceso no disponible" en login |
| El header muestra `access_denied` donde antes mostraba un dato parcial | UI | medium | Slice 3 después del paso 3 verificado; el gate ya degrada honesto | Razón del gate visible en el panel |
| Exponer disponibilidad de presupuesto a un principal que no debería verla | crédito | low | El reader es workspace-scoped por trusted context y la capability va sólo al grant humano del Producer | Auditoría del grant |

### Feature flags / cutover

Sin flag. El cambio de coverage es declarativo y su revert es un PR; el scope tiene su propio rollback
por paso (ver abajo). Un flag adicional daría una tercera fuente de verdad sobre si la capability está
disponible, que es justamente la confusión que esta task cierra.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revert del PR; el coverage vuelve a `policy-blocked` | < 10 min | sí |
| Slice 2 paso 1 | Quitar el scope de `allowedScopes` con `pnpm sister-platform:redirect`-equivalente del grant | < 10 min | sí |
| Slice 2 paso 2 | Revert del deploy de `studio-web` a la revisión anterior | < 15 min | sí |
| Slice 2 paso 3 | Mover el scope de vuelta a `allowedScopes` — **nunca** quitarlo del todo mientras el cliente desplegado lo pida | < 10 min | sí |
| Slice 3 | Revert del PR; el header vuelve al denominador del ledger | < 10 min | sí |

### Production verification sequence

1. Slice 1 desplegado; `/v1/capabilities` muestra los dos readers en `ui: available` y **ningún** command del módulo cambiado.
2. Slice 2 paso 1; `authorize` responde `303` y el login funciona.
3. Slice 2 paso 2 desplegado; login funciona y `/auth/start` anuncia el scope nuevo.
4. Slice 2 paso 3; login funciona y `/v1/session` muestra la capability en el principal.
5. Slice 3 desplegado; el panel muestra el tope real (hoy `0 / 1.500`) y el cap diario.
6. Generar una pieza y verificar que el anillo avanza.

### Out-of-band coordination required

Ninguna fuera de los dos repos. El cambio no toca Azure, GCP secrets ni proveedores.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `globe.credits.budget.evaluate` y `globe.credits.budget.availability.get` están `ui: available`
- [ ] Ninguna capability `kind: command` del módulo de crédito quedó `ui: available`, y hay un test que lo afirma
- [ ] El login de Globe funciona verificado después de **cada** paso del Slice 2
- [ ] El panel muestra el tope mensual real y el cap diario
- [ ] El aro neutro aparece sólo ante `policy_unavailable`, no ante un mes sin recarga
- [ ] Una generación real hace avanzar el anillo

## Verification

- `pnpm check` y `pnpm build` en `efeonce-globe`
- `pnpm local:check` en `greenhouse-eo`
- Login humano verificado entre cada paso del Slice 2
- Lectura del panel contra los valores de `credit_admin_policy_versions`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] Delta en `TASK-1566` registrando que su alcance declarado se completó acá y por qué quedó fuera

## Follow-ups

- Auditar si otras tasks `complete` declararon cambios de coverage que tampoco se aplicaron: este gap
  sobrevivió a un cierre documental porque nadie compara lo declarado contra `/v1/capabilities`.
- La proyección de agotamiento (`CreditExhaustionForecastV1`) sigue en `insufficient-data`; con el tope
  legible, el aro podría además señalar estado además de proporción.

## Open Questions

- ¿El cap diario merece su propio indicador o basta con exponerlo en el panel? Hoy niega por separado
  del mensual y el operador no tiene forma de verlo venir.
