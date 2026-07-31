# TASK-1612 — Consolidación del emisor de `:root` del payload cliente de Globe

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `standard`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `EPIC-028`
- Status real: `Bloqueante estructural de cualquier tematización futura. El payload emite sus custom properties desde DOS lugares —el :root inline del shell y el @theme del bundle Tailwind— así que cambiar un token desde JS no mueve una sola utilidad. El propio código lo declara como decisión pendiente con dueño desde TASK-1556. NO es una task de diseño: su criterio de éxito es CERO cambio visual`
- Rank: `TBD`
- Domain: `creative|design-tokens|styling-pipeline`
- Blocked by: `none`
- Branch: `task/TASK-1612-globe-client-root-emitter-consolidation`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El payload cliente de Globe emite sus custom properties **desde dos lugares**: el `:root` inline que el
shell escribe por request (`tokensToCss()`) y el `@theme` que Tailwind genera en el bundle
(`globe-theme.generated.css`). Los dos salen del mismo SSOT, así que hoy **no divergen** — pero la
duplicación tiene una consecuencia estructural: **el payload no puede re-tematizarse en runtime**.
Cambiar `--canvas` desde JS no movería una sola utilidad, porque las utilidades leen el `@theme`, no el
`:root`.

Esta task consolida la emisión en **un solo emisor**, para que exista un lugar donde un segundo tema
pueda vivir.

**No es una task de diseño y no decide ningún valor.** Su criterio de éxito es que **nada cambie
visualmente**: mismos tokens, mismos valores, mismas superficies. Si algo se ve distinto al terminar,
es un defecto de la consolidación, no una mejora.

## Por qué `UI impact: none` pese a tocar la capa de estilos

La declaración es deliberada y su criterio de éxito la prueba: **cero cambio visual**.

El `Domain` dice `build-tooling` y no `ui-platform` por la misma razón, y la distinción no es para
esquivar un gate: esta task **no toca la plataforma de UI** —ni primitives, ni patterns, ni
composición— sino el **pipeline que materializa los tokens como CSS**. Clasificarla como `ui-platform`
haría que el lint exigiera wireframe, flow y contrato de UI para un cambio cuyo objetivo declarado es
que la UI no cambie.

> ⚠️ **Bug del linter encontrado al crear esta task, reportado aparte:** `isUiUxImpacted` compara el
> `Domain` con `UI_DOMAINS.some(d => domain.includes(d))`, y `UI_DOMAINS` incluye `'ui'` **sin límite de
> palabra**. Un dominio `build-tooling` dispara el gate de UI por el «ui» de *b·ui·ld* — igual que
> `guide`, `suite` o `circuit`. Por eso este campo dice `styling-pipeline`. La task no
introduce ni modifica ninguna superficie, layout, copy, interacción ni primitive — mueve **dónde se
emiten** las custom properties, con los mismos valores. Las capturas y los canarios existen aquí como
*instrumento de verificación de que nada cambió*, no como evidencia de un cambio.

Todos los tokens viajan por el mismo emisor, incluidos los de duración y curva (`--duration-*`,
`--ease-*`), así que la consolidación los mueve igual que a los de color. No se define, ajusta ni añade
ningún comportamiento temporal: los valores llegan idénticos a las mismas reglas CSS que ya los usaban.

Si al terminar alguna superficie se ve o se comporta distinto, es un defecto de la consolidación y hay
que revertir, no un resultado.

## Why This Task Exists

El propio código lo pidió por escrito, en el docblock de `apps/studio-client/src/styles/theme-from-tokens.ts`:

> *Los valores quedan en DOS lugares del CSS servido… no pueden derivar porque los genera la misma
> fuente, pero sí implica que **este payload no soporta re-tematizado en runtime**… Si algún día se
> quiere tematizado en runtime, la salida es que el shell deje de emitir `:root` y Tailwind sea el
> único que lo emita — **decisión con dueño, no un efecto colateral**.*

[ADR-017 v2.0](../../architecture/creative-studio/EFEONCE_GLOBE_CLIENT_COLOR_SCHEME_DECISION_V1.md)
lo recoge como la primera de sus condiciones de reapertura del modo claro: *"el primer paso no es
elegir colores sino consolidar la emisión de `:root`"*.

Y desde el 2026-07-30 el acoplamiento **creció**: al retirar los dos `:root` propios del payload legacy
(`producer-ui.ts`), ese archivo pasó también a consumir `tokensToCss()`. Hoy hay **tres consumidores**
del mismo emisor, lo que hace la consolidación más valiosa y a la vez más delicada.

## Goal

Que el payload cliente tenga **un solo emisor** de custom properties, sin que ninguna superficie cambie
de aspecto, dejando la puerta abierta a un segundo tema sin volver a tocar esta capa.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- [ADR-016](../../architecture/creative-studio/EFEONCE_GLOBE_CLIENT_STYLING_ENGINE_DECISION_V1.md) — el
  motor de estilos: Tailwind v4 con `tokens.ts` como theme. El gate que compara el archivo generado
  carácter por carácter es la red de esta task.
- [ADR-017 v2.0](../../architecture/creative-studio/EFEONCE_GLOBE_CLIENT_COLOR_SCHEME_DECISION_V1.md) —
  declara esta consolidación como precondición de cualquier modo claro.
- [ADR-014](../../architecture/creative-studio/EFEONCE_GLOBE_CLIENT_APPLICATION_DECISION_V1.md) — el
  payload React + Vite y su shell por request.

## Normative Docs

- `docs/architecture/creative-studio/EFEONCE_GLOBE_CLIENT_STYLING_ENGINE_DECISION_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_CLIENT_COLOR_SCHEME_DECISION_V1.md`
- `docs/tasks/TASK_PROCESS.md`

## Dependencies & Impact

### Depends on

- Ninguna. La superficie está estable: `TASK-1485` cerró el tramo de tokens el 2026-07-30 y los tres
  consumidores ya salen del mismo SSOT.

### Blocks / Impacts

- **Cualquier trabajo de modo claro.** ADR-017 lo declara su primer paso.
- `TASK-1560` (retiro del legacy) — comparte el archivo `producer-ui.ts`; coordinar orden.
- `TASK-1485` — dueña del SSOT de tokens; esta task no cambia valores, solo dónde se emiten.

### Files owned

- `apps/studio-client/src/styles/theme-from-tokens.ts`
- `apps/studio-client/src/tokens/tokens.ts` (sólo `tokensToCss`, no los valores)
- `apps/studio-web/src/shell.ts`
- `apps/studio-web/src/producer-ui.ts` (sólo el punto de emisión)
- `apps/studio-web/src/ui.ts`, `apps/studio-web/src/public-share-ui.ts` (ídem)

## Current Repo State

### Already exists

- `tokensToCss()` en `apps/studio-client/src/tokens/tokens.ts` — emite el `:root` inline.
- `apps/studio-client/src/styles/theme-from-tokens.ts` — genera el `@theme` de Tailwind desde el mismo
  SSOT, con gate que compara el archivo en disco carácter por carácter.
- Tres consumidores de `tokensToCss()`: el shell del payload y las superficies legacy.

### Gap

- No existe un único emisor. Las utilidades de Tailwind leen el `@theme`; el CSS plano de las
  superficies legacy lee el `:root`. Cambiar un valor en runtime movería una mitad y no la otra.
- No hay test que afirme que un cambio en el SSOT se propaga a **ambas** salidas de forma equivalente.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `apps/studio-client` (SSOT y generación) + `apps/studio-web` (emisión por request)
- Future candidate home: `remain-shared`
- Boundary: `Globe client payload styling engine (ADR-016)`
- Server/browser split: `la generación es build-time; la emisión viaja en el HTML por request, sin secretos`
- Build impact: `regenera globe-theme.generated.css; sin dependencias nuevas`
- Extraction blocker: `ninguno`

<!-- ZONE 2 — PLAN MODE: se completa al tomar la task -->
<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Prueba de equivalencia antes de mover nada

- Test que afirme que **toda** custom property emitida por `tokensToCss()` existe también en el
  `@theme` generado con el mismo valor resuelto, y viceversa para las que Tailwind namespacea.
- Es la red que hace segura la consolidación: sin ella, "no cambió nada" es una afirmación sin
  instrumento.

### Slice 2 — Un solo emisor

- Elegir el emisor único y hacer que el otro derive de él. La dirección la fija ADR-016: el `@theme`
  de Tailwind es quien materializa las utilidades, así que el `:root` inline pasa a ser una **proyección**
  del mismo origen o desaparece si ninguna superficie plana lo necesita.
- Los consumidores legacy (`producer-ui.ts`, `ui.ts`, `public-share-ui.ts`) siguen recibiendo su `:root`
  mientras existan — esta task **no los retira** (eso es `TASK-1560`).

### Slice 3 — Contrato de tematización

- Declarar en el docblock del emisor qué hace falta para agregar un segundo tema, y qué NO se decide acá
  (los valores, que son de AXIS).
- Retirar del código el comentario que pedía esta decisión, ya resuelta.

## Out of Scope

- 🔴 **Decidir, agregar o cambiar cualquier valor de color.** Los valores son de AXIS; esta task mueve
  la emisión, no la paleta. Un solo hex distinto al terminar es un defecto.
- 🔴 **Implementar el modo claro.** Esta task lo habilita; no lo construye. Globe sigue dark-only por
  ADR-017 §1.
- Retirar el payload legacy (`TASK-1560`).
- Re-tematizado con interruptor de usuario, persistencia de preferencia o `prefers-color-scheme`.

## Detailed Spec

La consolidación se apoya en dos hechos verificables del repo:

1. **Los dos emisores ya salen del mismo SSOT** (`GLOBE_TOKENS`), así que hoy no hay drift que resolver —
   sólo duplicación de mecanismo.
2. **El gate de ADR-016 compara el archivo generado carácter por carácter**, así que cualquier desvío en
   la generación se pone rojo antes de llegar al navegador.

El riesgo real no es el drift: es que una superficie plana pierda una variable que el `@theme` no expone
con el mismo nombre (Tailwind namespacea: `--canvas` se materializa como `--color-canvas`). El Slice 1
existe para medir exactamente esa brecha antes de mover nada.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

El Slice 1 (prueba de equivalencia) va **primero y solo**. Sin él, el Slice 2 no tiene forma de
demostrar que no rompió nada, y el modo de falla es silencioso: una superficie se queda sin una variable
y hereda un valor inicial del navegador, con el build verde.

### Risk matrix

| Riesgo | Sistema | Prob. | Mitigación | Señal |
|---|---|---|---|---|
| Una superficie plana pierde una variable que el `@theme` namespacea distinto | payload legacy + share board | Media | Slice 1 mide la brecha de nombres antes de mover | El test de equivalencia falla |
| El `@theme` generado cambia de bytes sin querer | bundle Tailwind | Baja | Gate de ADR-016 carácter por carácter | Build rojo |
| Cambio visual no intencionado | las cinco superficies | Media | Captura antes/después de las superficies servidas; el criterio es CERO diff | Canarios de browser + diff visual |
| El legacy deja de recibir su `:root` | `producer-ui.ts` y hermanos | Baja | Los consumidores legacy se conservan explícitamente en el Slice 2 | Test de `producer-ui` que afirma que el HTML trae el `:root` |

### Feature flags / cutover

Ninguno. El cambio es interno al pipeline de estilos y no altera comportamiento observable; un flag
añadiría una segunda ruta de emisión, que es exactamente lo que la task viene a eliminar.

### Rollback plan per slice

| Slice | Rollback | Tiempo | ¿Reversible? |
|---|---|---|---|
| 1 | revertir el test | < 5 min | sí |
| 2 | revertir el commit + `pnpm theme:generate` | < 15 min | sí |
| 3 | revertir el docblock | < 5 min | sí |

### Production verification sequence

1. `pnpm check && pnpm build` en `efeonce-globe`.
2. Canarios de browser (`tailwind-engine`, `producer-composer`, `axis-pilot`) en verde.
3. Captura del Producer y del share board, comparadas contra la referencia previa: **cero diff**.
4. Lectura de los valores computados en el browser (`--canvas`, `--color-canvas`) — deben resolver a lo
   mismo que antes.

### Out-of-band coordination required

Ninguna. No toca infraestructura, secretos, migraciones ni despliegue.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] Existe un test que afirma la equivalencia entre lo que emite `tokensToCss()` y lo que expone el
      `@theme` generado, y falla si una variable existe en uno y no en el otro.
- [ ] El payload tiene **un solo emisor** de custom properties; el segundo, si sobrevive, es una
      proyección declarada del primero y su docblock lo dice.
- [ ] Ningún valor cambió —color, tipografía, radio, sombra, duración, curva—: `git diff` sobre
      `globe-theme.generated.css` no muestra cambios de valor.
- [ ] Las capturas del Producer y del share board son idénticas a las de referencia — **cero diff visual**.
- [ ] El docblock del emisor declara qué hace falta para agregar un segundo tema y qué no se decide acá.
- [ ] El comentario de `theme-from-tokens.ts` que pedía esta decisión fue retirado, porque ya está tomada.
- [ ] `pnpm check && pnpm build` en verde y los tres canarios de browser pasan.

## Verification

```bash
cd ../efeonce-globe
pnpm check
pnpm build
pnpm --filter @efeonce-globe/studio-client test
```

Más la verificación visual: capturar el Producer antes y después y confirmar que no hay diferencia.

## Closing Protocol

1. `Lifecycle: complete` y mover a `docs/tasks/complete/`.
2. Sincronizar `docs/tasks/README.md` y `docs/tasks/TASK_ID_REGISTRY.md`.
3. Actualizar ADR-017: su condición de reapertura nº 4 deja de estar bloqueada por esta pieza.
4. `Handoff.md` con la continuidad activa.

## Follow-ups

- El modo claro propiamente dicho, cuando exista la primera superficie que deje de ser un visor de
  piezas (ADR-017 § condiciones de reapertura).
- `TASK-1560` — retiro del payload legacy, que elimina los consumidores planos del `:root`.
