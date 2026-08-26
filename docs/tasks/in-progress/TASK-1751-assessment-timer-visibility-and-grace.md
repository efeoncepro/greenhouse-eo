# TASK-1751 — El candidato no ve su reloj ni entiende por qué no puede enviar

## Delta 2026-08-26 — dos de los cuatro defectos NO son ciertos; verificado contra el código

Auditoría del dominio Hiring, con verificación adversarial y re-comprobación manual. **La mitad de
la premisa de esta task es falsa hoy, y una de esas mitades nunca fue cierta.** Quien la tome debe
leer esto antes que el `Summary`, que quedó escrito el 2026-08-19 y no se actualizó.

- **(a) «el reloj no sigue el scroll» → YA ARREGLADO.** `.sessionBar` es `position: sticky` con
  `inset-block-start: var(--careers-header-height, 65px)` y `scroll-margin-block-start: 156px`
  (`AssessmentTaking.module.css:86-98`, comentario que cita esta misma task). Lo cerró `bc69e5a75`
  el 2026-08-19 a las 18:58 — **2h43m después** de crearse esta task (`23f51afc8`, 16:15). Nadie
  actualizó la spec.
- **(b) «los avisos de 5 y 1 minuto son `srOnly`, invisibles» → REFUTADO: nunca fue cierto.** Hay
  **dos** canales, no uno. El `srOnly`+`aria-live` es el anuncio puntual para lector de pantalla, y
  en paralelo existe una insignia **visible** dentro del reloj: `timerVisualNote`
  (`AssessmentTakingClient.tsx:183`) renderizada en `.timerBadge` (`:505`), clase que **no** está
  oculta (`AssessmentTaking.module.css:176-181`), más el cambio de tono del card a warning/critical.
  `git log -L 183,183` la sitúa desde el ship original `9b69ca7cd` (2026-07-13), o sea **antes** de
  escribirse esta task; `git show 23f51afc8` confirma que ya estaba ese día.

**Lo que queda, y es el daño real del caso fuente:**

- **(c) la gracia se rompe con texto sin guardar → SIGUE ABIERTO.** Al entrar en `submit_grace`,
  `canAnswer` pasa a `false` y todo se congela **sin flush del borrador en vuelo** (el autosave de
  `open_text` tiene debounce de 450 ms): `AssessmentTakingClient.tsx:162` lo define, `:234` descarta
  el save, `:268` apaga el efecto de autosave, `:359` impide hasta actualizar el estado y `:626`
  deja el textarea `disabled` en vez de `readOnly`. No es regresión accidental: el congelamiento
  está testeado como intencional (`AssessmentTakingClient.timing-contract.test.ts:12-17`). **Lo que
  falta es el flush al cruzar `answerDeadline`, no «congelar mejor».**
- **(d) el error final manda a reintentar lo imposible → SIGUE ABIERTO.** El submit revienta con
  `assessment_incomplete` (`public-taking.ts:654-658`) y el cliente lo colapsa al genérico
  (`AssessmentTakingClient.tsx:342-344` → `errorBody`, `hiringAssessment.ts:13`). Reintentar no
  puede funcionar nunca: la pregunta queda pendiente para siempre porque ya no se puede guardar.

**Consecuencia para el alcance:** esta task deja de ser «cuatro protecciones fallaron» y pasa a ser
**dos**, las dos del guardado. La banda visible fuera del card sigue siendo una mejora defendible
—hoy el aviso vive dentro del reloj— pero es decisión de diseño, **no un defecto**, y el plan de
GVC/scenario debe recortarse en consecuencia. **NUNCA** «arreglar» `.timerBadge` ni el `srOnly`
partiendo de esta spec sin releer este Delta: ambos funcionan.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `interaction`
- UI ready: `yes`
- Wireframe: `docs/ui/wireframes/TASK-1751-assessment-timer-visibility-and-grace.md`
- Flow: `docs/ui/flows/TASK-1751-assessment-grace-flow.md`
- Motion: `none`
- Backend impact: `none`
- Epic: `EPIC-011`
- Status real: `Alcance recalibrado 2026-08-26 (Slice 0): de los 4 defectos originales 2 ya no existen y aparecieron 3 hallazgos nuevos verificados contra el código. Wireframe podado y realineado; UI ready resuelto. Implementación pendiente desde el Slice 1`
- Rank: `TBD`
- Domain: `hr|ui`
- Blocked by: `none`
- Branch: `Greenhouse develop; checkout compartido; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Hacer perceptible el tiempo en la rendición del candidato y honesta la fase de gracia: reloj pegado
al viewport, avisos de 5 y 1 minuto visibles y no sólo anunciados a lectores de pantalla, textarea en
solo lectura durante la gracia de envío, y un mensaje que nombre la causa real cuando el guardado se
cierra por plazo.

## Why This Task Exists

El 2026-08-19 una candidata real (`EO-ASM-0128`) perdió una respuesta escrita y quedó sin poder
enviar, teniendo 26 minutos de gracia disponibles. Cuatro protecciones bien diseñadas fallaron a la
vez: el reloj existe pero no sigue el scroll, los avisos de 5 y 1 minuto se renderizan con `srOnly`
(invisibles para quien ve), la gracia de envío no sirve si hay texto sin guardar, y el error final es
el genérico "prueba de nuevo en unos minutos" — que en este caso no puede funcionar nunca.

Ninguno de los cuatro es un defecto grande por separado. Apilados, le comen trabajo escrito a
cualquier candidato al que se le acabe el tiempo mientras responde, que es el caso más común.

## Goal

- Que el candidato vea cuánto tiempo le queda mientras escribe, sin tener que hacer scroll.
- Que los avisos de 5 y 1 minuto lleguen también a quien no usa lector de pantalla.
- Que la gracia de envío cumpla su propósito en vez de romperse con texto sin guardar.
- Que cuando el plazo de respuesta cierre, el mensaje diga eso y qué puede hacer al respecto.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- `docs/architecture/ui-platform/STATE.md`
- `docs/architecture/agent-invariants/UI_PLATFORM_AGENT_INVARIANTS.md`
- `DESIGN.md`

Reglas obligatorias:

- El plazo de respuesta (`answerDeadline`) sigue cerrando el guardado. Esta task NO lo extiende ni lo
  relaja: cambia cómo se presenta, nunca el invariante.
- El canal `srOnly` con `aria-live` se conserva. La banda visible se suma, no lo reemplaza.
- Superficie pública candidate-facing: cero datos de operador, cero puntajes, cero información del
  proceso interno.
- Copy visible sale de `src/lib/copy/dictionaries/{es-CL,en-US}/hiringAssessment.ts`, nunca literal en JSX.

## Normative Docs

- `docs/ui/wireframes/TASK-1751-assessment-timer-visibility-and-grace.md`
- `docs/tasks/complete/TASK-1363-*` — dueño original de la rendición pública

## Dependencies & Impact

### Depends on

- `src/components/greenhouse/hiring/assessment/AssessmentTakingClient.tsx`
- `src/components/greenhouse/hiring/assessment/AssessmentTaking.module.css`
- `src/lib/hiring/assessment/public-taking.ts` — sólo como lectura del contrato de timing

### Blocks / Impacts

- Ninguna task lo bloquea ni queda bloqueada por él.
- Comparte diagnóstico con el mensaje `invalidBody` del enlace no disponible (mismo patrón de causas
  colapsadas), pero esa copy tiene dueño distinto y queda fuera.

### Files owned

- `src/components/greenhouse/hiring/assessment/AssessmentTakingClient.tsx`
- `src/components/greenhouse/hiring/assessment/AssessmentTaking.module.css`
- `src/lib/copy/dictionaries/es-CL/hiringAssessment.ts` y su par `en-US`
- `src/lib/copy/types.ts` — sólo las keys nuevas
- El escenario GVC de la rendición

## Current Repo State

### Already exists

- Cuenta regresiva en vivo con `setInterval` (`AssessmentTakingClient.tsx:200`), tono `warning` a
  300 s y `critical` a 60 s (`:175`), barra de progreso (`:182`) y `role='timer'` con `aria-label` (`:498`).
- Avisos de 5 y 1 minuto ya calculados (`:228-231`) y ya traducidos (`timeWarningFive`, `timeWarningOne`).
- `resolveAssessmentTiming` (`src/lib/hiring/assessment/public-taking.ts:190-250`) ya expone `phase`
  (`answering|submit_grace|closed`), `answerDeadlineAt`, `closeDeadlineAt` y `remainingSeconds`.
  **La UI ya recibe todo lo necesario: no falta contrato de datos.**
- Banner de fase `submit_grace` ya montado (`AssessmentTakingClient.tsx:517-520`).
- Marcador `data-capture='assessment-timer'` ya presente (`:497`).

### Gap

- ~~`.sessionBar` no declara `position: sticky`~~ → **CERRADO por `bc69e5a75` (2026-08-19)**: hoy es
  `sticky` con offset de header y `scroll-margin-block-start`. Ver Delta 2026-08-26.
- ~~El aviso de 5 y 1 minuto se renderiza sólo en `.srOnly`: invisible~~ → **REFUTADO, nunca fue
  cierto**: la insignia visible `.timerBadge` convive con el canal `srOnly` desde `9b69ca7cd`
  (2026-07-13). Ver Delta 2026-08-26.
- Durante `submit_grace` el textarea sigue editable y el envío intenta guardar, chocando contra el
  409 `assessment_not_open` de `src/lib/hiring/assessment/instances.ts:577-579`.
- No existe copy que distinga "se cerró el plazo de respuesta" del error genérico `errorBody`
  (`hiringAssessment.ts:13`).

## Modular Placement Contract

- Topology impact: `public`
- Current home: `src/components/greenhouse/hiring/assessment/AssessmentTakingClient.tsx`
- Future candidate home: `public`
- Boundary: consume el DTO de `resolveAssessmentTiming`; no llama stores ni DB.
- Server/browser split: el cliente sólo recibe el DTO ya resuelto; plazos, token y estado viven server-side.
- Build impact: `none`
- Extraction blocker: `none`

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: candidato externo rindiendo su evaluación
- Momento del flujo: mientras responde, y en los 30 minutos de gracia posteriores al plazo
- Resultado perceptible esperado: sabe cuánto le queda sin buscarlo, y si se le acaba entiende qué puede hacer
- Friccion que debe reducir: perder trabajo escrito y quedar sin explicación
- No-goals UX: extender plazos, autoguardar, mostrar puntaje o cualquier dato del proceso interno

### Surface & system decision

- Surface: rendición pública del test (`/public/assessment/[token]` y `/public/assessment/session`)
- Nav placement: `none` — no agrega destino de navegación
- Composition Shell: `no aplica` — superficie pública con CSS modules propios, fuera del shell del portal
- Primitive decision: `one-off` — no introduce primitive nueva ni consume MUI en esta superficie
- Adaptive density / The Seam: `no aplica`
- Floating/Sidecar/Dialog decision: no aplica
- Copy source: `src/lib/copy/dictionaries/{es-CL,en-US}/hiringAssessment.ts`
- Access impact: `none`

### State inventory

- Default: reloj sticky con cuenta regresiva y barra
- Loading: sin cambios respecto de hoy
- Empty: no aplica
- Error: `errorBody` genérico queda reservado a fallos reales de red/servidor
- Degraded / partial: guardado cerrado por plazo → mensaje propio que nombra la causa
- Permission denied: no aplica
- Long content: el sticky no puede tapar el enunciado ni el foco
- Mobile / compact: `.sessionBar` ya colapsa a columna en ≤560px; el sticky conserva altura mínima
- Keyboard / focus: `scroll-margin-top` igual a la altura de la barra
- Reduced motion: aparición del sticky y de las bandas sin transición

### Interaction contract

- Primary interaction: responder y avanzar; en gracia, enviar lo guardado
- Hover / focus / active: sin cambios
- Pending / disabled: en `submit_grace` el textarea queda `readOnly`, nunca vacío ni desmontado
- Escape / click-away: no aplica
- Focus restore: el foco no se pierde al entrar en gracia
- Latency feedback: sin cambios
- Toast / alert behavior: bandas `role='status'`, sin interrumpir

### Motion & microinteractions

- Motion primitive: `CSS`
- Enter / exit: la banda de aviso aparece sin animación de entrada
- Layout morph: ninguno
- Stagger: ninguno
- Timing / easing token: no aplica
- Reduced-motion fallback: sin transición
- Non-goal motion: nada que llame la atención sobre el reloj de forma ansiógena

### Implementation mapping

- Route / surface: `/public/assessment/[token]`, `/public/assessment/session`
- Primitive / variant / kind: one-off, CSS modules locales
- Component candidates: `AssessmentTakingClient.tsx` + su módulo CSS
- Copy source: `hiringAssessment.ts` es-CL y en-US + `src/lib/copy/types.ts`
- Data reader / command: `resolveAssessmentTiming` — consumo, sin cambios
- API parity: no aplica; no agrega capacidad nueva
- Access / capability: ninguna
- States to implement: los diez del inventario

### GVC scenario plan

- Scenario file: escenario de rendición con reloj y gracia
- Route: `/public/assessment/session`
- Viewports: desktop 1440 + móvil 390
- Quality profile: `premium`
- Required steps: scroll al pie del enunciado con reloj visible; fase de gracia con textarea en solo lectura
- Required captures: reloj tras scroll, banda de 5 minutos, banda de gracia
- Required `data-capture` markers: `assessment-timer` (existe), `assessment-grace-banner` (nuevo)
- Assertions: reloj visible tras scroll; banda de 5 minutos visible fuera de `srOnly`; textarea con
  `readonly` en gracia; botón de envío habilitado en gracia; sin scroll horizontal en 390px

### Design decision log

- Reloj sticky en lugar de flotante: conserva jerarquía y no tapa contenido en móvil.
- Banda visible **además** del `srOnly`: quitar el canal accesible sería una regresión.
- Textarea `readOnly` en lugar de vaciarlo: destruir el texto del candidato es el peor resultado.
- No se toca `instances.ts`: el plazo de respuesta es el invariante y debe seguir cerrando.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     Lo completa el agente que TOMA la task, no quien la crea.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

> **Alcance recalibrado el 2026-08-26 (Slice 0).** Los Slices 1 y 2 originales —reloj sticky y avisos
> visibles— se retiraron porque ya están implementados o nunca fueron defecto (ver `## Delta 2026-08-26`).
> Los slices se renumeraron y se incorporaron los hallazgos del discovery.

- **Slice 0 — Recalibración del contrato.** Podar spec y wireframe al alcance real, corregir el path del
  módulo CSS y el del escenario GVC, resolver `UI ready`. Sin código de runtime.
- **Slice 1 — Guardado preventivo por umbral.** El autosave es un debounce que **se reinicia con cada
  tecla**: quien escribe de corrido sin pausar no guarda nada y puede perder la respuesta entera. Al cruzar
  un umbral de tiempo restante, forzar un guardado inmediato y reducir el debounce para lo que reste.
  Reusa `saveAnswer`; el reloj es `projectAssessmentDatabaseNow`, **nunca** `Date.now()`.
- **Slice 2 — Gracia sin trampa.** En `submit_grace`: textarea `readOnly` con contenido preservado y su
  señal visual explícita (`.textArea` no tiene variante `:disabled` propia, así que el gris lo pone hoy el
  navegador y se pierde), banda que explica el estado y declara cuántas respuestas quedaron guardadas
  —derivado en cliente desde `assessment.responses`, **nunca** un campo nuevo en el DTO—, envío que no
  intenta guardar, y **navegación entre preguntas gateada** para que un clic no sobreescriba el borrador.
- **Slice 3 — Copy bilingüe.** Keys nuevas en `es-CL` + `en-US` + `types.ts`. Va antes del Slice 4 porque
  el mapeo de errores la consume. El tipo `HiringAssessmentCopy` obliga las dos lenguas.
- **Slice 4 — Errores honestos.** Mapa `code → copy` en el cliente siguiendo el precedente de
  `TalentPoolSelfServiceClient.tsx:84-89`. Cubre **los dos catches** (submit y autosave), no sólo el del
  submit. Cuatro mensajes agrupados por lo que la persona puede hacer, no siete por código.
- **Slice 5 — Tests y evidencia.** Actualizar deliberadamente el contract test, cubrir el borde
  `answer_deadline − ε` que hoy no tiene test, autorar el escenario GVC real con seed de fase de gracia.

## Out of Scope

- Cambiar la duración del límite base o de la gracia de 30 minutos.
- Autoguardado **continuo** mientras se escribe (follow-up declarado, con su propio riesgo de contrato).
  ⚠️ **No confundir con el Slice 1**: el guardado preventivo por umbral dispara UNA vez antes del plazo
  sobre texto escrito a tiempo, y no cambia el contrato de guardado ni relaja `answerDeadline`.
- **Flush disparado AL cruzar `answerDeadline`.** Verificado imposible: el cliente va atrás del servidor
  ≥1 RTT por construcción (el ancla se toma al construir la respuesta, la monotónica se fija tras la
  latencia) y el corte del guardado es `>=` sin epsilon (`instances.ts:578-580`). Llegaría siempre tarde
  y cobraría 409. Por eso el Slice 1 es preventivo y no reactivo.
- El mensaje `invalidBody` del enlace no disponible.
- Cualquier superficie de operador, incluido el workbench de revisión.
- Extender plazos de un test concreto: eso ya existe como adaptación gobernada.

## Detailed Spec

El wireframe declarado en `## Status` es la especificación de layout, estados, copy y accesibilidad.
No duplicar su contenido acá.

Invariante que ninguna slice puede romper: **el plazo de respuesta sigue cerrando el guardado.** Si una
implementación necesita relajar `answerDeadline` para que algo funcione, la implementación está mal.

## Rollout Plan & Risk Matrix

Cambio aditivo de presentación en una superficie pública, sin migración, sin flag, sin contrato de
datos nuevo. El rollout es un deploy ordinario.

### Slice ordering hard rule

- Slice 1 y Slice 2 son independientes entre sí y pueden ir en cualquier orden.
- Slice 3 debe cerrar ANTES de Slice 4: la copy de plazo cerrado describe el comportamiento que
  Slice 3 introduce; al revés, el mensaje prometería algo que la UI todavía no hace.
- Slice 5 corre al final, sobre el comportamiento ya completo.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El sticky tapa el enunciado en móvil | Rendición pública | Media | Captura GVC obligatoria en 390px con el enunciado completo visible | Revisión visual de la captura |
| Duplicar el anuncio a lectores de pantalla | Accesibilidad | Media | La banda visible no lleva `aria-live` propio; sólo el `srOnly` lo tiene | Assertion de un único nodo con `aria-live` |
| `readOnly` interpretado como "perdí mi texto" | Candidato | Baja | La banda dice explícitamente que puede copiarlo y enviar lo guardado | Copy revisada con `greenhouse-ux-writing` |
| La copy nueva no llega al par `en-US` | Copy | Media | Los tres archivos se tocan en la misma slice; el tipo obliga | `pnpm lint` + typecheck |

### Feature flags / cutover

Ninguno. El cambio no altera datos ni contratos y es reversible con un revert.

### Rollback plan per slice

| Slice | Rollback | Tiempo | ¿Reversible? |
|---|---|---|---|
| 1 | revert del commit | minutos | sí |
| 2 | revert del commit | minutos | sí |
| 3 | revert del commit | minutos | sí |
| 4 | revert del commit | minutos | sí |
| 5 | no aplica, es evidencia | — | sí |

### Production verification sequence

1. Abrir un test en curso en producción y hacer scroll hasta el pie del enunciado: el reloj sigue visible.
2. Verificar la banda de 5 minutos en un test con tiempo controlado.
3. Verificar la fase de gracia: textarea en solo lectura, envío habilitado, mensaje que nombra la causa.
4. Repetir en 390px.

### Out-of-band coordination required

Ninguna. No toca infraestructura, secretos, workers ni proveedores.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Un candidato que escribe de corrido hasta el límite conserva su respuesta: el guardado preventivo
      dispara antes del plazo y el servidor lo acepta.
- [ ] El guardado preventivo usa el reloj de base (`projectAssessmentDatabaseNow`), no `Date.now()`.
- [ ] En `submit_grace` el textarea está en solo lectura, conserva el texto y **se ve congelado**
      (señal visual explícita, no la heredada del navegador).
- [ ] Cambiar de pregunta durante `submit_grace` NO sobreescribe ni borra el borrador local.
- [ ] El canal `srOnly` con `aria-live` sigue presente y no se duplica el anuncio.
- [ ] En `submit_grace` el envío funciona sin intentar guardar y sin devolver 409.
- [ ] Un guardado rechazado por plazo muestra un mensaje que nombra la causa y ofrece enviar lo guardado;
      nunca "prueba de nuevo en unos minutos".
- [ ] **El catch del autosave** recibe el mismo trato que el del submit: hoy los dos rinden `errorBody`.
- [ ] El servidor sigue devolviendo `{ok, code, message}` con mensaje genérico — el test anti-leak
      (`route.test.ts:146-161`) sigue verde y el mensaje honesto se construye en el cliente desde el `code`.
- [ ] La copy nueva existe en es-CL y en-US y está tipada.
- [ ] Contraste AA en la banda de gracia y en los mensajes nuevos. (Los tres tonos del reloj ya están
      shipeados y quedan fuera de alcance: no se re-auditan acá.)
- [ ] Sin scroll horizontal de página en 390px.
- [ ] Evidencia GVC desktop + móvil adjunta con las assertions declaradas.
- [ ] `UI ready` pasa a `yes` sólo con mapping, plan GVC y decision log completos y `pnpm task:lint --task TASK-1751` sin findings.

## Verification

- `pnpm local:check`
- `pnpm test` focalizado en la rendición
- `pnpm fe:capture` con el escenario declarado, desktop y 390px
- Revisión de contraste sobre las capturas

## Closing Protocol

- [ ] Lifecycle y ubicación del archivo reflejan estado real.
- [ ] README y registry sincronizados.
- [ ] Handoff y changelog registran el caso fuente y la evidencia visual.
- [ ] `pnpm docs:closure-check` y `pnpm docs:context-check:strict` pasan al cierre.

## Follow-ups

- Autoguardado de la respuesta en curso: eliminaría la clase de problema de raíz, pero cambia el
  contrato de guardado y merece su propia task.
- El mensaje `invalidBody` del enlace no disponible colapsa seis causas distintas, cuatro de ellas
  con el enlace vivo. Mismo patrón, dueño distinto.

## Open Questions

**Resueltas en el Slice 0 (2026-08-26):**

- *¿Flush al cruzar el plazo?* → **No**: imposible por construcción (ver `## Out of Scope`). Se sustituye
  por guardado preventivo por umbral, que no relaja ningún plazo.
- *¿La banda declara las respuestas faltantes o sólo las guardadas?* → **Sólo las guardadas.** El objetivo
  de la banda es que "enviar" sea una decisión informada, no auditar a la persona en el peor momento del
  proceso. El conteo de faltantes ya lo bloquea el propio submit con su mensaje propio.

**Abierta, para el Slice 5:**

- ¿El gate visual corre premium completo o `--contract-only`? El cambio visible es un textarea en solo
  lectura, una banda y unos mensajes; forzar la fase de gracia en una captura exige sembrar datos. La
  decisión debe quedar **declarada en la task**, nunca saltada en silencio.
