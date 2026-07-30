# ADR-017 — Color scheme y arquitectura de superficie del payload cliente de Globe

> ⚠️ **El título original de este ADR era «Globe es dark-only, y el chasis se desatura».** La segunda mitad
> quedó **superada por el Delta v2 (2026-07-30)**: no se desatura nada — el chasis **adopta** el theme que
> el equipo de diseño ya tenía en AXIS, y el azul sobre el que se razonó **no era el color de marca**.
> La decisión dark-only se mantiene, con un argumento menos.

> **Tipo:** Architecture Decision Record
> **Estado:** `Accepted` — aceptado por el operador el 2026-07-30
> **Creado:** 2026-07-30
> **Dueño de implementación:** `TASK-1485` (Globe Design System Governance and Pattern Registry — dueña del
> SSOT `tokens.ts`)
> **Construye sobre:** [ADR-016](./EFEONCE_GLOBE_CLIENT_STYLING_ENGINE_DECISION_V1.md) — el motor que hace
> que cambiar estos valores sea una edición del SSOT y no una cacería de literales
> **Relacionados:** `TASK-1523` (contratos visual/flow/motion), `TASK-1552` (composer), `TASK-1558` (share
> board), `TASK-1560` (retiro del legacy)
> **Desbloquea parcialmente:** la condición *"share board blocked on approved visual direction"* de
> [ADR-014](./EFEONCE_GLOBE_CLIENT_APPLICATION_DECISION_V1.md) — para la dimensión de color

---

## Contexto

Esta decisión ya estaba pedida por escrito. El comentario de cabecera de
`apps/studio-client/src/styles/theme-from-tokens.ts` la enuncia con precisión:

> Globe tiene un solo tema (`color-scheme: dark`) y ninguna superficie lo cambia, así que el costo hoy es
> cero. Si algún día se quiere tematizado en runtime, la salida es que el shell deje de emitir `:root` y
> Tailwind sea el único que lo emita — **decisión con dueño, no un efecto colateral**.

Este ADR es ese dueño.

### El estado real, verificado contra el código (2026-07-30)

`color-scheme: dark` está **declarado en cinco sitios**, ninguno de los cuales es una decisión:

| Archivo | Forma | Qué sirve |
|---|---|---|
| `apps/studio-client/src/tokens/tokens.ts:753` | `:root{color-scheme:dark;…}` generado | el payload React |
| `apps/studio-web/src/shell.ts:91` | `<meta name="color-scheme" content="dark">` | el shell por request |
| `apps/studio-web/src/ui.ts:135` | `<meta …>` | launch / studio / error |
| `apps/studio-web/src/producer-ui.ts:26` | `<meta …>` | el Producer legacy |
| `apps/studio-web/src/public-share-ui.ts:13` | `:root{color-scheme:dark;…}` | **el share board** |

Los cinco vienen del legacy. Nadie eligió dark: se heredó, y la ausencia de un modo claro es hoy
indistinguible de un olvido. Eso es exactamente lo que un ADR existe para arreglar — no el valor, sino su
estatus.

### El problema que sí es de diseño, y es anterior

Al auditar el chasis con los tokens en la mano apareció algo más grave que la ausencia de modo claro: **el
azul de marca está cumpliendo tres funciones incompatibles a la vez** — es el fondo, es la marca y es el
color de acción. Las seis superficies canónicas están a **74–85 % de saturación**:

| Token | Valor | Saturación |
|---|---|---|
| `--canvas` | `#030c26` | 85 % |
| `--canvas-raised` | `#061443` | 76 % |
| `--surface-solid` | `#0e1f5c` | 74 % |
| `--surface` | `rgba(11,26,78,.5)` | 75 % |
| `--surface-strong` | `rgba(14,31,92,.62)` | 74 % |
| `--rail` | `rgba(5,13,40,.58)` | 78 % |

El único token de superficie neutro de toda la escala es `--surface-soft` (blanco al 3,5 %). Un dark
tintado de referencia (Linear, Vercel, Figma) vive entre 5 y 15 % de saturación en sus superficies. Globe
no tiene un dark con tinte de marca: tiene un dark **pintado**.

La consecuencia es medible y se ve en el feed del Producer: entre cuatro piezas generadas —una verde, una
morada, una cálida y una azul—, **la azul pierde su borde y se hunde en el fondo** mientras las otras
saltan. El chasis está eligiendo ganadores entre el trabajo del cliente.

---

## Decisión

**Globe es dark-only, y su chasis se desatura.** Tres partes, en este orden de importancia:

### 1. El chasis del Producer se desatura, conservando el matiz

Se re-derivan **seis tokens de superficie y tres de texto**, manteniendo el hue en ~225 y bajando la
saturación a ~20 %:

| Token | Hoy | Propuesto |
|---|---|---|
| `--canvas` | `#030c26` (85 %) | `#0a0b0f` (20 %) |
| `--canvas-raised` | `#061443` (76 %) | `#101218` (20 %) |
| `--surface-solid` | `#0e1f5c` (74 %) | `#171a22` (19 %) |
| `--surface` | `rgba(11,26,78,.5)` | `rgba(23,26,34,.55)` |
| `--surface-strong` | `rgba(14,31,92,.62)` | `rgba(28,32,42,.66)` |
| `--rail` | `rgba(5,13,40,.58)` | `rgba(10,11,15,.72)` |
| `--text` | `#eaf0ff` (100 %) | `#e8eaf0` (27 %) |
| `--muted` | `#aeb9d7` (33 %) | `#a3a9b8` (13 %) |
| `--faint` | `#7f8cb5` (26 %) | `#767d8f` (11 %) |

**La rampa de acción, la de estado y los ocho `--preset-*` no se tocan.** `--action` sigue siendo
`#4db8ff` y `--warm` sigue siendo `#ff6500`, exactamente. Ese es el punto de la decisión: la marca se
percibe más fuerte porque deja de competir consigo misma, no porque se intensifique.

Contraste verificado sobre el canvas nuevo: `--text` **16,35:1**, `--muted` **8,36:1**, `--faint`
**4,78:1**. Los tres pasan WCAG AA para texto normal. `--action` sobre el canvas nuevo da **9,01:1**.

### 2. El Producer es dark-only por colorimetría, no por preferencia

Globe muestra trabajo creativo generado. En una herramienta de creación visual, **el chasis no debe teñir
la percepción del contenido**: un fondo saturado desplaza la adaptación cromática del observador y altera
cómo se lee el color de la pieza. Es la razón por la que Photoshop, Lightroom, Capture One, Frame.io y
Runway usan gris neutro, y no es una convención estética heredada — es una restricción perceptual.

Un modo claro para el Producer no está diferido por costo: **está rechazado por oficio.** Un cliente que
evalúa una paleta fría sobre fondo claro la juzga distinto que sobre fondo oscuro, y ninguna de las dos
lecturas es la pieza. Se elige una, se declara, y se mantiene estable — que es lo que permite comparar dos
generaciones entre sí.

### 3. El share board queda dark-only en V1, con la puerta abierta y las condiciones escritas

El share board es la única superficie sin autenticar de Globe: **la abre un cliente, una vez, en un
dispositivo desconocido.** Es el caso donde el modo claro dejaría de ser retórico, porque el visitante no
eligió el contexto.

Se mantiene dark en V1 por dos razones que no son inercia:

- **Coherencia de lectura con el Producer.** La pieza que el equipo aprobó sobre neutro oscuro es la que
  el cliente debe recibir. Servir la misma pieza sobre dos fondos distintos hace que el equipo y el
  cliente estén, literalmente, viendo dos cosas.
- **Una galería oscura es el canon del oficio** para presentar una pieza terminada — la misma razón por
  la que una sala de proyección no tiene las luces prendidas.

La diferencia con hoy es que ahora es **una decisión con condiciones de revisión**, no un default.

---

## El costo real de un modo claro, medido

Se midió antes de decidir, para que la decisión no dependa de una intuición. Un modo claro **no es
invertir la rampa**: es re-derivar qué token cumple cada rol.

| Par | Contraste | Veredicto |
|---|---|---|
| `--action` `#4db8ff` sobre canvas oscuro | **9,01:1** | pasa con margen |
| `--action` `#4db8ff` sobre blanco | **2,18:1** | **falla incluso el 3:1 de componente UI** |
| `--action-strong` `#0375db` sobre blanco | **4,59:1** | pasa texto normal |
| `--faint` claro, primer intento `#838a99` | 3,23:1 | falla |
| `--faint` claro, segundo intento `#666d7d` | 4,84:1 sobre el canvas · **4,47:1 sobre el plano más oscuro** | **falla** — ver nota |
| `--faint` claro corregido `#606674` | 4,95:1 en el peor plano | pasa |
| `--action-strong` `#0375db` sobre el plano más oscuro | **3,95:1** | pasa como componente (3:1), **no como texto** |

> **Nota — la misma clase de error, dos veces en este documento.** Los valores del modo claro se midieron
> contra `#f6f7f9`, que es el canvas, y **no** contra el plano de menor contraste, que en una escala clara
> es el **más oscuro** (`--stage`, donde vive el bloque de estado del share board: vacío, error, cargando).
> Con la regla bien aplicada, `--faint` fallaba por 0,03 y `--action-strong` no alcanza el piso de texto
> ahí. Es exactamente el defecto que el Delta corrigió en la escala oscura, repetido en la clara mientras
> se escribía la corrección — evidencia de que la regla no se cumple por conocerla, sino por ejecutarla en
> cada plano. **Consecuencia para el día que se reabra el modo claro:** `--action-strong` es válido como
> texto sobre `--surface` y `--canvas`, y **sólo como componente** sobre `--stage`.

Dos hallazgos que sobreviven a este ADR y valen para cualquier futuro modo claro:

1. **El azul de marca de Globe no es usable sobre blanco.** Su relevo correcto es `--action-strong`
   (`#0375db`), que **ya existe en el SSOT** y hoy sirve como extremo presionado de la misma rampa. Un
   modo claro rota el rol de acción de un token al otro; no oscurece el azul ad-hoc.
2. **El payload no soporta re-tematizado en runtime, y eso es estructural.** Los valores se emiten en
   **dos** lugares (el `:root` inline del shell y el `@theme` del bundle Tailwind). No pueden derivar
   entre sí porque los genera la misma fuente, pero sí implica que cambiar `--canvas` desde JS no movería
   una sola utilidad. Un modo claro real exige primero que **el shell deje de emitir `:root` y Tailwind
   sea el único emisor** — el movimiento que el propio comentario de `theme-from-tokens.ts` anticipa.

---

## Condiciones que reabren la decisión del modo claro

Este ADR se revisa —sin necesidad de superarlo— cuando ocurra cualquiera de estas:

1. **Evidencia de cliente**, no preferencia interna: un visitante del share board reporta que no puede
   leerlo cómodamente, o el contexto de uso resulta ser mayoritariamente diurno en pantalla brillante.
2. **Una superficie de Globe deja de ser un visor de piezas.** Un panel de administración de créditos, un
   reporte exportable o una vista de facturación no tienen la restricción colorimétrica del Producer: son
   documentos, y ahí el modo claro es legítimo.
3. **La entrega imprimible** entra en alcance. Un PDF o una hoja de contacto nace claro por destino.
4. **El re-tematizado en runtime se vuelve un requisito** por accesibilidad — en cuyo caso el primer paso
   no es elegir colores sino consolidar la emisión de `:root`.

Cuando se reabra, **el punto de partida es rotar `--action` → `--action-strong`**, no derivar una paleta
clara nueva.

---

## Alternativas rechazadas

| Alternativa | Por qué se rechaza |
|---|---|
| **Dejar el navy como está** | El chasis tiñe el trabajo del cliente y hace desaparecer piezas frías. Es el defecto que originó la revisión, y no se corrige con un modo claro: se corrige desaturando. |
| **Modo claro completo en las cinco superficies** | El Producer lo rechaza por colorimetría, así que sería un modo claro para las superficies que menos lo necesitan, al precio de duplicar toda la rampa y sus gates. |
| **Seguir `prefers-color-scheme` del sistema** | Delega a la preferencia del sistema operativo una decisión que es del oficio: la pieza no puede verse distinta según cómo el cliente configuró su laptop. Además hoy es inejecutable — el payload no puede re-tematizarse en runtime. |
| **Desaturar hasta gris neutro puro (0 %)** | Pierde la identidad del chasis sin ganar nada perceptual. El 20 % conserva el matiz de marca y es indistinguible de neutro frente a una pieza. |
| **Bajar la saturación sólo del `--canvas`** | Deja el resto de la escala en 74–78 %; las cards y el rail seguirían tiñendo. La escala se mueve completa o no se mueve. |

---

## Consecuencias

**Se acepta:**

- Un cambio visible en **tres superficies ya desplegadas** (`producer`, `share`, `studio`). Es
  deliberado y entra por la task dueña, con diff de referencia según ADR-016 — nunca como reescritura.
- Globe queda **explícitamente monotema**. Cualquier superficie futura nace dark y quien quiera otra cosa
  reabre este ADR.
- El `LEGACY_TOKEN_DRIFT` de `tokens.ts` gana entradas mientras las superficies legacy no porten. Es el
  mecanismo previsto, no deuda nueva.

**Se gana:**

- El trabajo del cliente deja de competir con el fondo, que es lo único que esta pantalla existe para
  mostrar.
- La marca gana presencia por contraste en vez de por cobertura.
- La rampa de acción queda libre para significar acción, en lugar de compartir canal con la superficie.

**Se pierde:**

- La lectura "nocturna azul" que el chasis tiene hoy, que es reconocible aunque sea accidental.
- La opción de servir el share board claro sin trabajo previo de consolidación del `:root`.

---

## Lo que este ADR NO decide

- **No decide la escala tipográfica, el motion ni el layout.** Sólo color de superficie y su rol.
  Tipografía es el [Contrato V1](./EFEONCE_GLOBE_CLIENT_TYPOGRAPHY_CONTRACT_V1.md); motion es
  [`GLOBE_CLIENT_MOTION_CONTRACT_V1.md`](./GLOBE_CLIENT_MOTION_CONTRACT_V1.md) bajo `TASK-1523`.
- **No decide la dirección visual completa del share board.** ADR-014 la bloquea por dirección visual
  aprobada; este ADR resuelve **sólo la dimensión de color**, y la composición sigue siendo de
  `TASK-1558`.
- **No autoriza tocar el legacy.** `producer-ui.ts`, `public-share-ui.ts` y `ui.ts` son payload en retiro
  bajo `TASK-1560`; sus literales se retiran con la superficie, no antes.
- **No es un permiso para editar `tokens.ts` sin gate.** El cambio regenera el theme
  (`pnpm theme:generate`), pasa los gates de diseño y cierra con GVC premium en desktop y 390 px sobre
  las piezas reales del feed — que es donde se prueba lo único que importa: que el trabajo del cliente se
  vea como es.

---

## Verificación exigida al implementar

1. `pnpm theme:generate` y el gate que compara el archivo generado carácter por carácter, en verde.
2. Contraste re-medido **en el runtime desplegado**, no en la propuesta: `--text`, `--muted` y `--faint`
   sobre `--canvas` y sobre `--surface-solid`, los seis pares ≥ 4,5:1.
3. GVC premium desktop + 390 px del Producer **con piezas reales de las tres modalidades**, incluida al
   menos una pieza de dominante fría — el caso que hoy falla.
4. El share board capturado en sus estados `ready`, `empty`, `error` y `denied` (los cuatro ya existen
   como escenario) para confirmar que la desaturación no rompe ninguno.
5. `pnpm check && pnpm build` en `efeonce-globe`.

---

## Delta 2026-07-30 — autoauditoría: la v1.0 tenía la dirección correcta y la ejecución incompleta

La v1.0 se auditó contra el scorecard del orquestador de diseño el mismo día en que se aceptó. **Falló dos
umbrales duros y tenía tres defectos materiales.** La dirección no cambia; los valores sí, y el método
pasa a ser un principio en vez de una tabla negociada.

### Defecto 1 — la escala propuesta aplanaba el modelo de profundidad a la mitad

Medido: los saltos entre los tres planos de superficie caían de `1,096 / 1,152 / 1,263` (navy) a
`1,051 / 1,076 / 1,131`. En navy, parte de la separación entre una card y su fondo la cargaba el **croma**;
al quitarlo, la v1.0 dejó sólo luminancia — y además la bajó.

**Causa raíz:** la v1.0 eligió los valores a ojo, moviendo saturación **y** luminancia a la vez.

**Regla que reemplaza la tabla:**

> Un token de superficie se desatura a hue ~225 / sat ~20 % **conservando su luminancia relativa**.

Con eso los saltos quedan idénticos **por construcción**, no por ajuste: `1,096 / 1,159 / 1,270` contra los
`1,096 / 1,152 / 1,263` del navy. El modelo de profundidad se preserva exacto y lo único que se retira es
el croma — que era el objetivo declarado.

### Defecto 2 — el inventario decía seis tokens de superficie y son quince

La v1.0 listó `--canvas`, `--canvas-raised`, `--surface`, `--surface-strong`, `--surface-solid` y `--rail`.
El barrido completo de `tokens.ts` encuentra **nueve más**, todos con navy de fondo:

| Token | Hoy | Qué rompía si quedaba fuera |
|---|---|---|
| `--field` | `#060f2d` | el fondo de **todo input** del composer |
| `--media-base` | `#0a1330` | el lecho del visor de media |
| `--overlay-fill` | `linear-gradient(165deg,rgba(20,40,110,.97),rgba(9,20,60,.98))` | **overlays azules flotando sobre chasis neutro** |
| `--page-backdrop` | `…linear-gradient(158deg,#071647,#030c26 74%)` | el telón de fondo de la página |
| `--thumb-placeholder` | `linear-gradient(145deg,#153276,#07143d)` | el placeholder de cada miniatura del feed |
| `--model-menu-fill` | `linear-gradient(168deg,#0d2160,#071440)` | el desplegable de modelo |
| `--rail-scrim` | `rgba(5,13,40,.72→.94)` | el velo del riel |
| `--media-control` | `rgba(6,15,45,.5)` | los controles sobre media |
| `--media-control-strong` | `rgba(6,15,45,.6)` | ídem, estado fuerte |

Un cambio parcial de escala deja el resto derivando: alguien implementando la v1.0 al pie de la letra
habría producido overlays y menús azules sobre un chasis desaturado. **Los quince se mueven juntos o no se
mueve ninguno.**

Las dos paradas de gradiente se desaturan cada una por su luminancia, con la misma regla.

**No se tocan** (son rampa de acción, no superficie): `--action`, `--action-strong`, `--cta-fill`, `--warm`,
los ocho `--preset-*`, `--accent-*`, `--stage-halo`, `--glow-rest/hover/focus`, `--cta-lift`,
`--preset-selected`, `--composer-light`. Su **valor** no cambia; su **lectura** sí — un glow azul al 22 %
es más presente sobre casi-negro neutro que sobre navy. Se acepta y se verifica en GVC; no se recalibra a
ciegas.

### Defecto 3 — el contraste se midió sobre el plano más fácil

La v1.0 declaró `--faint` en **4,78:1** y lo dio por bueno. Ese número es sobre `--canvas`, el plano **más
oscuro**. El texto `faint` también vive sobre cards y popovers (`--surface-solid`), y ahí el valor
propuesto daba **3,71:1 — falla**, contra los 4,62:1 que da hoy en navy. **La v1.0 introducía una
regresión de accesibilidad mientras decía haberla verificado.**

Corrección: `--faint` pasa de `#767d8f` a **`#8b92a3`**. Escala completa, los nueve pares sobre los tres
planos:

| Texto | sobre `--canvas` | sobre `--canvas-raised` | sobre `--surface-solid` |
|---|---|---|---|
| `--text` `#e8eaf0` | 16,14:1 | 14,73:1 | 12,71:1 |
| `--muted` `#a3a9b8` | 8,25:1 | 7,53:1 | 6,50:1 |
| `--faint` `#8b92a3` | 6,23:1 | 5,68:1 | **4,91:1** |
| `--action` `#4db8ff` | 8,89:1 | 8,11:1 | 7,00:1 |

**Regla que se desprende, y aplica a todo el SSOT:**

> Un token de texto se verifica contra el plano de **menor contraste** sobre el que puede aparecer, nunca
> contra el canvas por defecto.

En una escala oscura ese plano es el **más claro** (el caso de este ADR: las cards y los popovers). En una
escala clara es el **más oscuro** — la formulación general importa porque quien reabra el modo claro con la
versión específica de dark mediría exactamente el par equivocado, que es el error que este Delta corrige.

Un solo par medido no es la escala verificada.

### Defecto 4 — la propuesta quita un problema y no entrega un momento visual

Desaturar es **sustracción**. Deja el chasis correcto y anónimo, y el estándar premium trata "correcto y
anónimo" como fallo aunque los gates de token estén verdes. La v1.0 llegó a enunciar la salida —*un solo
momento de marca dominante en vez de teñido global*— y **no la diseñó**.

Queda declarado como **pendiente con dueño: `TASK-1523`** (contratos visual/flow/motion), no como parte de
este ADR. Este ADR gobierna la escala de superficie; el momento de marca es composición.

### Tabla de valores vigente tras el Delta

| Token | Hoy | v1.0 (obsoleta) | **Vigente** |
|---|---|---|---|
| `--canvas` | `#030c26` | ~~`#0a0b0f`~~ | **`#0c0d12`** |
| `--canvas-raised` | `#061443` | ~~`#101218`~~ | **`#161820`** |
| `--surface-solid` | `#0e1f5c` | ~~`#171a22`~~ | **`#212531`** |
| `--faint` | `#7f8cb5` | ~~`#767d8f`~~ | **`#8b92a3`** |
| `--text` | `#eaf0ff` | `#e8eaf0` | `#e8eaf0` (sin cambio) |
| `--muted` | `#aeb9d7` | `#a3a9b8` | `#a3a9b8` (sin cambio) |

`--surface`, `--surface-strong`, `--rail` y los nueve tokens del Defecto 2 se derivan con la misma regla de
luminancia conservada al implementar.

### Estado del gate de diseño

Contra el scorecard del orquestador, esta propuesta **no cierra como diseño**: `visual impact` y
`depth/surface model` no alcanzaban el piso de 4,5. El Delta resuelve profundidad y contraste; **`visual
impact` sigue abierto** y es lo que `TASK-1523` debe cubrir antes de que el chasis se declare terminado. La
escala de superficie sí puede implementarse: es correcta, medida y no depende de esa decisión.

---

## Delta v2 2026-07-30 — la premisa de marca era falsa: Globe no es azul

Las v1.0 y v1.1 razonaron sobre una premisa que nadie había verificado contra el design system: **que
`--action #4db8ff` era el color de marca de Globe.** No lo es. El theme vigente lo definió el equipo de
diseño en AXIS (nodo *Theme Color · Globe*, verificado el 2026-07-30 con el operador y el agente de Figma):

| Rol | Valor |
|---|---|
| **primary-500** | **`#FF6500`** — naranja |
| **secondary-500** | **`#4A108C`** — morado |
| info-500 | `#3B5ED9` |
| success-500 | `#10B981` |
| warning-500 | `#EAB308` |
| error-500 | `#E5333B` |

El azul `#4db8ff` **no ocupa ningún rol** del sistema. Se originó en un prototipo de Claude Design que
inventó su propia paleta, y el runtime la heredó. El naranja, que hoy vive como `--warm` (un acento menor:
el punto del logotipo, un segmento de la dona), **es el primary**.

**Qué invalida:** el diagnóstico —el azul cubría el 85 % del área y hundía las piezas frías— era correcto,
pero la solución no. Desaturar el chasis alrededor de un color que no pertenece al sistema habría dejado el
defecto mayor intacto y más visible.

**Qué sobrevive:** el método (desaturar conservando luminancia, verificar contra el plano de menor
contraste), todas las mediciones, la decisión dark-only y el inventario de superficies.

### El chasis se ADOPTA, no se desatura

Las superficies son tokens **globales** del design system (`Misc`), no por tema:

| Token | Light | Dark |
|---|---|---|
| `body-bg` | `#F8F7FA` | `#25293C` |
| `paper` | `#FFFFFF` | `#2F3349` |
| `text-primary` | `#2F2B3DE5` | `#E1DEF5E5` |
| `text-secondary` | `#2F2B3DB2` | `#E1DEF5B2` |
| `divider` | `#2F2B3D1F` | `#E1DEF51F` |

**`#25293C` tiene hue 230 y saturación 24 %** — es exactamente el neutro tintado al que llegó el cálculo de
la v1.1 por otro camino. El equipo ya había resuelto el problema; **el runtime nunca adoptó su theme.** La
tabla de valores de la v1.1 (`#0c0d12`, `#161820`, `#212531`, `#8b92a3`) queda **retirada**: eran una
derivación correcta de una premisa equivocada.

Estos valores ya están en el paquete `@efeoncepro/axis-tokens` (`axisNeutral.light` / `.dark`), idénticos
byte por byte, y Globe ya lo tiene como dependencia (`0.1.5`) — sólo que `tokens.ts` no lo importa.

### Arquitectura de superficie: el contenido sube, no baja

Dos planos alcanzan para un dashboard, no para el Producer (chasis → composer → cards → overlays → lecho de
media). Se extiende la escala **en las dos direcciones**, con el mismo paso de la progresión:

| Plano | Dark | Light |
|---|---|---|
| **hundido** *(nuevo)* | `#181B28` | `#ECEAF1` |
| body-bg | `#25293C` | `#F8F7FA` |
| paper | `#2F3349` | `#FFFFFF` |
| **elevado** *(nuevo)* | `#3B405C` | = paper + sombra |

Y la regla de asignación, decidida por el operador el 2026-07-30 tras comparar tres variantes con el frame
delante:

> **El contenedor del contenido se hunde; las piezas suben a `paper`.** El chasis se queda en `body-bg`.

Medido — separación entre una card y su fondo:

| Variante | dark | claro |
|---|---|---|
| A · card sobre el chasis | 1,157 | 1,067 |
| B · card baja al lienzo (chasis invertido) | 1,192 | **1,118** |
| **C · card sube sobre lienzo** | **1,379** | **1,193** |

**C es la única que funciona en los dos modos**, y su valor en claro supera al de B en oscuro. La razón es
estructural: en el extremo claro los planos se comprimen, así que bajar el fondo no alcanza — **hay que
subir el contenido a blanco puro.**

**B queda descartada**, y por tres razones además del número: sólo funciona en oscuro; invierte la elevación
de Material (pone el contenido *por debajo* del fondo, y Globe es consumidor de ese modelo); y responde al
patrón de una app de **lienzo continuo** (Figma, Runway) cuando el Producer es un **feed** de resultados,
que es el patrón de Behance o Dribbble. Fue un error de categoría del autor, corregido por el operador.

**El viewer y el share board sí usan lienzo hundido con la pieza sola**, sin cards: cuando hay una obra y la
tarea es juzgarla, el entorno se apaga; cuando hay varias y la tarea es compararlas, el entorno sostiene.

🔴 **El contenedor hundido NO es una card.** Va hundido y sin sombra propia. Implementarlo con borde y
sombra elevada lo convierte en card-on-card, que el estándar premium marca como fallo aunque los gates de
token pasen.

### El presupuesto del naranja, declarado

El naranja es el color de **acción**: `primary` en este stack resuelve botones, estado activo y foco, y el
producto no decide nada visual (ADR de ownership de AXIS). Pero se declara su presupuesto, porque el ADR-017
nació precisamente de no tener uno:

- **Vive en:** CTA primario, estado activo, foco.
- **NUNCA como superficie** — ni `primary-8` de fondo, ni gradientes de marca detrás del contenido. Los
  cálidos avanzan ópticamente: un naranja mal presupuestado sería peor que el navy que reemplaza.
- **NUNCA porta significado de estado.** Está a **21–27° de matiz** de `warning` (45°) y `error` (357°);
  un icono naranja suelto junto a uno de alerta se confunde. El color de estado sale sólo de los tokens
  semánticos.
- **No es identidad ni etiqueta.** Un avatar y un eyebrow no son acciones.

🔴 **El CTA lleva texto oscuro, no blanco.** Blanco sobre `#FF6500` da **2,95:1** y falla; el `text-primary`
oscuro del theme da **4,64:1**. Es contraintuitivo —casi todos los botones primarios llevan texto blanco—
así que se declara para que nadie lo implemente por reflejo.

🔴 **Las dos familias de sombra del theme no son intercambiables.** `Dark/elevation/Primary/Globe/*` está
teñida de `primary-38` y es para **acción**; `Dark/elevation/gray/*` usa `gray-38` y es para **superficie**.
Elevar un header con la sombra de marca produce un halo naranja que se lee como si el elemento estuviera
encendido — medido al construir el mockup, eligiendo la equivocada porque el nombre parecía el correcto.

### El morado no es usable en modo oscuro

Medido sobre `body-bg #25293C`:

| Token | Contraste | Uso |
|---|---|---|
| `secondary-500` `#4A108C` | **1,19:1** | invisible |
| `secondary-400` `#6E40A3` | 2,00:1 | invisible |
| `secondary-300` `#9270BA` | 3,59:1 | sólo componente |
| **`orchid-300` `#A18CBE`** | **4,80:1** | texto — el único |

Ningún escalón del color secundario de la marca alcanza el piso de texto en dark. Eso reencuadra a `orchid`:
deja de parecer una familia redundante con `secondary` y pasa a ser **su versión operable en modo oscuro**.
Es un rol legítimo, pero **hoy nada lo declara**, y el resultado por defecto es texto que no se ve. La regla
de mapeo pertenece a AXIS, no a Globe.

### Corrección al argumento del dark-only

La v1.0 sostuvo dark-only con **dos** razones: la colorimétrica y que el modo claro no existía. **La segunda
es falsa** — el theme tiene light completo y verificado. La decisión se mantiene, pero apoyada en una sola
razón: el chasis de una herramienta que muestra obra no debe teñir la percepción del contenido, y la lectura
tiene que ser estable para poder comparar dos generaciones entre sí.

Que el light exista y esté medido **baja el costo de reabrir** la decisión bajo las condiciones ya escritas
en este ADR — en particular para una superficie que deje de ser un visor de piezas.

---

## Version

- **v2.0** — 2026-07-30 — La premisa de marca era falsa: el color de Globe es naranja `#FF6500`, no el azul
  `#4db8ff` que inventó un prototipo. El chasis adopta las superficies del theme en vez de desaturarse;
  se retiran los valores de la v1.1. Se decide la arquitectura de superficie (variante C: contenedor
  hundido, piezas elevadas), se declara el presupuesto del naranja, el texto oscuro del CTA, la separación
  entre sombra de marca y de superficie, y el mapeo del morado en dark. Se corrige el argumento del
  dark-only, que se apoyaba en un hecho falso.
- **v1.1** — 2026-07-30 — Delta de autoauditoría: regla de luminancia conservada (sustituye la tabla de
  valores a ojo), inventario completo de 15 tokens de superficie, `--faint` corregido tras detectar una
  regresión de contraste sobre los planos elevados, y `visual impact` declarado abierto con dueño.
  **Corrección posterior del mismo día:** la regla de verificación se generaliza de *"el plano más claro"*
  a *"el plano de menor contraste"* — la versión específica de dark habría hecho medir el par equivocado a
  quien reabra el modo claro. Aplicarla reveló que los valores del modo claro tenían **el mismo defecto**
  (`--faint` `#666d7d` fallaba por 0,03 sobre `--stage`; `--action-strong` no alcanza el piso de texto
  ahí): corregidos a `#606674` y a "componente-only sobre `--stage`" respectivamente.
- **v1.0** — 2026-07-30 — Decisión inicial. Chasis desaturado, dark-only declarado con condiciones de
  revisión, costo del modo claro medido y las dos restricciones estructurales documentadas (`--action` no
  sobrevive blanco; el payload no re-tematiza en runtime).
