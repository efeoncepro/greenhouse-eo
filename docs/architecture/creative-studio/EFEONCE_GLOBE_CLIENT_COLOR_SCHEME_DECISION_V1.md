# ADR-017 — Color scheme y arquitectura de superficie del payload cliente de Globe

> **Tipo:** Architecture Decision Record
> **Estado:** `Accepted` — v2.0 aceptada por el operador el 2026-07-30
> **Creado:** 2026-07-30
> **Dueño de implementación:** `TASK-1485`
> **Depende de:** [ADR de ownership de AXIS](../EFEONCE_AXIS_DESIGN_SYSTEM_OWNERSHIP_DECISION_V1.md) —
> los valores son propiedad de AXIS; este ADR decide la **forma**, no los hexadecimales
> **Bloqueado por:** [propuesta a AXIS](../EFEONCE_AXIS_SURFACE_SCALE_AND_ACCENT_PROPOSAL_V1.md) — ver
> § *Los valores nacen en AXIS*
> **Construye sobre:** [ADR-016](./EFEONCE_GLOBE_CLIENT_STYLING_ENGINE_DECISION_V1.md) — el motor que hace
> que cambiar estos valores sea una edición del SSOT y no una cacería de literales
> **Relacionados:** `TASK-1523` (contratos visual/flow/motion), `TASK-1552` (composer), `TASK-1558` (share
> board), `TASK-1560` (retiro del legacy)

---

## Contexto

### El runtime de Globe está pintado con una paleta que no es la del design system

El payload cliente usa `--action #4db8ff` (azul) como color dominante: fondo, marca y acción a la vez. **Ese
azul no ocupa ningún rol del sistema.** Se originó en un prototipo de Claude Design que inventó su propia
paleta, y el runtime la heredó.

El theme vigente de Globe lo definió el equipo de diseño en AXIS (nodo *Theme Color · Globe*, verificado el
2026-07-30 con el operador y el agente de Figma):

| Rol | Valor | |
|---|---|---|
| **primary-500** | `#FF6500` | **naranja** — la marca |
| **secondary-500** | `#4A108C` | morado |
| info-500 | `#3B5ED9` | |
| success-500 | `#10B981` | |
| warning-500 | `#EAB308` | |
| error-500 | `#E5333B` | |

El naranja, que el runtime usa hoy como acento menor (`--warm`: el punto del logotipo, un segmento de la
dona de créditos), **es el primary de la marca**.

### El defecto que esto produce

Las seis superficies canónicas del runtime están a **74–85 % de saturación** (`--canvas #030c26` = 85 %,
`--surface-solid #0e1f5c` = 74 %); el único token de superficie neutro de toda la escala es
`--surface-soft`. Un dark tintado de referencia vive entre 5 y 15 %.

Consecuencia medida en el feed del Producer: entre cuatro piezas generadas —una verde, una morada, una
cálida y una azul—, **la de dominante fría pierde su borde y se hunde en el fondo** mientras las otras
saltan. El chasis está eligiendo ganadores entre el trabajo del cliente.

### Y el modo claro nunca fue una decisión

`color-scheme: dark` está declarado en **cinco sitios**, todos heredados del legacy y ninguno producto de
una decisión:

| Archivo | Forma |
|---|---|
| `apps/studio-client/src/tokens/tokens.ts:753` | `:root{color-scheme:dark;…}` generado |
| `apps/studio-web/src/shell.ts:91` | `<meta name="color-scheme">` |
| `apps/studio-web/src/ui.ts:135` | `<meta …>` |
| `apps/studio-web/src/producer-ui.ts:26` | `<meta …>` |
| `apps/studio-web/src/public-share-ui.ts:13` | `:root{color-scheme:dark;…}` |

La ausencia de modo claro era indistinguible de un olvido. El propio código pedía la decisión por escrito,
en el docblock de `theme-from-tokens.ts`: *«Si algún día se quiere tematizado en runtime… **decisión con
dueño, no un efecto colateral**»*. Este ADR es ese dueño.

---

## Decisión

### 1 · Globe es dark-only, por colorimetría

Globe muestra trabajo creativo generado. En una herramienta de creación visual **el chasis no debe teñir la
percepción del contenido**: un fondo saturado desplaza la adaptación cromática del observador y altera cómo
se lee el color de la pieza. Es la razón por la que Photoshop, Lightroom, Capture One, Frame.io y Runway
usan gris neutro, y no es convención heredada sino restricción perceptual.

Un modo claro para el Producer **no está diferido por costo: está rechazado por oficio.** Un cliente que
evalúa una paleta fría sobre fondo claro la juzga distinto que sobre fondo oscuro, y ninguna de las dos
lecturas es la pieza. Se elige una, se declara, y se mantiene estable — que es lo que permite comparar dos
generaciones entre sí.

El **share board** —la única superficie sin autenticar, que un cliente abre una vez en un dispositivo
desconocido— queda dark en V1 por dos razones: coherencia de lectura con lo que el equipo aprobó, y porque
una galería oscura es el canon del oficio para presentar una pieza terminada.

Las condiciones que reabren esta decisión están escritas más abajo.

### 2 · El chasis se adopta del theme; no se desatura

Las superficies son tokens **globales** del design system (colección `Misc`), no por tema:

| Token | Light | Dark |
|---|---|---|
| `body-bg` | `#F8F7FA` | `#25293C` |
| `paper` | `#FFFFFF` | `#2F3349` |
| `text-primary` | `#2F2B3DE5` | `#E1DEF5E5` |
| `text-secondary` | `#2F2B3DB2` | `#E1DEF5B2` |
| `divider` | `#2F2B3D1F` | `#E1DEF51F` |

`#25293C` tiene **hue 230 y saturación 24 %** — el rango canónico de un dark tintado. Estos valores ya
están en `@efeoncepro/axis-tokens` (`axisNeutral.light` / `.dark`), idénticos byte por byte, y Globe ya
tiene el paquete como dependencia.

**No hay nada que desaturar: hay que adoptar.** El equipo ya había resuelto el problema del chasis; el
runtime nunca adoptó su theme.

### 3 · Arquitectura de superficie: cuatro planos, y el contenido sube

Dos planos alcanzan para un dashboard, no para el Producer, que apila cinco niveles: chasis → contenedor de
contenido → piezas → chrome flotante → campos. La escala se extiende en **las dos direcciones**, con el
mismo paso de la progresión existente:

| Plano | Dark | Light |
|---|---|---|
| **hundido** | `#181B28` | `#ECEAF1` |
| `body-bg` | `#25293C` | `#F8F7FA` |
| `paper` | `#2F3349` | `#FFFFFF` |
| **elevado** | `#3B405C` | = `paper` + sombra |

⚠️ **El plano elevado tiene techo:** `text-secondary` da 4,68:1 sobre `#3B405C`. No puede subir más sin
romper el piso de texto.

**En claro no existe un plano por encima de `paper`** — no hay nada más claro que blanco. Ahí la elevación
la dan las sombras (`Light/elevation/*`, que el theme ya trae). El plano hundido sí aplica a ambos modos.

#### La regla de asignación

> **El contenedor del contenido se hunde; las piezas suben a `paper`.** El chasis se queda en `body-bg`.

Medido sobre tres variantes, separación entre una card y su fondo:

| Variante | Dark | Claro |
|---|---|---|
| A · card sobre el chasis | 1,157 | 1,067 |
| B · card baja al lienzo (chasis invertido) | 1,192 | 1,118 |
| **C · card sube sobre un contenedor hundido** | **1,379** | **1,193** |

**C es la única que funciona en los dos modos**, y su valor en claro supera al de B en oscuro. La razón es
estructural: en el extremo claro los planos se comprimen, así que **bajar el fondo no alcanza — hay que
subir el contenido a blanco puro**.

🔴 **El contenedor hundido NO es una card.** Va hundido y sin sombra propia. Implementarlo con borde y
sombra elevada lo convierte en card-on-card, que el estándar premium marca como fallo aunque los gates de
token pasen.

**El viewer y el share board usan lienzo hundido con la pieza sola**, sin cards: cuando hay una obra y la
tarea es juzgarla, el entorno se apaga; cuando hay varias y la tarea es compararlas, el entorno sostiene.

### 4 · El presupuesto del naranja

El naranja es el color de **acción** — `primary` en este stack resuelve botones, estado activo y foco, y el
producto no decide nada visual. Pero se declara su presupuesto, porque este ADR nació precisamente de no
tener uno:

- **Vive en:** CTA primario, estado activo, foco. Nada más.
- **NUNCA como superficie** — ni `primary-8` de fondo, ni gradientes de marca detrás del contenido. Los
  cálidos avanzan ópticamente: un naranja mal presupuestado sería peor que el azul que reemplaza.
- **NUNCA porta significado de estado.** Está a **21–27° de matiz** de `warning` (45°) y `error` (357°); un
  icono naranja suelto junto a uno de alerta se confunde. El color de estado sale sólo de los tokens
  semánticos.
- **No es identidad ni etiqueta.** Un avatar y un eyebrow no son acciones.

### 5 · Tres reglas de uso, medidas

🔴 **El CTA lleva texto oscuro, no blanco.** Blanco sobre `#FF6500` da **2,95:1** y falla; el `text-primary`
oscuro del theme da **4,64:1**. Es contraintuitivo —casi todos los botones primarios llevan texto blanco—
así que se declara para que nadie lo implemente por reflejo.

🔴 **Las dos familias de sombra del theme no son intercambiables.**
`Dark/elevation/Primary/Globe/*` está teñida de `primary-38` y es para **acción**; `Dark/elevation/gray/*`
usa `gray-38` y es para **superficie**. Elevar un header o una card con la sombra de marca produce un halo
naranja que se lee como si el elemento estuviera encendido.

🔴 **El morado no es usable como texto en modo oscuro.** Medido sobre `body-bg #25293C`:

| Token | Contraste | Uso |
|---|---|---|
| `secondary-500` `#4A108C` | 1,19:1 | invisible |
| `secondary-400` `#6E40A3` | 2,00:1 | invisible |
| `secondary-300` `#9270BA` | 3,59:1 | sólo componente |
| **`orchid-300` `#A18CBE`** | **4,80:1** | texto — el único |

Ningún escalón del color secundario alcanza el piso de texto. Eso reencuadra a `orchid`: deja de parecer
una familia redundante con `secondary` y pasa a ser **su versión operable en oscuro**. La regla de mapeo
pertenece a AXIS.

---

## Regla de verificación de contraste (aplica a todo el SSOT)

> Un token de texto se verifica contra el plano de **menor contraste** sobre el que puede aparecer, nunca
> contra el canvas por defecto.

En una escala oscura ese plano es el **más claro** (las cards, los popovers); en una clara es el **más
oscuro**. La formulación general importa: la versión específica de dark haría medir el par equivocado a
quien trabaje el modo claro.

Esta regla se aplicó dos veces durante la redacción de este ADR y **encontró un defecto las dos veces** —
uno en la escala oscura y otro en la clara, el segundo mientras se escribía la corrección del primero. Un
solo par medido no es la escala verificada.

---

## Los valores nacen en AXIS, no en Globe

Este ADR decide **la forma**; los valores son propiedad de AXIS
([ADR de ownership](../EFEONCE_AXIS_DESIGN_SYSTEM_OWNERSHIP_DECISION_V1.md): *AXIS posee la especificación
completa; el producto posee únicamente su traducción a motor*).

🔴 **Y hay un bloqueante material: `@efeoncepro/axis-tokens` es MONO-MARCA.** `axisRamp.primary[500]` es
`#0375db`, el azul de Greenhouse. **El naranja de Globe no existe en el paquete** — sólo en Figma, que ya
está modelado multi-marca (`Globe/`, `GreenHouse/`, `Kortex/`, `Wave/`, `Verk/`). Hoy Globe no tiene de
dónde consumir su propia marca.

**Regla dura:** `apps/studio-client/src/tokens/tokens.ts` **NUNCA** declara un valor de color de marca o de
superficie «mientras AXIS lo publica». Al cerrar la implementación debe ser un **adapter** —mapeo de rol
AXIS a nombre CSS del payload— con **cero literales de color**, protegido por su propio drift guard.
Declarar el valor localmente es teclearlo dos veces, que es exactamente cómo `warning` y `danger`
divergieron sin que nada lo detectara (Delta 2026-07-29 (a) de
`EFEONCE_SHARED_PRODUCT_UI_PLATFORM_DECISION_V1`).

Si AXIS no publicó, la implementación **espera**. La secuencia vive en `TASK-1485`; las mediciones que AXIS
necesita para decidir, en
[`EFEONCE_AXIS_SURFACE_SCALE_AND_ACCENT_PROPOSAL_V1`](../EFEONCE_AXIS_SURFACE_SCALE_AND_ACCENT_PROPOSAL_V1.md).

---

## Alternativas rechazadas

| Alternativa | Por qué se rechaza |
|---|---|
| **Desaturar el chasis conservando el azul como marca** *(dirección original de este ADR)* | Partía de que `#4db8ff` era la marca. No lo es. Habría dejado el defecto mayor —una paleta que no es la del sistema— intacto y más visible. |
| **Dejar el navy como está** | El chasis tiñe el trabajo del cliente y hace desaparecer las piezas frías. |
| **Modo claro completo en las cinco superficies** | El Producer lo rechaza por colorimetría; sería un modo claro para las superficies que menos lo necesitan, al precio de duplicar la rampa y sus gates. |
| **Seguir `prefers-color-scheme` del sistema** | Delega al sistema operativo una decisión de oficio: la pieza no puede verse distinta según cómo el cliente configuró su laptop. Además hoy es inejecutable — el payload no re-tematiza en runtime (dos emisores de `:root`). |
| **Variante B — hundir el chasis entero** | Sólo funciona en oscuro; invierte la elevación de Material poniendo el contenido *por debajo* del fondo; y responde al patrón de una app de **lienzo continuo** (Figma, Runway) cuando el Producer es un **feed** de resultados (Behance, Dribbble). |
| **Que Globe declare los valores localmente hasta que AXIS publique** | Es teclear el valor dos veces, con drift garantizado y silencioso. |

---

## Condiciones que reabren el modo claro

Este ADR se revisa —sin necesidad de superarlo— cuando ocurra cualquiera de estas:

1. **Evidencia de cliente**, no preferencia interna: un visitante del share board reporta que no puede
   leerlo cómodamente, o el contexto de uso resulta ser mayoritariamente diurno en pantalla brillante.
2. **Una superficie de Globe deja de ser un visor de piezas.** Un panel de administración de créditos, un
   reporte exportable o una vista de facturación no tienen la restricción colorimétrica del Producer: son
   documentos, y ahí el modo claro es legítimo.
3. **La entrega imprimible** entra en alcance. Un PDF o una hoja de contacto nace claro por destino.
4. **El re-tematizado en runtime se vuelve requisito** por accesibilidad — en cuyo caso el primer paso no es
   elegir colores sino **consolidar la emisión de `:root`** (hoy la emiten el shell y el `@theme` del bundle
   por separado, así que cambiar un token desde JS no movería una sola utilidad).

Que el modo claro **exista y esté medido** en el theme baja el costo de reabrir. Cuando se reabra, el punto
de partida es rotar el rol de acción a `--action-strong` `#0375db` — `#4db8ff` sobre blanco da **2,18:1** y
falla incluso el 3:1 de componente.

---

## Consecuencias

**Se acepta:**

- Un cambio visible en **tres superficies desplegadas** (`producer`, `share`, `studio`). Es deliberado y
  entra por la task dueña, con diff de referencia según ADR-016 — nunca como reescritura.
- Globe queda **explícitamente monotema**. Cualquier superficie futura nace dark y quien quiera otra cosa
  reabre este ADR.
- La implementación **depende de que AXIS publique primero**. Es un bloqueante aceptado, no un accidente.

**Se gana:**

- El trabajo del cliente deja de competir con el fondo, que es lo único que esta pantalla existe para
  mostrar.
- El runtime deja de tener una paleta propia inventada y pasa a ser un consumidor del design system.
- La rampa de acción queda libre para significar acción, en lugar de compartir canal con la superficie.

**Se pierde:**

- La lectura "nocturna azul" que el chasis tiene hoy, reconocible aunque sea accidental.

---

## Lo que este ADR NO decide

- **No decide los valores.** Son de AXIS. Este ADR decide la forma, el presupuesto y las reglas de uso.
- **No decide la escala tipográfica, el motion ni el layout.** Tipografía es el
  [Contrato V1](./EFEONCE_GLOBE_CLIENT_TYPOGRAPHY_CONTRACT_V1.md); motion es
  [`GLOBE_CLIENT_MOTION_CONTRACT_V1.md`](./GLOBE_CLIENT_MOTION_CONTRACT_V1.md) bajo `TASK-1523`.
- **No decide el momento de marca**, y ese es el hueco real. Adoptar el theme y ordenar los planos deja el
  chasis correcto; **no entrega un momento visual dominante**, y el estándar premium trata "correcto y
  anónimo" como fallo aunque los gates de token estén verdes. Es composición, no tokens: pertenece a
  `TASK-1523`. **Sin él, el chasis no se declara terminado.**
- **No decide la dirección visual completa del share board.** ADR-014 la bloquea por dirección visual
  aprobada; este ADR resuelve **sólo la dimensión de color**.
- **No autoriza tocar el legacy.** `producer-ui.ts`, `public-share-ui.ts` y `ui.ts` son payload en retiro
  bajo `TASK-1560`; sus literales se retiran con la superficie, no antes.

---

## Verificación exigida al implementar

1. `tokens.ts` sin **ningún** literal de color de marca ni de superficie, con drift guard que lo pruebe.
2. `pnpm theme:generate` y el gate que compara el archivo generado carácter por carácter, en verde.
3. Contraste re-medido **en el runtime desplegado**, contra el plano de menor contraste de cada texto.
4. GVC premium desktop + 390 px del Producer **con piezas reales de las tres modalidades**, incluida al
   menos una de dominante fría — el caso que hoy falla.
5. El share board en sus estados `ready`, `empty`, `error` y `denied`.
6. `pnpm check && pnpm build` en `efeonce-globe`.

---

## Historial de la decisión

Se registra porque el recorrido tiene valor de método, no porque el contenido siga vigente.

| Versión | Qué cambió |
|---|---|
| **v2.0** (2026-07-30) | **La premisa de marca era falsa.** Las v1.0/v1.1 razonaron sobre `#4db8ff` como marca de Globe; el theme del design system define naranja `#FF6500`. El chasis pasa de "desaturarse" a "adoptarse", y los valores derivados en la v1.1 quedan retirados. Se suman la arquitectura de superficie (variante C), el presupuesto del naranja, las tres reglas de uso medidas y la dependencia de AXIS. |
| **v1.1** (2026-07-30) | Autoauditoría contra el gate de diseño el mismo día. Corrigió tres defectos: la escala propuesta **aplanaba la profundidad a la mitad** (elegía valores a ojo moviendo luminancia además de croma), el inventario listaba **6 tokens de superficie cuando eran 15**, y `--faint` se declaró verificado **midiéndolo sólo sobre el plano más oscuro** — sobre las cards era una regresión de contraste. De ahí sale la regla de verificación que este ADR conserva. |
| **v1.0** (2026-07-30) | Decisión inicial: dark-only + desaturar el chasis. La primera mitad sobrevive; la segunda fue superada. |

## Version

- **v2.0** — 2026-07-30 — vigente.
