# TASK-1747 — Application 360: asignación y recuperación de acceso al test

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P0`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1747-application360-assessment-access-recovery.md`
- Flow: `docs/ui/flows/TASK-1747-application360-assessment-access-recovery-flow.md`
- Motion: `none`
- Backend impact: `api`
- Epic: `EPIC-011`
- Status real: `Los 5 slices cerrados y auditados, y EL CÓDIGO ESTÁ EN origin/main (verificado 2026-08-26: AssessmentRecoveryCluster.tsx + copy accessRecovery en ambos diccionarios) — no es «code-complete localmente». Faltan: re-auditar los 8 hallazgos que este doc lista como ABIERTOS (al menos 3 los cerró el Slice 4 y la lista no se actualizó: es triage, no código), la oclusión de la mascota de Nexa sobre el cluster a 390px (el gate de layout no detecta oclusión) y canonizar el error del POST, que devuelve {ok:false, code} sin prose es-CL ni actionable. Los 17 checkboxes sin marcar contradicen este estado y hay que reconciliarlos`
- Rank: `TBD`
- Domain: `hr|ui|delivery`
- Blocked by: `TASK-1746`
- Branch: `Greenhouse develop; checkout compartido; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `ISSUE-160`

## Traspaso 2026-08-19 — estado para tomar en frío

Los cinco slices cerrados, auditados y commiteados. Queda ejercitar en staging las ramas que ninguna captura puede dar contra datos reales.

### Commits de esta task

| Commit | Qué |
|---|---|
| `3ea7d6f7e` | Slice 1 — copy en los 3 archivos (es-CL, en-US, tipo) |
| `34fed36e6` | Slice 1 corregido tras auditoría de dominio (6 bloqueantes) |
| `f99bb92e1` | Slice 2 — puente de datos (**revertido en parte**, ver abajo) |
| `2e2d4de86` | Slice 2 corregido tras auditoría de arquitectura |
| `6e75fe482` | Slice 3 — enlace efímero eliminado + asignación gobernada |
| `5319de56a` | Slice 3 corregido tras auditoría adversarial (3 bloqueantes + 5 altos) |
| `8a102ecea` | Slice 4 — recuperación de acceso + revelación única |
| `304e973dc` | Slice 4 corregido tras auditoría adversarial (2 bloqueantes + 7 altos) |
| `8803dfd46` | Slice 5 — calidad: aria-live, 390px, degradado con salida, escenario GVC |
| `957d17f6f` | Slice 5 corregido tras auditoría adversarial (3 bloqueantes + 4 altos) |

### Qué está hecho

- **Copy completo** bajo `hiringDesk.application.accessRecovery`: CTA, canal, 5 motivos, 9 mensajes
  de no-disponibilidad, cuota por canal, cooldown, revelación única, errores y 3 aria-labels.
  Auditado y corregido: los motivos conservan el "dice que" del enum (nadie puede afirmar que un
  correo NO llegó), "candidatura cerrada" no se le muestra a alguien con decisión `selected`, y
  `cancelled` tiene su propia frase con el remedio real (reasignar).
- **Bug de backend corregido** (`2e2d4de86`): el cooldown de `availability.ts` era cross-canal
  mientras el command lo filtra por canal — un correo recién enviado apagaba el enlace seguro por
  60 s. El DTO ahora expone `cooldownUntil` y `secureLinkCooldownUntil` por separado. 4 tests nuevos.
- **Fixture de `availability.test.ts` corregido**: omitía `secure_link_count_24h`, así que
  `Number(undefined)` daba `NaN` y el presupuesto del enlace **nunca se ejercitaba**.

### Qué se revirtió a propósito

El cableado de `accessRecovery` a la página y a las props de la vista se **revirtió**. Motivo: las
props de un Client Component se serializan en el payload RSC y viajan en el HTML **se lean o no**,
así que el slice bajaba al navegador el consentimiento de la candidata y el estado del proveedor sin
que ningún componente los renderizara. El cableado debe viajar **en el mismo slice que lo pinta**.

Las dos `can()` de recuperación tampoco quedaron en la página por la misma razón (lint las marcaba
sin usar). Van con el slice que dibuja el affordance.

### Slices pendientes

**Slice 3 — CERRADO.** El enlace efímero ya no existe en el cliente (`oneTimeToken`,
`oneTimeAssessmentLink`, el `Alert` con la URL y el botón "Abrir superficie" están eliminados;
`grep` da 0). La asignación pasa por propose→confirm y el diálogo es preview + confirmación: el
servidor resuelve la plantilla desde la política de la vacante. `listTemplates()` salió de la página
y el botón quedó gateado por `hiring.assessment.author`.

La auditoría adversarial encontró que el slice reintrodujo la misma clase de mentira un nivel más
abajo, y quedó corregido:

- **Falso éxito.** `result: null` no es `already_assigned`: llega **sólo** cuando la propuesta ya
  era terminal, y el desenlace original pudo ser cualquiera de los 6 —bloqueos incluidos—. La
  pantalla pintaba toast verde y cerraba. Ahora se declara que no se sabe en qué terminó y se manda
  a revisar la ficha.
- **Bloqueo invisible.** El preview trae `blockingReasonCode`, que existe justamente para mostrar el
  bloqueo antes de confirmar, y el diálogo lo descartaba. Cubre tres causas que ningún otro campo
  delata —política en `draft`, plantilla inactiva, candidatura decidida—, y `draft` es el estado en
  que nace toda política. Ahora se renderiza y deshabilita el confirm.
- **Intento quemado.** Confirmar contra un bloqueo ocupa la clave de idempotencia del ledger de esa
  persona **para siempre**. La mitigación de pantalla (no dejar confirmar sobre un bloqueo
  declarado) es lo que cabe acá; la causa vive en el command y quedó registrada como `TASK-1755`.
- **La tarjeta no se actualizaba.** `router.refresh()` re-renderiza el server component pero el
  initializer de `useState` no vuelve a correr: tras asignar seguía viéndose "sin test asignado".
  Resuelto con re-sincronización desde props.
- **Copy que mentía.** "el test se crea, pero nadie se lo puede enviar" era falso (sin correo el
  command bloquea antes de crear nada), y `existingOpen` derivaba a una recuperación que aún no
  existe. Corregidos.
- **Endpoint legacy retirado.** `POST /api/hiring/assessments` con `method='candidate_test'` seguía
  devolviendo el token crudo a cualquier consumidor con la capability; sacarlo de la UI no cerraba
  nada. Devuelve 410 apuntando al camino gobernado. `interviewer_scorecard` sigue vivo.
- **Errores.** El mapa cubría 5 códigos y recetaba "intenta de nuevo" a causas estructurales.
  `HiringClientError` ahora conserva `actionable` y el fallback distingue reintentable de terminal.

**Slice 4 — CERRADO.** Cluster por tarjeta, confirmación deliberada (canal + motivo) y revelación
única. El cableado revertido en el Slice 2 viajó acá, en el mismo slice que lo pinta.

La auditoría adversarial encontró que el DTO cometía el noveno patrón canónico una capa más abajo, y
quedó corregido en la raíz:

- **El DTO colapsaba estados que el sistema distingue.** `channels.*.available` era
  `eligibility.allowed && !limited && hasEmail && !providerBlocked`: cinco causas con cinco remedios
  distintos en un solo `false`. La superficie ya no podía recuperarlas y todas caían al último
  `else` del cluster, que decía **"No tienes permiso"** a un operador que sí lo tenía. Ahora cada
  canal declara `blockedBy` y cada causa tiene su frase.
- **El caso del incidente terminaba en "pide permiso a Admin".** Un test vencido que la persona
  nunca empezó es exactamente el 2026-08-19. La página lee la disponibilidad sin motivo, el default
  no puede probar el vencimiento previo al inicio, ambos canales quedaban en `false` y el operador
  era enviado a Admin por algo que él resolvía declarando el motivo correcto. Toda la maquinaria
  reason-dependent era código muerto.
- **Cuota agotada se disfrazaba de falla transitoria.** `limited` implica `eligible:false` con
  `eligibilityCode:null`, así que caía al genérico "intenta de nuevo en unos minutos" — y la espera
  real es de hasta 24 horas. El cooldown, que tenía copy con segundos, nunca se renderizaba.
- **Un replay de correo se reportaba como despacho nuevo.** `replayed` no se leía: la UI pintaba
  "correo despachado" sobre un recibo original donde no salió ningún correo. Ahora se lee, y la
  llave de idempotencia se consume tras el desenlace para que el botón no invite a repetirlo.
- **El portapapeles afirmaba éxito sin verificarlo.** Si `writeText` rechaza, la credencial se
  pierde con el token del candidato YA rotado. Ahora se confirma o se avisa.
- **ESC mataba la revelación única.** Un reflejo de teclado destruía una credencial que no se vuelve
  a mostrar. El diálogo se cierra sólo por su botón.
- **El GET nuevo abría consentimiento y entregabilidad a todo tenant interno.** Estaba gateado con
  `hiring.assessment.read`, que la porta el routeGroup `internal` — collaborator, designer,
  people_viewer incluidos —, y devolvía consentimiento retirado, decisión no comunicada y
  `providerStatus`. Además aceptaba un `assessmentId` suelto, sin el binding a `applicationId` que
  el POST sí exige. Ahora pide al menos una capability de recuperación y compara el aggregate.
- **`providerStatus` viajaba al payload RSC sin que nadie lo pintara**, la misma regla que se
  revirtió en el Slice 2. Ahora se usa: el buzón bloqueado se ve en la tarjeta en vez de descubrirse
  gastando un intento.
- El vencimiento del enlace usa hora, no sólo fecha: para una credencial de 24 h, "20/08/2026" no
  distingue 1 hora de 23.

Pendiente declarado del Slice 4 (no bloqueante): el candidato **no recibe aviso** cuando se emite un
enlace seguro, aunque su credencial anterior queda muerta. Si la entrega en mano falla, la persona
queda sin acceso y sin saber por qué. Es herencia de TASK-1746 y merece decisión de People Ops.

**Slice 5 — CERRADO.** `aria-live` con el rol elegido a conciencia, apilado a 390px con la primaria
a ancho completo en los DOS diálogos, foco restaurado cuando el diálogo terminó de salir, degradado
con salida y señal, escenario GVC con sonda que ejerce `reduced-motion`, y gate de FUENTE sobre la
credencial. Cuatro gates verdes: design-contract, ui:code-lint, ui:visual-gate, ui:quality
(promedio 4,61 · piso 4,0).

La auditoría adversarial encontró algo que vale más que sus arreglos: **los cuatro gates estaban
verdes midiendo, con rigor real, un alert estático de bloqueo — y nada más.** El escenario no abría
ningún diálogo, los gates de accesibilidad y layout estaban scopeados a la tarjeta (que no contiene
diálogos), la sonda de teclado aterrizaba en un componente ajeno, la de `reduced-motion` no llegaba
a ejecutarse, y la única aserción apuntada al incidente buscaba un selector que ninguna rama del
código puede producir. Así fue como la acción primaria terminó sin ancho completo en móvil con el
commit afirmando "verificado en captura real".

Lo corregido: primaria a ancho completo (el reemplazo original falló en silencio porque la línea
objetivo había cambiado en el slice anterior); `aria-live` que era inerte sobre Alerts que ya eran
regiones vivas; foco que no volvía tras la revelación única; aserción vacía reemplazada por gate de
fuente; sonda que ahora sí ejerce `reduced-motion`; reintento con señal; copy duplicada retirada.

**Sobre `UI ready`:** se deja en `no` deliberadamente. Ese flag responde si la task tenía contrato de
diseño suficiente ANTES de escribir JSX, y la respuesta honesta al momento de autorarla fue que no —
el wireframe declaraba un escenario que no existía y su plan GVC citaba aserciones que ninguna rama
podía producir. Ponerlo en `yes` al cerrar no vuelve más lista la ejecución que ya ocurrió; sólo
borraría el registro de que se implementó sin ese contrato completo. Las secciones que faltaban
(Mobile Target, Action Hierarchy, Visual Fidelity Mapping, Copy Ledger, Accessibility Contract) SÍ
se escribieron y quedan en el wireframe: sirven para la próxima superficie que toque esta card, que
es su propósito real.

**Pendiente declarado, no resuelto:** la mascota flotante de Nexa se superpone al borde derecho del
cluster a 390px, y el gate de layout NO detecta oclusión — su verde nunca fue evidencia sobre eso.
En la rama con CTA ese borde aloja el botón y su cuota. Merece verificación cuando esa rama sea
capturable.

### Hallazgos de la auditoría que siguen ABIERTOS

Ninguno bloquea el Slice 3, pero el Slice 4 los va a chocar:

1. **`contracts.ts` es `server-only`** y contiene los 5 motivos, los 8 códigos y las constantes de
   cuota — justo lo que la UI necesita para mapear código→copy. El navegador no puede importarlo.
   Sin partirlo en `contracts.ts` (server) + `vocabulary.ts` (isomorfo con los `as const`, los tipos
   y la función pura de elegibilidad), el Slice 4 va a re-declarar el vocabulario en el cliente:
   dos fuentes de verdad sin gate que las compare.
2. **El `reasonCode` que determinó la respuesta no viaja en el DTO.** Para un assessment `expired`
   el único motivo que lo habilita es `token_expired_before_start`; consultarlo con otro devuelve
   "no disponible" sin decir por qué. El reader debería exponer `allowedReasonCodes` en vez de que
   la página adivine con un ternario.
3. **`null` significa dos cosas** en el reader: falló, y el assessment no existe (`availability.ts`
   devuelve `null` en ambos). La UI no puede distinguir "reintenta" de "no reintentes nunca".
4. **`RECOVERABLE_STATUSES` duplicaba** el `ASSESSMENT_ACCESS_RECOVERY_ELIGIBLE_STATUSES` que
   `contracts.ts` ya exporta. Al recablear, importarlo en vez de re-escribir el literal.
5. **Full API Parity sin declarar.** La capacidad "explicar por qué no se puede recuperar" queda
   UI-only: ni Nexa ni MCP la alcanzan. O se agrega `GET .../access-recovery` (adapter delgado del
   mismo reader, mismas capabilities) y se corrige `Backend impact: api`, o se declara follow-up.
6. **El reader no está acotado al aggregate**: recibe sólo `assessmentId`. Como primitive de parity,
   un segundo consumidor obtendría consentimiento y entregabilidad de cualquier candidato.
7. **`eligible: false` con `eligibilityCode: null`** cuando la denegación viene del rate limit. La UI
   queda con una denegación sin etiqueta.
8. **Dos implementaciones de la misma decisión** (`availability.ts` explica, `recover-email.ts`
   ejecuta) sin nada mecánico que las alinee. Ya divergieron una vez — es el bug que corrigió
   `2e2d4de86`. El patrón canónico del repo para esto es VIEW + helper + señal.

### Decisiones ya tomadas que NO hay que re-litigar

- **Props desde la página, no `GET` nuevo** — el reader ya se declara "token-free operator reader
  used by Application 360". El `GET` queda como follow-up de parity (punto 5).
- **La franja de "estado de entrega" del wireframe se reduce.** El reader sólo expone estados
  NEGATIVOS (`bounced`/`complained`/`suppressed`); no hay `delivered`. Informar sólo cuando el correo
  está bloqueado y callar el resto, en vez de inventar un estado.
- **Los errores del POST se mapean en la UI**, no se canoniza la ruta acá (sería backend y ampliaría
  la task). Queda declarado como deuda: la ruta devuelve `{ok:false, code}` sin `error` es-CL ni
  `actionable`, y su catch-all colapsa ~18 códigos en uno.

### Contexto vecino

- `TASK-1754` (creada por otra sesión) va a colapsar las etapas del dominio a las 6 de la UI. Toca
  `hiringDesk.ts`, el mismo archivo del copy de esta task. **Coordinar antes de tocarlo.**
- El backend de `TASK-1746` está desplegado y con schema aplicado; el canal de correo quedó
  habilitado el 2026-08-19.

## Delta 2026-08-19

- `TASK-1745` cerrada (lifecycle de entrega de Resend operativo en producción) — se retira de `Blocked by`.
- El backend de `TASK-1746` está desplegado y su schema aplicado: migración, índice `uq_email_deliveries_token_intent_v2`,
  CONTRACT de credencial (`convalidated`) y capabilities vivas en `capabilities_registry`. El canal de email del recovery
  quedó **habilitado** (`email_type_config.hiring_assessment_access_recovery = true`, 2026-08-19 18:42 UTC).
- Consecuencia: el contrato que esta task consume ya es ejercitable contra datos reales. Lo que falta para arrancar es
  **propio de 1747**, no de 1746:
  1. No hay read path de `availability` para la UI — `getAssessmentAccessRecoveryAvailability` sólo lo consume el POST.
     Decidir entre leerlo en el server component (respeta `Backend impact: none`) o exponer un `GET` (mejor para Full API
     Parity, pero obliga a corregir `Backend impact` a `api`).
  2. La página de Application 360 no computa los `can()` de `recover_access_email` / `reveal_access_link`.
  3. Falta toda la copy en `hiringDesk`: 5 `reasonCode`, 5 `outcome`, 8 `eligibilityCode` y el mapeo de ~8 códigos HTTP.
  4. La route responde `{ok:false, code}` **sin** `error` es-CL ni `actionable` — no pasa por `canonicalErrorResponse`.
     O se canoniza en 1746, o 1747 declara explícitamente el mapeo `code` → copy.
  5. Hay que eliminar `oneTimeAssessmentLink` (`Application360View.tsx:414-419`), que arma la URL con el token en estado
     de React — el anti-patrón que el ADR prohíbe.

## Summary

Convertir la card de evaluación de Application 360 en un operador honesto: asigna por la policy canónica, muestra el estado real de delivery y permite recuperar acceso por email o enlace temporal sin duplicar tests ni esconder errores.

## Why This Task Exists

La ficha mantiene un botón legacy que intenta asignar un test incluso cuando ya existe una instancia abierta, y el link histórico desaparece al recargar. La UI no consume la policy de TASK-1719 ni la capacidad de recovery; por eso el operador recibe conflictos y no puede ayudar a una candidata que no recibió correo.

## Goal

- Reemplazar la affordance legacy por consumidores de los contracts de TASK-1719 y TASK-1746.
- Hacer comprensible la diferencia entre despacho aceptado, entrega confirmada y fallo/demora.
- Dejar un flujo explícito, accesible y auditable para recuperar acceso sin revelar un enlace salvo que el operador lo elija.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Delta 2026-08-22 — ADR del vocabulario de etapas y desenlace

Se aceptó `docs/architecture/GREENHOUSE_HIRING_PIPELINE_STAGE_OUTCOME_VOCABULARY_DECISION_V1.md` (`Accepted`), primer ADR del vocabulario del pipeline. Fija **dos ejes**:
`stage` = dónde va la persona en el recorrido (6 valores, uno por columna; `closed` se queda y **es
escribible**) y **desenlace** = cómo terminó (`selected`, `backup_selected`, `not_selected`, `rejected`,
`withdrawn`, `unresponsive`) + **causa gobernada** obligatoria en `not_selected` (`capacity_filled`,
`opening_closed`, `process_cancelled`). Invariante como `CHECK`: **`stage='closed'` ⟺ desenlace declarado**.
El eje de desenlace lo implementa `TASK-1765`; la superficie del kanban, `TASK-1766`; el embudo de equidad,
`TASK-1767`.

**Coordinación de `hiringDesk.ts` — la colisión crece de tres tasks a cuatro.**

Esta task ya declara la colisión con `TASK-1754` sobre el diccionario de copy, pero la subestima: el ADR §7
agrega **dos bloques nuevos de claves** a ese archivo — las 6 etiquetas de desenlace y las 3 causas — más el
copy del diálogo de cierre. Los escritores concurrentes pasan a ser cuatro (`1747`, `1754`, `1763`, `1766`).

**Se particiona por CLAVE, no por archivo:** 1747 = claves de la card de assessment · 1754 = claves de
`stages` · 1763 = claves de capacity closure · 1766 = claves nuevas de desenlace y causa. Esta task está
`in-progress` con sesión activa: **cierra primero**, y las demás rebasan sobre ella.

Nota de vocabulario: esta task usa «desenlace» para el resultado de la propuesta de assessment, y el ADR
acaba de fijar esa palabra para el segundo eje del pipeline. Ambos tienen 6 valores. Desambiguar.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_HIRING_ASSESSMENT_ASSIGNMENT_POLICY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_HIRING_ASSESSMENT_ACCESS_RECOVERY_AND_EMAIL_DELIVERY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/ui-platform/PRIMITIVES.md`

Reglas obligatorias:

- UI is a consumer of policy/recovery commands; it does not construct tokens, infer delivery, or call stores.
- Existing open assessment replaces assignment CTA with recovery actions; no duplicate assignment attempt.
- The secure-link reveal is intentional, one-time and never re-rendered from browser persistence.

## Normative Docs

- `docs/ui/visual-directions/TASK-1747-application360-assessment-access-recovery.md`
- `docs/ui/wireframes/TASK-1747-application360-assessment-access-recovery.md`
- `docs/ui/flows/TASK-1747-application360-assessment-access-recovery-flow.md`
- `docs/tasks/TASK-1719-hiring-opening-assessment-policy-stage-triggered-assignment.md`

## Dependencies & Impact

### Depends on

- TASK-1745 delivery lifecycle DTO and status semantics.
- TASK-1746 recovery command/Product API/capability (code-complete localmente; runtime OFF/unapplied).
- TASK-1719 policy proposal/confirmation endpoint.

### Blocks / Impacts

- Removes the operator dependence on the legacy `/api/hiring/assessments` assignment route.
- Alters the Evaluation tab of `Application360View` only; no new navigation destination or candidate-facing route.

### Files owned

- `src/views/greenhouse/hiring/Application360View.tsx`
- `src/lib/copy/dictionaries/es-CL/hiringDesk.ts` and locale peer
- focused assessment-card components under `src/views/greenhouse/hiring/**` if extracted
- GVC scenario, review scorecard and manuals listed below

## Current Repo State

### Already exists

- Application 360 shows assessment status and uses the legacy direct assignment endpoint.
- TASK-1719 expone policy proposal/confirmation; TASK-1746 ya implementa localmente recovery/availability y su
  Product API, pero schema, grants, flags y smokes siguen pendientes.
- Assessment card, `GreenhouseButton`, `GreenhouseChip`, `Alert`, `Dialog` and `Snackbar` primitives exist.

### Gap

- No coherent state/action model separates no-test, open-test, delivery lifecycle and terminal-test states.
- Current one-time link lives only in local React state and conflicts with server-side token rotation.

## Modular Placement Contract

- Topology impact: `portal`
- Current home: `src/views/greenhouse/hiring/Application360View.tsx`.
- Future candidate home: `portal`
- Boundary: browser-safe assessment delivery/recovery DTO plus Product API adapters from TASK-1745/1746.
- Server/browser split: React consumes DTOs and actions only; token creation, email, DB and secrets remain server-only.
- Build impact: `none` — reuse existing MUI/Greenhouse primitives.
- Extraction blocker: Application 360 is currently portal-local and session/capability-aware.

## Hybrid Execution Justification

Esta task nació `ui-ux` puro: el backend de la recuperación es TASK-1746 y ya estaba desplegado. El
componente backend apareció durante la ejecución del Slice 4 y es deliberadamente mínimo:

- **Qué es.** Un carril de LECTURA (`GET`) sobre un reader que ya existía, y un campo aditivo en su
  DTO. Cero migraciones, cero tablas, cero escrituras nuevas, cero flags.
- **Por qué no se parte en dos tasks.** Partirla dejaría a la mitad de UI dependiendo de una task
  hermana para leer un dato que su propia página ya lee server-side. El GET no habilita ninguna
  capacidad nueva: expone, con la puerta correcta, exactamente lo que la pantalla ya resolvía. Una
  task backend para eso sería una ceremonia sobre un contrato que no cambia de forma.
- **Por qué el DTO se tocó acá y no antes.** El campo `blockedBy` no era previsible desde el diseño:
  emergió de la auditoría adversarial del Slice 4, que encontró que `available: boolean` colapsaba
  cinco causas con remedios distintos y mandaba todas al mismo mensaje —incluido decirle "no tienes
  permiso" a un operador que sí lo tenía. Arreglarlo en la pantalla habría sido reconstruir en el
  cliente una distinción que el servidor ya tenía y tiró.
- **Orden interno de ejecución.** El backend va PRIMERO dentro del slice: el DTO declara la causa,
  después la superficie la muestra. Al revés, la pantalla adivinaría.
- **Reversibilidad.** Ambas piezas se revierten con el commit. Sin migración no hay estado que
  deshacer.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `api`
- Source of truth afectado: `getAssessmentAccessRecoveryAvailability` (reader canónico de TASK-1746)
- Consumidores afectados: Application 360 (server component) y cualquier consumidor gobernado
  (Nexa, MCP, runbook) vía el carril de lectura nuevo
- Runtime target: `local|staging|production`

### Contract surface

- Contrato existente a respetar: `POST /api/hiring/assessments/[id]/access-recovery` (TASK-1746) y
  `src/lib/hiring/assessment/access-recovery/`
- Contrato nuevo o modificado: `GET /api/hiring/assessments/[id]/access-recovery`; el DTO
  `AssessmentAccessRecoveryAvailability` gana `channels.*.blockedBy`
- Backward compatibility: `compatible` — `available` se conserva con el mismo significado; el campo
  nuevo es aditivo
- Full API parity: la pantalla y cualquier agente consumen el MISMO reader. La disponibilidad dejó
  de ser un privilegio del server component: sin el GET, otro consumidor tendría que ejecutar el
  command para averiguar si podía ejecutarlo.

### Data model and invariants

- Entidades/tablas/views afectadas: ninguna nueva. Lectura sobre `greenhouse_hiring.hiring_assessment`
  y el ledger de recuperaciones.
- Invariantes que no se pueden romper:
  - Leer disponibilidad **NUNCA** emite credencial ni consume cuota.
  - El DTO **NUNCA** vuelve a colapsar en un solo booleano causas con remedios distintos: cada
    canal declara por qué está cerrado.
  - El token **NUNCA** viaja en una respuesta de lectura.
- Write-target allowlist: N/A — carril de sólo lectura.
- Tenant/space boundary: sesión interna + `applicationId` obligatorio comparado contra el aggregate,
  igual que el POST. Un `assessmentId` suelto no alcanza para sondear a un candidato.
- Idempotency/concurrency: N/A en lectura. El POST conserva su llave por intención.
- Audit/outbox/history: la lectura no audita. El command sí, sin cambios.

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: `enabled with rationale` — es lectura gobernada por capability; no agrega
  superficie de escritura.
- Backfill plan: N/A
- Rollback path: revert del PR
- External coordination: ninguna

### Security and access

- Auth/access gate: sesión interna + `hiring.assessment.read` + `hiring.application.read` **y al
  menos una de** `hiring.assessment.recover_access_email` / `hiring.assessment.reveal_access_link`.
  Las dos primeras las porta todo tenant interno vía el routeGroup `internal`; solas dejarían que
  collaborator/designer/people_viewer lean consentimiento retirado, decisión no comunicada y estado
  de entregabilidad del correo de un candidato.
- Sensitive data posture: PII indirecta — consentimiento, decisión y entregabilidad. No expone
  correo, nombre ni contenido de respuestas.
- Error contract: prosa es-CL + `code` + `actionable` en todas las salidas del carril nuevo;
  `captureWithDomain` para lo inesperado.
- Abuse/rate-limit posture: la lectura no consume cuota. El command conserva su cooldown por canal
  y su presupuesto de 24 horas.

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/hiring src/app/api/hiring src/views/greenhouse/hiring`
- DB/runtime checks: ejercitar el reader contra PostgreSQL real con un test `expired`, uno con
  cuota agotada y uno con buzón bloqueado
- Integration checks: recuperación real por correo contra el proveedor
- Reliability signals/logs: las de TASK-1746
- Production verification sequence: recuperar el acceso de un test real y confirmar que el
  candidato entra con la credencial nueva

### Acceptance criteria additions

- [ ] La lectura de disponibilidad exige al menos una capability de recuperación.
- [ ] El GET exige `applicationId` y lo compara contra el aggregate.
- [ ] Cada canal declara su causa de bloqueo; ninguna cae en un mensaje compartido.
- [ ] El carril nuevo devuelve prosa es-CL y `actionable` en todas sus salidas.
- [ ] Ninguna respuesta de lectura contiene el token ni la URL de acceso.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: operador Hiring con capability de assignment/recovery.
- Momento del flujo: revisión de la card `Evaluación` de una candidatura existente.
- Resultado perceptible esperado: el operador entiende estado real, sabe cuál acción está disponible y puede recuperar acceso sin crear duplicidad.
- Friccion que debe reducir: conflicto opaco de "Asignar test" y ausencia de una vía para ayudar a la candidata.
- No-goals UX: integrar WhatsApp, alterar el test público, mostrar score o construir una nueva página.

### Surface & system decision

- Surface: card `Evaluación` dentro de Application 360.
- Nav placement: `none` — no agrega destino de navegación.
- Composition Shell: `no aplica` — consumer localizado dentro de una card existente.
- Primitive decision: `extend` — assessment card existente con cluster de lifecycle/recovery y `Dialog` de confirmación.
- Adaptive density / The Seam: `aplica` — acciones pasan de inline a apiladas a 390px.
- Floating/Sidecar/Dialog decision: `Dialog` only for deliberate secure-link reveal; no sidecar.
- Copy source: `src/lib/copy/dictionaries/es-CL/hiringDesk.ts`.
- Access impact: `entitlements` — actions render only from server-authorized DTO/capability.

### State inventory

- Default: no test configured / policy assignment available.
- Loading: assessment/lifecycle reader or command pending.
- Empty: policy absent with explicit next action, not fabricated template choice.
- Error: sanitized command/lifecycle failure with retry when actionable.
- Degraded / partial: accepted-for-dispatch or delivery unknown, visibly distinct from delivered.
- Permission denied: read-only card and no recovery controls.
- Long content: provider reason is summarized; technical detail stays out of card.
- Mobile / compact: full-width primary action and non-clipped status/copy at 390px.
- Keyboard / focus: dialog trap, one-time link copy and focus restoration.
- Movimiento: no se agrega comportamiento visual personalizado.

### Interaction contract

- Primary interaction: propose/confirm policy assignment only with no open test; recover access with explicit channel when one is open.
- Hover / focus / active: native button states and visible focus.
- Pending / disabled: one in-flight command, disabled CTA with visible reason.
- Escape / click-away: closes recovery dialog only when no request is pending.
- Focus restore: returns to the initiating recovery button.
- Latency feedback: inline progress plus `aria-live` result.
- Toast / alert behavior: success toast never contains raw URL; actionable error alert remains in card.

### Behavior boundaries

- El diálogo usa el comportamiento nativo del primitive; no se agregan efectos visuales decorativos.
- No hay cambios de layout deliberados ni contadores animados alrededor del despacho del test.

### Implementation mapping

- Route / surface: `Application360View.tsx`, Evaluation tab.
- Primitive / variant / kind: existing assessment card, `GreenhouseChip`, `GreenhouseButton`, `Alert`, `Dialog`, `Snackbar`.
- Component candidates: extract a local `AssessmentAccessRecoveryActions` only if card density requires it.
- Copy source: `hiringDesk` dictionaries.
- Data reader / command: TASK-1719 policy proposal/confirm, TASK-1745 lifecycle reader, TASK-1746 recovery command.
- API parity: Product APIs are thin adapters; no business logic in component.
- Access / capability: server-derived action availability; dedicated recovery capability from TASK-1746.
- States to implement: listed State inventory including status unknown and one-time reveal.

### GVC scenario plan

- Scenario file: `[verificar]` create `assessment-access-recovery` capture scenario during implementation.
- Route: `/agency/hiring/applications/[applicationId]?tab=assessment` using synthetic fixture only.
- Viewports: 1440px and 390px.
- Quality profile: `premium`.
- Required steps: no test, delivery unknown, delivered, recovery email pending/success, secure-link one-time reveal, permission denied and terminal test.
- Required captures: first fold + dialog open + error/degraded states on both viewports.
- Required `data-capture` markers: assessment lifecycle and recovery action cluster.
- Assertions: no raw link after dialog close/reload; correct disabled state; no horizontal overflow.
- Scroll-width checks: `scrollWidth === clientWidth` at both viewports.
- Focus evidence: dialog focus/restore and no custom visual behavior.
- Review dossier: capture directory plus `docs/ui/reviews/TASK-1747-application360-assessment-access-recovery.scorecard.json`.
- Baseline decision / surface ID: selected direction in visual-direction doc.

### Design decision log

- Decision: extend the existing assessment card with a compact lifecycle strip and deliberate recovery actions.
- Alternatives considered: persistent inline link (rejected: unsafe/stale); separate recovery page (rejected: breaks application context); silent resend (rejected: lacks operator intent).
- Why this pattern: keeps the candidate, test state and recovery evidence in one operational surface without a card-within-card layer.
- Reuse / extend / new primitive: extend local card composition; no new global primitive.
- Open risks: validar el DTO real durante integración y no exponer acciones mientras availability/capabilities
  estén OFF; TTL secure-link de 24h ya está aprobada en el ADR.

### Visual verification

- GVC scenario: `assessment-access-recovery`.
- Viewports: 1440px and 390px.
- Required captures: default, degraded, dialog and error.
- Required `data-capture` markers: lifecycle and action cluster.
- Scroll-width check: required both viewports.
- Accessibility/focus checks: required for dialog and disabled explanation.
- Before/after evidence: comparison against current conflict-only card.
- Known visual debt: none accepted; no UI starts until DTO contract is stable.
- Visual scorecard: `docs/ui/reviews/TASK-1747-application360-assessment-access-recovery.scorecard.json`.
- Quality threshold: `average >= 4.2; floor >= 3; fidelity/template resistance >= 4`.

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

### Slice 1 — Card state model and canonical assignment

- Replace legacy assignment interaction with the TASK-1719 policy proposal/confirmation consumer.
- Render no-test/open/terminal states and lifecycle labels from canonical DTOs.

### Slice 2 — Recovery flow

- Add email resend and deliberate secure-link dialog as TASK-1746 consumers.
- Ensure raw link exists only inside the one-time reveal lifecycle and never in toast, URL or local persistence.

### Slice 3 — Quality and operator guidance

- Centralize copy, cover accessibility/degraded/permission/mobile states and capture GVC evidence.
- Update Hiring operator manual after production behavior is verified.

## Detailed Spec

- La card deriva el estado y las acciones disponibles solo de los DTOs canónicos: policy proposal/confirm para asignación, lifecycle delivery para evidencia y recovery command para rescate.
- Sin assessment abierto, se ofrece la asignación por policy; con assessment elegible, se reemplaza el intento duplicado por `Recuperar acceso`; en estados terminales solo se muestra evidencia.
- El canal email confirma únicamente que se inició el despacho. El canal enlace temporal abre un diálogo con confirmación, copia única accesible y eliminación del valor del estado React al cerrar, cambiar de ruta o recargar.
- La UI no arma URLs, no guarda tokens en local/session storage ni llama al endpoint legacy de asignación. Todo copy, error y explicación de permiso vive en el diccionario de Hiring.
- Las acciones se deshabilitan durante una solicitud, preservan foco y expresan errores sanitizados con `aria-live`; los estados de entrega no infieren recepción en la bandeja.

## Out of Scope

- New navigation or a candidate-facing assessment screen.
- Any direct integration with WhatsApp.
- Backend commands, tokens, entitlements, provider state mapping or policy configuration.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- TASK-1745 and TASK-1746 contracts MUST stabilize before JSX integration.
- Slice 1 → Slice 2 → Slice 3; the legacy UI call is removed only when canonical assignment is usable.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| UI reveals stale raw link | UI/security | medium | one-time DTO state only + reload test | capture/test assertion |
| Operator mistakes accepted for delivered | UI/ops | medium | explicit status labels and degraded state | operator feedback/recovery rate |
| Mobile action clipping | UI | low | GVC 390px + scroll-width gate | GVC dossier |

### Feature flags / cutover

No UI-only flag. Render new actions only from server authorization and feature availability supplied by TASK-1745/1746; rollback is reverting the UI consumer while retaining the domain command.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | revert portal consumer after canonical assignment smoke | <5 min | sí |
| 2 | remove recovery affordance; command capability remains controlled | <5 min | sí |
| 3 | revert copy/UI-only files | <5 min | sí |

### Production verification sequence

1. Direction/wireframe/flow readiness before JSX.
2. Local and staging GVC with synthetic application only.
3. Authorized production smoke on one non-sensitive test instance.
4. Observe recovery UX and delivery state for seven days.

### Out-of-band coordination required

Hiring operator training and Privacy/Security approval already required by TASK-1746.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Assessment assignment uses the TASK-1719 policy contract; no Application 360 action calls the legacy direct assignment route.
- [ ] An open assessment exposes recovery rather than a duplicate-assignment CTA; terminal states are read-only and honest.
- [ ] Delivery labels distinguish accepted, delivered, delayed/failure/bounce and unknown; no visual claim infers inbox delivery.
- [ ] Secure-link reveal is explicit, one-time, accessible and absent after close/reload; email recovery never exposes the URL.
- [ ] `UI ready` remains `no` until mapping/GVC/decision artifacts are complete; when `yes`, focused readiness checks pass.
- [ ] Wireframe and flow contracts exist and their focused gates pass.
- [ ] Copy, loading/error/degraded/permission/mobile/focus states are covered.
- [ ] GVC premium captures desktop and 390px with zero page horizontal overflow.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- focused UI/API contract tests
- `pnpm ui:wireframe-check --task TASK-1747`
- `pnpm ui:flow-check --task TASK-1747`
- GVC desktop/mobile plus keyboard/focus checks

## Closing Protocol

- [ ] Lifecycle, registry and README are synchronized.
- [ ] Operator manual and copy dictionaries reflect actual runtime behavior.
- [ ] GVC dossier/scorecard and accessibility evidence are linked.
- [ ] Handoff/changelog and docs gates reflect deployment evidence.

## Follow-ups

- Consider authenticated candidate self-service recovery when candidate accounts are operational.
