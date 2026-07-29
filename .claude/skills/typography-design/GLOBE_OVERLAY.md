---
name: typography-design-globe-overlay
description: Pins tipográficos de Efeonce Globe (repo hermano `efeonce-globe`, payload `apps/studio-client`) que ANULAN tanto los defaults del skill global `typography-design` como el overlay de Greenhouse. Cargar en lugar del overlay de Greenhouse cuando el trabajo toca Globe. Fija las dos familias y los TRES cortes realmente cargados, la escala de nueve pasos con el contrato escrito de cada token, la trampa de faux bold Geist@700 (incluido el techo de 600 del `<strong>`, una vez neutralizado el `bolder` del UA), las utilidades de peso muertas, los ratios de contraste medidos y sus scrims, el formato de números con presupuesto de caracteres, y la frontera real de los gates.
type: overlay
overrides: typography-design, typography-design-greenhouse-overlay
applies-to: efeonce-globe/apps/studio-client
---

# Typography Design — Overlay de Efeonce Globe

Este archivo **anula** el skill global `typography-design` **y también el overlay de Greenhouse** cuando el trabajo ocurre en el repo hermano `efeonce-globe`. En cualquier conflicto, **manda este archivo**.

**Orden de carga:** `typography-design/SKILL.md` global (el oficio + las referencias) → **este overlay** → aplicar. Si además tocas producto de Globe, carga `greenhouse-globe` (la skill de dominio).

## 🔴 Por qué NO sirve el overlay de Greenhouse

Globe **no es un módulo de Greenhouse**. Por ADR-014, `apps/studio-client` **materializa sus propios tokens y sus propios componentes**, y tiene prohibido importar primitives de Greenhouse, `CompositionShell` o MUI. Todo lo que el overlay de Greenhouse pinea —`typography-tokens.ts`, el bridge de variantes MUI, `mergedTheme.ts`, `<Typography variant>`, `monoId`/`monoAmount`/`kpiValue`, el drift-guard de 3 superficies, los pesos 400/600/700/**800**— **no existe acá**.

Aplicar el overlay de Greenhouse a Globe produce dos errores concretos y caros: pedir el peso **800** (que en Globe no tiene archivo y el navegador sintetiza) y emitir una variante MUI (que en Globe no compila). Son dos sistemas tipográficos hermanos, con la misma marca y distinta implementación.

Lo que **sí** comparten, y no se re-litiga: dos familias, Poppins display + Geist texto.

## Fuentes de verdad (leer en este orden)

| Superficie | Archivo | Autoridad |
|---|---|---|
| **SSOT de tokens** | `apps/studio-client/src/tokens/tokens.ts` | Los valores. Cada paso trae su docblock con la razón medida — **el docblock es normativo, no comentario**. |
| **Manifiesto de fuentes** | `GLOBE_FONT_FACES` (en el mismo `tokens.ts`) | Los cortes que **existen como archivo**. Es la autoridad sobre qué peso puedes pedir. |
| **Theme Tailwind** | `apps/studio-client/src/styles/globe-theme.generated.css` | **GENERADO** con `pnpm theme:generate`. Nunca se edita a mano. |
| **Capa base** | `apps/studio-client/src/styles/tailwind.css` | `html` fija familia/leading; las clases de título (`.pf__title`, `.share-rail__title`, `.share-brand__wordmark`) declaran su peso. |
| **Gates** | `apps/studio-client/src/gates/design-contract.test.ts` | Prohíbe literales de color, motion y tipografía. **Su frontera está declarada dentro del archivo** — ver §Gates. |
| **Formato de números** | `apps/studio-client/src/format/credits.ts` (+ `date.ts`) | La forma en que un número se convierte en texto. Locale anclado al producto, umbral de abreviación **medido** contra el slot. |
| **Contrato de motion** | `docs/architecture/creative-studio/GLOBE_CLIENT_MOTION_CONTRACT_V1.md` (en Greenhouse) | Dueña: `TASK-1523`. |
| **Compat de legacy** | `LEGACY_TOKEN_DRIFT` (en `tokens.ts`) | Divergencias registradas que **NO se unifican por decreto**. |

`base.css` **no emite CSS**: es un puente de compatibilidad. No agregues reglas ahí.

## Las dos familias y los TRES cortes cargados

```
Poppins 700  → /assets/fonts/poppins-bold.ttf     (display: títulos, y nada más)
Geist   400  → /assets/fonts/geist-regular.ttf    (texto por defecto de todo el payload)
Geist   600  → /assets/fonts/geist-semibold.ttf   (énfasis, rótulos de control, títulos de bloque)
```

**Tres archivos. Eso es todo lo que existe.** `html` fija `font-family: var(--font-body)` (Geist) sin declarar peso ⇒ el heredado es **400**. Un elemento solo es Poppins si lleva la utilidad `font-display` o hereda una regla con `font-family: var(--font-display)`.

Tokens de peso: `--weight-regular: 400` · `--weight-semibold: 600` · `--weight-display: 700`. **No hay 500 ni 800 porque no hay archivo 500 ni 800.**

### 🔴 La trampa que define este overlay: `font-bold` sobre Geist es faux bold

**Geist NO tiene corte 700.** `font-bold` pide 700. Sobre un elemento Geist —o sea, sobre el 95% del payload— el navegador **sintetiza** el peso desde 600: engrosa el trazo por algoritmo y las letras salen embarradas. **Renderiza, shippea y no falla ningún gate.**

| Combinación | Resuelve a | Veredicto |
|---|---|---|
| `font-display font-bold` | Poppins 700 | ✅ corte real |
| `font-bold` (solo) | **Geist 700** | ❌ **FAUX — sintetizado** |
| `font-semibold` | Geist 600 | ✅ corte real |
| `font-display` (sin peso) | Poppins, peso heredado 400 | ⚠️ correcto **por accidente** (ver abajo) |

**El caso asimétrico, que hay que entender para no "arreglar" lo que no está roto:** la síntesis de CSS solo va hacia **más pesado**, nunca hacia más liviano. Pedir 400 en una familia que solo trae 700 **no sintetiza**: el algoritmo de font-matching selecciona el 700 existente. Por eso `font-display` sin peso se ve bien hoy. Pero el peso sale del **fallback**, no de una declaración, así que se declara igual — y por eso las tres clases de título en `tailwind.css` sí escriben `font-weight: var(--weight-display)`.

**Caso fuente (2026-07-29):** trece sitios en producción pedían Geist@700, incluidos los **tres KPI de crédito** del header, el rótulo del stepper del composer y cinco reglas `.pf__*` en `tailwind.css`. **La mayoría estaba en la hoja, no en JSX** — buscar sólo en `.tsx` habría cerrado el caso con la mitad adentro. El gate tenía un test dedicado a pesos sintetizados y **no los vio**, porque colapsaba las tres caras en un `Set` de pesos `{400,600,700}` — era **ciego a la familia**: `--weight-display: 700` pasaba porque *Poppins* lo tiene, y Tailwind lo exponía después como `font-bold` aplicable a cualquier elemento. El defecto vivía en la frontera token↔uso, que es donde ningún gate miraba. Lección que sobrevive al caso: **un test dedicado puede no cubrir lo que su nombre promete** — antes de confiar en un aserto, lee **qué aparea**.

**Ya está cerrado con gate propio:** `never asks a family for a cut it does not load` resuelve la familia **en el sitio de uso** y la aparea contra `GLOBE_FONT_FACES` agrupado por familia, mapeando cada `--weight-*` con **`themeKeyFor`** — la misma función que genera el theme, y por eso el aserto honra el alias `--weight-display → font-bold` en vez de suponer que el nombre del token es el nombre de la utilidad. Si mañana se agrega `geist-bold.ttf` al manifiesto, el aserto deja de quejarse **solo por eso** — el manifiesto es la autoridad, no una lista escrita a mano.

### 🔴 Utilidades de peso: solo existen las que el theme puede generar

El theme hace `--font-weight-*: initial` y después define solo `regular`/`semibold`/`bold`. Verificado contra el CSS compilado, el build emite **cuatro** utilidades y ni una más: `.font-bold` · `.font-semibold` · `.font-regular` · `.font-display`.

**`font-normal` y `font-medium` (los defaults de Tailwind) NO emiten ni un byte.** Son peores que un error, porque son silenciosas: el autor cree que declaró un peso, no se declara nada, el elemento hereda 400 — y a veces eso coincide con lo que quería, que es exactamente cómo sobreviven sin que nadie las note. El peso 400 explícito en Globe se escribe **`font-regular`**.

Cerrado por el aserto `never writes a font utility the theme cannot generate`, que deriva las válidas del theme y no de una lista.

**Propiedad defensiva que conviene conocer:** vaciar el namespace tiene un efecto secundario útil — un nombre de utilidad que el theme no puede generar **no se materializa aunque Tailwind lo lea como texto**. Por eso los comentarios que mencionan `font-normal` para explicar por qué está prohibido no reintroducen la clase. Ojo: esto **no** te salva con nombres que el theme SÍ genera; ahí la regla dura de no documentar el anti-patrón dentro del árbol escaneado sigue vigente en toda su fuerza.

### ✅ `<strong>` y `<b>`: el `bolder` del UA está neutralizado — y el énfasis topa en 600

**Por qué existía el problema (el diagnóstico se conserva porque explica la regla):** el proyecto **no emite el preflight de Tailwind**, así que la hoja del navegador aplicaba `b, strong { font-weight: bolder }`. `bolder` es **relativo**: un `<strong>` dentro de un contenedor a 400 computaba 700; dentro de uno a 600, **900**. En ambos casos pedía un corte de Geist que no existe → **faux bold sin que ninguna clase lo dijera**. El gate escanea `className`, no elementos HTML, así que **le era estructuralmente invisible**: el peso entraba por el **nombre del elemento**. Apareció **tres veces el mismo día en sitios distintos**, ya conocida — prueba de que "acordarse" no es un mecanismo.

**Cerrado el 2026-07-29 (`403d346`)**, en `@layer base` de `styles/tailwind.css`:

```css
b,
strong {
  font-weight: var(--weight-semibold);
}
```

600 y no `inherit`, porque `inherit` mata el énfasis y `<strong>` dejaría de significar algo. Medido en el runtime vivo con `getComputedStyle` sobre los 25 `<strong>`/`<b>` del Producer: 24 Geist@600, 1 Poppins@700, **cero sintetizados**.

**Lo que tienes que saber hoy:** ya no hace falta declarar el peso en cada `<strong>` — la base lo hace. Lo que sí hace falta saber es el **techo**: el énfasis sobre Geist **topa en 600**. Un `<strong>` dentro de un contenedor que ya está en 600 se ve **igual que su padre**, porque no hay archivo. Si de verdad necesitas más peso, el camino es **`font-display` (Poppins 700)**, no pedirle a Geist un corte que no carga.

**La categoría de defecto sigue viva:** lo que entra por el nombre del elemento es invisible a un gate de `className`. `b`/`strong` están cubiertos por el reset; cualquier elemento HTML nuevo con default propio del UA reabre el agujero **con los gates verdes**.

## La escala — nueve pasos, y tres tienen prohibiciones escritas

Base 16px, ratio ~1.25 de `base` para arriba. **El docblock de cada token en `tokens.ts` es normativo.** Tres pasos existen para una densidad específica y su propio docblock los prohíbe fuera de ella:

| Token | rem | px | Contrato escrito |
|---|---|---|---|
| `--text-micro` | .5625 | **9** | 🔴 Metadata MÍNIMA adosada a un control (rótulo de dos palabras). **PROHIBIDO en texto de lectura y client-facing.** |
| `--text-2xs` | .625 | **10** | 🔴 Chips SOBRE el media, **y sólo eso**. **PROHIBIDO en client-facing y en texto de lectura.** |
| `--text-meta` | .6875 | **11** | 🔴 Etiqueta, ayuda y disponibilidad **DENTRO de un control**. Densidad de consola interna; **PROHIBIDO en superficie client-facing.** |
| `--text-xs` | .75 | 12 | Overline/eyebrow, metadata de card. |
| `--text-sm` | .875 | 14 | Supplementary: rótulos, timestamps, footer. **Nunca un párrafo largo.** |
| `--text-base` | 1 | 16 | **Body.** Todo lo que una persona de verdad lee. |
| `--text-lg` | 1.175 | 18.8 | El `h1` de un **PANEL** (≠ el de una página). Valor medido, no redondeado — decisión del operador en `TASK-1552`. |
| `--text-xl` | 1.375 | 22 | Título de **SECCIÓN** de página y `h1` móvil. |
| `--text-2xl` | 1.75 | 28 | El único display heading de la página, desktop. |

### Las dos audiencias — la tensión central de esta escala

Globe sirve **dos superficies con costos de error distintos**, y una sola escala para ambas obliga a elegir cuál se perjudica:

- **Consola interna** (Producer): un operador que vive ahí todo el día, en su equipo conocido. La densidad a 9-11px es **defendible y aprobada** — los valores del composer los midió y aprobó el operador en `TASK-1552`.
- **Superficie client-facing** (share board, entregables): un cliente que la lee **una vez**, en un dispositivo desconocido, para juzgar trabajo creativo. Acá rige el piso de **14px supplementary / 16px body**, sin excepciones.

**El gate no puede distinguirlas.** Por eso la restricción vive en los docblocks y en la review — y por eso el juicio que se te pide no es "¿es chico?" sino **"¿qué audiencia lee esto y para qué?"**.

Calibración medida del composer (76 apariciones, 2026-07-29): **84% por debajo de 14px**, con `text-meta` (11px) como tamaño dominante (42 usos). Es intencional para la consola. **Lo que sí es defecto es un token de rótulo usado como prosa** — el caso testigo fue la propuesta de prompt mejorado, un párrafo que el operador lee, juzga y del que depende un gasto de créditos, servido a 11px con `leading-snug`.

## Leading, tracking, measure

| Token | Valor | Regla |
|---|---|---|
| `--leading-tight` | 1.2 | Display. |
| `--leading-snug` | 1.35 | Rótulos multilínea, títulos de bloque. **No es leading de prosa.** |
| `--leading-normal` | **1.5** | Body. Es el valor que WCAG 1.4.12 permite forzar al lector: una maqueta construida a 1.3 que se rompe cuando el usuario pide 1.5 **falla el criterio**. |
| `--leading-relaxed` | 1.6 | Medidas largas (lede, comentarios). |
| `--tracking-eyebrow` | .14em | Versalitas, **y nada más**. Las caps se diseñan apretadas y hay que devolverles el aire. |
| `--tracking-display` | -.01em | Display grande sienta suelto; un pelo negativo aprieta la palabra. |
| `--tracking-body` | **0** | Minúscula queda en cero: más tracking ayuda a reconocer palabras sueltas y **perjudica la lectura fluida**. |
| `--measure-body` | **52ch** | Dentro de la banda 45-75. **Fija un piso al rail:** a 16px, 52ch necesita ~27rem — por eso el rail es `minmax(22rem,27rem)` y no las 24rem del primer borrador, que daban ~40 caracteres. |

Leading **siempre unitless**, para que escale con el tamaño.

## Contraste — medido, no estimado (2026-07-29)

Rampa de texto sobre los tres fondos reales. **Toda la rampa pasa WCAG AA con margen**; el peor caso es `--faint` sobre `--surface-solid` a **4,62:1**.

| Token | Hex | vs `--canvas` #030c26 | vs `--canvas-raised` #061443 | vs `--surface-solid` #0e1f5c |
|---|---|---|---|---|
| `--text` | `#eaf0ff` | 16,97 | 15,48 | 13,44 |
| `--muted` | `#aeb9d7` | 9,89 | 9,02 | 7,83 |
| `--faint` | `#7f8cb5` | 5,83 | 5,32 | **4,62** ⚠️ el piso |
| `--action` | `#4db8ff` | 8,87 | 8,09 | 7,02 |
| `--warning` | `#ffb703` | 11,09 | 10,12 | 8,78 |
| `--danger` | `#ff6b6b` | 6,98 | 6,37 | 5,53 |
| `--success` | `#4ee3a3` | 11,84 | 10,80 | 9,38 |

Consecuencia operativa: **`--faint` es el último escalón legible y no tiene holgura.** Cualquier token de texto nuevo más tenue que `--faint`, o `--faint` sobre un fondo más claro que `--surface-solid`, cae bajo 4,5:1. No inventes un cuarto escalón de gris para "bajar jerarquía" — la jerarquía se baja con **peso y tamaño**, que es gratis, no con contraste, que es el presupuesto de accesibilidad.

**Esa tabla mide texto sobre un fondo CONOCIDO. Sobre uno que no controlas, el contraste lo garantiza un scrim.** Hay dos y **no se consolidan**: `--media-scrim` protege texto sobre una pieza, y `--rail-scrim` —nuevo el 2026-07-29— protege el riel. El riel era translúcido porque «en desktop nada pasa por detrás»; la premisa se rompió y un renglón quedó **cortado a media letra**. Espejan la misma forma a propósito, pero unificarlos ata la legibilidad del riel a la de una pieza, que es otra decisión. **Una premisa de layout que sostiene legibilidad es un supuesto con fecha de vencimiento: cuando cae, el texto no se degrada — desaparece.**

`--warning` y `--danger` son distinguibles sin depender del tono, pero **el color nunca es el único portador**: toda superficie que los use debe además un icono o una etiqueta.

## Los gates — y su frontera real

`design-contract.test.ts` prohíbe literales de color, de motion y de tipografía (`font-family`/`font-size`/`font-weight`/`line-height`/`letter-spacing`, más el shorthand `font:`, que empaqueta cuatro decisiones en un string inauditable). Camina `.ts`/`.tsx`/`.css`.

🔴 **Su frontera está declarada dentro del propio archivo y hay que conocerla: escanea SOLO `apps/studio-client/src`.** `apps/studio-web` —donde viven **184 hex crudos** y **4 familias tipográficas literales**— **NO está vigilado**. La descripción honesta del estado es: *el payload nuevo no puede driftear; el legacy no está mirado*. La frontera se amplía en `TASK-1560` Slice 2, **inmediatamente ANTES** de borrar el legacy y nunca después — un gate rojo al llegar se saltea, y un gate salteado se lee como cobertura.

**Trampa del runner, que ya mordió más de una vez:** el runner es **`node --test`, NO Vitest**, y los scripts `test` de cada package **enumeran los archivos a mano** — no hay glob ni descubrimiento. Un `*.test.ts` nuevo que no se agregue al script `test` de su package **NUNCA corre**, y la suite queda **verde por no haberlo mirado**, que es el peor de los verdes. Confirma que tu test aparece en la salida del run.

**Esa suite ya termina sola (cerrado 2026-07-29, `403d346`).** El último paso del `test` de `studio-client` es `axis-pilot-canary.test.mjs`, que hacía `server.kill('SIGTERM')` sobre el wrapper de `pnpm` y **no sobre el `vite` nieto** — porque `pnpm exec vite` no es un proceso, son tres. El nieto sobrevivía reteniendo los pipes, el comando no retornaba y cada corrida dejaba un huérfano en el puerto **4326** (se acumularon doce, uno de tres días). Hoy el canary corre con `detached: true`, señala al **grupo** con `process.kill(-pid, …)` y **espera** la muerte con escalón a `SIGKILL`. Medido: `pnpm --filter @efeonce-globe/studio-client test` → **exit 0 en 29 s**, 129/129, tres canarios verdes, cero huérfanos. ⚠️ **El workaround de correr los canarios por separado y liberar el puerto a mano queda retirado** — sostenerlo para un bug muerto hace pagar el costo dos veces. La lección de método sigue vigente para el paso 11 de la pasada de auditoría: **«se colgó» no es un verde ni un rojo, y confundirlo con lo normal es cómo un cuelgue real pasa desapercibido**.

## Reglas duras (NUNCA / SIEMPRE)

- **NUNCA** un valor de diseño literal en `className` (`text-[#hex]`, `p-[13px]`, `text-[11px]`) ni un `:root` de tokens fuera del SSOT. Son **error** de gate, no advertencia. Lo único arbitrario permitido es una **referencia** a token: `duration-(--duration-short)`.
- **NUNCA** `font-bold` sin `font-display` en el mismo elemento: es **Geist@700 sintetizado**. El énfasis en Geist es `font-semibold` (600).
- **NUNCA** `font-normal` ni `font-medium`: no emiten CSS. Si necesitas 400 explícito, verifica primero qué utilidad genera el theme.
- **NUNCA** pidas un peso sin comprobarlo contra **`GLOBE_FONT_FACES`**, que es el manifiesto y la autoridad. Tres archivos, no doce.
- **NUNCA** uses `--text-micro`, `--text-2xs` ni `--text-meta` en **texto de lectura** ni en **superficie client-facing**: sus propios docblocks lo prohíben por escrito. Un token de rótulo usado como prosa es la forma de falla más repetida de esta escala.
- **NUNCA** subas la densidad del composer "para cumplir el piso de 14px": esos valores los midió y aprobó el operador en `TASK-1552`, y `TASK-1559` portó el feed con el compromiso explícito de que el before/after no se note. Corrige lo que viola el contrato escrito del token; **no re-litigues una decisión humana**.
- **NUNCA** bajes el contraste por debajo de 4,5:1 para crear jerarquía, ni agregues un gris más tenue que `--faint`. La jerarquía se hace con peso y tamaño.
- **NUNCA** versalitas fuera de un eyebrow corto, y siempre con `tracking-eyebrow`. Jamás caps en texto corrido: eliminan la pista de forma de palabra y **frenan 13-18% a un lector disléxico**.
- **NUNCA** tracking en minúscula (`--tracking-body` es 0).
- **NUNCA** leading en px, ni contenedores de alto fijo que revienten con `line-height: 1.5` / `letter-spacing: .12em` forzados por el lector (WCAG 1.4.12).
- **NUNCA** monoespaciada para números: `tabular-nums` sobre Geist. En Globe no existe una familia mono cargada — pedirla es fallback del sistema, que rompe la voz de marca y no alinea mejor.
- **NUNCA** edites `globe-theme.generated.css` a mano (se regenera con `pnpm theme:generate`), ni aliasees el theme con `@theme inline { --text-xs: var(--text-xs) }`: cuando el nombre coincide a ambos lados es una **referencia circular** que rinde `text-xs` a 16px **con el build verde**.
- **NUNCA** documentes un anti-patrón tipográfico dentro del árbol que Tailwind escanea (`.ts`/`.tsx`): lo lee como texto plano y **materializa el ejemplo como clase real**.
- **NUNCA** importes primitives de Greenhouse, MUI ni `<Typography variant>` (ADR-014). Las primitives de Globe viven en `apps/studio-client/src/primitives/index.tsx`.
- **SIEMPRE** `tabular-nums` en cualquier número que **cambie en vivo** (créditos, contadores, estimados, steppers). Sin cifras tabulares los dígitos cambian de ancho y la fila salta en cada actualización. Un número que no cambia —un id, una etiqueta— no lo necesita: no lo pongas por reflejo.
- **NUNCA** concatenes separadores de miles a mano ni imprimas un entero con `String(n)`: la primitive es `src/format/credits.ts` (`formatCredits` exacta · `creditReadout` para slot angosto), anclada al locale **del producto** (`es-CL`) y no al del navegador — un lector con el navegador en inglés leería `500,444` como cuatro órdenes de magnitud menos. `creditReadout` abrevia **sólo** desde 1.000.000, con el umbral **medido** contra la celda más angosta del panel (~62 px: un dígito tabular de Geist a 14 px avanza ~8,4 px, el punto ~4,9), y conserva el valor exacto en el `title` y en el `sr-only`. Su test afirma un **presupuesto de caracteres** (barre 0→1e12, falla sobre 7), **no un formato**: un test de formato se rompe con cada ajuste cosmético y no protege el slot; el presupuesto sí. Si el panel se ensancha, el umbral se **recalcula con la misma aritmética**, no se estima.
- **NUNCA** redondees un número que se muestra al lado de sus propios operandos: el porcentaje del donut usaba `Math.round` y decía `100 %` con la celda vecina mostrando `Gastado 166`. Es **`Math.floor`** — un redondeo que contradice el dato que tiene al lado no es un decimal de más, es una cifra falsa.
- **SIEMPRE** `text-base` (16px) en `<textarea>`/`<input>`: por debajo, iOS Safari hace auto-zoom al enfocar. **NUNCA** lo "arregles" con `user-scalable=no` (rompe WCAG 1.4.4).
- **SIEMPRE** declara el peso de un título aunque el fallback acierte: la intención se escribe, no se hereda.
- **SIEMPRE** que agregues un paso a la escala, escríbele su **docblock con la razón medida y su prohibición** si la tiene. En Globe el docblock es el contrato; un token sin razón escrita es el próximo que alguien usa "porque se ve bien".

## Sinergia

- **`greenhouse-globe`** — la skill de dominio. Cárgala siempre que toques producto de Globe; trae el boundary, ADR-014 y el estado de rollout.
- **`arch-architect`** — si la decisión cambia la forma del SSOT o cruza una frontera, no solo un valor.
- **`a11y-architect`** — auditoría WCAG completa más allá del contraste de texto.
- **`greenhouse-documentation-governor`** — cierre documental **en Greenhouse**, nunca en `efeonce-globe/docs/**`.
- **La capa de copy es de otro dueño:** las palabras salen de `apps/studio-client/src/copy/index.ts` vía `copyFor()` — **nunca un string visible en JSX**, ni en `aria-label`/`title`/`placeholder`/`alt`. Este overlay gobierna la **forma** del texto; el copy gobierna el **contenido**.

## Pasada de auditoría (lente Globe)

**Paso 0, y no es retórico: MIRA el frame renderizado antes de leer código.** El 2026-07-29 la regresión la introdujimos nosotros y sobrevivió a `pnpm build`, ESLint, **129 tests y tres canarios en verde**, con un renglón cortado a media letra en pantalla. Todo lo que sigue audita lo que el código *dice*; nada de eso audita lo que la pantalla *hace*.

1. ¿Cada `font-bold` va acompañado de `font-display`? (si no → **faux bold sobre Geist**)
2. ¿Hay un `<strong>`/`<b>` dentro de un contenedor que ya está en 600? (→ se ve **igual que su padre**: el énfasis sobre Geist topa en 600; si hace falta contraste, es `font-display`, no un peso mayor de Geist). ¿Y algún elemento HTML nuevo con default de peso del UA sin verificar? (→ el reset cubre `b`/`strong` desde `403d346`, no lo que se introduzca después)
3. ¿Aparece `font-normal` o `font-medium`? (→ clases muertas, no declaran nada)
4. ¿Algún peso pedido fuera de los tres cortes de `GLOBE_FONT_FACES`? (revisa **también `tailwind.css`**: la mayoría del caso fuente vivía en la hoja, no en JSX)
5. ¿`--text-micro`/`--text-2xs`/`--text-meta` usados como **prosa** o en superficie client-facing? (→ token fuera de su contrato escrito)
6. ¿Los `<textarea>`/`<input>` en `text-base` (16px)?
7. ¿Prosa con `leading-normal` (1.5) y rótulos con `snug`, y no al revés?
8. ¿Los números que cambian en vivo llevan `tabular-nums`, salen de la primitive de formato y usan `floor` cuando conviven con sus operandos?
9. ¿Medida de lectura entre 45 y 75ch — y el contenedor lo permite de verdad, medido y no supuesto?
10. ¿Versalitas solo en eyebrow corto, con `tracking-eyebrow`, y ninguna en texto corrido?
11. ¿Todo texto ≥ 4,5:1 (3:1 en large), sin gris nuevo más tenue que `--faint` — y con scrim donde el fondo no lo controlas?
12. ¿Cero literales tipográficos; todo desde el SSOT? (`pnpm --filter @efeonce-globe/studio-client test` verde — recuerda que **no retorna solo**: ver §Gates)
13. Si agregaste un `*.test.ts`, **¿está registrado en el script `test` del package** y aparece en la salida del run?
