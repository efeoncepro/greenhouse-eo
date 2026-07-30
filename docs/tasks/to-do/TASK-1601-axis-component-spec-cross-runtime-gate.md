# TASK-1601 — Especificación de componente en AXIS + gate de diff visual cross-runtime

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `standard`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `optional`
- Status real: `Diseño — ADR corregido y aceptado 2026-07-30; ejecución no iniciada`
- Rank: `TBD`
- Domain: `ui-platform|cross-runtime`
- Blocked by: `none`
- Branch: `task/TASK-1601-axis-component-spec-cross-runtime-gate`
- Legacy ID: `none`
- GitHub Issue: `none`

> **Sobre `Execution profile: standard` y `UI impact: none`.** No diseña ninguna pantalla: extiende un tipo,
> escribe especificaciones en tokens y construye un script de comparación. El artefacto visual que produce
> es **evidencia**, no interfaz. `task:lint` marcará `ui-wireframe-contract` — es el **falso positivo
> conocido**: el gate clasifica por substring en `Domain`, y `TASK-1147` (que definió el profile `ui-ux`, y
> está `complete`) falla el mismo error. No se fabrica un wireframe para apagarlo.

## Summary

Cerrar el tercer eje del ADR de ownership: llevar la **capa de componente** (`button-height`,
`button-padding-x`, `button-radius`, `button-danger-bg`) a AXIS, extendiendo `DesignPatternContract` con
`spec` + `tones` en tokens, y construir el **diff visual cross-runtime** que verifica que dos adapters del
mismo pattern rinden igual.

## Why This Task Exists

`TASK-1600` movió el valor —primitivo y semántico— y quedó correctamente cerrada. Pero es **un tercio de la
arquitectura**: `modern-ui` §3 pinea tres capas —primitivo → semántico → **componente**— y la tercera es la
que garantiza consistencia visual.

Sin ella, **cada producto elige la altura, el padding y el radio de su botón**. El resultado es lo que el
operador nombró el 2026-07-30: *"si un botón se va a comportar igual pero se va a ver distinto donde lo
pongan, ¿qué sentido tiene tener un design system?"*. Ninguno: sería una paleta compartida entre productos
que se ven distinto.

Y hoy el contrato **no puede impedirlo**, porque es puro texto:

```ts
anatomy: ['root', 'indicator', 'label']
states:  ['neutral', 'success', 'warning', 'danger', 'unknown']
```

Dos implementaciones pueden cumplirlo al pie de la letra y verse completamente distintas. Un contrato sin
valores no es un contrato: es una descripción.

## Goal

Que el mismo pattern se vea igual en Greenhouse y en Globe, y que exista un gate que lo demuestre en vez de
confiar en la disciplina de quien escribe el adapter.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/architecture/EFEONCE_AXIS_DESIGN_SYSTEM_OWNERSHIP_DECISION_V1.md` — el ADR que esta task ejecuta
  (eje 3). Corregido y aceptado 2026-07-30.
- `docs/architecture/EFEONCE_SHARED_PRODUCT_UI_PLATFORM_DECISION_V1.md` — plataforma AXIS.
- `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` + `DESIGN.md` — la especificación que hoy vive dentro
  de Greenhouse y que esta task empieza a portar.
- `docs/architecture/GREENHOUSE_FRONTEND_CAPTURE_HELPER_V1.md` — GVC, la maquinaria de captura existente.

## Normative Docs

- `.claude/skills/design-system-governance/SKILL.md` §3 y §11 — la escala fija (spacing `4n`, radius
  `xs=2 sm=4 md=6 lg=8 xl=10`, iconos `{14,16,18,20,22}`, motion `{75,150,200,300,400,600}`, ladder
  tipográfico de 8 tamaños). **Es la especificación que hay que portar**, no una que haya que inventar.
- `.claude/skills/modern-ui/SKILL.md` §3 — token layering primitivo → semántico → componente.
- `.claude/skills/axis-design-system/SKILL.md` — invariantes de AXIS.

## Dependencies & Impact

### Depends on

- `TASK-1600` (**complete**) — el valor primitivo y semántico ya vive en AXIS `0.2.1`. Sin eso, una `spec`
  no tendría tokens a los que referirse.
- `TASK-1589` V1.1 — distribución y CI del paquete operativos.

### 🔴 Contradicción abierta con `TASK-1485` (P0) — resolver antes de ejecutar

`TASK-1485` declara:

> *"Crear el Design System **propio de Globe** (…) Globe **posee e implementa** tokens seleccionados,
> patterns, components, motion y runtime **sin heredar** el Design System de Greenhouse"*
> y *"entregar un registry versionado y un **Pattern Lab Globe**"*.

Es **incompatible con el ADR corregido** en su punto central: si Globe posee sus patterns y sus components,
el mismo pattern puede verse distinto en cada producto — exactamente lo que este eje existe para impedir.
También choca con la decisión del 2026-07-30 de que **el Lab vive en el Vercel de AXIS** (`TASK-1590`): un
Pattern Lab Globe sería un segundo Lab.

**Esto no es nuevo del todo:** `EFEONCE_SHARED_PRODUCT_UI_PLATFORM_DECISION_V1` ya decía que *"`TASK-1485`
pasa a ser consumer/piloto de la plataforma compartida y debe actualizarse antes de promover el registry
como estable"*, y el continuity map lo listaba como P4. Nadie lo actualizó. El ADR corregido agrava la
distancia: `1485` no sólo deja de ser dueño del registry — deja de ser dueño de sus tokens y patterns.

Lo que **sí sigue siendo válido de `1485`**: que Globe no herede MUI/Vuexy (cierto, y este ADR lo preserva),
y su lifecycle `candidate → trial → stable` (que es el mismo del contrato compartido).

### Solapamiento declarado con `TASK-1592`

`TASK-1592` (*agentic UI registry workflow*) incluye *"la promoción por lifecycle y los gates de …
evidencia"*. El diff cross-runtime **es** un gate de promoción, así que se tocan.

Frontera propuesta: **`1592` es el proceso** (cómo un agente busca, decide `reuse | extend | new` y
promueve); **`1601` es el contrato y el mecanismo** (que la spec exista y que algo la verifique). Sin esta
frontera escrita, las dos tasks van a discutir qué bloquea una promoción.

### Blocks / Impacts

- `TASK-1588` (umbrella AXIS) — cierra el eje que faltaba.
- `TASK-1590` (Lab) — el Lab pasa a alojar el diff cross-runtime, además del catálogo.
- **El eje 2 (`axis-headless`)** — independiente, pero converge: un pattern `stable` necesitará spec
  (esta task) y comportamiento (eje 2).
- Cualquier producto futuro (Wave) hereda la especificación en vez de reinventarla.

### Files owned

En `../axis-design-system`:

- `packages/contracts/src/index.ts` — `DesignPatternContract` gana `spec` + `tones`.
- `packages/contracts/src/index.test.ts` — el gate de forma cubre los campos nuevos.
- `packages/tokens/src/tokens.ts` — tokens de componente (`control-md`, `dot-md`, …) [verificar nombres].
- `apps/lab/**` — fixtures por adapter + la superficie de comparación.
- `scripts/**` — el runner del diff cross-runtime [verificar ubicación: AXIS vs Greenhouse].

En Greenhouse:

- `src/components/greenhouse/primitives/AxisStatus.tsx` — pasa a derivar del `spec`.
- `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` · `DESIGN.md` — declarar qué especificación migró.

En Globe:

- `apps/studio-client/src/primitives/axis.tsx` — ídem, deriva del `spec`.

## Current Repo State

### Already exists

- `@efeoncepro/axis-tokens@0.2.1` con primitivos + semánticos (ramps, `axisSemanticHex`, `axisNeutral`,
  `axisChart`). **No tiene tokens de componente.**
- `DesignPatternContract` con `anatomy`, `states`, `accessibility`, `responsive`, `motion`, `consumers`,
  `evidence` — **todas listas de strings, cero valores**.
- **Dos adapters vivos del mismo contrato**: `AxisStatus.tsx` (MUI, Greenhouse) y `axis.tsx` (Tailwind,
  Globe). Escritos **sin spec compartida**.
- GVC (`pnpm fe:capture`, `fe:capture:diff`) — captura y compara **dentro de un producto**.
- `apps/lab` en AXIS, desplegado, con registry + preview + panel de evidencia.

### Gap

- **No existe la capa de componente** en ningún paquete.
- **No existe ningún gate visual cross-producto.** Los únicos gates visuales del repo son intra-producto
  (`globe-client-seam-gate`, `globe-share-board-canary`, GVC).
- **Nadie sabe cuánto divergen hoy** los dos adapters de `efeonce.status`.

## Modular Placement Contract

- Topology impact: `ui-package`
- Current home: la especificación vive en `DESIGN.md` + `GREENHOUSE_DESIGN_TOKENS_V1.md` + `mergedTheme.ts`
- Future candidate home: `ui-package`
- Boundary: AXIS publica **spec en tokens**; el producto publica su traducción. El diff cross-runtime es el
  gate de la frontera.
- Server/browser split: la `spec` es dato puro (server-safe); el diff necesita browser real (Playwright).
- Build impact: `none` para los consumidores — el diff corre en el Lab, no en el build de producto.
- Extraction blocker: `none` para la spec. El diff sí necesita que los dos adapters sean renderizables
  fuera de su producto — **es el unknown real de esta task** y lo resuelve el Slice 0.

<!-- ZONE 2 — EXECUTION (la llena el agente que toma la task) -->

<!-- ZONE 3 — SCOPE & SPEC -->

## Scope

### Slice 0 — Medir la divergencia actual (diagnóstico, antes de escribir una sola spec)

Renderizar `efeonce.status` en sus **dos adapters vivos** y compararlos. No hay spec que respetar todavía:
el objetivo es el **número**.

Entregable: la divergencia medida, en píxeles y en propiedades computadas (alto, padding, radio, tipografía,
color por estado), más la respuesta al unknown de arriba — **si los dos adapters se pueden renderizar en un
mismo arnés**, o si hace falta que cada producto exporte su fixture.

Es esperable que difieran: se escribieron sin spec. **Ese número dimensiona la task entera** y es el
argumento más honesto a favor o en contra del eje.

### Slice 1 — `DesignPatternContract` gana `spec` + `tones`

```ts
spec: {
  root:      { height: 'control-md', paddingX: 'space-4', radius: 'radius-full', gap: 'space-2' },
  indicator: { size: 'dot-md', radius: 'radius-full' },
  label:     { typography: 'label-md' }
},
tones: {
  danger: { surface: 'danger-tint', text: 'danger-ink', border: 'danger-border' }
}
```

**Sólo tokens, nunca literales.** El gate de forma del paquete se extiende para rechazar un valor crudo:
un `40` suelto reintroduce el número mágico que la capa de tokens existe para eliminar.

Requiere además **acuñar los tokens de componente que falten** (`control-md`, `dot-md`, …) en
`axis-tokens`, derivándolos de la escala fija que `design-system-governance` §3 ya pinea.

### Slice 2 — El diff visual cross-runtime

Un runner que, dado un `patternId`, renderiza el fixture de cada adapter y compara con umbral.

- Vive en el Lab (único lugar donde los dos adapters coexisten).
- Reporta por parte y por estado, no un único porcentaje global: *"el `root` difiere 4 px de alto en
  `danger`"* es accionable; *"difiere 3%"* no.
- **Precondición de promoción a `stable`.** Un pattern `candidate` puede tener un solo adapter.

### Slice 3 — `efeonce.status` extremo a extremo

Escribir su `spec`, hacer que los dos adapters deriven de ella, y llevar el diff del número del Slice 0 a
dentro del umbral. Es el primer pattern del sistema con consistencia **verificada**, no declarada.

## Out of Scope

- **El resto de los patterns.** Esta task entrega el mecanismo y **un** pattern piloto. Escribir 20 specs es
  criterio de diseño escaso; se hace por lifecycle, no en lote.
- **El eje 2 (`axis-headless`).** Independiente.
- **Tipografía, elevación, geometría y motion como capas de valor** — son eje 1, con sus propias tasks.
- **Mudar el catálogo de `/design-system`** — es `TASK-1590`.
- **Resolver la contradicción con `TASK-1485`.** Se declara acá; la decisión es del operador.
- **Multi-brand.** `design-system-governance` §8 lo tiene como V1.5 no implementado.

## Detailed Spec

### La forma del `spec`, y por qué sólo tokens

```ts
export type SpecValue = string  // SIEMPRE un token id, NUNCA un literal

export type PartSpec = Readonly<Record<string, SpecValue>>

export type DesignPatternContract = {
  // … campos actuales …
  spec?: Readonly<Record<string, PartSpec>>   // por parte de la anatomy
  tones?: Readonly<Record<string, PartSpec>>  // por estado/tono
}
```

Invariante que el gate de forma debe hacer cumplir: **cada valor de `spec`/`tones` resuelve a un token
existente en `axis-tokens`**. Un `'40px'`, un `40` o un `'#dc2e39'` se rechazan. La razón no es purismo: un
literal en el contrato es un valor que vive en dos lugares, que es la clase de bug que este eje entero viene
a cerrar (ver el drift de `warning`/`danger`, `TASK-1600`).

Las keys de `spec` **deben coincidir con `anatomy`**: si `anatomy` declara `['root','indicator','label']`,
`spec` no puede hablar de una parte que no existe. Eso también es verificable en el gate.

### El runner del diff, en concreto

```
diff <patternId> --adapters greenhouse,globe --states neutral,success,warning,danger
```

Por cada `(parte × estado × adapter)` captura y compara **dos cosas**:

1. **Propiedades computadas** — `getComputedStyle`: alto, padding, radio, familia, peso, tamaño, colores.
   Es la comparación **accionable**: *"el `root` mide 40 px en Greenhouse y 36 px en Globe para `danger`"*.
2. **Píxeles** — captura del fixture, comparada con umbral. Atrapa lo que las propiedades computadas no ven
   (un box-shadow, un borde en el lugar equivocado).

Reportar **por parte y por estado**, nunca un porcentaje global: un global no dice qué arreglar.

**Precedente a reusar, no reinventar:** el canary de motor de Globe ya lee valores computados en browser
real para verificar que Tailwind rinde lo que el theme declara (`tailwind-engine-canary.mjs`). Este runner
es el mismo principio, con dos motores en vez de uno.

### Cómo se deriva la primera `spec` (y cómo no)

**No se inventa.** Se **deriva del render actual de Greenhouse**, que es el producto con la especificación
más madura (`design-system-governance` §3/§11: escala fija de spacing, radius, iconos, motion y ladder
tipográfico). El procedimiento:

1. Leer los valores computados reales de `AxisStatus` en Greenhouse.
2. Mapear cada uno al token de la escala fija que le corresponde. Si un valor **no cae en la escala**, es un
   hallazgo: o la escala se extiende con gobernanza, o el componente estaba fuera de escala y hay que
   corregirlo. **No inventar un token para acomodar un valor arbitrario.**
3. Escribir la `spec` con esos tokens.
4. Hacer que Globe derive de ella y medir cuánto se movió Globe.

Ese orden importa: si la spec se escribiera desde cero, cambiaría los dos productos a la vez y no habría
línea base contra la cual verificar nada.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- **Slice 0 va primero y puede cancelar la task.** Si los dos adapters no son renderizables en un arnés
  común, el Slice 2 necesita otro diseño y hay que re-planificar antes de escribir specs.
- Slice 1 (contrato) → Slice 2 (gate) → Slice 3 (piloto).
- **Slice 2 DEBE existir antes de cerrar Slice 3**: sin gate, "los dos adapters coinciden" es una afirmación
  sin evidencia — exactamente el problema que esta task viene a cerrar.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Los adapters no son renderizables en un arnés común | UI platform | **medium** | Slice 0 lo responde antes de invertir en specs | el propio Slice 0 |
| El diff da falsos positivos por antialiasing / sub-pixel entre motores | UI platform | **high** | umbral calibrado con el número del Slice 0, y comparación por propiedad computada además de píxeles | ruido en el gate; si es constante, el umbral está mal |
| Escribir la `spec` cambia sin querer cómo se ve un producto | UI (Greenhouse y/o Globe) | medium | la spec se **deriva** del render actual de Greenhouse, no se inventa; diff intra-producto antes de mergear | GVC por producto + tests de contraste |
| La spec queda ambigua y los adapters divergen "legítimamente" | UI platform | medium | reportar por parte y estado, no global; una ambigüedad se ve como divergencia localizada | el diff |
| Se ejecuta sin resolver `TASK-1485` y Globe queda con dos doctrinas | UI platform | **high** | contradicción declarada arriba; decisión del operador **antes** de Slice 3 | conflicto al tocar el adapter de Globe |

### Feature flags / cutover

**Sin flag.** Los Slices 0–2 son aditivos y no tocan producto: miden y construyen herramienta. El Slice 3 sí
cambia adapters, y su control es el diff intra-producto de cada consumidor (el mismo criterio de
`TASK-1600`: el pixel no se mueve, o se justifica).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 0 | ninguno — sólo mide | n/a | n/a |
| Slice 1 | campos opcionales en el contrato; un consumidor que no los lea no se entera | <5 min | sí |
| Slice 2 | el gate es nuevo: desactivarlo o revertir el PR | <5 min | sí |
| Slice 3 | revertir el PR de cada adapter + fijar la versión previa del paquete | <15 min | sí |

Ningún slice muta estado durable.

### Production verification sequence

1. Slice 0: el número, revisado por el operador. **Decisión explícita de seguir o replantear.**
2. Slice 1: CI del repo AXIS verde + gate de forma rechazando un literal en rojo deliberado.
3. Slice 2: el diff corre sobre `efeonce.status` y **reproduce el número del Slice 0**. Si no lo reproduce,
   el runner está mal.
4. Slice 3: diff cross-runtime dentro del umbral **y** diff intra-producto sin cambio visual en cada
   consumidor.
5. Revisión humana del antes/después en los dos productos.

### Out-of-band coordination required

- **Publicar la versión del paquete** con `spec` + tokens de componente es un tag en `axis-design-system`.
- **Tocar el adapter de Globe** entra en su repo: coordinar con lo que esté en vuelo ahí (`TASK-1552`
  Slice 3 sigue abierto sobre el composer).

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] Existe el número del Slice 0: cuánto divergen hoy los dos adapters de `efeonce.status`, por propiedad.
- [ ] `DesignPatternContract` acepta `spec` + `tones`, y el gate de forma **rechaza un literal** (verificado
      en rojo deliberado).
- [ ] Los tokens de componente que la `spec` necesita existen en `axis-tokens` y derivan de la escala fija
      de `design-system-governance` §3 — ninguno inventado.
- [ ] El diff cross-runtime corre sobre un `patternId` y reporta **por parte y por estado**, no un global.
- [ ] `efeonce.status` tiene `spec`, sus dos adapters derivan de ella, y el diff queda dentro del umbral.
- [ ] El umbral está **justificado con el dato del Slice 0**, no elegido a ojo.
- [ ] Ningún adapter declara una dimensión, un radio o un peso propio del pattern.
- [ ] El diff intra-producto de cada consumidor no muestra cambio visual sin justificar.
- [ ] La frontera con `TASK-1592` quedó escrita en ambas tasks.

## Verification

- En `../axis-design-system`: `pnpm build && pnpm typecheck && pnpm test`
- `pnpm local:check` + `pnpm test` + `pnpm build` en Greenhouse
- `pnpm check` en Globe
- El runner del diff cross-runtime sobre `efeonce.status`
- `pnpm fe:capture:diff` intra-producto en Greenhouse; canary del composer en Globe

## Closing Protocol

- [ ] `Lifecycle` sincronizado con el estado real
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado ejecutado
- [ ] El ADR pasa de `eje 1 implementado` a reflejar el estado del eje 3
- [ ] `TASK-1588` (umbrella) refleja el cierre del eje
- [ ] `TASK-1485` quedó resuelta o re-scopeada (no puede quedar contradiciendo el ADR)

## Follow-ups

- **El resto de los patterns**, por lifecycle. Cada uno con su spec y su diff.
- **Eje 2 (`axis-headless`)** — converge acá cuando un pattern necesite spec + comportamiento.
- **Capas 2 y 3 del eje 1** — tipografía, elevación, geometría, motion.

## Open Questions

1. **¿Cuánto divergen hoy?** Lo responde el Slice 0 y condiciona todo lo demás.
2. **¿El umbral es 0%?** El diff intra-producto de `TASK-1600` logró 0.00%, pero eso compara el mismo motor
   consigo mismo. Entre motores distintos puede haber diferencias legítimas de rasterización. **Medir antes
   de fijar**; un umbral demasiado estricto produce un gate ruidoso que la gente aprende a ignorar.
3. **¿Dónde vive el runner del diff?** En AXIS (junto al Lab) o en Greenhouse (donde ya vive Playwright y
   GVC). La segunda opción reintroduciría una dependencia cross-repo como la de `ISSUE-128` — preferir AXIS
   salvo razón fuerte.
4. **¿La `spec` cubre responsive?** Un pattern puede cambiar de dimensiones por breakpoint o por container
   query. Empezar por el caso simple y declarar explícitamente que responsive queda para después.
