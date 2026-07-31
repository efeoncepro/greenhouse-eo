# Wireframe — Interruptor de apariencia de Globe (TASK-1613)

> **Superficie:** Producer (`efeonce-globe`, `apps/studio-client/src/surfaces/producer/ProducerHeader.tsx`)
> **Estado:** implementado y medido — este documento describe lo que se construyó, no una intención.
> **Última actualización:** 2026-07-31

- Visual direction mode: `repo-native-benchmark`
- Product Design asset: `docs/ui/evidence/task-1613/producer-light-1440.png`

La dirección visual **no se inventó**: el benchmark es el propio Producer. El control reusa el
segmentado que ya vive en su header a 30 px de distancia, y el modo claro reusa la arquitectura de
superficies que ADR-017 fijó para el oscuro —el contenedor se hunde, las piezas suben— resuelta contra
la escala clara de AXIS. El asset declarado es la captura del resultado real, no una maqueta:
`producer-dark-1440.png` en la misma carpeta es su par de control.

## Desktop Target

Dentro del **menú de cuenta** del header, un `<details>` que abre un panel flotante anclado a la derecha
(`w-88`, acotado por `--producer-viewer-max-width`). Orden de las regiones del panel, de arriba abajo:

| # | Región | Contenido | Estado |
|---|---|---|---|
| 1 | Identidad | avatar con iniciales, nombre, correo | existente |
| 2 | Sesión | «Sesión verificada» + punto de estado | existente |
| 3 | Espacio de trabajo | selector con id del espacio | existente |
| 4 | **Apariencia** | **el interruptor** | **nuevo** |
| 5 | Destinos | 6 entradas deshabilitadas (Cuenta, Equipo, Preferencias, Facturación, Soporte, Salir) | existente |

**Por qué en la 4 y no al final:** es el **único control operativo del panel**. Las seis entradas de la
región 5 están deshabilitadas al 60% de opacidad esperando sus rutas. Poner un control vivo *después* de
una lista de cosas apagadas lo entierra: quien abre el menú lee de arriba abajo y deja de mirar cuando
llega al gris.

## Visual Fidelity Mapping

Un **segmentado de dos opciones** que reusa el vocabulario de la banda de modalidades del mismo header
(`Imagen · Video · Audio`) — misma píldora `rounded-full border-line bg-canvas/18 p-1`, mismo tratamiento
del estado activo. No se inventó un patrón nuevo para un control que hace lo mismo que uno que ya existe
a 30 px de distancia.

```
┌─ Apariencia ───────────────────────────────┐
│  ╭───────────────╮╭───────────────╮        │
│  │ ☾  Oscuro     ││ ☀  Claro      │        │
│  ╰───────────────╯╰───────────────╯        │
│  El oscuro es el modo en que se aprueban   │
│  las piezas.                                │
└─────────────────────────────────────────────┘
```

- **Rótulo de la región:** `themeLabel` → «Apariencia», en `text-micro text-faint`.
- **Opciones:** `themeDark` / `themeLight`, con glifos Tabler `moon` / `sun`.
- **Nota:** `themeHint` → «El oscuro es el modo en que se aprueban las piezas.» No es decorativa:
  declara por qué el oscuro es el default sin prohibir el claro.

Todo el copy vive en `src/copy/index.ts` → `producerWorkspace`. Ningún literal en el JSX.

## Action Hierarchy

| Estado | Tratamiento | Verificado |
|---|---|---|
| Reposo (no seleccionada) | `text-text` sobre la píldora | **9,2:1** |
| Seleccionada | `bg-action` + `text-on-action` + `shadow-cta-lift` | par verificado en AXIS |
| Hover (no seleccionada) | sin cambio de color; el fill distingue | — |
| Foco por teclado | `outline-2 outline-offset-2 outline-focus` | anillo naranja, ambos modos |

**El reposo usa `text-text` y no `text-muted`**, que es lo que pedía la consistencia con la banda de
modalidades: medido, `text-muted` daba **4,2:1** sobre esta píldora y no alcanza el piso de 4,5:1. El
estado activo ya se distingue por el relleno naranja, así que subir el reposo no borra la jerarquía.

## Accessibility Contract

- `role='radiogroup'` con `aria-label` de la región y `role='radio'` + `aria-checked` en cada opción.
  **No** son dos botones sueltos: son opciones mutuamente excluyentes de una misma propiedad, y un
  lector de pantalla debe anunciar «claro, 2 de 2» en vez de dos botones sin relación.
- Altura mínima `min-h-9` (36 px) — objetivo táctil por debajo del ideal de 44 px pero dentro de un
  panel de escritorio; a 390 px el panel conserva el mismo control sin comprimirlo.
- El color **nunca** es el único portador: cada opción lleva glifo y rótulo.

## Copy Ledger

Ningún valor literal. Superficie `--canvas` al 18%, borde `--line`, texto `--text`, activo `--action` +
`--on-action`, foco `--focus`. Todos salen de AXIS vía `tokens.ts`; el modo claro es un override sobre
las claves del theme (ver el flow).

## Qué NO decide este wireframe

Los **valores** de cada modo. Son de AXIS (`@efeoncepro/axis-tokens`) y se eligen en el design system.
Esta superficie sólo expone la elección.


## Mobile Target

A 390 px el panel de cuenta conserva el mismo control sin comprimirlo: el `<details>` está acotado por
`--producer-viewer-max-width` (`calc(100vw - 2rem)`), y el segmentado es `flex-1` sobre dos opciones, así
que reparte el ancho disponible en vez de desbordar. El barrido de contraste corre a 390 px además de
1440 y habría acusado cualquier desborde por reflow.

No hay una variante móvil del control. Un cambio de forma por ancho, en un control de dos opciones que
ya cabe, sería vocabulario nuevo sin problema que resolver.

## State Copy

| Estado | Copy visible | Recuperación |
|---|---|---|
| ready | Las dos opciones, una con `aria-checked` | — |
| loading | **No existe.** El modo se lee del DOM, que el bootstrap del `<head>` ya escribió antes del primer pintado; no hay ventana en la que el control no sepa su valor | — |
| empty | **No existe.** Siempre hay exactamente dos opciones; no dependen de datos | — |
| partial | **No existe.** No hay carga parcial: el modo es un enum de dos valores resuelto localmente | — |
| error | `localStorage` lanza (modo privado, iframe de terceros). **Sin copy visible, a propósito** | El modo **se aplica igual** —el atributo ya se escribió— y sólo se pierde la persistencia. Degrada a «vuelve al oscuro al recargar», que es el default declarado. Avisar de un fallo cuya consecuencia el usuario no puede evitar ni le impide lo que vino a hacer es ruido |
| denied | **No existe.** Es una preferencia local sin autorización de por medio; ninguna capability la gobierna | — |

Cuatro de los seis estados no existen y eso es una propiedad del control, no una omisión: es una
preferencia local de dos valores, sin red ni permisos. Inventarles copy sería declarar estados que el
runtime nunca alcanza.

## Implementation Mapping

| Elemento | Archivo | Símbolo |
|---|---|---|
| Control (JSX + estado) | `apps/studio-client/src/surfaces/producer/ProducerHeader.tsx` | región «Apariencia» dentro del `<details>` de cuenta |
| Lectura/escritura del modo | `apps/studio-client/src/theme/mode.ts` | `readMode()` · `applyMode()` |
| Contrato sin DOM (Node) | `apps/studio-client/src/theme/mode-contract.ts` | `MODE_BOOTSTRAP_SCRIPT` · `MODE_STORAGE_KEY` · `DEFAULT_MODE` |
| Inyección anti-destello | `apps/studio-web/src/shell.ts` | `themeBootstrap`, detrás de `ShellOptions.themable` |
| Valores por modo | `apps/studio-client/src/tokens/tokens.ts` | `tokensFor(mode)` → `GLOBE_TOKENS` · `GLOBE_TOKENS_LIGHT` |
| Override CSS | `apps/studio-client/src/styles/theme-from-tokens.ts` | `lightOverrideCss()` |
| Copy | `apps/studio-client/src/copy/index.ts` | `producerWorkspace.theme{Label,Dark,Light,Hint}` |

**El split `mode.ts` / `mode-contract.ts` no es estético:** el shell corre en Node y sólo necesita la
cadena del bootstrap; leer y escribir el modo necesita `document`. Exportar ambos desde el mismo módulo
metía la librería DOM en el build de Node y lo rompía.

## GVC Scenario Plan

- Quality profile: `premium`

GVC es la herramienta de Greenhouse; Globe tiene sus propios canarios de browser y **ahí** vive la
evidencia. Escenarios ejercitados, todos contra Chrome real con estilos computados:

| Escenario | Instrumento | Verifica |
|---|---|---|
| Producer 1440 y 390, oscuro y claro | `scripts/light-contrast-audit.mjs` | todo el texto contra su fondo real |
| Share board 1440 y 390, ambos modos | idem | la superficie del cliente |
| Invariante `themable` | idem | honra el modo ⇔ lo declaró |
| Utilidades resueltas | `scripts/tailwind-engine-canary.mjs` | `bg-canvas`, `text-xs`, `font-display` en el bundle real |
| `:root` sin Tailwind | `scripts/legacy-fallback-canary.mjs` | los 198 tokens en la condición legacy |

**Decisión de baseline.** El baseline es el **modo oscuro vigente**, no un piso absoluto. Se
rebaselinea sólo cuando el oscuro cambia deliberadamente, y eso es detectable: `globe-theme.generated.css`
deriva de él, así que un cambio no declarado aparece como diff en el archivo generado.

**scroll-width.** El modo no cambia layout —sólo color—, así que no puede introducir desbordes por
reflow. Aun así el barrido corre a 390 px además de 1440: si un rótulo del control creciera y empujara
el panel, la medición a ese ancho lo acusaría antes que cualquier revisión a ojo.

**Review dossier.** Las capturas de ambos modos a 1440 se entregaron al operador junto con la medición
de píxeles contra control; el dossier de esta task es ese par más la tabla de contraste comparada
(oscuro 14 / claro 14, conjuntos idénticos).

**Veredicto comparativo, no absoluto.** El barrido corre en los DOS modos y falla sólo si el claro
introduce un fallo que el oscuro no tiene. Un piso absoluto habría fallado desde el primer día por
deuda preexistente (`--faint` a 40% de alpha, 14 textos, los mismos 14 en ambos modos), y un gate que
grita por algo que nadie va a arreglar se apaga a la semana.

## Design Decision Log

| Decisión | Alternativa descartada | Por qué |
|---|---|---|
| Segmentado de 2 opciones | Toggle binario / switch | El header ya tiene un segmentado a 30 px; un patrón nuevo para lo mismo es vocabulario duplicado |
| Región 4 del panel, antes de los destinos | Al final del menú | Es el único control vivo entre seis entradas deshabilitadas; al final queda enterrado |
| Reposo en `text-text` | `text-muted`, por consistencia con la banda de modalidades | Medido: `text-muted` daba 4,2:1 y no alcanza el piso. El fill naranja ya marca la jerarquía |
| `role='radiogroup'` | Dos `<button>` con `aria-pressed` | Son opciones excluyentes de una propiedad; el lector debe anunciar «2 de 2» |
| Bootstrap inline en `<head>` | Aplicar en el efecto de React | Un frame oscuro antes de hidratar; en un visor de piezas el fondo es parte de lo que se juzga |
| Ignorar `prefers-color-scheme` | Seguir el sistema operativo | La pieza no puede verse distinta según cómo el cliente configuró su laptop (ADR-017 §1) |
| Isotipo como máscara | Segundo asset positivo | El SVG es monocromo: su color no es la marca. Una sola pieza, el color del token, sin dos copias que desincronizar |
