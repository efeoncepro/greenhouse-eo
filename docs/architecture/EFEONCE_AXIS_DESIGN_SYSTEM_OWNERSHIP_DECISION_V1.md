# AXIS Design System Ownership Decision V1

## Status

**`Accepted — eje 1 implementado (primer tercio)`** — aprobado por el operador el 2026-07-29; eje 1
ejecutado mediante `TASK-1600` el 2026-07-30.

> ⚠️ **Corregido el 2026-07-30 por un error de razonamiento del autor, detectado por el operador.**
> La primera versión declaraba que AXIS posee *valor + rol + comportamiento* y que el producto posee **la
> materialización**. Eso metía dos cosas distintas bajo la misma palabra y **permitía que el mismo botón se
> viera distinto en cada producto** — es decir, anulaba la razón de existir de un design system. Ver
> § *El error corregido*.
>
> **Qué implica para lo ya ejecutado:** `TASK-1600` movió las capas **primitiva y semántica**, y eso sigue
> siendo correcto. Pero es **el primer tercio**: falta la capa de **componente**, que es justamente la que
> garantiza consistencia visual. Lo hecho no se invalida; queda reencuadrado como incompleto.
>
> Se conserva íntegro: la separación control-plane ≠ propiedad del artefacto, el precedente de Globe, el
> versionado en dos ejes y la medición que habilita el movimiento.

Invierte y supersede en la propiedad del valor el § Delta 2026-07-29 (a) de
[`EFEONCE_SHARED_PRODUCT_UI_PLATFORM_DECISION_V1.md`](EFEONCE_SHARED_PRODUCT_UI_PLATFORM_DECISION_V1.md).
Ese Delta sigue vigente en todo lo demás (gobierno del proceso, distribución, versionado, gates).

## Context

AXIS es el design system de Efeonce. Sus consumidores son Greenhouse, Globe y —declarado en el ADR de
LaunchOps como marca de producto, todavía sin repo— **Wave**, más los que vengan.

El valor de marca vivía en `src/@core/theme/axis-*.ts` **dentro de Greenhouse**, y el paquete replicaba un
subconjunto a mano. Eso producía una asimetría estructural: **cambiar el azul de la marca Efeonce obligaba
a tocar un producto para afectar a todos los productos.** Greenhouse no era un consumidor más — era el
dueño disfrazado de par.

La brecha, medida: **Greenhouse tiene 71 primitives (115 exports)**, Globe 5, y AXIS **2 contratos**. El
design system real de Efeonce vive dentro de un producto.

Tres hechos medidos el 2026-07-29 que forzaron la decisión:

1. **El drift ya había ocurrido.** `warning` y `danger` llevaban divergidos desde TASK-1053 sin que nada lo
   detectara. Inerte sólo porque ningún consumidor leía `efeonceTokens.color`.
2. **Los tokens de Greenhouse son datos puros.** `axis-tokens.ts` y `axis-chart.ts` no tienen ningún
   `import`; los otros tres sólo importan de `axis-tokens`. **Cero dependencias de MUI**: portables tal cual.
3. **Wave todavía no existe.** Con el SSOT donde estaba, nacería copiando valores del repo de otro producto.
   El costo de invertir crece con cada consumidor que entra.

## El error corregido

La primera versión trazó la frontera así: *AXIS publica el QUÉ (valor, rol, comportamiento); el producto
publica el CÓMO (la materialización)*.

El problema es que **"materialización" nombraba dos cosas incompatibles**:

| | Qué es | ¿De quién es? |
|---|---|---|
| **Traducción a motor** | `theme.palette.error.main` **vs** `bg-danger` | Del **producto**. Es sintaxis |
| **Decisión de diseño** | el botón danger mide 40 px de alto, radio 6, padding 16, peso 600 | Del **sistema**. Es diseño |

Al dar las dos al producto, cada consumidor quedaba libre de elegir altura, padding y radio. Consecuencia:
**el mismo pattern se ve distinto en cada producto** — que es precisamente lo que un design system existe
para impedir. MUI y Tailwind deben ser **dos formas de escribir el mismo resultado**, no dos resultados.

**La arquitectura correcta ya estaba canonizada en el repo** y no se aplicó. `modern-ui` §3 la pinea como
no negociable, y la shippean Carbon, Fluent, Primer, Atlassian, Polaris, Spectrum y Lightning:

```
Primitive    blue-500        #0375db        oklch(57% 0.18 250)
                 ↓                ↓
Semantic     accent-rest     --color-accent
                 ↓                ↓
Component    button-primary  --button-primary-bg
```

**Son tres capas, y AXIS publicaba dos.** La tercera —la de componente— es exactamente la que garantiza
consistencia visual. Sin ella no hay sistema: hay una paleta compartida y productos que se ven distinto.

Y la especificación completa **ya existe**: `design-system-governance` §3 y §11 pinean una escala fija
—spacing `4n`, radius `xs=2 sm=4 md=6 lg=8 xl=10`, iconos `{14,16,18,20,22}`, motion
`{75,150,200,300,400,600}`, easing `cubic-bezier(0.2, 0, 0, 1)`, un ladder tipográfico de 8 tamaños y 4
roles de peso—. Eso **es apariencia gobernada**, y hoy está encerrada dentro de un producto.

## Decision

**AXIS posee la especificación completa. El producto posee únicamente su traducción a motor.**

| Capa | Ejemplo | Dueño |
|---|---|---|
| **Primitivo** | `#0375db` · `4px` · `200ms` | **AXIS** |
| **Semántico** | `danger-ink` · `accent-rest` · `surface-raised` | **AXIS** |
| **Componente** | `button-height: 40` · `button-padding-x: 16` · `button-radius: md` · `button-danger-bg` | **AXIS** |
| **Comportamiento** | focus trap, escape, roving tabindex, roles ARIA | **AXIS** (`axis-headless`) |
| **Traducción a motor** | `theme.palette.error.main` · `bg-danger` · lo que use Wave | **El producto** |

**El producto no decide nada visual.** Decide cómo escribe lo que AXIS ya decidió.

### La objeción obvia, y su respuesta

*"¿Y si Globe necesita un botón distinto?"* Entonces una de dos, y ninguna es improvisar:

1. Es **el mismo pattern con una variante nueva**, y la variante se declara en AXIS para todos.
2. Es **un pattern propio de Globe** que no sube a AXIS (los cinco tests de § *Qué sube*).

Lo que no puede ocurrir es que el **mismo pattern** rinda distinto en dos productos. Eso no es flexibilidad:
es drift con permiso.

La diferencia de **marca** entre productos —si algún día la hay— se resuelve en la capa **semántica** (el
rol `accent` resuelve a otro primitivo por brand), nunca rompiendo la capa de componente. Es el multi-brand
que `design-system-governance` §8 tiene planificado como V1.5 y que **no debe introducirse prematuramente**.

### Lo que AXIS nunca publica

- **CSS de un motor concreto**, utilidades de Tailwind o `sx` de MUI.
- **Un componente que llega pintado** — un `<Button>` de MUI ataría a Globe a MUI.
- **Una API que exponga tipos de un motor** (`SxProps`, `Theme`).

La distinción exacta: AXIS publica **cuánto mide y de qué color es** (dato); el producto publica **con qué
sintaxis se escribe** (código). Un `<Dialog>` *headless* —comportamiento sin una sola regla de estilo— es
dato de comportamiento y sí puede publicarse.

### Control plane ≠ propiedad del artefacto

Ortogonales, y fusionadas por accidente histórico (AXIS nació dentro de Greenhouse):

| | Quién | Cambia con este ADR |
|---|---|---|
| Gobierno del proceso — quién aprueba un cambio, `TASK-###`, lifecycle, evidencia, cierre documental | **Greenhouse** | **No** |
| Propiedad del artefacto — valor, rol, **especificación de componente**, contrato, comportamiento | **AXIS** | **Sí** |

El ecosistema ya resolvió esto: **Greenhouse gobierna Globe y el código de Globe vive en `efeonce-globe`.**
Este ADR aplica la misma regla en vez de inventar una segunda doctrina.

## Target topology

Cuatro capas de portabilidad decreciente, en paquetes distintos: un producto que no sea React sigue
consumiendo las tres primeras.

```
   AXIS  (efeoncepro/axis-design-system)

   ├── axis-tokens      TS puro   → primitivos + semánticos + COMPONENTE
   │                                objetos planos + custom properties CSS
   ├── axis-contracts   TS puro   → anatomy · spec por parte × estado · a11y · lifecycle
   │   axis-registry
   │
   └── axis-headless    React     → comportamiento + teclado + ARIA
                        (peer)      CERO reglas de estilo
                          │
      ┌───────────────────┼───────────────────┬──────────────────┐
      ▼                   ▼                   ▼                  ▼
  Greenhouse            Globe               Wave            (siguiente)
  traduce a MUI     traduce a Tailwind    su motor           su motor
        └───────────────────┴───────────────────┴──────────────────┘
                                  │
                    Diff visual CROSS-RUNTIME en el Lab
                    (mismo fixture, dos motores, mismo resultado)

  Gobierno del proceso (tasks · lifecycle · evidencia · runbook) → Greenhouse, para todos
```

`axis-headless` declara React como **peerDependency**, nunca dependency: una copia duplicada de React rompe
hooks y context en silencio.

## La forma del contrato

Hoy `DesignPatternContract` es puro texto y **por eso no garantiza nada visual**:

```ts
anatomy: ['root', 'indicator', 'label']
states:  ['neutral', 'success', 'warning', 'danger', 'unknown']
```

Ni un solo valor. Dos implementaciones pueden cumplirlo al pie de la letra y verse completamente distintas.

Lo que necesita es **la especificación por parte × estado, expresada en tokens**:

```ts
spec: {
  root:      { height: 'control-md', paddingX: 'space-4', radius: 'radius-full', gap: 'space-2' },
  indicator: { size: 'dot-md', radius: 'radius-full' },
  label:     { typography: 'label-md' }
},
tones: {
  danger:  { surface: 'danger-tint', text: 'danger-ink', border: 'danger-border' },
  success: { surface: 'success-tint', text: 'success-ink', border: 'success-border' }
}
```

**Sólo tokens, nunca literales**: un `40` suelto en el contrato reintroduce el valor mágico que la capa de
tokens existe para eliminar. Así es traducible a MUI y a Tailwind con el mismo resultado, y verificable.

## Cómo se verifica — el gate que hace real la consistencia

Un contrato sin gate es una recomendación. La consistencia visual cross-runtime se verifica con un
**diff visual entre motores**: el mismo fixture del pattern, renderizado por el adapter de cada consumidor,
comparado con umbral.

- **Divergencia > umbral** ⇒ el adapter no respetó la spec, o la spec es ambigua. Las dos son defectos.
- Vive en el **Lab**, su lugar natural: es el único sitio donde los dos adapters coexisten.
- Es **precondición de promoción** a `stable`. Un pattern `candidate` puede tener un solo adapter; uno
  `stable` tiene dos y coinciden.

Es el mismo principio que el gate de drift de tokens, un nivel arriba: SSOT + derivación + señal.

## Delta 2026-07-30 — el stack del Lab, y qué renderiza exactamente

El ADR le asigna al Lab dos funciones —documentar el **uso** y alojar el **diff cross-runtime**— sin decir
cómo. Medido: `apps/lab` es **Vite + TypeScript vanilla**, sin React, y construye la UI con `innerHTML` y
template strings. Los adapters a comparar son componentes React. La pregunta *"¿el Lab tiene que ser React,
Next o Astro?"* quedó abierta y se decide acá.

### Qué renderiza el Lab: una implementación de REFERENCIA, no los adapters

La opción intuitiva —que el Lab importe los adapters de Greenhouse y de Globe— es **la trampa de
`ISSUE-128`**: acoplamiento cross-repo al `node_modules` de otro proyecto, que ya dejó el CI de Globe rojo 9
commits. Se descarta.

**El Lab implementa cada pattern desde su `spec`, en HTML + CSS puro.** Y eso no es un parche: es el mejor
test que la spec puede tener.

> Si un pattern **no se puede implementar** desde su `spec` sin inventar un valor, **la spec está
> incompleta**. La implementación de referencia es la prueba de completitud, no una demo.

Además da el tercer punto de comparación: **MUI vs Tailwind vs referencia**. Si los dos adapters coinciden
entre sí pero difieren de la referencia, el problema está en la spec; si uno solo difiere, está en ese
adapter. Con dos puntos no se distingue; con tres, sí.

**Frontera que hay que no confundir:** el Lab **es una app**, no un paquete publicado. Que implemente un
pattern en CSS **no** viola la regla de que AXIS nunca publica apariencia implementada — nadie consume el
Lab como dependencia. Lo que se publica sigue siendo dato: tokens, contratos y comportamiento.

Los **artefactos** de cada producto (captura + propiedades computadas) se muestran junto a la referencia,
emitidos por cada consumidor con su propia maquinaria (GVC en Greenhouse, canaries en Globe). El Lab los
compara; no los produce.

### Stack: **Astro**, y no es preferencia estética

| Candidato | Veredicto |
|---|---|
| **Astro** | ✅ **elegido** |
| Vanilla (hoy) | Alcanza para 2 contratos; no escala a N patterns con prosa, do/don't y ejemplos. `innerHTML` con template strings no es un sistema de contenido |
| Next | Ataría el Lab a React y es un framework de app para un sitio de contenido |
| Storybook | Es el estándar de labs de DS, pero su modelo es *"componentes de un repo"*, no *"una spec y N implementaciones"*. Y ata a un framework — justo lo que este ADR evita |

Cinco razones, en orden de peso:

1. **La decisiva — no ata el Lab al framework de un consumidor.** Un Lab en React ataría la documentación
   del design system a React, que es el motor de dos de sus consumidores hoy pero no necesariamente de
   Wave. Astro mantiene el Lab **tan agnóstico como los paquetes**. La portabilidad no se negocia en la
   capa que documenta la portabilidad.
2. **Islas cuando hagan falta, no antes.** Cuando el eje 2 necesite demostrar un `<Dialog>` headless
   interactivo —que es React— se agrega **una isla React** en esa página, sin convertir el Lab entero.
   Ningún otro candidato permite eso sin comprometer todo el sitio.
3. **El Lab es un sitio de documentación**, no una app. Content Collections + Zod dan contenido tipado y
   validado en build; hoy los docs serían template strings.
4. **Zero JS por defecto** — la referencia en HTML + CSS se sirve sin una línea de JavaScript, lo que
   refuerza en el propio artefacto que la spec no depende de ningún framework.
5. **El ecosistema ya lo usa.** `efeonce-think` es Astro, hay skill `astro` con overlay, y la disciplina de
   *dumb render* ya está escrita: el Lab renderiza lo que AXIS publica, no computa nada.

**Migración:** el Lab actual son ~70 líneas (`main.ts` + `index.ts`). Reescribirlo en Astro es más barato
que adaptarlo, y no hay estado ni backend que preservar.

**Dueña de la ejecución:** `TASK-1590`.

## Rules

1. **AXIS posee la especificación visual completa** — primitivo, semántico y **componente**. El producto
   sólo traduce. Un producto que elige una dimensión, un radio o un peso reintroduce el drift que el sistema
   existe para impedir.
2. **AXIS nunca publica apariencia implementada** — ni CSS de un motor, ni utilidades, ni un componente
   pintado, ni una API con tipos de motor. Sí publica comportamiento headless.
3. **La spec del contrato se expresa en tokens, nunca en literales.**
4. **Ningún producto redeclara un valor que AXIS posee.** Puede mapearlo a su motor; no reescribirlo.
5. **Un producto puede tener patterns propios** que AXIS no posee. La frontera son los cinco tests.
6. **La dirección del gate de drift se invierte** y se suma el diff cross-runtime como gate de promoción.
7. **Versionado por dos ejes:** la versión del paquete y la del contrato se mueven por razones distintas.
   Cambiar un valor es un cambio de paquete; cambiar la forma de un contrato es `version` mayor (reemplaza)
   o `id` nuevo (coexiste). Re-apuntar un `id` es substitución prohibida.
8. **Greenhouse conserva su theme MUI y sus tests de contraste.** Son su traducción y la evidencia de *su*
   render. Lo que entrega es la autoría de la especificación.

## Qué sube a AXIS y qué se queda local

**El criterio rector es el eje de cambio** (Parnas: modularizar por *razón de cambio*):

> ¿Cambia cuando cambia **el negocio**, o cuando cambia **el oficio de UI**?

### Los cinco tests

Un pattern sube sólo si pasa **los cinco**:

1. **¿Hay un segundo consumidor real?** No previsto: uno que lo necesita. Nunca se sube por anticipado.
2. **¿Es un pattern de oficio, no de dominio?** Un botón, un chip, un modal son oficio. Un `TalentProfile`
   es dominio.
3. **¿Ignora por completo el dominio?** Si conoce entidades, copy de negocio o capabilities, es del producto.
4. **¿Su especificación es expresable en tokens sin tipos de motor?** Si necesita `SxProps` para existir,
   hay que rediseñar la API antes de subirla.
5. **¿Su a11y y su comportamiento son no triviales?** Es el mejor predictor de duplicación cara.

### Exclusiones duras

- **NUNCA** sube algo que importe tipos, copy o entidades del dominio.
- **NUNCA** sube "porque quizás sirva". El registry decide `reuse | extend | new` sobre necesidad real.
- **NUNCA** sube pintado. Sube su **spec** + su **comportamiento**.

### Aplicado a los 71 primitives de Greenhouse

> **Corrección 2026-07-30:** la primera versión clasificaba `GreenhouseButton` y `GreenhouseChip` como
> *"sube el contrato, no el código"*, dando a entender que su apariencia era del producto. **Incorrecto**:
> su especificación visual es de AXIS. Lo que se queda es su traducción a MUI.

| Categoría | Ejemplos reales | Destino |
|---|---|---|
| Patterns de oficio | `GreenhouseButton` · `GreenhouseChip` · `GreenhouseAnchoredDisclosure` · `GreenhouseAsyncActionButton` · `FormSectionAccordion` · loaders · floating surfaces | **Spec + comportamiento a AXIS**; cada producto traduce |
| Shell y composición del producto | `AdaptiveSidecarLayout` · `ContextualSidecar` · `EntitySummaryDock` | **Local** |
| Conocen el dominio | `FieldsProgressChip` · `GreenhouseActivityTimeline` · las 8 superficies de Nexa · `talent-profile` | **Local** |
| Marca | `EfeonceOrbitalLogoMark` vs `GreenhouseBrandLogoMark` | **Se separan**: lo de Efeonce al sistema; lo de Greenhouse al producto (`src/config/efeonce-brand.ts`) |

Sigue siendo cierto que **una parte importante de los 71 se queda** — pero por conocer el dominio o ser
composición del shell, **no** por ser "apariencia del producto".

## Canonized patterns this extends

- **Token layering primitivo → semántico → componente** (`modern-ui` §3): la arquitectura que este ADR
  aplica y que la primera versión omitió.
- **Escala fija gobernada** (`design-system-governance` §3 y §11): la especificación ya existe; este ADR
  decide dónde vive.
- **SSOT + derivación + señal de drift** (TASK-571/699/766/774 · `axis-semantic-drift.test.ts`): se conserva,
  invirtiendo quién deriva y sumando el diff cross-runtime.
- **ADR-013 de Globe** (`routeId`: update = bump, add = id nuevo, re-apuntar prohibido): vocabulario de
  evolución de contratos ya existente.
- **Boundary Globe↔Greenhouse** (EPIC-028 · TASK-1492): control plane sin propiedad del código.

## Migration slices

Tres ejes. El 1 y el 2 son independientes; el 3 depende del 1.

### Eje 1 — el valor (primitivo + semántico)

1. **Color** — ✅ implementado en `TASK-1600` (AXIS `0.2.1`; diff visual intra-producto 0.00% desktop /
   0.01% mobile; los tests de contraste y drift pasan sin haber sido modificados).
2. **Tipografía** — ya tiene SoT propio + drift-guard (`TASK-1036`); se mueve con la misma forma.
3. **Elevación, geometría, motion.**

### Eje 2 — el comportamiento (headless)

0. **Inventario de los 71** contra los cinco tests.
1. **Un solo primitive de prueba** — candidato `GreenhouseAnchoredDisclosure`. Nace `candidate`.
2. **El segundo consumidor lo adopta** → `trial`. Acá se descubre si la API era portable de verdad.
3. El resto de los candidatos.

**Compuerta:** si un headless no logra servir a MUI y a Tailwind sin filtrar detalles de motor, el eje se
cierra en contratos y cada producto implementa.

### Eje 3 — la especificación de componente (lo que faltaba)

0. **Extender `DesignPatternContract`** con `spec` + `tones` en tokens.
1. **Construir el diff visual cross-runtime** en el Lab. Sin este gate, la capa de componente es una
   recomendación.
2. **Un pattern piloto extremo a extremo** — `efeonce.status` es el candidato natural: ya tiene dos adapters
   vivos (MUI en Greenhouse, Tailwind en Globe), así que el diff se puede correr el primer día y **medir
   cuánto divergen hoy**.
3. El resto, por lifecycle.

**El paso 2 es diagnóstico antes que corrección:** los dos adapters de `efeonce.status` se escribieron sin
spec compartida. Es esperable que difieran, y saber cuánto es el dato que dimensiona el eje entero.

## 4-Pillar Score

### Safety
- **Qué puede salir mal:** una spec equivocada se propaga a todos los productos, o —peor— la spec existe y
  un adapter la ignora, y nadie lo nota hasta que un cliente ve dos productos distintos.
- **Gates:** versión fija por consumidor (propagación *pull*, nunca *push*), CI + gate de contratos, gate de
  drift de tokens por consumidor, **diff visual cross-runtime como precondición de `stable`**, y diff visual
  por producto antes de retirar cualquier declaración local.
- **Blast radius:** el theme de un producto por vez — el fan-out ocurre cuando cada consumidor sube de
  versión. Antes, el blast radius de tocar Greenhouse ya era cross-producto y **nadie lo había declarado**.
- **Riesgo residual:** una spec puede ser ambigua sin ser incorrecta. El diff cross-runtime lo detecta, pero
  después de escrita. No hay forma de probar a priori que una spec es no-ambigua.

### Robustness
- **Idempotencia:** publicar es idempotente por versión; el registry rechaza republicar.
- **Atomicidad:** no aplica — sin escritura durable ni estado transaccional.
- **Cobertura de invariantes:** valor (gate de drift), forma del contrato (`isPromotable`, unicidad de `id`),
  coherencia tag↔versión, **equivalencia visual entre adapters** (nuevo), contraste (tests por producto).
- **Comportamiento compartido:** `axis-headless` necesita tests propios de foco, teclado y ARIA — su
  corrección ya no la cubre el test visual de ningún producto.
- **React como peerDependency, nunca dependency.**

### Resilience
- **Señal:** el gate de drift por consumidor + el diff cross-runtime (steady = dentro de umbral).
- **Rastro:** versiones publicadas inmutables y append-only.
- **Recuperación:** volver atrás es una línea del `package.json` del consumidor. Nunca mutar ni despublicar.
- **Degradación honesta:** un pattern cuyo diff cross-runtime falla **no se promueve**; se queda `candidate`
  con la divergencia declarada, en vez de fingir que el sistema es consistente.

### Scalability
- **Camino caliente:** resolución de paquetes en `install`, O(1) por build.
- **Consumidores:** escala por adición — un producto nuevo suma un adapter y su corrida de diff.
- **Costo real:** el cuello no es técnico sino **la escritura de specs**. Cada pattern que sube consume
  criterio de diseño escaso. Por eso los cinco tests son un filtro, no una guía.
- **Costo del diff cross-runtime:** crece con `patterns × productos`. Con 3 productos y 20 patterns son 60
  capturas por corrida — manejable, pero hay que medirlo antes de prometer cobertura total.
- **Portabilidad estratificada:** sólo `axis-headless` ata a React; las otras tres capas siguen agnósticas.

**Tradeoff declarado (Safety ↔ Scalability):** centralizar la especificación hace que un error se propague
más lejos, y a la vez es lo único que hace que N productos se vean como un sistema. Se resuelve con versión
fija: la propagación es *pull*, nunca *push*.

## Lo que NO cambia

- El gobierno documental sigue en Greenhouse: decisiones, runbook, `TASK-###`, lifecycle, evidencia.
- La distribución, autenticación y versionado decididos en `TASK-1589` V1.1.
- Los adapters siguen siendo nativos: MUI en Greenhouse, Tailwind en Globe. Ninguno importa el motor del otro.
- El Lab como superficie de catálogo (`TASK-1590`) — y ahora también como sede del diff cross-runtime.

## Hard rules

- **NUNCA** un producto decide una dimensión, un radio, un peso o un color de un pattern que AXIS posee.
  Traduce; no diseña.
- **NUNCA** AXIS publica CSS de un motor, utilidades, un componente pintado o una API con tipos de motor.
- **NUNCA** un literal en la `spec` de un contrato. Sólo tokens.
- **NUNCA** promover un pattern a `stable` con un solo adapter o con el diff cross-runtime en rojo.
- **NUNCA** resolver una diferencia de marca entre productos rompiendo la capa de componente: se resuelve en
  la semántica (multi-brand, `design-system-governance` §8, no implementado).
- **NUNCA** publicar un paquete fuera del pipeline gobernado (`AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1`).
- **SIEMPRE** que se agregue un rol o un pattern, declarar de qué valor deriva o clasificarlo como propio del
  producto. El gate de descubrimiento rompe si no.

## Open questions

- **Cuánto divergen hoy los dos adapters de `efeonce.status`.** Es medible el primer día del eje 3 y
  dimensiona el trabajo entero. Sin ese número, cualquier estimación es adivinanza.
- **El umbral del diff cross-runtime.** ¿0%, como el diff intra-producto de `TASK-1600`, o hay diferencias
  legítimas de motor (antialiasing, redondeo sub-pixel) que obligan a una tolerancia? Medir antes de fijar.
- **Multi-brand.** Si un producto necesitara acento propio, se resuelve en la capa semántica — pero
  `design-system-governance` §8 lo tiene como V1.5 no implementado. No introducirlo prematuramente.
- **`axisSemanticPalette`** ya tiene forma de MUI: se queda como traducción de Greenhouse (resuelto en
  `TASK-1600`), pero conviene confirmarlo al escribir la primera `spec`.
- **Si se adopta una base headless de terceros** (Radix, React Aria, Ark UI) en vez de escribirla.
- **Dónde viven los primitives de marca Efeonce** frente a los de producto.

## Revisit triggers

- Si un consumidor necesita un valor que AXIS no puede expresar sin conocer su motor → la frontera está mal
  trazada y hay que reabrir.
- Si aparece presión para publicar componentes pintados desde AXIS → reabrir explícitamente.
- Si el diff cross-runtime resulta impracticable (costo, ruido, falsos positivos) → el eje 3 necesita otro
  mecanismo de verificación, porque sin gate la capa de componente vuelve a ser una recomendación.
- Si un producto queda fijado a una versión vieja más de un ciclo → el fan-out *pull* no funciona.
