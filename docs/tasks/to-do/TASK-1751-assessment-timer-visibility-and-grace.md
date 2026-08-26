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

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `interaction`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1751-assessment-timer-visibility-and-grace.md`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `EPIC-011`
- Status real: `Diseño listo — wireframe con caso fuente medido; sin implementar`
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
- `src/components/greenhouse/hiring/assessment/AssessmentTakingClient.module.css`
- `src/lib/hiring/assessment/public-taking.ts` — sólo como lectura del contrato de timing

### Blocks / Impacts

- Ninguna task lo bloquea ni queda bloqueada por él.
- Comparte diagnóstico con el mensaje `invalidBody` del enlace no disponible (mismo patrón de causas
  colapsadas), pero esa copy tiene dueño distinto y queda fuera.

### Files owned

- `src/components/greenhouse/hiring/assessment/AssessmentTakingClient.tsx`
- `src/components/greenhouse/hiring/assessment/AssessmentTakingClient.module.css`
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

- **Slice 1 — Reloj sticky.** `position: sticky` en `.sessionBar` con `z-index` sobre el contenido,
  `scroll-margin-top` en los controles y verificación en 390px de que no tapa el enunciado.
- **Slice 2 — Avisos visibles.** Banda `role='status'` con `timeWarningFive` / `timeWarningOne`,
  conservando el `srOnly` con `aria-live`. Contraste AA en los tres tonos.
- **Slice 3 — Gracia honesta.** En `submit_grace`: textarea `readOnly` con contenido preservado,
  banda que explica el estado y declara cuántas respuestas quedaron guardadas, envío que no intenta guardar.
- **Slice 4 — Copy de plazo cerrado.** Keys nuevas en los tres archivos de copy; el 409
  `assessment_not_open` deja de renderizar `errorBody` genérico.
- **Slice 5 — Evidencia.** Escenario GVC desktop + móvil con las assertions declaradas.

## Out of Scope

- Cambiar la duración del límite base o de la gracia de 30 minutos.
- Autoguardado mientras se escribe (follow-up declarado, con su propio riesgo de contrato).
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

- [ ] El reloj permanece visible tras hacer scroll hasta el final del enunciado, en desktop y en 390px.
- [ ] El aviso de 5 minutos y el de 1 minuto son visibles sin lector de pantalla.
- [ ] El canal `srOnly` con `aria-live` sigue presente y no se duplica el anuncio.
- [ ] En `submit_grace` el textarea está en solo lectura y conserva el texto que el candidato escribió.
- [ ] En `submit_grace` el envío funciona sin intentar guardar y sin devolver 409.
- [ ] Un guardado rechazado por plazo muestra un mensaje que nombra la causa y ofrece enviar lo guardado;
      nunca "prueba de nuevo en unos minutos".
- [ ] La copy nueva existe en es-CL y en-US y está tipada.
- [ ] Contraste AA en los tres tonos del reloj y en las bandas.
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

- ¿La banda de gracia debe declarar cuántas respuestas quedaron sin responder, o sólo cuántas se
  guardaron? Declarar las faltantes es más honesto pero puede leerse como reproche.
