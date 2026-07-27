# ADR-016 — Motor de estilos del payload cliente de Globe: Tailwind v4 sobre el SSOT de tokens

> **Tipo:** Architecture Decision Record
> **Estado:** `Accepted` — aceptado por el operador el 2026-07-27
> **Creado:** 2026-07-27
> **Dueño de implementación:** `TASK-1485` (Globe Design System Governance and Pattern Registry)
> **Supersede parcialmente:** [ADR-014](./EFEONCE_GLOBE_CLIENT_APPLICATION_DECISION_V1.md) — sólo en la
> elección de motor de estilos; el resto de ADR-014 (Vite + React + shell propio + CSP por nonce) sigue vigente
> **Relacionados:** `TASK-1552`, `TASK-1556`, `TASK-1560`, `TASK-1561`

---

## Contexto

El payload cliente (ADR-014) nació con **CSS global plano** más un SSOT de 98 tokens y tres gates de diseño.
La decisión fue correcta para arrancar: sin dependencias, sin runtime, compatible con la CSP por nonce.

Pero la migración del Producer expuso el límite del modelo, y no como opinión sino como incidentes medidos
durante la sesión del 2026-07-27:

| # | Colisión observada | Naturaleza |
|---|---|---|
| 1 | `.prompt-actions` está en `position:absolute` en la hoja legacy; al recomponerla los botones flotaron sobre el feed | legacy pisa lo nuevo |
| 2 | `.icon-pill` es circular de tamaño fijo; con label recorta el texto | legacy pisa lo nuevo |
| 3 | `.control-title`, `.number-shape-field`, `.helper`, `.availability` ganaron por especificidad | legacy pisa lo nuevo |
| 4 | `.estimate-rail > div` tiene **cuatro** reglas, dos con `!important` forzando `display:grid` | legacy pisa lo nuevo |
| 5 | Renombrar a `pc-*` para escapar de lo anterior **desconectó el glow del prompt** | lo nuevo se corta de lo que quería heredar |
| 6 | `producer-composer.css` no existía como tal: 66 de 84 clases vivían en la hoja legacy | dependencia invisible |

**El patrón es uno solo: CSS global sin scope, con dos hojas conviviendo.** Ninguna de las seis es un error de
criterio; todas son consecuencia estructural de que cada clase compite en un único espacio de nombres.

Además, el estado del arte se movió. A julio 2026, Tailwind es el motor dominante del ecosistema React
—shadcn/ui, la mayoría de las librerías de componentes, los generadores con IA— y **v4 resolvió la objeción
que lo descartaba acá**: su theming es CSS-first y single-source-of-truth, así que puede consumir un SSOT
existente en vez de competir con él.

## Decisión

**Adoptar Tailwind v4 como motor de estilos del payload cliente (`apps/studio-client`), con el SSOT de tokens
existente como su theme.**

Cinco condiciones que hacen que esto no sea "sumar una herramienta más":

1. **El SSOT manda.** `src/tokens/tokens.ts` no se duplica ni se reemplaza: se expone como theme de Tailwind.
   Un token nuevo se declara **una vez**, ahí.
2. **Los tres gates se reescriben, no se retiran.** Hoy detectan literales en CSS; con Tailwind el literal vive
   en `className="text-[#4db8ff]"`. Un gate que deja de morder al cambiar de motor **no era un gate, era un
   accidente de ubicación**.
3. **Migración por superficie, nunca big-bang.** El orden lo fija el retiro del legacy, no la comodidad.
4. **Cero reescritura sin referencia de diff.** Reescribir reglas es lo que produjo la regresión del feed —
   está documentado en el propio código. Toda superficie migrada se compara contra su render anterior.
5. **La CSP por nonce y el shell no cambian.** Tailwind compila a CSS estático en build; no agrega runtime.

## Alternativas consideradas

### A · Seguir con CSS global plano — rechazada
Es el estado que produjo las seis colisiones. Mantenerlo garantiza repetirlas en cada superficie nueva, y el
backlog tiene 19 tasks apuntando al composer.

### B · CSS Modules — rechazada como destino, válida como paso intermedio
Resuelve el scope (que es el 90% del dolor) sin cambiar de paradigma ni tocar los gates. Pero **no aporta
sistema de diseño**: los tokens se siguen cableando a mano. Si el destino es Tailwind, pasar por CSS Modules
es reescribir dos veces.

### C · Zero-runtime tipado (StyleX / Vanilla Extract / Panda) — rechazada por ahora
Más control y tipado que Tailwind, y compatible con RSC. Pero ecosistema mucho menor, y el equipo no tiene
masa crítica en ninguna. La ventaja no compensa el costo de adopción.

### D · Tailwind v4 — **seleccionada**
Resuelve scope y sistema de diseño a la vez, es el estándar del ecosistema, y su theming CSS-first convive con
el SSOT en vez de competir.

## Consecuencias

**Aceptadas**
- Reescribir los tres gates de diseño es **precondición**, no follow-up. Sin eso el payload queda sin control.
- El riesgo de regresión visual es real y se mitiga con diff contra el render anterior, no con confianza.
- Las superficies ya migradas a CSS propio (feed 29 KB, viewer, share) conviven hasta que les toque su turno.
  **La convivencia es temporal y con dueño**, que es la diferencia con la deuda actual.

**Lo que esto destraba**
- **El Slice 0 de `TASK-1552` se retira.** Existía para que el composer dejara de depender de `producerStyles`;
  una superficie reescrita en Tailwind tampoco depende. Mover 272 reglas que se van a tirar es trabajo
  desechable.
- **`TASK-1560`** (retiro del legacy) se destraba por el mismo camino.

**Lo que NO cambia**
- ADR-014 sigue vigente en todo lo demás: Vite, React 19, React Router, shell propio, CSP por nonce, CDN.
- El contrato de motion (3 capas) y su regla de `prefers-reduced-motion`.
- La prohibición de importar primitives de Greenhouse, MUI o AXIS dentro de `apps/studio-client`.

## Invariantes que nacen con esta decisión

- **NUNCA** declarar un valor de diseño en `className` (`text-[#4db8ff]`, `p-[13px]`). Todo valor sale del theme,
  que sale del SSOT. Es la misma regla de siempre, en otra sintaxis — y el gate reescrito debe morderla.
- **NUNCA** migrar una superficie sin su referencia de diff visual previa.
- **NUNCA** dejar dos motores activos en la misma superficie: una superficie está en CSS o está en Tailwind.
- **SIEMPRE** que se agregue un token, se agrega en `tokens.ts` y se expone al theme — nunca al revés.

## Estado y siguiente paso

**`Accepted` (2026-07-27).** La implementación es un slice de **`TASK-1485`** — no una task nueva: el barrido
por dominio confirma que esa task ya es dueña de tokens, patterns, components, motion y runtime del Design
System de Globe.

**Orden de ejecución acordado:**

| # | Paso | Estado |
|---|---|---|
| 1 | Limpiar la rama `task/TASK-1552-slice0-internalizar-css`: revertir el CSS copiado, `app.ts` y las exclusiones de los gates (van juntos por acoplamiento); conservar `data-capture`, el estimado `stale` y los canaries | ✅ `804b7d7` |
| 2 | Preservar la copia verbatim de 151 KB como **baseline de diff**, fuera del código | ✅ commit `5edd2a3` + capturas |
| 3 | Instalar Tailwind v4 en `apps/studio-client` con `tokens.ts` como theme | ✅ `804b7d7` |
| 4 | **Reescribir los tres gates** — precondición, no follow-up | ✅ `804b7d7` + `91432ed` |
| 5 | Migrar por superficie con diff visual: composer → feed → viewer → share | ⛔ **no empezado** — el composer sigue bloqueado por `TASK-1555` |

La referencia de valores para la migración es
[`GLOBE_PRODUCER_COMPOSER_STYLE_REFERENCE_V1.md`](../../ui/GLOBE_PRODUCER_COMPOSER_STYLE_REFERENCE_V1.md).

---

## Delta 2026-07-27 — implementación de los pasos 1-4, y lo que la implementación corrigió del ADR

> ⚠️ **Estado honesto: el MOTOR está listo; ninguna SUPERFICIE está migrada.** El composer sigue
> renderizando con `producerStyles` inyectada por `app.ts:2252`, exactamente como antes. Cero utilidades de
> Tailwind en `ProducerComposer.tsx`. Las únicas seis que existen en el CSS compilado son la sonda del seam.

### 🔴 El idiom de alias de la documentación NO funciona acá — medido, no supuesto

El ADR dice que el theming CSS-first de v4 «puede consumir un SSOT existente». Es cierto, **pero no por el
camino que la documentación de Tailwind muestra.** El idiom canónico es `@theme inline` con alias:

```css
@theme inline { --color-background: var(--background); }
```

Funciona cuando los nombres **difieren**. En Globe casi todos **coinciden**, porque el SSOT ya estaba escrito
con los namespaces de Tailwind (`--text-xs`, `--radius-sm`, `--ease-enter`, `--font-display`). Un alias con el
mismo nombre a ambos lados es una **referencia circular**: Tailwind emite `:root{--text-xs:var(--text-xs)}` en
la hoja del bundle, que llega **después** del `:root` del shell y lo pisa, dejando la propiedad en el valor
inválido garantizado.

Medido en browser con `getComputedStyle`:

| Utilidad | Computado | Debía ser |
|---|---|---|
| `text-xs` | **16px** | 12px |
| `rounded-sm` | **0px** | `.58rem` |
| `font-display` | **Times** | Poppins |
| `bg-canvas` | ✅ correcto | — (porque `--color-canvas` ≠ `--canvas`) |

**El build estaba verde y las utilidades presentes en el CSS compilado.** Es la clase de falla que se ve
«instalada y funcionando», y ningún escaneo estático puede verla: el CSS emitido es sintácticamente impecable.

**Corrección adoptada:** el `@theme` se **genera** desde el SSOT con **valores**
(`src/styles/theme-from-tokens.ts` → `globe-theme.generated.css`, vía `pnpm theme:generate`). La clasificación
es por **regla, no por lista**, para que un token nuevo aparezca como utilidad sin editar el generador.

**La consecuencia que se acepta y hay que saber:** los valores quedan en dos lugares del CSS servido (el
`:root` del shell y el `@theme` del bundle). No pueden derivar —los genera la misma fuente y un gate lo
afirma carácter por carácter— pero **este payload no soporta re-tematizado en runtime**. Globe tiene un solo
tema y ninguna superficie lo cambia, así que el costo hoy es cero. Si algún día se quiere, la salida **no** es
volver a `var()`: es que el shell deje de emitir su `:root` y Tailwind sea el único que lo emita.

### Dos decisiones de integración que el ADR no anticipaba

1. **Preflight queda FUERA.** El reset de Tailwind es global, y el payload ya tiene el suyo documentado.
   Adoptarlo cambiaría de golpe feed, viewer y share —que conviven en CSS propio hasta su turno— y eso es el
   big-bang que el punto 3 del ADR prohíbe. Se adopta cuando migre la última superficie, con dueño y diff.
2. **`base.css` pasa a `@layer base`.** El CSS **sin capa le gana siempre** al CSS en capa: con el reset fuera
   de capa, `button { font: inherit }` derrotaría a cualquier utilidad de Tailwind sobre ese botón, sin
   ninguna regla equivocada a la vista. El bloque de `prefers-reduced-motion` queda **fuera** de capa a
   propósito: las `!important` invierten el orden de capas, y ése es el piso que debe ser inderrotable.

### Los gates: cómo quedaron, y por qué son cuatro

La condición 2 del ADR se cumple con una regla común a los tres: **el único valor arbitrario permitido es una
REFERENCIA a token.** `duration-(--duration-short)` referencia; `duration-[220ms]` declara.

Se agrega un **cuarto** que el ADR no listaba: **espaciado y medidas** (`p-[13px]`, `gap-[1.875rem]`). Tailwind
lo hace fácil y el CSS plano no lo tenía a mano. Importa acá y ahora: el ritmo medido del composer es 30 px y
13,6 px, y **ninguno cae en la escala de 4 px**. Sin este gate la migración escribe `gap-[1.875rem]` y sigue;
con él, la decisión —ajustar a la escala o subir el ritmo al SSOT— se toma en voz alta.

**La otra mitad de la defensa no es un escaneo:** el theme generado **vacía los namespaces**
(`--color-*: initial`), así que `text-red-500` y `text-lg` **no existen**. Un escaneo atrapa el literal
explícito; vaciar el namespace cierra la escala ajena, que es la que nadie habría mirado — `text-red-500` no
parece un literal.

Verificado que los cuatro **muerden** con violaciones deliberadas, y que la línea correcta no genera hallazgos.

**`tailwind-engine-canary.mjs`** lee valores computados sobre el seam smoke: prueba que el motor está cableado
y que la escala ajena no tiene efecto. Corre **antes** de que migre la primera superficie — descubrirlo durante
una migración habría hecho indistinguible «el motor está mal» de «la migración está mal».

### 🔴 El gate de literales los estaba EMITIENDO

Tailwind lee los `.ts` como texto plano y **no ignora comentarios**, así que los ejemplos con los que
`design-contract.test.ts` documenta lo que prohíbe se compilaban como clases reales y viajaban en la hoja
servida. Inofensivo en peso, grave en señal. Cerrado con `@source not` sobre los tests (`91432ed`).

**Regla que se desprende:** en Tailwind, **documentar un anti-patrón dentro del árbol escaneado lo materializa**.

### Dos hallazgos de runtime del composer (no del motor)

Aparecieron al mirar el render, no al leer la salida de los tests:

1. **El canary del composer servía la superficie SIN la hoja del legacy** y daba **todo verde**: contención,
   `scrollWidth` y recuento de iconos dan igual con o sin CSS. Corregido — ahora inyecta `producerStyles`
   igual que `app.ts:2252`. Las capturas anteriores no eran baseline de nada.
2. **`.advanced-controls > summary` tiene `display:none`** en la hoja del legacy. El `<details open>` **no
   tiene control para cerrarse**, ni con puntero ni con teclado. La task lo describía como «abierto por
   defecto»; la medición dice algo más fuerte: **la progressive disclosure no existe, el markup es
   decorativo.** Refuerza el retiro del patrón en Slice 2. El canary lo reporta como `KNOWN` en cada corrida,
   nunca como skip silencioso.
