# Inventario de supervivencia del port — contratos cross-repo del Producer

> **Tipo:** inventario operativo · **Version:** 1.1 · **Creado:** 2026-07-25 por Claude
> **Task:** `TASK-1560` Slice 1 (ADR-014) · **Consumidores:** `TASK-1552`, `TASK-1559`, `TASK-1524`
> **Verificado contra:** `efeonce-globe` `6e8ef5a` (`main`) y `greenhouse-eo` `develop`

## Por qué existe

El Producer de Globe emite atributos en su DOM que **un escenario GVC de Greenhouse consume como
selectores**. Es un contrato entre dos repos, y no está declarado en ningún lado: vive implícito en
que los strings coincidan.

Eso lo vuelve la clase de fallo más fea de toda la migración de ADR-014. Un port puede reescribir el
markup, dejar **Globe entero en verde** —`pnpm check`, `pnpm build`, los ocho gates— y romper un
escenario del otro repo sin que nada avise, porque el consumidor no está en el repo que cambió.

Este inventario existe para que `TASK-1552`, `TASK-1559` y `TASK-1524` hereden una lista de
verificación en vez de redescubrir el problema cada una — o no descubrirlo.

## Dos clases de contrato, no una

| Clase | Forma | Para qué |
|---|---|---|
| **Markers de captura** | `data-capture="producer-*"` | Regiones que el GVC recorta, espera o asserta |
| **Atributos de estado** | `data-producer-*="valor"` | Estados que el GVC asserta (listo, gated, bloqueado…) |

La segunda clase es fácil de olvidar porque no se llama "capture". Se rompe igual.

## Lo que hace peligroso al port: markup vs runtime

Los markers no viven todos en el mismo lugar:

- **36** aparecen en el markup (`producer-ui.ts`) — visibles al leer el HTML.
- **26** los asigna el controlador **en runtime** (`producer-controller.ts`), vía
  `element.dataset.capture = '…'` o concatenación de strings.

**Los del segundo grupo son los que se pierden en silencio.** Un port a JSX que lea el markup como
referencia no los ve, porque no están ahí.

## Los 9 markers que Greenhouse usa como selector

De los 62 que emite Globe, éstos son los que **algo en Greenhouse rompe si desaparecen**:

| Marker | Dónde se asigna | Riesgo en el port |
|---|---|---|
| `producer-console` | markup | bajo |
| `producer-composer` | markup | bajo |
| `producer-feed` | markup | bajo |
| `producer-route` | markup | bajo |
| `producer-prompt-bar` | markup | bajo |
| `producer-budget` | markup | bajo |
| `producer-estimate` | markup | bajo |
| **`producer-model-picker`** | **runtime únicamente** | 🔴 **pérdida silenciosa** |
| **`producer-model-trigger`** | **runtime únicamente** | 🔴 **pérdida silenciosa** |

Los dos rojos son del selector de modelo (`TASK-1555`) y los consume
`scripts/frontend/scenarios/task-1555-model-selector.scenario.ts`, que los usa como **readiness**, como
**assertion de visibilidad**, como `startSelector` de scroll, como target de `click` y de `press Enter`,
y los declara en `expectedDataCaptureRegions`. Si el port no los reemite, ese escenario no falla en
una assertion: **falla en readiness**, que se lee como "la página no cargó" y manda a investigar el
lugar equivocado.

## 🔴 Hallazgo: dos atributos que Greenhouse asserta NO EXISTEN en Globe

`scripts/frontend/scenarios/globe-creative-producer.scenario.ts` apunta a `route: '/producer'` —la ruta
real, no un fixture— y declara en su `readiness.selectors`:

```
'[data-capture="producer-feed"][data-producer-feed-status="ready"]'
'[data-producer-candidate-kind="hero"]'
```

**Ninguno de los dos existe en Globe.** Búsqueda exhaustiva sobre todo el repo (excluyendo
`node_modules` y `dist`), en kebab-case y en camelCase de `dataset`: **cero ocurrencias**.

`data-producer-candidate-kind` además se usa en dos assertions más, una de ellas como base de un
click: `[data-producer-candidate-kind="hero"] button[aria-label="Ver candidato"]`.

**Causa raíz, ya investigada → [`ISSUE-125`](../../issues/open/ISSUE-125-gvc-evidence-against-uncommitted-globe-dom.md):**

La captura que produjo la evidencia registra **`env: local`** y sus assertions en **`passed`**, incluida
la del atributo inexistente. El gate **no** está roto —se verificó: `runReadiness` sí incluye el array
`selectors`, `visible` falla cuando no está visible, y `isVisible` devuelve `false` ante un timeout— así
que la única explicación consistente es que **el árbol local de Globe emitía esos atributos el
2026-07-22 y ese código nunca se commiteó**.

La evidencia es real; **el DOM que la produjo no está en ninguna parte.** Es la clase de bug que este
repo ya documentó al revés (`TASK-943`: código commiteado que depende de un archivo sin commitear) —
acá lo que depende de trabajo huérfano es la **evidencia**.

**Lo que esto significa para el port:** el contrato cross-repo **nunca se implementó**. Si alguien corre
ese escenario después del port y falla, la conclusión natural —"lo rompió el port"— sería **falsa**, y
se perdería tiempo buscando una regresión que no existe. La baseline de
`globe.creative-producer-surface` tampoco sirve como referencia de before/after: documenta un estado
irreproducible, no un estado bueno anterior.

**Acción:** resolver `ISSUE-125` antes de portar el composer o el feed. Hay dos posibilidades opuestas
—el escenario se adelantó al código, o Globe debía emitirlos y el trabajo quedó huérfano— y **no se
puede elegir sin revisar el diseño del Producer**. Si `candidate-kind` es una distinción real del modelo
(una pieza "hero" vs. otras), falta código en Globe. Si era vocabulario de wireframe, hay que corregir
el escenario. Asumir cualquiera de las dos sin comprobar es lo único que no vale.

**Regla que se sigue:** **NUNCA** producir evidencia GVC canónica de una superficie de otro repo contra
`env: local`. El árbol local puede tener trabajo sin commitear, y **la evidencia sobrevive al trabajo**:
queda un dossier que describe algo que nadie puede reproducir.

## Los 10 atributos de estado que Greenhouse asserta

| Atributo | markup | runtime | Nota |
|---|---|---|---|
| `data-producer-action` | 8 | 3 | |
| `data-producer-intent` | 6 | 6 | |
| `data-producer-seed-lock` | 5 | 1 | |
| `data-producer-model-needs-mode` | 3 | 0 | |
| `data-producer-credit-free` | 2 | 1 | |
| `data-producer-model-state` | 2 | 0 | |
| `data-producer-advanced` | 1 | 2 | |
| `data-producer-fleet-state` | 1 | 0 | |
| **`data-producer-candidate-kind`** | **0** | **0** | 🔴 no existe |
| **`data-producer-feed-status`** | **0** | **0** | 🔴 no existe |

## Cómo usar esto al portar

1. **Antes de empezar**: correr el escenario GVC de Greenhouse contra el Producer actual y guardar el
   resultado. Sin línea base, cualquier rojo posterior es ambiguo.
2. **Al portar**: reemitir los 9 markers de la tabla y los 8 atributos de estado que sí existen.
   Prestar atención especial a los dos rojos de la tabla de markers — **no están en el markup**, así
   que copiar el markup no alcanza.
3. **Al cerrar**: correr el escenario de Greenhouse, no sólo los gates de Globe. Globe verde no prueba
   nada sobre este contrato.
4. **Idealmente**: que el port declare estos markers en un módulo único y tipado en vez de repartirlos,
   para que el próximo port los encuentre leyendo un archivo en vez de un inventario.

## Regla que se sigue de todo esto

**NUNCA** asumir que los gates del repo que cambiás cubren a sus consumidores. Cuando un contrato cruza
repos, el gate del productor es ciego por construcción, y la única cobertura real es correr el gate del
consumidor.
