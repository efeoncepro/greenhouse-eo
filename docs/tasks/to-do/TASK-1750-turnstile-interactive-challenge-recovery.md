# TASK-1750 — El desafío interactivo de Turnstile deja fuera a candidatos reales

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
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
- Wireframe: `docs/ui/wireframes/TASK-1750-turnstile-interactive-challenge.md`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `none`
- Status real: `Diagnóstico establecido; la forma de la solución depende de una verificación empírica que no se ha hecho`
- Rank: `TBD`
- Domain: `growth|hr`
- Blocked by: `none`
- Branch: `Greenhouse develop; checkout compartido; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Hacer que el desafío interactivo de Cloudflare Turnstile sea visible, alcanzable y resoluble en los
formularios públicos, para que una persona a la que Cloudflare decide desafiar pueda completar su
envío en vez de quedar bloqueada sin explicación.

## Why This Task Exists

El 2026-08-19 una postulante real no pudo enviar su postulación desde su computador. Desde el móvil
sí pudo. No es un fallo intermitente: en modo *Managed*, Cloudflare decide **por visitante** si el
desafío es invisible o interactivo, según el riesgo que le atribuye. Móvil y desktop son dos
visitantes distintos para Cloudflare.

Cuando escala a interactivo, el código actual monta el widget en un contenedor de 1×1, recortado con
`clip-path: inset(50%)`, marcado `aria-hidden` y colgado del `<body>`. Ese contenedor es correcto
mientras el widget sea invisible — que es el caso de la mayoría — y es exactamente el problema cuando
deja de serlo: el desafío existe pero la persona no lo ve, o lo ve flotando en una esquina sin
relación con el formulario.

Lo que hace esto caro no es la frecuencia: es que **no deja rastro**. El servidor registra
`captcha_failed` sin distinguir causa, y la persona afectada no reclama — se va. No sabemos a cuántos
candidatos les pasó antes de que esta postulante escribiera.

Un intento previo (`ef30759a1`, revertido en `a36967531`) reveló el panel con los callbacks de
Cloudflare, pero dos auditorías lo desarmaron: el timeout de 15 s no se cancelaba al entrar en modo
interactivo, y el supuesto de que Cloudflare pinta dentro de nuestro contenedor **quedó sin
verificar**. Esta task existe para hacerlo bien, empezando por esa verificación.

## Goal

- Que una persona desafiada por Cloudflare pueda ver, entender y resolver el desafío sin abandonar.
- Que el reintento funcione sin recargar la página.
- Que el caso invisible —la mayoría— no cambie en nada.
- Que el fallo deje rastro distinguible en vez de un `captcha_failed` opaco.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- `docs/architecture/ui-platform/README.md`
- `.claude/skills/resend-email-platform/SKILL.md` (patrón de verificación empírica de proveedor externo)

## Normative Docs

- [Widget configurations — Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/widget-configurations/)
- [Testing — Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/troubleshooting/testing/)

## Dependencies & Impact

- **Depende de:** nada. La verificación del Slice 1 es local y no requiere despliegue.
- **Impacta a:** postulación pública de careers, formularios de growth embebidos, agendador de reuniones.

### Files owned

- `src/growth-forms-renderer/turnstile.ts` — ciclo de vida del widget y su contenedor.
- `src/growth-forms-renderer/renderer.ts` — manejo del fallo de captcha y reset del widget.
- `src/growth-meeting-renderer/turnstile.ts` — misma bug class.
- `src/lib/growth/public-submission/captcha.ts` — colapso de los códigos de error de Cloudflare.
- `src/lib/copy/` — copy de los estados de verificación.

## Current Repo State

**Ya existe:**

- `TurnstileTokenClient` en `src/growth-forms-renderer/turnstile.ts`, compartido por el path nativo
  (`<greenhouse-form>`) y el legacy (`CareersApplyClient`).
- `before-interactive-callback` / `after-interactive-callback` **existen** como opciones oficiales de
  `turnstile.render()` — verificado contra la documentación de Cloudflare.
- `timeout-callback`, que hoy no se registra y es el evento correcto para el vencimiento.
- El path no-nativo lee el site key de `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, lo que permite forzar el
  desafío en local sin republicar nada.

**Gap:**

- **No está verificado dónde pinta Cloudflare el desafío interactivo.** El contenedor tiene
  `clip-path: inset(50%)`, que recorta a todos sus descendientes incluidos los `position:fixed`; el
  checkbox observado flotando en una esquina no debería haber podido escapar de ahí. Eso sugiere que
  Cloudflare usa un elemento propio. **Sin este dato no se puede elegir la forma de la solución.**
- El timeout de 15 s no se cancela al entrar en modo interactivo.
- Al vencer el timeout no se resetea el widget, así que el reintento corre sobre un token ya
  consumido — por eso el copy actual pide recargar la página.
- Un token que llega después del vencimiento se descarta en silencio.
- `captcha.ts` colapsa todos los `error-codes` de Cloudflare en un `rejected` opaco.
- `src/growth-meeting-renderer/turnstile.ts` tiene la bug class idéntica, sin corregir.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — EXECUTION PLAN (la llena el agente que toma la task)
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — SCOPE
     ═══════════════════════════════════════════════════════════ -->

## Scope

- **Slice 1 — Verificar dónde pinta Cloudflare.** Con `NEXT_PUBLIC_TURNSTILE_SITE_KEY=3x00000000000000000000FF`
  en local, forzar el desafío y observar si se renderiza dentro de nuestro contenedor o en un elemento
  propio de Cloudflare. **Entregable: la respuesta, con evidencia visual.** De ella depende si se
  implementa la Variante A o la B del wireframe. Sin este slice, los demás no se pueden diseñar.
- **Slice 2 — Presentación del desafío.** Implementar la variante que el Slice 1 habilite: el widget
  asociado al formulario, con su línea de contexto, sin alterar el caso invisible.
- **Slice 3 — Tiempo y recuperación.** Cancelar y re-armar el reloj al entrar en interactivo (o usar
  `timeout-callback`), bajar el panel en toda salida, resetear el widget para que el reintento
  funcione sin recargar, y usar el token tardío si el formulario sigue montado.
- **Slice 4 — Diagnóstico.** Propagar los `error-codes` de Cloudflare en `captcha.ts` y distinguir los
  modos de falla en el copy y en la telemetría.
- **Slice 5 — Agendador de reuniones.** Replicar la corrección en `growth-meeting-renderer`.

## Out of Scope

- Cambiar el modo del widget en Cloudflare (*Managed* es la recomendación del proveedor).
- Rotar el secret de Turnstile — es higiene aparte, ya anotada en el ledger.
- Crear un widget dedicado para el portal — vale la pena, pero es otra decisión.
- Rediseñar el formulario de postulación más allá del bloque de verificación.

## Detailed Spec

Ver `docs/ui/wireframes/TASK-1750-turnstile-interactive-challenge.md`: estados, las dos variantes con
su criterio de elección, copy es-CL, accesibilidad y el presupuesto de tiempo.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

El Slice 1 **decide la forma** de los Slices 2 y 3. Implementar antes de verificar es exactamente el
error que ya se cometió una vez (`ef30759a1`, revertido sin llegar a producción).

### Risk matrix

| Riesgo | Sistema | Prob. | Mitigación | Señal |
|---|---|---|---|---|
| Introducir un elemento visible en el caso invisible | Todos los formularios públicos | Media | El hueco tiene altura cero fuera de `challenge-visible`; evidencia GVC de los tres estados | Tasa de envíos completados |
| El desafío tapa el mensaje de error | Postulación | Media | El panel se baja en toda salida, no sólo en éxito | Prueba manual del camino de timeout |
| Romper el agendador al replicar | Reuniones | Baja | Slice 5 con su propia evidencia | Smoke del agendador |
| Regresión silenciosa futura | Todos | Alta si no hay test | Test unitario del ciclo revelar/ocultar | Suite del renderer |

### Feature flags / cutover

Sin flag: es corrección de un camino roto, no capacidad nueva. Un flag mantendría vivo el
comportamiento que deja gente fuera.

### Rollback plan per slice

| Slice | Rollback | Tiempo | ¿Reversible? |
|---|---|---|---|
| 1 | N/A — sólo produce evidencia | — | Sí |
| 2–5 | Revert del PR | < 15 min | Sí |

### Production verification sequence

Con la sitekey de prueba en local: los tres estados en desktop y 390 px. En producción, tras el
release: un envío real que pase por el caso invisible, y observar la telemetría de `captcha_failed`
para confirmar que baja.

### Out-of-band coordination required

Ninguna. La verificación es local y no toca la configuración de Cloudflare.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/growth-forms-renderer/` y `src/growth-meeting-renderer/`
- Future candidate home: `remain-shared`
- Boundary: el ciclo de vida del widget pertenece al renderer; el formulario sólo provee el nodo donde montarlo
- Server/browser split: browser-only
- Build impact: `none`
- Extraction blocker: `none`

## UI/UX Contract

- **Experience brief:** una persona a la que Cloudflare decide desafiar tiene que poder verlo,
  entenderlo y resolverlo sin abandonar el formulario.
- **Surface/system decision:** el desafío se asocia visualmente al formulario. La variante exacta la
  decide el Slice 1.
- **State inventory:** `idle`, `verifying-invisible`, `challenge-visible`, `challenge-resolved`,
  `challenge-timeout`, `challenge-error` — detallados en el wireframe.
- **Interaction contract:** el caso invisible no cambia; el desafío es resoluble solo con teclado; el
  reintento funciona sin recargar.
- **Motion:** ninguno llamativo; la aparición no debe leerse como un pop-up publicitario.
- **Copy source:** `src/lib/copy/`, es-CL, validado con `greenhouse-ux-writing`.
- **Visual verification:** GVC de los tres estados en desktop y 390 px, producidos con la sitekey
  `3x00000000000000000000FF`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El Slice 1 dejó documentado, con evidencia visual, dónde renderiza Cloudflare el desafío interactivo.
- [ ] Con la sitekey que fuerza el desafío, la persona lo ve asociado al formulario y puede resolverlo.
- [ ] El caso invisible no muestra ningún elemento nuevo ni desplaza el layout.
- [ ] Tras un timeout, el panel desaparece, el mensaje es legible y el reintento funciona **sin recargar**.
- [ ] Un token que llega después del vencimiento se usa si el formulario sigue montado, o se declara por qué no.
- [ ] El desafío se resuelve solo con teclado, y el foco se mueve a él al aparecer.
- [ ] `captcha.ts` propaga los `error-codes` de Cloudflare y los modos de falla son distinguibles en telemetría.
- [ ] Existe test unitario del ciclo revelar/ocultar del contenedor.
- [ ] `growth-meeting-renderer` tiene la misma corrección con su propia evidencia.
- [ ] `UI ready` pasa a `yes` sólo con mapping, plan GVC y decision log completos y `pnpm task:lint --task TASK-1750` sin findings.

## Verification

`pnpm local:check` · tests del renderer · GVC de los tres estados en desktop y 390 px con la sitekey de prueba.

## Closing Protocol

- [ ] Handoff y changelog actualizados con el hallazgo del Slice 1.
- [ ] Lifecycle movido a `complete` y `docs/tasks/README.md` + registry sincronizados.
- [ ] Si el Slice 1 refuta la hipótesis actual, la task se replantea antes de implementar.

## Follow-ups

- Widget de Turnstile dedicado al portal: hoy se reutiliza el del "AI Visibility Grader", así que un cambio pensado para el grader se lleva puesto el reclutamiento.
- Rotación del secret de Turnstile, pendiente en el ledger.

## Open Questions

- ¿Cloudflare pinta el desafío dentro del contenedor que le damos, o en uno propio? **Lo responde el Slice 1 y define todo lo demás.**
- ¿Cuántos candidatos pasaron por esto sin reclamar? Hoy no hay forma de saberlo; el Slice 4 lo haría medible hacia adelante.
