# AXIS Design System Ownership Decision V1

## Status

**`Accepted`** — aprobado por el operador el 2026-07-29. Nada implementado todavía.

Ejecución por ejes: el **eje 1 (el valor / color)** es `TASK-1600`. El **eje 2 (comportamiento /
`axis-headless`)** es una compuerta y necesita su propia task cuando el eje 1 esté verde.

Invierte parcialmente el § Delta 2026-07-29 (a) de
[`EFEONCE_SHARED_PRODUCT_UI_PLATFORM_DECISION_V1.md`](EFEONCE_SHARED_PRODUCT_UI_PLATFORM_DECISION_V1.md),
que declaró a Greenhouse dueño del valor de marca. Ese Delta sigue vigente en todo lo demás (gobierno del
proceso, distribución, versionado, gates); lo único que se invierte es **quién es autor del valor**.

## Context

AXIS es el design system de Efeonce. Sus consumidores son Greenhouse, Globe y —declarado en el ADR de
LaunchOps como marca de producto, todavía sin repo— **Wave**, más los que vengan.

Hoy el valor de marca (ramps 100→900, semántica, neutrales, secondary, charts) vive en
`src/@core/theme/axis-*.ts` **dentro de Greenhouse**, y el paquete `@efeoncepro/axis-tokens` publica un
subconjunto de 12 roles que replica esos valores. La réplica es manual.

Eso produce una asimetría estructural: **cambiar el azul de la marca Efeonce obliga a tocar un producto
para afectar a todos los productos.** Greenhouse no es un consumidor más — es el dueño disfrazado de par.

La brecha, medida: **Greenhouse tiene 71 primitives (115 exports)**, Globe 5, y AXIS **2 contratos**. El
design system real de Efeonce vive hoy dentro de un producto. Esto no es sólo una discusión de tokens —
los botones, modales y átomos de los que se habla cuando se dice "design system" están en
`src/components/greenhouse/primitives`.

Tres hechos medidos el 2026-07-29 que fuerzan la decisión:

1. **El drift ya había ocurrido.** `warning` y `danger` llevaban divergidos desde TASK-1053 sin que nada lo
   detectara. Era inerte sólo porque ningún consumidor lee todavía `efeonceTokens.color`.
2. **Los tokens de Greenhouse son datos puros.** `axis-tokens.ts` y `axis-chart.ts` no tienen ningún
   `import`; `axis-semantic`, `axis-neutrals` y `axis-secondary` sólo importan de `axis-tokens`. **Cero
   dependencias de MUI.** Son hexes, números y objetos planos: portables tal cual.
3. **Wave todavía no existe.** Con el SSOT donde está hoy, Wave nacería copiando valores del repo de otro
   producto — tres copias en vez de dos. El costo de invertir crece con cada consumidor que entra.

El razonamiento que llevó a la decisión anterior fue: *"AXIS no puede importar de Greenhouse, porque debe
ser instalable por Globe, que no tiene MUI → entonces Greenhouse es el dueño."* La premisa es correcta; la
conclusión no se sigue. La tercera opción —mover el dato a AXIS y que Greenhouse lo consuma— no se evaluó.

## Decision

**AXIS es dueño del QUÉ. Cada producto es dueño del CÓMO. La decisión es agnóstica al motor de estilos.**

| Capa | Dueño | Ejemplo |
|---|---|---|
| **Valor** | AXIS | `danger = #dc2e39` · `motion.fast = 150ms` · `spacing.4 = 1rem` |
| **Rol semántico** | AXIS | que exista `danger`, y qué significa |
| **Contrato de pattern** | AXIS | `efeonce.status` admite 5 estados; el color no puede ser el único portador de significado |
| **Comportamiento** | AXIS | focus trap, escape, roving tabindex, roles ARIA — sin una sola regla de estilo |
| **Materialización** | El producto | `bg-danger` (Tailwind) · `theme.palette.error.main` (MUI) · lo que use Wave |

**La línea exacta, porque es donde estos sistemas se degradan:** lo que rompe la portabilidad **no es
publicar un componente — es publicar apariencia**.

- `--efeonce-color-danger: #dc2e39` → **qué**. Un valor con nombre, transportable a cualquier motor.
- Un `<Dialog>` headless que gestiona foco, escape y ARIA sin emitir estilo → **qué**. Comportamiento, que
  es idéntico en MUI y en Tailwind porque no depende del motor.
- `.btn-danger { background: … }` o un `<Button>` que llega pintado → **cómo**. Ahí AXIS dejaría de ser
  portable para volverse un runtime compartido.

Es la distinción entre *qué debe hacer* y *cómo debe verse*. La primera se comparte; la segunda, nunca.

### Control plane ≠ propiedad del artefacto

Estas dos cosas son ortogonales y hoy están fusionadas por accidente histórico (AXIS nació dentro de
Greenhouse):

| | Quién | Cambia con este ADR |
|---|---|---|
| Gobierno del proceso — quién aprueba un cambio de token, `TASK-###`, lifecycle, evidencia, cierre documental | **Greenhouse** | **No** |
| Propiedad del artefacto — el valor, el rol, el contrato | **AXIS** | **Sí** |

El ecosistema ya resolvió esto una vez: **Greenhouse gobierna Globe y el código de Globe vive en
`efeonce-globe`.** Nadie propone mover el código de Globe adentro de Greenhouse porque Greenhouse lo
gobierne. Este ADR aplica la misma regla a AXIS en vez de inventar una segunda doctrina.

## Target topology

Tres capas, con portabilidad decreciente y deliberadamente separadas en paquetes distintos: un producto
que mañana no sea React sigue pudiendo consumir las dos primeras.

```
   AXIS  (efeoncepro/axis-design-system)

   ├── axis-tokens      TS puro   → cualquier motor, cualquier framework
   │                               objetos planos + custom properties CSS
   ├── axis-contracts   TS puro   → cualquier motor, cualquier framework
   │   axis-registry                anatomy · estados · a11y · lifecycle
   │
   └── axis-headless    React     → comportamiento + estados + teclado + ARIA
                        (peer)      CERO reglas de estilo · CERO tipos de motor
                          │
      ┌───────────────────┼───────────────────┬──────────────────┐
      ▼                   ▼                   ▼                  ▼
  Greenhouse            Globe               Wave            (siguiente)
  adapter MUI       adapter Tailwind      su motor           su motor
  theme.palette        bg-danger

  Gobierno del proceso (tasks · lifecycle · evidencia · runbook) → Greenhouse, para todos
```

`axis-headless` declara React como **peerDependency**, nunca como dependency: una copia duplicada de React
en el bundle de un consumidor rompe hooks y context en silencio.

## Rules

1. **AXIS puede publicar comportamiento. Nunca apariencia.** Ésta es la frontera, y la distinción importa:
   lo que rompe la portabilidad no es publicar un componente, es publicar **cómo se ve**.
   - **Prohibido:** CSS de componente, utilidades de un motor, cualquier componente que llegue pintado, o
     una API que exponga tipos de un motor (`SxProps`, `Theme` de MUI, `className` con utilidades de
     Tailwind).
   - **Permitido:** un componente *headless* —comportamiento, estados, teclado, focus, ARIA— que no emite
     **ni una sola regla de estilo** y deja al consumidor toda la pintura.
2. **Ningún producto redeclara un valor que AXIS posee.** Un producto puede *mapear* un rol a su motor; no
   puede volver a escribir el hex.
3. **Un producto puede tener tokens propios** que AXIS no posee (densidades de su shell, geometría de una
   superficie suya). La frontera: si otro producto lo necesitaría, es de AXIS.
4. **La dirección del gate de drift se invierte.** El mismo test que hoy verifica *"AXIS deriva de
   Greenhouse"* pasa a verificar *"el adapter del producto refleja AXIS"*. No se borra: cambia de sentido, y
   durante la migración es la red que sostiene el movimiento.
5. **Versionado por dos ejes, sin cambio:** la versión del paquete y la del contrato se mueven por razones
   distintas. Cambiar el valor de un rol es un cambio de paquete; cambiar la forma de un contrato es
   `version` mayor (reemplaza) o `id` nuevo (coexiste). Re-apuntar un `id` sigue siendo substitución
   prohibida.
6. **Greenhouse conserva su theme MUI, sus tests de contraste y su drift-guard interno.** Son su adapter y
   la evidencia de *su* render. Lo que entrega es la autoría del valor, no su capa de materialización.

## Qué sube a AXIS y qué se queda local

Ésta es la decisión que se toma docenas de veces y donde los design systems se rompen: subir de más produce
una biblioteca genérica que no le sirve bien a nadie; subir de menos produce N implementaciones divergentes
del mismo modal.

**El criterio rector es el eje de cambio** (Parnas: modularizar por *razón de cambio*, no por función):

> ¿Este componente cambia cuando cambia **el negocio**, o cuando cambia **el oficio de UI**?
>
> Negocio → se queda local. Oficio (a11y, interacción, lenguaje visual) → candidato a AXIS.

### Los cinco tests

Un primitive sube sólo si pasa **los cinco**:

1. **¿Hay un segundo consumidor REAL?** No uno previsto: uno que lo necesita hoy. Con un solo consumidor la
   reutilización es una hipótesis, no un hecho. Nunca se sube por anticipado.
2. **¿El valor está en el comportamiento, no en la pintura?** Un modal es 80% focus trap, escape, scroll
   lock y ARIA. Un banner decorativo es 95% pintura: no hay nada que compartir.
3. **¿Ignora por completo el dominio?** Si conoce entidades, copy de negocio, capabilities o tipos de
   Greenhouse, no es del sistema — es del producto.
4. **¿Su API es expresable sin tipos de motor?** Si la interfaz necesita `SxProps`, `Theme` o utilidades de
   Tailwind para existir, hay que rediseñarla antes de subirla. No se sube "y después vemos".
5. **¿Su a11y es no trivial?** Es el mejor predictor de duplicación cara: lo que se reimplementa mal dos
   veces son roles, foco y teclado, no colores.

### Exclusiones duras

- **NUNCA** sube algo que importe tipos, copy o entidades del dominio.
- **NUNCA** sube "porque quizás sirva después". El registry decide `reuse | extend | new` sobre necesidad
  real (`TASK-1592`).
- **NUNCA** sube pintado. Si sube, sube headless.

### Aplicado a los 71 primitives de Greenhouse

Clasificación indicativa, no exhaustiva — el inventario formal es un slice de la migración:

| Categoría | Ejemplos reales | Destino |
|---|---|---|
| Comportamiento no trivial, cero dominio | `GreenhouseAnchoredDisclosure` (anchoring, focus, escape) · `GreenhouseAsyncActionButton` (estado async, anti doble-submit) · `FormSectionAccordion` | **Candidatos fuertes** a `axis-headless` |
| Comportamiento trivial, valor en la pintura | `GreenhouseButton` · `GreenhouseChip` | Sube el **contrato**, no el código |
| Shell y layout del producto | `AdaptiveSidecarLayout` · `ContextualSidecar` · `EntitySummaryDock` | **Local.** Son la composición de Greenhouse |
| Conocen el dominio | `FieldsProgressChip` · `GreenhouseActivityTimeline` | **Local** |
| Marca | `EfeonceOrbitalLogoMark` vs `GreenhouseBrandLogoMark` | **Se separan**: lo de Efeonce es del sistema; lo de Greenhouse es del producto (ver `src/config/efeonce-brand.ts`) |

La lectura importante: **la mayoría de los 71 se queda donde está.** Este ADR no propone vaciar Greenhouse
— propone que lo que sí es del oficio deje de vivir dentro de un producto.

### Cómo sube

Por el lifecycle que el contrato ya define, nunca por copia directa:

`candidate` (un consumidor lo prueba) → `trial` (el segundo lo adopta y valida la API) → `stable`.

Subir un primitive es difícil de revertir: en cuanto un segundo producto lo adopta, cambiar su API cuesta N
migraciones. El lifecycle existe exactamente para eso — `candidate` es donde la API todavía es barata.

## Canonized patterns this extends

- **SSOT + derivación + señal de drift** (TASK-571/699/766/774 · `axis-semantic-drift.test.ts`): se conserva
  entero, invirtiendo quién deriva de quién.
- **ADR-013 de Globe** (`routeId`: update = bump en el mismo id · add = id nuevo · re-apuntar = prohibido):
  el vocabulario de evolución de contratos ya existe; no se inventa uno segundo.
- **Boundary Globe↔Greenhouse** (EPIC-028 · TASK-1492): control plane sin propiedad del código. Es el
  precedente exacto que este ADR replica.
- **Flag default-OFF + shadow + flip**: cada capa migra con doble lectura antes del corte.

## Migration slices

**Dos ejes independientes.** El eje del valor no bloquea al de comportamiento, y viceversa; se ordenan por
riesgo, no por dependencia.

### Eje 1 — el valor (tokens)

Por capas, **nunca big-bang**. Cada una entra cuando la anterior está verde en los dos consumidores.

1. **Color** — ramps, semántica, neutrales, secondary, charts. Es donde está el drift medido y el mayor
   blast radius si se deja. Greenhouse pasa a construir su theme desde el paquete.
2. **Tipografía** — ya tiene SoT propio + drift-guard en Greenhouse; se mueve con la misma forma.
3. **El resto** — elevación, geometría, motion.

En cada capa: publicar en AXIS → consumir en Greenhouse con el gate invertido → consumir en Globe →
retirar la declaración local. Con diff visual antes de retirar.

### Eje 2 — el comportamiento (headless)

0. **Inventario de los 71** contra los cinco tests. Sin esto, cualquier decisión de qué sube es intuición.
   Entregable: la lista clasificada, no código.
1. **Un solo primitive de prueba**, el más difícil que pase los cinco tests —probablemente
   `GreenhouseAnchoredDisclosure`, donde el focus, el escape y el anchoring son el 90% del valor. Nace
   `candidate`, lo adopta Greenhouse, se mide si Globe puede pintarlo con Tailwind sin pelearse con la API.
2. **El segundo consumidor lo adopta** → `trial`. Acá se descubre si la API era portable de verdad o sólo
   parecía. Si no lo era, se corrige mientras todavía es barato.
3. Recién entonces, el resto de los candidatos.

**El paso 1 es el que decide el eje entero.** Si un solo primitive headless no logra servir a MUI y a
Tailwind sin filtrar detalles de motor, `axis-headless` no debe existir y el eje 2 se cierra en contratos
(opción A). Es una compuerta explícita, no un supuesto.

## 4-Pillar Score

### Safety
- **Qué puede salir mal:** un valor de marca equivocado publicado desde AXIS se propaga a todos los
  productos a la vez, en vez de a uno.
- **Gates:** versión fija por consumidor (nadie recibe un cambio sin actualizar su lockfile), CI + gate de
  contratos + coherencia tag↔versión antes de publicar, gate de drift invertido en cada consumidor, diff
  visual antes de retirar cualquier declaración local.
- **Blast radius si sale mal:** el theme de un producto por vez — el fan-out sólo ocurre cuando cada
  consumidor decide subir de versión. Hoy, en cambio, el blast radius de tocar Greenhouse ya es
  cross-producto y **nadie lo declaró**.
- **Verificado por:** los gates de TASK-1589 V1.1, ya vivos.
- **Riesgo residual:** publicar deja de requerir tocar un producto, lo que baja la fricción de un cambio de
  marca. Se mitiga con revisión humana del release, no con más automatización.

### Robustness
- **Idempotencia:** publicar es idempotente por versión; el registry rechaza republicar.
- **Atomicidad:** no aplica — no hay escritura durable ni estado transaccional.
- **Protección de carrera:** ninguna capa migra sin que la anterior esté verde en ambos consumidores.
- **Cobertura de invariantes:** valor (gate de drift por consumidor), forma del contrato (`isPromotable` +
  unicidad de `id`), coherencia tag↔versión, contraste (tests propios de cada producto).
- **Comportamiento compartido:** `axis-headless` necesita **tests de comportamiento propios** —foco,
  teclado, ARIA, escape— porque su corrección ya no la cubre el test visual de ningún producto. Un bug de
  foco en AXIS se propaga a N productos y ninguno lo ve en su diff visual.
- **React como peerDependency, nunca dependency:** una copia duplicada de React en el bundle de un
  consumidor rompe hooks y context **en silencio**.
- **Verificado por:** cada gate ejercitado en verde y en rojo deliberado, como los de V1.1.

### Resilience
- **Reintentos:** no aplica; publicar es un acto humano por tag.
- **Trabajo atascado:** un tag que falla no publica nada parcial — los gates corren antes de los `publish`.
- **Señal:** el gate de drift de cada consumidor es la señal (steady = 0 divergencias).
- **Rastro:** versiones publicadas inmutables y append-only por naturaleza del registry.
- **Recuperación:** volver atrás es una línea del `package.json` del consumidor. Nunca mutar ni despublicar.

### Scalability
- **Camino caliente:** resolución de paquetes en `install`, O(1) por build.
- **Consumidores:** escala por adición — un producto nuevo suma un grant y un adapter. **Éste es el punto
  del ADR:** hoy sumar Wave significa copiar valores de Greenhouse; después significa instalar un paquete.
- **Costo a 10x:** lineal y despreciable.
- **Contención real:** no es técnica sino de proceso — un solo dueño del valor concentra las decisiones de
  marca. Es deseable: es lo que un design system *es*. El cuello verdadero es **la promoción de primitives**:
  cada uno que sube consume revisión humana escasa. Por eso los cinco tests son un filtro, no una guía.
- **Portabilidad estratificada:** `axis-headless` ata una capa a React, las otras dos siguen agnósticas. Un
  producto no-React consume tokens y contratos sin penalización.

**Tradeoff declarado (Safety ↔ Scalability):** centralizar el valor hace que un error se propague más
lejos, y a la vez es lo único que hace que N productos sean consistentes. Se resuelve con versión fija por
consumidor: la propagación es *pull*, nunca *push*.

## Lo que NO cambia

- El gobierno documental sigue en Greenhouse: decisiones, runbook de credenciales, `TASK-###`, lifecycle,
  evidencia de cierre. **La documentación gobernante no se muda a AXIS.**
- La distribución, autenticación y versionado decididos en TASK-1589 V1.1.
- Los adapters: MUI en Greenhouse, Tailwind en Globe. Ninguno importa el motor del otro.
- El Lab como superficie de catálogo (`TASK-1590`).

## Open questions

- **Qué pasa con `axisSemanticPalette`**, que ya tiene forma de MUI. ¿Se queda en Greenhouse como parte de
  su adapter (probable) o se descompone en valor portable + mapeo local?
- **Dark mode.** Greenhouse resuelve neutrales por modo. ¿AXIS publica ambos modos como valores, o publica
  roles y cada producto resuelve su modo?
- **Quién firma un cambio de valor de marca** una vez que deja de ser un PR de Greenhouse.
- **Si el Lab debe consumir lo publicado** en vez de los `workspace:*` links, para validar el tarball y no
  sólo el código fuente.
- **Wave**: qué motor usará. No condiciona este ADR —ése es el punto— pero define cuántos adapters habrá.
- **Si `axis-headless` debe existir.** Es una compuerta, no un supuesto: la decide el paso 1 del eje 2. Si un
  primitive headless no logra servir a MUI y a Tailwind sin filtrar detalles de motor, el eje se cierra en
  contratos y cada producto implementa.
- **Si se adopta una base headless de terceros** (Radix, React Aria, Ark UI) en vez de escribir la propia.
  Comprar comportamiento probado y accesible es casi siempre mejor que escribirlo — pero ata a AXIS a una
  dependencia externa y a su ritmo de releases. No se decide acá.
- **Dónde viven los primitives de marca Efeonce** (`EfeonceOrbitalLogoMark`) frente a los de producto
  (`GreenhouseBrandLogoMark`), dado que `src/config/efeonce-brand.ts` ya es SSOT de esa separación.

## Revisit triggers

- Si un consumidor necesita un valor que AXIS no puede expresar sin conocer su motor → la frontera QUÉ/CÓMO
  está mal trazada y hay que reabrir.
- Si aparece presión para publicar componentes desde AXIS → reabrir explícitamente; sería convertirlo en un
  runtime compartido, que este ADR prohíbe.
- Si un producto queda fijado a una versión vieja por más de un ciclo → el fan-out *pull* no está
  funcionando y hay que revisar el costo de actualizar.
