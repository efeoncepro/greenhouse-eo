# TASK-1613 — Modo claro de Globe con interruptor de apariencia

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `interaction`
- UI ready: `yes`
- Wireframe: `docs/ui/wireframes/TASK-1613-globe-appearance-switch.md`
- Flow: `docs/ui/flows/TASK-1613-globe-appearance-switch-flow.md`
- Motion: `none`
- Backend impact: `none`
- Epic: `EPIC-028`
- Status real: `Modo claro completo con interruptor en el menú de cuenta del Producer. Habilitado por TASK-1612 (el :root proyecta sobre el @theme), el tema es UN bloque de override sobre las claves del theme. Cerró 2 regresiones de contraste medidas y un defecto de herencia: el share board tomaba el modo del localStorage sin tener interruptor propio. AXIS 0.2.3 aporta las tintas semánticas por modo`
- Rank: `TBD`
- Domain: `creative|design-tokens|styling-pipeline`
- Blocked by: `none`
- Branch: `task/TASK-1613-globe-light-mode-appearance-switch`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Modo claro completo para el payload cliente de Globe, con un interruptor de apariencia en el menú de
cuenta del Producer. Lo habilitó `TASK-1612`: desde que el `:root` proyecta sobre el `@theme`, un tema
es **un bloque de override** sobre las claves del theme y no una segunda tabla de valores.

## Why This Task Exists

El operador pidió poder ver el producto en los dos modos. La discusión previa (ADR-017) fijó que Globe
es dark-only **por colorimetría** —el Producer es un visor de piezas y su fondo es parte de cómo se
juzga el trabajo—, y esa razón se sostiene para la entrega al cliente. Lo que no se sostenía era no
darle al operador la opción en la superficie donde se PRODUCE.

La distinción que resuelve la tensión es por superficie, no por producto: el Producer honra el modo; el
share board, donde el cliente ve la pieza, queda fijado en oscuro.

## Goal

Un interruptor que funcione, sin destello, sin mover un solo hex del modo vigente, y sin que ninguna
superficie herede el modo por accidente.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/architecture/creative-studio/EFEONCE_GLOBE_CLIENT_COLOR_SCHEME_DECISION_V1.md` (ADR-017 v2.0) —
  dark-only por colorimetría, y las cuatro condiciones para reabrir. Este trabajo ejecuta la segunda
  («una superficie deja de ser visor de piezas») acotándola: el Producer produce, no aprueba la entrega.
- `docs/architecture/creative-studio/EFEONCE_GLOBE_CLIENT_STYLING_ENGINE_DECISION_V1.md` (ADR-016) — el
  `@theme` se genera desde el SSOT; el override del tema apunta a sus claves.
- `docs/tasks/complete/TASK-1612-globe-client-root-emitter-consolidation.md` — el paso previo.

## Normative Docs

| Doc | Qué gobierna acá |
|---|---|
| `docs/architecture/creative-studio/EFEONCE_GLOBE_CLIENT_COLOR_SCHEME_DECISION_V1.md` | ADR-017 v2.0: dark-only por colorimetría y las condiciones para reabrir. Este trabajo ejecuta una de ellas **acotada por superficie** |
| `docs/architecture/creative-studio/EFEONCE_GLOBE_CLIENT_STYLING_ENGINE_DECISION_V1.md` | ADR-016: el `@theme` se genera desde el SSOT y el override apunta a sus claves |
| `docs/tasks/complete/TASK-1612-globe-client-root-emitter-consolidation.md` | La proyección `:root` → `@theme` que hace que un tema sea un solo bloque |
| `docs/ui/wireframes/TASK-1613-globe-appearance-switch.md` | Forma, estados, contrastes medidos y decisiones del control |
| `docs/ui/flows/TASK-1613-globe-appearance-switch-flow.md` | El recorrido del modo entre superficies y el invariante `themable` |

## Dependencies & Impact

- **Depende de:** `TASK-1612` (la proyección `:root` → `@theme`) y `@efeoncepro/axis-tokens` **0.2.3**
  (`axisBrandSemanticInk`).
- **Impacta a:** toda superficie servida por `renderShell`; el default `themable: false` las deja
  fijadas en oscuro salvo declaración explícita.
### Files owned

- `apps/studio-client/src/theme/**`, `tokens/tokens.ts`,
  `styles/theme-from-tokens.ts`, `surfaces/producer/ProducerHeader.tsx`, `apps/studio-web/src/shell.ts`,
  `scripts/light-contrast-audit*.mjs`.

## Current Repo State

Implementado y cerrado. Commits en `efeonce-globe`: `994711e`, `d87d71f`, `59339f0`. AXIS en `c9198c9`
(tag `v0.2.3`).

<!-- ZONE 2 — PLAN MODE: se completa al tomar la task -->

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — El SSOT resuelve por modo

`tokensFor(mode)` parametriza las cinco constantes de las que todo lo demás deriva. De ahí salen
`GLOBE_TOKENS` (oscuro, el canónico) y `GLOBE_TOKENS_LIGHT`.

### Slice 2 — El emisor manda sólo el diff

`lightOverrideCss()` emite **31 de 198** tokens: los que cambian. Cada uno apunta a la clave del theme
cuando el token se proyecta, y al nombre corto cuando no.

### Slice 3 — El interruptor

Segmentado de dos opciones en el menú de cuenta, con bootstrap inline anti-destello en el `<head>`.

### Slice 4 — Cerrar lo que el modo rompió

Barrido de contraste instrumentado sobre las dos superficies, y corrección de lo que aparezca.

## Out of Scope

- `prefers-color-scheme` — el modo lo elige quien mira, no su sistema operativo.
- Preferencia por cuenta (hoy es `localStorage`, por dispositivo).
- Los 14 textos que fallan el piso de contraste **en ambos modos** (`--faint` a 40% de alpha): deuda
  preexistente de Globe, no de este cambio. Tocarla movería el producto vigente.
- Retirar el payload legacy (`TASK-1560`).

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: operador de Efeonce dentro del Producer.
- Momento del flujo: cualquiera; el control vive en el menú de cuenta.
- Resultado perceptible esperado: el producto entero cambia de modo, sin destello ni recarga.
- Fricción que debe reducir: trabajar de noche o en pantalla brillante sin pelear con el chasis.
- No-goals UX: no es una preferencia de accesibilidad ni sigue al sistema operativo.

### Surface & system decision

- Surface: menú de cuenta del `ProducerHeader`.
- Composition Shell: `no aplica` — Globe no usa el shell de composición de Greenhouse.
- Primitive decision: `reuse` — el segmentado de la banda de modalidades del mismo header.

### Estados, copy y motion

Inventario completo, con sus contrastes medidos, en el wireframe declarado. Copy en
`src/copy/index.ts` → `producerWorkspace.theme*`. Sin motion propio: el cambio es inmediato a propósito
—una transición de color sobre toda la superficie es exactamente el destello que el bootstrap evita.

### Implementation mapping

Tabla completa en el wireframe (`## Implementation Mapping`). En una línea: `tokensFor(mode)` en
`tokens.ts` resuelve los dos mapas, `lightOverrideCss()` en `theme-from-tokens.ts` emite el diff,
`theme/mode{,-contract}.ts` gobierna el estado (split para no meter DOM en el build de Node),
`ProducerHeader.tsx` pinta el control y `shell.ts` inyecta el bootstrap detrás de `ShellOptions.themable`.

### GVC scenario plan

- Quality profile: `premium`
- Required steps: abrir el Producer en oscuro y en claro a 1440 y 390; abrir el menú de cuenta y
  cambiar el modo; recargar y comprobar persistencia sin destello; abrir el share board con
  `globe.theme=light` guardado y comprobar que **sigue oscuro**.
- Required captures: `producer-{dark,light}-1440.png` en `.captures/task-1613-light/`, más las nueve del
  canario del composer usadas como control de cero-diff.
- Required `data-capture` markers: `producer-modality-band` (existente); el barrido no depende de
  marcadores — recorre el árbol completo y mide cada nodo con texto propio.
- Assertions: ningún texto falla en claro que no falle también en oscuro (conjuntos idénticos, medido);
  una superficie honra el modo **si y sólo si** declaró `themable`; los 198 tokens resuelven al SSOT sin
  el bundle de Tailwind.
- Decisión de baseline: el baseline es el **modo oscuro vigente**, y la comparación es contra él y no contra un piso absoluto. Se rebaselinea sólo si el oscuro cambia deliberadamente; el gate lo detecta porque `globe-theme.generated.css` deriva de él
- scroll-width checks: sin cambio de layout — el control entra en un panel ya existente y el modo sólo
  cambia color. El barrido a 390 px habría acusado desbordes por reflow.
- Reduced-motion / focus evidence: el cambio de modo no anima a propósito (una transición de color
  sobre toda la superficie ES el destello que se evita); foco por teclado verificado con
  `outline-offset-2 outline-focus` en ambos modos.

Globe usa sus canarios de browser, no GVC: la evidencia equivalente vive en
`scripts/light-contrast-audit.mjs`, `tailwind-engine-canary.mjs` y `legacy-fallback-canary.mjs`, todos
contra Chrome real con estilos computados. Detalle por escenario en el wireframe.

### Design decision log

En el wireframe (`## Design Decision Log`), con la alternativa descartada de cada decisión.

## Detailed Spec

### El SSOT resuelve por modo

`tokensFor(mode)` parametriza las cinco constantes de las que todo lo demás deriva —`axisSurface[mode]`,
`axisNeutral[mode]`, la rampa y los roles de marca de Globe, y la tinta semántica—. El resto del mapa
las consume y sigue al modo sin saberlo, que es lo que hace que agregar el claro sea un cambio de
resolución y no una segunda tabla que haya que mover en paralelo.

Dos familias necesitaron su extremo faltante, y las dos por medición:

- **Las tintas** (`--accent-ink`, `--accent-ink-bright`, `--featured-ink`) son el extremo claro de su
  rampa; sobre canvas claro daban 1,33:1. Se agrega el extremo oscuro **conservando el valor oscuro
  exacto**, para que el modo vigente no se mueva.
- **Los velos** (`--surface-soft`, `--glass-line-strong`) se aclaran con blanco en oscuro; en claro
  tienen que oscurecerse o no producen ninguna separación visible.

### El emisor manda sólo el diff

`lightOverrideCss()` emite **31 de 198** tokens: los que cambian. Cada entrada apunta a la clave del
theme cuando el token se proyecta (TASK-1612) y al nombre corto cuando no. Apuntar siempre al nombre
corto rompería a los proyectados: su `var(--color-x, …)` seguiría leyendo la clave sin overridear, y el
tema quedaría a medias con todo en verde.

### El interruptor y su bootstrap

Segmentado de dos opciones en el menú de cuenta (`role='radiogroup'`). El estado vive en el DOM
—`data-theme` en el elemento raíz— y no en React: no hay un segundo estado que pueda desincronizarse.
`MODE_BOOTSTRAP_SCRIPT` va inline en el `<head>` con el nonce de la CSP para que el modo se aplique
antes del primer pintado.

`ShellOptions.themable` decide qué superficie lo recibe, con default `false`.

### Lo que el modo rompió y hubo que cerrar

`text-canvas` se usaba en 7 lugares como proxy de «el oscuro que contrasta con la marca» — cierto sólo
en oscuro; pasan a `--on-action`. El isotipo en negativo era blanco sobre blanco; pasa a servirse como
máscara con el color de `--text`. `--success` como texto daba 2,54:1; AXIS 0.2.3 separa fill de tinta.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

AXIS antes que Globe: el payload consume `axisBrandSemanticInk` y no compila sin él.

### Risk matrix

| Riesgo | Sistema | Prob. | Mitigación | Señal |
|---|---|---|---|---|
| El modo oscuro se mueve | Producer vigente | Media | `globe-theme.generated.css` se deriva del oscuro; un diff vacío lo prueba | diff del archivo generado |
| Una superficie hereda el modo sin quererlo | Share board / cliente | **Ocurrió** | `themable` opt-in, default `false` | gate del barrido (bi-condicional) |
| Texto ilegible en claro | Ambas | **Ocurrió (2)** | Barrido comparativo contra el control oscuro | `light-contrast-audit` |
| Destello al cargar | Ambas | Alta sin mitigación | Bootstrap inline en `<head>` con nonce | inspección del HTML servido |

### Feature flags / cutover

Ninguno. El modo por defecto es el vigente y el claro requiere una acción explícita del operador.

### Rollback plan per slice

| Slice | Rollback | Tiempo | ¿Reversible? |
|---|---|---|---|
| 1-2 | revert del commit; `GLOBE_TOKENS` vuelve a ser literal | minutos | sí |
| 3 | quitar `themable: true` de las rutas del Producer apaga el interruptor sin tocar tokens | minutos | sí |
| 4 | revert; los gates quedan como documentación del hallazgo | minutos | sí |

### Production verification sequence

1. `pnpm -r test` en `efeonce-globe` (incluye los cinco canarios de browser).
2. Abrir el Producer, cambiar el modo, recargar: persiste y no destella.
3. Abrir el share board con `globe.theme=light` guardado: **debe seguir oscuro**.

### Out-of-band coordination required

Publicar `@efeoncepro/axis-tokens@0.2.3` y subir el pin de Globe de `0.2.2` a `0.2.3`.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [x] Existe un interruptor de apariencia alcanzable desde el menú de cuenta del Producer.
- [x] La elección persiste y se aplica **antes del primer pintado** (sin destello).
- [x] El modo oscuro no se movió: `globe-theme.generated.css` byte-identical.
- [x] El override del modo claro apunta a la propiedad que de verdad manda, con gate que lo afirma.
- [x] Ninguna superficie honra el modo sin declararlo; el share board queda fijado en oscuro.
- [x] El modo claro no introduce ningún fallo de contraste que el oscuro no tenga (conjuntos idénticos).
- [x] Monorepo entero verde, incluidos los cinco canarios de browser.

## Verification

- `pnpm -r test` en `efeonce-globe`: 143 studio-client · 280 studio-web · 374 domain · 248
  creative-runner · 114 database, y `motor de estilos OK` · `legacy fallback OK` ·
  `contraste del modo claro OK` · `composer canary OK` · `AXIS pilot canary OK`.
- `pnpm --filter @efeoncepro/axis-tokens test`: 13/13, incluido el gate de tintas que atrapó dos valores
  míos por debajo del piso.

## Hallazgos que la spec no anticipaba

1. **El share board heredaba el modo.** No tiene interruptor, así que el cliente nunca lo eligió. **No
   se veía mal** — se veía perfectamente bien en claro, y por eso ningún barrido de contraste lo habría
   encontrado. El defecto no era feo, era incorrecto.
2. **`--success` como texto daba 2,54:1.** El relleno y la tinta son dos decisiones distintas; AXIS
   0.2.3 las separa (`axisBrandSemanticInk`). Su gate atrapó dos valores míos al escribirlo.
3. **Siete botones usaban `text-canvas`** como proxy de «el oscuro que contrasta con la marca» — cierto
   sólo en modo oscuro.
4. **El isotipo era blanco sobre blanco.** El SVG es monocromo, así que su color no es la marca: pasa a
   servirse como máscara con el color del token.
5. **Mi primer barrido reportó 61 fallos y casi todos eran mentira.** Sin control comparativo, un
   barrido de contraste sólo dice que el diseño tiene deuda; y un gradiente no se mide con un número.

## Closing Protocol

- [x] `Lifecycle: complete` y archivo en `docs/tasks/complete/`.
- [x] `docs/tasks/README.md` y `docs/tasks/TASK_ID_REGISTRY.md` sincronizados.
- [x] Wireframe y flow con contenido real de lo implementado, no stubs para el gate.
- [x] Evidencia visual durable en `docs/ui/evidence/task-1613/`.
- [x] `Handoff.md` y `changelog.md` actualizados.
- [x] `@efeoncepro/axis-tokens@0.2.3` **publicada** y el pin de Globe subido a `0.2.3`; la suite corre
      contra el paquete del registry, no contra un `dist` copiado a mano.
- [x] PR abierto en `efeonce-globe`: https://github.com/efeoncepro/efeonce-globe/pull/8 (lleva
      `TASK-1612` y `TASK-1613`). **Pendiente de revisión y merge humano.**

## Follow-ups

- Decidir qué hacer con los 14 textos que fallan el piso en **ambos** modos (`--faint` a 40% de alpha).
- Cubrir launch y error surfaces en el barrido cuando tengan canario.
