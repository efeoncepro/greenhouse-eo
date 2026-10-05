# Componentes y patrones de marca en el Lab de AXIS

> Verificado contra: axis-design-system@df2de61 — 2026-10-04. Componentes/navegación en `9eb3da9`, búsqueda en `d9c7e6e`, agentes en `060174c`; tipografía editorial en `aee99d2` (push, despliegue Vercel y CI `37216960966` verificados).

El operador pidió renovar los componentes y patrones de AXIS con `efeonce-graphic-line`.
La aplicación vive en el catálogo raíz y en `/patterns/*/`, como presentación de marca
opt-in del Lab. No autoriza llevar La órbita a la interfaz de Greenhouse ni modificar
la adopción o lifecycle de contratos compartidos.

## Qué se implementó

- `apps/lab/src/lib/brand-theme.ts`: adapter local de valores de `efeonceGraphicLine`,
  `axisGeometry` y `axisMotion`; sin HEX copiados ni cambios al token UI compartido.
- Bricolage para títulos, Poppins para lectura; navy/papel, acento teal con texto navy.
  Acento gráfico oscuro sobre papel; ningún texto pequeño en teal.
- `BrandPrimitives.astro`: acciones sobre papel y navy, filtros seleccionables,
  estados con `stateMarkerSvg` y progreso por etapas con posición real de la demo.
- Estado = anillo libre / esfera ocupada con etiqueta. No se usa semáforo ni se
  convierte el loader en una medida orbital. No se añaden órbitas decorativas a tarjetas.
- Los contratos con una referencia de marca completa presentan su muestra y enlace
  oficial; dejan de caer en el ejemplo genérico de estado. El movimiento de marca
  remite al recurso aprobado y usa el logo oficial, sin rearmar el wordmark.
- Las fichas muestran nombre legible y conservan ID, versión, responsable, consumidores
  y criterios. Los criterios ya no llevan checks de aprobación implícita.

## Verificación al continuar

Ejecutar build/test/typecheck/lint/design:check de AXIS. Verificar E2E del catálogo,
controles Efeonce y las rutas compiladas en desktop/móvil. QA visual en `design-qa.md` y
`docs/evidence/lab-brand-components-2026-10-04/`. El Lab no certifica
los adapters de otros productos ni constituye un release de paquetes.

Los componentes con datos mantienen etiquetas y resúmenes accesibles. No derivar
escalas de gravedad de esta paleta: gravedad requiere un contrato independiente.

## Títulos editoriales escalables

Canon AXIS: `docs/architecture/LAB_BRAND_COMPONENTS_DECISION_V1.md`, delta 2026-10-04.
Los títulos de páginas, secciones y subtítulos editoriales usan `LabHeading.astro`, con `as`
para la semántica y `data-lab-heading` para verificación. La familia deriva de
`efeonceGraphicLine.type.answer.family` por `--lab-font-display`: Bricolage Grotesque.
El componente posee solo la familia; cada página conserva tamaño, peso, ejes y espaciado.
`Layout.astro` carga `editorial-typography.css` una vez. Encabezados directos de `.docs-page .prose`
reciben el mismo rol. No duplicar `@font-face` de Bricolage ni volver a declarar Poppins en títulos
editoriales. No aplicar una regla global `h1,h2` a specimens: ejemplos de producto, métricas,
logos y muestras tipográficas conservan sus propios contratos y fuentes.

Al añadir rutas o encabezados, usar el componente y ejecutar pruebas de fuente y navegador:

```sh
pnpm --filter @efeonce/axis-design-system-lab test
pnpm --filter @efeonce/axis-design-system-lab build
pnpm --filter @efeonce/axis-design-system-lab test:e2e editorial-typography.spec.ts
```

El gate descubre rutas del build; verifica familia calculada y fuente efectiva de los glifos
mediante CDP, no solo el CSS declarado. Corte comprobado: 65 rutas, 132 casos en escritorio/móvil;
el test de preservación incluye Poppins en métricas y Poppins/Geist en specimens. El número de rutas
es evidencia del corte, nunca una lista fija que impida cubrir páginas nuevas.

## Encontrar y usar recursos

`/agents/` presenta cómo pasar del Lab a los packages y las 52 capacidades del registry.
`/agents/capabilities.json` es el manifest ejecutable de descubrimiento. La búsqueda global
indexa referencias, componentes, íconos, logos, recetas y capacidades; usar ID exacto y filtros.
Para recursos de marca, `/references/logos/` y `/references/iconography/` son entradas centrales.
El contrato y el adapter indicado siguen siendo la autoridad de ejecución; ninguna ficha permite
inferir adopción de Greenhouse ni un release npm. La búsqueda se construye desde fuentes versionadas,
no necesita una base de datos de catálogo.

Evidencia final de push/CI/deploy: `docs/audits/2026-10-04-axis-documentation-closure.md` en Greenhouse. Readback público HTTP 200 en Insights, Iconography y Agents confirma `LabHeading`, `--lab-font-display` y Bricolage.

## Botones: loader orbital y flecha con movimiento (2026-10-04)

Corrección explícita del operador en el Lab: el loader de `efeonce.button` usa La órbita;
el CTA puede desplazar su flecha en hover/foco. `axis-ui-primitives` se publicó por primera vez
en 0.1.0 (tag v0.3.43); no implica adopción en Greenhouse. El indicador compacto hereda la tinta del botón:
anillo fijo + estela corta constante + una esfera que recorre; no expresa porcentaje.
`axisButton.loader` posee geometría óptica/timing y HTML/React comparten el mismo modelo.
`arrowMotion="nudge"` es opt-in y exige una flecha final de avance o externa; sólo mueve el
ícono, no el texto o el ancho. Respeta RTL, inactividad y reduced motion; con movimiento reducido
la órbita queda quieta pero conserva su anatomía y `aria-busy`. El Lab ofrece ejemplo estático,
ejemplo animado y configurador; el consumidor conecta la acción real.

## Línea de negocio y controles compuestos (2026-10-04)

`line: default | growth | brand | engine | voice | revenue-hubspot | revenue-salesforce`
es independiente de `tone`. La galería muestra las seis líneas en papel/navy, y el configurador
combina contexto, función, apariencia y tamaño. Los colores salen de `efeonceGraphicLine.lines`
y la tinta/hover se verifica a 4.5:1. Neutral y peligro no se recolorean por línea.

El package `/react` suma ButtonGroup, ToggleButton, MenuButton y SplitButton. El Lab los hidrata
y prueba de verdad: estado seleccionado, formulario nativo, carga/foco, menú por teclado y
acción principal/alternativas. Catálogo de 26 íconos funcionales Tabler; no son Trazo/Plastilina.
El release inicial y su instalación privada se verificaron; la adopción del producto es independiente. Guía: AXIS `/docs/buttons/`.

> Verificado contra: axis-design-system@1bccb3f — 2026-10-04.

Evidencia de distribución de botones: [auditoría](../../../../docs/audits/2026-10-04-axis-buttons-release.md).

Corte anterior de botones: primitives 0.1.1 y registry 0.4.1 (parche documental sin cambios
de API/CSS), tokens 0.3.43 y contracts 0.4.0. Release e instalación privada verificados.
Verificado contra: axis-design-system@31b146e, tag v0.4.1 — 2026-10-04.


### Contexto heredado y controles de elección

La familia añade ButtonProvider, RadioButtonGroup y ButtonToolbar: contexto de línea con excepción
explícita, selección exclusiva y barra de acciones con flechas. MenuButton controlado admite opciones
dinámicas y portalContainer; conserva ownership del diálogo y escapa a su recorte por top layer.
SplitButton conserva los atributos nativos/ref de su acción principal. El Lab muestra estos recorridos
con React real. El consumidor mantiene focus trap, confirmaciones y anuncios de resultado.
Matriz canónica: AXIS `docs/quality/buttons.md`; no atribuir VoiceOver/NVDA manual a un pase de axe.

Corte de distribución anterior verificado: primitives **0.2.1**, registry **0.5.1**, tokens 0.3.43 y contracts 0.4.0
(AXIS `13db367`, tag `v0.5.1`, release `37223839523` success, 2026-10-04). Instalación privada limpia:
HTML/CSS sin React y ocho componentes con React 18.3.1. Lab público y menús modales comprobados.
52 recorridos y 32 referencias visuales; VoiceOver/NVDA manual, zoom nativo e iPhone físico pendientes.


## Colores de La órbita en packages y Lab — 2026-10-04

Decisión: La órbita prevalece como identidad; el operador exige tokens en packages y rampas propias.
Implementación en AXIS `3299032`, tokens **0.5.0**; estado de distribución en
[package-and-tokens.md](package-and-tokens.md#distribución-de-primitives-y-formularios--2026-10-04):
`axisColorSystem` (`axis.color-system.v1`) referencia `efeonceGraphicLine.color` y `.lines`;
`resolveAxisColorRoles(line, surface)` entrega fondo, tinta, acento y contraste, con validación de claves.
`axisOrbitRamp`, `axisOrbitRampContrast`, `axisOrbitRampMethod` aportan seis líneas × dos anclas
× nueve pasos (100–900): 500 conserva el acento canónico; el resto son tonos técnicos derivados
por `orbit-oklab-v1`, sin asignación automática de roles ni promoción a acentos canónicos.
CSS genera `--axis-orbit-<paleta>`, `--axis-orbit-<linea>-<light|dark>-<background|text|accent>`
y `--axis-orbit-<linea>-<light|dark>-<100…900>`. No transcribir HEX ni reconstruir las rampas.
La hoja `/references/colors/`, su JSON y DESIGN.md consumen esta autoridad. `axisRamp` conserva
compatibilidad de producto; no gobierna la identidad. El acento sólo en texto ≥24 px; el contraste
se evalúa sin redondear. Estado no se comunica sólo por color. Botones conservan su contrato de estados.
ADR dueño: AXIS `docs/architecture/COLOR_SYSTEM_ORBIT_DECISION_V1.md`; consumo en
`packages/tokens/README.md`. Sin cambio de pins ni adopción automática en Greenhouse.

> Verificado contra: axis-design-system@df2de61 — 2026-10-04.


### Botones, chips y badges conectados a La órbita — 2026-10-04

Implementación AXIS: `axisButton` consume `axisColorSystem`/`axisOrbitRamp`, con roles de reposo,
hover, presionado, foco y deshabilitado. La carga conserva la paleta normal. `default` usa Growth;
neutral/peligro conservan función. El acento 500 es identidad; si no permite texto pequeño AA, se
selecciona un tono de la rampa para el fondo del componente (Growth claro: teal vivo del ancla oscura, texto oscuro y borde teal profundo; corrección visual del operador), sin cambiar la marca.
HTML/React/Lab usan el mismo CSS. Incluidos en tokens 0.5.0 y primitives 0.4.0;
Greenhouse no cambia pins ni theme. Dueño: AXIS `docs/architecture/BUTTON_ORBIT_COLOR_DECISION_V1.md`.

Chips y badges están **implementados en packages y proyectados en el Lab**:
`Badge`, `CountBadge`, `Chip`, `FilterChip`, `ChoiceChipGroup`, `ActionChip` y `RemovableChip`;
HTML/CSS sin framework y React opcional en primitives 0.4.0. Tokens 0.5.0 (`axisCompact`, `axisChip`,
`axisBadge`), contracts 0.6.0 y registry 0.7.2. `efeonce.chip` y `efeonce.badge` 1.0.0
candidate; chip 0.1.1 se sustituye por API discriminada, sin animaciones implícitas.
El Lab consume los mismos exports en `/patterns/efeonce.chip/`, `/patterns/efeonce.badge/` y
`/docs/chips-badges/`. Fuentes: AXIS `packages/primitives/README.md`,
`docs/architecture/CHIPS_BADGES_PRIMITIVES_PLAN_V1.md` y `docs/quality/compact.md`.
Badges informan; filtros y choices son campos nativos; action/removable tienen acciones explícitas.
El producto posee lógica, operaciones asíncronas y foco al quitar. Soft por defecto;
outline sólo donde el borde aporta jerarquía. No migrar pins de Greenhouse por un push de fuente.


## Formularios portables — 2026-10-04

El Lab consume la familia del package en `/patterns/efeonce.field/` y las otras nueve fichas de
formularios. Formularios y configuradores comparten Select: menú con título, descripción, check,
foco activo, estado deshabilitado y ajuste al viewport. NativeSelect conserva la opción de picker
del sistema; el HTML sin React mantiene comportamiento nativo. No copiar un dropdown local para
resolver densidad, línea o superficie.

Input/Field presentan un único contorno de foco, sin rectángulo interior ni doble aro. Correo y
proyecto muestran `mail`/`folder` dentro del campo. Los íconos funcionales no reemplazan el label;
Bricolage permanece editorial y Poppins en los controles. El package posee estilos y estados;
el Lab demuestra validación, recuperación, carga y reset sin convertirse en backend de producto.

Versiones y entrada API: [package-and-tokens.md](package-and-tokens.md#distribución-de-primitives-y-formularios--2026-10-04).
Matriz y comandos: AXIS `docs/quality/forms.md`; los diez contratos siguen candidate.

> Verificado contra: axis-design-system@df2de61 — 2026-10-04.


## Agendador AXIS — 2026-10-05, candidato local

Construido primero en AXIS por instrucción del operador, antes de adaptar Growth Meetings. La ruta
`/references/scheduler/` consume `createScheduler` de `axis-ui-primitives/scheduler`, DOM nativo sin React
obligatorio. Tres recetas por contenedor, calendario, horarios, datos y confirmación; los fixtures del Lab
no reservan. Papel/navy y acento de La órbita desde `axisScheduler`, Bricolage editorial/Poppins funcional,
campos y botones desde las primitives. Sin órbita decorativa. El consumidor conserva red, reservas,
validación de negocio, CAPTCHA y telemetría. No se migró el renderer de Greenhouse.

Verificado contra: axis-design-system@8adedef + cambios locales de scheduler — 2026-10-05. Código/API/QA
en `packages/primitives/README.md`, `docs/architecture/SCHEDULER_COMPOSITION_DECISION_V1.md` y
`docs/quality/scheduler.md`. Publicación pendiente; aceptación visual explícita recibida el 2026-10-05 («Bien, está aprobado...»).


## Composición de consulta ≠ Growth CTA — corrección 2026-10-05

La demo `/references/product/` ilustra primitives, no implementa el renderer Growth CTA. El operador
rechazó controles pegados, cajas apiladas y copy técnico. Disclosure debe comunicar apertura mediante
botón/chevron y separar su contenido; Dialog organiza título, contenido y cierre; Complementary
conserva jerarquía de ayuda, sin competir como otra tarjeta. El ejemplo revisa el borrador real y lo
conserva al cerrar. No describir esta demo como adopción de `src/growth-cta-renderer` ni como campaña
conectada. Corrección local en AXIS aprobada por el operador el 2026-10-05 («Aprobado todo»);
publicación de los exports y adopción pendientes.


## Growth CTA real: presentación en packages — 2026-10-05

El operador pide inventariar todas las formas del renderer y construir la versión Efeonce en AXIS.
`/references/growth-cta/` consume `axis-ui-primitives/growth-cta`; no es la demo genérica de product.
Tres presentaciones implementadas (embedded, inline_banner, slide_in), tres apariencias (default,
spotlight, minimal), cinco acciones y estados de recuperación. Bricolage/Poppins, papel/navy y
controles Growth; sin órbitas ornamentales. Sticky banner, popup modal y floating button están
declarados en Growth pero no cuentan con comportamiento específico completo: se inventarían como
pendientes. El diálogo del agendador no equivale a popup_modal.

AXIS posee presentación; Growth conserva reglas, campañas, telemetría y operaciones. Publicar el
package y adaptar el renderer compartido permitirá consumirlo en sitio público, Think y otros hosts
mediante el mismo web component, sin copiar la UI del Lab. Esta entrega no realiza esa migración.
Verificado contra: axis-design-system@eeb24e2 + candidato local — 2026-10-05. Fuente auditada:
greenhouse-eo@c0f3d7ce, renderer 1.3.0. Decisión y evidencia en AXIS
`GROWTH_CTA_COMPOSITION_DECISION_V1.md` y `docs/quality/growth-cta.md`. Aprobación visual explícita
el 2026-10-05 («Aprobado todo»); release y adopción pendientes.


Revisión de Growth CTA tras rechazo del operador (2026-10-05): panel con ancho propio, minimal
sin caja/sombra, cierre discreto y modal ligero. En `/references/growth-cta/`, acción Abrir agendador
y selector Agenda permiten comparar En ventana / Debajo del CTA. La selección se conserva al
volver en ambos. Las revisiones finales quedaron aprobadas el 2026-10-05; la primera se conserva como rechazo
histórico en el ledger.
Verificado contra: axis-design-system@eeb24e2 + revisión local — 2026-10-05.


### Growth CTA aprobado: banners y lectura

En `/references/growth-cta/#banners` se comparan las recetas `inline_banner/minimal` (editorial
compacto, reglas finas) y `inline_banner/spotlight` (azul profundo, titular mayor, acción y nota
agrupadas). El anillo pertenece exclusivamente al eyebrow superior; la esfera cierra el titular y
permanece junto a su última palabra. `content.headlineEmphasis` identifica una frase exacta y única:
Bricolage 400 introduce y 700 destaca la idea principal; se conserva el texto accesible completo.
Agenda en diálogo o inline comparte adapter y selección; cerrar/reabrir no crea otra reserva.

Estado: **aprobado visualmente por el operador el 2026-10-05**, source local sobre AXIS `3c8a6dd`.
QA final: 40/40 journeys y 4/4 recorridos afectados tras el ajuste de wrapping; build/typecheck,
198 tests de contracts y gates design/agent PASS. El dossier AXIS posee evidencia proporcional y
límites; AT físico, publicación e instalación privada del nuevo export y adopción siguen pendientes.
